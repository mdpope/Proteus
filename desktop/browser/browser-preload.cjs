// Sandboxed, isolated-world preload. The permission query exposes only whether
// the current website can ask. Only the host can grant permissions.
const { ipcRenderer, contextBridge } = require('electron');
// Only bounded notification text and numeric scroll metadata cross these bridges.
// The main process verifies the exact sender and origin; notifications additionally
// require the profile's saved website permission.
if(process.isMainFrame){
  // This isolated bridge exposes no callable API. Main also requires its exact
  // error document, main frame and one-use certificate token.
  window.addEventListener('click',event=>{const button=event.target?.closest?.('button[data-proteus-certificate-accept]');if(!event.isTrusted||!button||!location.href.startsWith('data:text/html'))return;const token=button.dataset.proteusCertificateAccept;if(/^[a-f0-9-]{36}$/.test(token||''))ipcRenderer.send('proteus:certificate-accept',token);},true);
  ipcRenderer.on('proteus:browser-error-colors',(_event,colors)=>{if(!location.href.startsWith('data:text/html')||!colors||!['background','text','muted','accent','border','accentText'].every(key=>/^#[a-f0-9]{6}$/i.test(colors[key]||''))||!['light','dark'].includes(colors.scheme))return;const root=document.documentElement;root.style.backgroundColor=colors.background;root.style.color=colors.text;root.style.colorScheme=colors.scheme;for(const code of document.querySelectorAll('code'))code.style.color=colors.muted;for(const button of document.querySelectorAll('a,button,summary')){button.style.backgroundColor=colors.accent;button.style.color=colors.accentText;button.style.borderColor=colors.border;}});
  let scrollGeneration=0,scrollTimer,scrollNode,suppressScrollUntil=0,humanScrollUntil=0,pendingScroll,scrollObserver,scrollFrame;
  function stopFollowScroll(){pendingScroll=null;scrollObserver?.disconnect();scrollObserver=null;cancelAnimationFrame(scrollFrame);scrollFrame=null;}
  function applyFollowScroll(){
    scrollFrame=null;const pending=pendingScroll;if(!pending)return;
    if(pending.url!==location.href){stopFollowScroll();return;}
    const remaining=[];suppressScrollUntil=Date.now()+500;
    for(const position of pending.positions){let node=document.documentElement;if(position.path!=='root')for(const index of position.path.split('.'))node=node?.children[Number(index)];
      if(!node){remaining.push(position);continue;}
      if(node.closest('input,textarea,[contenteditable=true]'))continue;
      const height=Math.max(0,node.scrollHeight-node.clientHeight),width=Math.max(0,node.scrollWidth-node.clientWidth);
      if(position.y>0&&!height||position.x>0&&!width){remaining.push(position);continue;}
      node.scrollTop=position.y*height;node.scrollLeft=position.x*width;
    }
    if(remaining.length)pending.positions=remaining;else stopFollowScroll();
  }
  function scheduleFollowScroll(){if(pendingScroll&&scrollFrame==null)scrollFrame=requestAnimationFrame(applyFollowScroll);}
  for(const type of ['wheel','pointerdown','keydown','touchstart'])window.addEventListener(type,event=>{if(event.isTrusted){stopFollowScroll();humanScrollUntil=Date.now()+2000;suppressScrollUntil=0;}},{capture:true,passive:true});
  // Scroll positions for cross-device following are sampled at most every 100 ms and read
  // just after a rendered frame, when layout is already clean, so a page that mutates while
  // it scrolls (feeds, lazy loading) is not forced into an extra synchronous layout.
  window.addEventListener('scroll',event=>{if(Date.now()<suppressScrollUntil||Date.now()>humanScrollUntil)return;scrollNode=event.target===document?document.scrollingElement:event.target;if(!(scrollNode instanceof Element)||scrollNode.closest('input,textarea,[contenteditable=true]'))return;if(scrollTimer)return;const generation=scrollGeneration;scrollTimer=setTimeout(()=>requestAnimationFrame(()=>setTimeout(()=>{if(generation!==scrollGeneration)return;scrollTimer=null;const node=scrollNode,root=document.documentElement,path=[];if(!node?.isConnected)return;let cursor=node;while(cursor!==root){const parent=cursor.parentElement;if(!parent||path.length>=30)return;let index=0;for(let sibling=cursor.previousElementSibling;sibling;sibling=sibling.previousElementSibling)index++;path.unshift(index);cursor=parent;}ipcRenderer.send('proteus:browser-scroll',[{path:path.length?path.join('.'):'root',top:node.scrollTop,left:node.scrollLeft,x:Math.max(0,node.scrollLeft)/Math.max(1,node.scrollWidth-node.clientWidth),y:Math.max(0,node.scrollTop)/Math.max(1,node.scrollHeight-node.clientHeight)}]);},0)),100);},{capture:true,passive:true});
  ipcRenderer.on('proteus:follow-scroll',(_event,value)=>{
    if(value?.url!==location.href||!Array.isArray(value.positions))return;
    stopFollowScroll();clearTimeout(scrollTimer);scrollTimer=null;scrollGeneration++;humanScrollUntil=0;
    const positions=value.positions.slice(0,24).filter(position=>position&&/^(root|[0-9]+(?:\.[0-9]+){0,30})$/.test(position.path)&&Number.isFinite(position.x)&&Number.isFinite(position.y)).map(position=>({path:position.path,x:Math.max(0,Math.min(1,position.x)),y:Math.max(0,Math.min(1,position.y))}));
    if(!positions.length)return;pendingScroll={url:value.url,positions};
    // One observer and one animation frame cover at most 24 structural targets.
    // Late application is invalidated by a new state, navigation or real input.
    scrollObserver=new MutationObserver(scheduleFollowScroll);scrollObserver.observe(document,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','hidden']});applyFollowScroll();
  });
  window.addEventListener('load',scheduleFollowScroll,true);window.addEventListener('resize',scheduleFollowScroll);
  ipcRenderer.on('proteus:gesture-reset',stopFollowScroll);
  window.addEventListener('popstate',stopFollowScroll);window.addEventListener('hashchange',stopFollowScroll);
  window.addEventListener('pagehide',()=>{clearTimeout(scrollTimer);scrollTimer=null;scrollGeneration++;stopFollowScroll();});
  let interactedAt=0;for(const type of ['pointerdown','wheel'])window.addEventListener(type,event=>{if(event.isTrusted&&Date.now()-interactedAt>=1000){interactedAt=Date.now();ipcRenderer.send('proteus:browser-interaction');}},{capture:true,passive:true});
  for(const type of ['click','keydown','submit'])window.addEventListener(type,event=>{if(event.isTrusted)ipcRenderer.send('proteus:navigation-intent');},true);
  window.addEventListener('message',event=>{if(event.source!==window)return;if(event.data?.type==='proteus-site-notification-close'){if(typeof event.data.id==='string'&&event.data.id.length<=64)ipcRenderer.send('proteus:site-notification',{close:event.data.id});return;}if(event.data?.type!=='proteus-site-notification')return;const value=event.data.value;if(!value||typeof value.title!=='string'||value.title.length>200||typeof value.body!=='string'||value.body.length>2000||typeof value.id!=='string'||value.id.length>64||value.silent!==undefined&&typeof value.silent!=='boolean'||value.renotify!==undefined&&typeof value.renotify!=='boolean')return;ipcRenderer.send('proteus:site-notification',value);});
  ipcRenderer.on('proteus:site-notification-event',(_event,value)=>window.postMessage({type:'proteus-site-notification-event',...value},location.origin));
  // Chromium may retain its last notification grant after a rule is removed.
  // The exact-origin profile rule is the authority for tab notifications.
  const notificationStates={allow:'granted',block:'denied',ask:'default'};
  let notificationState='default',notificationUpdate=0;
  const updateNotificationState=permission=>{
    if(Object.hasOwn(notificationStates,permission))notificationState=notificationStates[permission];
  };
  ipcRenderer.on('proteus:notification-permission-changed',(_event,permission)=>{notificationUpdate++;updateNotificationState(permission);});
  if(window.isSecureContext)void ipcRenderer.invoke('proteus:notification-permission-state').then(permission=>{if(!notificationUpdate)updateNotificationState(permission);}).catch(()=>{});
  contextBridge.exposeInMainWorld('__proteusNotificationPermission',()=>window.isSecureContext?notificationState:'denied');
  contextBridge.exposeInMainWorld('__proteusRequestNotification',()=>{
    if(!window.isSecureContext||notificationState!=='default'||!navigator.userActivation.isActive)return Promise.resolve(window.isSecureContext?notificationState:'denied');
    return ipcRenderer.invoke('proteus:notification-permission-request').catch(()=> 'default');
  });
  const queryCache=new Map();
  ipcRenderer.on('proteus:media-permission-changed',()=>queryCache.clear());
  if(process.argv.includes('--proteus-conference-trace')&&/(^|\.)zoom\.us$/i.test(location.hostname)){
    contextBridge.exposeInMainWorld('__proteusMediaTrace',phase=>ipcRenderer.send('proteus:conference-trace',phase));
    contextBridge.executeInMainWorld({func:()=>{
      const prototype=window.MediaDevices?.prototype;
      if(!prototype?.getUserMedia)return;
      const request=prototype.getUserMedia,trace=window.__proteusMediaTrace;
      prototype.getUserMedia=function(...args){
        trace('Web page requested devices');
        return request.apply(this,args).then(stream=>{trace('Web page received devices');return stream;},error=>{
          const known=['NotAllowedError','NotFoundError','NotReadableError','OverconstrainedError','SecurityError','AbortError'];
          trace(known.includes(error?.name)?error.name:'Other media error');
          throw error;
        });
      };
    }});
  }
  contextBridge.exposeInMainWorld('__proteusCanAskPermission',kind=>{
    if(!['microphone','camera'].includes(kind))return Promise.resolve(false);
    const now=Date.now(),cached=queryCache.get(kind);
    if(cached&&now-cached.at<1000)return cached.answer;
    const answer=ipcRenderer.invoke('proteus:site-can-request-permission',kind).catch(()=>false);
    queryCache.set(kind,{at:now,answer});
    return answer;
  });
  contextBridge.executeInMainWorld({func:()=>{
    const canAsk=window.__proteusCanAskPermission;
    const currentNotification=window.__proteusNotificationPermission;
    const requestNotification=window.__proteusRequestNotification;
    const originalQuery=window.Permissions?.prototype.query;
    if(originalQuery)window.Permissions.prototype.query=async function(descriptor){
      const status=await originalQuery.call(this,descriptor);
      const name=descriptor?.name;
      if(name!=='notifications'&&!await canAsk(name))return status;
      // Electron's boolean check cannot return "prompt". Keep the native
      // status object behind a proxy and leave the capture request untouched.
      return new Proxy(status,{
        get(target,key){
          const value=Reflect.get(target,key,target);
          if(key==='state'){
            if(name==='notifications'){const state=currentNotification();return state==='default'?'prompt':state;}
            return 'prompt';
          }
          return typeof value==='function'&&key!=='constructor'?value.bind(target):value;
        },
        set(target,key,value){return Reflect.set(target,key,value,target);},
      });
    };
    const Original=window.Notification;if(!Original)return;const active=new Map();
    window.addEventListener('message',event=>{if(event.source!==window||event.data?.type!=='proteus-site-notification-event')return;const item=active.get(event.data.id);if(!item||!['click','close'].includes(event.data.kind))return;const signal=new Event(event.data.kind);item.dispatchEvent(signal);item['on'+event.data.kind]?.(signal);if(event.data.kind==='close')active.delete(event.data.id);});
    class SiteNotification extends EventTarget {
      static get permission(){return currentNotification();}
      static requestPermission(callback){
        return requestNotification().then(state=>{
          if(typeof callback==='function')callback(state);
          return state;
        });
      }
      constructor(title,options={}){super();if(currentNotification()!=='granted')throw new DOMException('Notification permission is not granted.','NotAllowedError');this.title=String(title).slice(0,200);this.body=String(options.body||'').slice(0,2000);this.tag=String(options.tag||'').slice(0,100);this.data=options.data;this.id=crypto.randomUUID();active.set(this.id,this);if(active.size>200)active.delete(active.keys().next().value);window.postMessage({type:'proteus-site-notification',value:{id:this.id,title:this.title,body:this.body,tag:this.tag,silent:options.silent===true,renotify:options.renotify===true}},location.origin);queueMicrotask(()=>{this.dispatchEvent(new Event('show'));this.onshow?.(new Event('show'));});}
      close(){active.delete(this.id);window.postMessage({type:'proteus-site-notification-close',id:this.id},location.origin);this.dispatchEvent(new Event('close'));this.onclose?.(new Event('close'));}
    }
    window.Notification=SiteNotification;
  }});
}
let history={back:false,forward:false}, amount=0, direction=null, timer, cooldown=0, overlay;
let overviewGate=null,canReopen=false,drawFrame=null;
ipcRenderer.on('proteus:pinch-boundary',(_event,value)=>{if(value.type==='gesturePinchBegin')overviewGate={started:Date.now(),last:Date.now(),delta:0,explicit:true,blocked:(window.visualViewport?.scale||1)>1.001};else{overviewGate=null;cooldown=Math.max(cooldown,Date.now()+80);}});
window.visualViewport?.addEventListener('resize',()=>{if(overviewGate&&window.visualViewport.scale>1.001)overviewGate.blocked=true;});
let hoverHost, hoverText;
function hoverStatus(url) {
  if(!url){hoverHost?.remove();hoverHost=null;hoverText=null;return;}
  if(!hoverHost){
    hoverHost=document.createElement('div');
    hoverHost.style.cssText='position:fixed;left:10px;bottom:10px;z-index:2147483647;pointer-events:none;max-width:calc(100vw - 20px);';
    const shadow=hoverHost.attachShadow({mode:'closed'});
    hoverText=document.createElement('div');
    hoverText.style.cssText='box-sizing:border-box;width:max-content;max-width:100%;padding:5px 9px;border-radius:7px;background:rgba(20,25,26,.86);color:#fff;box-shadow:0 2px 12px #0005;backdrop-filter:blur(12px);font:12px/1.35 system-ui,sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    shadow.append(hoverText);document.documentElement.append(hoverHost);
  }
  hoverText.textContent=url;
}
ipcRenderer.on('proteus:link-hover',(_event,url)=>hoverStatus(url));
ipcRenderer.on('proteus:gesture-reset',()=>{overviewGate=null;clearTimeout(timer);clear();cooldown=Date.now()+650;});
ipcRenderer.on('proteus:swipe-reopen',(_event,value)=>{canReopen=value===true;});
ipcRenderer.on('proteus:browser-history', (_event,value)=>{history=value;canReopen=value.reopen===true;});
function clear() { if(drawFrame!==null)cancelAnimationFrame(drawFrame);drawFrame=null;amount=0;direction=null;overlay?.remove();overlay=null; }
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
  const progress=Math.min(1,Math.abs(amount)/140),back=direction==='back';overlay.bubble.textContent=back?(history.back?'←':'×'):'→';overlay.bubble.style[back?'left':'right']='0';overlay.bubble.style.transform=`translateX(${(back?1:-1)*(-50+progress*68)}px) scale(${.8+progress*.2})`;overlay.bubble.style.opacity=String(.3+progress*.7);
}
// Observe gestures without making Chromium wait for the renderer on every wheel event.
// Horizontal navigation starts only at a scroll boundary; all native scrolling stays intact.
function pinchAttempt(delta){
    if(document.fullscreenElement)return;
    const now=Date.now(),scale=window.visualViewport?.scale||1;
    if(now<cooldown)return;
    if(!overviewGate||!overviewGate.explicit&&now-overviewGate.last>240)overviewGate={started:now,last:now,delta:0,blocked:scale>1.001};
    overviewGate.last=now;
    // Once zoomed during a gesture, reaching 100% cannot open overview. Only
    // a new pinch, after pinch-end (or a quiet gap), can attempt it again.
    if(scale>1.001||delta<=0)overviewGate.blocked=true;
    if(overviewGate.blocked)return;
    overviewGate.delta+=Math.abs(delta);
    if(now-overviewGate.started>=35&&overviewGate.delta>=12){overviewGate=null;cooldown=now+900;ipcRenderer.send('proteus:browser-gesture','overview');}
}
ipcRenderer.on('proteus:pinch-update',(_event,value)=>{pinchAttempt(value.direction==='out'?30:-30);});
window.addEventListener('wheel', event=>{
  if(event.isTrusted&&event.ctrlKey){
    pinchAttempt(event.deltaY);
    return;
  }
  if(document.fullscreenElement||!event.isTrusted||event.ctrlKey||event.shiftKey||event.deltaMode!==0||Date.now()<cooldown||(window.visualViewport?.scale||1)>1.01)return;
  if(!direction) {
    if(Math.abs(event.deltaX)<3||Math.abs(event.deltaX)<Math.abs(event.deltaY)*1.5||canScroll(event,event.deltaX))return;
    direction=event.deltaX<0?'back':'forward';if(direction==='forward'&&!history.forward&&!canReopen){direction=null;return;}
  }
  amount+=event.deltaX;if(drawFrame===null)drawFrame=requestAnimationFrame(()=>{drawFrame=null;draw();});clearTimeout(timer);
  timer=setTimeout(()=>{
    if(Math.abs(amount)>=140&&((amount<0)===(direction==='back'))){ipcRenderer.send('proteus:browser-gesture',direction);cooldown=Date.now()+900;overlay?.animate([{opacity:1},{opacity:0}],{duration:180,fill:'forwards'});setTimeout(clear,180);}
    else {overlay?.animate([{opacity:1},{opacity:0}],{duration:150,fill:'forwards'});setTimeout(clear,150);cooldown=Date.now()+160;}
  },150);
},{capture:true,passive:true});
window.addEventListener('pagehide',()=>{clearTimeout(timer);clear();hoverStatus('');overviewGate=null;});

// Visual feedback comes only from the trusted host's actual automation path.
let agentPointer,agentMark,agentKind;
ipcRenderer.on('proteus:agent-pointer', (_event, point) => {
  if(!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)){agentPointer?.remove();agentPointer=agentMark=null;return;}
  const field=point.kind==='field',reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!agentPointer||agentKind!==field){
    agentPointer?.remove();agentPointer=document.createElement('div');agentPointer.setAttribute('aria-hidden','true');
    agentPointer.style.cssText='position:fixed;inset:0;z-index:2147483647;pointer-events:none;';
    const shadow=agentPointer.attachShadow({mode:'closed'});agentMark=document.createElement('div');agentKind=field;
    agentMark.style.cssText='position:absolute;left:0;top:0;pointer-events:none;box-sizing:border-box;';
    if(field)agentMark.style.cssText+='border:2px solid #c7e8a4;background:#c7e8a422;border-radius:4px;';
    else {agentMark.textContent='➤';agentMark.style.cssText+='font:24px system-ui;color:#c7e8a4;text-shadow:0 1px 3px #000;';}
    shadow.append(agentMark);document.documentElement.append(agentPointer);
  }
  agentMark.style.transition=reduced||field?'none':'translate 140ms ease-out';
  agentMark.style.translate=`${point.x}px ${point.y}px`;
  if(field){agentMark.style.width=`${Math.max(0,point.width)}px`;agentMark.style.height=`${Math.max(0,point.height)}px`;}
  else {agentMark.style.transform='rotate(-35deg)';if(point.kind==='click'&&!reduced)agentMark.animate([{filter:'drop-shadow(0 0 0 #c7e8a4)'},{filter:'drop-shadow(0 0 12px #c7e8a4)'}],{duration:180});}
});
window.addEventListener('pagehide',()=>{agentPointer?.remove();agentPointer=agentMark=null;});
