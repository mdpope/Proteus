import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import net from 'node:net';
import {createRequire} from 'node:module';
import {packageOperation} from '../src/services/updates/update-package-worker.js';
const require=createRequire(import.meta.url);
const {copyRecovery,inventoryStorage,retireStaging,stagingStatus}=require('../desktop/updates/update-storage.cjs');
const {tree,atomic,writeJob,fileDigest,excluded,recoveryCachePath}=require('../desktop/updates/update-package.cjs');
function fixture(t){const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-update-storage-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;}
function put(root,name,value=name){const file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,value);return file;}
function journal(root,phase){const id=randomUUID(),directory=path.join(root,'jobs',id),file=path.join(directory,'job.json'),candidate=path.join(directory,'candidate','Proteus');put(candidate,'runtime','synthetic');const job={schemaVersion:1,id,file,revision:1,phase,home:path.join(root,'home'),installation:path.join(root,'installation'),recoveryRoot:path.join(root,'recoveries'),recoveryPolicy:path.join(root,'recovery-policy.json'),candidate:{bundle:candidate,sourceFingerprint:'a'.repeat(64)},continuationId:'synthetic',secret:'synthetic'};atomic(file,job);return job;}

test('recovery omits only the managed tmux socket and preserves its live server and durable neighbours',{skip:process.platform==='win32'},async t=>{
 const root=fixture(t),source=path.join(root,'data'),destination=path.join(root,'snapshot'),manifestFile=path.join(root,'copy.json');
 put(source,'terminal-tmux/metadata.json','durable terminal metadata');put(source,'terminals.json','durable terminals');
 const socket=path.join(source,'terminal-tmux/socket'),server=net.createServer();
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(socket,resolve);});t.after(()=>new Promise(resolve=>server.close(resolve)));
 assert.throws(()=>tree(source),/terminal-tmux\/socket/,'ordinary package hashes remain strict');
 assert.throws(()=>tree(source,{runtimePrefix:'different-home'}),/terminal-tmux\/socket/,'exception is home scoped');
 const expected=tree(source,{exclude:excluded,runtimePrefix:''});
 const result=copyRecovery(source,destination,{manifestFile,expectedHash:expected.hash,runtimePrefix:''});
 assert.equal(result.hash,expected.hash);assert.equal(result.files,2);assert.equal(fs.existsSync(path.join(destination,'terminal-tmux/socket')),false);
 assert.equal(fs.readFileSync(path.join(destination,'terminal-tmux/metadata.json'),'utf8'),'durable terminal metadata');
 assert.equal(fs.lstatSync(socket).isSocket(),true,'live endpoint is never removed');
 const client=net.createConnection(socket);await new Promise((resolve,reject)=>{client.once('connect',resolve);client.once('error',reject);});client.destroy();
 assert.equal(copyRecovery(source,destination,{manifestFile,runtimePrefix:''}).reused,2);
 assert.throws(()=>copyRecovery(source,destination,{manifestFile,runtimePrefix:'nested'}),/Unsupported recovery filesystem entry/);
});
test('the tmux recovery exception retains ordinary files and rejects other sockets',{skip:process.platform==='win32'},async t=>{
 const root=fixture(t);put(root,'terminal-tmux/socket','ordinary file at the endpoint path');
 assert.equal(tree(root,{runtimePrefix:''}).files,1);
 const server=net.createServer();await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(path.join(root,'unknown.sock'),resolve);});t.after(()=>new Promise(resolve=>server.close(resolve)));
 assert.throws(()=>tree(root,{runtimePrefix:''}),/unknown.sock/);
});

