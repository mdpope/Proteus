// Explicit live provider qualification. Synthetic prompt, no real audio/account/vault data.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {CodexProvider} from '../src/providers/codex.js';
import {Engine} from '../src/engine.js';
import {demoReminders} from '../src/services/life/demo-reminders.js';
import {LifeStore} from '../src/services/life/life.js';
import {reminderCommand,reminderTools} from '../src/services/life/reminder-tools.js';
const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-life-codex-')),workspace=path.join(home,'workspace');fs.mkdirSync(workspace);
const routine=process.argv.includes('--routine');
const calls=[];
const accountId='a'.repeat(64),workspaceId='synthetic',origin='https://synthetic.invalid';
const demo=routine?demoReminders(path.join(home,'website-reminders.json')):null;
const identity={accountId,workspaceId,readOnly:false};
const life=routine?new LifeStore(home,{
 vault:{load:()=>({accountId,workspaceId,origin,clientId:'fixture',accessToken:'fixture',refreshToken:'fixture',expiresAt:Date.now()+3600000})},
 fetch:async (url,options)=>{
  assert.equal(new URL(url).origin,origin);
  if(url===origin+'/api/v1/life')return Response.json(identity);
  const body=JSON.parse(options.body);
  if(url===origin+'/api/v1/life/data'){
   assert.equal(body.section,'reminders');
   return Response.json({...demo.read(body.query),...identity});
  }
  assert.equal(url,origin+'/api/v1/life/action');
  assert.equal(body.expectedAccountId,accountId);
  assert.equal(body.expectedWorkspaceId,workspaceId);
  calls.push(body.action);
  return Response.json({...demo.write(body.action.slice('reminders.'.length),body.input,body.idempotencyKey),...identity});
 },
}):null;
if(life){life.save({schemaVersion:3,enabled:true},life.get().revision);life.api.load();}
const lifeAskPolicy=life?run=>({servers:{},assert(){},tools:reminderTools(args=>reminderCommand(life,args,run),run.id)}):undefined;
const provider=new CodexProvider({permissionControls:true},{lifeAskPolicy}),engine=new Engine(home,{codex:provider});
try{
 const status=await provider.status();assert.ok(status.available,status.error);const model=status.models.find(item=>item.id==='gpt-6.1-terra');assert.ok(model,'Configured default model must exist in the fresh catalog.');assert.ok(model.controls.reasoningEfforts.includes('medium'));
 const run=engine.createRun({schemaVersion:1,id:'life-ask-live-smoke',name:'Synthetic Life Ask qualification',enabled:false,cron:'0 9 * * *',timezone:'UTC',provider:'codex',model:model.id,reasoningEffort:'medium',workspace:{cwd:workspace,additionalDirectories:[]},context:{entries:[],includeDefaults:false},lifeAsk:{requestId:randomUUID()},chatType:'life-ask',prompt:routine?'Create a reminder list named Synthetic shopping list using the offered synthetic tool. Report the confirmed result.':'Synthetic qualification: What is 2 + 2? No research or filing is needed. Answer concisely using the required result format.',misfire:'skip'},'chat');
 const deadline=Date.now()+120000;
 while(['queued','running','awaiting_input'].includes(run.status)){if(Date.now()>deadline)throw Error('Live Life Ask qualification timed out.');await new Promise(resolve=>setTimeout(resolve,200));}
 assert.equal(run.status,'completed',run.events.filter(event=>event.role==='system').map(event=>event.text).join('\n'));
 const reply=[...run.events].reverse().find(event=>event.role==='assistant'&&event.data?.phase==='final')||[...run.events].reverse().find(event=>event.role==='assistant');
 const result=reply.data?.lifeAskResult||JSON.parse(reply.text);assert.ok(['search','clarification'].includes(result.kind));assert.equal(result.professional,false);
 if(routine){
  assert.deepEqual(calls,['reminders.list.create']);
  assert.match(result.answer,/Synthetic shopping list/i);
  assert.equal(run.events.some(event=>event.data?.permission),false);
  const command=args=>reminderCommand(life,{accountId,...args},run);
  const readback=await command({action:'list'});
  const matches=readback.lists.filter(list=>list.name==='Synthetic shopping list');
  assert.equal(matches.length,1);
  const list=matches[0];
  const created=await command({action:'create',operationId:randomUUID(),input:{title:'Synthetic milk',listId:list.id,dueKind:'none'}});
  const updated=await command({action:'update',operationId:randomUUID(),id:created.record.id,expectedRevision:created.record.revision,input:{title:'Synthetic oats'}});
  const completed=await command({action:'complete',operationId:randomUUID(),id:updated.record.id,expectedRevision:updated.record.revision});
  const saved=await command({action:'get',id:created.record.id});
  assert.equal(saved.record.title,'Synthetic oats');
  assert.equal(saved.record.listId,list.id);
  assert.equal(saved.record.revision,completed.record.revision);
  assert.ok(saved.record.completedAt);
  assert.deepEqual(calls,['reminders.list.create','reminders.create','reminders.update','reminders.complete']);
 }
 else assert.match(result.answer,/4|four/i);
 assert.equal(run.events.some(event=>event.data?.tool&&['shell','apply_patch'].includes(event.data.tool.name)),false);
 console.log(JSON.stringify({passed:true,model:model.id,checks:['fresh catalog','native read-only acknowledgment','structured output','no command or file effects',...(routine?['synthetic list created once without approval using production adapter','item create, update, complete and readback']:[])],usage:run.usage}));
}finally{await engine.close();await provider.close();await life?.close();fs.rmSync(home,{recursive:true,force:true});}
