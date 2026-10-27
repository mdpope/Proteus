import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {Engine} from '../src/engine.js';
import {startTurn} from '../src/services/chats/run-timing.js';
const fixture=()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-delegation-')),provider={run:async()=>{}};
 const engine=new Engine(home,{mtplx:provider},undefined,{permissionControls:true});
 const schedule={schemaVersion:1,id:'synthetic-parent',name:'Parent',provider:'mtplx',model:'fixture-model',prompt:'Authorized synthetic task',cron:'0 0 * * *',timezone:'America/Denver',workspace:{cwd:home,additionalDirectories:[]},enabled:false,misfire:'skip'};
 const parent=engine.createRun(schedule,'chat',null,{deferStart:true});parent.status='running';startTurn(parent,engine.now());engine.running.set(parent.id,{id:parent.id,controller:new AbortController()});
 return {engine,parent,home,dispose:async()=>{engine.stopping=true;engine.delegation.stopChildren(parent.id);await Promise.allSettled([...engine.executions]);clearInterval(engine.allowance?.timer);fs.rmSync(home,{recursive:true,force:true});}};
};
const until=async fn=>{for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,5));}throw Error('Synthetic task did not start');};
test('host delegation preserves the provider/model/resources and reconciles repeated spawn receipts without duplicate work',async()=>{
 const f=fixture();try{
  const args={action:'spawn',operationId:randomUUID(),name:'Worker',prompt:'Inspect the authorized synthetic file'};
  const first=await f.engine.delegation.handle(f.parent.id,args),second=await f.engine.delegation.handle(f.parent.id,args);
  assert.equal(first.id,second.id);const child=f.engine.getRun(first.id);assert.equal(child.schedule.provider,'mtplx');assert.equal(child.schedule.model,'fixture-model');assert.deepEqual(child.schedule.workspace,f.parent.schedule.workspace);
  await assert.rejects(f.engine.delegation.handle(f.parent.id,{...args,prompt:'Changed task'}),/different task/);
  assert.equal(f.engine.visibleRuns().some(run=>run.id===child.id),false);assert.equal(f.engine.delegation.children(f.parent.id).length,1);
  assert.throws(()=>f.engine.delegation.page('another-parent',child.id),/does not belong/);
  await until(()=>child.status==='completed');assert.equal(f.engine.delegation.page(f.parent.id,child.id).id,child.id);
  f.engine.stream(child,'synthetic-message','Visible child stream');
  assert.equal(f.engine.delegation.summary(child).eventRevision,1);
  assert.deepEqual(f.engine.delegation.page(f.parent.id,child.id).liveMessages,{'synthetic-message':'Visible child stream'});
 }finally{await f.dispose();}
});
test('children inherit parent operation grants, route questions to the parent and stop when scope or parent turn changes',async()=>{
 const f=fixture();let captured,release;f.engine.providers.mtplx.run=async args=>{captured=args;await new Promise(resolve=>{release=resolve;args.signal.addEventListener('abort',resolve,{once:true});});};
 try{
  const result=await f.engine.delegation.handle(f.parent.id,{action:'spawn',operationId:randomUUID(),prompt:'Synthetic child task'});await until(()=>captured);
  assert.equal(captured.permissionProfile().source,'delegated-parent');const child=f.engine.getRun(result.id);
  await f.engine.send(f.parent.id,'Preserve this queued follow-up','queue',randomUUID());assert.equal(captured.signal.aborted,false,'Queueing parent input must preserve delegated work');
  const answer=captured.ask({type:'question',question:'Synthetic child question',choices:['A','B']});await until(()=>f.parent.pending);assert.equal(child.pending,null);assert.equal(f.parent.pending.question,'Synthetic child question');assert.deepEqual(f.parent.pending.choices,['A','B']);
  f.engine.reply(f.parent.id,'A',f.parent.pending.id);assert.equal(await answer,'A');
  f.parent.turns.push({id:'another-turn'});assert.throws(()=>captured.permissionProfile(),/ended or was revoked/);f.engine.cancel(f.parent.id);await until(()=>child.status==='cancelled');
 }finally{release?.();await f.dispose();}
});
