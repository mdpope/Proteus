export function openContextMenu(event,items){
    event.preventDefault();
    return new Promise(resolve=>{
        const previous=document.activeElement,selection=window.getSelection()?.rangeCount?[...Array(window.getSelection().rangeCount)].map((_,i)=>window.getSelection().getRangeAt(i).cloneRange()):[],menu=document.createElement('div');menu.className='proteus-context-menu';menu.setAttribute('role','menu');
        let settled=false;const finish=(value,restore=true)=>{if(settled)return;settled=true;menu.remove();document.removeEventListener('pointerdown',outside,true);document.removeEventListener('keydown',key,true);if(restore){previous?.focus?.({preventScroll:true});const current=window.getSelection();if(current){current.removeAllRanges();for(const range of selection)current.addRange(range);}}resolve(value);};
        for(const item of items){const button=document.createElement('button');button.type='button';button.setAttribute('role','menuitem');button.textContent=item.label;button.disabled=item.enabled===false;button.onclick=()=>finish(item.id);menu.append(button);}
        document.body.append(menu);const bounds=menu.getBoundingClientRect();menu.style.left=Math.max(4,Math.min(event.clientX||0,innerWidth-bounds.width-4))+'px';menu.style.top=Math.max(4,Math.min(event.clientY||0,innerHeight-bounds.height-4))+'px';
        const outside=other=>{if(!menu.contains(other.target))finish(null,false);};
        const key=other=>{if(other.key==='Escape'){other.preventDefault();finish(null);}else if(other.key==='ArrowDown'||other.key==='ArrowUp'){other.preventDefault();const buttons=[...menu.querySelectorAll('button:not(:disabled)')],at=buttons.indexOf(document.activeElement);buttons[(at+(other.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();}};
        document.addEventListener('pointerdown',outside,true);document.addEventListener('keydown',key,true);menu.querySelector('button:not(:disabled)')?.focus({preventScroll:true});
    });
}
