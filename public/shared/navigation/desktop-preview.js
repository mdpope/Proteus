import {neighborAfterRemoval} from './tab-interactions.js';
import {showMoveMenu,projectMoveGroups} from './move-menu.js';
import {resolvePreviewProject} from '../../features/workspaces/preview-project-placement.js';
import {buildPreviewNavigation,previewItemIcon,previewRelativeAge,previewTabsForScope} from './preview-navigation.js';
import {computerName} from '../../services/remote/computer-identity.js';
import {workspaceIcon} from '../../features/workspaces/workspace-ui.js';
import {recentChats,reconcileIndexedChat} from '../../features/chats/chats-index.js';
import {mountWorkspaceTabs} from '../../features/workspaces/workspace-tabs.js';
import {bindCardReorder} from '../ui/card-reorder.js';
let ui;
const sidebarSessionKey='proteus.preview.sidebar.v2';
const expandedWorkspaces=new Set(),expandedProjects=new Set(),expandedComputers=new Set();
let otherComputersOpen=false,ownersRefreshedAt=0,ownersRefreshing=null;
const chatLimits=new Map(),projectLimits=new Map();
let sidebarLoaded=false,sidebarScroll=0,sidebarFocus=null,sidebarSaveTimer;
function saveSidebar(){loadSidebar();clearTimeout(sidebarSaveTimer);sidebarSaveTimer=undefined;try{sessionStorage.setItem(sidebarSessionKey,JSON.stringify({workspaces:[...expandedWorkspaces],projects:[...expandedProjects],computers:[...expandedComputers],otherComputersOpen,chatLimits:[...chatLimits],projectLimits:[...projectLimits],scroll:sidebarScroll}));}catch{}}
// Scroll observations are frequent; coalesce disk-backed storage writes without
// rebuilding navigation or losing the last position at lifecycle boundaries.
function saveSidebarScroll(){clearTimeout(sidebarSaveTimer);sidebarSaveTimer=setTimeout(saveSidebar,200);}
function loadSidebar(){
 if(sidebarLoaded)return;sidebarLoaded=true;
 try{const saved=JSON.parse(sessionStorage.getItem(sidebarSessionKey)||'null');if(!saved)return;
  for(const id of saved.workspaces||[])if(typeof id==='string')expandedWorkspaces.add(id);
  otherComputersOpen=saved.otherComputersOpen===true;
  for(const id of saved.computers||[])if(typeof id==='string')expandedComputers.add(id);
  for(const id of saved.projects||[])if(typeof id==='string')expandedProjects.add(id);
  for(const [id,count] of saved.chatLimits||[])if(typeof id==='string'&&Number.isInteger(count)&&count>=7)chatLimits.set(id,count);
  for(const [id,count] of saved.projectLimits||[])if(typeof id==='string'&&Number.isInteger(count)&&count>=7)projectLimits.set(id,count);
  if(Number.isFinite(saved.scroll)&&saved.scroll>=0)sidebarScroll=saved.scroll;
 }catch{}
}
export function capturePreviewSidebar(){
 if(!previewEnabled(ui?.state))return;
 loadSidebar();
 const sidebar=document.querySelector('#sidebar'),nav=sidebar?.querySelector('nav.preview-sidebar-scroll');
 if(nav){sidebarScroll=nav.scrollTop;saveSidebar();}
 const focused=document.activeElement;sidebarFocus=null;
 if(sidebar?.contains(focused)){
  const attribute=['id','data-preview-other-computers','data-preview-computer-expand','data-preview-workspace-expand','data-preview-expand','data-preview-more-chats','data-preview-more','data-preview-workspace','data-preview-project','data-preview-chat','data-preview-resource','data-preview-feature-chat','data-preview-attention-item','data-preview-feature-more','data-preview-collapse-all','data-engine-section','data-page'].find(name=>focused.hasAttribute(name));
  if(attribute)sidebarFocus={attribute,value:focused.getAttribute(attribute)};
 }
}
function renderSidebarChange(attribute,id){
 saveSidebar();ui.render();
 const find=name=>[...document.querySelectorAll('#sidebar ['+name+']')].find(button=>button.getAttribute(name)===id);
 const fallback=attribute==='data-preview-more-chats'?'data-preview-expand':attribute==='data-preview-more'?'data-preview-workspace-expand':attribute;
 (find(attribute)||find(fallback))?.focus({preventScroll:true});
}
export const projectIcon='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 7V5a2 2 0 0 1 2-2h5l3 3h6a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/></svg>';
const esc=value=>ui.escape(value),$=selector=>document.querySelector(selector);
// Shared project UI is available in production; preview identity remains separate.
export const workspaceProjectsCatalog=state=>state?.data?.workspaceProjects||state?.data?.desktopPreview;
export const previewEnabled=state=>!!workspaceProjectsCatalog(state)?.enabled;
export const setWorkspaceProjectsCatalog=(state,value)=>{state.data[state.data.workspaceProjects?'workspaceProjects':'desktopPreview']=value;};
export function initDesktopPreview(options){ui=options;ownersRefreshedAt=0;
 globalThis.window?.addEventListener?.('pagehide',()=>{if(sidebarSaveTimer)saveSidebar();});
 globalThis.window?.addEventListener?.('beforeunload',()=>{if(sidebarSaveTimer)saveSidebar();});
 globalThis.window?.desktop?.onPeer?.(event=>{if(event.changed||event.status||event.removed||event.revoked){ownersRefreshedAt=0;void refreshRemoteSidebar();}});
}
const catalog=()=>workspaceProjectsCatalog(ui.state);
const projectAPI=()=>ui.state.data.workspaceProjects?'/api/workspace-projects':'/api/desktop-preview';
const previewNavigation=()=>buildPreviewNavigation({...catalog(),tabs:ui.state.tabs,chats:[...recentChats(ui.state.data.runs,true),...ui.state.data.runs],localHostId:ui.state.data.hostId||'local'});
export function previewProjects(workspaceId){return previewNavigation().projects.filter(project=>!workspaceId||project.workspaceId===workspaceId);}
export function resetPreviewProjectPaging(){if(!previewEnabled(ui?.state))return;loadSidebar();chatLimits.clear();saveSidebar();}

