import test from 'node:test';
import assert from 'node:assert/strict';
import {reminderDue,LifeReminderIntent,ReminderConfirmationPending} from '../src/services/life/life-reminder-intent.js';
import {reminderCommand,reminderOperationId,reminderTools} from '../src/services/life/reminder-tools.js';
test('relative reminder dates use capture timezone; date-only has no invented time',()=>{
 const at=Date.parse('2026-11-14T02:00:00Z');
 assert.deepEqual(reminderDue({dueKind:'date',dueDate:'tomorrow'},at,'America/Denver'),{dueKind:'date',dueDate:'2026-11-14',dueAt:null,timeZone:null});
 assert.equal(reminderDue({dueKind:'datetime',dueDate:'tomorrow',dueTime:'09:00'},at,'America/Denver').dueAt,'2026-11-14T16:00:00+00:00');
 assert.throws(()=>reminderDue({dueKind:'datetime',dueDate:'2026-11-01',dueTime:'01:30'},at,'America/Denver'),/transition/);
 assert.throws(()=>reminderDue({dueKind:'datetime',dueDate:'2026-03-08',dueTime:'02:30'},at,'America/Denver'),/transition/);
 assert.throws(()=>reminderDue({dueKind:'date',dueDate:'2026-02-30'},at,'America/Denver'),/Which date/);
});
test('reminder tools enforce captured account, expected revision and stable retry identity',async()=>{
 let identity={accountId:'a',workspaceId:'w',origin:'https://example.test',sessionId:'session'};const writes=[];
 const life={api:{identity:()=>identity,assertIdentity:expected=>assert.deepEqual(expected,identity)},data:async()=>({accountId:'a',lists:[]}),action:async(...args)=>{writes.push(args);return {ok:true};}};
 await reminderCommand(life,{action:'list'});
 const args={action:'complete',accountId:'a',operationId:'10000000-0000-4000-8000-000000000001',id:'20000000-0000-4000-8000-000000000001',expectedRevision:4};
 await reminderCommand(life,args);await reminderCommand(life,args);assert.deepEqual(writes[0],writes[1]);assert.equal(writes[0][1].expectedRevision,4);
 await assert.rejects(reminderCommand(life,{...args,accountId:'b'}),/current account/);
 await assert.rejects(reminderCommand(life,args,{schedule:{lifeAsk:{accountID:'b'}}}),/another account/);
 assert.equal(reminderTools(()=>{},'run')[0].name,'proteus_reminders');
});
test('pendant reminder commits once identity, confirms after server receipt and never uses private notes',async()=>{
 const identity={accountId:'a',workspaceId:'w',origin:'https://example.test',sessionId:'s'},calls=[];
 const life={api:{identity:()=>identity,assertIdentity:value=>assert.deepEqual(value,identity)},data:async()=>({timeZone:'America/Denver',lists:[{id:'inbox',name:'Inbox'}]}),action:async(action,input,key)=>{calls.push({action,input,key});return {record:{...input,id:'20000000-0000-4000-8000-000000000001',revision:1},confirmation:{id:'notice',at:1}};}};
 const adapter=new LifeReminderIntent(life),receipt={requestId:'10000000-0000-4000-8000-000000000001',accountID:'a',times:{captureStartedAt:Date.parse('2026-11-14T02:00Z')}},result={kind:'reminder',professional:false,answer:'proposed',item:'',reminder:{title:'Water plants',listName:'Inbox',dueKind:'date',dueDate:'tomorrow',dueTime:'',notes:''}};
 const context=await adapter.context(receipt),saved=await adapter.commit(receipt,result,context);
 assert.match(saved.answer,/Saved/);assert.match(saved.answer,/no timed alert/);assert.equal(saved.savedPath,null);assert.equal(saved.destination.kind,'reminder');
 await adapter.commit(receipt,result,context);assert.deepEqual(calls[0],calls[1]);assert.equal(calls[0].key,reminderOperationId(receipt.requestId));
 life.action=async()=>{throw Error('offline');};await assert.rejects(adapter.commit(receipt,result,context),ReminderConfirmationPending);
});

test('pendant reminder resolves spoken workspace and project names exactly or asks',async()=>{
 const identity={accountId:'a',workspaceId:'w',origin:'https://example.test',sessionId:'s'},calls=[];
 const scopes={workspaces:[{id:'w1',name:'Personal'},{id:'w2',name:'Mint Medical'}],projects:[{id:'p1',name:'Smart Home',workspaceId:'w1'},{id:'p2',name:'General',workspaceId:'w1'},{id:'p3',name:'General',workspaceId:'w2'}]};
 const life={api:{identity:()=>identity,assertIdentity:()=>{}},data:async()=>({timeZone:'America/Denver',lists:[{id:'inbox',name:'Inbox'},{id:'g',name:'Groceries'}]}),action:async(action,input)=>{calls.push(input);return {record:{...input,id:'20000000-0000-4000-8000-000000000001',revision:1},confirmation:{id:'n',at:1}};}};
 const adapter=new LifeReminderIntent(life,()=>scopes),receipt={requestId:'10000000-0000-4000-8000-000000000002',accountID:'a',times:{captureStartedAt:Date.parse('2026-11-14T02:00Z')}};
 const run=reminder=>adapter.commit(receipt,{kind:'reminder',professional:false,answer:'x',item:'',reminder:{title:'Buy milk',notes:'',dueKind:'none',dueDate:'',dueTime:'',listName:'Groceries',workspaceName:'',projectName:'',...reminder}},context);
 const context=await adapter.context(receipt);assert.deepEqual(context.scopes,scopes);
 await run({projectName:'smart home'});assert.equal(calls.at(-1).projectId,'p1');assert.equal(calls.at(-1).workspaceId,'w1');assert.equal(calls.at(-1).listId,'g');
 await run({workspaceName:'Mint Medical'});assert.equal(calls.at(-1).workspaceId,'w2');assert.equal(calls.at(-1).projectId,null);
 await run({projectName:'General',workspaceName:'Mint Medical'});assert.equal(calls.at(-1).projectId,'p3');
 await run({});assert.equal('workspaceId' in calls.at(-1),false);
 const before=calls.length;await assert.rejects(run({projectName:'General'}),/Which project/);await assert.rejects(run({projectName:'Garage'}),/could not find a project/);await assert.rejects(run({workspaceName:'Nowhere'}),/could not find a workspace/);assert.equal(calls.length,before);
});
