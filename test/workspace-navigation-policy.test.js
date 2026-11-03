import test from 'node:test';
import assert from 'node:assert/strict';
import {initWorkspaces,sendChatToWorkspace} from '../public/features/workspaces/desktop-workspaces.js';
import {remotePreviewOwner} from '../public/features/workspaces/workspace-navigation.js';
function fixture(t,{remote=false,failBrowser=false}={}){
 const saved={window:globalThis.window,localStorage:globalThis.localStorage};t.after(()=>Object.assign(globalThis,saved));
 const host='synthetic-host',runId='shared-chat',canonical=remote?'peer:'+host+':'+runId:runId;
 const state={data:{runs:remote?[]:[{id:runId,schedule:{context:{workspaceId:'fixture'}}}]},tabs:[{id:canonical,type:remote?'remote-run':'run',...(remote?{runId,hostId:host}:{})},{id:'native-output',type:'agent-terminal',parentId:canonical},{id:'browser',type:'browser',parentId:canonical}]};
 const context={workspaces:[{id:'fixture',name:'Fixture'}]},calls=[],errors=[];
 globalThis.localStorage={getItem:()=>null,setItem:()=>{}};globalThis.window={desktop:{peers:async request=>{calls.push(request);if(request.action==='workspace-snapshot')return {context,capabilities:[]};if(request.method==='context.get')return context;if(request.method==='runs.list')return request.args.offset===0?Array.from({length:100},(_,i)=>({id:'old-'+i})): [{id:runId,workspaceId:'fixture'}];throw Error('Unexpected request');},browser:async args=>{calls.push(args);if(failBrowser)throw Error('Browser is busy');}}};
 initWorkspaces({state,api:async()=>context,render:()=>{},toast:error=>errors.push(error),openTab:tab=>{const old=state.tabs.find(t=>t.id===tab.id);if(old)Object.assign(old,tab);else state.tabs.push(tab);state.tab=tab.id;}});
 return {state,errors,calls,host,runId,canonical};
}
test('moving a chat preserves native terminal run identity while changing its display container',async t=>{
 const f=fixture(t);await sendChatToWorkspace({id:f.runId,local:true});assert.deepEqual(f.errors,[]);const output=f.state.tabs.find(tab=>tab.id==='native-output');assert.equal(output.runId,f.runId);assert.equal(output.parentId,f.canonical);assert.equal(f.state.tabs.find(tab=>tab.id===f.canonical).parentId,'workspace:local:fixture');
 await sendChatToWorkspace({id:f.runId,local:true});assert.equal(f.state.tabs.filter(tab=>tab.type==='run').length,1);
});
test('remote top-level tabs resolve missing workspace metadata on their owner including older chats',async t=>{
 const f=fixture(t,{remote:true});await sendChatToWorkspace({id:f.canonical,runId:f.runId,hostId:f.host});assert.deepEqual(f.errors,[]);assert.equal(f.state.tabs.find(tab=>tab.type==='workspace').workspaceId,'fixture');assert.equal(f.state.tabs.find(tab=>tab.type==='remote-run').runId,f.runId);assert.deepEqual(f.calls.filter(c=>c.method==='runs.list').map(c=>c.args.offset),[0,100]);
});
test('opening the associated chat reuses its view without transferring a busy native browser',async t=>{
 const f=fixture(t,{failBrowser:true});await sendChatToWorkspace({id:f.runId,local:true});assert.deepEqual(f.errors,[]);assert.equal(f.calls.filter(call=>call.action==='transfer').length,0);assert.equal(f.state.tabs.find(tab=>tab.id===f.canonical).parentId,'workspace:local:fixture');assert.equal(f.state.tabs.find(tab=>tab.id==='native-output').parentId,f.canonical);assert.equal(f.state.tabs.find(tab=>tab.id==='browser').parentId,f.canonical);
});
test('remote workspace preview uses chat authorization and workspace navigation independently',()=>{
 const workspace={id:'workspace:host:w',type:'workspace',hostId:'host'},chat={id:'nested',type:'remote-run',runId:'actual',hostId:'host',parentId:workspace.id},document={id:'preview',type:'remote-document',runId:'actual',hostId:'host',parentId:workspace.id};
 assert.deepEqual(remotePreviewOwner([workspace,chat],chat.id),{run:chat,parentId:workspace.id});assert.deepEqual(remotePreviewOwner([workspace,chat,document],document.id),{run:document,parentId:workspace.id});assert.equal(remotePreviewOwner([workspace,chat],workspace.id),null);workspace.connectionPaused=true;assert.equal(remotePreviewOwner([workspace,chat],chat.id),null);
});