test('ordinary recovery caches are an explicit profile-root allowlist, preserving website data',t=>{
 const root=fixture(t),source=path.join(root,'source'),destination=path.join(root,'snapshot'),manifestFile=path.join(root,'progress.json');
 const caches=['Cache/Cache_Data/entry','Code Cache/js/entry','GPUCache/entry','Partitions/work/Cache/entry','Default/DawnWebGPUCache/entry'];
 const durable=['Service Worker/CacheStorage/offline','Partitions/work/Service Worker/CacheStorage/offline','Cookies','Partitions/work/Local Storage/leveldb/data','Partitions/work/IndexedDB/data','Sessions/Session_1','Extensions/example/state','receipts/retry.json','projects/example/Cache/source','Default/Local Storage/data'];
 for(const name of [...caches,...durable,'runner.lock'])put(source,name);
 fs.chmodSync(path.join(source,'receipts/retry.json'),0o400);
 for(const name of caches)assert.equal(recoveryCachePath(name),true);
 for(const name of durable)assert.equal(recoveryCachePath(name),false);
 const before=tree(source),expected=tree(source,{exclude:excluded,recoveryCaches:true});
 const result=copyRecovery(source,destination,{manifestFile,expectedHash:expected.hash,recoveryCaches:true});
 assert.equal(result.hash,expected.hash);assert.equal(result.copied,durable.length);
 assert.equal(tree(source).hash,before.hash,'source data is unchanged');
 for(const name of durable)assert.equal(fs.readFileSync(path.join(destination,name),'utf8'),name);
 for(const name of [...caches,'runner.lock'])assert.equal(fs.existsSync(path.join(destination,name)),false);
 assert.equal(JSON.parse(fs.readFileSync(manifestFile)).complete,true);
});
test('partial recovery resumes verified files and rejects drift without overwriting its generation',t=>{
 const root=fixture(t),source=path.join(root,'source'),destination=path.join(root,'snapshot'),manifestFile=path.join(root,'progress.json');
 put(source,'a','first');put(source,'b','second');put(source,'nested/c','third');
 assert.throws(()=>copyRecovery(source,destination,{manifestFile,afterFile:({copied})=>{if(copied===1)throw Error('Synthetic interruption');}}),/Synthetic interruption/);
 assert.equal(fs.readFileSync(path.join(destination,'a'),'utf8'),'first');
 const resumed=copyRecovery(source,destination,{manifestFile});assert.equal(resumed.reused,1);assert.equal(resumed.copied,2);
 put(source,'a','changed source');
 assert.throws(()=>copyRecovery(source,destination,{manifestFile}),/different source generation/);
 assert.equal(fs.readFileSync(path.join(destination,'a'),'utf8'),'first');
});
test('nested browser profiles omit only their own ordinary caches',t=>{
 const root=fixture(t),source=path.join(root,'source'),destination=path.join(root,'snapshot'),manifestFile=path.join(root,'progress.json');
 for(const name of ['Cache/valuable-app-file','browser/Cache/reproducible','browser/Partitions/work/Code Cache/js/entry','browser/Partitions/work/Service Worker/CacheStorage/offline'])put(source,name);
 copyRecovery(source,destination,{manifestFile,recoveryCaches:true,cachePrefix:'browser'});
 assert.equal(fs.existsSync(path.join(destination,'Cache/valuable-app-file')),true);assert.equal(fs.existsSync(path.join(destination,'browser/Cache/reproducible')),false);assert.equal(fs.existsSync(path.join(destination,'browser/Partitions/work/Code Cache/js/entry')),false);assert.equal(fs.existsSync(path.join(destination,'browser/Partitions/work/Service Worker/CacheStorage/offline')),true);
});
test('recovery refuses overlapping paths or symlink parent escapes',t=>{
 const root=fixture(t),source=path.join(root,'source'),destination=path.join(root,'snapshot'),manifestFile=path.join(root,'progress.json'),outside=path.join(root,'outside');put(source,'nested/file');fs.mkdirSync(destination);fs.mkdirSync(outside);fs.symlinkSync(outside,path.join(destination,'nested'));
 assert.throws(()=>copyRecovery(source,path.join(source,'inside'),{manifestFile}),/separate/);
 assert.throws(()=>copyRecovery(source,destination,{manifestFile}),/symbolic links/);
 assert.deepEqual(fs.readdirSync(outside),[]);
});
test('dry-run inventory measures without deletion; cancellation retires only candidate bytes',t=>{
 const root=fixture(t),job=journal(root,'cancelled');put(path.dirname(job.file),'preservation.json','keep receipt');
 const first=inventoryStorage(root,job);assert.equal(first.dryRun,true);assert.equal(first.jobs[0].logicalBytes,9);assert.equal(first.jobs[0].eligible,true);assert.equal(fs.existsSync(job.candidate.bundle),true);
 const retired=retireStaging(job.file);assert.equal(retired.retired,true);assert.equal(retired.logicalBytes,9);assert.equal(typeof retired.freeSpaceChange,'number');assert.equal(fs.existsSync(job.candidate.bundle),false);assert.equal(fs.existsSync(job.file),true);assert.equal(fs.readFileSync(path.join(path.dirname(job.file),'preservation.json'),'utf8'),'keep receipt');
 assert.equal(retireStaging(job.file).retired,false);
});
test('staging retains active helpers, unresolved recovery, and unregistered or changed receipts',t=>{
 const root=fixture(t),job=journal(root,'prepared');assert.equal(stagingStatus(job).eligible,false);
 for(const phase of ['cancelled','complete']){const running={...job,phase,helperPid:42};assert.equal(stagingStatus(running,{alive:pid=>pid===42}).eligible,false);}
 fs.writeFileSync(job.file+'.helper-lock','ambiguous');assert.equal(stagingStatus({...job,phase:'cancelled'}).eligible,false);fs.unlinkSync(job.file+'.helper-lock');
 const recovery=path.join(root,'recoveries','generation'),receiptFile=put(recovery,'recovery.json','verified');
 atomic(job.recoveryPolicy,{schemaVersion:1,home:job.home,installation:job.installation,auditedAt:new Date().toISOString(),generations:[]});
 const completed={...job,phase:'complete',recovery};assert.equal(stagingStatus(completed).eligible,false);
 atomic(job.recoveryPolicy,{schemaVersion:1,home:job.home,installation:job.installation,auditedAt:new Date().toISOString(),generations:[{id:'generation',directory:recovery,at:new Date().toISOString(),receiptFile,receiptHash:fileDigest(receiptFile),verified:true,eligible:true}]});
 assert.equal(stagingStatus(completed).eligible,true);fs.appendFileSync(receiptFile,'changed');assert.throws(()=>stagingStatus(completed),/receipt changed/);
 assert.equal(fs.existsSync(job.candidate.bundle),true);
});
test('inventory preserves other installation data and symlinked jobs',t=>{
 const root=fixture(t),job=journal(root,'cancelled'),outside=path.join(root,'outside');fs.mkdirSync(outside);fs.symlinkSync(outside,path.join(root,'jobs','linked'));
 const result=inventoryStorage(root,{home:'different-home',installation:job.installation,retire:true});assert.equal(result.retired.length,0);assert.equal(result.errors.length,2);assert.equal(fs.existsSync(job.candidate.bundle),true);
});
test('package copy executes off the caller thread and rejects unknown worker operations',async t=>{
 const root=fixture(t),source=path.join(root,'source'),destination=path.join(root,'copy');put(source,'file',Buffer.alloc(8*1024*1024,7));
 let turns=0;const timer=setInterval(()=>turns++,1);try{await packageOperation('copyTree',source,destination);}finally{clearInterval(timer);}
 assert.ok(turns>0,'the caller event loop remains responsive during copying');assert.equal(tree(source).hash,tree(destination).hash);
 await assert.rejects(packageOperation('removeArbitraryData',root),/Unsupported/);
});

test('a source-change failure records the complete verified copy and both hashes',t=>{
 const root=fixture(t),source=path.join(root,'source'),destination=path.join(root,'snapshot'),manifestFile=path.join(root,'progress.json');put(source,'a','before');const expected=tree(source,{exclude:excluded});
 assert.throws(()=>copyRecovery(source,destination,{manifestFile,afterFile:()=>put(source,'a','late write')}),/source changed/);
 const receipt=JSON.parse(fs.readFileSync(manifestFile));assert.equal(receipt.verified,1);assert.equal(receipt.complete,false);assert.equal(receipt.verification.destinationMatches,true);assert.equal(receipt.verification.sourceUnchanged,false);assert.equal(tree(destination,{exclude:excluded}).hash,expected.hash);assert.equal(fs.readFileSync(path.join(source,'a'),'utf8'),'late write');
});
