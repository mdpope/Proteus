import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {resolvePreviewProject,remapPreviewProjectSession,remapPreviewBrowserPlacement} from '../public/preview-project-placement.js';
const {WorkspaceSession}=createRequire(import.meta.url)('../desktop/workspace-session.cjs');
const id=value=>'project:local:'+value;
const catalog=()=>({projects:[{id:'default',workspaceId:'w',name:'Default'},{id:'other',workspaceId:'other-w',name:'Other'}],projectRedirects:{old:{workspaceId:'w',projectId:'middle',deletedAt:'synthetic'},middle:{workspaceId:'w',projectId:'default',deletedAt:'synthetic'}}});
const root=(projectId,extra={})=>({id:id(projectId),type:'workspace',workspaceId:'w',projectId,label:projectId,workspacePage:'tabs',...extra});

test('project resolution follows fixed same-workspace redirects and rejects cycles and foreign targets',()=>{
 const value=catalog();assert.equal(resolvePreviewProject(value,'old','w'),value.projects[0]);assert.equal(resolvePreviewProject(value,'default','w'),value.projects[0]);assert.equal(resolvePreviewProject(value,'old','other-w'),null);assert.equal(resolvePreviewProject(value,'missing'),null);
 value.projectRedirects.middle.projectId='old';assert.equal(resolvePreviewProject(value,'old'),null);
 value.projectRedirects.middle.projectId='other';assert.equal(resolvePreviewProject(value,'old'),null);
 value.projectRedirects.middle={workspaceId:'other-w',projectId:'other'};assert.equal(resolvePreviewProject(value,'old'),null);
 value.projectRedirects.old=null;assert.equal(resolvePreviewProject(value,'old'),null);
});
test('missing destination replaces source root in place and preserves all resource identities and state',()=>{
 const source=root('old',{hidden:true,navigationClosed:true,custom:'retained'}),chat={id:'old-alias-chat',type:'run',runId:'chat',parentId:source.id},terminal={id:'terminal',type:'terminal',parentId:source.id,terminal:{id:'pty',tmuxSessionId:'shell'},hidden:true},nested={id:'nested',type:'markdown',parentId:chat.id,file:'/synthetic/document.md'},browser={id:'browser',type:'browser',parentId:source.id,unloaded:true,history:{entries:[{id:'entry',url:'https://example.test'}],index:0},associationChatId:'chat'},unchanged={id:'elsewhere',type:'browser'};
 const value={tabs:[unchanged,source,chat,terminal,nested,browser],active:chat.id,selectedChildren:{[source.id]:chat.id,[chat.id]:nested.id},chatDrafts:{chat:'Keep draft'},extension:{kept:true}};
 const before=structuredClone(value),next=remapPreviewProjectSession(value,catalog());assert.deepEqual(value,before);assert.equal(next.tabs[1].id,id('default'));assert.equal(next.tabs[1].hidden,true);assert.equal(next.tabs[1].navigationClosed,true);assert.equal(next.tabs[1].custom,'retained');assert.equal(next.tabs[0],unchanged);assert.equal(next.tabs[4],nested);assert.equal(next.tabs[3].terminal,terminal.terminal);assert.equal(next.tabs[5].history,browser.history);assert.equal(next.tabs[5].associationChatId,'chat');assert.equal(next.active,chat.id);assert.equal(next.selectedChildren[id('default')],chat.id);assert.equal(next.selectedChildren[chat.id],nested.id);assert.equal(next.chatDrafts,value.chatDrafts);assert.equal(next.extension,value.extension);assert.equal(remapPreviewProjectSession(next,catalog()),next);
});
test('existing target root wins intact; resource order and active source selection survive',()=>{
 const source=root('old',{hidden:false}),target=root('default',{hidden:true,navigationClosed:true}),a={id:'a',type:'run',runId:'a',parentId:source.id},b={id:'b',type:'run',runId:'b',parentId:target.id};
 const value={tabs:[source,a,target,b],active:a.id,selectedChildren:{[source.id]:a.id,[target.id]:b.id}};
 const next=remapPreviewProjectSession(value,catalog());assert.deepEqual(next.tabs.map(tab=>tab.id),['a',target.id,'b']);assert.equal(next.tabs[1],target);assert.equal(next.selectedChildren[target.id],a.id);
 const selectedTarget=remapPreviewProjectSession({...value,active:b.id},catalog());assert.equal(selectedTarget.selectedChildren[target.id],b.id);
 const selectedRoot=remapPreviewProjectSession({...value,active:source.id},catalog());assert.equal(selectedRoot.active,target.id);
});
test('stale create with only deleted parent reconstructs a destination root and keeps tab id',()=>{
 const resource={id:'new-browser',type:'browser',parentId:id('old'),hidden:true,unloaded:true};
 const next=remapPreviewProjectSession({tabs:[resource],active:resource.id,selectedChildren:{}},catalog());assert.equal(next.tabs[0].id,id('default'));assert.equal(next.tabs[1].id,resource.id);assert.equal(next.tabs[1].parentId,id('default'));assert.equal(next.tabs[1].hidden,true);assert.equal(next.active,resource.id);
});
test('browser mapping preserves grants, native view and metadata while updating project placement',()=>{
 const view={},value={id:'browser',parentId:id('old'),destination:{type:'project',id:'old',workspaceId:'w',extension:'kept'},projectId:'old',projectName:'Old',workspaceId:'w',owner:'chat',shared:true,developerShared:true,resumeOwner:'chat',view,hidden:true,agentActions:2};
 const next=remapPreviewBrowserPlacement(value,catalog());assert.equal(next.parentId,id('default'));assert.deepEqual(next.destination,{type:'project',id:'default',workspaceId:'w',extension:'kept'});assert.equal(next.projectId,'default');assert.equal(next.projectName,'Default');for(const field of ['id','owner','shared','developerShared','resumeOwner','view','hidden','agentActions'])assert.equal(next[field],value[field]);assert.equal(value.parentId,id('old'));assert.equal(remapPreviewBrowserPlacement(next,catalog()),next);
 const foreign={...value,workspaceId:'other-w'};assert.equal(remapPreviewBrowserPlacement(foreign,catalog()),foreign);
 const metadata={projectId:'old',projectName:'Old',workspaceId:'w',extension:{kept:true}},mapped=remapPreviewBrowserPlacement(metadata,catalog());assert.equal(mapped.projectId,'default');assert.equal(mapped.projectName,'Default');assert.equal(mapped.extension,metadata.extension);
 const wrapped={parentId:id('old'),destination:value,extension:'retained'},wrappedNext=remapPreviewBrowserPlacement(wrapped,catalog());assert.equal(wrappedNext.parentId,id('default'));assert.equal(wrappedNext.destination.parentId,id('default'));assert.equal(wrappedNext.destination.destination.id,'default');assert.equal(wrappedNext.extension,'retained');assert.equal(remapPreviewBrowserPlacement(wrappedNext,catalog()),wrappedNext);
});
test('remote content under a deleted local project is reparented without changing its owner',()=>{
 const hostId='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',remote={id:'remote-document',type:'remote-document',hostId,runId:'chat',documentId:'a'.repeat(64),parentId:id('old')};
 const value={tabs:[remote],active:remote.id};const next=remapPreviewProjectSession(value,catalog());assert.equal(next.tabs[1].parentId,id('default'));assert.equal(next.tabs[1].hostId,hostId);assert.equal(next.tabs[1].documentId,remote.documentId);
});
test('remote project redirects preserve native identity and authorization while isolating other owners',()=>{
 const hostId='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',otherHost='bbbbbbbb-bbbb-4ccc-8ddd-eeeeeeeeeeee',remoteId=project=>'project:'+hostId+':'+project;
 const local=root('old'),other={...root('old'),id:'project:'+otherHost+':old',hostId:otherHost},source={...root('old'),id:remoteId('old'),hostId,workspaceName:'Remote workspace'};
 const native={id:'native-browser',parentId:source.id,owner:'origin-chat',resumeOwner:'origin-chat',shared:true,developerShared:true,profileId:'profile',loaded:false,history:{entries:[{id:'entry',url:'https://example.test/'}],index:0}};
 const browser={id:native.id,type:'browser',contentTabId:'portable-browser',parentId:source.id,associationChatId:'origin-chat',hidden:true,info:native};
 const document={id:'remote-document',type:'remote-document',parentId:source.id,hostId,runId:'origin-chat',documentId:'a'.repeat(64),requestId:'exact-version-request',source:'/synthetic/original.md'};
 const terminal={id:'terminal-view',type:'terminal',hostId,parentId:source.id,terminal:{id:'original-pty',tmuxSessionId:'original-session'}};
 const localBrowser={id:'local-browser',type:'browser',parentId:local.id},otherBrowser={id:'other-browser',type:'browser',parentId:other.id};
 const value={tabs:[local,localBrowser,other,otherBrowser,source,browser,document,terminal],active:document.id,selectedChildren:{[source.id]:document.id,[local.id]:localBrowser.id},chatDrafts:{'peer:origin-chat':'Keep my draft'},extension:{retained:true}};
 const before=structuredClone(value),next=remapPreviewProjectSession(value,catalog(),{hostId});assert.deepEqual(value,before);
 for(const tab of [local,localBrowser,other,otherBrowser])assert.equal(next.tabs.find(row=>row.id===tab.id),tab);
 const movedBrowser=next.tabs.find(row=>row.id===browser.id);assert.equal(movedBrowser.parentId,remoteId('default'));assert.equal(movedBrowser.info.parentId,remoteId('default'));
 for(const field of ['id','owner','resumeOwner','shared','developerShared','profileId','loaded','history'])assert.equal(movedBrowser.info[field],native[field]);
 assert.equal(movedBrowser.contentTabId,browser.contentTabId);assert.equal(movedBrowser.associationChatId,'origin-chat');assert.equal(movedBrowser.hidden,true);
 const movedDocument=next.tabs.find(row=>row.id===document.id);for(const field of ['id','hostId','runId','documentId','requestId','source'])assert.equal(movedDocument[field],document[field]);assert.equal(movedDocument.parentId,remoteId('default'));
 assert.equal(next.tabs.find(row=>row.id===terminal.id).terminal,terminal.terminal);assert.equal(next.active,document.id);assert.equal(next.selectedChildren[remoteId('default')],document.id);assert.equal(next.selectedChildren[local.id],localBrowser.id);assert.equal(next.chatDrafts,value.chatDrafts);assert.equal(next.extension,value.extension);
 assert.equal(remapPreviewProjectSession(next,catalog(),{hostId}),next);
});
test('WorkspaceSession get and stale saves remap before orphan filtering while production remains unchanged',t=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-project-placement-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
 const stale={tabs:[root('old'),{id:'chat-view',type:'run',runId:'chat',parentId:id('old')},{id:'terminal',type:'terminal',parentId:id('old'),terminal:{id:'pty',persistence:'tmux',tmuxSessionId:'shell',tmuxSessionTag:'tag'},hidden:true}],active:'chat-view',selectedChildren:{[id('old')]:'chat-view'},chatDrafts:{chat:'Retained draft'}};
 const file=path.join(home,'desktop-workspace.json');fs.writeFileSync(file,JSON.stringify(stale));const original=fs.readFileSync(file);
 const session=new WorkspaceSession(home,{preview:true,remap:value=>remapPreviewProjectSession(value,catalog())});
 const loaded=session.get();assert.equal(loaded.tabs.find(tab=>tab.id==='chat-view').parentId,id('default'));assert.equal(loaded.chatDrafts.chat,'Retained draft');assert.deepEqual(fs.readFileSync(file),original,'Read projection does not rewrite disk');
 session.save(stale);const saved=JSON.parse(fs.readFileSync(file));assert.ok(!saved.tabs.some(tab=>tab.id===id('old')));assert.equal(saved.tabs.find(tab=>tab.id==='terminal').terminal.tmuxSessionTag,'tag');assert.equal(saved.selectedChildren[id('default')],'chat-view');
 const childOnly={...stale,tabs:stale.tabs.filter(tab=>tab.type!=='workspace')};session.save(childOnly);assert.equal(session.get().tabs.find(tab=>tab.id==='chat-view').parentId,id('default'));
 const ordinary=new WorkspaceSession(home,{preview:false,remap:()=>{throw new Error('Preview remapper must not run');}});ordinary.save(stale);assert.equal(ordinary.get().tabs.find(tab=>tab.id==='chat-view').parentId,id('old'));
});
test('unrelated, current, unknown and cyclic placement remains unchanged',()=>{
 const value={tabs:[root('default'),{id:'chat-child',type:'markdown',parentId:'chat',file:'/synthetic/file.md'}],active:id('default'),selectedChildren:{}};assert.equal(remapPreviewProjectSession(value,catalog()),value);
 const invalid=catalog();invalid.projectRedirects.middle.projectId='old';const orphan={tabs:[root('old'),{id:'b',type:'browser',parentId:id('old')}],active:id('old')};assert.equal(remapPreviewProjectSession(orphan,invalid),orphan);
});

