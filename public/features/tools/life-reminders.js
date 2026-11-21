import {fitViewportColumns} from '../../shared/ui/viewport-columns.js';
import {mountDatePicker} from '../../shared/ui/date-picker.js';
import {reminderListStyle} from './reminder-list-style.js';
import {createFeatureWorkspaceTabs} from '../../shared/navigation/feature-workspace-tabs.js';
import {reminderDue,reminderWallTime} from './reminder-dates.js';
import {mountReminderImport} from './reminder-import.js';
export const reminderIcon='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 6 2 2 3-4M11 6h10M3 13h4M11 13h10M3 20h4M11 20h10"/></svg>';
// Shared desktop/website controller. Draft and retry identity stay in memory, bound to one account.
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const glyph=path=>'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="'+path+'"/></svg>';
const icons={open:glyph('M20 12a8 8 0 1 1-16 0a8 8 0 1 1 16 0'),completed:glyph('m5 12 4 4L20 5'),deleted:glyph('M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7'),save:glyph('M4 3h13l4 4v14H3V3h1M7 3v6h10V3M7 21v-8h10v8'),cancel:glyph('m9 4-5 5 5 5M4 9h10a6 6 0 0 1 0 12')};
export function mountReminders(host,options){
 const body=document.createElement('section'),master=document.createElement('section');host.classList.add('reminders-workspace');
 const tabs=new Map();let selected='master',sequence=0,disposed=false;
 const valid=()=>!disposed&&(options.isCurrent?.()??true);
 let importer;
 const masterView=mountReminderOverview(master,{...options,isCurrent:valid,onOpen:id=>void open(id),onBrowse:listId=>void open(null,listId),onImport:options.write?()=>importer.open():null});
 const navigation=createFeatureWorkspaceTabs({title:'Reminders',label:'Reminder tabs',tabs:()=>[{id:'master',title:'Reminders'},...[...tabs].map(([id,tab])=>({id,title:tab.view?.title()||'Reminders',closable:true,reminderId:tab.reminderId||id}))],selected:()=>selected,select:show,close:id=>{const tab=tabs.get(id);if(!tab.view.canClose())return;tab.view.destroy();tabs.delete(id);if(selected===id)show('master');},resources:options.contentTabs});
 const nav=navigation.bar;host.replaceChildren(nav,body);
 if(options.write)importer=mountReminderImport(host,{write:options.write,refresh:()=>masterView.refresh(),isCurrent:valid});
 function drawTabs(){navigation.render();}
 function show(id){if(!valid())return;selected=id;body.replaceChildren(id==='master'?master:tabs.get(id).host);drawTabs();void(id==='master'?masterView:tabs.get(id).view).refresh();}
 async function open(id,listId){
  if(!valid())return;if(options.onOpenRecord)return options.onOpenRecord(id,listId);const existing=id&&[...tabs].find(([,tab])=>tab.reminderId===id);if(existing){show(existing[0]);return;}
  if(tabs.size>=20){alert('Close a reminder tab before opening more.');return;}
  const key='work:'+ ++sequence,tab={host:document.createElement('section'),view:null,reminderId:id};tabs.set(key,tab);selected=key;body.replaceChildren(tab.host);
  tab.view=mountReminderWorkbench(tab.host,{...options,isCurrent:valid,selectedId:id,initialListId:listId,detailOnly:true,onTitle:drawTabs,onSelected:record=>{tab.reminderId=record.id;drawTabs();},onSaved:drawTabs});drawTabs();
 }
 body.append(master);drawTabs();void masterView.refresh();if(options.selectedId)void open(options.selectedId);
 return {bar:nav,open,refresh:()=>selected==='master'?masterView.refresh():tabs.get(selected)?.view.refresh(),destroy(){disposed=true;importer?.destroy();navigation.destroy();masterView.destroy();for(const tab of tabs.values())tab.view.destroy();}};
}
export function mountReminderWorkbench(host,{read:readBase,write,linkFor=id=>'/life/reminders?id='+id,scopes=()=>({workspaces:[],projects:[]}),scope=null,isCurrent=()=>true,selectedId=null,detailOnly=true,newReminder=false,initialListId,onOpen,onNew,onTitle=()=>{},onSelected=()=>{},onSaved=()=>{},storageKey}){
 // A hard scope (a workspace or project page) is enforced here, so no filter can reveal items outside it.
 const hard=scope?.projectId?{projectId:scope.projectId}:scope?.workspaceId?{workspaceId:scope.workspaceId}:null;
 const read=args=>hard&&args.id===undefined&&args.since===undefined?readBase({...args,...hard}):readBase(args);
 const blankDraft=listId=>({title:'',notes:'',listId,workspaceId:scope?.workspaceId||null,projectId:scope?.projectId||null,dueKind:'none',dueDate:'',dueAt:null,timeZone:data.timeZone});
 let selectionVersion=0;let data=null,query={completed:'open',sort:'due',...(initialListId?{listId:initialListId}:{})},draft=null,operation=null,busy=false,disposed=false,dirty=false,loading=false;
 let refreshAgain=false;let persistTimer,lastSnapshot,discarded=false;let statuses=new Set(['open']);
 const readPage=async()=>{
  const groups=[...(statuses.has('open')||statuses.has('completed')?[{completed:statuses.has('open')&&statuses.has('completed')?'all':statuses.has('open')?'open':'completed',deleted:false}]:[]),...(statuses.has('deleted')?[{completed:'all',deleted:true}]:[])];
  if(!groups.length){const base=await read({...query,page:1});return {...base,items:[],total:0};}
  if(groups.length===1)return read({...query,...groups[0]});
  const page=query.page||1,results=await Promise.all(groups.flatMap(group=>Array.from({length:page},(_,index)=>read({...query,...group,page:index+1}))));
  const lists=results[0].lists||[],key=row=>query.sort==='title'?row.title:query.sort==='created'?row.createdAt:query.sort==='list'?lists.find(list=>list.id===row.listId)?.name||'':row.dueDate||row.dueAt||'9999';
  const items=results.flatMap(result=>result.items).sort((a,b)=>String(key(a)).localeCompare(String(key(b)))||a.id.localeCompare(b.id));
  return {...results[0],page,total:results.filter((_,index)=>index%page===0).reduce((n,result)=>n+result.total,0),items:items.slice((page-1)*100,page*100)};
 };
 const saveDraft=()=>{clearTimeout(persistTimer);if(!storageKey||discarded)return;try{const json=JSON.stringify({query,statuses:[...statuses],draft,operation,dirty});if(json!==lastSnapshot){localStorage.setItem(storageKey,json);lastSnapshot=json;}}catch{status('The local draft could not be preserved. Keep this tab open until saved.');}};
 if(storageKey)try{const saved=JSON.parse(localStorage.getItem(storageKey)||'null');if(saved&&(!selectedId||saved.draft?.id===selectedId)){query={...query,...saved.query};statuses=new Set(saved.statuses||[saved.query?.deleted?'deleted':saved.query?.completed==='completed'?'completed':'open']);draft=saved.draft;operation=saved.operation;dirty=saved.dirty===true;}}catch{}
 const valid=()=>!disposed&&host.isConnected&&!host.closest('[hidden]')&&isCurrent();
 const option=(v,label,selected)=>'<option value="'+escape(v)+'"'+(v===selected?' selected':'')+'>'+escape(label)+'</option>';
 const status=message=>{const node=host.querySelector('[role=status]');if(node)node.textContent=message;};
 async function refresh(){
  if(!valid()||busy)return;if(loading){refreshAgain=true;return;}loading=true;
  try{const next=await readPage();if(!valid())return;data=next;
   if((selectedId||detailOnly&&draft?.id)&&!dirty&&!operation){const id=selectedId||draft.id;const detail=await read({id});if(!valid())return;draft={...detail.record};selectedId=null;operation=null;dirty=false;}
   if(newReminder&&!draft){draft=blankDraft(data.inboxId);dirty=true;}
   draw();saveDraft();onTitle();if(draft?.id)onSelected(draft);}
  catch(error){if(valid()){if(!host.querySelector('[role=status]'))host.innerHTML='<h2>Reminders</h2><p role="status"></p><button data-refresh>Retry</button>';status(error.message+' Your unsaved changes are retained.');host.querySelector('[data-refresh]')?.addEventListener('click',refresh);}}
  finally{loading=false;if(refreshAgain){refreshAgain=false;void refresh();}}
 }
 async function change(action,input){
  if(data?.readOnly)return status('This Life account has read-only access.');
  if(busy||!valid())return;if(dirty&&!['create','update'].includes(action))return status('Save or cancel unsaved reminder edits first.');busy=true;
  operation??={action,input:structuredClone(input),id:crypto.randomUUID()};
  if(JSON.stringify([operation.action,operation.input])!==JSON.stringify([action,input])){status('A previous save is unconfirmed. Retry that save or refresh before changing it.');busy=false;return;}
  saveDraft();status('Saving…');
  host.querySelectorAll('form input,form textarea,form select,form button').forEach(el=>el.disabled=true);
  try{const result=await write(action,operation.input,operation.id);if(!valid())return;operation=null;draft=result.record?.title?{...result.record}:draft;dirty=false;newReminder=false;onSaved(result.record);if(draft?.id)onSelected(draft);saveDraft();busy=false;await refresh();status('Saved.');}
  catch(error){if(valid()){
   if(error.code==='LIFE_SAVE_REJECTED'||[404,409,422].includes(error.status)){operation=null;draw();status(error.message+' The save was rejected. Correct the form, or cancel and reopen the latest record.');return;}
   status(error.message+' Save is unconfirmed. Use Retry save to check the same request.');const retry=document.createElement('button');retry.textContent='Retry save';retry.onclick=()=>change(operation.action,operation.input);host.querySelector('[role=status]')?.append(retry);
  }}
  finally{busy=false;saveDraft();}
 }
 function draw(){
  if(!valid()||!data)return;
  const lists=data.lists||[],listName=id=>lists.find(x=>x.id===id)?.name||'Inbox';
  const scopeChip=r=>{if(!r.workspaceId)return '';const known=scopes(),workspace=(known.workspaces||[]).find(x=>x.id===r.workspaceId),project=r.projectId&&(known.projects||[]).find(x=>x.id===r.projectId);return '<span class="reminder-scope-badge" title="Workspace and project">'+escape([workspace?.name||'Workspace',project?.name].filter(Boolean).join(' › '))+'</span>';};
  const listButtons=()=>[{id:'',name:'All Items'},...lists].map(row=>{const style=reminderListStyle(row.id?row:null);return '<button type="button" data-reminder-list="'+escape(row.id)+'" class="reminder-list-choice tone-'+style.tone+'" aria-current="'+((query.listId||'')===row.id?'page':'false')+'"><span class="reminder-list-icon">'+style.icon+'</span><span>'+escape(row.name)+'</span></button>';}).join('');
  host.classList.add('reminders-layout');
  host.innerHTML=('<aside class="reminder-lists"><h2>Lists</h2><nav aria-label="Reminder lists">'+listButtons()+'</nav><p class="note">One place for every next step.</p></aside><div class="reminder-main">')+'<header class="heading"><div><h2>'+escape(query.listId?listName(query.listId):'All Items')+'</h2></div><button data-refresh aria-label="Refresh reminders" title="Refresh reminders">↻</button></header>'+
   ('<details class="reminder-mobile-lists"><summary>Lists</summary><nav aria-label="Choose reminder list">'+listButtons()+'</nav></details>')+
   '<div class="actions reminder-filters"><label class="reminder-list-filter">List <select data-filter="listId">'+option('','All reminders',query.listId||'')+lists.map(x=>option(x.id,x.name,query.listId)).join('')+'</select></label>'+
   '<div class="reminder-statuses" role="group" aria-label="Status">'+['open','completed','deleted'].map(value=>'<button type="button" data-status="'+value+'" aria-label="'+value[0].toUpperCase()+value.slice(1)+'" title="'+value[0].toUpperCase()+value.slice(1)+'" aria-pressed="'+statuses.has(value)+'">'+icons[value]+'</button>').join('')+'</div>'+
   '<label>Sort <select data-filter="sort">'+[['due','Due date'],['created','Date added'],['list','List'],['title','Title']].map(([v,l])=>option(v,l,query.sort)).join('')+'</select></label>'+
   '<button data-new>New reminder</button><button data-list-new>New list</button>'+
   (query.listId&&query.listId!==data.inboxId?'<button data-list-rename>Rename list</button><button data-list-delete>Delete list (move to Inbox)</button>':'')+'</div>'+
   '<div class="life-reminder-list">'+(data.items||[]).map(r=>{
    const style=reminderListStyle(lists.find(x=>x.id===r.listId)),action=r.deletedAt?'restore':r.completedAt?'reopen':'complete',actionTitle={restore:'Restore',reopen:'Reopen',complete:'Complete'}[action];
    const due=r.dueKind==='date'?r.dueDate+' · date only':r.dueKind==='datetime'?new Intl.DateTimeFormat(undefined,{timeZone:r.timeZone,dateStyle:'medium',timeStyle:'short'}).format(new Date(r.dueAt)):'No due date';
    return '<article data-card="'+escape(r.id)+'" aria-current="'+(draft?.id===r.id?'true':'false')+'" class="reminder-card tone-'+style.tone+(r.completedAt?' completed':'')+'"><button class="reminder-completion" data-action="'+action+'" data-id="'+escape(r.id)+'" aria-label="'+actionTitle+'" title="'+actionTitle+' '+escape(r.title)+'"><span aria-hidden="true">'+(r.completedAt?'✓':r.deletedAt?'↶':'')+'</span></button><div class="reminder-card-content"><button class="reminder-title" data-edit="'+escape(r.id)+'" data-link-preview="'+escape(linkFor(r.id))+'">'+escape(r.title)+'</button>'+(r.notes?'<p class="reminder-notes">'+escape(r.notes)+'</p>':'')+'<div class="reminder-meta"><span class="reminder-list-badge">'+style.icon+escape(listName(r.listId))+'</span>'+scopeChip(r)+'<span>'+escape(due)+'</span></div></div></article>';
   }).join('')+(!(data.items||[]).length?'<div class="reminder-empty"><span aria-hidden="true">✓</span><h3>'+escape(statuses.size===1&&statuses.has('completed')?'No completed reminders':'A little room to breathe')+'</h3><p>'+escape(statuses.size===1&&statuses.has('open')?'No open reminders in this view. Change the list or Status filter to see other items.':'No reminders match these filters.')+'</p></div>':'')+'</div>'+
   '<div class="actions reminder-pagination"><button data-previous '+((data.page||1)<=1?'disabled':'')+'>Previous</button><span>'+escape(data.total)+' reminders · page '+escape(data.page||1)+'</span><button data-next '+((data.page||1)*100>=data.total?'disabled':'')+'>Next</button></div>'+'</div><aside class="reminder-detail"><p role="status" aria-live="polite"></p><div data-editor><div class="reminder-detail-empty"><h3>Choose a reminder</h3><p>Select an item to see its notes and due date, or add one to this list.</p></div></div></aside>';
  host.querySelectorAll('[data-reminder-list]').forEach(el=>el.onclick=()=>{query={...query,listId:el.dataset.reminderList,page:1};if(!query.listId)delete query.listId;void refresh();});
  host.querySelector('[data-refresh]').onclick=refresh;
  host.querySelectorAll('[data-filter]').forEach(el=>el.onchange=()=>{query={...query,[el.dataset.filter]:el.value,page:1};if(!el.value)delete query[el.dataset.filter];refresh();});
  host.querySelectorAll('[data-status]').forEach(button=>button.onclick=()=>{const value=button.dataset.status;statuses.has(value)?statuses.delete(value):statuses.add(value);query.page=1;void refresh();});
  resizeColumns();
  host.querySelector('[data-previous]').onclick=()=>{query.page=(data.page||1)-1;refresh();};
  host.querySelector('[data-next]').onclick=()=>{query.page=(data.page||1)+1;refresh();};
  host.querySelector('[data-new]').onclick=()=>{if(onNew){onNew();return;}if(operation)return status('Resolve the unconfirmed save first.');if(dirty&&!confirm('Discard unsaved reminder changes?'))return;draft=blankDraft(query.listId||data.inboxId);dirty=true;draw();saveDraft();onTitle();onSelected({id:null,title:'New reminder'});};
  host.querySelector('[data-list-new]').onclick=()=>listEditor();
  host.querySelector('[data-list-rename]')?.addEventListener('click',()=>listEditor(lists.find(x=>x.id===query.listId)));
  host.querySelector('[data-list-delete]')?.addEventListener('click',()=>{const row=lists.find(x=>x.id===query.listId);query.listId=undefined;void change('list.delete',{id:row.id,expectedRevision:row.revision});});
  host.querySelectorAll('[data-edit]').forEach(el=>el.onclick=()=>{if(onOpen){onOpen(el.dataset.edit);return;}if(operation)return status('Resolve the unconfirmed save first.');void selectReminder(el.dataset.edit);});
  host.querySelectorAll('[data-card]').forEach(card=>card.onclick=event=>{if(event.target.closest('button,a,input'))return;card.querySelector('[data-edit]').click();});
  host.querySelectorAll('[data-action]').forEach(el=>el.onclick=()=>{const r=data.items.find(r=>r.id===el.dataset.id);void change(el.dataset.action,{id:r.id,expectedRevision:r.revision});});
  if(draft){editor(lists);if(draft.deletedAt)status('This reminder was deleted. Restore it to make it active again.');}
  if(data.readOnly){host.querySelectorAll('[data-new],[data-list-new],[data-list-rename],[data-list-delete],[data-action],[data-delete],form button').forEach(button=>button.disabled=true);status('Read-only access.');}
 }
 function resizeColumns(){
  const key='proteus.reminder-columns.v2';let layout={lists:180,items:.46};
  try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved&&Number.isFinite(saved.lists)&&Number.isFinite(saved.items))layout={lists:Math.max(130,Math.min(300,saved.lists)),items:Math.max(.25,Math.min(.75,saved.items))};}catch{}
  const apply=()=>host.style.setProperty('--reminder-columns',layout.lists+'px minmax(230px,'+layout.items+'fr) minmax(260px,'+(1-layout.items)+'fr)');
  apply();
  for(const [index,selector] of ['.reminder-lists','.reminder-main'].entries()){
   const pane=host.querySelector(selector),handle=document.createElement('span');handle.className='reminder-column-resizer';handle.tabIndex=0;handle.setAttribute('role','separator');handle.setAttribute('aria-orientation','vertical');handle.setAttribute('aria-label','Resize '+(index?'items':'lists')+' column');
   const set=width=>{if(index)layout.items=Math.max(.25,Math.min(.75,width/(host.clientWidth-layout.lists)));else layout.lists=Math.max(130,Math.min(300,width,host.clientWidth-490));apply();};
   const persist=()=>localStorage.setItem(key,JSON.stringify(layout));
   handle.onpointerdown=event=>{event.preventDefault();handle.setPointerCapture(event.pointerId);const start=event.clientX,width=pane.getBoundingClientRect().width;handle.onpointermove=move=>set(width+move.clientX-start);handle.onpointerup=()=>{handle.onpointermove=null;persist();};handle.onpointercancel=()=>{handle.onpointermove=null;};};
   handle.onkeydown=event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();set(pane.getBoundingClientRect().width+(event.key==='ArrowLeft'?-16:16));persist();}};pane.append(handle);
  }
 }
 async function selectReminder(id){
  if(operation||busy)return status('Resolve the pending save before switching reminders.');
  if(dirty&&!confirm('Discard unsaved reminder changes?'))return;
  const version=++selectionVersion;try{const detail=await read({id});if(!valid()||version!==selectionVersion)return;draft={...detail.record};dirty=false;selectedId=null;newReminder=false;draw();saveDraft();onTitle();onSelected(draft);}
  catch(error){if(valid())status(error.message);}
 }
 function listEditor(row){
  if(dirty){status('Save or cancel unsaved reminder edits before managing lists.');return;}
  if(operation)return status('Resolve the unconfirmed save first.');
  host.querySelector('[data-editor]').innerHTML='<form data-list-form class="card"><label>List name <input name="name" required maxlength="200" value="'+escape(row?.name||'')+'"></label><button>Save list</button></form>';
  host.querySelector('[data-list-form]').onsubmit=e=>{e.preventDefault();void change(row?'list.update':'list.create',{name:e.target.elements.name.value,...(row?{id:row.id,expectedRevision:row.revision}:{})});};
 }
 function editor(lists){
  const r=draft;
  host.querySelector('[data-editor]').innerHTML='<form data-reminder-form class="life-form"><header class="reminder-editor-heading"><h3>'+escape(r.id?'Edit reminder':'New reminder')+'</h3><small role="status" aria-live="polite">'+(dirty?'Unsaved':'Saved')+'</small></header><label>Title <input name="title" required maxlength="500" value="'+escape(r.title)+'"></label>'+
   '<label>Notes <textarea name="notes" maxlength="10000">'+escape(r.notes)+'</textarea></label>'+
   '<label>List <select name="listId">'+lists.map(x=>option(x.id,x.name,r.listId)).join('')+'</select></label>'+
   '<div class="reminder-scope-fields"><label>Workspace <select name="workspaceId">'+option('','No workspace',r.workspaceId||'')+(scopes().workspaces||[]).map(x=>option(x.id,x.name,r.workspaceId)).join('')+'</select></label><label>Project <select name="projectId"></select></label></div>'+
   '<label>Due <select name="dueKind">'+[['none','No due date'],['date','Date only'],['datetime','Date and time']].map(([v,l])=>option(v,l,r.dueKind)).join('')+'</select></label>'+
   '<label>Date <input name="dueDate" type="date" value="'+escape(r.dueDate||'')+'"></label>'+
   '<label>Date and time <input name="dueAt" type="datetime-local" value="'+escape(r.dueWall??reminderWallTime(r.dueAt,r.timeZone||data.timeZone))+'"></label>'+
   '<input type="hidden" name="timeZone" value="'+escape(r.timeZone||data.timeZone)+'">'+
   '<p>Date only has no timed alert. Timed reminders use your account’s local time.</p><div class="actions"><button type="submit" title="Save" aria-label="Save">'+icons.save+' Save</button><button type="button" data-cancel title="Restore before edits" aria-label="Cancel edits">'+icons.cancel+'</button>'+(r.id?'<button type="button" data-delete title="Delete" aria-label="Delete">'+icons.deleted+'</button>':'')+'</div></form>';
  host.querySelector('.reminder-detail>p[role=status]')?.remove();
  const form=host.querySelector('[data-reminder-form]');
  mountDatePicker(form.elements.dueDate,{timeZone:r.timeZone||data.timeZone});
  mountDatePicker(form.elements.dueAt,{time:true,timeZone:r.timeZone||data.timeZone});
  if(r.id){const action=r.deletedAt?'restore':r.completedAt?'reopen':'complete',label={restore:'Restore',reopen:'Reopen',complete:'Complete'}[action],button=document.createElement('button');button.type='button';button.dataset.action=action;button.innerHTML=icons[action==='complete'?'completed':'cancel']+' '+label;button.title=label;button.onclick=()=>{if(dirty)return status('Save or cancel unsaved changes before changing completion.');void change(action,{id:r.id,expectedRevision:r.revision});};form.querySelector('.actions').append(button);}
  if(operation){form.querySelectorAll('input,textarea,select').forEach(control=>control.disabled=true);form.querySelector('[type=submit]').textContent='Retry same save';form.querySelector('[type=submit]').setAttribute('aria-label','Retry same save');status('A previous save is unconfirmed. Retry the same save to inspect its result.');}
  const projectChoices=()=>{const select=form.elements.projectId,workspace=form.elements.workspaceId.value;select.replaceChildren(new Option('No project',''));for(const project of (scopes().projects||[]).filter(row=>row.workspaceId===workspace))select.append(new Option(project.name,project.id));select.value=(scopes().projects||[]).some(row=>row.id===r.projectId&&row.workspaceId===workspace)?r.projectId:'';select.disabled=!workspace;};projectChoices();
  form.elements.workspaceId.addEventListener('change',()=>{r.projectId=null;projectChoices();});
  const dueFields=()=>{form.elements.dueDate.closest('label').hidden=form.elements.dueKind.value!=='date';form.elements.dueAt.closest('label').hidden=form.elements.dueKind.value!=='datetime';};dueFields();
  form.oninput=()=>{dueFields();if(operation)return;for(const name of ['title','notes','listId','workspaceId','projectId','dueKind','dueDate','dueAt','timeZone'])draft[name==='dueAt'?'dueWall':name]=['workspaceId','projectId'].includes(name)?(form.elements[name].value||null):form.elements[name].value;dirty=true;status('Unsaved');clearTimeout(persistTimer);persistTimer=setTimeout(saveDraft,700);onTitle();};
  form.onsubmit=e=>{e.preventDefault();if(operation){void change(operation.action,operation.input);return;}const values=Object.fromEntries(new FormData(form)),kind=values.dueKind;try{const due=reminderDue({dueKind:kind,dueDate:kind==='datetime'?values.dueAt.slice(0,10):values.dueDate,dueTime:values.dueAt.slice(11,16)},Date.now(),values.timeZone);void change(r.id?'update':'create',{title:values.title,notes:values.notes,listId:values.listId,workspaceId:values.workspaceId||null,projectId:values.workspaceId&&values.projectId||null,...due,...(r.id?{id:r.id,expectedRevision:r.revision}:{})});}catch(error){status(error.message);}};
  host.querySelector('[data-cancel]').onclick=()=>{if(operation)return status('Save is unconfirmed. Refresh to inspect its result before discarding this retry.');if(detailOnly&&draft?.id){dirty=false;void refresh();}else{draft=null;dirty=false;draw();saveDraft();}};
  host.querySelector('[data-delete]')?.addEventListener('click',()=>{if(dirty)return status('Save or cancel your edits before deleting.');if(confirm('Delete this reminder? It can be restored from Deleted.'))void change('delete',{id:r.id,expectedRevision:r.revision});});
 }
 const foreground=()=>{if(document.visibilityState==='visible'&&!draft&&!operation)void refresh();};
 const leaving=()=>saveDraft();window.addEventListener('pagehide',leaving);document.addEventListener('visibilitychange',foreground);
 const disposeViewport=fitViewportColumns(host);const timer=setInterval(foreground,30000);
 void refresh();
 return {refresh,open:selectReminder,title:()=>draft?.title,canClose(){if(busy||operation){status('Resolve the unconfirmed save before closing this tab.');return false;}if(dirty&&!confirm('Discard unsaved reminder changes and close this tab?'))return false;discarded=true;if(storageKey)localStorage.removeItem(storageKey);return true;},destroy(){disposeViewport();saveDraft();disposed=true;clearInterval(timer);document.removeEventListener('visibilitychange',foreground);window.removeEventListener('pagehide',leaving);}};
}

