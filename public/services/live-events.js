// One same-origin worker owns the event stream for all desktop windows. Preserve
// the EventSource interface used by the refresh and tab-follow consumers.
export function createLiveEvents({Worker=globalThis.SharedWorker,Source=globalThis.EventSource,timeout=5000}={}) {
  if (!Worker) return new Source('/api/events');
  const events=new EventTarget(); let readyState=0, port, direct, timer, closed=false;
  const forward=(type,data)=>events.dispatchEvent(new MessageEvent(type,{data}));
  const fallback=()=>{
    if(closed||direct)return;
    clearTimeout(timer); if(port){port.postMessage({type:'close'});port.close();port=null;}
    direct=new Source('/api/events');
    for(const type of ['change','content-tabs','project-follow']) direct.addEventListener(type,event=>forward(type,event.data));
    direct.addEventListener('open',()=>{readyState=direct.readyState;});
    direct.addEventListener('error',()=>{readyState=direct.readyState;});
    readyState=direct.readyState;
  };
  try {
    const worker=new Worker('/services/live-events-worker.js',{name:'proteus-live-events-v1'});
    port=worker.port;
    worker.addEventListener('error',fallback);
    port.onmessage=event=>{
      const value=event.data;
      if(value?.type==='state'){clearTimeout(timer);readyState=value.readyState;}
      else if(['change','content-tabs','project-follow'].includes(value?.type))forward(value.type,value.data);
    };
    port.onmessageerror=fallback;port.start();
    timer=setTimeout(fallback,timeout);
  } catch { fallback(); }
  const close=()=>{if(closed)return;closed=true;clearTimeout(timer);if(port){port.postMessage({type:'close'});port.close();port=null;}direct?.close();readyState=2;};
  globalThis.addEventListener?.('pagehide',event=>{if(!event.persisted)close();});
  return {addEventListener:(...args)=>events.addEventListener(...args),removeEventListener:(...args)=>events.removeEventListener(...args),close,get readyState(){return readyState;}};
}
