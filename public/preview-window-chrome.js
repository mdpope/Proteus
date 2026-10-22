// Unified chrome shared by normal builds and the isolated design preview.
export function createWindowChrome({state,icon,overview,layout}){
 let frame;
 const sync=()=>{
  const enabled=window.desktop?.windowPreview&&!!(state.data?.workspaceProjects?.enabled||state.data?.desktopPreview?.enabled);
  document.body.classList.toggle('window-design-preview',!!enabled);if(!enabled)return;
  const tabs=document.querySelector('#tabs'),main=document.querySelector('#main');if(!tabs||!main)return;
  const word=tabs.querySelector('#topbar-home strong');if(word)word.textContent='Proteus';
  const bar=document.querySelector('#chat-subtabs')||document.querySelector('#team-subtabs');
  document.querySelector('#window-content-tabs')?.remove();
  if(!bar){requestAnimationFrame(layout);return;}
  const scope=bar.id==='team-subtabs'?'team':bar.id==='chat-subtabs'?state.tabs.find(tab=>tab.id===state.tabs.find(row=>row.id===state.tab)?.parentId)?.id||state.tabs.find(row=>row.id===state.tab)?.id:'main';
  let button=bar.querySelector('.universal-tab-overview');
  if(!button){button=document.createElement('button');button.type='button';button.className='universal-tab-overview';button.setAttribute('aria-label','Tab overview');button.title='Tab overview';button.innerHTML=icon;const target=bar.querySelector('.window-content-actions')||bar;const add=target.querySelector('details');if(add)add.before(button);else target.append(button);}
  button.onclick=()=>void overview(scope||'main');
  requestAnimationFrame(layout);
 };
 const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(sync);};
 const observer=new MutationObserver(records=>{if(records.some(record=>[...record.addedNodes,...record.removedNodes].some(node=>node.nodeType===1&&!node.matches?.('.universal-tab-overview,.universal-new-tab,#title-sidebar-toggle'))))schedule();});
 observer.observe(document.querySelector('#app'),{childList:true,subtree:true});
 return {sync,schedule};
}
