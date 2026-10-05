// Sandboxed, isolated-world preload. No API or Node capability is exposed to pages.
const { ipcRenderer } = require('electron');
let history={back:false,forward:false}, amount=0, direction=null, timer, cooldown=0, overlay;
ipcRenderer.on('proteus:browser-history', (_event,value)=>{history=value;});
function clear() { amount=0;direction=null;overlay?.remove();overlay=null; }
function canScroll(event, delta) {
  for(const element of event.composedPath()) {
    if(!(element instanceof Element))continue;
    const style=getComputedStyle(element);
    if((element!==document.scrollingElement&&!/(auto|scroll)/.test(style.overflowX))||element.scrollWidth<=element.clientWidth+1)continue;
    // RTL horizontal scrollers use negative scrollLeft in Chromium.
    const left=element.scrollLeft, max=element.scrollWidth-element.clientWidth;
    if(style.direction==='rtl'?(delta<0?left>-max:left<0):(delta>0?left<max:left>0))return true;
  }
  return false;
}
function draw() {
  if(!overlay){overlay=document.createElement('div');overlay.style.cssText='position:fixed;inset:0;z-index:2147483647;pointer-events:none;';const shadow=overlay.attachShadow({mode:'closed'});const bubble=document.createElement('div');bubble.style.cssText='position:absolute;top:45%;width:64px;height:64px;border-radius:50%;display:grid;place-items:center;background:#edf2ec;color:#19201e;font:32px system-ui;box-shadow:0 3px 25px #0005;will-change:transform,opacity;';shadow.append(bubble);overlay.bubble=bubble;document.documentElement.append(overlay);}
  const progress=Math.min(1,Math.abs(amount)/140),back=direction==='back';overlay.bubble.textContent=back?'←':'→';overlay.bubble.style[back?'left':'right']='0';overlay.bubble.style.transform=`translateX(${(back?1:-1)*(-50+progress*68)}px) scale(${.8+progress*.2})`;overlay.bubble.style.opacity=String(.3+progress*.7);
}
window.addEventListener('wheel', event=>{
  if(event.isTrusted&&event.ctrlKey&&event.deltaY>0&&(window.visualViewport?.scale||1)<=1.01&&Date.now()>=cooldown){event.preventDefault();cooldown=Date.now()+900;ipcRenderer.send('proteus:browser-gesture','overview');return;}
  if(!event.isTrusted||event.ctrlKey||event.shiftKey||event.deltaMode!==0||Date.now()<cooldown||(window.visualViewport?.scale||1)>1.01)return;
  if(!direction) {
    if(Math.abs(event.deltaX)<3||Math.abs(event.deltaX)<Math.abs(event.deltaY)*1.5||canScroll(event,event.deltaX))return;
    direction=event.deltaX<0?'back':'forward';if(!history[direction]){direction=null;return;}
  }
  event.preventDefault();amount+=event.deltaX;draw();clearTimeout(timer);
  timer=setTimeout(()=>{
    if(Math.abs(amount)>=140&&((amount<0)===(direction==='back'))){ipcRenderer.send('proteus:browser-gesture',direction);cooldown=Date.now()+900;overlay?.animate([{opacity:1},{opacity:0}],{duration:180,fill:'forwards'});setTimeout(clear,180);}
    else {overlay?.animate([{opacity:1},{opacity:0}],{duration:150,fill:'forwards'});setTimeout(clear,150);cooldown=Date.now()+160;}
  },150);
},{capture:true,passive:false});
window.addEventListener('pagehide',()=>{clearTimeout(timer);clear();});