// The persistent master is a bounded dashboard, not another item editor. Counts
// come from canonical query totals; due highlights describe this loaded page.
export function mountReminderOverview(host,{read,isCurrent=()=>true,onOpen,onBrowse,onImport}){
 let disposed=false,loading=false,generation=0,refreshAgain=false;
 const valid=()=>!disposed&&host.isConnected&&isCurrent();
 async function refresh(){
  if(!valid()||loading)return;loading=true;const version=++generation;
  if(!host.children.length)host.innerHTML='<p role="status">Loading reminders…</p>';
  try{
   const [open,done]=await Promise.all([read({completed:'open',sort:'due'}),read({completed:'completed',sort:'created'})]);
   if(!valid()||version!==generation)return;
   const today=new Intl.DateTimeFormat('en-CA',{timeZone:open.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
   const date=row=>row.dueKind==='date'?row.dueDate:row.dueAt?new Intl.DateTimeFormat('en-CA',{timeZone:open.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(row.dueAt)):'';
   const due=open.items.filter(row=>date(row)),overdue=due.filter(row=>date(row)<today),todayItems=due.filter(row=>date(row)===today),upcoming=due.filter(row=>date(row)>today);
   const cards=(rows,empty)=>rows.slice(0,6).map(row=>'<button class="reminder-overview-item" data-open="'+escape(row.id)+'"><strong>'+escape(row.title)+'</strong><span>'+escape((open.lists.find(list=>list.id===row.listId)?.name||'Inbox')+' · '+(date(row)||'No due date'))+'</span></button>').join('')||'<p class="note">'+empty+'</p>';
   host.className='reminder-overview';
   host.innerHTML='<header class="heading"><div><h1>Reminders</h1><p class="muted">A clear view of what comes next.</p></div><div class="actions"><button data-browse>All Items</button><button data-refresh aria-label="Refresh reminders">↻</button></div></header><div class="reminder-summary"><button data-browse><span>Open</span><strong>'+escape(open.total)+'</strong></button><button data-browse><span>Lists</span><strong>'+open.lists.length+'</strong></button><button data-browse><span>Completed</span><strong>'+escape(done.total)+'</strong></button></div><div class="reminder-overview-grid"><section><h2>'+(overdue.length?'Needs attention':'Today')+'</h2>'+cards(overdue.length?overdue:todayItems,'Nothing due today in this view. Make space for your next step.')+'</section><section><h2>Upcoming</h2>'+cards(upcoming,'No upcoming dates in this view.')+'</section><section><h2>Lists</h2><div class="reminder-overview-lists">'+open.lists.map(list=>{const style=reminderListStyle(list);return '<button class="reminder-list-choice tone-'+style.tone+'" data-list="'+escape(list.id)+'"><span class="reminder-list-icon">'+style.icon+'</span>'+escape(list.name)+'</button>';}).join('')+'</div></section><section><h2>Next steps</h2>'+cards(open.items,'No open reminders. Add one in All Items.')+'</section></div>';
   if(onImport&&!open.readOnly){const button=document.createElement('button');button.textContent='Import reminders';button.onclick=onImport;host.querySelector('.heading .actions').prepend(button);}
   host.querySelector('[data-refresh]').onclick=refresh;host.querySelectorAll('[data-browse]').forEach(button=>button.onclick=()=>onBrowse?.());host.querySelectorAll('[data-open]').forEach(button=>button.onclick=()=>onOpen?.(button.dataset.open));host.querySelectorAll('[data-list]').forEach(button=>button.onclick=()=>onBrowse?.(button.dataset.list));
  }catch(error){if(valid()){host.innerHTML='<h1>Reminders</h1><p role="alert"></p><button>Retry</button>';host.querySelector('p').textContent=error.message;host.querySelector('button').onclick=refresh;}}
  finally{loading=false;if(refreshAgain){refreshAgain=false;void refresh();}}
 }
 return {refresh,canClose:()=>true,destroy(){disposed=true;generation++;}};
}
