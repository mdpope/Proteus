import {showMoveMenu,projectMoveGroups} from '../../shared/navigation/move-menu.js';
import {previewEnabled,renderPreviewWorkspace,renderPreviewCollection,openPreviewChat,movePreviewChat,projectIcon} from '../../shared/navigation/desktop-preview.js';
import {reconcileIndexedChat} from '../chats/chats-index.js';
import {mountWorkspaceTabs} from './workspace-tabs.js';
import {workspaceDeleteDialog} from './workspace-delete-dialog.js';
import {computerName} from '../../services/remote/computer-identity.js';
import {renderWorkspaceList,mountWorkspaceConfiguration,workspaceCatalog,mountWorkspaceApprovals,workspaceIcon} from './workspace-ui.js';
let ui;const catalogs=new Map();
const projectOperations=new Map();
const esc=value=>ui.escape(value),$=s=>document.querySelector(s);
const key=(host,id)=>`workspace:${host||'local'}:${id}`;
const chatHost=row=>row.local||!row.hostId||row.hostId==='local'?'local':row.hostId;
const recent=()=>{try{return JSON.parse(localStorage.getItem('proteus.workspaces.recent')||'[]');}catch{return [];}};
export function initWorkspaces(options){ui=options;catalogs.clear();projectOperations.clear();}
const request=(host,method,args={})=>host&&host!=='local'?window.desktop.peers({action:'request',hostId:host,method,args}):ui.api(method==='context.get'?'/api/context'+(args.workspaceId?'?workspaceId='+encodeURIComponent(args.workspaceId):''):method==='context.refresh'?'/api/context/refresh':'/api/context',method==='context.get'?undefined:args);
function remember(row){const id=key(row.hostId,row.id);localStorage.setItem('proteus.workspaces.recent',JSON.stringify([id,...recent().filter(x=>x!==id)].slice(0,50)));}
function localCatalog(){for(const tab of ui.state.tabs.filter(t=>t.type==='workspace'&&t.hostId)){if(!catalogs.has(tab.hostId))catalogs.set(tab.hostId,{hostId:tab.hostId,hostName:tab.hostName||tab.hostId,online:false,context:{workspaces:[]}});const rows=catalogs.get(tab.hostId).context.workspaces;if(!rows.some(w=>w.id===tab.workspaceId))rows.push({id:tab.workspaceId,name:tab.workspaceName||tab.label});}catalogs.set('local',{context:ui.state.data.context,hostId:'local',hostName:computerName(ui.state.data.hostName),online:true});}
export function recentWorkspaces(){localCatalog();const rows=[...catalogs.values()].flatMap(c=>c.context.workspaces.map(w=>({...w,hostId:c.hostId,hostName:c.hostName})));const ids=recent();return rows.sort((a,b)=>{const ai=ids.indexOf(key(a.hostId,a.id)),bi=ids.indexOf(key(b.hostId,b.id));return (ai<0?999:ai)-(bi<0?999:bi)||a.name.localeCompare(b.name);}).slice(0,7);}
async function loadPeerCatalog(hostId,hostName){
 // Every renderer window reads one owner's authenticated push snapshot. A
 // sidebar redraw must not start another full context+sync network round trip.
 const snapshot=await window.desktop.peers({action:'workspace-snapshot',hostId});
 const context=snapshot.context;
 const value={context,hostId,hostName:hostName||snapshot?.hostName||catalogs.get(hostId)?.hostName||hostId,online:true,capabilities:snapshot?.capabilities||[],runs:snapshot?.runs||catalogs.get(hostId)?.runs||[],projectTabs:catalogs.get(hostId)?.projectTabs||{},workspaceProjects:snapshot?.capabilities?.includes('projects.v1')?snapshot.workspaceProjects:undefined};
 catalogs.set(hostId,value);
 if(value.workspaceProjects&&ui.state.tabs.some(tab=>tab.hostId===hostId&&(value.workspaceProjects.projects.some(project=>project.id===tab.projectId&&project.workspaceId!==tab.workspaceId)||value.workspaceProjects.projectRedirects?.[tab.projectId]||tab.type==='remote-run'&&value.workspaceProjects.memberships?.[tab.runId]?.projectId&&!ui.state.tabs.some(parent=>parent.id===tab.parentId&&parent.type==='workspace'&&parent.projectId===value.workspaceProjects.memberships[tab.runId].projectId)))){
  const reconciled=await ui.reconcileRemoteProjectPlacement?.(hostId,value.workspaceProjects);if(reconciled)value.workspaceProjects=reconciled;
 }
 return value;
}
async function loadCatalogs(){
 localCatalog();const peers=await ui.loadPeers(),available=new Set(peers.map(p=>p.hostId));
 for(const host of catalogs.keys())if(host!=='local'&&!available.has(host))catalogs.delete(host);
 await Promise.allSettled(peers.map(async peer=>{
  const cached=catalogs.get(peer.hostId)||{hostId:peer.hostId,context:{workspaces:[]}};
  catalogs.set(peer.hostId,{...cached,hostName:peer.label||cached.hostName||'Paired computer',paused:!!peer.paused,online:false});
  if(peer.paused)return;
  try{await loadPeerCatalog(peer.hostId,peer.label);}catch(error){const owner=catalogs.get(peer.hostId);if(owner){owner.online=false;owner.error=error.message;}}
 }));return [...catalogs.values()];
}
// Read-only owner snapshots shared by the desktop sidebar. Catalog discovery never
// selects an execution destination or creates resource views.
export function workspaceOwners(){
 localCatalog();return [...catalogs.values()].filter(owner=>owner.hostId!=='local').map(owner=>{
  const saved=new Map();for(const tab of ui.state.tabs)if(tab.type==='workspace'&&tab.hostId===owner.hostId&&tab.projectId&&tab.workspaceId)saved.set(tab.projectId,{id:tab.projectId,workspaceId:tab.workspaceId,name:tab.projectName||tab.label||'Saved project'});
  return {...owner,savedProjects:[...saved.values()]};
 });
}
export async function refreshWorkspaceOwners(){await loadCatalogs();return workspaceOwners();}
export async function loadWorkspaceOwnerTabs(hostId,projectId){
 const owner=catalogs.get(hostId);
 if(!owner?.online||!owner.workspaceProjects?.projects.some(project=>project.id===projectId))return;
 const result=await request(hostId,'tabs.get',{scope:'project',id:projectId});
 if(catalogs.get(hostId)!==owner)return;
 owner.projectTabs??={};owner.projectTabs[projectId]=result;return result;
}
export function openWorkspace(row,page){remember(row);page??=row.hostId&&row.hostId!=='local'?(catalogs.get(row.hostId)?.workspaceProjects?'projects':'chats'):previewEnabled(ui.state)?'projects':'chats';const id=key(row.hostId,row.id);const existing=ui.state.tabs.find(t=>t.id===id);const tab={id,type:'workspace',workspaceId:row.id,label:row.name,hostName:row.hostName||computerName(ui.state.data.hostName),...(row.hostId&&row.hostId!=='local'?{hostId:row.hostId}:{}),workspacePage:page,hidden:false,navigationClosed:false};if(existing)Object.assign(existing,tab);ui.openTab(tab);ui.state.tab=id;ui.render();}
export function openRemoteProject(hostId,project,{select=true}={}){
 const owner=catalogs.get(hostId),workspace=owner?.context.workspaces.find(row=>row.id===project?.workspaceId);
 if(!project||!workspace||hostId==='local')throw Error('This project is unavailable on its owning computer.');
 const workspaceID=key(hostId,workspace.id);if(!ui.state.tabs.some(tab=>tab.id===workspaceID))ui.state.tabs.push({id:workspaceID,type:'workspace',workspaceId:workspace.id,hostId,hostName:owner.hostName,label:workspace.name,workspacePage:'projects'});
 const id=`project:${hostId}:${project.id}`,old=ui.state.tabs.find(tab=>tab.id===id),tab={...(old||{}),id,type:'workspace',hostId,hostName:owner.hostName,workspaceId:workspace.id,workspaceName:workspace.name,projectId:project.id,projectName:project.name,label:project.name,workspacePage:old?.workspacePage==='tabs'?'tabs':'chats',hidden:false,navigationClosed:false};
 if(old)Object.assign(old,tab);else ui.state.tabs.push(tab);
 if(select)ui.openTab(tab);return old||tab;
}
export function openWorkspaceChat(parent,row){if(previewEnabled(ui.state)&&!parent.hostId&&openPreviewChat({...row,workspaceId:parent.workspaceId,projectId:row.projectId||parent.projectId}))return;const runId=row.chatId||row.runId||row.id,hostId=parent.hostId;
 if(hostId){const catalog=catalogs.get(hostId)?.workspaceProjects,member=catalog?.memberships?.[runId],projectId=row.projectId||member?.projectId||parent.projectId||catalog?.defaultProjectIds?.[parent.workspaceId],project=catalog?.projects.find(item=>item.id===projectId&&item.workspaceId===parent.workspaceId);if(project)parent=openRemoteProject(hostId,project,{select:false});}
 const existing=ui.state.tabs.find(tab=>tab.type===(hostId?'remote-run':'run')&&(tab.hostId||'local')===(hostId||'local')&&(tab.runId||tab.id)===runId);
 if(existing)for(const child of ui.state.tabs)if(child.parentId===existing.id&&child.type==='agent-terminal')child.runId||=runId;
 ui.openTab({id:existing?.id||parent.id+':chat:'+runId,type:hostId?'remote-run':'run',runId,parentId:parent.id,label:row.title||row.label||'Chat',...(hostId?{hostId}:{})});}
