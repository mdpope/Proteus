import {addTabIcons,chatIconPaths} from './add-tab-menu.js';
import {browserTabIcon} from './browser-icons.js';

const timestamp=value=>{const parsed=typeof value==='number'?value:typeof value==='string'?Date.parse(value):NaN;return Number.isFinite(parsed)&&parsed>0?parsed:0;};
// Interaction/selection timestamps from older clients are intentionally not activity.
export function previewLastAccess(...tabs){return Math.max(0,...tabs.map(tab=>Math.max(timestamp(tab?.lastActivityAt),timestamp(tab?.info?.lastActivityAt))||Math.max(timestamp(tab?.createdAt),timestamp(tab?.openedAt),timestamp(tab?.info?.createdAt),timestamp(tab?.info?.openedAt))));}
export function previewChatActivity(row){return Math.max(timestamp(row?.lastActivityAt),timestamp(row?.createdAt),...(row?.events||[]).filter(event=>event.role==='user'&&event.data?.delivery?.state!=='failed'&&event.data?.delivery?.state!=='sending').map(event=>timestamp(event.at)),...(row?.queuedMessages||[]).map(message=>timestamp(message.at||message.createdAt)));}

// Only direct children of validated local workspace/project roots belong in these tables.
export function previewTabsForScope({tabs=[],projects=[],workspaceId,projectId,localHostId='local'}={}){
 const local=tab=>!tab.hostId||tab.hostId==='local'||tab.hostId===localHostId;
 const roots=new Map(tabs.filter(tab=>tab.type==='workspace'&&local(tab)&&tab.workspaceId===workspaceId&&
  (!projectId||tab.projectId===projectId)&&(!tab.projectId||projects.some(project=>project.id===tab.projectId&&project.workspaceId===workspaceId))).map(tab=>[tab.id,tab]));
 return tabs.filter(tab=>local(tab)&&tab.type!=='workspace'&&roots.has(tab.parentId)).map(tab=>({...tab,title:tab.label,url:tab.info?.url||tab.markdown?.file||'',favicon:tab.info?.favicon,location:roots.get(tab.parentId).label||'Workspace'}));
}
export function previewRelativeAge(value,now=Date.now()){
 const touched=timestamp(value);if(!touched)return '—';
 const minutes=Math.floor(Math.max(0,now-touched)/60000);
 return minutes<1?'<1m':minutes<60?minutes+'m':minutes<1440?Math.floor(minutes/60)+'h':Math.floor(minutes/1440)+'d';
}
export function previewItemIcon(type,favicon=''){
 if(type==='browser')return browserTabIcon({favicon});
 const paths=['chat','run','remote-run'].includes(type)?chatIconPaths:['terminal','agent-terminal'].includes(type)?addTabIcons.terminal:type==='browser'?addTabIcons.browser:addTabIcons.markdown;
 return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">${paths}</svg>`;
}
const isChat=tab=>['chat','run','remote-run'].includes(tab?.type);
const chatId=row=>row?.chatId||row?.runId||row?.id;

// A read-only projection of membership and saved presentation identities. Never opens resources.
export function buildPreviewNavigation({projects=[],memberships={},defaultProjectIds={},tabs=[],chats=[],localHostId='local'}={}){
 const projectsById=new Map(projects.map(project=>[project.id,project])),tabsById=new Map(tabs.map(tab=>[tab.id,tab]));
 const local=row=>row?.local===true||(row?.local!==false&&(!row?.hostId||row.hostId==='local'||row.hostId===localHostId));
 const chatRows=new Map();
 for(const row of chats){
  if(!local(row))continue;const id=chatId(row);if(!id)continue;
  const previous=chatRows.get(id);
  if(!previous||timestamp(row.updatedAt)>=timestamp(previous.updatedAt))chatRows.set(id,row);
 }
 const chatProject=row=>{
  if(!local(row))return null;
  const membership=memberships[chatId(row)],id=membership?membership.projectId:row?.projectId;
  if(projectsById.has(id))return id;
  const fallback=defaultProjectIds[membership?membership.workspaceId:row?.workspaceId];return projectsById.has(fallback)?fallback:null;
 };
 const projectIdForTab=tab=>{
  const seen=new Set();let current=tab;
  while(current&&!seen.has(current.id)){
   seen.add(current.id);
   if(!local(current))return null;
   if(current.type==='workspace'&&projectsById.has(current.projectId))return projectsById.get(current.projectId).workspaceId===current.workspaceId?current.projectId:null;
   current=tabsById.get(current.parentId);
  }
  return null;
 };
 const aliases=new Map();
 for(const tab of tabs){
  if(!isChat(tab)||!local(tab))continue;
  const id=chatId(tab);if(!aliases.has(id))aliases.set(id,[]);aliases.get(id).push(tab);
  if(!chatRows.has(id))chatRows.set(id,{id,chatId:id,title:tab.label||tab.title||'Chat',projectId:projectIdForTab(tab)});
 }
 const byProject=new Map(projects.map(project=>[project.id,new Map()]));
 for(const [id,row] of chatRows){
  const projectId=chatProject(row);if(!projectId)continue;
  const views=aliases.get(id)||[];
  if((row.archivedAt||row.archived)&&!views.some(tab=>projectIdForTab(tab)===projectId))continue;
  const access=Math.max(0,...views.map(view=>timestamp(view.lastActivityAt)),previewChatActivity(row));
  byProject.get(projectId).set('chat:'+id,{key:'chat:'+id,kind:'chat',type:'chat',chatId:id,row,title:row.title||row.label||'Chat',lastAccess:access,tabIds:views.map(tab=>tab.id)});
 }
 for(const tab of tabs){
  if(isChat(tab)||tab.type==='workspace')continue;
  const projectId=projectIdForTab(tab);if(!projectId)continue;
  const key='resource:'+(tab.hostId||localHostId)+':'+(tab.contentTabId||tab.info?.id||tab.id),items=byProject.get(projectId),previous=items.get(key),access=previewLastAccess(tab);
  const item={key,kind:'resource',type:tab.type,tabId:tab.id,tab,title:tab.customTitle||tab.label||tab.title||tab.info?.title||'Untitled tab',favicon:tab.info?.favicon||tab.favicon||'',lastAccess:access,hidden:!!tab.hidden,unloaded:tab.info?.loaded===false||tab.unloaded===true,tabIds:[tab.id]};
  if(!previous)items.set(key,item);
  else {const preferred=access>previous.lastAccess?item:previous;items.set(key,{...preferred,lastAccess:Math.max(access,previous.lastAccess),tabIds:[...new Set([...previous.tabIds,tab.id])]});}
 }
 const result=projects.map(project=>{
  const items=[...byProject.get(project.id).values()].sort((a,b)=>b.lastAccess-a.lastAccess||a.title.localeCompare(b.title)||a.key.localeCompare(b.key));
  const rootAccess=previewLastAccess(...tabs.filter(tab=>tab.type==='workspace'&&tab.projectId===project.id));
  const lastAccess=Math.max(rootAccess,...items.map(item=>item.lastAccess),0)||timestamp(project.updatedAt)||timestamp(project.createdAt);
  return {...project,items,lastAccess,totalCount:items.length,chatCount:items.filter(item=>item.kind==='chat').length,resourceCount:items.filter(item=>item.kind==='resource').length};
 });
 return {projects:result,projectIdForTab};
}