const workspace=id=>ui.state.data.context.workspaces.find(w=>w.id===id);
export const projectViewId=id=>'project:local:'+id;
export function previewProjectForChat(row){const value=catalog(),member=value?.memberships?.[row.chatId||row.runId||row.id],location=member===undefined?row:member;return resolvePreviewProject(value,location.projectId,location.workspaceId)||resolvePreviewProject(value,value?.defaultProjectIds?.[location.workspaceId],location.workspaceId);}
export function previewTopId(tab,state=ui.state){
 const seen=new Set();let current=tab;
 while(current&&!seen.has(current.id)){
  seen.add(current.id);if(current.type==='workspace'&&current.projectId)return 'workspace:'+(current.hostId||'local')+':'+current.workspaceId;
  const parent=current.parentId&&state.tabs.find(item=>item.id===current.parentId);if(!parent)return current.id;current=parent;
 }
 return tab?.id;
}

export function ensurePreviewProject(project,{reveal=false,workspaceRecord}={}){
 if(!project)return;const profile=workspace(project.workspaceId)||(workspaceRecord?.id===project.workspaceId?workspaceRecord:null);if(!profile)return;
 const workspaceId='workspace:local:'+profile.id;let root=ui.state.tabs.find(t=>t.id===workspaceId);if(!root){root={id:workspaceId,type:'workspace',workspaceId:profile.id,label:profile.name,workspacePage:'projects'};ui.state.tabs.push(root);}if(reveal){root.hidden=false;root.navigationClosed=false;}
 let tab=ui.state.tabs.find(t=>t.id===projectViewId(project.id));if(!tab){tab={id:projectViewId(project.id),type:'workspace',workspaceId:profile.id,workspaceName:profile.name,projectId:project.id,label:project.name,workspacePage:'chats',hidden:false};ui.state.tabs.push(tab);}return tab;
}
export function previewResourceParent(row){const project=previewProjectForChat(row);return project?ensurePreviewProject(project):null;}
export function openPreviewProject(project,page='chats'){
 const tab=ensurePreviewProject(project,{reveal:true});if(!tab)return;Object.assign(tab,{workspacePage:page,label:project.name,hidden:false,navigationClosed:false});
 ui.openTab(tab);ui.state.tab=tab.id;ui.render();return ui.state.tabs.find(t=>t.id===tab.id);
}
export function openPreviewChat(row){
 const project=previewProjectForChat(row);if(!project)return false;
 const parent=openPreviewProject(project);const runId=row.chatId||row.runId||row.id;
 const existing=ui.state.tabs.find(t=>t.type==='run'&&!t.hostId&&(t.runId||t.id)===runId&&t.parentId===parent.id)||ui.state.tabs.find(t=>t.type==='run'&&!t.hostId&&(t.runId||t.id)===runId);
 if(existing)for(const child of ui.state.tabs)if(child.parentId===existing.id&&child.type==='agent-terminal')child.runId||=runId;
 ui.openTab({id:existing?.id||parent.id+':chat:'+runId,type:'run',runId,parentId:parent.id,label:row.title||row.label||'Chat'});return true;
}
const ownerKey=(host,id)=>host==='local'?id:host+':'+id;
function tabOwner(tab){const seen=new Set();while(tab&&!seen.has(tab.id)){seen.add(tab.id);if(tab.hostId)return tab.hostId;tab=ui.state.tabs.find(parent=>parent.id===tab.parentId);}return 'local';}
function ownerNavigation(owner){
 if(owner.hostId==='local')return previewNavigation();
 const host=owner.hostId,catalog=owner.workspaceProjects||{projects:owner.savedProjects||[]};
 const tabs=ui.state.tabs.filter(tab=>tabOwner(tab)===host).map(tab=>({...tab,hostId:host,local:true}));
 for(const project of catalog.projects||[]){
  const parentId='project:'+host+':'+project.id;
  if(!tabs.some(tab=>tab.id===parentId))tabs.push({id:parentId,type:'workspace',hostId:host,workspaceId:project.workspaceId,projectId:project.id});
  for(const row of owner.projectTabs?.[project.id]?.tabs||[]){
   if(tabs.some(tab=>tab.parentId===parentId&&(tab.contentTabId===row.id||row.type==='chat'&&tab.runId===row.chatId)))continue;
   tabs.push({...row,id:'owner-tab:'+host+':'+project.id+':'+row.id,contentTabId:row.id,type:row.type==='chat'?'remote-run':row.type==='document'?'remote-document':row.type,runId:row.chatId,parentId,hostId:host,label:row.title,info:row.type==='browser'?{...row,loaded:false}:undefined,ownerDescriptor:true});
  }
 }
 const chats=[...(owner.runs||[]),...recentChats(ui.state.data.runs,true).filter(row=>row.hostId===host&&row.local!==true)].map(row=>({...row,hostId:host,local:true}));
 return buildPreviewNavigation({...catalog,tabs,chats,localHostId:host});
}
async function refreshRemoteSidebar(force=false){
 if(!ui?.refreshWorkspaceOwners||ownersRefreshing||!force&&Date.now()-ownersRefreshedAt<30000)return;
 ownersRefreshedAt=Date.now();
 ownersRefreshing=(async()=>{
  try{
   const owners=await ui.refreshWorkspaceOwners();
   if(otherComputersOpen)await Promise.allSettled(owners.filter(owner=>owner.online&&expandedComputers.has(owner.hostId)).flatMap(owner=>(owner.workspaceProjects?.projects||[]).filter(project=>expandedProjects.has(ownerKey(owner.hostId,project.id))).map(project=>ui.loadWorkspaceOwnerTabs?.(owner.hostId,project.id))));
   ui.render({sidebarOnly:true,preserveTeamBrowser:true});
  }catch{/* Existing owner snapshots stay visible with their last availability. */}
  finally{ownersRefreshing=null;}
 })();return ownersRefreshing;
}
function workspaceTree(owner){
 const host=owner.hostId,navigation=ownerNavigation(owner),selected=ui.state.tabs.find(tab=>tab.id===ui.state.tab);
 let root=selected;const seen=new Set();while(root?.parentId&&!seen.has(root.id)){seen.add(root.id);root=ui.state.tabs.find(tab=>tab.id===root.parentId);}
 const workspaceSelected=root?.type==='workspace'&&tabOwner(root)===host,selectedProject=workspaceSelected?navigation.projectIdForTab({...selected,local:true,hostId:host}):null;
 const attribute=(kind,id)=>`data-preview-${kind}="${esc(ownerKey(host,id))}" data-preview-host="${esc(host)}" data-preview-id="${esc(id)}"`;
 return (owner.context?.workspaces||[]).map(w=>{
  const workspaceKey=ownerKey(host,w.id),open=expandedWorkspaces.has(workspaceKey),projects=navigation.projects.filter(project=>project.workspaceId===w.id),limit=projectLimits.get(workspaceKey)||7;
  return `<section class="preview-workspace-tree ${workspaceSelected&&root.workspaceId===w.id?'active':''}" data-preview-workspace-group="${esc(workspaceKey)}"><div class="preview-workspace-header"><button class="navchild preview-workspace-link ${workspaceSelected&&root.workspaceId===w.id&&!selectedProject?'active':''}" ${attribute('workspace',w.id)} title="${esc(w.name)}">${workspaceIcon}<span class="preview-tree-title">${esc(w.name)}</span></button><small class="preview-tree-count" data-preview-workspace-count="${esc(workspaceKey)}" title="${projects.length} projects" aria-label="${projects.length} projects">${projects.length}</small><button class="preview-expand" ${attribute('workspace-expand',w.id)} aria-label="${open?'Collapse':'Expand'} ${esc(w.name)}" aria-expanded="${open}">${open?'⌄':'›'}</button></div>${open?`<div class="preview-project-branches">${host!=='local'&&!owner.workspaceProjects?'<p class="preview-empty-project">'+(owner.online?'Projects unavailable on this computer':'Reconnect to load projects')+'</p>':''}${projects.slice(0,limit).map(project=>{
   const projectKey=ownerKey(host,project.id),projectOpen=expandedProjects.has(projectKey),rows=project.items,childLimit=chatLimits.get(projectKey)||7,active=selectedProject===project.id;
   return `<div class="preview-project-group ${active?'active':''} ${projectOpen?'expanded':''}"><div class="preview-project-branch ${active?'active':''}"><button class="navchild preview-project-link ${active?'active':''}" ${attribute('project',project.id)} title="${esc(project.name)}">${projectIcon}<span class="preview-tree-title">${esc(project.name)}</span></button><small class="preview-tree-count" data-preview-project-count="${esc(projectKey)}" title="${project.chatCount} chats and ${project.resourceCount} resource tabs" aria-label="${project.chatCount} chats and ${project.resourceCount} resource tabs">${project.totalCount}</small><button class="preview-expand" ${attribute('expand',project.id)} aria-label="${projectOpen?'Collapse':'Expand'} ${esc(project.name)}" aria-expanded="${projectOpen}">${projectOpen?'⌄':'›'}</button></div>${projectOpen?`<div class="preview-recent-chats">${rows.slice(0,childLimit).map(item=>{
    const rowActive=workspaceSelected&&item.tabIds.includes(selected?.id),status=[item.hidden?'Hidden':'',item.unloaded?'Unloaded':''].filter(Boolean).join(' · ');
    return `<button class="navchild preview-tree-item ${rowActive?'active':''}" data-preview-item="${esc(ownerKey(host,item.key))}" data-preview-item-type="${esc(item.type)}" ${attribute(item.kind==='chat'?'chat':'resource',item.kind==='chat'?item.chatId:item.tabId)} data-preview-item-project="${esc(project.id)}" title="${esc(item.title+(status?' · '+status:''))}"><span class="preview-tree-icon">${previewItemIcon(item.type,item.favicon)}</span><span class="preview-tree-copy"><span class="preview-tree-title">${esc(item.title)}</span></span><small class="preview-tree-age" title="${item.lastAccess?esc(new Date(item.lastAccess).toLocaleString()):'Last activity unknown'}">${esc(previewRelativeAge(item.lastAccess))}</small></button>`;
   }).join('')}${rows.length>childLimit?`<button class="navchild muted preview-tree-more" ${attribute('more-chats',project.id)}>More…</button>`:''}${rows.length?'':'<p class="preview-empty-project">No chats or tabs yet</p>'}</div>`:''}</div>`;
  }).join('')}${projects.length>limit?`<button class="navchild muted preview-tree-more" ${attribute('more',w.id)}>More projects…</button>`:''}</div>`:''}</section>`;
 }).join('');
}
export function previewSidebar(){
 const local={hostId:'local',context:ui.state.data.context},owners=ui.workspaceOwners?.()||[];
 return `<hr class="preview-workspace-divider"><div class="preview-workspace-list">${workspaceTree(local)}</div><hr class="preview-workspace-divider preview-other-divider"><section class="preview-other-computers"><div class="preview-computer-heading"><span>Other Computers</span><button class="preview-expand" data-preview-other-computers="" aria-label="${otherComputersOpen?'Collapse':'Expand'} Other Computers" aria-expanded="${otherComputersOpen}">${otherComputersOpen?'⌄':'›'}</button></div>${otherComputersOpen?owners.map(owner=>{
  const open=expandedComputers.has(owner.hostId),status=owner.paused?'Disconnected':owner.online?'':owner.workspaceProjects||owner.savedProjects?.length?'Offline · saved projects':'Offline';
  return `<section class="preview-computer-group" data-preview-computer="${esc(owner.hostId)}"><div class="preview-computer-heading"><span class="preview-tree-title">${esc(computerName(owner.hostName))}</span><button class="preview-expand" data-preview-computer-expand="${esc(owner.hostId)}" aria-label="${open?'Collapse':'Expand'} ${esc(computerName(owner.hostName))}" aria-expanded="${open}">${open?'⌄':'›'}</button></div>${status?`<p class="preview-empty-project">${esc(status)}</p>`:''}${open?workspaceTree(owner)||'<p class="preview-empty-project">No workspace catalog available</p>':''}</section>`;
 }).join('')||(ownersRefreshing?'<p class="preview-empty-project">Loading computers…</p>':'<p class="preview-empty-project">No paired computers</p>'):''}</section>`;
}

