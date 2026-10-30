// Repeated background failures must not extend a notice or resurrect a dismissed one.
export function createToast(element, {duration=5000, repeatWindow=10000}={}) {
  const recent=new Map(),pending=[];let timer,active=false,currentId=null,currentActions=[],currentValue;
  window.desktop?.onNoticeAction?.(async value=>{if(value.id!==currentId)return;if(value.action==='dismiss')return dismiss();const action=currentActions[value.action];if(!action)return;try{await action.run();if(currentId===value.id)dismiss();}catch(error){if(currentId===value.id)dismiss();show(error.message);}});
  element.classList.add('proteus-toast');
  element.setAttribute('popover','manual');
  const next=()=>{while(pending.length&&Date.now()-pending[0].queuedAt>Math.max(10000,duration*2))pending.shift();if(!active&&pending.length)present(pending.shift());};
  const dismiss=()=>{clearTimeout(timer);if(currentId)void window.desktop?.notice?.({action:'dismiss',id:currentId}).catch(()=>{});currentId=null;currentActions=[];currentValue=null;if(element.matches(':popover-open'))element.hidePopover();element.style.display='none';active=false;if(pending.length)queueMicrotask(next);};
  const show=value=>{
    const text=String(value?.message??value??'').replace(/^Error invoking remote method '[^']+':\s*(?:Error:\s*)?/, '');
    if(!text)return;
    const key=value?.attentionId||text,now=Date.now(),previous=recent.get(key);recent.delete(key);recent.set(key,now);
    while(recent.size>50)recent.delete(recent.keys().next().value);
    if(previous!==undefined&&now-previous<repeatWindow)return;
    if(active){if(pending.length<2)pending.push({value,text,queuedAt:now});return;}
    present({value,text,queuedAt:now});
  };
  const present=({value,text})=>{
    active=true;clearTimeout(timer);currentId=crypto.randomUUID();currentActions=value?.actions||[];currentValue=value;
    if(window.desktop?.notice){const style=getComputedStyle(document.body),palette=Object.fromEntries([['background','menu'],['text','menuText'],['border','menuBorder']].map(([key,token])=>[key,style.getPropertyValue('--palette-'+token).trim()]).filter(([,color])=>/^#[a-f0-9]{6}$/i.test(color)));void window.desktop.notice({id:currentId,message:text,actions:currentActions.map(action=>action.label),palette}).catch(()=>{});timer=setTimeout(dismiss,duration);return;}
    const message=document.createElement('span');message.textContent=text;message.setAttribute('role','status');
    const close=document.createElement('button');close.type='button';close.className='toast-dismiss';close.setAttribute('aria-label','Dismiss notification');close.textContent='×';close.onclick=dismiss;
    const id=currentId,actions=(value?.actions||[]).map(action=>{const button=document.createElement('button');button.type='button';button.className='toast-action';button.textContent=action.label;button.onclick=async()=>{button.disabled=true;try{await action.run();if(currentId===id)dismiss();}catch(error){if(currentId===id)dismiss();show(error.message);}finally{button.disabled=false;}};return button;});
    const modal=document.querySelector('dialog[open]');(modal||document.body).append(element);
    element.replaceChildren(message,...actions,close);element.style.display='flex';if(!element.matches(':popover-open'))element.showPopover();timer=setTimeout(dismiss,duration);
  };
  element.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();dismiss();}});
  const remove=predicate=>{for(let index=pending.length-1;index>=0;index--)if(predicate(pending[index].value))pending.splice(index,1);if(active&&predicate(currentValue))dismiss();};
  show.clearAttention=()=>remove(value=>!!value?.attentionId);
  show.reconcileAttention=ids=>remove(value=>value?.attentionId&&!ids.has(value.attentionId));
  document.addEventListener('proteus-clear-attention',show.clearAttention);
  show.dismiss=dismiss;return show;
}
