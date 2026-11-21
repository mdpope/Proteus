import {filterNotifications,notificationCategories} from './attention-state.js';
import {toggleOperationFilter} from './operations-list.js';

const pageSize=60;
export const notificationFilters=()=>({query:'',categories:[],hosts:[],limit:pageSize});

function element(tag,text,className){
 const node=document.createElement(tag);
 if(text)node.textContent=text;
 if(className)node.className=className;
 return node;
}
function button(label,action){
 const control=element('button',label);
 control.type='button';control.onclick=action;
 return control;
}

export function mountAttentionTabs(target,{selected,count,change,actions=[],heading=selected==='notifications'}){
 const section=element('div','','chat-index-page attention-section-tabs');
 const header=element('header','','ops-topbar');
 if(heading)header.append(element('h1','Needs attention'));
 const group=element('div','','chat-type-tabs');group.setAttribute('role','group');group.setAttribute('aria-label','Needs attention');
 for(const [id,label] of [['chats','Chats'],['notifications',`Notifications · ${count}`]]){
  const control=button(label,()=>change(id));control.dataset.attentionTab=id;
  control.setAttribute('aria-pressed',String(id===selected));group.append(control);
 }
 header.append(group,...actions);section.append(header);target.prepend(section);
}
function filterButtons(group,items,selected,toggle,draw){
 const existing=new Map([...group.children].map(control=>[control.dataset.id,control]));
 const wanted=new Set();
 for(const [id,label,count] of items){
  wanted.add(id);
  let control=existing.get(id);
  if(!control){
   control=button('',()=>{toggle(id);draw();});control.dataset.id=id;
   control.append(element('span','','ops-control-label'),element('span','','ops-control-detail'));
   group.append(control);
  }
  control.setAttribute('aria-pressed',String(selected(id)));
  control.firstChild.textContent=label;
  control.lastChild.textContent=count??'';control.lastChild.hidden=count===undefined;
 }
 for(const [id,control] of existing)if(!wanted.has(id))control.remove();
}

export function mountAttentionNotifications(target,{items,filters,hosts=[],renderActions,time,focused=false}) {
 const panel=element('div','','chat-index-page attention-notification-panel');
 const controls=element('div','','ops-controls');
 const computers=element('div','','ops-computers');computers.setAttribute('role','group');computers.setAttribute('aria-label','Notification computers');
 const categories=element('div','','ops-categories');categories.setAttribute('role','group');categories.setAttribute('aria-label','Notification categories');
 if(hosts.length>1)controls.append(computers);
 controls.append(categories);
 const searchRow=element('div','','ops-search-row');
 const label=element('label','Search','ops-search');
 const input=element('input');input.type='search';input.placeholder='Search notifications…';input.value=filters.query;input.dataset.attentionSearch='';label.append(input);
 const clear=button('Clear filters',()=>{Object.assign(filters,notificationFilters());input.value='';draw();input.focus();});
 searchRow.append(label,clear);
 const summary=element('p','','chat-index-status note');summary.setAttribute('role','status');
 const cards=element('div','','attention-notifications');
 const more=button('Load more',()=>{filters.limit+=pageSize;draw();});
 panel.append(controls,searchRow,summary,cards,more);target.append(panel);
 input.oninput=()=>{filters.query=input.value;filters.limit=pageSize;draw();};
 function updateFilter(key,id){filters[key]=id==='all'?[]:toggleOperationFilter(filters[key],id);filters.limit=pageSize;}
 function draw(){
  const {rows,total,counts}=filterNotifications(items,filters);
  filterButtons(categories,[['all','All',total],...notificationCategories.map(([id,name])=>[id,name,counts[id]||0])],
   id=>id==='all'?!filters.categories.length:filters.categories.includes(id),id=>updateFilter('categories',id),draw);
  if(hosts.length>1)filterButtons(computers,[['all','All computers'],...hosts.map(host=>[host.id,host.label])],
   id=>id==='all'?!filters.hosts.length:filters.hosts.includes(id),id=>updateFilter('hosts',id),draw);
  clear.disabled=!filters.query&&!filters.hosts.length&&!filters.categories.length;
  summary.textContent=rows.length?`${rows.length} ${rows.length===1?'notification':'notifications'}`:items.length?'No matching notifications.':'No notifications need action.';
  const first=rows.slice(0,filters.limit);
  const fragment=document.createDocumentFragment();
  for(const {item,category,label:categoryLabel} of first){
   const card=element('section','','card attention-notification');card.id='attention-'+item.id;card.dataset.category=category;
   const heading=element('header','','attention-card-header');
   heading.append(element('h3',item.title));
   const details=[categoryLabel,item.hostLabel,item.at&&time?.(item.at)].filter(Boolean);
   heading.append(element('small',details.join(' · '),'note'));
   card.append(heading);
   if(item.body)card.append(element('p',item.body));
   renderActions(card,item);
   fragment.append(card);
  }
  cards.replaceChildren(fragment);
  more.hidden=rows.length<=first.length;
 }
 draw();
 if(focused)input.focus({preventScroll:true});
 return {reveal(id){
  if(!items.some(item=>item.id===id))return;
  Object.assign(filters,notificationFilters());input.value='';
  const index=filterNotifications(items).rows.findIndex(({item})=>item.id===id);
  filters.limit=Math.ceil((index+1)/pageSize)*pageSize;draw();
  document.getElementById('attention-'+id)?.scrollIntoView({block:'center'});
 }};
}
