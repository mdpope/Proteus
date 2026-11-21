import {markScreenshotDrag} from '../../shared/ui/screenshot-drop.js';

export function mountScreenshotTray({desktop=window.desktop,notify}) {
  if(desktop?.platform!=='darwin'||!desktop.onScreenshotShare)return;
  const root=document.createElement('div'),toggle=document.createElement('button'),panel=document.createElement('section');
  root.className='screenshot-tray';
  toggle.type='button';
  toggle.className='screenshot-tray-toggle';
  toggle.setAttribute('aria-controls','screenshot-tray-panel');
  panel.id='screenshot-tray-panel';
  panel.className='screenshot-tray-panel';
  panel.setAttribute('aria-label','Screenshots');
  panel.innerHTML='<header><strong>Screenshots</strong><button type="button" aria-label="Hide screenshot tray" title="Hide tray and keep screenshots">−</button></header><p>Drag a screenshot to a chat, folder, or Markdown editor.</p><div class="screenshot-tray-items"></div>';
  const items=panel.querySelector('.screenshot-tray-items');
  let expanded=false, latest=[];
  const setExpanded=value=>{
    expanded=value;
    panel.hidden=!expanded;
    toggle.setAttribute('aria-expanded',String(expanded));
    document.body.toggleAttribute('data-screenshot-tray-open',expanded);
  };
  const button=(label,title,action,id)=>{
    const item=document.createElement('button');
    item.type='button';item.textContent=label;item.title=title;item.setAttribute('aria-label',title);
    item.onclick=()=>void desktop.screenshotShare({action,id}).then(()=>{
      if(action==='copy')notify('Screenshot copied.');
    }).catch(error=>notify(error.message));
    return item;
  };
  const render=(next,received=false)=>{
    latest=next;
    root.hidden=!next.length;
    document.body.toggleAttribute('data-screenshot-tray-items',next.length>0);
    toggle.textContent='Screenshots '+next.length;
    const cards=next.map((item,index)=>{
      const card=document.createElement('div'),image=document.createElement('img'),actions=document.createElement('div');
      card.className='screenshot-tray-item';card.draggable=true;card.dataset.screenshotId=item.id;
      card.ondragstart=event=>markScreenshotDrag(event,item.id);
      image.src=item.preview;image.alt='Screenshot '+(next.length-index);image.draggable=false;
      actions.append(button('Copy','Copy '+image.alt.toLowerCase(),'copy',item.id),button('×','Remove '+image.alt.toLowerCase(),'remove',item.id));
      card.append(image,actions);
      return card;
    });
    items.replaceChildren(...cards);
    if(!next.length)setExpanded(false);
    else if(received)setExpanded(true);
  };
  panel.querySelector('header button').onclick=()=>{setExpanded(false);toggle.focus();};
  toggle.onclick=()=>setExpanded(!expanded);
  root.append(panel,toggle);
  root.hidden=true;
  setExpanded(false);
  document.body.append(root);
  let updated=false;
  desktop.onScreenshotShare(({items,received})=>{updated=true;render(items,received);});
  void desktop.screenshotShare({action:'list'}).then(items=>{if(!updated)render(items,items.length>0);}).catch(()=>{});
  root.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&expanded){event.stopPropagation();setExpanded(false);if(latest.length)toggle.focus();}
  });
}
