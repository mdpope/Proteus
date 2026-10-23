// Repeated background failures must not extend a notice or resurrect a dismissed one.
export function createToast(element, {duration=15000, repeatWindow=10000}={}) {
  const recent=new Map(),pending=[];let timer,active=false,currentId=null,currentActions=[];
  window.desktop?.onNoticeAction?.(async value=>{if(value.id!==currentId)return;if(value.action==='dismiss')return dismiss();const action=currentActions[value.action];if(!action)return;try{await action.run();dismiss();}catch(error){dismiss();show(error.message);}});
  element.classList.add('proteus-toast');
  element.setAttribute('popover','manual');
  const dismiss=()=>{clearTimeout(timer);if(currentId)void window.desktop?.notice?.({action:'dismiss',id:currentId}).catch(()=>{});currentId=null;currentActions=[];if(element.matches(':popover-open'))element.hidePopover();element.style.display='none';active=false;if(pending.length)queueMicrotask(()=>{if(!active&&pending.length)present(pending.shift());});};
  const show=value=>{
    const text=String(value?.message??value??'').replace(/^Error invoking remote method '[^']+':\s*(?:Error:\s*)?/, '');
    if(!text)return;
    const now=Date.now(),previous=recent.get(text);recent.delete(text);recent.set(text,now);
    while(recent.size>50)recent.delete(recent.keys().next().value);
    if(previous!==undefined&&now-previous<repeatWindow)return;
    if(active){if(pending.length<50)pending.push({value,text});return;}
    present({value,text});
  };
  const present=({value,text})=>{
    active=true;clearTimeout(timer);currentId=crypto.randomUUID();currentActions=value?.actions||[];
    if(window.desktop?.notice){void window.desktop.notice({id:currentId,message:text,actions:currentActions.map(action=>action.label)}).catch(()=>{});timer=setTimeout(dismiss,duration);return;}
    const message=document.createElement('span');message.textContent=text;message.setAttribute('role','status');
    const close=document.createElement('button');close.type='button';close.className='toast-dismiss';close.setAttribute('aria-label','Dismiss notification');close.textContent='×';close.onclick=dismiss;
    const actions=(value?.actions||[]).map(action=>{const button=document.createElement('button');button.type='button';button.className='toast-action';button.textContent=action.label;button.onclick=async()=>{button.disabled=true;try{await action.run();dismiss();}catch(error){dismiss();show(error.message);}finally{button.disabled=false;}};return button;});
    const modal=document.querySelector('dialog[open]');(modal||document.body).append(element);
    element.replaceChildren(message,...actions,close);element.style.display='flex';if(!element.matches(':popover-open'))element.showPopover();timer=setTimeout(dismiss,duration);
  };
  element.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();dismiss();}});
  show.dismiss=dismiss;return show;
}
