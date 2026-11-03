import test from 'node:test';
import assert from 'node:assert/strict';
import {initWorkspaces,refreshWorkspaceOwners} from '../public/features/workspaces/desktop-workspaces.js';

test('sidebar redraws consume owner snapshots instead of paired context and sync requests',async t=>{
 const previous=globalThis.window;const calls=[];let revision=1,offline=false;
 globalThis.window={desktop:{peers:async value=>{
  calls.push(value);assert.equal(value.action,'workspace-snapshot');assert.equal(value.hostId,'paired-host');
  if(offline)throw Error('Reconnecting: snapshot not ready');
  return {hostName:'Peer',context:{revision:String(revision),workspaces:[{id:'work',name:'Workspace '+revision}],entries:[]},workspaceProjects:{revision:String(revision),projects:[{id:'project',workspaceId:'work'}],memberships:{}},capabilities:['projects.v1'],runs:[]};
 }}};
 t.after(()=>{globalThis.window=previous;});
 initWorkspaces({escape:value=>value,state:{tabs:[],data:{context:{workspaces:[]}}},loadPeers:async()=>[{hostId:'paired-host',label:'Peer'}]});
 for(let i=0;i<50;i++)assert.equal((await refreshWorkspaceOwners())[0].context.workspaces[0].name,'Workspace 1');
 revision=2;const fresh=(await refreshWorkspaceOwners())[0];assert.equal(fresh.context.workspaces[0].name,'Workspace 2');assert.equal(fresh.workspaceProjects.revision,'2');
 assert.equal(calls.length,51);assert.ok(calls.every(call=>call.method===undefined),'redraw must not emit any remote read');
 offline=true;assert.equal((await refreshWorkspaceOwners())[0].online,false,'cached rows cannot claim a disconnected owner is online');
});
