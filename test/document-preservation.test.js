import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import {ContentTabs,workspaceContentScopes} from '../src/services/workspaces/content-tabs.js';
import {captureNavigation,verifyNavigation} from '../src/services/updates/navigation-preservation.js';
import {reconcileWindowSession} from '../public/shared/navigation/window-session-reconcile.js';
import {documentSessionMetadata,mergeContentTabMetadata} from '../public/models/content-tab-descriptor.js';
import {openChatDocument} from '../src/services/chats/document-tools.js';
import {tabChanges} from '../public/models/content-tab-sync.js';

const documentId='a'.repeat(64),id='document:'+documentId;
const document={id,type:'document',documentId,title:'Synthetic document',chatId:'origin-chat',associationChatId:'origin-chat',mediaType:'text/markdown'};
const stale={id,type:'document',documentId,title:document.title,mediaType:document.mediaType};
function fixture(t){
 const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-document-preservation-'));
 t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
 const contentTabs=new ContentTabs(home),scope={scope:'project',id:'project'};
 contentTabs.mutate({...scope,expectedRevision:0,operations:[{action:'open',tab:document},{action:'close',id:'closed-document'}]});
 const session={tabs:[{id:'project-view',type:'workspace',workspaceId:'workspace',projectId:'project'},...['first-view','selected-alias'].map(id=>({id,type:'markdown',contentTabId:document.id,parentId:'project-view',file:'/synthetic/notes.md',label:document.title}))],active:'selected-alias',selectedChildren:{'project-view':'selected-alias'},chatDrafts:{'origin-chat':'Unsent synthetic draft'}};
 const service={contentTabs,context:{config:()=>({workspaces:[{id:'workspace',name:'Synthetic workspace'}]})},workspaceProjects:{read:()=>({projects:[{id:'project',workspaceId:'workspace',name:'Synthetic project'}],memberships:{'origin-chat':{projectId:'project'}},defaultProjectIds:{workspace:'project'}})},navigationSessions:()=>[{id:'main',session}]};
 return {contentTabs,scope,session,service};
}
test('a stale document snapshot cannot strip registry associations or change update preservation',t=>{
 const {contentTabs,scope,service}=fixture(t),before=captureNavigation(service),initial=contentTabs.get(scope.scope,scope.id),bytes=fs.readFileSync(contentTabs.file);
 const after=contentTabs.mutate({...scope,expectedRevision:initial.revision,operations:[{action:'open',updateOnly:true,tab:stale}]});
 assert.deepEqual(after,initial);assert.deepEqual(fs.readFileSync(contentTabs.file),bytes);
 assert.deepEqual(verifyNavigation(before,captureNavigation(service)),{workspaces:1,projects:1,scopes:1,tabs:1,windows:1});
 assert.deepEqual(tabChanges(initial.tabs,[stale]),[],'renderer must not keep publishing a lossy snapshot');
 // Ordinary edits still apply without dropping the original source binding.
 const renamed=contentTabs.mutate({...scope,expectedRevision:after.revision,operations:[{action:'open',updateOnly:true,tab:{...stale,title:'Changed title'}}]});
 assert.equal(renamed.tabs[0].title,'Changed title');assert.equal(renamed.tabs[0].chatId,'origin-chat');
 const closed=contentTabs.mutate({...scope,expectedRevision:renamed.revision,operations:[{action:'close',id}]});
 assert.deepEqual(contentTabs.mutate({...scope,expectedRevision:closed.revision,operations:[{action:'open',updateOnly:true,tab:stale}]}),closed,'a stale snapshot never reopens a closed document');
});
test('existing and new window document views regain the registry chat binding through save and reload',t=>{
 const {contentTabs,scope,session,service}=fixture(t),before=captureNavigation(service),original=structuredClone(session),read=(scope,id)=>contentTabs.get(scope,id);
 // Historical registries can have chatId without the presentation association field.
 const owner={...contentTabs.get(scope.scope,scope.id),tabs:[{...stale,chatId:'origin-chat'}]};
 const restored=reconcileWindowSession(session,()=>owner);
 assert.deepEqual(session,original,'projection does not mutate the saved checkpoint');
 assert.equal(restored.active,session.active);assert.deepEqual(restored.selectedChildren,session.selectedChildren);assert.deepEqual(restored.chatDrafts,session.chatDrafts);
 for(const tab of restored.tabs.filter(tab=>tab.type==='markdown'))assert.equal(documentSessionMetadata(tab).associationChatId,'origin-chat');
 const missing=reconcileWindowSession({...session,tabs:session.tabs.slice(0,1)},()=>owner,{documentFile:()=>'/synthetic/notes.md'});
 assert.equal(missing.tabs[1].associationChatId,'origin-chat');
 // Repeat the real projection -> serialization -> passive registry update path.
 let saved=session;const revision=contentTabs.get(scope.scope,scope.id).revision;
 for(let pass=0;pass<3;pass++){
  saved=reconcileWindowSession(saved,read);
  saved={...saved,tabs:saved.tabs.map(tab=>tab.type==='markdown'?{...tab,...documentSessionMetadata(tab)}:tab)};
  const snapshot=workspaceContentScopes(saved).find(row=>row.scope==='project');
  contentTabs.mutate({...scope,expectedRevision:revision,operations:snapshot.tabs.map(tab=>({action:'open',updateOnly:true,tab}))});
  assert.equal(contentTabs.get(scope.scope,scope.id).revision,revision);
  verifyNavigation(before,captureNavigation({...service,navigationSessions:()=>[{id:'main',session:saved}]}));
 }
 assert.deepEqual(saved.tabs.map(tab=>tab.id),session.tabs.map(tab=>tab.id));
});
test('association retention is limited to the same document, never inferred from its presentation parent',()=>{
 for(const incoming of [{...stale,id:'document:'+('b'.repeat(64)),documentId:'b'.repeat(64)},{id,type:'browser',title:'Browser',url:'https://example.test'}]){
  const merged=mergeContentTabMetadata(document,incoming);assert.equal(merged.chatId,undefined);assert.equal(merged.associationChatId,undefined);
 }
 const reassociated=mergeContentTabMetadata(document,{...stale,chatId:'explicit-chat',associationChatId:'explicit-chat'});
 assert.equal(reassociated.chatId,'explicit-chat');assert.equal(reassociated.associationChatId,'explicit-chat');
 const unbound=reconcileWindowSession({tabs:[{id:'parent',type:'run',runId:'presentation-chat'},{id:'view',type:'markdown',contentTabId:id,parentId:'parent'}]},()=>({revision:1,tabs:[stale]}));
 assert.equal(unbound.tabs[1].associationChatId,undefined);
});

