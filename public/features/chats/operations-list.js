import {bindRuntimeTimer,disposeRuntimeTimers,formatDuration} from './runtime.js';
import {chatRunOptions,chatTypes} from './chat-types.js';
import {bindPinchZoom,zoomControl} from '../../shared/ui/content-zoom.js';

export const operationCategories = [
 {id:'working',label:'Working',states:['running','queued']},
 {id:'attention',label:'Needs you',states:['awaiting_input']},
 {id:'finished',label:'Finished',states:['completed','cancelled']},
 {id:'failed',label:'Failed',states:['failed','interrupted']},
 {id:'stale',label:'Stale',states:['stale']},
];
const statusLabels={running:'Running',queued:'Queued',awaiting_input:'Needs you',completed:'Finished',
 failed:'Failed',interrupted:'Interrupted',cancelled:'Cancelled',stale:'Stale'};
const buckets=[
 {id:'active',label:'Active & needs attention'},
 {id:'finished',label:'Recently finished'},
 {id:'cached',label:'Unverified · disconnected computer'},
];
const activityAt=row=>row.operation?.actionAt||row.lastActivityAt||row.updatedAt||row.createdAt||'';
const staleAfterMs=72*60*60*1000;
function staleAt(row){
 if(row.cached||!['failed','interrupted','awaiting_input'].includes(row.status))return NaN;
 const since=Date.parse((row.status==='awaiting_input'?null:row.failureEventAt)||activityAt(row));
 const offset=Number.isFinite(row.clockOffset)?row.clockOffset:0;
 return since+staleAfterMs-offset;
}
function operationStatus(row,now=Date.now()){
 return row.cached?'cached':now>=staleAt(row)?'stale':row.status||'unknown';
}
const bucket=state=>state==='cached'?'cached':['completed','cancelled','stale'].includes(state)?'finished':'active';
const activeSince=row=>Date.parse(row.operation?.activeSince);
const hasClock=row=>row.status==='running'&&!row.cached&&Number.isFinite(activeSince(row));
const elapsed=(row,now=Date.now())=>{
 const base=row.operation?.activeMs;
 if(!Number.isFinite(base))return '—';
 const offset=Number.isFinite(row.clockOffset)?row.clockOffset:0;
 const observed=Date.parse(row.ownerObservedAt);
 const end=row.cached?(Number.isFinite(observed)?observed:Date.parse(row.lastSyncAt)+offset):now+offset;
 const tail=Number.isFinite(activeSince(row))&&Number.isFinite(end)?Math.max(0,end-activeSince(row)):0;
 return formatDuration(base+tail)+(row.operation.partial?' · partial':'');
};
const tokens=new Intl.NumberFormat();
const value=count=>Number.isSafeInteger(count)&&count>=0?tokens.format(count):'—';
const update=(node,text)=>{if(node.textContent!==text)node.textContent=text;};
const buttonIcons={
 computers:'<rect x="2.5" y="3.5" width="11" height="7" rx="1"/><path d="M1.5 13h13"/>',
 working:'<path d="M13 7A5 5 0 1 0 8 13m5-6V3m0 4H9"/>',
 attention:'<circle cx="8" cy="8" r="5"/><path d="M8 4.5V8l2 1.5"/>',
 finished:'<path d="m3 8 3 3 7-7"/>',
 failed:'<path d="M8 3v6m0 2.5v1.5"/>',
 stale:'<path d="M4 3h8l-1 3-3 2 3 2 1 3H4l1-3 3-2-3-2z"/>',
 cards:'<rect x="2.5" y="3" width="11" height="10" rx="1"/><path d="M2.5 7h11"/>',
 table:'<path d="M6 4h7M6 8h7m-7 4h7M3 4h.1M3 8h.1M3 12h.1"/>',
};
const icon=key=>'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+buttonIcons[key]+'</svg>';
const fields=[
 ['provider','Provider'],['workspace','Workspace'],['project','Project'],['schedule','Schedule'],
 ['after','From date'],['before','Through date'],
];
const cardSizeKey='proteus.chat-card-size';
function savedCardSize(){
 try{
  const size=Number(localStorage.getItem(cardSizeKey));
  if(Number.isInteger(size)&&size>=75&&size<=200)return size;
 }catch{}
 return 100;
}

