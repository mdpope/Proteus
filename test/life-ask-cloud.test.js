import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {LifeAskStore,legacyEnvelope,validateAdmission} from '../src/services/life/life-ask.js';
import {LifeAskCloud} from '../src/services/life/life-ask-cloud.js';

function fixture(t){
 const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-ask-cloud-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const library=path.join(root,'library');fs.mkdirSync(library);fs.mkdirSync(path.join(library,'AgentRequests'));
 let account='synthetic';const hostID=randomUUID();
 const store=new LifeAskStore(root,{identity:()=>({accountId:account}),hostId:()=>hostID,enabled:()=>true});
 const cloud=new LifeAskCloud({store,libraryRoot:()=>library,now:()=>5000});
 const bytes=Buffer.alloc(16044);bytes.write('RIFF');bytes.writeUInt32LE(16036,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(1,22);bytes.writeUInt32LE(8000,24);bytes.writeUInt32LE(16000,28);bytes.writeUInt16LE(2,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(16000,40);bytes.writeInt16LE(4000,44);
 const wire={version:1,requestId:randomUUID(),executionOwner:'proteus-life',accountID:account,hostID,device:{id:'synthetic'},audio:{format:'wav',sampleRate:8000,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),data:bytes.toString('base64')},times:{captureStartedAt:1000,captureEndedAt:2000},endReason:'timeout'};
 const legacy=legacyEnvelope(validateAdmission(wire),wire.audio.data);
 const write=value=>fs.writeFileSync(path.join(library,'AgentRequests',value.id+'.json'),JSON.stringify(value));
 return {store,cloud,library,wire,legacy,write,switchAccount:()=>{account='other';}};
}
test('iCloud and relay share admission identity and round legacy epoch milliseconds',async t=>{
 const f=fixture(t);f.write({...f.legacy,startedAt:1000.3,endedAt:2000.6});
 assert.deepEqual(await f.cloud.scan(),{examined:1,accepted:1,duplicate:0,held:0});
 const receipt=f.store.read(f.wire.requestId);assert.equal(receipt.source,'icloud');assert.equal(receipt.times.captureEndedAt,2001);
 assert.equal((await f.store.admit(f.wire)).state,'duplicate');
 assert.equal((await f.cloud.scan()).duplicate,1);
});
test('cloud scanning holds unbound, foreign, interrupted, malformed, future-version and symlink requests untouched',async t=>{
 const f=fixture(t);
 for(const changes of [{executionOwner:undefined},{accountID:'other'},{hostID:randomUUID()},{status:'interrupted'},{version:2}])f.write({...f.legacy,id:randomUUID(),...changes});
 const incomplete=path.join(f.library,'AgentRequests',randomUUID()+'.json');fs.writeFileSync(incomplete,'{"version":');
 fs.symlinkSync(incomplete,path.join(f.library,'AgentRequests',randomUUID()+'.json'));
 assert.deepEqual(await f.cloud.scan(),{examined:7,accepted:0,duplicate:0,held:7});
 assert.equal(f.store.unfinished().length,0);assert.equal(fs.readdirSync(path.dirname(incomplete)).length,7);
});
test('bounded scan rotates fairly and stops at an account switch',async t=>{
 const f=fixture(t);for(let i=0;i<4;i++)f.write({...f.legacy,id:randomUUID()});
 assert.equal((await f.cloud.scan({limit:2})).accepted,2);assert.equal((await f.cloud.scan({limit:2})).accepted,2);
 const original=f.store.admit.bind(f.store);f.store.admit=async(...args)=>{const result=await original(...args);f.switchAccount();return result;};
 assert.equal((await f.cloud.scan()).examined,1);assert.equal(f.store.unfinished().length,0);
});
test('answer mirror publishes complete v1 bytes once and preserves edits and foreign answers',async t=>{
 const f=fixture(t);await f.store.admit(f.wire);
 const receipt=f.store.update(f.wire.requestId,{state:'answered',chatId:randomUUID(),times:{answeredAt:4000}}),result={transcript:'Synthetic question',answer:'Synthetic answer',model:'fixture',reasoningEffort:'medium'};
 assert.deepEqual(f.cloud.mirror(receipt,result),{written:true,at:5000});
 const file=path.join(f.library,'AgentAnswers',receipt.requestId+'.json'),saved=JSON.parse(fs.readFileSync(file));
 assert.equal(saved.completedAt,4);assert.equal(saved.executor,'proteus');assert.equal(saved.chatId,receipt.chatId);
 saved.answer='Human edit';fs.writeFileSync(file,JSON.stringify(saved));
 assert.deepEqual(f.cloud.mirror(receipt,result),{written:false,preserved:true});assert.equal(JSON.parse(fs.readFileSync(file)).answer,'Human edit');
 saved.accountID='foreign';fs.writeFileSync(file,JSON.stringify(saved));
 assert.throws(()=>f.cloud.mirror(receipt,result),/different execution/);assert.equal(JSON.parse(fs.readFileSync(file)).accountID,'foreign');
 assert.equal(fs.readdirSync(path.dirname(file)).length,1);
 f.switchAccount();assert.throws(()=>f.cloud.mirror(receipt,result),/binding changed/);
});
