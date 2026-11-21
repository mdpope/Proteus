import {createOperationControls,createOperationList,operationCategory,operationToolbar,clearOperationFilters} from '../../../public/features/chats/operations-list.js';
import {chatLink} from '../../../public/features/chats/chat-links.js';
import {chatType} from '../../../public/features/chats/chat-types.js';
export const selectChatType=type=>saved.type=type;
export const selectedChatType=()=>saved.type;
export function selectScheduleChats(name,host){Object.assign(saved,{type:'scheduled',query:'',schedule:name,computers:host?[host]:[],provider:'',categories:[],workspace:'',after:'',before:'',showArchived:false,filtersOpen:true,scroll:0,limit:100});activeFilter=saved;}
// The website mirrors the desktop Chats index while retaining host-scoped routing.
const saved={type:'all',query:'',computers:[],provider:'',categories:[],layout:'cards',project:'',workspace:'',schedule:'',after:'',before:'',showArchived:false,filtersOpen:true,scroll:0,limit:100};
const scopes=new Map();
const mounted=new WeakMap();
const pageLoads=new WeakMap();
let activeFilter=saved;
export const chatIndexShowsArchived=()=>activeFilter.showArchived;
export function renderChatIndex(container,{rows,hosts,escape:e,time,timezone,open,refresh,loadMore,archive,remove,rename,onShowArchived,onError,hasMore=false,attention=false,workspaceScope=null,sendWorkspace,move}){
 const scopeKey=workspaceScope?workspaceScope.hostId+':'+workspaceScope.workspaceId+':'+(workspaceScope.projectId||''):'main';
 if(scopeKey!=='main'&&!scopes.has(scopeKey))scopes.set(scopeKey,{...saved,type:'all',computers:[],categories:[],workspace:'',project:'',query:'',provider:'',schedule:'',after:'',before:''});
 const filterState=scopeKey==='main'?saved:scopes.get(scopeKey);activeFilter=filterState;
 return renderScopedChatIndex(container,{rows,hosts,escape:e,time,timezone,open,refresh,loadMore,archive,remove,rename,onShowArchived,onError,hasMore,attention,workspaceScope,sendWorkspace,move},filterState);
}

