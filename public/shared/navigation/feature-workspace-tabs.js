import {addTabIcons,tabOverviewIcon,tabAddIcon} from './add-tab-menu.js';
import {bindTabEdges,revealWholeTab,installTabHints} from './tab-interactions.js';
import {browserTabIcon} from '../../features/browser/browser-icons.js';

const element=(tag,className)=>Object.assign(document.createElement(tag),{className});
const button=(title,action,className='')=>{const item=element('button',className);item.type='button';item.textContent=title;item.onclick=action;return item;};
export const tabCloseIcon='<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8"/></svg>';

export function featureTabTitle(title,icon,selected,select){
 const item=element('div','feature-content-tab'+(selected?' selected':''));
 const open=button('',select);
 const glyph=element('span','preview-tab-icon');glyph.innerHTML=icon;
 open.append(glyph,Object.assign(element('span'),{textContent:title}));
 if(selected)open.setAttribute('aria-current','page');
 item.append(open);
 return {item,open};
}

// Feature masters and resource tabs share one strip. Resource adapters retain
// their existing owner, session and access checks; closing a note tab is local.
export function createFeatureWorkspaceTabs({title,label=title+' tabs',tabs,selected,select,close,resources}){
 const bar=element('nav','feature-tab-bar feature-workspace-tabs project-tab-strip');bar.setAttribute('aria-label',label);installTabHints();
 let overview,lastSelected='master',signature='',cleanupEdges;
 const add=()=>void resources?.create({id:'browser',label:'New Tab',icon:'browser'}).then(render).catch(fail);
 // The owner supplies order, including in-place New Tab conversion. Do not
 // maintain a second ordering cache that can disagree with its placement.
 const entries=()=>[...tabs(),...(resources?.items()||[])];
 const tabIcon=row=>row.glyph||(row.icon==='browser'?browserTabIcon(row.browserInfo):'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">'+(addTabIcons[row.icon||(title==='Reminders'?'reminder':'markdown')]||addTabIcons.markdown)+'</svg>');
 const current=()=>resources?.selected()||selected();
 const fail=error=>{if(resources)resources.error(error.message);else alert(error.message);};
 function choose(row){if(row.resource)void resources.select(row.id);else{resources?.activateMaster();select(row.id);}render();}
 function drawOverview(){
  if(!overview)return;overview.replaceChildren();const heading=element('header','heading');heading.append(Object.assign(document.createElement('h2'),{textContent:title+' tabs'}),button('Done',()=>overview.close()));overview.append(heading);
  const list=element('div','feature-tab-overview');for(const row of entries()){const card=button('',()=>{overview.close();choose(row);});card.className='feature-overview-select';card.setAttribute('aria-current',row.id===current()?'page':'false');const preview=element('span','feature-overview-preview'),src=resources?.preview?.(row.id);if(src){const img=document.createElement('img');img.src=src;img.alt='';preview.append(img);}else{preview.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">'+(addTabIcons[row.icon|| (title==='Reminders'?'reminder':'markdown')]||addTabIcons.markdown)+'</svg>';}card.append(preview,Object.assign(element('strong'),{textContent:row.title}));list.append(card);}overview.append(list);
 }
 function render(){
  const rows=entries(),next=JSON.stringify([current(),rows]);
  if(signature===next)return;signature=next;
  const scroll=bar.querySelector('.feature-tab-list')?.scrollLeft||0;cleanupEdges?.();bar.replaceChildren();const list=element('div','feature-tab-list');
  list.ondblclick=event=>{if(event.button===0&&event.target===list){event.preventDefault();event.stopPropagation();add();}};
  for(const row of rows){
   const {item,open}=featureTabTitle(row.title,tabIcon(row),row.id===current(),()=>choose(row));
   item.dataset.featureTab=row.id;if(row.resource)item.dataset.tabContainer=row.id;
   open.dataset.tabHint=row.title;open.dataset.tabUrl=row.url||'';if(row.scratchId)open.dataset.scratchId=row.scratchId;if(row.reminderId)open.dataset.reminderTab=row.reminderId;
   if(row.closable){const dismiss=button('',()=>{void Promise.resolve().then(()=>row.resource?resources.close(row.id):close(row.id)).then(render).catch(fail);},'tabclose');dismiss.innerHTML=tabCloseIcon;dismiss.setAttribute('aria-label','Close '+row.title);item.append(dismiss);}list.append(item);
  }
  const actions=element('div','tab-actions');const all=button('',async()=>{if(resources?.overview){resources.overview();return;}await resources?.capturePreview?.();if(!overview){overview=element('dialog','feature-tabs-dialog');overview.onclose=()=>{overview.remove();overview=null;};document.body.append(overview);}drawOverview();overview.showModal();},'universal-tab-overview');all.innerHTML=tabOverviewIcon;all.setAttribute('aria-label',title+' tab overview');actions.append(all);
  if(resources){const create=button('',add,'universal-new-tab');create.innerHTML=tabAddIcon;create.setAttribute('aria-label','Add '+title+' tab');actions.append(create);}
  bar.append(list,actions);list.scrollLeft=scroll;cleanupEdges=bindTabEdges(list);if(lastSelected!==current())requestAnimationFrame(()=>revealWholeTab(list,[...list.children].find(node=>node.dataset.featureTab===current())));lastSelected=current();drawOverview();
 }
 resources?.subscribe(render);render();
 return {bar,render,destroy(){cleanupEdges?.();resources?.subscribe(null);overview?.close();bar.remove();}};
}
