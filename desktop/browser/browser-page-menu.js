import {appendMenuLabel} from '../../public/shared/ui/menu-icons.js';
const percent=document.getElementById('percent'),choices=document.getElementById('choices');
function updateScale(value){percent.textContent=value+'%';percent.setAttribute('aria-label',`Page scale ${value}%. Reset to 100%`);document.getElementById('decrease').disabled=value<=25;document.getElementById('increase').disabled=value>=500;}
window.pageMenu.onUpdate(value=>{
 if(value.action==='scale'){updateScale(value.percent);return;}
 if(value.action!=='init')return;document.querySelector('.scale').hidden=!Number.isFinite(value.percent);if(Number.isFinite(value.percent))updateScale(value.percent);
 for(const [key,color]of Object.entries(value.colors||{}))document.documentElement.style.setProperty('--'+key,color);
 for(const item of value.items){const button=document.createElement('button');button.type='button';button.setAttribute('role','menuitem');appendMenuLabel(button,item);button.disabled=item.enabled===false;button.onclick=()=>window.pageMenu.choose(item.id);choices.append(button);}
 (Number.isFinite(value.percent)?percent:choices.querySelector('button:not(:disabled)'))?.focus();
});
for(const direction of ['decrease','increase'])document.getElementById(direction).onclick=()=>window.pageMenu.scale(direction);
percent.onclick=()=>window.pageMenu.scale('reset');
document.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();window.pageMenu.close();}else if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();const buttons=[...document.querySelectorAll('button:not(:disabled)')],index=buttons.indexOf(document.activeElement);buttons[event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowDown'?1:buttons.length-1))%buttons.length]?.focus();}});
