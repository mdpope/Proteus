import {needsAttention} from './attention-state.js';
import {previewEnabled} from '../../shared/navigation/desktop-preview.js';
import {chatMembership} from './chat-membership.js';
import {computerName,countRunningChats} from '../../services/remote/computer-identity.js';
import {chatTypes,chatType} from './chat-types.js';
let context;
export function selectChatType(type){mainSaved.type=type;saved=mainSaved;activeView={};}

const $ = selector => document.querySelector(selector);
const mainSaved = { type:'user', query:'', host:'', provider:'', status:'', workspace:'', project:'', schedule:'', after:'', before:'', showArchived:false,scroll:0,limit:100 };
let saved=mainSaved,activeView={};const workspaceViews=new Map();
let refreshTimer,indexLoaded=false,indexGeneration=0;
const reviewedRows=new Map();
const rowKey=row=>String(row.hostId||'local')+':'+(row.chatId||row.id);
export function reconcileIndexedChat(row){indexGeneration++;reviewedRows.set(rowKey(row),{...row});snapshot.items=snapshot.items.map(item=>rowKey(item)===rowKey(row)?{...item,...row}:item);context?.onIndexChanged?.();}
export function attentionChats(localRuns=[]){return recentChats(localRuns).filter(row=>!row.cached&&(row.attentionRequired===true||(row.attentionRequired===undefined&&(row.status==='awaiting_input'||(['failed','interrupted'].includes(row.status)&&!row.failureReviewedAt)))));}
let snapshot = { items:[], hosts:[], partial:false }, loading = false;

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
    ...chatMembership(run),projectId:run.projectId,projectName:run.projectName,provider:run.schedule?.provider,trigger:run.trigger,chatType:run.chatType,hostId:'local', chatId:run.id, title:run.title, titleRevision:run.titleRevision, status:run.status,
    updatedAt:run.updatedAt || run.createdAt,lastActivityAt:run.lastActivityAt,archivedAt:run.archivedAt||null,archived:!!run.archivedAt,destinationName:computerName(context?.state?.data?.hostName), local:true,attentionRequired:run.attentionRequired??needsAttention(run)
  }));
  const localById=new Map(localRuns.map(run=>[run.id,run]));
  const current=rows.map(row=>{
    const live=(row.local||row.hostId==='local')&&localById.get(row.chatId||row.id);
    if(live)row={...row,...chatMembership(live),projectId:live.projectId,projectName:live.projectName,title:live.title,titleRevision:live.titleRevision,trigger:live.trigger,chatType:live.chatType,status:live.status,updatedAt:live.updatedAt,lastActivityAt:live.lastActivityAt===undefined?row.lastActivityAt:live.lastActivityAt,archivedAt:live.archivedAt||null,failureEventAt:live.failureEventAt||null,failureReviewedAt:live.failureReviewedAt||null,attentionRequired:live.attentionRequired??needsAttention(live)};
    const reviewed=reviewedRows.get(rowKey(row));
    if(reviewed){if(row.failureEventAt&&reviewed.failureEventAt&&row.failureEventAt!==reviewed.failureEventAt&&Date.parse(row.failureEventAt)>Date.parse(reviewed.failureEventAt))reviewedRows.delete(rowKey(row));else if(['failed','interrupted'].includes(row.status)&&(Date.parse(row.updatedAt||0)<=Date.parse(reviewed.updatedAt||0)||(row.failureEventAt&&row.failureEventAt===reviewed.failureEventAt)))row={...row,attentionRequired:reviewed.attentionRequired,failureReviewedAt:reviewed.failureReviewedAt};}
    const host=snapshot.hosts.find(host=>(host.id||host.hostId)===row.hostId);
    return {...row,destinationName:row.local?computerName(context?.state?.data?.hostName,row.destinationName):computerName(host?.name,row.destinationName),cached:row.cached===true||(!row.local&&row.hostId!=='local'&&host?.online===false),lastSyncAt:row.lastSyncAt||host?.lastSyncAt};
  });
  return current.filter(row=>includeArchived||!row.archivedAt).slice().sort((a,b) => (Date.parse(b.updatedAt || 0)-Date.parse(a.updatedAt || 0)) ||
    String(a.hostId).localeCompare(String(b.hostId)) || String(a.chatId).localeCompare(String(b.chatId)));
}
export function runningChats(localRuns=[]) {
  const rows=recentChats(localRuns),local=countRunningChats(localRuns);
  const hostIds=new Set([...snapshot.hosts.filter(h=>!h.local&&h.id!==context?.state?.data?.hostId).map(h=>h.id),...rows.filter(r=>!r.local&&r.hostId!=='local').map(r=>r.hostId)]);
  return local+[...hostIds].reduce((sum,id)=>{const host=snapshot.hosts.find(h=>h.id===id);if(host?.online===false)return sum;return sum+(Number.isSafeInteger(host?.runningChatCount)?host.runningChatCount:countRunningChats(rows.filter(r=>!r.local&&r.hostId===id)));},0);
}
export async function loadChatsIndex() {
  if (loading) return snapshot;
  loading = true;
  try {const generation=indexGeneration;const next=await context.api('/api/chats/index'+(saved.showArchived?'?includeArchived=1':''));if(generation===indexGeneration){snapshot=next;indexLoaded=true;context.onIndexChanged?.();}}
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
  activeView=view;const viewKey=view.scopeKey||(view.workspaceId?view.hostId+':'+view.workspaceId+':'+(view.projectId||''):null);
  if(viewKey&&!workspaceViews.has(viewKey))workspaceViews.set(viewKey,{...mainSaved,type:'all',query:'',host:'',workspace:'',project:'',scroll:0});saved=viewKey?workspaceViews.get(viewKey):mainSaved;
  const currentSaved=saved;const main = view.container||$('#main');
  const before = $('#chat-index-rows'); if (before) saved.scroll = before.scrollTop;
  const allRows=attention?attentionChats(context.state.data.runs):recentChats(context.state.data.runs,saved.showArchived);
  const rows = view.workspaceId?allRows.filter(r=>r.workspaceId===view.workspaceId&&(r.local?'local':r.hostId)===view.hostId&&(!view.projectId||r.projectId===view.projectId)):view.workspaceOnly?allRows.filter(r=>r.workspaceId):allRows;
  const hosts = [...new Map(rows.map(row => [row.hostId, row.destinationName || row.hostId])).entries()];
  const options = (values,current) => values.map(([value,label]) => `<option value="${context.escape(value)}" ${value===current?'selected':''}>${context.escape(label)}</option>`).join('');
  main.innerHTML = `<div class="heading"><div><div class="eyebrow">${view.workspaceId?context.escape(view.workspaceName):attention?'Needs attention':'All connected computers'}</div><h1>${attention?'Ready for your input.':'Chats'}</h1></div><button id="chat-index-refresh">Refresh</button></div>
    ${!attention?`<div class="chat-type-tabs" role="tablist" aria-label="Chat types">${(view.workspaceId||view.workspaceOnly?[['all','All'],...chatTypes]:chatTypes).map(([id,label])=>`<button role="tab" aria-selected="${saved.type===id}" data-chat-type="${id}">${label}</button>`).join('')}</div>`:''}
    ${snapshot.partial ? '<p class="banner">Some computers are offline. Cached statuses are unverified and excluded from Needs attention; inspect them in Chats.</p>' : ''}
    <div class="chat-index-filters"><label>Search<input id="chat-index-query" type="search" value="${context.escape(saved.query)}" placeholder="Search chat titles"></label><label>computer<select id="chat-index-host"><option value="">All computers</option>${options(hosts,saved.host)}</select></label><label>Provider<select id="chat-index-provider"><option value="">All providers</option>${options([...new Set(rows.map(r=>r.provider).filter(Boolean))].map(v=>[v,v]),saved.provider)}</select></label><label>Status<select id="chat-index-status"><option value="">All statuses</option>${options([...new Set(rows.map(r=>r.status).filter(Boolean))].map(v=>[v,v.replaceAll('_',' ')]),saved.status)}</select></label><label>Workspace<select id="chat-index-workspace" ${view.workspaceId?'disabled':''}><option value="">${view.workspaceId?context.escape(view.workspaceName):'All workspaces'}</option>${options([...new Map(rows.filter(r=>r.workspaceId).map(r=>[(r.local?'local':r.hostId)+':'+r.workspaceId,(r.workspaceName||r.workspaceId)+' · '+(r.destinationName||r.hostId)])).entries()],saved.workspace)}</select></label>${previewEnabled(context.state)?`<label>Project<select id="chat-index-project" ${view.projectId?'disabled':''}><option value="">${view.projectId?context.escape(view.projectName):'All projects'}</option>${options([...new Map(rows.filter(r=>r.projectId).map(r=>[r.projectId,r.projectName||r.projectId])).entries()],saved.project||'')}</select></label>`:''}<label>Schedule<select id="chat-index-schedule"><option value="">All schedules</option>${options([...new Set(rows.map(r=>r.scheduleName).filter(Boolean))].map(v=>[v,v]),saved.schedule)}</select></label></div>
    <div class="row"><label>From date<input id="chat-index-after" type="date" value="${context.escape(saved.after)}"></label><label>Through date<input id="chat-index-before" type="date" value="${context.escape(saved.before)}"></label><label class="archive-switch"><input id="chat-index-show-archived" role="switch" type="checkbox" ${saved.showArchived?'checked':''}><span>Show Archived</span></label></div><div id="chat-index-rows" class="chat-index-rows" tabindex="0" aria-label="Chats"></div><button id="chat-index-more" hidden>More chats</button>`;
  const paint = () => {
    const query = saved.query.toLocaleLowerCase();
    const dateKey=value=>{try{return new Intl.DateTimeFormat('en-CA',{timeZone:context.state.data.settings.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));}catch{return '';}};
    const visible = rows.filter(r => (attention||saved.type==='all'||chatType(r)===saved.type) && (!saved.after || dateKey(r.updatedAt)>=saved.after) && (!saved.before || dateKey(r.updatedAt)<=saved.before) && (!query || [r.title,r.provider,r.destinationName,r.workspaceName,r.scheduleName].some(v=>String(v||'').toLocaleLowerCase().includes(query))) && (!saved.host || r.hostId===saved.host) && (!saved.provider || r.provider===saved.provider) && (!saved.status || r.status===saved.status) && (!saved.workspace || (r.local?'local':r.hostId)+':'+r.workspaceId===saved.workspace) && (!saved.project || r.projectId===saved.project) && (!saved.schedule || r.scheduleName===saved.schedule));
    const area = $('#chat-index-rows'); area.innerHTML = visible.slice(0,saved.limit).map((row,index) => `<button class="chat-index-row" data-chat-index="${index}" title="${context.escape(row.title||'Chat')}"><strong>${row.status==='running'?'<span class="spinner" role="status" aria-label="Running"></span>':''}${context.escape(row.title||'Chat')}</strong><span class="pill">${context.escape(row.destinationName||row.hostId||'This computer')}</span><span>${context.escape(row.provider||'')}</span><span>${context.escape(row.status||'')}</span>${previewEnabled(context.state)&&row.projectId?`<span class="chat-index-project-label">${context.escape(row.workspaceName||'')} / ${context.escape(row.projectName||row.projectId)}</span>`:''}${row.archivedAt?'<span class="pill">Archived</span>':''}<time>${context.escape(context.time(row.updatedAt))}</time>${row.cached?'<small>Cached · last synced '+context.escape(context.time(row.lastSyncAt))+'</small>':''}</button>`).join('') || '<p class="empty">No chats match these filters.</p>';
    $('#chat-index-more').hidden=visible.length<=saved.limit;
    area.querySelectorAll('[data-chat-index]').forEach(button => {const row=visible[Number(button.dataset.chatIndex)];button.onclick=()=>(view.onOpen||openIndexedChat)(row);button.oncontextmenu=event=>{event.preventDefault();lifecycleMenu(row,button);};button.onkeydown=event=>{if(event.key==='ContextMenu'||event.key==='F10'&&event.shiftKey){event.preventDefault();lifecycleMenu(row,button);}};});
  };
  for(const [id,key] of [['query','query'],['host','host'],['provider','provider'],['status','status'],['workspace','workspace'],['schedule','schedule'],['after','after'],['before','before']]) $('#chat-index-'+id).addEventListener(id==='query'?'input':'change',event=>{saved[key]=event.target.value;paint();});
  $('#chat-index-project')?.addEventListener('change',event=>{saved.project=event.target.value;paint();});
  $('#chat-index-show-archived').onchange=async event=>{saved.showArchived=event.target.checked;try{await loadChatsIndex();renderChatsIndex(attention,false,view);}catch(error){context.toast(error.message);}};
  $('#chat-index-refresh').onclick = async () => { try { await loadChatsIndex(); renderChatsIndex(attention, false,view); } catch(error) { context.toast(error.message); } };
  main.querySelectorAll('[data-chat-type]').forEach(button=>button.onclick=()=>{saved.type=button.dataset.chatType;saved.scroll=0;renderChatsIndex(attention,false,view);});
  $('#chat-index-more').onclick=()=>{saved.limit+=100;paint();};
  paint(); $('#chat-index-rows').scrollTop = saved.scroll;
  clearTimeout(refreshTimer);const poll=()=>{if(!main.isConnected||activeView!==view||!$('#chat-index-rows'))return;if(document.activeElement?.matches('#main input,#main select')){refreshTimer=setTimeout(poll,5000);return;}void loadChatsIndex().then(()=>{if(main.isConnected&&activeView===view&&$('#chat-index-rows'))renderChatsIndex(attention,false,view);}).catch(()=>{refreshTimer=setTimeout(poll,5000);});};refreshTimer=setTimeout(poll,5000);
  if (fetchNow) void loadChatsIndex().then(() => { if (main.isConnected&&activeView===view&&$('#chat-index-rows')) renderChatsIndex(attention, false,view); }).catch(error => { if ($('#chat-index-rows')) $('#chat-index-rows').insertAdjacentHTML('afterbegin',`<p class="banner">${context.escape(error.message)}</p>`); });
}
