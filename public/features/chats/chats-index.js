import {createOperationControls,createOperationList,operationCategory,operationToolbar,clearOperationFilters} from './operations-list.js';
import {orderedComputers} from '../../services/remote/computer-order.js';
import {needsAttention} from './attention-state.js';
import {previewEnabled} from '../../shared/navigation/desktop-preview.js';
import {chatMembership} from './chat-membership.js';
import {computerName,countRunningChats} from '../../services/remote/computer-identity.js';
import {chatType} from './chat-types.js';
let context;
export function selectScheduleChats(name,host='local'){Object.assign(mainSaved,{type:'scheduled',query:'',schedule:name,computers:[host],provider:'',categories:[],workspace:'',project:'',after:'',before:'',showArchived:false,filtersOpen:true,scroll:0,limit:100});saved=mainSaved;activeView={};}
export function selectChatType(type){mainSaved.type=type;saved=mainSaved;activeView={};}

const $ = selector => document.querySelector(selector);
const mainSaved = { type:'all', query:'', computers:[], provider:'', categories:[], layout:'cards', workspace:'', project:'', schedule:'', after:'', before:'', showArchived:false,filtersOpen:true,scroll:0,limit:100 };
let saved=mainSaved,activeView={};const workspaceViews=new Map();
let refreshTimer,mountedIndex,indexLoaded=false,indexGeneration=0;
const reviewedRows=new Map();
const rowKey=row=>String(row.hostId||'local')+':'+(row.chatId||row.id);
export function reconcileIndexedChat(row){indexGeneration++;reviewedRows.set(rowKey(row),{...row});snapshot.items=snapshot.items.map(item=>rowKey(item)===rowKey(row)?{...item,...row}:item);context?.onIndexChanged?.();}
export function attentionChats(localRuns=[]){return recentChats(localRuns).filter(row=>!row.cached&&(row.attentionRequired===true||(row.attentionRequired===undefined&&(row.status==='awaiting_input'||(['failed','interrupted'].includes(row.status)&&!row.failureReviewedAt)))));}
let snapshot = { items:[], hosts:[], partial:false }, loading = false;
// Polls re-render only for visible changes; an online host's sync time advances on every read.
const indexSignature=()=>JSON.stringify({...snapshot,hosts:snapshot.hosts.map(host=>host.online===false?host:{...host,lastSyncAt:undefined})});

