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
