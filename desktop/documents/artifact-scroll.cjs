const {randomUUID}=require('node:crypto');
const {acquireDebugger}=require('../browser/debugger-session.cjs');

function positions(value){
  if(!Array.isArray(value)||value.length>24||JSON.stringify(value).length>8192)throw Error('Invalid document scroll positions.');
  return value.map(row=>{if(!row||typeof row.path!=='string'||row.path.length>300||!/^(?:root|\d+(?:\.\d+){0,29})$/.test(row.path)||!['top','left','x','y'].every(key=>Number.isFinite(row[key]))||Math.abs(row.top)>1e9||Math.abs(row.left)>1e9||row.x<0||row.x>1||row.y<0||row.y>1)throw Error('Invalid document scroll position.');return {path:row.path,top:row.top,left:row.left,x:row.x,y:row.y};});
}
// Runs only in a dedicated isolated world inside the existing opaque srcdoc.
// The document's own world cannot reach this state or its context-bound binding.
function install(binding){
  const controller=new AbortController();let humanUntil=0,observer,resize,pending;
  const stop=()=>{pending=null;observer?.disconnect();resize?.disconnect();observer=resize=null;};
  for(const type of ['wheel','pointerdown','touchstart','keydown'])window.addEventListener(type,event=>{if(event.isTrusted){stop();humanUntil=Date.now()+2000;}},{capture:true,passive:true,signal:controller.signal});
  window.addEventListener('scroll',event=>{
    if(Date.now()>humanUntil)return;
    const node=event.target===document?document.scrollingElement:event.target;if(!(node instanceof Element)||node.closest('input,textarea,[contenteditable=true]'))return;
    let cursor=node;const path=[];if(node!==document.scrollingElement)while(cursor!==document.documentElement){const parent=cursor.parentElement;if(!parent||path.length>=30)return;path.unshift([...parent.children].indexOf(cursor));cursor=parent;}
    const key=path.length?path.join('.'):'root';globalThis[binding](JSON.stringify([{path:key,top:node.scrollTop,left:node.scrollLeft,x:Math.min(1,Math.max(0,node.scrollLeft)/Math.max(1,node.scrollWidth-node.clientWidth)),y:Math.min(1,Math.max(0,node.scrollTop)/Math.max(1,node.scrollHeight-node.clientHeight))}]));
  },{capture:true,passive:true,signal:controller.signal});
  const place=()=>{
    if(!pending)return false;let applied=0;
    for(const value of pending){let node=value.path==='root'?document.scrollingElement:document.documentElement;if(value.path!=='root')for(const index of value.path.split('.'))node=node?.children[Number(index)];if(!node||node.closest('input,textarea,[contenteditable=true]'))continue;if(value.y>0&&node.scrollHeight<=node.clientHeight||value.x>0&&node.scrollWidth<=node.clientWidth)continue;node.scrollTop=value.y*Math.max(0,node.scrollHeight-node.clientHeight);node.scrollLeft=value.x*Math.max(0,node.scrollWidth-node.clientWidth);applied++;}
    if(applied===pending.length){stop();return true;}return false;
  };
  return {apply(values){stop();humanUntil=0;pending=values;if(place())return true;observer=new MutationObserver(place);observer.observe(document.documentElement,{subtree:true,childList:true});resize=new ResizeObserver(place);resize.observe(document.documentElement);return false;},dispose(){stop();controller.abort();}};
}

