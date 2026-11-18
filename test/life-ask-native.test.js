import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {LifeAskNative} from '../src/services/life/life-ask-native.js';

function fixture(t){
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-ask-native-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
 const receipt={requestId:randomUUID(),accountID:'synthetic',hostID:randomUUID(),audioSha256:'a'.repeat(64),audioBytes:44};
 const directory=path.join(home,receipt.requestId);fs.mkdirSync(directory);
 fs.writeFileSync(path.join(directory,'request.json'),JSON.stringify({id:receipt.requestId,executionOwner:'proteus-life',accountID:receipt.accountID,hostID:receipt.hostID,audioDigest:{sha256:receipt.audioSha256,bytes:44}}));
 fs.writeFileSync(path.join(home,'agent_requests.py'),'# synthetic');
 let binding={accountID:receipt.accountID,hostID:receipt.hostID};const calls=[];
 const settings={pythonPath:path.join(home,'python'),workerPath:path.join(home,'omi_worker.py'),configPath:path.join(home,'config.json')};
 const adapter=new LifeAskNative({store:{binding:()=>binding,directory:()=>directory},omi:{getSettings:()=>settings,verifyRuntime:value=>assert.equal(value,settings)},execute:async(command,args,options)=>{calls.push({command,args,options});return {stdout:JSON.stringify({requestId:receipt.requestId,audioSha256:receipt.audioSha256,transcript:'Synthetic question',times:{asrStartedAt:1000.2,asrEndedAt:2000.7},kind:'memory',savedPath:'Inbox/Mnemosyne/'+receipt.requestId+'.md'})};}});
 return {adapter,receipt,directory,settings,calls,switchAccount:()=>binding={...binding,accountID:'other'}};
}
test('native adapter uses exact fixed helpers and immutable request/filing intent',async t=>{
 const f=fixture(t),out=await f.adapter.transcribe(f.receipt);
 assert.equal(out.transcript,'Synthetic question');assert.deepEqual(out.times,{asrStartedAt:1000,asrEndedAt:2001});
 assert.deepEqual(f.calls[0].args,[path.join(path.dirname(f.settings.workerPath),'agent_requests.py'),'--config',f.settings.configPath,'transcribe','--request',path.join(f.directory,'request.json')]);
 assert.equal(f.calls[0].command,f.settings.pythonPath);assert.equal(f.calls[0].options.timeout,180000);
 const intent={kind:'memory',item:'Synthetic memory',answer:'Synthetic answer'};
 await f.adapter.file(f.receipt,intent);const bytes=fs.readFileSync(path.join(f.directory,'filing-intent.json'),'utf8');
 await f.adapter.file(f.receipt,intent);assert.equal(fs.readFileSync(path.join(f.directory,'filing-intent.json'),'utf8'),bytes);
 await assert.rejects(f.adapter.file(f.receipt,{...intent,item:'changed'}),/intent changed/);
 assert.equal(f.calls.length,3);
});
test('native adapter rejects foreign helper output and account changes during ASR',async t=>{
 const f=fixture(t);
 f.adapter.execute=async()=>({stdout:JSON.stringify({requestId:randomUUID(),audioSha256:f.receipt.audioSha256,transcript:'wrong'})});
 await assert.rejects(f.adapter.transcribe(f.receipt),/another request/);
 f.adapter.execute=async()=>{f.switchAccount();return {stdout:JSON.stringify({...f.receipt,transcript:'Synthetic'})};};
 await assert.rejects(f.adapter.transcribe(f.receipt),/binding changed/);
});
test('native adapter fails closed on changed envelope, malformed output and helper failures',async t=>{
 const f=fixture(t);f.adapter.execute=async()=>({stdout:'not json'});
 await assert.rejects(f.adapter.transcribe(f.receipt),/invalid JSON/);
 f.adapter.execute=async()=>{throw Error('private helper stderr');};
 await assert.rejects(f.adapter.transcribe(f.receipt),error=>/did not complete/.test(error.message)&&!error.message.includes('private helper stderr'));
 const file=path.join(f.directory,'request.json'),value=JSON.parse(fs.readFileSync(file));value.accountID='other';fs.writeFileSync(file,JSON.stringify(value));
 await assert.rejects(f.adapter.transcribe(f.receipt),/binding differs/);
});
test('native filing does not accept another intent kind or an unsafe output path',async t=>{
 const f=fixture(t);
 await assert.rejects(f.adapter.file(f.receipt,{kind:'research',item:'Synthetic',answer:'Answer'}),/task or memory/);
 f.adapter.execute=async()=>({stdout:JSON.stringify({...f.receipt,kind:'memory',savedPath:'../outside.md'})});
 await assert.rejects(f.adapter.file(f.receipt,{kind:'memory',item:'Synthetic',answer:'Answer'}),/receipt is invalid/);
});
