import {showContextMenu} from '../../features/workspaces/context-menu.js';
let installed=false;
// Keep select values/change events as the source of truth while rendering a
// consistently themed popup instead of platform-native provider menus.
export function installSelectMenus(){
 if(installed)return;installed=true;
 const selector='.composer-models select,.new-chat-toolbar select,#chat-provider,#provider,#schedule-provider';
 const open=async event=>{
  const select=event.target.closest?.(selector);if(!select||select.disabled||select.multiple)return;
  if(event.type==='keydown'&&!['Enter',' ','ArrowDown','ArrowUp'].includes(event.key))return;
  if(event.type==='pointerdown'&&event.button!==0)return;
  event.preventDefault();event.stopPropagation();if(select.dataset.menuOpen)return;
  select.dataset.menuOpen='true';select.focus({preventScroll:true});const rect=select.getBoundingClientRect(),options=[...select.options];select.setAttribute('aria-expanded','true');
  try{const choice=await showContextMenu({clientX:rect.left,clientY:rect.bottom,preventDefault(){},stopPropagation(){}},options.map((option,index)=>({id:String(index),label:(option.selected?'✓ ':'')+(option.label||option.textContent),enabled:!option.disabled})),()=>{},{renderer:true});if(choice!==null&&select.isConnected){const index=Number(choice);if(options[index]&&!options[index].disabled){select.selectedIndex=index;select.dispatchEvent(new Event('change',{bubbles:true}));}}}
  finally{delete select.dataset.menuOpen;select.setAttribute('aria-expanded','false');}
 };
 document.addEventListener('pointerdown',open,true);document.addEventListener('keydown',open,true);
}