test('peer upgrade moves legacy workspace chat aliases into owner projects without recreating children or root quick views',()=>{
 const hostId='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',workspace='workspace:'+hostId+':w',project='project:'+hostId+':default';
 const owner={...catalog(),memberships:{chat:{workspaceId:'w',projectId:'default'}}};
 const root={id:workspace,type:'workspace',hostId,workspaceId:'w'},alias={id:'saved-peer-view',type:'remote-run',hostId,runId:'chat',parentId:workspace},child={id:'native-browser',type:'browser',contentTabId:'shared-browser',parentId:alias.id,url:'https://example.test/',history:{entries:[{id:'entry',url:'https://example.test/'}],index:0}},duplicate={...child,id:'second-native-browser'},quick={id:'peer:'+hostId+':chat',type:'remote-run',hostId,runId:'chat'},direct={id:'workspace-browser',type:'browser',parentId:workspace};
 const value={tabs:[root,alias,child,duplicate,quick,direct],active:child.id,selectedChildren:{[workspace]:alias.id,[alias.id]:child.id},chatDrafts:{chat:'Unsent'}};
 const next=remapPreviewProjectSession(value,owner,{hostId});assert.equal(next.tabs.find(tab=>tab.id===alias.id).parentId,project);assert.ok(next.tabs.some(tab=>tab.id===project));
 for(const tab of [root,child,duplicate,quick,direct])assert.equal(next.tabs.find(row=>row.id===tab.id),tab);
 assert.equal(next.active,child.id);assert.equal(next.selectedChildren[alias.id],child.id);assert.equal(next.selectedChildren[project],alias.id);assert.equal(next.chatDrafts,value.chatDrafts);
 assert.equal(remapPreviewProjectSession(next,owner,{hostId}),next);
});

test('peer upgrade preserves the active descendant path over an existing destination selection',()=>{
 const hostId='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',workspace='workspace:'+hostId+':w',project='project:'+hostId+':default',owner={...catalog(),memberships:{chat:{workspaceId:'w',projectId:'default'}}};
 const value={tabs:[{id:workspace,type:'workspace',hostId,workspaceId:'w'},{id:project,type:'workspace',hostId,workspaceId:'w',projectId:'default'},{id:'existing',type:'remote-run',hostId,runId:'other',parentId:project},{id:'moving',type:'remote-run',hostId,runId:'chat',parentId:workspace},{id:'child',type:'browser',parentId:'moving'}],active:'child',selectedChildren:{[workspace]:'moving',[project]:'existing',moving:'child'}};
 const next=remapPreviewProjectSession(value,owner,{hostId});assert.equal(next.active,'child');assert.equal(next.selectedChildren[project],'moving');assert.equal(next.selectedChildren.moving,'child');assert.equal(next.tabs.length,value.tabs.length);
});
