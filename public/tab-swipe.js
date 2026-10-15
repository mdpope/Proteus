// Horizontal pixel-wheel gestures from trackpads. Wait for the gesture to settle so
// momentum cannot close several tabs, and yield to genuine horizontal scrollers.
export function installTabSwipe({selection, available, navigate}) {
  let amount=0,direction=null,origin=null,timer,cooldown=0,bubble;
  const clear=()=>{amount=0;direction=null;origin=null;bubble?.remove();bubble=null;clearTimeout(timer);};
  function canScroll(event) {
    for(const element of event.composedPath()) {
      if(!(element instanceof Element))continue;
      const style=getComputedStyle(element),max=element.scrollWidth-element.clientWidth;
      if(max<=1||!/(auto|scroll)/.test(style.overflowX))continue;
      const x=element.scrollLeft;
      if(style.direction==='rtl'?(event.deltaX<0?x>-max:x<0):(event.deltaX>0?x<max:x>0))return true;
    }
    return false;
  }
  document.addEventListener('wheel',event=>{
    if(!event.isTrusted||event.deltaMode!==0||event.ctrlKey||event.shiftKey||event.altKey||event.metaKey)return;
    if(!event.target.closest('#main')||document.querySelector('dialog[open]')||event.target.closest('input,textarea,select,[contenteditable=true],.terminal-canvas,.terminal-host')){clear();return;}
    if(Date.now()<cooldown){cooldown=Date.now()+220;return;}
    if(direction&&origin!==selection()){clear();return;}
    if(!direction){
      if(Math.abs(event.deltaX)<3||Math.abs(event.deltaX)<Math.abs(event.deltaY)*1.5||canScroll(event))return;
      const next=event.deltaX<0?'back':'forward';if(!available(next))return;
      direction=next;origin=selection();
    }
    event.preventDefault();amount+=event.deltaX;clearTimeout(timer);
    bubble??=Object.assign(document.createElement('div'),{className:'tab-swipe-feedback'});
    bubble.textContent=direction==='back'?'←':'→';bubble.setAttribute('aria-hidden','true');
    bubble.style.left=direction==='back'?document.querySelector('#main').getBoundingClientRect().left+12+'px':'auto';bubble.style.right=direction==='forward'?'12px':'auto';bubble.style.opacity=String(Math.min(1,Math.abs(amount)/140));if(!bubble.isConnected)document.body.append(bubble);
    timer=setTimeout(()=>{const next=direction,valid=origin===selection()&&Math.abs(amount)>=140&&((amount<0)===(next==='back'));clear();cooldown=Date.now()+(valid?650:160);if(valid)void navigate(next);},150);
  },{passive:false});
  window.addEventListener('blur',clear);
  return {suppress:()=>{clear();cooldown=Date.now()+900;}};
}