export async function sendChatToWorkspace(row){if(chatHost(row)==='local'&&previewEnabled(ui.state)&&openPreviewChat(row))return;
 try{
  const host=row.local||!row.hostId||row.hostId==='local'?'local':row.hostId,runId=row.chatId||row.runId||row.id;
  const context=host==='local'?await request(host,'context.get'):(await loadPeerCatalog(host,row.destinationName||row.hostName)).context;
  // Restored top-level tabs need not contain workspace metadata. Resolve membership
  // from the owner without changing its active chat subscription.
  let run=host==='local'?ui.state.data.runs.find(r=>r.id===runId):null;
  if(host!=='local'&&!row.workspaceId)for(let offset=0;!run;offset+=100){const rows=await request(host,'runs.list',{offset,includeArchived:true});run=rows.find(r=>r.id===runId);if(rows.length<100)break;}
  const workspaceId=Object.hasOwn(run||{},'workspaceId')?run.workspaceId:row.workspaceId||run?.schedule?.context?.workspaceId;
  const profile=context.workspaces.find(w=>w.id===workspaceId);if(!profile)throw Error('This chat has no associated workspace.');
  const owner=catalogs.get(host),hostName=row.destinationName||row.hostName||owner?.hostName||(host==='local'?computerName(ui.state.data.hostName):host);
  openWorkspace({...profile,hostId:host,hostName});
  const parent=ui.state.tabs.find(t=>t.id===key(host,profile.id));openWorkspaceChat(parent,{...row,runId,workspaceId});
  if(host!=='local'&&catalogs.get(host)?.workspaceProjects)return; // Reusing the existing chat identity retains its child-resource origins.
  const canonical=host==='local'?runId:'peer:'+host+':'+runId,old=ui.state.tabs.find(t=>t.id===canonical&&!t.parentId);
  if(old){
   const children=ui.state.tabs.filter(t=>t.parentId===old.id),moved=[];
   try{for(const child of children.filter(t=>t.type==='browser')){await window.desktop.browser({action:'transfer',id:child.id,group:'main',parentId:parent.id});moved.push(child);}}
   catch(error){await Promise.allSettled(moved.map(child=>window.desktop.browser({action:'transfer',id:child.id,group:'main',parentId:old.id})));throw error;}
   for(const child of children){if(child.type==='agent-terminal')child.runId=child.runId||old.runId||runId;child.parentId=parent.id;}
   ui.state.tabs=ui.state.tabs.filter(t=>t!==old);
  }
  ui.render();
 }catch(error){ui.toast(error.message);}
}
export async function moveChatToWorkspace(row){if(chatHost(row)==='local'&&previewEnabled(ui.state))return movePreviewChat(row);
 const host=row.local||!row.hostId||row.hostId==='local'?'local':row.hostId,runId=row.chatId||row.runId||row.id;
 if(host!=='local'){
  const owner=await loadPeerCatalog(host,row.destinationName||row.hostName);
  if(owner.workspaceProjects)return moveRemoteProjectChat(row,owner);
 }
 const context=await request(host,'context.get');
 showMoveMenu({showDialog:ui.showDialog,escape:esc,groups:projectMoveGroups(context.workspaces,[],{workspaceOnly:true}),current:row.workspaceId,application:false,submit:async workspaceId=>{
  const profile=context.workspaces.find(item=>item.id===workspaceId);
  const result=host==='local'?await ui.api('/api/chat-workspace',{id:runId,workspaceId}):await window.desktop.peers({action:'request',hostId:host,method:'chat.move',args:{id:runId,workspaceId}});
  reconcileIndexedChat({...row,...result,hostId:host,chatId:runId,local:host==='local'});
  const views=ui.state.tabs.filter(tab=>['run','remote-run'].includes(tab.type)&&(tab.runId||tab.id)===runId&&(tab.hostId||'local')===host);
  openWorkspace({...profile,hostId:host,hostName:row.destinationName||row.hostName});
  const parent=ui.state.tabs.find(tab=>tab.id===key(host,workspaceId)),children=ui.state.tabs.filter(tab=>views.some(view=>tab.parentId===view.id));
  for(const child of children){if(child.type==='browser')child.info=await window.desktop.browser({action:'transfer',id:child.id,group:'main',parentId:parent.id});if(child.type==='agent-terminal')child.runId||=runId;child.parentId=parent.id;}
  ui.state.tabs=ui.state.tabs.filter(tab=>!views.includes(tab));
  const run=ui.state.data.runs.find(run=>run.id===runId);if(run)Object.assign(run,result);
  openWorkspaceChat(parent,{...row,...result,runId,title:row.title||views[0]?.label||'Chat'});ui.render();ui.revealSelectedTab?.();
 }});
}
function nameDialog(title,value,submit){ui.showDialog(`<h2>${esc(title)}</h2><label>Name<input id="workspace-copy-name" value="${esc(value)}" maxlength="200"></label><div class="actions"><button id="close-dialog">Cancel</button><button id="dialog-submit" class="primary">Continue</button></div>`,async()=>{const name=$('#workspace-copy-name').value.trim();if(!name)throw Error('Enter a workspace name.');await submit(name);});}
async function copyLocal(row){nameDialog('Copy workspace',row.name+' copy',async name=>{const context=await request(row.hostId,'context.get',{workspaceId:row.id});const result=await request(row.hostId,'context.update',{action:'copy-workspace',workspaceId:row.id,name,expectedRevision:context.revision});if(row.hostId==='local')ui.state.data.context=result;catalogs.set(row.hostId,{context:result,hostId:row.hostId,hostName:row.hostName,online:true});openWorkspace({...result.workspaces.find(w=>w.id===result.copiedWorkspaceId),hostId:row.hostId,hostName:row.hostName},'configuration');});}
export async function createWorkspace(){try{const folders=await window.desktop.choosePaths({kind:'folder'});if(!folders.length)return;nameDialog('New workspace',folders[0].split('/').pop(),async name=>{const before=ui.state.data.context;const result=await request('local','context.update',{action:'workspace',create:true,name,cwd:folders[0],expectedRevision:before.revision});ui.state.data.context=result;const profile=result.workspaces.find(w=>!before.workspaces.some(p=>p.id===w.id));openWorkspace({...profile,hostId:'local'},'configuration');});}catch(e){ui.toast(e.message);}}
export async function renderWorkspaces(){const main=$('#main'),target=ui.state.tab,projects=previewEnabled(ui.state);if(projects)renderPreviewCollection();else main.innerHTML='<p class="note">Loading workspaces…</p>';const marker=document.createElement('section');main.append(marker);const values=await loadCatalogs();if(ui.state.tab!==target||ui.state.page!=='context'||!marker.isConnected)return;if(projects){renderPeerWorkspaceList(marker,values.filter(row=>row.hostId!=='local'));return;}renderWorkspaceList(main,{catalogs:values,recent:recent(),open:openWorkspace,copy:copyLocal,create:createWorkspace,notify:ui.toast,importWorkspace:async()=>{try{const files=await window.desktop.choosePaths({kind:'workspace'});if(!files.length)return;ui.state.data.context=await request('local','context.update',{action:'import',file:files[0],expectedRevision:ui.state.data.context.revision});await renderWorkspaces();}catch(e){ui.toast(e.message);}}});}
async function copyMachine(parent,profile,catalog){const destinations=(await loadCatalogs()).filter(c=>c.hostId!==(parent.hostId||'local')&&c.online);if(!destinations.length){ui.toast('Connect another desktop in Connections before copying to it.');return;}const paths=[...new Set([profile.cwd,...(profile.additionalDirectories||[]),...(profile.libraryFolders||[]),...(profile.universalFolders||[]),...(profile.documents||[]).map(d=>(d.path||d.file).replace(/\/[^/]+$/,'')),...(profile.workspaceFiles||[]).map(file=>file.replace(/\/[^/]+$/,''))])].filter((folder,_,all)=>!all.some(parent=>parent!==folder&&folder.startsWith(parent.replace(/\/$/,'')+'/')));ui.showDialog(`<h2>Copy workspace to another computer</h2><label>Name<input id="workspace-copy-name" value="${esc(profile.name)}"></label><label>Destination<select id="workspace-copy-host">${destinations.map(c=>`<option value="${esc(c.hostId)}">${esc(c.hostName)}</option>`).join('')}</select></label><p class="note">Map source paths to existing folders on the destination. The new workspace has its own owner and approvals. Browser sign-ins and live sessions stay on their current computer.</p>${paths.map((p,i)=>`<label class="filepath">${esc(p)}<input data-path-map="${i}" value="${esc(p)}"></label>`).join('')}<button id="close-dialog">Cancel</button><button id="dialog-submit">Copy configuration</button>`,async()=>{const host=$('#workspace-copy-host').value,dest=destinations.find(c=>c.hostId===host),current=await request(host,'context.get');const result=await request(host,'context.update',{action:'import-workspace',name:$('#workspace-copy-name').value.trim(),configuration:profile,entries:catalog.entries,pathMappings:paths.map((from,i)=>({from,to:$('[data-path-map="'+i+'"]').value.trim()})),expectedRevision:current.revision});catalogs.set(host,{...dest,context:result});if(host==='local')ui.state.data.context=result;openWorkspace({...result.workspaces.find(w=>w.id===result.copiedWorkspaceId),hostId:host,hostName:dest.hostName},'configuration');});}
export async function renderWorkspace(tab){if(tab.hostId&&previewEnabled(ui.state)){const handled=await renderRemoteWorkspace(tab);if(handled)return;}if(!tab.hostId&&previewEnabled(ui.state)&&renderPreviewWorkspace(tab))return;tab.hostName=computerName(tab.hostId?catalogs.get(tab.hostId)?.hostName:ui.state.data.hostName,tab.hostName);const main=$('#main');main.innerHTML=`<div class="heading"><div><h1>${esc(tab.label)}</h1><p class="muted">${esc(tab.hostName||'This computer')}</p></div><div class="actions"><button data-new-workspace-chat>＋ New chat</button>${ui.state.data.desktopPreview?.enabled?'':'<button data-delete-workspace class="danger">Delete workspace</button>'}</div></div><div class="actions workspace-page-switch">${tab.hostId&&catalogs.get(tab.hostId)?.workspaceProjects?'<button data-workspace-page="projects">Projects</button>':''}<button data-workspace-page="chats" class="${!tab.workspacePage||tab.workspacePage==='chats'?'primary':''}">Chats</button><button data-workspace-page="tabs" class="${tab.workspacePage==='tabs'?'primary':''}">Tabs</button><button data-workspace-page="configuration" class="${tab.workspacePage==='configuration'?'primary':''}">Configuration</button></div><section class="workspace-context-view" id="workspace-page"></section>`;main.querySelector('[data-new-workspace-chat]').onclick=()=>ui.newChat(tab);main.querySelector('[data-delete-workspace]')?.addEventListener('click',()=>void deleteWorkspace(tab).catch(error=>ui.toast(error.message)));main.querySelectorAll('[data-workspace-page]').forEach(b=>b.onclick=()=>{tab.workspacePage=b.dataset.workspacePage;ui.render();});const area=$('#workspace-page');if(tab.workspacePage==='tabs'){const rows=()=>ui.state.tabs.filter(child=>child.parentId===tab.id).map(child=>({...child,title:child.label,url:child.info?.sharedURL||child.info?.url||child.remotePreviewURL||'',favicon:child.info?.favicon||child.favicon,openedAt:child.info?.openedAt||child.openedAt,lastTouchedAt:child.info?.lastTouchedAt||child.lastTouchedAt}));mountWorkspaceTabs(area,{tabs:rows(),allTabs:rows,selectionKey:tab.id,bulk:ui.manageWorkspaceTabs,toolbar:document.querySelector(".workspace-page-switch"),act:(action,child)=>ui.manageWorkspaceTab(action,child.id),refresh:rows,notify:ui.toast});return;}if(tab.workspacePage!=='configuration'){ui.renderChats(false,true,{container:area,workspaceId:tab.workspaceId,hostId:tab.hostId||'local',workspaceName:tab.label,onOpen:row=>openWorkspaceChat(tab,row)});return;}
 area.innerHTML='<p class="note">Loading workspace configuration…</p>';try{const catalog=await request(tab.hostId,'context.get',{workspaceId:tab.workspaceId});if(ui.state.tab!==tab.id||!area.isConnected)return;mountWorkspaceConfiguration(area,{desktopPreview:!tab.hostId&&previewEnabled(ui.state)||!!catalogs.get(tab.hostId)?.workspaceProjects,catalog,workspaceId:tab.workspaceId,hostId:tab.hostId||'local',hostName:tab.hostName,readonlyPaths:!!tab.hostId,mutate:args=>request(tab.hostId,'context.update',args),refresh:args=>request(tab.hostId,'context.refresh',args),pick:options=>window.desktop.choosePaths(options),notify:ui.toast,copyPath:path=>window.desktop.copyText(path),openSource:async entry=>{if(tab.hostId){ui.toast('Open source files on '+tab.hostName+'.');return;}if(entry.kind==='mcp'||entry.isPath)await window.desktop.openPath(entry.path);else{const markdown=await ui.api('/api/markdown',{file:entry.path});ui.openTab({id:tab.id+':source:'+entry.id,type:'markdown',parentId:tab.id,label:entry.name,markdown});}},onUpdate:next=>{const name=next.workspaces.find(w=>w.id===tab.workspaceId)?.name;if(name&&name!==tab.label){tab.label=name;ui.renderTabs?.();}catalogs.set(tab.hostId||'local',{context:next,hostId:tab.hostId||'local',hostName:tab.hostName,online:true});if(!tab.hostId)ui.state.data.context=next;},copyWorkspace:(profile,current)=>copyMachine(tab,profile,current),documentKind:file=>new Promise(resolve=>{ui.showDialog(`<h2>Add context document</h2><p class="filepath">${esc(file)}</p><label>Use as<select id="workspace-document-kind"><option value="instruction">Instructions / reference</option><option value="skill">Skill</option><option value="agent">Agent</option></select></label><button id="close-dialog">Cancel</button><button id="dialog-submit">Add</button>`,()=>resolve($('#workspace-document-kind').value));$('#close-dialog')?.addEventListener('click',()=>resolve(null));$('#dialog')?.addEventListener('close',()=>resolve(null),{once:true});}),permissions:(target,profile,current)=>mountApprovals(target,tab,profile,current)});}catch(e){if(area.isConnected)area.innerHTML='<p class="banner">'+esc(e.message)+'</p>';}}