export function operationToolbar(saved,{attention,workspace,project,escape:e}){
 return `<header class="ops-topbar"><h1>${attention?'Needs attention':'Chats'}</h1>
 ${attention?'':`<div class="chat-type-tabs" role="tablist" aria-label="Chat types">${[['all','All operations'],...chatTypes].map(([id,label])=>`<button type="button" role="tab" aria-selected="${saved.type===id}" data-chat-type="${id}">${label[0]+label.slice(1).toLowerCase()}</button>`).join('')}</div>`}</header>
 <div class="ops-controls"><div class="ops-computers" role="group" aria-label="Computers"></div><div class="ops-categories" role="group" aria-label="Work status"></div></div>
 <div class="ops-search-row"><label class="ops-search">Search<input id="chat-index-query" type="search" value="${e(saved.query)}" placeholder="Search chats, projects, models…"></label>
 <div class="ops-view-size"></div>
 <div class="ops-layout" role="group" aria-label="View"></div><button type="button" id="chat-index-clear">Clear filters</button><button type="button" id="chat-index-refresh">Refresh</button></div>
 <details class="chat-index-filter-panel" ${saved.filtersOpen?'open':''}><summary>Filters</summary><div class="chat-index-filters">
 ${fields.map(([id,label],index)=>`<label>${label}${index<4?`<select id="chat-index-${id}" ${(id==='workspace'&&workspace||id==='project'&&project)?'disabled':''}></select>`:`<input id="chat-index-${id}" type="date" value="${e(saved[id])}">`}</label>`).join('')}
 <label class="ops-archive"><input id="chat-index-show-archived" role="switch" type="checkbox" ${saved.showArchived?'checked':''}><span>Show archived</span></label>
 </div></details>`;
}

export function clearOperationFilters(root,filters){
 const archived=filters.showArchived;
 for(const key of ['query',...fields.map(([id])=>id)]){
  filters[key]='';
  root.querySelector('#chat-index-'+key).value='';
 }
 Object.assign(filters,{computers:[],categories:[],showArchived:false,limit:100});
 root.querySelector('#chat-index-show-archived').checked=false;
 return archived;
}

export function operationCategory(row,now) {
 const state=operationStatus(row,now);
 return operationCategories.find(category=>category.states.includes(state))?.id??null;
}

export function toggleOperationFilter(values,id) {
 return values.includes(id)?values.filter(value=>value!==id):[...values,id];
}

export function createOperationControls(root,filters,draw){
 const buttons=new Map();
 const sizes={cards:savedCardSize(),table:100};
 const zoom=zoomControl({label:'Card size',onSize:setSize});
 root.querySelector('.ops-view-size').append(zoom.element);
 root.style.setProperty('--ops-card-scale',String(sizes.cards/100));
 function setSize(percent){
  const size=Math.max(75,Math.min(200,Math.round(percent))),layout=filters.layout;
  if(!Number.isFinite(size)||size===sizes[layout])return;
  sizes[layout]=size;
  root.style.setProperty(layout==='cards'?'--ops-card-scale':'--ops-table-scale',String(size/100));
  zoom.value(size);
  if(layout==='cards')try{localStorage.setItem(cardSizeKey,String(size));}catch{}
 }
 const disposeZoom=bindPinchZoom(root,()=>sizes[filters.layout]/100,value=>setSize(value*100));
 let zoomLayout;
 let staleTimer;
 const paintGroup=(group,items)=>{
  const target=root.querySelector('.ops-'+group);
  const keep=new Set(items.map(item=>item.id));
  for(const button of [...target.children])if(!keep.has(button.dataset.id)){
   buttons.delete(group+':'+button.dataset.id);button.remove();
  }
  let cursor=target.firstElementChild;
  for(const {id,label,detail,mark,online,pressed,toggle} of items){
   const key=group+':'+id;
   let button=buttons.get(key);
   if(!button){
    button=document.createElement('button');button.type='button';button.dataset.id=id;
    button.innerHTML=(mark?icon(mark):'<span class="ops-computer-dot" aria-hidden="true"></span>')+'<span class="ops-control-label"></span><span class="ops-control-detail"></span>';
    buttons.set(key,button);
   }
   update(button.querySelector('.ops-control-label'),label);
   const suffix=button.querySelector('.ops-control-detail');update(suffix,detail??'');suffix.hidden=detail===undefined;
   if(online!==undefined&&button.dataset.online!==String(online))button.dataset.online=String(online);
   if(button.getAttribute('aria-pressed')!==String(pressed))button.setAttribute('aria-pressed',String(pressed));
   button.onclick=()=>{toggle();draw();};
   if(button!==cursor)target.insertBefore(button,cursor);
   cursor=button.nextElementSibling;
  }
 };
 return {
  paint(hosts,rows,now=Date.now()){
   const counts={};
   let nextStale=Infinity;
   for(const row of rows){
    const category=operationCategory(row,now);
    if(category)counts[category]=(counts[category]||0)+1;
    const deadline=staleAt(row);
    if(deadline>now)nextStale=Math.min(nextStale,deadline);
   }
   clearTimeout(staleTimer);
   if(Number.isFinite(nextStale))staleTimer=setTimeout(()=>{if(root.isConnected)draw();},Math.min(nextStale-now,staleAfterMs));
   if(zoomLayout!==filters.layout){
    zoomLayout=filters.layout;zoom.rename(zoomLayout==='cards'?'Card size':'Table size');zoom.value(sizes[zoomLayout]);
   }
   paintGroup('computers',[
    {id:'all',label:'All computers',mark:'computers',detail:String(hosts.length),pressed:!filters.computers.length,toggle:()=>{filters.computers=[];}},
    ...hosts.map(host=>({id:host.id,label:host.label,detail:host.online?'Online':'Offline',online:host.online,
     pressed:filters.computers.includes(host.id),toggle:()=>{filters.computers=toggleOperationFilter(filters.computers,host.id);}})),
   ]);
   paintGroup('categories',operationCategories.map(({id,label})=>({
    id,label,detail:String(counts[id]||0),mark:id,pressed:filters.categories.includes(id),
    toggle:()=>{filters.categories=toggleOperationFilter(filters.categories,id);},
   })));
   paintGroup('layout',['cards','table'].map(id=>({id,label:id==='cards'?'Cards':'Table',mark:id,pressed:filters.layout===id,
    toggle:()=>{filters.layout=id;}})));
  },
  dispose(){disposeZoom();clearTimeout(staleTimer);},
 };
}

