// One subscription for the visible owner scope. Connections carry presentation
// metadata only; navigation still uses the revision-aware content-tab service.
export function createProjectFollower({ current, read, apply, request, sync, now=Date.now, clientId=crypto.randomUUID(), onError=()=>{} }) {
  let active=null, generation=0, sequence=0, revision=0, epoch=null, signature='', timer, lease, busy=false, dirty=false, applying=false, disposed=false, intent=0,settledIntent=0, pendingEvent=null,pendingIntent=0,lastPresentation=0,seed=false;
  const unsupported=new Set();
  const key=scope=>scope?JSON.stringify([scope.hostId||'',scope.scope,scope.id]):'';
  const call=(scope,action,extra={})=>request(scope,{...scope,hostId:undefined,action,clientId,...extra});
  const identity=state=>JSON.stringify([state?.tabId,state?.childTabId,state?.page,state?.browser?.url,state?.browser?.entryId]);
  const needsSync=state=>!signature||identity(state)!==identity(JSON.parse(signature));
  // Passive descriptor changes cannot overwrite positions for the same presentation.
  // Unpublished human input still takes precedence over that remote snapshot.
  const pendingPresentation=state=>pendingEvent?.state&&identity(pendingEvent.state)===identity(state)&&pendingIntent===intent&&settledIntent===intent&&(pendingEvent.epoch!==epoch||pendingEvent.revision>revision);
  async function accept(value, scope=active, expectedIntent=intent) {
    if(disposed||expectedIntent!==intent||!scope||key(scope)!==key(active)||key(current())!==key(active)||!value?.state)return;
    if(value.epoch===epoch&&value.revision<=revision)return;
    epoch=value.epoch;revision=value.revision;
    const appliedGeneration=generation;
    const isCurrent=()=>!disposed&&appliedGeneration===generation&&expectedIntent===intent&&key(current())===key(scope)&&key(active)===key(scope)&&epoch===value.epoch&&revision===value.revision;
    applying=true;
    try { await apply(scope,value.state,{current:isCurrent});if(isCurrent()){const state=await read(scope);if(isCurrent()){signature=JSON.stringify(state);settledIntent=expectedIntent;}} }
    finally { applying=false; }
  }
  async function flush() {
    clearTimeout(timer);timer=null;if(disposed||busy||applying)return;
    busy=true;dirty=false;let workGeneration=generation;
    try {
      const scope=current();
      if(scope&&unsupported.has(key(scope)))return;
      if(key(scope)!==key(active)) {
        const old=active;active=scope;const token=++generation;revision=0;epoch=null;signature='';pendingEvent=null;seed=false;clearInterval(lease);
        workGeneration=generation;
        if(old){void call(old,'leave').catch(()=>{});await sync(old);}
        if(!scope||disposed)return;
        const before=intent;const value=await call(scope,'join');
        if(token!==generation||key(current())!==key(scope))return;
        await sync(scope);
        if(disposed||token!==generation||key(current())!==key(scope))return;
        if(before===intent&&value.state)await accept(value,scope);
        else if(!value.state){seed=true;dirty=true;}
        if(disposed||token!==generation||key(current())!==key(scope))return;
        lease=setInterval(()=>{if(disposed)return;if(key(current())!==key(active)){schedule(true);return;}const before=intent;void call(scope,'join').then(value=>{if(!disposed&&token===generation&&key(active)===key(scope)&&before===intent){pendingEvent=value;pendingIntent=before;schedule();}}).catch(error=>{if(!disposed&&token===generation)onError(error);});},15000);
      }
      if(disposed||!active||key(current())!==key(active))return;
      const readScope=active,readGeneration=generation;let readIntent=intent;
      let state=await read(readScope), next=JSON.stringify(state);
      if(disposed||readGeneration!==generation||readIntent!==intent||key(current())!==key(readScope)||key(active)!==key(readScope)){dirty=!disposed;return;}
      if(next===signature)settledIntent=readIntent;
      // Saving, hydration and layout refreshes are observations, not a person
      // taking control. Only fresh input (or the first empty-scope seed) may
      // publish a presentation. Keep the passive baseline without echoing it.
      if(next!==signature&&!pendingPresentation(state)){
        const scope=active;if(needsSync(state))await sync(scope);
        if(disposed||readGeneration!==generation||key(active)!==key(scope)||key(current())!==key(scope)){dirty=!disposed;return;}
        if(readIntent!==intent){
          // Continuous scroll can outlast descriptor I/O. Reuse that barrier
          // only for a fresh position on the same hydrated presentation.
          const hydratedIdentity=identity(state);readIntent=intent;
          state=await read(scope);next=JSON.stringify(state);
          if(disposed||readGeneration!==generation||readIntent!==intent||key(active)!==key(scope)||key(current())!==key(scope)||identity(state)!==hydratedIdentity){dirty=!disposed;return;}
        }
        // A remote event may have arrived during the awaited read or sync.
        if(!pendingPresentation(state)){
          if(seed||readIntent!==settledIntent){
            const value=await call(scope,'update',{sequence:++sequence,state});
            if(disposed||workGeneration!==generation)return;
            epoch=value.epoch;revision=Math.max(revision,value.revision);settledIntent=readIntent;seed=false;
            lastPresentation=now();
          }
          signature=next;
        }
      }
      if(pendingEvent){const value=pendingEvent,scope=active,expectedIntent=pendingIntent;pendingEvent=null;if(needsSync(value.state))await sync(scope);if(workGeneration!==generation||key(active)!==key(scope)){dirty=!disposed;return;}await accept(value,scope,expectedIntent);lastPresentation=now();}
    } catch(error) { if(disposed||workGeneration!==generation)return;dirty=false;if(/Unsupported|Unknown.*command|Unknown.*method/i.test(error.message)&&active)unsupported.add(key(active));active=null;clearInterval(lease);onError(error); }
    finally { busy=false;if(dirty&&!disposed)schedule(); }
  }
  function schedule(immediate=false){if(disposed)return;dirty=true;if(applying||busy)return;if(timer&&!immediate)return;clearTimeout(timer);timer=setTimeout(flush,immediate?60:Math.max(60,250-(now()-lastPresentation)));}
  return {
    changed:schedule,
    human(){intent++;},
    async receive(scope,value){if(key(scope)!==key(active)||key(current())!==key(active))return;pendingEvent=value;pendingIntent=intent;schedule(needsSync(value.state));},
    async refresh(scope){if(key(scope)!==key(active)||key(current())!==key(active))return;await sync(scope);},
    reconnect(hostId){for(const scope of unsupported)if(JSON.parse(scope)[0]===hostId)unsupported.delete(scope);if(active?.hostId!==hostId&&current()?.hostId!==hostId)return;generation++;active=null;clearInterval(lease);schedule(true);},
    dispose(){disposed=true;clearTimeout(timer);clearInterval(lease);if(active)void call(active,'leave').catch(()=>{});active=null;generation++;},
    get applying(){return applying;}
  };
}

