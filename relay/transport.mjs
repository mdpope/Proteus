// Shared relay/desktop/browser transport ceilings. Limits bound encrypted wire
// work; they never authorize dropping histories or replaying mutations.
export const remoteTransportLimits=Object.freeze({
 packetBytes:8_000_000,
 bufferedBytes:8_000_000,
 pendingRequests:128,
 queuedSendBytes:16_000_000,
 queuedReceivePackets:128,
 queuedReceiveBytes:16_000_000,
 windowMs:10_000,
 clientWindowPackets:100,
 clientWindowBytes:32_000_000,
 hostWindowPackets:4096,
 hostWindowBytes:128_000_000,
});
export function transportBudget({packets,bytes,windowMs=remoteTransportLimits.windowMs},now=()=>Date.now()){
 let start=now(),count=0,total=0;
 return size=>{const at=now();if(at-start>=windowMs){start=at;count=0;total=0;}count++;total+=size;return count<=packets&&total<=bytes;};
}
// A pong queues behind everything already buffered in that direction, so a slow but
// healthy link can miss the ping window while it is actively draining data. Treat
// received frames and drained bytes as proof of life. A dead peer stops draining once
// the kernel send buffer fills, so it is still terminated on a later check.
export function connectionVerdict(ws){
 if(ws.alive){ws.alive=false;ws.flushedAtPing=flushedBytes(ws);return 'ping';}
 const flushed=flushedBytes(ws);
 if((ws.bufferedAmount||0)>0&&flushed>(ws.flushedAtPing??0)){ws.flushedAtPing=flushed;return 'draining';}
 return 'terminate';
}
function flushedBytes(ws){return (ws._socket?.bytesWritten||0)-(ws.bufferedAmount||0);}
