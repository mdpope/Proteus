// One bounded resolver generation per page/icon selection. Network completion
// caused by the resolver itself must not start another overlapping resolver.
class FaviconResolver {
  constructor({attempts=6,retryMs=250,timers={setTimeout,clearTimeout}}={}) {
    this.limit=attempts;this.retryMs=retryMs;this.timers=timers;this.closed=false;this.reset();
  }
  reset() {
    if(this.timer)this.timers.clearTimeout(this.timer);this.timer=null;
    this.generation={url:null,icons:[],attempts:0,pending:null,complete:false};
  }
  resolve(url,icons,callback) {
    if(this.closed)return Promise.resolve(false);
    const selected=icons.slice(0,5);let state=this.generation;
    if(state.url!==url||selected.length!==state.icons.length||selected.some((icon,i)=>icon!==state.icons[i])) {
      this.reset();state=this.generation;state.url=url;state.icons=selected;
    }
    if(state.pending)return state.pending;
    if(state.complete||state.attempts>=this.limit)return Promise.resolve(state.complete);
    if(this.timer)this.timers.clearTimeout(this.timer);this.timer=null;
    state.attempts++;
    // Install the pending hold before invoking a callback, including adapters
    // that synchronously emit another completion event from their callback.
    state.pending=Promise.resolve().then(()=>callback(()=>!this.closed&&this.generation===state)).then(value=>{
      state.complete=value===true;return state.complete;
    },()=>false).finally(()=>{
      state.pending=null;
      if(this.closed||this.generation!==state||state.complete||state.attempts>=this.limit)return;
      this.timer=this.timers.setTimeout(()=>{this.timer=null;void this.resolve(url,selected,callback);},this.retryMs);this.timer?.unref?.();
    });
    return state.pending;
  }
  close(){this.closed=true;this.reset();}
}

function finishIconResponse(responses,icons,params) {
  if(!params?.requestId||!responses)return false;
  let relevant=false;
  for(const [url,item]of responses)if(item.requestId===params.requestId&&!item.ready){item.ready=true;item.size=params.encodedDataLength;relevant ||= icons?.includes(url)===true;}
  return relevant;
}
module.exports={FaviconResolver,finishIconResponse};
