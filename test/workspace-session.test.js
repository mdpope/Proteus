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