function bindWorkspaceCollapseAll(collection){
 if(!collection)return;
 const group=document.createElement('div');group.className='preview-workspaces-control'+(collection.classList.contains('active')?' active':'');
 collection.before(group);group.append(collection);
 const button=document.createElement('button');button.type='button';button.className='preview-collapse-all';button.setAttribute('data-preview-collapse-all','');button.setAttribute('aria-label','Collapse all');button.title='Collapse all';
 button.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="4" y="5" width="16" height="5" rx="1"/><rect x="4" y="14" width="16" height="5" rx="1"/></svg>';
 group.append(button);
 button.onclick=()=>{expandedWorkspaces.clear();expandedProjects.clear();expandedComputers.clear();otherComputersOpen=false;chatLimits.clear();projectLimits.clear();saveSidebar();ui.render({sidebarOnly:true,preserveTeamBrowser:true});document.querySelector('[data-preview-collapse-all]')?.focus({preventScroll:true});};
}
function bindEngineNavigation(sidebar){
 const engine=sidebar.querySelector('[data-page="engine"]');if(!engine)return;
 const group=engine.closest('.preview-feature-group')||engine,expanded=engine.classList.contains('active');
 group.insertAdjacentHTML('beforebegin','<hr class="preview-engine-divider">');
 engine.setAttribute('aria-expanded',String(expanded));
 const sections=engine.nextElementSibling;
 if(expanded&&sections?.classList.contains('navchildren')){sections.id='preview-engine-sections';engine.setAttribute('aria-controls',sections.id);}
}
export function bindPreviewSidebar(){
 document.body.classList.toggle('desktop-preview',previewEnabled(ui.state));if(!previewEnabled(ui.state))return;
 loadSidebar();
 const sidebar=$('#sidebar'),nav=sidebar.querySelector('nav');nav.classList.add('preview-sidebar-scroll');
 const restoreTarget=sidebarScroll;let restoring=true;
 const restoreScroll=()=>{if(nav.isConnected)nav.scrollTop=restoreTarget;};
 if(!document.querySelector('#desktop-preview-style')){const style=document.createElement('link');style.id='desktop-preview-style';style.rel='stylesheet';style.href='/desktop-preview.css';style.onload=restoreScroll;document.head.append(style);}
 if(ui.state.data.desktopPreview?.enabled){
  sidebar.querySelector('.brand-text').textContent='Proteus Preview';
  sidebar.querySelector('.sidebottom p').textContent='Isolated desktop preview · real chats';
 }
 const collection=sidebar.querySelector('[data-page="context"]');if(collection?.nextElementSibling?.classList.contains('navchildren'))collection.nextElementSibling.remove();
 collection?.insertAdjacentHTML('afterend',previewSidebar());
 bindWorkspaceCollapseAll(collection);
 const ownerFor=button=>(ui.workspaceOwners?.()||[]).find(owner=>owner.hostId===button.dataset.previewHost);
 sidebar.querySelector('[data-preview-other-computers]')?.addEventListener('click',()=>{otherComputersOpen=!otherComputersOpen;renderSidebarChange('data-preview-other-computers','');if(otherComputersOpen)void refreshRemoteSidebar(true);});
 sidebar.querySelectorAll('[data-preview-computer-expand]').forEach(button=>button.onclick=()=>{const id=button.dataset.previewComputerExpand;if(expandedComputers.has(id))expandedComputers.delete(id);else expandedComputers.add(id);renderSidebarChange('data-preview-computer-expand',id);void refreshRemoteSidebar(true);});
 sidebar.querySelectorAll('[data-preview-workspace]').forEach(b=>b.onclick=()=>{const owner=ownerFor(b);if(b.dataset.previewHost!=='local'&&!owner){ui.toast('This computer is no longer available. Refresh Connections.');return;}expandedWorkspaces.add(ownerKey(b.dataset.previewHost,b.dataset.previewId));saveSidebar();ui.openWorkspace(owner?{...owner.context.workspaces.find(w=>w.id===b.dataset.previewId),hostId:owner.hostId,hostName:owner.hostName}:workspace(b.dataset.previewId),'projects');});
 sidebar.querySelectorAll('[data-preview-project]').forEach(b=>b.onclick=()=>{const owner=ownerFor(b);if(b.dataset.previewHost!=='local'&&!owner){ui.toast('This computer is no longer available. Refresh Connections.');return;}expandedProjects.add(ownerKey(b.dataset.previewHost,b.dataset.previewId));saveSidebar();if(owner)ui.openRemoteProject(owner.hostId,ownerNavigation(owner).projects.find(p=>p.id===b.dataset.previewId));else openPreviewProject(previewProjects().find(p=>p.id===b.dataset.previewId));});
 sidebar.querySelectorAll('[data-preview-workspace-expand]').forEach(b=>b.onclick=()=>{const id=b.dataset.previewWorkspaceExpand;if(expandedWorkspaces.has(id)){expandedWorkspaces.delete(id);projectLimits.delete(id);}else expandedWorkspaces.add(id);renderSidebarChange('data-preview-workspace-expand',id);});
 sidebar.querySelectorAll('[data-preview-expand]').forEach(b=>b.onclick=()=>{const id=b.dataset.previewExpand;if(expandedProjects.has(id)){expandedProjects.delete(id);chatLimits.delete(id);}else expandedProjects.add(id);renderSidebarChange('data-preview-expand',id);if(b.dataset.previewHost!=='local')void refreshRemoteSidebar(true);});
 sidebar.querySelectorAll('[data-preview-more-chats]').forEach(b=>b.onclick=()=>{const id=b.dataset.previewMoreChats;chatLimits.set(id,(chatLimits.get(id)||7)+4);renderSidebarChange('data-preview-more-chats',id);});
 sidebar.querySelectorAll('[data-preview-more]').forEach(b=>b.onclick=()=>{const id=b.dataset.previewMore;projectLimits.set(id,(projectLimits.get(id)||7)+4);renderSidebarChange('data-preview-more',id);});
 sidebar.querySelectorAll('[data-preview-chat]').forEach(button=>button.onclick=()=>{const owner=ownerFor(button);if(button.dataset.previewHost!=='local'&&!owner){ui.toast('This computer is no longer available. Refresh Connections.');return;}const navigation=owner?ownerNavigation(owner):previewNavigation(),project=navigation.projects.find(project=>project.id===button.dataset.previewItemProject),item=project?.items.find(item=>item.kind==='chat'&&item.chatId===button.dataset.previewId);if(!item)return;if(owner){const parent=ui.openRemoteProject(owner.hostId,project,{select:false});ui.openWorkspaceChat(parent,item.row);}else openPreviewChat(item.row);});
 sidebar.querySelectorAll('[data-preview-resource]').forEach(button=>button.onclick=()=>void(async()=>{
  const owner=ownerFor(button);if(button.dataset.previewHost!=='local'&&!owner)throw Error('This computer is no longer available. Refresh Connections.');if(!owner)return ui.manageWorkspaceTab('open',button.dataset.previewId);
  const project=ownerNavigation(owner).projects.find(project=>project.id===button.dataset.previewItemProject),item=project?.items.find(item=>item.tabId===button.dataset.previewId);
  if(!item)return;const parent=ui.openRemoteProject(owner.hostId,project,{select:false});
  if(item.tab.ownerDescriptor){await ui.syncContentTabs({scope:'project',id:project.id,hostId:owner.hostId});const tab=ui.state.tabs.find(tab=>tab.parentId===parent.id&&tab.contentTabId===item.tab.contentTabId);if(!tab)throw Error('This resource is unavailable on its owning computer.');return ui.manageWorkspaceTab('open',tab.id);}
  return ui.manageWorkspaceTab('open',item.tabId);
 })().catch(error=>ui.toast(error.message)));
 void refreshRemoteSidebar();
 bindEngineNavigation(sidebar);
 if(sidebarFocus){const {attribute,value}=sidebarFocus;[...sidebar.querySelectorAll('['+attribute+']')].find(button=>button.getAttribute(attribute)===value)?.focus({preventScroll:true});}
 restoreScroll();requestAnimationFrame(()=>{restoreScroll();requestAnimationFrame(()=>{if(nav.isConnected){restoring=false;sidebarScroll=nav.scrollTop;saveSidebar();}});});
 nav.addEventListener('scroll',()=>{if(restoring)return;sidebarScroll=nav.scrollTop;saveSidebarScroll();},{passive:true});
}
export async function mutatePreview(args){const next=await ui.api(projectAPI()+'/projects',{...args,expectedRevision:args.expectedRevision??catalog().revision});setWorkspaceProjectsCatalog(ui.state,next);await ui.refresh(true);return next;}
function moveProjectDialog(project){
 const revision=catalog().revision,chatCount=Object.values(catalog().memberships||{}).filter(member=>member.projectId===project.id).length;
 ui.showDialog(`<h2>Move ${esc(project.name)}</h2><p>From ${esc(workspace(project.workspaceId)?.name||project.workspaceId)} · ${chatCount} chats and all their tabs. ${catalog().defaultProjectIds[project.workspaceId]===project.id?'A new General project will remain as the source workspace’s default.':''}</p><label>Destination workspace<select id="project-destination">${ui.state.data.context.workspaces.filter(w=>w.id!==project.workspaceId).map(w=>`<option value="${esc(w.id)}">${esc(w.name)}</option>`).join('')}</select></label><p>All chats and tabs move with this project. Existing chats keep their settings and permissions. New chats use the destination workspace defaults.</p><div class="actions"><button id="close-dialog">Cancel</button><button id="dialog-submit">Move project</button></div>`,async()=>{const next=await mutatePreview({action:'move-project',projectId:project.id,workspaceId:$('#project-destination').value,expectedRevision:revision});openPreviewProject(next.projects.find(p=>p.id===project.id));});
}
function projectDialog(workspaceId,project){ui.showDialog(`<form data-dialog-submit><h2>${project?'Rename project':'New project'}</h2><label>Name<input id="preview-project-name" maxlength="200" value="${esc(project?.name||'')}" autofocus></label><p class="note">Projects organize chats and tabs. Working folders, sources and defaults belong to the workspace.</p><div class="actions"><button type="button" id="close-dialog">Cancel</button><button type="submit" id="dialog-submit">${project?'Rename':'Create project'}</button></div></form>`,async()=>{const name=$('#preview-project-name').value.trim();if(!name)throw Error('Enter a project name.');const next=await mutatePreview({action:project?'rename':'create',workspaceId,projectId:project?.id,name});if(project)openPreviewProject(next.projects.find(p=>p.id===project.id));else openPreviewProject(next.projects.find(p=>p.workspaceId===workspaceId&&p.name===name));});}
function deleteProjectDialog(workspaceId,project){
 const value=catalog(),destination=value.projects.find(item=>item.id===value.defaultProjectIds?.[workspaceId]&&item.workspaceId===workspaceId);
 if(!destination||destination.id===project.id){ui.toast('Choose another default project before deleting this project.');return;}
 const expectedRevision=value.revision;let busy=false;
 ui.showDialog(`<h2>Delete ${esc(project.name)}?</h2><p>All chats and tabs in <strong>${esc(project.name)}</strong> will move to <strong>${esc(destination.name)}</strong>, this workspace’s default project.</p><p class="note">Files and chat history are preserved.</p><div class="actions"><button id="close-dialog">Cancel</button><button id="dialog-submit" class="danger">Delete project</button></div>`,async()=>{
  if(busy)throw Error('Project deletion is already in progress.');busy=true;
  const submit=$('#dialog-submit'),cancel=$('#close-dialog');submit.disabled=true;cancel.disabled=true;
  try{await mutatePreview({action:'delete',workspaceId,projectId:project.id,expectedRevision});ui.render();}
  finally{busy=false;if(submit.isConnected)submit.disabled=false;if(cancel.isConnected)cancel.disabled=false;}
 });
}
export function renderPreviewCollection(){const area=$('#main');area.innerHTML=`<div class="heading"><div><div class="eyebrow">This computer${ui.state.data.desktopPreview?.enabled?' · isolated preview':''}</div><h1>Workspaces</h1><p class="muted">Working setup for your projects and conversations.</p></div><button data-preview-create-workspace>＋ New workspace</button></div><div class="preview-workspace-cards">${ui.state.data.context.workspaces.map(w=>`<article class="card" data-workspace-card="${esc(w.id)}" tabindex="0" aria-label="Reorder ${esc(w.name)}" aria-keyshortcuts="Alt+Shift+ArrowUp Alt+Shift+ArrowDown"><button class="preview-card-title" data-preview-open="${esc(w.id)}">${workspaceIcon}<h2>${esc(w.name)}</h2></button><p class="note">${previewProjects(w.id).length} projects · ${recentChats(ui.state.data.runs).filter(r=>r.workspaceId===w.id).length} chats</p><div class="filepath">${esc(w.cwd||'No starting folder')}</div><div class="actions"><button data-preview-open="${esc(w.id)}">Open workspace</button><button data-preview-config="${esc(w.id)}">Configuration</button></div></article>`).join('')}</div>`;area.querySelectorAll('[data-preview-open]').forEach(b=>b.onclick=()=>ui.openWorkspace(workspace(b.dataset.previewOpen),'projects'));area.querySelectorAll('[data-preview-config]').forEach(b=>b.onclick=()=>ui.openWorkspace(workspace(b.dataset.previewConfig),'configuration'));area.querySelector('[data-preview-create-workspace]').onclick=()=>ui.createWorkspace();bindCardReorder(area.querySelector('.preview-workspace-cards'),{selector:'[data-workspace-card]',idOf:card=>card.dataset.workspaceCard,ids:ui.state.data.context.workspaces.map(workspace=>workspace.id),commit:async ids=>{try{ui.state.data.context=await ui.api('/api/context',{action:'reorder-workspaces',ids,expectedRevision:ui.state.data.context.revision});ui.render();}catch(error){ui.toast(error.message);}}});}
export function renderPreviewWorkspace(tab){
 if(tab.workspacePage==='configuration'&&!tab.projectId)return false;
 const main=$('#main'),profile=workspace(tab.workspaceId),project=previewProjects().find(p=>p.id===tab.projectId),page=tab.workspacePage||(project?'chats':'projects');
 main.innerHTML=`<div class="heading"><div>${project?`<button class="subtle preview-breadcrumb" data-preview-parent>${workspaceIcon}${esc(profile?.name)} ›</button>`:'<div class="eyebrow">Workspace</div>'}<h1>${esc(project?.name||profile?.name||tab.label)}</h1><p class="muted">${project?'Chats and tabs · working setup from '+esc(profile?.name):'Projects, conversations and your working setup'}</p></div><div class="actions">${project?'<button data-preview-move>Move project…</button><button data-preview-rename>Rename</button>':'<button data-preview-new-project>＋ New project</button>'}<button data-preview-new-chat class="primary">＋ New chat</button></div></div>${project?`<div class="actions preview-project-pages">${['chats','tabs'].map(p=>`<button data-preview-project-page="${p}" class="${page===p?'primary':''}">${p==='chats'?'Chats':'Tabs'}</button>`).join('')}<button data-preview-config>Workspace configuration ↗</button></div>`:''}<section id="workspace-page"></section>`;
 main.querySelector('[data-preview-new-chat]').onclick=()=>ui.newChat(tab);
 main.querySelector('[data-preview-new-project]')?.addEventListener('click',()=>projectDialog(tab.workspaceId));
 main.querySelector('[data-preview-move]')?.addEventListener('click',()=>moveProjectDialog(project));
 main.querySelector('[data-preview-rename]')?.addEventListener('click',()=>projectDialog(tab.workspaceId,project));
 main.querySelector('[data-preview-parent]')?.addEventListener('click',()=>ui.openWorkspace(profile,'projects'));
 main.querySelector('[data-preview-config]')?.addEventListener('click',()=>ui.openWorkspace(profile,'configuration'));
 main.querySelectorAll('[data-preview-project-page]').forEach(b=>b.onclick=()=>{tab.workspacePage=b.dataset.previewProjectPage;ui.render();});
 const area=$('#workspace-page');
 if(page==='projects'){
 const projects=previewProjects(tab.workspaceId);area.innerHTML=`<div class="preview-project-list workspace-tab-reorder">${projects.map(p=>{const rows=recentChats(ui.state.data.runs).filter(r=>previewProjectForChat(r)?.id===p.id);return `<article class="preview-project-row" data-preview-project-row="${esc(p.id)}" style="position:relative"><button class="preview-project-title" aria-keyshortcuts="Alt+Shift+ArrowUp Alt+Shift+ArrowDown" title="Drag to reorder projects; Alt+Shift+↑/↓" data-preview-open-project="${esc(p.id)}">${projectIcon}<span><strong>${esc(p.name)}</strong><small>${rows.length} chats</small></span></button><div class="actions"><button data-preview-project-chat="${esc(p.id)}">New chat</button>${catalog().defaultProjectIds?.[tab.workspaceId]!==p.id?`<button data-preview-default="${esc(p.id)}">Set default</button><button class="danger" data-preview-delete-project="${esc(p.id)}">Delete</button>`:'<span class="note" data-preview-default-status title="Choose another default project before deleting this project.">Default project</span>'}</div></article>`;}).join('')}</div>`;
 area.querySelectorAll('[data-preview-open-project]').forEach(b=>b.onclick=()=>openPreviewProject(projects.find(p=>p.id===b.dataset.previewOpenProject)));area.querySelectorAll('[data-preview-project-chat]').forEach(b=>b.onclick=()=>ui.newChat(openPreviewProject(projects.find(p=>p.id===b.dataset.previewProjectChat))));area.querySelectorAll('[data-preview-default]').forEach(b=>b.onclick=()=>void mutatePreview({action:'default',workspaceId:tab.workspaceId,projectId:b.dataset.previewDefault}).then(()=>ui.render()).catch(e=>ui.toast(e.message)));
 area.querySelectorAll('[data-preview-delete-project]').forEach(button=>button.onclick=()=>deleteProjectDialog(tab.workspaceId,projects.find(project=>project.id===button.dataset.previewDeleteProject)));
 bindProjectReorder(area,tab,projects);
 }else if(page==='tabs')renderPreviewTabs(area,tab);
 else ui.renderChats(false,true,{container:area,workspaceId:tab.workspaceId,workspaceName:profile?.name||tab.label,hostId:'local',projectId:project?.id,projectName:project?.name,onOpen:openPreviewChat});
 return true;
}
// Only the workspace Projects page exposes project ordering; sidebar selection stays read-only.
function bindProjectReorder(area,tab,projects){
 const list=area.querySelector('.preview-project-list');let busy=false,suppressClick=false,cancelDrag=()=>{};
 const commit=async(source,target,after)=>{
  if(busy)return;busy=true;
  try{await mutatePreview({action:'reorder',workspaceId:tab.workspaceId,projectId:source.id,targetId:target.id,after});ui.render();document.querySelector(`[data-preview-open-project="${CSS.escape(source.id)}"]`)?.focus({preventScroll:true});}
  catch(error){ui.toast(error.message);}finally{busy=false;}
 };
 list.addEventListener('pointerdown',()=>{suppressClick=false;},true);
 list.addEventListener('click',event=>{if(suppressClick&&event.detail!==0){event.preventDefault();event.stopImmediatePropagation();suppressClick=false;}},true);
 list.querySelectorAll('[data-preview-project-row]').forEach(row=>{
  const source=projects.find(project=>project.id===row.dataset.previewProjectRow);
  row.querySelector('.preview-project-title').onkeydown=event=>{
   if(!event.altKey||!event.shiftKey||!['ArrowUp','ArrowDown'].includes(event.key))return;
   event.preventDefault();event.stopPropagation();const target=projects[projects.indexOf(source)+(event.key==='ArrowUp'?-1:1)];
   if(target)void commit(source,target,event.key==='ArrowDown');
  };
  row.ondragstart=event=>event.preventDefault();
  row.onpointerdown=event=>{
   if(busy||event.button!==0||!event.isPrimary||event.target.closest('a,input,select,textarea,[contenteditable],button:not(.preview-project-title),.actions'))return;
   cancelDrag();const startX=event.clientX,startY=event.clientY,pointerId=event.pointerId;let dragging=false,target=null,after=false;
   const clearDrop=()=>list.querySelectorAll('.workspace-tab-drop-before,.workspace-tab-drop-after').forEach(node=>node.classList.remove('workspace-tab-drop-before','workspace-tab-drop-after'));
   const finish=()=>{document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);document.removeEventListener('pointercancel',cancel);document.removeEventListener('keydown',escape);row.onlostpointercapture=null;clearDrop();row.classList.remove('workspace-tab-dragging');if(row.hasPointerCapture(pointerId))row.releasePointerCapture(pointerId);cancelDrag=()=>{};};
   const escape=key=>{if(key.key==='Escape'){key.preventDefault();suppressClick=dragging;finish();}};
   const move=pointer=>{
    if(pointer.pointerId!==pointerId)return;if(!row.isConnected){finish();return;}
    if(!dragging&&Math.hypot(pointer.clientX-startX,pointer.clientY-startY)<6)return;
    if(!dragging){dragging=true;suppressClick=true;row.setPointerCapture(pointerId);row.classList.add('workspace-tab-dragging');}
    pointer.preventDefault();clearDrop();const destination=document.elementFromPoint(pointer.clientX,pointer.clientY)?.closest('[data-preview-project-row]');
    target=destination&&list.contains(destination)?projects.find(project=>project.id===destination.dataset.previewProjectRow&&project.id!==source.id):null;
    if(target){after=pointer.clientY>=destination.getBoundingClientRect().top+destination.getBoundingClientRect().height/2;destination.classList.add(after?'workspace-tab-drop-after':'workspace-tab-drop-before');}
   };
   const up=pointer=>{if(pointer.pointerId!==pointerId)return;const destination=row.isConnected?target:null,position=after,wasDragging=dragging;finish();if(wasDragging){pointer.preventDefault();if(destination)void commit(source,destination,position);}};
   const cancel=()=>{suppressClick=dragging;finish();};cancelDrag=finish;row.onlostpointercapture=cancel;
   document.addEventListener('pointermove',move);document.addEventListener('pointerup',up);document.addEventListener('pointercancel',cancel);document.addEventListener('keydown',escape);
  };
 });
}
function renderPreviewTabs(area,tab){
 const rows=()=>{const items=previewNavigation().projects.flatMap(project=>project.items);return previewTabsForScope({tabs:ui.state.tabs,projects:catalog().projects,workspaceId:tab.workspaceId,projectId:tab.projectId,localHostId:ui.state.data.hostId||'local'}).map(row=>{const activity=items.find(item=>item.tabIds.includes(row.id))?.lastAccess;return activity?{...row,lastActivityAt:new Date(activity).toISOString()}:row;});};
 let location='',type='';const locations=[...new Set(rows().map(t=>t.location))];area.innerHTML=`<div class="row"><label>Location<select data-preview-location><option value="">All locations</option>${locations.map(l=>`<option>${esc(l)}</option>`).join('')}</select></label><label>Type<select data-preview-type><option value="">All types</option><option value="run">Chat</option><option value="browser">Browser</option><option value="terminal">Terminal</option><option value="markdown">Document</option></select></label></div><section data-preview-tab-list></section>`;const filtered=()=>rows().filter(t=>(!location||t.location===location)&&(!type||t.type===type));const draw=()=>mountWorkspaceTabs(area.querySelector('[data-preview-tab-list]'),{tabs:filtered(),refresh:filtered,allTabs:rows,selectionKey:tab.id,bulk:ui.manageWorkspaceTabs,toolbar:document.querySelector(".preview-project-pages"),preview:true,allowReorder:!!tab.projectId,reorder:(source,target,after)=>ui.manageWorkspaceTab('reorder',source.id,{targetId:target.id,parentId:source.parentId,after}),act:(action,t)=>ui.manageWorkspaceTab(action,t.id),notify:ui.toast});area.querySelector('[data-preview-location]').onchange=e=>{location=e.target.value;draw();};area.querySelector('[data-preview-type]').onchange=e=>{type=e.target.value;draw();};draw();
}
export function movePreviewChat(row){const runId=row.chatId||row.runId||row.id,project=previewProjectForChat(row),workspaces=ui.state.data.context.workspaces;
 showMoveMenu({showDialog:ui.showDialog,escape:esc,groups:projectMoveGroups(workspaces,previewProjects()),current:project?.id||row.projectId,application:false,submit:async projectId=>{
 const workspaceId=previewProjects().find(item=>item.id===projectId)?.workspaceId;if(!workspaceId)throw Error('Choose an available project.');await mutatePreview({action:'move-chat',workspaceId,projectId,chatId:runId,expectedUpdatedAt:row.updatedAt||ui.state.data.runs.find(r=>r.id===runId)?.updatedAt});const run=ui.state.data.runs.find(r=>r.id===runId),destination=previewProjects().find(p=>p.id===projectId);reconcileIndexedChat({...row,...run,chatId:runId,projectId,workspaceId,workspaceName:workspace(workspaceId)?.name,projectName:destination?.name});// Stay in the current project: the chat's open tab moves under the destination
 // project without opening or selecting it, so several chats can be moved in a row.
 const parent=ensurePreviewProject(destination);for(const view of ui.state.tabs.filter(t=>t.type==='run'&&t.runId===runId&&t.parentId&&t.parentId!==parent?.id)){if(ui.state.tab===view.id)ui.state.tab=neighborAfterRemoval(ui.state.tabs,view);if(parent)view.parentId=parent.id;}ui.saveWorkspace?.();ui.render();ui.toast?.('Chat moved to '+(destination?.name||'the project')+'.');}});
}
export function previewChatBreadcrumb(run){if(!previewEnabled(ui.state))return '';const project=previewProjectForChat(run);if(!project)return '<span class="note">Unhoused chat</span>';return `<button class="subtle preview-chat-location" data-preview-chat-project="${esc(project.id)}">${esc(workspace(project.workspaceId)?.name)} › ${esc(project.name)} · Open in project</button>`;}
export function bindPreviewChatBreadcrumb(){document.querySelectorAll('[data-preview-chat-project]').forEach(b=>b.onclick=()=>{const run=ui.state.data.runs.find(r=>r.id===($('#main').dataset.runId));if(run)openPreviewChat(run);});}
export function renderPreviewSources(){
 const main=$('#main'),data=catalog();
 const scanLabel=source=>{const scan=source.scan;if(!scan)return 'Not scanned yet';return `${scan.status==='error'?'Scan failed':scan.status==='partial'?'Partial scan':scan.status==='empty'?'Scan complete · no supported sources found':'Scan complete'} · ${scan.entryCount||0} sources · ${scan.scannedFolders||0} folders`;};
 main.innerHTML=`<div class="heading"><div><div class="eyebrow">Engine Room</div><h1>Source library</h1><p class="muted">Reusable source discovery on this computer.</p></div><button data-preview-source-add>＋ Add source folder</button></div><p class="note">Registered folders offer instructions, skills, agents and connections to every workspace on this computer. Choose loading in Workspace Configuration → Instructions, skills, agents &amp; MCPs.</p><p class="note">Configured in lists saved source choices or existing folder references. Other workspaces can still choose these sources; this summary does not report actual loading or tool use. Source loading does not grant working-folder read/write access or approve connected tools.</p><p class="note" role="status" data-preview-source-status></p><div class="source-library-entries engine-card-stack" data-source-library-entries>${(data.sourceLibrary||[]).map(source=>`<article class="card source-library-entry"><div class="heading"><div><strong class="filepath">${esc(source.path)}</strong><p class="note">${source.removedAt?'Removed · retained references':source.available===false?'Unavailable':'Registered'} · ${source.entryIds?.length||0} sources</p>${!source.removedAt?`<p class="note" data-preview-source-scan="${esc(source.id)}">${esc(scanLabel(source))}${source.scan?.completedAt?' · '+esc(new Date(source.scan.completedAt).toLocaleString()):''}</p>${source.scan?.errors?.length?`<p class="banner">${source.scan.errors.slice(0,3).map(error=>esc(error.message)).join('<br>')}</p>`:''}`:''}<p class="note">Configured in: ${(source.usedBy||[]).map(workspace=>esc(workspace.name)).join(', ')||'No saved workspace configuration'}</p></div>${!source.removedAt?`<div class="actions"><button data-preview-source-refresh="${esc(source.id)}">Rescan</button><button data-preview-source-remove="${esc(source.id)}">Remove</button></div>`:''}</div></article>`).join('')||'<p class="empty">No source folders registered.</p>'}</div>`;
 const change=async args=>{
  main.querySelectorAll('button').forEach(button=>button.disabled=true);const status=main.querySelector('[data-preview-source-status]');if(status)status.textContent=args.action==='remove'?'Updating source library…':'Scanning source folders…';
  try{const next=await ui.api(projectAPI()+'/sources',{...args,expectedRevision:catalog().revision});setWorkspaceProjectsCatalog(ui.state,next);await ui.refresh(true);if(args.action!=='remove'){const source=next.sourceLibrary.find(source=>source.id===args.id||source.path===args.path);ui.toast(source?scanLabel(source):'Source library scanned. Results are available in every workspace.');}}
  catch(error){await ui.refresh(true).catch(()=>{});throw error;}
  finally{if(ui.state.page==='engine'&&ui.state.engineSection==='source-library')renderPreviewSources();}
 };
 main.querySelector('[data-preview-source-add]').onclick=async()=>{try{const paths=await window.desktop.choosePaths({kind:'folder'});if(paths[0])await change({action:'add',path:paths[0]});}catch(error){ui.toast(error.message);}};
 main.querySelectorAll('[data-preview-source-refresh]').forEach(button=>button.onclick=()=>change({action:'refresh',id:button.dataset.previewSourceRefresh}).catch(error=>ui.toast(error.message)));
 main.querySelectorAll('[data-preview-source-remove]').forEach(button=>button.onclick=()=>{const source=data.sourceLibrary.find(source=>source.id===button.dataset.previewSourceRemove);ui.showDialog(`<h2>Remove source registration?</h2><p class="filepath">${esc(source.path)}</p><p>Configured in: ${(source.usedBy||[]).map(workspace=>esc(workspace.name)).join(', ')||'No saved workspace configuration'}. Saved selections remain unavailable references until re-added or removed. Existing captured chat context remains intact.</p><div class="actions"><button id="close-dialog">Cancel</button><button id="dialog-submit">Remove registration</button></div>`,()=>change({action:'remove',id:source.id}));});
}

export function reconcilePreviewChatPlacement(){
 if(!previewEnabled(ui.state))return;
 for(const view of [...ui.state.tabs]){
  if(view.type!=='run'||view.hostId)continue;
  const run=ui.state.data.runs.find(run=>run.id===(view.runId||view.id)),project=run&&previewProjectForChat(run);if(!project)continue;
  const parent=ensurePreviewProject(project);view.parentId=parent.id;
 }
 // Distinct saved views retain their identities, children, visibility and remembered selection.
 // The sidebar projection already counts each conversation once.
}
export function previewContentDescriptors(scope,descriptors){
 if(!previewEnabled(ui.state)||scope.hostId||scope.scope!=='workspace')return descriptors;
 const projectRoots=new Set(ui.state.tabs.filter(tab=>tab.projectId).map(tab=>tab.id));
 const resourceIds=new Set(ui.state.tabs.filter(tab=>projectRoots.has(tab.parentId)).map(tab=>tab.contentTabId||tab.id));
 return descriptors.filter(tab=>!(tab.type==='chat'&&previewProjectForChat(ui.state.data.runs.find(run=>run.id===tab.chatId)||{}))&&!resourceIds.has(tab.id));
}