function mountApprovals(target,tab,profile,catalog){mountWorkspaceApprovals(target,{desktopPreview:!tab.hostId&&previewEnabled(ui.state)||!!catalogs.get(tab.hostId)?.workspaceProjects,profile,catalog,save:args=>request(tab.hostId,'context.update',args),notify:ui.toast,onSaved:()=>ui.render()});}

function renderPeerWorkspaceList(area,owners){
 const rows=owners.flatMap(owner=>(owner.context.workspaces||[]).map(workspace=>({...workspace,hostId:owner.hostId,hostName:owner.hostName,online:owner.online,projects:owner.workspaceProjects})));
 if(!rows.length){area.remove();return;}
 area.innerHTML=`<h2>Other computers</h2><div class="preview-workspace-cards">${rows.map((row,index)=>`<article class="card"><h3>${esc(row.name)}</h3><p class="note">${esc(row.hostName)}${row.online?'':' · offline'}${row.projects?' · '+row.projects.projects.filter(project=>project.workspaceId===row.id).length+' projects':''}</p><div class="actions"><button data-peer-workspace="${index}">Open workspace</button><button data-peer-config="${index}">Configuration</button></div></article>`).join('')}</div>`;
 area.querySelectorAll('[data-peer-workspace]').forEach(button=>button.onclick=()=>openWorkspace(rows[Number(button.dataset.peerWorkspace)]));
 area.querySelectorAll('[data-peer-config]').forEach(button=>button.onclick=()=>openWorkspace(rows[Number(button.dataset.peerConfig)],'configuration'));
}
// One request identity survives a lost acknowledgement. A changed form starts a new operation.
async function projectMutation(hostId,method,args){
 const slot=hostId+':'+method+':'+(args.projectId||args.id||args.workspaceId||'new'),signature=JSON.stringify(args);
 let operation=projectOperations.get(slot);if(!operation||operation.signature!==signature){operation={signature,id:crypto.randomUUID(),issuedAt:new Date().toISOString()};projectOperations.set(slot,operation);}
 if(operation.result)return operation.result;
 const result=await window.desktop.peers({action:'request',hostId,method,args,options:{id:operation.id,issuedAt:operation.issuedAt}});
 operation.result=result;return result;
}
async function updateRemoteProjects(owner,args){
 const result=await projectMutation(owner.hostId,'projects.update',args);owner.workspaceProjects=result;
 await ui.reconcileRemoteProjectPlacement?.(owner.hostId,result);
 for(const tab of ui.state.tabs.filter(tab=>tab.hostId===owner.hostId&&tab.projectId)){
  const project=result.projects.find(project=>project.id===tab.projectId);if(project){tab.label=project.name;tab.projectName=project.name;}
 }
 return result;
}
function remoteProjectDialog(owner,workspaceId,project){
 const expectedRevision=owner.workspaceProjects.revision;let busy=false;
 ui.showDialog(`<form data-dialog-submit><h2>${project?'Rename project':'New project'}</h2><p class="note">On ${esc(owner.hostName)}</p><label>Name<input id="peer-project-name" maxlength="200" value="${esc(project?.name||'')}"></label><button type="button" id="close-dialog">Cancel</button><button type="submit" id="dialog-submit">${project?'Rename':'Create project'}</button></form>`,async()=>{
  if(busy)throw Error('Project update is already in progress.');const name=$('#peer-project-name').value.trim();if(!name)throw Error('Enter a project name.');busy=true;
  try{const before=new Set(owner.workspaceProjects.projects.map(row=>row.id)),next=await updateRemoteProjects(owner,{action:project?'rename':'create',workspaceId,...(project?{projectId:project.id}:{}),name,expectedRevision});const created=project?next.projects.find(row=>row.id===project.id):next.projects.find(row=>row.workspaceId===workspaceId&&!before.has(row.id));if(created)openRemoteProject(owner.hostId,created);}
  finally{busy=false;}
 });
}
function deleteRemoteProject(owner,project){
 const catalog=owner.workspaceProjects,target=catalog.projects.find(row=>row.id===catalog.defaultProjectIds[project.workspaceId]);if(!target||target.id===project.id)throw Error('Choose another default project before deleting this project.');let busy=false;
 ui.showDialog(`<h2>Delete ${esc(project.name)}?</h2><p>Its chats and tabs move to ${esc(target.name)} on ${esc(owner.hostName)}. Chat history, files and access are preserved.</p><button id="close-dialog">Cancel</button><button id="dialog-submit" class="danger">Delete project</button>`,async()=>{
  if(busy)throw Error('Project deletion is already in progress.');busy=true;
  try{const next=await updateRemoteProjects(owner,{action:'delete',workspaceId:project.workspaceId,projectId:project.id,expectedRevision:catalog.revision});openRemoteProject(owner.hostId,next.projects.find(row=>row.id===target.id));}finally{busy=false;}
 });
}
function moveRemoteProject(owner,project){
 const revision=owner.workspaceProjects.revision,chatCount=Object.values(owner.workspaceProjects.memberships||{}).filter(member=>member.projectId===project.id).length;let busy=false;
 ui.showDialog(`<h2>Move ${esc(project.name)}</h2><p>On ${esc(owner.hostName)}, from ${esc(owner.context.workspaces.find(workspace=>workspace.id===project.workspaceId)?.name||project.workspaceId)}. ${chatCount} chats and all their tabs move with this project. ${owner.workspaceProjects.defaultProjectIds[project.workspaceId]===project.id?'A new General project will remain as the source workspace’s default.':''} Existing chats keep their settings and permissions; new chats use the destination workspace defaults.</p><label>Destination workspace<select id="peer-project-destination">${owner.context.workspaces.filter(workspace=>workspace.id!==project.workspaceId).map(workspace=>`<option value="${esc(workspace.id)}">${esc(workspace.name)}</option>`).join('')}</select></label><button id="close-dialog">Cancel</button><button id="dialog-submit">Move project</button>`,async()=>{
  if(busy)throw Error('Project movement is already in progress.');busy=true;
  try{const next=await updateRemoteProjects(owner,{action:'move-project',projectId:project.id,workspaceId:$('#peer-project-destination').value,expectedRevision:revision});openRemoteProject(owner.hostId,next.projects.find(row=>row.id===project.id));}finally{busy=false;}
 });
}
async function renderRemoteWorkspace(tab){
 const main=$('#main'),target=ui.state.tab,marker=document.createElement('section');main.replaceChildren(marker);marker.innerHTML='<p class="note">Loading workspace from its computer…</p>';
 let owner;
 try{owner=await loadPeerCatalog(tab.hostId,tab.hostName);}catch(error){
  if(ui.state.tab!==target||!marker.isConnected)return true;
  const cached=catalogs.get(tab.hostId);if(cached)cached.online=false;
  marker.innerHTML=`<h1>${esc(tab.label)}</h1><p class="banner">${esc(error.message)}</p><p class="note">This workspace remains on ${esc(tab.hostName||'its owning computer')}. Reconnect to change projects or configuration.</p><button data-peer-retry>Retry</button><section data-peer-cached-chats></section>`;
  marker.querySelector('[data-peer-retry]').onclick=()=>ui.render();
  ui.renderChats(false,false,{container:marker.querySelector('[data-peer-cached-chats]'),workspaceId:tab.workspaceId,projectId:tab.projectId,projectName:tab.projectName,hostId:tab.hostId,workspaceName:tab.workspaceName||tab.label,onOpen:row=>openWorkspaceChat(tab,row)});return true;
 }
 if(ui.state.tab!==target||!marker.isConnected)return true;
 const catalog=owner.workspaceProjects;
 if(!catalog){if(tab.projectId){marker.innerHTML='<p class="banner">This computer does not currently support projects. Its saved project views are retained.</p>';return true;}if(tab.workspacePage==='projects')tab.workspacePage='chats';return false;}
 if(tab.workspacePage==='configuration'&&!tab.projectId)return false;
 let project=tab.projectId&&catalog.projects.find(row=>row.id===tab.projectId),workspace=owner.context.workspaces.find(row=>row.id===tab.workspaceId);
 if(!workspace||tab.projectId&&!project){marker.innerHTML='<p class="banner">This workspace or project changed on its owning computer. Open its workspace list to refresh the location.</p>';return true;}
 tab.hostName=owner.hostName;const page=tab.workspacePage||(project?'chats':'projects');
 // Same structure and classes as the local workspace page; remote-only pages stay available.
 marker.innerHTML=`<div class="heading"><div>${project?`<button class="subtle preview-breadcrumb" data-peer-parent>${workspaceIcon}${esc(workspace.name)} ›</button>`:`<div class="eyebrow">Workspace · ${esc(owner.hostName)}</div>`}<h1>${esc(project?.name||workspace.name)}</h1><p class="muted">${project?'Chats and tabs · working setup from '+esc(workspace.name)+' on '+esc(owner.hostName):'Projects, conversations and your working setup on '+esc(owner.hostName)}</p></div><div class="actions">${project?(owner.capabilities.includes('projects.move.v1')?'<button data-peer-project-move>Move project…</button>':'')+'<button data-peer-project-rename>Rename</button>':'<button data-peer-project-create>＋ New project</button>'}<button data-peer-new-chat class="primary">＋ New chat</button></div></div><div class="actions preview-project-pages">${(project?['chats','tabs']:['projects','chats','tabs','configuration']).map(value=>`<button data-peer-page="${value}" class="${page===value?'primary':''}">${value[0].toUpperCase()+value.slice(1)}</button>`).join('')}</div><section data-peer-workspace-body></section>`;
 marker.querySelector('[data-peer-parent]')?.addEventListener('click',()=>openWorkspace({...workspace,hostId:owner.hostId,hostName:owner.hostName},'projects'));
 marker.querySelector('[data-peer-project-create]')?.addEventListener('click',()=>remoteProjectDialog(owner,workspace.id));marker.querySelector('[data-peer-project-rename]')?.addEventListener('click',()=>remoteProjectDialog(owner,workspace.id,project));
 marker.querySelector('[data-peer-project-move]')?.addEventListener('click',()=>moveRemoteProject(owner,project));
 marker.querySelector('[data-peer-new-chat]').onclick=()=>ui.newChat({...tab,projectId:project?.id||catalog.defaultProjectIds[workspace.id]});
 marker.querySelectorAll('[data-peer-page]').forEach(button=>button.onclick=()=>{tab.workspacePage=button.dataset.peerPage;ui.render();});const area=marker.querySelector('[data-peer-workspace-body]');
 if(page==='projects'){
  const rows=catalog.projects.filter(row=>row.workspaceId===workspace.id),chats=project=>Object.values(catalog.memberships||{}).filter(member=>member.projectId===project.id).length;
  area.innerHTML=`<div class="preview-project-list">${rows.map((row,index)=>`<article class="preview-project-row" data-peer-project-row="${index}"><button class="preview-project-title" data-peer-project-open="${index}">${projectIcon}<span><strong>${esc(row.name)}</strong><small>${chats(row)} chats</small></span></button><div class="actions"><button data-peer-project-chat="${index}">New chat</button><button data-peer-project-edit="${index}">Rename</button>${row.id===catalog.defaultProjectIds[workspace.id]?'<span class="note" title="Choose another default project before deleting this project.">Default project</span>':`<button data-peer-project-default="${index}">Set default</button><button data-peer-project-delete="${index}" class="danger">Delete</button>`}</div></article>`).join('')||'<p class="note">No projects in this workspace yet.</p>'}</div>`;
  area.querySelectorAll('[data-peer-project-chat]').forEach(button=>button.onclick=()=>ui.newChat({...tab,projectId:rows[Number(button.dataset.peerProjectChat)].id}));
  area.querySelectorAll('[data-peer-project-open]').forEach(button=>button.onclick=()=>openRemoteProject(owner.hostId,rows[Number(button.dataset.peerProjectOpen)]));
  area.querySelectorAll('[data-peer-project-edit]').forEach(button=>button.onclick=()=>remoteProjectDialog(owner,workspace.id,rows[Number(button.dataset.peerProjectEdit)]));
  area.querySelectorAll('[data-peer-project-delete]').forEach(button=>button.onclick=()=>{try{deleteRemoteProject(owner,rows[Number(button.dataset.peerProjectDelete)]);}catch(error){ui.toast(error.message);}});
  area.querySelectorAll('[data-peer-project-default]').forEach(button=>button.onclick=async()=>{button.disabled=true;try{await updateRemoteProjects(owner,{action:'default',projectId:rows[Number(button.dataset.peerProjectDefault)].id,workspaceId:workspace.id,expectedRevision:catalog.revision});ui.render();}catch(error){ui.toast(error.message);}finally{if(button.isConnected)button.disabled=false;}});
 }else if(page==='tabs'){
  area.innerHTML='<p class="note">Refreshing tabs from their owning computer…</p>';
  try{await ui.syncContentTabs?.({scope:project?'project':'workspace',id:project?.id||workspace.id,hostId:owner.hostId});}
  catch(error){if(area.isConnected)area.innerHTML='<p class="banner">'+esc(error.message)+'</p>';return true;}
  if(ui.state.tab!==target||!area.isConnected)return true;
  const rows=()=>ui.state.tabs.filter(child=>child.parentId===tab.id).map(child=>({...child,title:child.label,url:child.info?.sharedURL||child.info?.url||child.remotePreviewURL||'',openedAt:child.info?.openedAt||child.openedAt,lastActivityAt:child.info?.lastActivityAt||child.lastActivityAt}));
  mountWorkspaceTabs(area,{notice:ui.windowRestoreNotice,tabs:rows(),allTabs:rows,selectionKey:tab.id,bulk:ui.manageWorkspaceTabs,toolbar:document.querySelector(".workspace-page-switch"),act:(action,child)=>ui.manageWorkspaceTab(action,child.id),refresh:rows,notify:ui.toast,preview:true,allowReorder:false});
 }else ui.renderChats(false,true,{container:area,workspaceId:workspace.id,workspaceName:workspace.name,projectId:project?.id,projectName:project?.name,hostId:owner.hostId,onOpen:row=>openWorkspaceChat(tab,row)});
 return true;
}
async function moveRemoteProjectChat(row,owner){
 const runId=row.chatId||row.runId||row.id;let run;
 for(let offset=0;!run;offset+=100){const rows=await request(owner.hostId,'runs.list',{offset,includeArchived:true});run=rows.find(item=>item.id===runId);if(rows.length<100)break;}
 if(!run)throw Error('This chat is no longer available on its owning computer.');const catalog=owner.workspaceProjects;let busy=false;
 showMoveMenu({showDialog:ui.showDialog,escape:esc,groups:projectMoveGroups(owner.context.workspaces,catalog.projects),current:run.projectId,application:false,submit:async projectId=>{
  if(busy)throw Error('Chat movement is already in progress.');const project=catalog.projects.find(item=>item.id===projectId);if(!project)throw Error('Choose an available project.');busy=true;
  try{const result=await projectMutation(owner.hostId,'chat.move',{id:runId,workspaceId:project.workspaceId,projectId:project.id,expectedUpdatedAt:run.updatedAt,expectedRevision:catalog.revision});owner.workspaceProjects=result.memberships?result:await request(owner.hostId,'projects.get');const membership=owner.workspaceProjects.memberships?.[runId]||result;reconcileIndexedChat({...row,...membership,hostId:owner.hostId,chatId:runId,local:false});await ui.reconcileRemoteProjectPlacement?.(owner.hostId,owner.workspaceProjects);const parent=openRemoteProject(owner.hostId,project,{select:false});openWorkspaceChat(parent,{...run,...membership});ui.render();}finally{busy=false;}
 }});
}