// Rows keep their identity across owner pushes. The timer touches visible
// runtime labels only. It never drives sorting, fetching or layout decisions.
export function createOperationList(area,{key,time,onOpen,onMenu,decorate,scroller=area}){
 const entries=new Map();
 let sortedKeys=[],orderSignature='';
 const columns=['Chat / current action','Status','Computer','Provider / model','Runtime','Input tokens','Output tokens','Activity'];
 const summary=document.createElement('p');summary.className='chat-index-status note';summary.setAttribute('role','status');area.append(summary);
 const sections=new Map(buckets.map(({id,label})=>{
  const section=document.createElement('section');
  section.className='ops-bucket ops-bucket-'+id;
  const title=document.createElement('h3');title.textContent=label+' ';
  const count=document.createElement('small');count.className='ops-bucket-count';title.append(count);
  const frame=document.createElement('div');frame.className='ops-rows-frame';
  const header=document.createElement('div');header.className='ops-table-header';
  header.append(...columns.map(name=>Object.assign(document.createElement('span'),{textContent:name})));
  const list=document.createElement('div');list.className='ops-items';
  frame.append(header,list);section.append(title,frame);area.append(section);
  return [id,{section,list,count}];
 }));
 const byNode=new WeakMap();
 const bindClock=entry=>{
  const row=entry.row;
  bindRuntimeTimer(entry.fields.runtime,()=>elapsed(entry.row),entry.visible&&hasClock(row));
 };
 const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(records=>{
  for(const record of records){
   const entry=byNode.get(record.target);
   if(entry){entry.visible=record.isIntersecting;bindClock(entry);}
  }
 }):null;
 const makeEntry=()=>{
  const node=document.createElement('button');node.type='button';node.className='chat-index-row ops-row';
  node.innerHTML=`<span class="ops-context"><strong data-field="title"></strong><small data-field="placement"></small><span class="ops-action"><span class="ops-working-bars" aria-hidden="true"></span><span data-field="action"></span></span></span>
  <span class="ops-status"><span class="ops-working-icon" aria-hidden="true"></span><span data-field="status"></span></span><span data-field="computer"></span><span class="ops-model"><span data-field="model"></span><small data-field="options"></small></span>
  <span class="ops-metrics"><span><small>Active runtime</small><span data-field="runtime"></span></span><span><small>Input tokens</small><span data-field="input"></span></span><span><small>Output tokens</small><span data-field="output"></span></span></span>
  <time data-field="activity"></time>`;
  const fields=Object.fromEntries([...node.querySelectorAll('[data-field]')].map(field=>[field.dataset.field,field]));
  const entry={node,fields,visible:!observer,row:null};
  node.onclick=()=>onOpen(entry.row);
  node.oncontextmenu=event=>{event.preventDefault();onMenu?.(entry.row,node,event);};
  node.onkeydown=event=>{if(event.key==='ContextMenu'||event.key==='F10'&&event.shiftKey){event.preventDefault();onMenu?.(entry.row,node,event);}};
  byNode.set(node,entry);observer?.observe(node);return entry;
 };
 const patch=(entry,row,state)=>{
  entry.row=row;
  const signature=JSON.stringify([row.title,row.status,state,row.workspaceName,row.projectName,row.archivedAt,
   row.destinationName,row.hostLabel,row.hostName,row.provider,row.model,row.reasoningEffort,row.serviceTier,activityAt(row),
   row.cached?[row.lastSyncAt,row.ownerObservedAt]:null,row.operation,row.lifecycleSupported]);
  if(entry.signature===signature)return;
  entry.signature=signature;
  const {node,fields}=entry;
  const title=row.title||'Chat';
  if(node.title!==title)node.title=title;
  if(node.dataset.status!==state)node.dataset.status=state;
  update(fields.title,title);
  update(fields.placement,[row.workspaceName,row.projectName,row.archivedAt?'Archived':''].filter(Boolean).join(' / '));
  update(fields.action,row.operation?.action||statusLabels[row.status]||'—');
  update(fields.status,state==='cached'?'Unverified':statusLabels[state]||'—');
  update(fields.computer,row.destinationName||row.hostLabel||row.hostName||row.hostId||'—');
  const model=chatRunOptions({...row,provider:row.operation?.provider||row.provider,model:row.operation?.model||row.model});
  update(fields.model,[model.provider,model.model].filter(Boolean).join(' · ')||'—');
  update(fields.options,model.detail);
  update(fields.input,value(row.operation?.inputTokens));
  update(fields.output,value(row.operation?.outputTokens));
  const when=row.cached?row.lastSyncAt:activityAt(row);
  update(fields.activity,when?(row.cached?'Last seen ':'')+time(when):'—');
  bindClock(entry);
  decorate?.(node,row);
 };
 return {
  paint(rows,{layout,limit,hasMore=false,now=Date.now()}){
   const focused=area.contains(document.activeElement)?document.activeElement:null;
   const byKey=new Map(rows.map(row=>[key(row),row]));
   const states=new Map([...byKey].map(([id,row])=>[id,operationStatus(row,now)]));
   const groupFor=id=>bucket(states.get(id));
   const signature=JSON.stringify([...byKey].map(([id,row])=>[id,groupFor(id),activityAt(row)]));
   let anchor;
   if(signature!==orderSignature){
    if(scroller.scrollTop>0&&area.dataset.layout===layout){
     for(const id of sortedKeys){
      const entry=entries.get(id);
      if(entry?.visible&&entry.node.isConnected&&byKey.has(id)){
       anchor={node:entry.node,top:entry.node.getBoundingClientRect().top};break;
      }
     }
    }
    const order=Object.fromEntries(buckets.map(({id},index)=>[id,index]));
    sortedKeys=[...byKey.keys()].sort((a,b)=>{
     const left=byKey.get(a),right=byKey.get(b);
     return order[groupFor(a)]-order[groupFor(b)]||String(activityAt(right)).localeCompare(String(activityAt(left)))||a.localeCompare(b);
    });
    orderSignature=signature;
   }
   const visible=sortedKeys.slice(0,limit).map(id=>byKey.get(id));
   const keep=new Set(visible.map(key));
   for(const [id,entry] of entries)if(!keep.has(id)){
    observer?.unobserve(entry.node);disposeRuntimeTimers(entry.node);entry.node.remove();entries.delete(id);
   }
   if(focused?.isConnected&&document.activeElement!==focused)focused.focus({preventScroll:true});
   if(area.dataset.layout!==layout)area.dataset.layout=layout;
   const counts=new Map();
   for(const id of byKey.keys())counts.set(groupFor(id),(counts.get(groupFor(id))||0)+1);
   for(const [id,{section,list,count}] of sections){
    const group=visible.filter(row=>groupFor(key(row))===id);
    section.hidden=!group.length;
    update(count,'/ '+(counts.get(id)||0));
    let cursor=list.firstElementChild;
    for(const row of group){
     const identity=key(row);
     const entry=entries.get(identity)||makeEntry();
     entries.set(identity,entry);patch(entry,row,states.get(identity));
     if(entry.node!==cursor)list.insertBefore(entry.node,cursor);
     cursor=entry.node.nextElementSibling;
    }
   }
   if(anchor?.node.isConnected)scroller.scrollTop+=anchor.node.getBoundingClientRect().top-anchor.top;
   const count=rows.length,more=count>limit||hasMore;
   area.dataset.more=String(more);
   update(summary,count?(more?`Showing ${visible.length} of ${count} · scroll for more`:`${count} ${count===1?'chat':'chats'} · end of list`):'No chats match these filters.');
  },
  dispose(){observer?.disconnect();disposeRuntimeTimers(area);entries.clear();},
 };
}
