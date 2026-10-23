export const previewSidebarDefaultWidth=230;
export const previewSidebarMinWidth=220;
export const previewSidebarMaxWidth=520;
export function previewSidebarBounds(viewportWidth){
 const viewport=Number.isFinite(viewportWidth)?viewportWidth:1024;
 const max=Math.min(previewSidebarMaxWidth,Math.max(80,viewport-56),Math.max(previewSidebarMinWidth,viewport-320));
 return {min:Math.min(previewSidebarMinWidth,max),max};
}
export function previewSidebarWidth(value,viewportWidth){
 const {min,max}=previewSidebarBounds(viewportWidth);
 return Math.round(Math.min(max,Math.max(min,Number.isFinite(value)?value:previewSidebarDefaultWidth)));
}

export function createPreviewSidebarLayout({enabled,appearance,collapsed,save,overlay,layout,notify}){
 let preferred=previewSidebarDefaultWidth,pending=0,sidebar=null,hovered=false,suppressed=false,internalFocus=false,open=false,nativeVisible=null;
 let drag=null,keyTimer=null,keyStart=null,saveVersion=0,restoreGrip=false;
 const body=()=>document.body;
 const syncNative=()=>{
  if(!enabled()&&nativeVisible!==true)return;
  const visible=enabled()&&(open||!!drag);if(visible===nativeVisible)return;nativeVisible=visible;
  Promise.resolve(overlay(visible)).catch(error=>notify(error.message));
 };
 const apply=()=>{
  if(!enabled())return;
  const width=previewSidebarWidth(preferred,window.innerWidth),bounds=previewSidebarBounds(window.innerWidth);
  body().style.setProperty('--preview-sidebar-width',width+'px');
  const grip=sidebar?.querySelector('#preview-sidebar-resizer');
  if(grip){grip.setAttribute('aria-valuemin',bounds.min);grip.setAttribute('aria-valuemax',bounds.max);grip.setAttribute('aria-valuenow',width);grip.setAttribute('aria-valuetext',width+' pixels');}
  requestAnimationFrame(layout);
 };
 const setOpen=value=>{open=!!value&&enabled()&&collapsed();body().classList.toggle('preview-sidebar-overlay-open',open);syncNative();requestAnimationFrame(layout);};
 const updateOpen=()=>setOpen(!suppressed&&(hovered||sidebar?.contains(document.activeElement)));
 const commit=()=>{
  const width=Math.round(Math.min(previewSidebarMaxWidth,Math.max(previewSidebarMinWidth,preferred))),version=++saveVersion;
  preferred=width;pending++;
  Promise.resolve(save({sidebarWidth:width})).catch(error=>{notify(error.message);if(version===saveVersion&&!drag&&!keyTimer){preferred=appearance()?.sidebarWidth??previewSidebarDefaultWidth;apply();}}).finally(()=>pending--);
 };
 const finishDrag=cancel=>{
  if(!drag)return;const previous=drag.startWidth;drag=null;
  document.removeEventListener('pointermove',moveDrag);document.removeEventListener('pointerup',endDrag);document.removeEventListener('pointercancel',cancelDrag);
  body().classList.remove('preview-sidebar-resizing');
  if(cancel)preferred=previous;else commit();apply();updateOpen();syncNative();
 };
 const moveDrag=event=>{if(!drag||event.pointerId!==drag.pointerId)return;event.preventDefault();preferred=previewSidebarWidth(drag.startWidth+event.clientX-drag.startX,window.innerWidth);apply();};
 const endDrag=event=>{if(drag&&event.pointerId===drag.pointerId)finishDrag(false);};
 const cancelDrag=event=>{if(drag&&(!event||event.pointerId===drag.pointerId))finishDrag(true);};
 const close=({focus=false}={})=>{
  const wasOpen=open;
  suppressed=true;finishDrag(true);setOpen(false);
  if(wasOpen&&sidebar?.contains(document.activeElement)){
   internalFocus=true;
   if(focus)sidebar.querySelector('#sidebar-toggle')?.focus({preventScroll:true});else document.activeElement.blur();
   internalFocus=false;
  }
 };
 const sync=()=>{
  if(!enabled()){setOpen(false);return;}
  if(!drag&&!keyTimer&&!pending)preferred=appearance()?.sidebarWidth??previewSidebarDefaultWidth;
  if(!collapsed())setOpen(false);syncNative();apply();
 };
 const bind=()=>{
  sync();if(!enabled())return;
  const current=document.querySelector('#sidebar');
  if(sidebar!==current){
   sidebar=current;
   sidebar.addEventListener('pointerenter',()=>{hovered=true;suppressed=false;updateOpen();});
   sidebar.addEventListener('pointerleave',()=>{hovered=false;suppressed=false;if(!drag)updateOpen();});
   sidebar.addEventListener('focusin',event=>{if(internalFocus)return;if(!sidebar.contains(event.relatedTarget))suppressed=false;updateOpen();});
   sidebar.addEventListener('focusout',()=>queueMicrotask(()=>{if(!internalFocus)updateOpen();}));
   sidebar.addEventListener('click',event=>{
    if(!open)return;
    const button=event.target.closest('button,a');
    if(button&&!button.matches('#sidebar-toggle,[data-preview-engine-menu],[data-preview-workspace-expand],[data-preview-expand],[data-preview-more],[data-preview-more-chats],[data-preview-feature-more],#preview-sidebar-resizer'))close();
   },true);
  }
  const grip=document.createElement('div');grip.id='preview-sidebar-resizer';grip.tabIndex=0;grip.setAttribute('role','separator');grip.setAttribute('aria-label','Sidebar width');grip.setAttribute('aria-orientation','vertical');grip.title='Drag to resize sidebar · Left/Right arrow keys';
  sidebar.querySelector('#preview-sidebar-resizer')?.remove();sidebar.append(grip);
  grip.onpointerdown=event=>{
   if(event.button!==0||!event.isPrimary)return;event.preventDefault();clearTimeout(keyTimer);keyTimer=null;keyStart=null;
   drag={pointerId:event.pointerId,startX:event.clientX,startWidth:previewSidebarWidth(preferred,window.innerWidth)};
   body().classList.add('preview-sidebar-resizing');syncNative();
   document.addEventListener('pointermove',moveDrag,{passive:false});document.addEventListener('pointerup',endDrag);document.addEventListener('pointercancel',cancelDrag);
  };
  grip.onkeydown=event=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();
   keyStart??=preferred;const {max}=previewSidebarBounds(window.innerWidth);
   preferred=previewSidebarWidth(event.key==='Home'?previewSidebarDefaultWidth:event.key==='End'?max:previewSidebarWidth(preferred,window.innerWidth)+(event.key==='ArrowLeft'?-1:1)*(event.shiftKey?40:10),window.innerWidth);
   apply();clearTimeout(keyTimer);keyTimer=setTimeout(()=>{keyTimer=null;keyStart=null;commit();},200);
  };
  apply();if(restoreGrip){internalFocus=true;grip.focus({preventScroll:true});internalFocus=false;restoreGrip=false;}
 };
 document.addEventListener('pointerdown',event=>{if(open&&!sidebar?.contains(event.target))close();},true);
 window.addEventListener('pagehide',()=>{if(enabled())void Promise.resolve(overlay(false)).catch(()=>{});});
 window.addEventListener('resize',apply);
 window.addEventListener('blur',()=>{if(enabled())close();});
 document.addEventListener('keydown',event=>{
  if(!enabled()||event.key!=='Escape')return;
  if(drag||keyTimer){event.preventDefault();finishDrag(true);if(keyTimer){clearTimeout(keyTimer);keyTimer=null;preferred=keyStart;keyStart=null;apply();}}
  else if(open){event.preventDefault();close({focus:true});}
 });
 return {bind,sync,close,beforeRender(){restoreGrip=enabled()&&document.activeElement?.id==='preview-sidebar-resizer';}};
}