// Close view placement only. The owner's deletion result governs surviving chat membership.
export function workspaceViewClosure(tabs,hostId,workspaceId){
 const ids=new Set(tabs.filter(tab=>tab.type==='workspace'&&tab.workspaceId===workspaceId&&(tab.hostId||'local')===(hostId||'local')).map(tab=>tab.id));
 let changed=true;while(changed){changed=false;for(const tab of tabs)if(ids.has(tab.parentId)&&!ids.has(tab.id)){ids.add(tab.id);changed=true;}}
 return ids;
}
export async function deleteWorkspace(tab){
 const host=tab.hostId||'local',catalog=await request(host,'context.get');
 workspaceDeleteDialog({workspaceId:tab.workspaceId,catalog,notify:ui.toast,
  create:async(name,profile)=>{const before=await request(host,'context.get'),next=await request(host,'context.update',{action:'workspace',create:true,name,cwd:profile.cwd,expectedRevision:before.revision});return {catalog:next,workspaceId:next.workspaces.find(row=>!before.workspaces.some(old=>old.id===row.id)).id};},
  remove:args=>host==='local'?ui.api('/api/tabs/manage',{action:'delete-workspace',...args}):window.desktop.peers({action:'request',hostId:host,method:'workspace.delete',args}),
  onDeleted:result=>{const closed=workspaceViewClosure(ui.state.tabs,host,tab.workspaceId);ui.state.tabs=ui.state.tabs.filter(child=>!closed.has(child.id));if(closed.has(ui.state.tab))ui.state.tab='overview';if(host==='local')ui.state.data.context=result.context;catalogs.set(host,{...catalogs.get(host),context:result.context,hostId:host,hostName:tab.hostName,online:true});ui.render();}});
}
