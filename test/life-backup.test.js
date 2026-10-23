import {cleanupStack} from './helpers/cleanup.js';
import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { LifeStore } from '../src/services/life/life-admin.js';
import { openLifeDatabase, readLifeProfile } from '../src/services/life/life-database.js';
import { verifyRestoredBackup, validateBackupReceipt, databaseSnapshot } from '../src/services/life/life-backup.js';
import { evidenceStorage, evidenceStatus } from '../src/services/life/life-evidence.js';
async function fixture(t) {
 const cleanup=cleanupStack(t);const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-backup-')),store=new LifeStore(home);cleanup(()=>fs.rmSync(home,{recursive:true,force:true}));cleanup(()=>store.close());
 const plan=await store.planSetup({mode:'local-new',ownerName:'Test',ownerEmail:'test@example.test'});await store.applySetup({planId:plan.planId,confirmation:'APPLY'});
 const profile=readLifeProfile(store.settings().profileFile),source=await openLifeDatabase(profile),restoreFile=path.join(home,'restored.sqlite');await source.backup(restoreFile);const restored=await openLifeDatabase({...profile,database:restoreFile});cleanup(async()=>{await source.close();await restored.close();});const dumpFile=path.join(home,'backup.sql');fs.writeFileSync(dumpFile,'-- independently restored backup fixture\n',{mode:0o600});return {home,store,source,restored,dumpFile};
}
test('restored backup receipt verifies independently and rejects tampering, age, wrong database and changing protected data',async t=>{
 const f=await fixture(t),now=Date.now();const verified=await verifyRestoredBackup({...f,home:f.store.home,now});f.source.profile.backupReceipt=verified.file;
 assert.equal((await validateBackupReceipt(f.source,f.store.home,{now})).verified,true);
 await assert.rejects(validateBackupReceipt(f.source,f.store.home,{now:now+31*60_000}),/expired/);
 f.restored.profile.backupReceipt=verified.file;await assert.rejects(validateBackupReceipt(f.restored,f.store.home,{now}),/different/);
 const original=fs.readFileSync(verified.file);const altered=JSON.parse(original);altered.dumpHash='0'.repeat(64);fs.writeFileSync(verified.file,JSON.stringify(altered));await assert.rejects(validateBackupReceipt(f.source,f.store.home,{now}),/not created/);fs.writeFileSync(verified.file,original);
 fs.appendFileSync(f.dumpFile,'changed');await assert.rejects(validateBackupReceipt(f.source,f.store.home,{now}),/checksum/);fs.writeFileSync(f.dumpFile,'-- independently restored backup fixture\n');
 await f.source.run('UPDATE workspaces SET name=? WHERE id=1',['Changed']);await assert.rejects(validateBackupReceipt(f.source,f.store.home,{now}),/records changed/);
 await assert.rejects(verifyRestoredBackup({...f,home:f.store.home}),/does not exactly match/);
 await assert.rejects(verifyRestoredBackup({...f,restored:f.source,home:f.store.home}),/independent/);
});
test('snapshot excludes authentication tables and requires actual protected schema',async t=>{
 const f=await fixture(t);const all=f.source.all;f.source.all=async(sql,args)=>{assert.equal(/FROM `(users|passkeys|oauth_clients|sessions)`/.test(sql),false);return all(sql,args);};const snapshot=await databaseSnapshot(f.source);assert.equal(snapshot.tables.users,undefined);assert.ok(snapshot.tables.food_versions);
});
test('verification method binds private source profile and returns no private identifiers',async t=>{
 const f=await fixture(t),restoredProfileFile=path.join(f.home,'restore.json');fs.writeFileSync(restoredProfileFile,JSON.stringify(f.restored.profile),{mode:0o600});const result=await f.store.verifyBackup({restoredProfileFile,dumpFile:f.dumpFile});assert.equal(result.verified,true);assert.equal(JSON.stringify(result).includes(f.home),false);assert.ok(readLifeProfile(f.store.settings().profileFile).backupReceipt);
});
function fakeSftp() {
 const files=new Map(),dirs=new Set(['/private']),calls=[];let corrupt=false,escaped=false;
 const batch=async(alias,commands)=>{assert.equal(alias,'safe-alias');let out='';for(const line of commands){calls.push(line);const parts=line.match(/"(?:\\.|[^"\\])*"|\S+/g).map(x=>x.startsWith('"')?JSON.parse(x):x),[cmd,a,b]=parts;
 if(cmd==='cd'){if(!dirs.has(a))throw new Error('directory unavailable');out+='';batch.cwd=escaped&&a!='/private'?'/outside':a;}
 else if(cmd==='pwd')out+='Remote working directory: '+batch.cwd+'\n';
 else if(cmd==='-mkdir')dirs.add(a);
 else if(cmd==='put')files.set(b,Buffer.from(fs.readFileSync(a)));
 else if(cmd==='chmod')assert.equal(a,'0640');
 else if(cmd==='ls'){const data=files.get(b);if(!data)throw new Error('missing');out+='-rw-r----- ? owner group '+data.length+' Oct 04 00:00 file\n';}
 else if(cmd==='get'){const data=files.get(a);fs.writeFileSync(b,corrupt?Buffer.alloc(data.length,0):data);}
 else if(cmd==='rename'){files.set(b,files.get(a));files.delete(a);}
 else if(cmd==='rm'||cmd==='-rm')files.delete(a);
 else throw new Error('unexpected command '+cmd);
 }return out;};return {files,calls,batch,setCorrupt:v=>corrupt=v,setEscaped:v=>escaped=v};
}
test('shared evidence uploads verified bytes before promotion; rollback cleans own file and prevents symlink escape',async()=>{
 const fake=fakeSftp(),profile={driver:'mysql',readOnly:false,evidence:{mode:'sftp',sshAlias:'safe-alias',root:'/private'}},storage=evidenceStorage(profile,{sftpBatch:fake.batch}),data=Buffer.from('private original');const saved=await storage.write(1,data);assert.ok(saved.relativePath.startsWith('evidence/1/'));assert.deepEqual(await storage.read(saved.relativePath,{bytes:data.length}),data);assert.equal(fake.files.size,1);await saved.cleanup();assert.equal(fake.files.size,0);
 fake.setCorrupt(true);await assert.rejects(storage.write(1,data),/integrity/);assert.equal(fake.files.size,0);fake.setCorrupt(false);fake.setEscaped(true);await assert.rejects(storage.write(1,data),/outside/);assert.equal(fake.files.size,0);await assert.rejects(storage.read('../secret'),/Invalid/);
 assert.equal(evidenceStatus(profile).writable,true);assert.equal(evidenceStatus({...profile,readOnly:true}).writable,false);
 await assert.rejects(evidenceStorage({driver:'mysql',storageRoot:'/tmp'}).write(1,data),/shared SFTP/);
});