export function initChatsIndex(options) { context = options; }
export async function changeIndexedChat(row, action) {
  const result=await context.api('/api/chat-lifecycle',{action,id:row.chatId||row.id,hostId:row.hostId,expectedUpdatedAt:row.updatedAt,expectedArchivedAt:row.archivedAt||null});
  if(action==='delete')context.onDeleted?.(row);
  snapshot.items=action==='delete'?snapshot.items.filter(item=>item.hostId!==row.hostId||item.chatId!==(row.chatId||row.id)):snapshot.items.map(item=>item.hostId===row.hostId&&item.chatId===(row.chatId||row.id)?{...item,...result}:item);
  await loadChatsIndex();
  return result;
}
function lifecycleMenu(row,anchor){
  document.querySelector('#chat-context-menu')?.remove();
  const menu=document.createElement('div');menu.id='chat-context-menu';menu.className='chat-context-menu';menu.setAttribute('role','menu');
  menu.innerHTML=`<button role="menuitem" data-chat-action="open">${previewEnabled(context.state)?(row.workspaceId?'Open in project':'Open'):'Open'}</button><button role="menuitem" data-chat-action="copy-link">Copy chat link</button>${row.workspaceId&&context.sendToWorkspace?`<button role="menuitem" data-chat-action="workspace">${previewEnabled(context.state)?'Open in project':'Send to workspace'}</button>`:''}<button role="menuitem" data-chat-action="move">Move to workspace…</button><button role="menuitem" data-chat-action="rename">Rename…</button><button role="menuitem" data-chat-action="${row.archivedAt?'unarchive':'archive'}">${row.archivedAt?'Unarchive':'Archive'}</button><button role="menuitem" data-chat-action="delete" class="danger">Delete chat…</button>`;
  document.body.append(menu);
  const bounds=anchor.getBoundingClientRect();menu.style.left=Math.max(4,Math.min(window.innerWidth-menu.offsetWidth-4,bounds.left))+'px';menu.style.top=Math.max(4,Math.min(window.innerHeight-menu.offsetHeight-4,bounds.bottom))+'px';
  const dismiss=event=>{if(event.type==='keydown'&&event.key!=='Escape')return;if(event.type==='pointerdown'&&menu.contains(event.target))return;menu.remove();document.removeEventListener('keydown',dismiss,true);document.removeEventListener('pointerdown',dismiss,true);};
  document.addEventListener('keydown',dismiss,true);document.addEventListener('pointerdown',dismiss,true);
  menu.querySelectorAll('[data-chat-action]').forEach(button=>button.onclick=event=>{event.stopPropagation();const action=button.dataset.chatAction;dismiss({type:'keydown',key:'Escape'});if(action==='open')(activeView.onOpen||openIndexedChat)(row);else if(action==='copy-link')void context.copyLink?.(row).catch(error=>context.toast(error.message));else if(action==='move')void context.moveChat?.(row).catch(error=>context.toast(error.message));else if(action==='workspace')context.sendToWorkspace(row);else if(action==='rename')context.rename?.(row);else if(action==='delete')context.showDialog(`<h2>Delete ${context.escape(row.title||'chat')}?</h2><p>This deletes only the Proteus chat record on ${context.escape(row.destinationName||'this computer')}. Generated files and the provider’s original session remain untouched. Running or queued work must finish or be stopped first.</p><button id="close-dialog">Cancel</button><button id="dialog-submit" class="danger">Delete chat</button>`,async()=>{await changeIndexedChat(row,'delete');renderChatsIndex(false,false,activeView);});else void changeIndexedChat(row,action).then(()=>renderChatsIndex(false,false,activeView)).catch(error=>context.toast(error.message));});
  menu.querySelector('button')?.focus();
}
export function recentChats(localRuns = [],includeArchived = false) {
  const rows = indexLoaded ? snapshot.items : localRuns.filter(run=>includeArchived||!run.archivedAt).map(run => ({
    ...chatMembership(run),projectId:run.projectId,projectName:run.projectName,scheduleName:run.trigger==='chat'?'':run.schedule?.name,provider:run.schedule?.provider,model:run.schedule?.model,reasoningEffort:run.schedule?.reasoningEffort,serviceTier:run.schedule?.serviceTier,trigger:run.trigger,chatType:run.chatType,hostId:'local', chatId:run.id, title:run.title, titleRevision:run.titleRevision, status:run.status,
    operation:run.operation,updatedAt:run.updatedAt || run.createdAt,lastActivityAt:run.lastActivityAt,archivedAt:run.archivedAt||null,archived:!!run.archivedAt,destinationName:computerName(context?.state?.data?.hostName), local:true,attentionRequired:run.attentionRequired??needsAttention(run)
  }));
  const localById=new Map(localRuns.map(run=>[run.id,run]));
  const current=rows.map(row=>{
    const live=(row.local||row.hostId==='local')&&localById.get(row.chatId||row.id);
    if(live)row={...row,operation:live.operation,scheduleName:live.trigger==='chat'?'':live.schedule?.name,provider:live.schedule?.provider,model:live.schedule?.model,reasoningEffort:live.schedule?.reasoningEffort,serviceTier:live.schedule?.serviceTier,...chatMembership(live),projectId:live.projectId,projectName:live.projectName,title:live.title,titleRevision:live.titleRevision,trigger:live.trigger,chatType:live.chatType,status:live.status,updatedAt:live.updatedAt,lastActivityAt:live.lastActivityAt===undefined?row.lastActivityAt:live.lastActivityAt,archivedAt:live.archivedAt||null,failureEventAt:live.failureEventAt||null,failureReviewedAt:live.failureReviewedAt||null,attentionRequired:live.attentionRequired??needsAttention(live)};
    const reviewed=reviewedRows.get(rowKey(row));
    if(reviewed){if(row.failureEventAt&&reviewed.failureEventAt&&row.failureEventAt!==reviewed.failureEventAt&&Date.parse(row.failureEventAt)>Date.parse(reviewed.failureEventAt))reviewedRows.delete(rowKey(row));else if(['failed','interrupted'].includes(row.status)&&(Date.parse(row.updatedAt||0)<=Date.parse(reviewed.updatedAt||0)||(row.failureEventAt&&row.failureEventAt===reviewed.failureEventAt)))row={...row,attentionRequired:reviewed.attentionRequired,failureReviewedAt:reviewed.failureReviewedAt};}
    const host=snapshot.hosts.find(host=>(host.id||host.hostId)===row.hostId);
    return {...row,destinationName:row.local?computerName(context?.state?.data?.hostName,row.destinationName):computerName(host?.name,row.destinationName),cached:row.cached===true||(!row.local&&row.hostId!=='local'&&(host?.online!==true||host?.loading===true)),lastSyncAt:row.lastSyncAt||host?.lastSyncAt,ownerObservedAt:host?.ownerObservedAt,clockOffset:host?.clockOffset};
  });
  return current.filter(row=>includeArchived||!row.archivedAt).slice().sort((a,b) => (Date.parse(b.updatedAt || 0)-Date.parse(a.updatedAt || 0)) ||
    String(a.hostId).localeCompare(String(b.hostId)) || String(a.chatId).localeCompare(String(b.chatId)));
}
export function runningChats(localRuns=[]) {
  const rows=recentChats(localRuns),local=countRunningChats(localRuns);
  const hostIds=new Set([...snapshot.hosts.filter(h=>!h.local&&h.id!==context?.state?.data?.hostId).map(h=>h.id),...rows.filter(r=>!r.local&&r.hostId!=='local').map(r=>r.hostId)]);
  return local+[...hostIds].reduce((sum,id)=>{const host=snapshot.hosts.find(h=>h.id===id);if(host?.online===false)return sum;return sum+(Number.isSafeInteger(host?.runningChatCount)?host.runningChatCount:countRunningChats(rows.filter(r=>!r.local&&r.hostId===id)));},0);
}
export async function loadChatsIndex({force=false}={}) {
  if (loading) return snapshot;
  loading = true;
  try {const generation=indexGeneration;const next=await context.api('/api/chats/index?'+new URLSearchParams({...((saved.showArchived)?{includeArchived:'1'}:{}),...(force?{force:'1'}:{})}));if(generation===indexGeneration){snapshot=next;if(mainSaved.computers.includes('local')){const own=snapshot.hosts.find(host=>host.id===context.state.data.hostId);if(own)mainSaved.computers=mainSaved.computers.map(id=>id==='local'?own.id:id);}indexLoaded=true;context.onIndexChanged?.();}}
  finally { loading = false; }
  return snapshot;
}
export async function openIndexedChat(row) {
  if (row.local || row.hostId === 'local') {
    let run = context.state.data.runs.find(item => item.id === (row.chatId || row.id));
    if(!run){const page=context.state.page,tab=context.state.tab;try{const fresh=await context.api('/api/state');context.state.data=fresh;context.onIndexChanged?.();if(context.state.page!==page||context.state.tab!==tab)return;run=fresh.runs.find(item=>item.id===(row.chatId||row.id));}catch(error){context.toast('Could not refresh this chat: '+error.message);return;}}
    if (run) context.openLocal(run);
    else context.toast('This chat is no longer available on this computer.');
    return;
  }
  context.openRemote(row.hostId, row.chatId || row.id, row.title);
}

