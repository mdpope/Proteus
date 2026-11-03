import {createHash} from 'node:crypto';
import {chatDelta} from '../chats/chat-deltas.js';

// Watch state belongs to one authenticated transport, never to the paired device
// or run. A legacy full subscriber must not promote another client's subscription.
export function setChatWatch(peer, id, mode, token) {
  const summaryOnly=mode==='summary', deltaOnly=mode==='delta';
  if(peer.runId!==id||peer.summaryOnly!==summaryOnly||peer.deltaOnly!==deltaOnly||peer.watchToken!==token){
    delete peer.runSignature;delete peer.summarySignature;delete peer.historyCursor;
  }
  peer.runId=id;peer.summaryOnly=summaryOnly;peer.deltaOnly=deltaOnly;peer.watchToken=token;
}
export function clearChatWatch(peer, id, token) {
  // A late disappearing view cannot unsubscribe the replacement view's chat.
  if(peer.runId!==id||peer.watchToken!==token)return false;
  setChatWatch(peer,null,'none');return true;
}
export function publishChatStreams(host, {summary, page}) {
  const watched=new Map();
  for(const peer of host.peers.values())if(peer.device&&peer.runId){
    const peers=watched.get(peer.runId)||[];peers.push(peer);watched.set(peer.runId,peers);
  }
  for(const id of host.runVersions?.keys()||[])if(!watched.has(id))host.runVersions.delete(id);
  for(const [id, peers] of watched){
    if(!host.service.engine.runs.has(id))continue;
    const source=host.service.engine.getRun(id), summaryPeers=peers.filter(peer=>peer.summaryOnly);
    if(summaryPeers.length){
      const value={...summary(source),version:host.runVersions?.get(id)||0},signature=JSON.stringify(value);
      const targets=new Set(summaryPeers.filter(peer=>peer.summarySignature!==signature));
      if(targets.size){host.broadcast('run.changed',value,id,peer=>targets.has(peer));for(const peer of targets)peer.summarySignature=signature;}
    }
    const pagePeers=peers.filter(peer=>!peer.summaryOnly);
    if(!pagePeers.length)continue;
    const value=page(source),signature=createHash('sha256').update(JSON.stringify({...value,observedAt:undefined})).digest('hex');
    const full=new Set(pagePeers.filter(peer=>!peer.deltaOnly&&peer.runSignature!==signature));
    if(full.size)host.broadcast('run',value,id,peer=>full.has(peer));
    for(const peer of pagePeers){
      if(peer.runSignature===signature)continue;
      if(peer.deltaOnly){
        const delta=chatDelta(source,value,peer.historyCursor);peer.historyCursor=delta.historyCursor;
        // Replaceable per-peer patches are not global journal entries. Reconnect
        // starts with chat.get's current page and a fresh bounded cursor.
        host.send(peer,{type:'event',event:'run',runId:id,data:delta,cursor:`${host.epoch}:${++host.sequence}`});
      }
      peer.runSignature=signature;
    }
  }
}
