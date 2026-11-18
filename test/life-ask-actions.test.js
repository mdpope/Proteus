import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {randomUUID} from 'node:crypto';
import {Engine} from '../src/engine.js';import {LifeAskActions} from '../src/services/life/life-ask-actions.js';import {atomicJSON,readJSON} from '../src/shared/files.js';
const until=async predicate=>{for(let i=0;i<300;i++){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,5));}throw Error('Action did not settle.');};
function fixture(t){
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-action-')),requestId=randomUUID(),cwd=path.join(home,'request');fs.mkdirSync(cwd);
 let account='synthetic',executions=0;const engine=new Engine(path.join(home,'owner'),{rehearsal:{run:async({run,emit})=>{executions++;assert.equal(run.schedule.executionPermissions.mode,'ask');assert.deepEqual(run.schedule.context.selectedIds,['mcp:selected']);emit('assistant','Synthetic action verified.',{phase:'final'});}}},undefined,{permissionControls:true});
 const schedule={schemaVersion:1,id:'fixture',name:'Action fixture',enabled:false,cron:'0 0 * * *',timezone:'UTC',provider:'rehearsal',model:'fixture',workspace:{cwd,additionalDirectories:[]},prompt:'Send a scoped instruction to my project chat',misfire:'skip',lifeAsk:{requestId,accountID:account}};
 const run=engine.createRun(schedule,'chat',null,{deferStart:true});run.status='completed';delete run.deferredStart;engine.persist(run);
 const receipt={requestId,accountID:account,chatId:run.id};atomicJSON(path.join(cwd,'transcript.json'),{transcript:schedule.prompt});
 const host={store:{directory:()=>cwd},chat:{existing:()=>run,assertBound:value=>{if(value.accountID!==account)throw Error('Account changed.');}},settings:()=>({actionMcpIds:['mcp:selected']}),wake(){},service:{engine,context:{get:()=>({entries:[{id:'mcp:selected',kind:'mcp',name:'Selected service'},{id:'mcp:other',kind:'mcp',name:'Other service'}]})},buildChatSchedule:async args=>{assert.equal(args.includeDefaults,false);assert.deepEqual(args.selectedIds,['mcp:selected']);return {...args,context:{selectedIds:args.selectedIds,entries:[{id:'mcp:selected',kind:'mcp',name:'Selected service'}]},mcpServers:{}};}}};
 const actions=new LifeAskActions(host);t.after(async()=>{actions.close();await engine.close();fs.rmSync(home,{recursive:true,force:true});});return {engine,run,receipt,actions,proposal:{kind:'action',answer:'Send the stated request to the named project chat.'},executions:()=>executions,switch:()=>account='other',state:()=>readJSON(actions.file(receipt))};
}
test('sensitive voice request requires protected human approval even under auto-approve',async t=>{
 const f=fixture(t);f.engine.permissions.setMode(f.run.schedule,'autopilot');assert.equal((await f.actions.step(f.receipt,f.proposal)).state,'awaiting_input');await until(()=>f.run.pending);
 assert.equal(f.run.pending.details.managedApprovalRequired,true);assert.equal(f.run.pending.details.kind,'life-ask-action');assert.deepEqual(f.run.pending.permissionChoices,[]);assert.equal(f.executions(),0);
 f.engine.reply(f.run.id,'approve',f.run.pending.id);await until(()=>f.state().status==='approved');await f.actions.step(f.receipt,f.proposal);await until(()=>f.executions()===1&&!f.engine.running.size);
 const result=await f.actions.step(f.receipt,f.proposal);assert.equal(result.result.answer,'Synthetic action verified.');assert.deepEqual(await f.actions.step(f.receipt,f.proposal),result);assert.equal(f.executions(),1);
 f.engine.event(f.run,'user','A later follow-up');f.engine.event(f.run,'assistant','Another answer',{phase:'final'});assert.deepEqual(await f.actions.step(f.receipt,f.proposal),result);
});
test('denial never starts a provider or invokes selected MCP tools',async t=>{
 const f=fixture(t);await f.actions.step(f.receipt,f.proposal);await until(()=>f.run.pending);f.engine.reply(f.run.id,'deny',f.run.pending.id);await until(()=>f.state().status==='denied');assert.match((await f.actions.step(f.receipt,f.proposal)).result.answer,/Cancelled/);assert.equal(f.executions(),0);
});
test('account change during approval interrupts the original proposal without acting',async t=>{
 const f=fixture(t);await f.actions.step(f.receipt,f.proposal);await until(()=>f.run.pending);f.switch();f.engine.reply(f.run.id,'approve',f.run.pending.id);await until(()=>f.state().status==='interrupted');assert.equal(f.run.status,'interrupted');assert.equal(f.executions(),0);await assert.rejects(f.actions.step(f.receipt,f.proposal),/Account changed/);
});
test('Stop cancels the protected proposal instead of reopening its approval',async t=>{
 const f=fixture(t);await f.actions.step(f.receipt,f.proposal);await until(()=>f.run.pending);f.engine.cancel(f.run.id);f.actions.cancel(f.run);await until(()=>f.state().status==='interrupted');await assert.rejects(f.actions.step(f.receipt,f.proposal),/interrupted/);assert.equal(f.executions(),0);
});
