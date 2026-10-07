let openMenu;
export async function showContextMenu(event,items,toast){
  if(!items.length)return null;
  const priorFocus=document.activeElement,priorStart=priorFocus?.selectionStart,priorEnd=priorFocus?.selectionEnd,priorRange=window.getSelection()?.rangeCount?window.getSelection().getRangeAt(0).cloneRange():null;
  event.preventDefault();event.stopPropagation();openMenu?.();openMenu=null;
  if(window.desktop?.browser)return window.desktop.browser({action:'popup-menu',items:items.map(item=>({id:item.id,label:item.label,enabled:item.enabled!==false})),x:event.clientX,y:event.clientY});
  return new Promise(resolve=>{
    const menu=document.createElement('div');menu.className='proteus-context-menu';menu.setAttribute('role','menu');
    menu.innerHTML=items.map(item=>`<button role="menuitem" data-menu-choice="${item.id}" ${item.enabled===false?'disabled':''}></button>`).join('');
    [...menu.children].forEach((button,index)=>button.textContent=items[index].label);
    document.body.append(menu);menu.style.left=Math.max(4,Math.min(innerWidth-menu.offsetWidth-4,event.clientX))+'px';menu.style.top=Math.max(4,Math.min(innerHeight-menu.offsetHeight-4,event.clientY))+'px';
    const done=(id,restore=true)=>{menu.remove();document.removeEventListener('pointerdown',outside,true);document.removeEventListener('keydown',keys,true);openMenu=null;if(restore&&priorFocus?.isConnected){priorFocus.focus?.({preventScroll:true});if(Number.isInteger(priorStart))priorFocus.setSelectionRange?.(priorStart,priorEnd);else if(priorRange){const selection=window.getSelection();selection.removeAllRanges();selection.addRange(priorRange);}}resolve(id);};openMenu=()=>done(null);
    const outside=e=>{if(!menu.contains(e.target))done(null,false);};
    const keys=e=>{if(e.key==='Escape'){e.preventDefault();done(null);}else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const available=[...menu.querySelectorAll('button:not(:disabled)')];if(!available.length)return;const index=available.indexOf(document.activeElement);available[(index+(e.key==='ArrowDown'?1:available.length-1))%available.length]?.focus();}};
    document.addEventListener('pointerdown',outside,true);document.addEventListener('keydown',keys,true);
    menu.querySelectorAll('button').forEach(button=>button.onclick=()=>done(button.dataset.menuChoice));menu.querySelector('button:not(:disabled)')?.focus({preventScroll:true});
  }).catch(error=>{toast(error.message);return null;});
}
export async function copyContextText(value){if(window.desktop?.copyText)return window.desktop.copyText(value);await navigator.clipboard.writeText(value);}