// Numeric structural paths avoid transferring page text or arbitrary selectors.
export function sharedScrollPosition(root,node) {
  if(!root||!node||!(node===root||root.contains(node)))return null;
  if(node.closest?.('input,textarea,[contenteditable=true]'))return null;
  const path=[];let cursor=node;
  while(cursor!==root){const parent=cursor.parentElement;if(!parent)return null;path.unshift([...parent.children].indexOf(cursor));cursor=parent;if(path.length>30)return null;}
  return {path:path.length?path.join('.'):'root',top:node.scrollTop,left:node.scrollLeft,x:Math.max(0,node.scrollLeft)/Math.max(1,node.scrollWidth-node.clientWidth),y:Math.max(0,node.scrollTop)/Math.max(1,node.scrollHeight-node.clientHeight)};
}
export function applySharedScroll(root,positions=[]) {
  let applied=0;
  for(const value of positions){let node=root;if(value.path!=='root')for(const index of value.path.split('.'))node=node?.children[Number(index)];if(!node||node.closest?.('input,textarea,[contenteditable=true]'))continue;
    if(value.y>0&&node.scrollHeight<=node.clientHeight||value.x>0&&node.scrollWidth<=node.clientWidth)continue;
    node.scrollTop=value.y*Math.max(0,node.scrollHeight-node.clientHeight);node.scrollLeft=value.x*Math.max(0,node.scrollWidth-node.clientWidth);node.dispatchEvent(new Event('proteus:view-restored'));
    applied++;
  }
  return applied===positions.length;
}
const scrollRestorations=new WeakMap();
export function restoreSharedScroll(root,positions,current=()=>true){
  scrollRestorations.get(root)?.();let frame,stopped=false;
  const controller=new AbortController();
  const stop=()=>{if(stopped)return;stopped=true;cancelAnimationFrame(frame);observer.disconnect();controller.abort();scrollRestorations.delete(root);};
  const apply=()=>{if(!root.isConnected||!current()){stop();return;}if(applySharedScroll(root,positions))stop();};
  const observer=new MutationObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(apply);});
  scrollRestorations.set(root,stop);observer.observe(root,{childList:true,subtree:true});
  for(const type of ['wheel','pointerdown','touchstart','keydown'])root.addEventListener(type,stop,{capture:true,passive:true,signal:controller.signal});
  apply();return stop;
}