class ArtifactScroll {
  constructor(contents,{current=()=>true,onScroll=()=>{}}={}){this.contents=contents;this.current=current;this.onScroll=onScroll;this.world='proteus-artifact-scroll-'+randomUUID();this.binding='proteusArtifactScroll'+randomUUID().replaceAll('-','');this.closed=false;this.installing=[];this.changed=new Map();}
  async start(){
    if(this.closed)return false;
    const wc=this.contents;this.lease=acquireDebugger(wc);this.debug=this.lease.debug;
    this.message=(_event,method,params,sessionId)=>{
      if(this.closed)return;
      if(method==='Target.attachedToTarget'&&params.targetInfo.type==='iframe'&&params.targetInfo.url==='about:srcdoc'){const work=this.prepare(params.sessionId);this.installing.push(work);work.catch(()=>{});}
      if(method!=='Runtime.bindingCalled'||this.applying||params.name!==this.binding||params.executionContextId!==this.target?.contextId||(sessionId||'')!==(this.target?.sessionId||'')||!this.current()||typeof params.payload!=='string'||params.payload.length>8192)return;
      // Script-disabled opaque frames do not run timers. Coalesce in the host;
      // only the isolated trusted-input observer can invoke this binding.
      try{for(const row of positions(JSON.parse(params.payload))){this.changed.delete(row.path);this.changed.set(row.path,row);}while(this.changed.size>24)this.changed.delete(this.changed.keys().next().value);if(this.changed.size&&!this.timer)this.timer=setTimeout(()=>{this.timer=null;const value=[...this.changed.values()];this.changed.clear();if(!this.closed&&this.current()&&this.lease?.active)this.onScroll(value);},100);}catch{}
    };
    this.destroyed=()=>void this.dispose();this.detached=()=>void this.dispose();
    wc.once('destroyed',this.destroyed);this.debug.on('message',this.message);this.debug.once('detach',this.detached);
    try{
      await this.debug.sendCommand('Target.setAutoAttach',{autoAttach:true,waitForDebuggerOnStart:false,flatten:true,filter:[{type:'iframe'},{exclude:true}]});
      const tree=await this.debug.sendCommand('Page.getFrameTree');
      if(!this.installing.length&&tree.frameTree.childFrames?.some(frame=>frame.frame.url==='about:srcdoc'))this.installing.push(this.prepare());
      await Promise.all(this.installing);if(!this.target)throw Error('The approved document frame is not ready for position sharing.');return true;
    }catch(error){await this.dispose();throw error;}
  }
  async prepare(sessionId){
    const tree=await this.debug.sendCommand('Page.getFrameTree',{},sessionId),frame=sessionId?tree.frameTree.frame:tree.frameTree.childFrames?.find(value=>value.frame.url==='about:srcdoc')?.frame;
    if(!frame||frame.url!=='about:srcdoc'||this.closed)return;
    const {executionContextId}=await this.debug.sendCommand('Page.createIsolatedWorld',{frameId:frame.id,worldName:this.world,grantUniveralAccess:false},sessionId);
    if(this.closed||!this.current()||!this.lease?.active)return;
    this.target={contextId:executionContextId,sessionId};
    await this.debug.sendCommand('Runtime.enable',{},sessionId);if(this.closed||!this.lease?.active)return;
    await this.debug.sendCommand('Runtime.addBinding',{name:this.binding,executionContextId},sessionId);if(this.closed||!this.lease?.active)return;
    const result=await this.debug.sendCommand('Runtime.evaluate',{contextId:executionContextId,expression:`globalThis.__proteusArtifactPosition=(${install.toString()})(${JSON.stringify(this.binding)})`,returnByValue:false},sessionId);
    if(result.exceptionDetails)throw Error('Document position observer could not be installed.');
  }
  async apply(value){
    const clean=positions(value);if(this.closed||!this.target||!this.current()||!this.lease?.active)return false;
    clearTimeout(this.timer);this.timer=null;this.changed.clear();const target=this.target;
    this.applying=(this.applying||0)+1;
    try{const result=await this.debug.sendCommand('Runtime.evaluate',{contextId:target.contextId,expression:`globalThis.__proteusArtifactPosition.apply(${JSON.stringify(clean)})`,returnByValue:true},target.sessionId);return !this.closed&&this.current()&&!result.exceptionDetails&&result.result?.value===true;}
    finally{this.applying--;clearTimeout(this.timer);this.timer=null;this.changed.clear();}
  }
  async dispose(){
    if(this.closed)return;this.closed=true;clearTimeout(this.timer);this.timer=null;this.changed.clear();const wc=this.contents;if(this.destroyed)wc.removeListener('destroyed',this.destroyed);if(this.message)this.debug?.removeListener('message',this.message);if(this.detached)this.debug?.removeListener('detach',this.detached);
    try{if(this.target&&this.lease?.active&&!wc.isDestroyed())await this.debug.sendCommand('Runtime.evaluate',{contextId:this.target.contextId,expression:'globalThis.__proteusArtifactPosition?.dispose()'},this.target.sessionId);}catch{}finally{this.lease?.release();this.target=null;}
  }
}
module.exports={ArtifactScroll,positions};
