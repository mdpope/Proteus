// SharedWorker lifetime is scoped to the same origin and browser partition.
// No application data is stored here; the owner remains the event authority.
const ports=new Set();
let source=null;
function broadcast(value){for(const port of ports)port.postMessage(value);}
function ensureSource(){
  if(source)return;
  const stream=source=new EventSource('/api/events');
  stream.addEventListener('open',()=>{if(source===stream)broadcast({type:'state',readyState:stream.readyState});});
  stream.addEventListener('error',()=>{if(source===stream)broadcast({type:'state',readyState:stream.readyState});});
  for(const type of ['change','content-tabs','project-follow'])stream.addEventListener(type,event=>{if(source===stream)broadcast({type,data:event.data});});
}
onconnect=event=>{
  const port=event.ports[0];ports.add(port);
  port.onmessage=message=>{if(message.data?.type!=='close')return;ports.delete(port);port.close();if(!ports.size){source?.close();source=null;}};
  port.start();ensureSource();port.postMessage({type:'state',readyState:source.readyState});
};