export function renderChatsIndex(attention = false, fetchNow = true, view = {}) {
 activeView=view;
 const viewKey=view.scopeKey||(view.workspaceId?view.hostId+':'+view.workspaceId+':'+(view.projectId||''):null);
 if(viewKey&&!workspaceViews.has(viewKey))workspaceViews.set(viewKey,{...mainSaved,type:'all',query:'',computers:[],categories:[],workspace:'',project:'',scroll:0});
 saved=viewKey?workspaceViews.get(viewKey):mainSaved;
 const main=view.container||$('#main'),currentSaved=saved;
 const scope=JSON.stringify([viewKey,attention,!!view.workspaceOnly]);
 if(mountedIndex?.main===main&&mountedIndex.scope===scope&&mountedIndex.root.isConnected){
  mountedIndex.view=view;
  mountedIndex.paint();
  return;
 }
 mountedIndex?.dispose();
 const scroller=main.closest('#main')||main;
 const find=selector=>main.querySelector(selector);
 const e=context.escape;
 main.innerHTML=`<section class="chat-index-page">${operationToolbar(currentSaved,{attention,workspace:view.workspaceId,project:view.projectId,escape:e})}
 <div id="chat-index-rows" class="chat-index-rows" tabindex="0" aria-label="Chats"></div></section>`;
 const root=find('.chat-index-page'),area=find('#chat-index-rows');
 const list=createOperationList(area,{key:rowKey,scroller,time:context.time,onOpen:row=>(mountedIndex?.view.onOpen||openIndexedChat)(row),
  onMenu:lifecycleMenu,decorate:(node,row)=>{node.dataset.chatIndex=rowKey(row);}});
 const controls=createOperationControls(root,currentSaved,()=>paint());
 const optionSignatures=new Map();
 const setChoices=(name,label,values)=>{
  const node=find('#chat-index-'+name),entries=[['',label],...values];
  const signature=JSON.stringify(entries);
  if(optionSignatures.get(name)!==signature){
   node.replaceChildren(...entries.map(([value,label])=>new Option(label,value)));
   optionSignatures.set(name,signature);
  }
  const desired=currentSaved[name]||'';
  if(node.value!==desired)node.value=desired;
 };
 const paint=()=>{
  const scopeView=mountedIndex.view,filter=currentSaved;
  const all=attention?attentionChats(context.state.data.runs):recentChats(context.state.data.runs,filter.showArchived);
  const rows=scopeView.workspaceId?all.filter(row=>row.workspaceId===scopeView.workspaceId&&(row.local?'local':row.hostId)===scopeView.hostId&&(!scopeView.projectId||row.projectId===scopeView.projectId))
   :scopeView.workspaceOnly?all.filter(row=>row.workspaceId):all;
  const hosts=new Map(snapshot.hosts.map(host=>[host.id,{id:host.id,label:host.name,online:host.online===true&&!host.loading}]));
  for(const row of rows)if(!hosts.has(row.hostId))hosts.set(row.hostId,{id:row.hostId,label:row.destinationName||row.hostId,online:row.local});
  const distinct=key=>[...new Set(rows.map(row=>row[key]).filter(Boolean))].sort().map(value=>[value,value]);
  const workspaceKey=row=>(row.local?'local':row.hostId)+':'+row.workspaceId;
  setChoices('provider','All providers',distinct('provider'));
  setChoices('workspace',scopeView.workspaceName||'All workspaces',[...new Map(rows.filter(row=>row.workspaceId).map(row=>[workspaceKey(row),row.workspaceName||row.workspaceId]))]);
  setChoices('project',scopeView.projectName||'All projects',[...new Map(rows.filter(row=>row.projectId).map(row=>[row.projectId,row.projectName||row.projectId]))]);
  setChoices('schedule','All schedules',distinct('scheduleName'));
  const query=filter.query.toLocaleLowerCase();
  const formatter=filter.after||filter.before?new Intl.DateTimeFormat('en-CA',{timeZone:context.state.data.settings.timezone,year:'numeric',month:'2-digit',day:'2-digit'}):null;
  const pool=rows.filter(row=>{
   if(!attention&&filter.type!=='all'&&chatType(row)!==filter.type)return false;
   if(filter.computers.length&&!filter.computers.includes(row.hostId))return false;
   if(filter.provider&&row.provider!==filter.provider||filter.workspace&&workspaceKey(row)!==filter.workspace||
      filter.project&&row.projectId!==filter.project||filter.schedule&&row.scheduleName!==filter.schedule)return false;
   if(query&&![row.title,row.provider,row.model,row.destinationName,row.workspaceName,row.projectName,row.scheduleName,row.operation?.action].some(value=>String(value||'').toLocaleLowerCase().includes(query)))return false;
   if(formatter){
    const stamp=Date.parse(row.updatedAt||row.createdAt);
    if(!Number.isFinite(stamp))return false;
    const date=formatter.format(stamp);
    if(filter.after&&date<filter.after||filter.before&&date>filter.before)return false;
   }
   return true;
  });
  const now=Date.now();
  controls.paint(orderedComputers(hosts.values(),context.state.data.settings?.preferences?.computerOrder,context.state.data.hostId),pool,now);
  root.querySelectorAll('[data-chat-type]').forEach(button=>button.setAttribute('aria-selected',String(button.dataset.chatType===filter.type)));
  list.paint(pool.filter(row=>!filter.categories.length||filter.categories.includes(operationCategory(row,now))),{...filter,now});
 };
 const onScroll=()=>{
  if(!root.isConnected)return;
  currentSaved.scroll=scroller.scrollTop;
  if(area.dataset.more==='true'&&area.getBoundingClientRect().bottom-scroller.getBoundingClientRect().bottom<240){
   const top=scroller.scrollTop;currentSaved.limit+=100;paint();scroller.scrollTop=top;
  }
 };
 scroller.addEventListener('scroll',onScroll,{passive:true});
 const instance={main,root,scope,view,paint,dispose:()=>{
  controls.dispose();list.dispose();clearTimeout(refreshTimer);scroller.removeEventListener('scroll',onScroll);
 }};
 mountedIndex=instance;
 const reload=async({force=false}={})=>{
  await loadChatsIndex({force});
  if(instance===mountedIndex&&root.isConnected)paint();
 };
 const read=(force=false)=>void reload({force}).catch(error=>{if(root.isConnected)context.toast(error.message);});
 for(const key of ['query','provider','workspace','project','schedule','after','before']){
  find('#chat-index-'+key).addEventListener(key==='query'?'input':'change',event=>{currentSaved[key]=event.target.value;paint();});
 }
 find('#chat-index-show-archived').onchange=event=>{currentSaved.showArchived=event.target.checked;paint();read();};
 find('#chat-index-clear').onclick=()=>{const archived=clearOperationFilters(root,currentSaved);paint();if(archived)read();};
 find('#chat-index-refresh').onclick=()=>read(true);
 root.querySelectorAll('[data-chat-type]').forEach(button=>button.onclick=()=>{currentSaved.type=button.dataset.chatType;paint();});
 find('.chat-index-filter-panel').ontoggle=event=>{currentSaved.filtersOpen=event.target.open;};
 paint();scroller.scrollTop=currentSaved.scroll;
 const poll=async()=>{
  if(instance!==mountedIndex||!root.isConnected)return;
  const prior=indexSignature();
  try{await loadChatsIndex();if(instance===mountedIndex&&root.isConnected&&indexSignature()!==prior)paint();}catch{}
  if(instance===mountedIndex&&root.isConnected)refreshTimer=setTimeout(poll,5000);
 };
 refreshTimer=setTimeout(poll,5000);
 if(fetchNow)read();
}
