import test from 'node:test';
import assert from 'node:assert/strict';
import {initWorkspaces,sendChatToWorkspace,moveChatToWorkspace,openWorkspaceChat,workspaceViewClosure} from '../public/features/workspaces/desktop-workspaces.js';

function fixture(t,{legacy=false,failMove=false}={}){
 const globals={window:globalThis.window,localStorage:globalThis.localStorage,document:globalThis.document};t.after(()=>Object.assign(globalThis,globals));
 const calls=[],errors=[],context={workspaces:[{id:'same-workspace',name:'Owner workspace'}]},projects={enabled:true,revision:'catalog-1',projects:[{id:'remote-default',workspaceId:'same-workspace',name:'General'},{id:'remote-second',workspaceId:'same-workspace',name:'Research'}],defaultProjectIds:{'same-workspace':'remote-default'},memberships:{chat:{workspaceId:'same-workspace',projectId:'remote-default'}}};
 const run={id:'chat',workspaceId:'same-workspace',projectId:'remote-default',updatedAt:'run-version',title:'Synthetic remote chat'};
 const state={data:{hostName:'Local',runs:[],context,workspaceProjects:{enabled:true,projects:[{id:'local-project',workspaceId:'same-workspace'}],defaultProjectIds:{'same-workspace':'local-project'}}},tabs:[{id:'peer:remote:chat',type:'remote-run',hostId:'remote',runId:'chat'},{id:'remote-viewer',type:'remote-document',hostId:'remote',runId:'chat',documentId:'same',parentId:'peer:remote:chat'}]};
 let submit,fail=failMove;
 const destination={value:'remote-second'},button={};globalThis.localStorage={getItem:()=>null,setItem:()=>{}};globalThis.document={getElementById:id=>id==='dialog-submit'?button:destination,querySelector:()=>null};
 globalThis.window={desktop:{peers:async value=>{calls.push(structuredClone(value));switch(value.method){case 'context.get':return context;case 'sync':return {state:{capabilities:legacy?[]:['projects.v1'],workspaceProjects:legacy?undefined:projects}};case 'runs.list':return [run];case 'projects.get':return projects;case 'chat.move':if(fail){fail=false;throw Error('Synthetic lost acknowledgement');}Object.assign(run,{projectId:value.args.projectId,workspaceId:value.args.workspaceId});projects.memberships.chat={workspaceId:run.workspaceId,projectId:run.projectId};return structuredClone(projects);default:throw Error('Unexpected method '+value.method);}},browser:async()=>{throw Error('Organizational project change must not transfer browser grants');}}};
 initWorkspaces({state,escape:String,api:()=>{throw Error('Remote ownership must not use local API');},render:()=>{},toast:error=>errors.push(error),showDialog:(html,handler)=>{submit=handler;},reconcileRemoteProjectPlacement:async host=>{calls.push({reconcile:host});return projects;},openTab:tab=>{const old=state.tabs.find(item=>item.id===tab.id);if(old)Object.assign(old,tab);else state.tabs.push(tab);state.tab=tab.id;}});
 return {state,calls,errors,projects,submit:()=>submit()};
}
test('production project navigation resolves the remote catalog without capturing local same-ID workspaces',async t=>{
 const f=fixture(t);await sendChatToWorkspace({hostId:'remote',chatId:'chat'});assert.deepEqual(f.errors,[]);
 assert.equal(f.state.tabs.find(tab=>tab.id===f.state.tab).parentId,'project:remote:remote-default');
 assert.ok(f.state.tabs.some(tab=>tab.id==='peer:remote:chat'));assert.equal(f.state.tabs.find(tab=>tab.id==='remote-viewer').parentId,'peer:remote:chat');
 assert.ok(!f.state.tabs.some(tab=>tab.projectId==='local-project'));
 openWorkspaceChat(f.state.tabs.find(tab=>tab.id==='project:remote:remote-default'),{...f.projects.memberships.chat,id:'chat'});
 assert.equal(f.state.tabs.filter(tab=>tab.type==='remote-run'&&tab.runId==='chat').length,1);
});
test('remote project movement carries owner/chat revisions and reuses its identity after an unknown outcome',async t=>{
 const f=fixture(t,{failMove:true});await moveChatToWorkspace({hostId:'remote',chatId:'chat'});
 await assert.rejects(f.submit(),/lost acknowledgement/);await f.submit();const calls=f.calls.filter(call=>call.method==='chat.move');
 assert.equal(calls.length,2);assert.deepEqual(calls[0].options,calls[1].options);assert.deepEqual(calls[0].args,{id:'chat',workspaceId:'same-workspace',projectId:'remote-second',expectedUpdatedAt:'run-version',expectedRevision:'catalog-1'});
 assert.equal(f.state.tabs.find(tab=>tab.id===f.state.tab).parentId,'project:remote:remote-second');assert.equal(f.state.tabs.find(tab=>tab.id==='remote-viewer').documentId,'same');
 assert.ok(f.calls.some(call=>call.reconcile==='remote'));
});
test('a legacy remote owner remains in workspace chat navigation when local projects are enabled',async t=>{
 const f=fixture(t,{legacy:true});f.state.tabs=f.state.tabs.filter(tab=>tab.type!=='remote-document');await sendChatToWorkspace({hostId:'remote',chatId:'chat'});assert.deepEqual(f.errors,[]);
 assert.equal(f.state.tabs.find(tab=>tab.id===f.state.tab).parentId,'workspace:remote:same-workspace');assert.ok(!f.state.tabs.some(tab=>tab.projectId));
});
test('workspace view closure includes project siblings and nested views without crossing owners or changing chats',()=>{
 const tabs=[{id:'workspace:remote:w',type:'workspace',hostId:'remote',workspaceId:'w'},{id:'project:remote:p',type:'workspace',hostId:'remote',workspaceId:'w',projectId:'p',hidden:true},{id:'project:remote:q',type:'workspace',hostId:'remote',workspaceId:'w',projectId:'q',navigationClosed:true},{id:'nested-document',type:'remote-document',hostId:'other',runId:'chat',parentId:'chat-view',documentId:'original'},{id:'chat-view',type:'remote-run',hostId:'remote',runId:'chat',parentId:'project:remote:p'},{id:'browser',type:'browser',parentId:'project:remote:q',unloaded:true},{id:'terminal',type:'terminal',parentId:'workspace:remote:w',terminal:{id:'owner-session'}},{id:'quick-chat',type:'remote-run',hostId:'remote',runId:'chat'},{id:'workspace:local:w',type:'workspace',workspaceId:'w'},{id:'project:other:p',type:'workspace',hostId:'other',workspaceId:'w',projectId:'p'},{id:'unrelated',type:'browser',parentId:'project:other:p'}];
 const before=structuredClone(tabs),closed=workspaceViewClosure(tabs,'remote','w');assert.deepEqual([...closed].sort(),['workspace:remote:w','project:remote:p','project:remote:q','nested-document','chat-view','browser','terminal'].sort());assert.deepEqual(tabs,before);
 assert.deepEqual(tabs.filter(tab=>!closed.has(tab.id)).map(tab=>tab.id),['quick-chat','workspace:local:w','project:other:p','unrelated']);
});
