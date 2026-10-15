import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import session from '../desktop/workspace-session.cjs';
const {WorkspaceSession,normalizeSession}=session;
test('workspace records only descriptors, strips authority, content and startup commands',()=>{
 const value=normalizeSession({active:'web',page:'settings',tabs:[{id:'web',type:'browser',url:'https://example.test/',shared:true,owner:'run',token:'secret'},{id:'md',type:'markdown',file:'/tmp/a.md',content:'private'},{id:'term',type:'terminal',terminal:{id:'terminal-id',profileId:'default',rootId:'root',directory:'a',command:'danger'},output:'private'}]});
 assert.equal(value.active,'web');assert.equal(value.page,'settings');assert.deepEqual(value.tabs.map(t=>t.type),['overview','browser','markdown','terminal']);assert.doesNotMatch(JSON.stringify(value),/secret|private|danger|shared|owner|output/);
});
test('workspace validates URL schemes, credential URLs, paths, types and duplicate IDs',()=>{
 const tabs=normalizeSession({active:'bad',tabs:[{id:'bad',type:'browser',url:'file:///etc/passwd'},{id:'bad2',type:'browser',url:'https://user:pass@example.test'},{id:'relative',type:'markdown',file:'../private.md'},{id:'unknown',type:'whatever'},{id:'x',type:'omi'},{id:'x',type:'life'}]}).tabs;
 assert.deepEqual(tabs.map(t=>t.id),['overview','x']);assert.equal(normalizeSession({active:'missing'}).active,'overview');
});
test('workspace survives fresh store, saves mode0600 and preserves unreadable record',()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-workspace-'));
 try {const store=new WorkspaceSession(home);assert.equal(store.get(),null);store.save({active:'feature-omi',tabs:[{id:'feature-omi',type:'omi'}]});assert.equal(new WorkspaceSession(home).get().active,'feature-omi');assert.equal(fs.statSync(store.file).mode&0o777,0o600);fs.writeFileSync(store.file,'invalid');assert.throws(()=>store.get(),/preserved/);assert.equal(fs.readFileSync(store.file,'utf8'),'invalid');}finally{fs.rmSync(home,{recursive:true,force:true});}
});
test('restored generated document retains stable identity but no read grant or content',()=>{
 const hostId='12345678-1234-4123-8123-123456789abc',runId='chat-1',documentId='a'.repeat(64),parentId=`peer:${hostId}:${runId}`;
 const saved=normalizeSession({active:`document:${hostId}:${runId}:${documentId}`,tabs:[{id:parentId,type:'remote-run',hostId,runId},{id:'ignored',type:'remote-document',parentId,hostId,runId,documentId,label:'Preview.html',mediaType:'text/html',requestId:'grant',content:'secret',enabled:true}]});
 const document=saved.tabs.find(item=>item.type==='remote-document');
 assert.equal(document.id,saved.active);assert.equal(document.documentId,documentId);assert.equal(document.mediaType,'text/html');
 assert.doesNotMatch(JSON.stringify(saved),/grant|secret|enabled/);
});
test('selected chat child survives restart only while its parent and child remain valid',()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-workspace-'));
 try {
  const store=new WorkspaceSession(home),tabs=[{id:'chat-a',type:'run',label:'A'},{id:'child-a',type:'browser',parentId:'chat-a',url:'https://example.test/'},{id:'chat-b',type:'run',label:'B'},{id:'child-b',type:'browser',parentId:'chat-b',url:'https://example.test/other'}];
  store.save({tabs,active:'child-a',selectedChildren:{'chat-a':'child-a','chat-b':'child-b',missing:'child-a','child-a':'child-b'}});
  const restored=new WorkspaceSession(home).get();assert.deepEqual(restored.selectedChildren,{'chat-a':'child-a','chat-b':'child-b'});assert.equal(restored.active,'child-a');
  const removed=normalizeSession({tabs:tabs.slice(0,1),selectedChildren:restored.selectedChildren});assert.deepEqual(removed.selectedChildren,{});
 } finally {fs.rmSync(home,{recursive:true,force:true});}
});

test('workspace shells retain hidden children and distinct views of a shared chat',()=>{
 const host='00000000-0000-4000-8000-000000000001',parent='workspace:'+host+':research';
 const value=normalizeSession({page:'workspaces',active:parent,tabs:[{id:parent,type:'workspace',workspaceId:'research',label:'Research',hidden:true,workspacePage:'configuration'},{id:'same',type:'run',label:'Main chat'},{id:parent+':chat:same',type:'run',runId:'same',parentId:parent,label:'Same chat'},{id:'browser',type:'browser',parentId:parent,url:'https://example.test',history:{entries:[{url:'https://example.test',title:'Example'}],index:0}}],selectedChildren:{[parent]:parent+':chat:same'}});
 assert.equal(value.tabs.find(t=>t.id===parent).hidden,true);assert.equal(value.tabs.find(t=>t.id===parent).workspacePage,'configuration');
 assert.equal(value.tabs.find(t=>t.parentId===parent&&t.type==='run').runId,'same');assert.equal(value.tabs.find(t=>t.id==='browser').parentId,parent);
 assert.equal(value.selectedChildren[parent],parent+':chat:same');assert.notEqual(value.active,parent);assert.equal(value.page,'workspaces');
});

test('chat drafts survive normalization with stable shared-chat keys and bounded storage',()=>{
 const values={same:'A draft shared by both chat representations','peer:host:chat':'Remote draft',invalid:{token:'not text'},huge:'x'.repeat(110000)};
 const clean=normalizeSession({chatDrafts:values});assert.equal(clean.chatDrafts.same,values.same);assert.equal(clean.chatDrafts.huge.length,100000);assert.equal(clean.chatDrafts.invalid,undefined);
 const lots=normalizeSession({chatDrafts:Object.fromEntries(Array.from({length:250},(_,i)=>['chat-'+i,'x'.repeat(100000)]))});assert.ok(Object.keys(lots.chatDrafts).length<=200);assert.ok(Buffer.byteLength(JSON.stringify(lots.chatDrafts))<501000);
});

test('agent terminal serialization preserves the actual chat independently of workspace parent',()=>{
 const workspace={id:'workspace:local:fixture',type:'workspace',workspaceId:'fixture',label:'Fixture'};
 const result=normalizeSession({tabs:[workspace,{id:'agent-terminal:actual',type:'agent-terminal',parentId:workspace.id,runId:'actual'},{id:'legacy',type:'run'},{id:'agent-terminal:legacy',type:'agent-terminal',parentId:'legacy'},{id:'invalid',type:'agent-terminal',parentId:workspace.id,runId:'bad/path'}]});
 assert.equal(result.tabs.find(tab=>tab.id==='agent-terminal:actual').runId,'actual');assert.equal(result.tabs.find(tab=>tab.id==='agent-terminal:actual').parentId,workspace.id);assert.equal(result.tabs.find(tab=>tab.id==='agent-terminal:legacy').parentId,'legacy');assert.ok(!result.tabs.some(tab=>tab.id==='invalid'));
});

test('workspace save returns its committed normalized descriptors without requiring a disk reread',()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-session-save-result-'));
 try{
  const store=new WorkspaceSession(home),saved=store.save({active:'feature-omi',tabs:[{id:'feature-omi',type:'omi'}]});
  assert.deepEqual(saved,store.get());assert.deepEqual(store.save(saved),saved);
  fs.writeFileSync(store.file,JSON.stringify({active:'feature-life',tabs:[{id:'feature-life',type:'life'}]}));assert.equal(store.get().active,'feature-life');
 }finally{fs.rmSync(home,{recursive:true,force:true});}
});