test('reopening a document selects its existing destination alias and restores origin without closing other views',async t=>{
 const {contentTabs}=fixture(t),home=path.dirname(contentTabs.file),file=path.join(home,'notes.md');fs.writeFileSync(file,'# Synthetic document');
 const run={id:'origin-chat',schedule:{workspace:{cwd:home,additionalDirectories:[]}}};let placement={scope:'chat',id:run.id,parentId:run.id},opened;
 const service={contentTabs,engine:{getRun:()=>run},workspaceFiles:{roots:()=>({roots:[{id:'root',available:true,path:home}]}),read:()=>({file,content:'# Synthetic document'})},context:{scope:id=>assert.equal(id,'workspace')},chatResourcePlacement:()=>placement,onDocumentOpened:value=>{opened=value;}};
 const first=await openChatDocument(service,{path:file},run.id),source=contentTabs.get('chat',run.id);
 const legacy={...source.tabs[0],title:'Kept title',customTitle:'Kept title'};delete legacy.chatId;delete legacy.associationChatId;
 contentTabs.authorizeDocumentPlacement(first.documentId,'workspace','workspace');
 contentTabs.mutate({scope:'workspace',id:'workspace',expectedRevision:0,operations:[{action:'open',tab:legacy}]});
 placement={scope:'workspace',id:'workspace',parentId:'workspace-view'};
 const result=await openChatDocument(service,{path:file},run.id),destination=contentTabs.get('workspace','workspace');
 assert.equal(result.opened,true);assert.equal(result.documentId,first.documentId);assert.equal(result.title,'Kept title');
 assert.equal(destination.tabs.length,1);assert.equal(destination.tabs[0].chatId,run.id);assert.equal(destination.tabs[0].associationChatId,run.id);
 assert.deepEqual(contentTabs.get('chat',run.id),source,'historical alias is retained without a close or move');
 assert.deepEqual(opened.placement,placement);assert.equal(contentTabs.documentSource('workspace',first.documentId,'workspace'),file);
 const bytes=fs.readFileSync(contentTabs.file);await openChatDocument(service,{path:file},run.id);assert.deepEqual(fs.readFileSync(contentTabs.file),bytes,'repeated open is idempotent');
 await assert.rejects(openChatDocument(service,{path:path.join(path.dirname(home),'outside.md')},run.id));
});