function renderScopedChatIndex(container,options,saved){
 const {workspaceScope,attention,escape:e}=options;
 const scope=JSON.stringify([workspaceScope?.hostId,workspaceScope?.workspaceId,workspaceScope?.projectId,attention]);
 const previous=mounted.get(container);
 if(previous?.scope===scope&&previous.root.isConnected){
  previous.options=options;previous.paint();return;
 }
 previous?.dispose();
 container.innerHTML=`<section class="card chat-index-page">${operationToolbar(saved,{attention,workspace:workspaceScope,project:workspaceScope?.projectId,escape:e})}
 <div id="chat-index-rows" class="chat-index-rows" tabindex="0" aria-label="Chats"></div>
 <div id="chat-index-menu" class="chat-index-menu" role="menu" aria-label="Chat actions" hidden>
 <button type="button" role="menuitem" data-chat-action="open">Open chat</button><button type="button" role="menuitem" data-chat-action="copy-link">Copy chat link</button>
 <button type="button" role="menuitem" data-chat-action="workspace">Send tab to workspace</button><button type="button" role="menuitem" data-chat-action="rename">Rename chat…</button>
 <button type="button" role="menuitem" data-chat-action="move">Move chat…</button><button type="button" role="menuitem" data-chat-action="archive"></button>
 <button type="button" role="menuitem" data-chat-action="delete">Delete chat…</button></div></section>`;
 const find=selector=>container.querySelector(selector),root=find('.chat-index-page'),area=find('#chat-index-rows'),menu=find('#chat-index-menu');
 const lifecycle=new AbortController();
 const instance={scope,root,options,paint,dispose:()=>{lifecycle.abort();controls.dispose();list.dispose();}};
 mounted.set(container,instance);
 let menuRow,menuButton;
 const closeMenu=(restore=false)=>{menu.hidden=true;if(restore)menuButton?.focus({preventScroll:true});menuRow=null;menuButton=null;};
 const openMenu=(row,button,event)=>{
  menuRow=row;menuButton=button;menu.dataset.run=row.id;menu.dataset.host=row.hostId;
  const archiveButton=find('[data-chat-action=archive]'),deleteButton=find('[data-chat-action=delete]');
  find('[data-chat-action=move]').hidden=!instance.options.move;
  archiveButton.hidden=!instance.options.archive;archiveButton.textContent=row.archivedAt||row.archived?'Unarchive chat':'Archive chat';
  deleteButton.hidden=!instance.options.remove;
  find('[data-chat-action=workspace]').hidden=!instance.options.sendWorkspace||!row.workspaceId;
  find('[data-chat-action=rename]').hidden=!instance.options.rename||!row.renameSupported;
  const unavailable=['queued','running','awaiting_input'].includes(row.status)||Number(row.queuedMessageCount||0)>0;
  archiveButton.disabled=unavailable;deleteButton.disabled=unavailable;
  archiveButton.title=deleteButton.title=unavailable?'Finish or cancel this chat before managing it.':'';
  menu.hidden=false;
  menu.style.left=Math.max(8,Math.min(event.clientX||button.getBoundingClientRect().left,innerWidth-menu.offsetWidth-8))+'px';
  menu.style.top=Math.max(8,Math.min(event.clientY||button.getBoundingClientRect().bottom,innerHeight-menu.offsetHeight-8))+'px';
  menu.querySelector('button:not([hidden])')?.focus({preventScroll:true});
 };
 const identity=row=>row.hostId+':'+row.id;
 const list=createOperationList(area,{key:identity,time:when=>instance.options.time(when),onOpen:row=>instance.options.open(row.id,row.hostId),
  onMenu:openMenu,decorate:(node,row)=>{node.dataset.run=row.id;node.dataset.runHost=row.hostId;node.dataset.lifecycle=String(row.lifecycleSupported===true);}});
 const controls=createOperationControls(root,saved,paint);
 const optionSignatures=new Map();
 function setChoices(name,label,values){
  const node=find('#chat-index-'+name),entries=[['',label],...values],signature=JSON.stringify(entries);
  if(optionSignatures.get(name)!==signature){
   node.replaceChildren(...entries.map(([value,label])=>new Option(label,value)));optionSignatures.set(name,signature);
  }
  const desired=saved[name]||'';
  if(node.value!==desired)node.value=desired;
 }
 function paint(){
  const {rows,hosts,timezone,hasMore,workspaceScope}=instance.options;
  const scoped=workspaceScope?rows.filter(row=>row.workspaceId===workspaceScope.workspaceId&&row.hostId===workspaceScope.hostId&&(!workspaceScope.projectId||row.projectId===workspaceScope.projectId)):rows;
  const workspaceKey=row=>row.workspaceId?row.hostId+':'+row.workspaceId:row.workspaceName;
  const distinct=key=>[...new Set(scoped.map(row=>row[key]).filter(Boolean))].sort().map(value=>[value,value]);
  setChoices('provider','All providers',distinct('provider'));
  setChoices('workspace',workspaceScope?.name||'All workspaces',[...new Map(scoped.filter(row=>row.workspaceName).map(row=>[workspaceKey(row),row.workspaceName+' · '+row.hostLabel]))]);
  setChoices('project',workspaceScope?.projectName||'All projects',[...new Map(scoped.filter(row=>row.projectId).map(row=>[row.projectId,row.projectName||row.projectId]))]);
  setChoices('schedule','All schedules',distinct('scheduleName'));
  const query=saved.query.toLocaleLowerCase();
  const formatter=saved.after||saved.before?new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}):null;
  const pool=scoped.filter(row=>{
   if(!saved.showArchived&&(row.archivedAt||row.archived))return false;
   if(attention&&(row.cached||!(row.attentionRequired??['awaiting_input','failed','interrupted'].includes(row.status))))return false;
   if(!attention&&saved.type!=='all'&&chatType(row)!==saved.type)return false;
   if(saved.computers.length&&!saved.computers.includes(row.hostId))return false;
   if(saved.provider&&row.provider!==saved.provider||saved.workspace&&workspaceKey(row)!==saved.workspace||
      saved.project&&row.projectId!==saved.project||saved.schedule&&row.scheduleName!==saved.schedule)return false;
   if(query&&![row.title,row.provider,row.model,row.hostLabel,row.workspaceName,row.projectName,row.scheduleName,row.operation?.action].some(value=>String(value||'').toLocaleLowerCase().includes(query)))return false;
   if(formatter){
    const stamp=Date.parse(row.updatedAt||row.createdAt);
    if(!Number.isFinite(stamp))return false;
    const date=formatter.format(stamp);
    if(saved.after&&date<saved.after||saved.before&&date>saved.before)return false;
   }
   return true;
  });
  const online=new Set(scoped.filter(row=>!row.cached).map(row=>row.hostId));
  const now=Date.now();
  controls.paint(hosts.map(host=>({id:host.hostId,label:host.label,online:host.online??online.has(host.hostId)})),pool,now);
  root.querySelectorAll('[data-chat-type]').forEach(button=>button.setAttribute('aria-selected',String(button.dataset.chatType===saved.type)));
  const visible=pool.filter(row=>!saved.categories.length||saved.categories.includes(operationCategory(row,now)));
  list.paint(visible,{...saved,hasMore,now});
  area.dataset.localMore=String(visible.length>saved.limit);
  if(menuButton&&!menuButton.isConnected)closeMenu();
 }
 for(const key of ['query','provider','workspace','project','schedule','after','before']){
  find('#chat-index-'+key).addEventListener(key==='query'?'input':'change',event=>{saved[key]=event.target.value;paint();});
 }
 find('#chat-index-show-archived').onchange=event=>{
  saved.showArchived=event.target.checked;paint();
  void Promise.resolve(instance.options.onShowArchived?.(saved.showArchived)).catch(error=>instance.options.onError?.(error));
 };
 menu.querySelectorAll('[data-chat-action]').forEach(button=>button.onclick=async()=>{
  const row=menuRow,action=button.dataset.chatAction;closeMenu();if(!row)return;
  const {open,sendWorkspace,rename,move,archive,remove,onError}=instance.options;
  try{
   if(action==='open')open(row.id,row.hostId);
   else if(action==='copy-link')await navigator.clipboard.writeText(chatLink(row,{origin:location.origin}));
   else if(action==='workspace')await sendWorkspace?.(row);
   else if(action==='rename')await rename?.(row);
   else if(action==='move')await move?.(row);
   else if(action==='archive')await archive?.(row,!(row.archivedAt||row.archived));
   else if(action==='delete'&&window.confirm(`Delete “${row.title||'Chat'}” from ${row.hostLabel}? This permanently removes the Proteus chat record on that computer. Generated files and provider originals are not deleted. This cannot be undone.`))await remove?.(row);
  }catch(error){onError?.(error);}
 });
 container.ownerDocument.addEventListener('keydown',event=>{if(event.key==='Escape'&&!menu.hidden){event.preventDefault();closeMenu(true);}}, {signal:lifecycle.signal});
 container.ownerDocument.addEventListener('pointerdown',event=>{if(!menu.hidden&&!menu.contains(event.target))closeMenu();},{signal:lifecycle.signal});
 find('#chat-index-clear').onclick=()=>{
  const archived=clearOperationFilters(root,saved);paint();
  if(archived)void Promise.resolve(instance.options.onShowArchived?.(false)).catch(error=>instance.options.onError?.(error));
 };
 find('#chat-index-refresh').onclick=()=>instance.options.refresh();
 find('.chat-index-filter-panel').ontoggle=event=>{saved.filtersOpen=event.target.open;};
 root.querySelectorAll('[data-chat-type]').forEach(button=>button.onclick=()=>{saved.type=button.dataset.chatType;paint();});
 if(!pageLoads.has(container))pageLoads.set(container,{pending:false,lastAttempt:''});const paging=pageLoads.get(container);
 area.onscroll=async()=>{
  saved.scroll=area.scrollTop;
  if(!area.isConnected||paging.pending||area.dataset.more!=='true'||area.scrollHeight-area.scrollTop-area.clientHeight>=240)return;
  if(area.dataset.localMore==='true'){saved.limit+=100;paint();area.scrollTop=saved.scroll;return;}
  const {rows,hasMore,loadMore,onError}=instance.options;
  const attempt=JSON.stringify([scope,rows.length,saved.type,saved.query,saved.computers,saved.categories,saved.provider,saved.workspace,saved.project,saved.schedule,saved.after,saved.before,saved.showArchived]);
  if(!hasMore||paging.lastAttempt===attempt||!loadMore)return;
  paging.pending=true;paging.lastAttempt=attempt;saved.limit+=100;
  try{await loadMore();}catch(error){onError?.(error);}finally{paging.pending=false;}
 };
 paint();area.scrollTop=saved.scroll;
}
