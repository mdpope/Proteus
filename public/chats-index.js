let context;
const $ = selector => document.querySelector(selector);
const saved = { query:'', host:'', provider:'', status:'', workspace:'', schedule:'', after:'', before:'', scroll:0,limit:100 };
let refreshTimer;
let snapshot = { items:[], hosts:[], partial:false }, loading = false;

export function initChatsIndex(options) { context = options; }
export function recentChats(localRuns = []) {
  const rows = snapshot.items.length ? snapshot.items : localRuns.map(run => ({
    hostId:'local', chatId:run.id, title:run.title, status:run.status,
    updatedAt:run.updatedAt || run.createdAt, destinationName:'This Mac', local:true
  }));
  return rows.slice().sort((a,b) => (Date.parse(b.updatedAt || 0)-Date.parse(a.updatedAt || 0)) ||
    String(a.hostId).localeCompare(String(b.hostId)) || String(a.chatId).localeCompare(String(b.chatId)));
}
export async function loadChatsIndex() {
  if (loading) return snapshot;
  loading = true;
  try { snapshot = await context.api('/api/chats/index'); }
  finally { loading = false; }
  return snapshot;
}
export function openIndexedChat(row) {
  if (row.local || row.hostId === 'local') {
    const run = context.state.data.runs.find(item => item.id === (row.chatId || row.id));
    if (run) context.openLocal(run);
    else context.toast('This chat is no longer available on this Mac.');
    return;
  }
  context.openRemote(row.hostId, row.chatId || row.id, row.title);
}
export function renderChatsIndex(attention = false, fetchNow = true) {
  const main = $('#main');
  const before = $('#chat-index-rows'); if (before) saved.scroll = before.scrollTop;
  const rows = recentChats(context.state.data.runs).filter(row => !attention || ['awaiting_input','failed','interrupted'].includes(row.status));
  const hosts = [...new Map(rows.map(row => [row.hostId, row.destinationName || row.hostId])).entries()];
  const options = (values,current) => values.map(([value,label]) => `<option value="${context.escape(value)}" ${value===current?'selected':''}>${context.escape(label)}</option>`).join('');
  main.innerHTML = `<div class="heading"><div><div class="eyebrow">${attention?'Needs attention':'All connected Macs'}</div><h1>${attention?'Ready for your input.':'Chats'}</h1></div><button id="chat-index-refresh">Refresh</button></div>
    ${snapshot.partial ? '<p class="banner">Some Macs are offline. Cached chats are marked below.</p>' : ''}
    <div class="chat-index-filters"><label>Search<input id="chat-index-query" type="search" value="${context.escape(saved.query)}" placeholder="Search chat titles"></label><label>Mac<select id="chat-index-host"><option value="">All Macs</option>${options(hosts,saved.host)}</select></label><label>Provider<select id="chat-index-provider"><option value="">All providers</option>${options([...new Set(rows.map(r=>r.provider).filter(Boolean))].map(v=>[v,v]),saved.provider)}</select></label><label>Status<select id="chat-index-status"><option value="">All statuses</option>${options([...new Set(rows.map(r=>r.status).filter(Boolean))].map(v=>[v,v.replaceAll('_',' ')]),saved.status)}</select></label><label>Workspace<select id="chat-index-workspace"><option value="">All workspaces</option>${options([...new Set(rows.map(r=>r.workspaceName).filter(Boolean))].map(v=>[v,v]),saved.workspace)}</select></label><label>Schedule<select id="chat-index-schedule"><option value="">All schedules</option>${options([...new Set(rows.map(r=>r.scheduleName).filter(Boolean))].map(v=>[v,v]),saved.schedule)}</select></label></div>
    <div class="row"><label>From date<input id="chat-index-after" type="date" value="${context.escape(saved.after)}"></label><label>Through date<input id="chat-index-before" type="date" value="${context.escape(saved.before)}"></label></div><div id="chat-index-rows" class="chat-index-rows" tabindex="0" aria-label="Chats"></div><button id="chat-index-more" hidden>More chats</button>`;
  const paint = () => {
    const query = saved.query.toLocaleLowerCase();
    const dateKey=value=>{try{return new Intl.DateTimeFormat('en-CA',{timeZone:context.state.data.settings.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));}catch{return '';}};
    const visible = rows.filter(r => (!saved.after || dateKey(r.updatedAt)>=saved.after) && (!saved.before || dateKey(r.updatedAt)<=saved.before) && (!query || [r.title,r.provider,r.destinationName,r.workspaceName,r.scheduleName].some(v=>String(v||'').toLocaleLowerCase().includes(query))) && (!saved.host || r.hostId===saved.host) && (!saved.provider || r.provider===saved.provider) && (!saved.status || r.status===saved.status) && (!saved.workspace || r.workspaceName===saved.workspace) && (!saved.schedule || r.scheduleName===saved.schedule));
    const area = $('#chat-index-rows'); area.innerHTML = visible.slice(0,saved.limit).map((row,index) => `<button class="chat-index-row" data-chat-index="${index}" title="${context.escape(row.title||'Chat')}"><strong>${context.escape(row.title||'Chat')}</strong><span class="pill">${context.escape(row.destinationName||row.hostId||'This Mac')}</span><span>${context.escape(row.provider||'')}</span><span>${context.escape(row.status||'')}</span><time>${context.escape(context.time(row.updatedAt))}</time>${row.cached?'<small>Cached · last synced '+context.escape(context.time(row.lastSyncAt))+'</small>':''}</button>`).join('') || '<p class="empty">No chats match these filters.</p>';
    $('#chat-index-more').hidden=visible.length<=saved.limit;
    area.querySelectorAll('[data-chat-index]').forEach(button => button.onclick = () => openIndexedChat(visible[Number(button.dataset.chatIndex)]));
  };
  for(const [id,key] of [['query','query'],['host','host'],['provider','provider'],['status','status'],['workspace','workspace'],['schedule','schedule'],['after','after'],['before','before']]) $('#chat-index-'+id).addEventListener(id==='query'?'input':'change',event=>{saved[key]=event.target.value;paint();});
  $('#chat-index-refresh').onclick = async () => { try { await loadChatsIndex(); renderChatsIndex(attention, false); } catch(error) { context.toast(error.message); } };
  $('#chat-index-more').onclick=()=>{saved.limit+=100;paint();};
  paint(); $('#chat-index-rows').scrollTop = saved.scroll;
  clearTimeout(refreshTimer);const poll=()=>{if(!$('#chat-index-rows'))return;if(document.activeElement?.matches('#main input,#main select')){refreshTimer=setTimeout(poll,5000);return;}void loadChatsIndex().then(()=>{if($('#chat-index-rows'))renderChatsIndex(attention,false);}).catch(()=>{refreshTimer=setTimeout(poll,5000);});};refreshTimer=setTimeout(poll,5000);
  if (fetchNow) void loadChatsIndex().then(() => { if ($('#chat-index-rows')) renderChatsIndex(attention, false); }).catch(error => { if ($('#chat-index-rows')) $('#chat-index-rows').insertAdjacentHTML('afterbegin',`<p class="banner">${context.escape(error.message)}</p>`); });
}
