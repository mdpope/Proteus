// Coalesce PTY chunks without dropping bytes or restarting the owning process.
// Hidden views parse bounded batches, rather than painting for every tiny write.
export function terminalOutputBatch({write,visible,delay=setTimeout,cancel=clearTimeout,maxBytes=512*1024}){
 let chunks=[],bytes=0,timer=null,disposed=false;
 function flush(){if(timer!==null){cancel(timer);timer=null;}if(disposed||!chunks.length)return;const data=chunks.join('');chunks=[];bytes=0;write(data);}
 return {
  push(data){if(disposed||!data)return;chunks.push(data);bytes+=data.length;if(bytes>=maxBytes){flush();return;}if(timer===null)timer=delay(flush,visible()?16:250);},
  flush,
  dispose(){disposed=true;if(timer!==null)cancel(timer);timer=null;chunks=[];bytes=0;},
 };
}
