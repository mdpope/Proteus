import {createHash} from 'node:crypto';
import {diffState} from './state-patch.js';

// Run progress changes on every provider event. It is useful within a couple of
// seconds, but it must not push a whole state snapshot to every client.
const volatileRunFields=['progress','updatedAt','lastActivityAt'];
const withoutVolatile=runs=>Array.isArray(runs)?runs.map(run=>{const copy={...run};for(const field of volatileRunFields)delete copy[field];return copy;}):runs;

/**
 * Owns how state reaches peers. A client that opts in through `sync` receives
 * versioned patches, per transport, and can skip the snapshot on a conditional
 * sync. Other clients keep receiving whole snapshots, but volatile-only changes
 * are batched. State is replaceable, so none of it enters the replay journal:
 * a 1.8 MB snapshot there evicts the lifecycle events a reconnect must replay.
 */
export class RemoteStateStream {
 constructor(host,{volatileMs=2000,legacyVolatileMs=10000,legacyMinMs=1000,now=()=>Date.now()}={}){
  Object.assign(this,{host,volatileMs,legacyVolatileMs,legacyMinMs,now});
  this.sequence=0;this.sections=new Map();this.material='';this.at=-Infinity;this.legacy={full:'',material:'',at:-Infinity};
 }
 version(){return `${this.host.epoch}:${this.sequence}`;}
 cursor(){return `${this.host.epoch}:${this.host.sequence}`;}
 peers(){return [...this.host.peers.values()].filter(peer=>peer.device);}
 fingerprint(sections,state){
  const hash=createHash('sha1'),material=createHash('sha1');
  for(const [key,json]of [...sections].sort(([a],[b])=>a<b?-1:1)){
   hash.update(key).update(json);
   material.update(key).update(key==='runs'?(JSON.stringify(withoutVolatile(state.runs))??''):json);
  }
  return {full:hash.digest('hex'),material:material.digest('hex')};
 }
 /** Publish `state` to every peer that is due. `force` commits a new version now. */
 observe(state,{force=false}={}){
  const sections=new Map();
  for(const key of Object.keys(state)){const json=JSON.stringify(state[key]);if(json!==undefined)sections.set(key,json);}
  const changed=[...new Set([...sections.keys(),...this.sections.keys()])].filter(key=>sections.get(key)!==this.sections.get(key));
  const legacyPeers=this.peers().filter(peer=>!peer.statePatch);
  if(!changed.length&&!legacyPeers.length)return;
  const fingerprint=this.fingerprint(sections,state),now=this.now();
  if(changed.length&&(force||fingerprint.material!==this.material||now-this.at>=this.volatileMs))this.commit(state,sections,changed,fingerprint,now);
  this.publishLegacy(state,legacyPeers,fingerprint,now);
 }
 commit(state,sections,changed,fingerprint,now){
  const base=this.version(),previous=this.sections;
  this.sequence++;this.sections=sections;this.material=fingerprint.material;this.at=now;
  const version=this.version(),cursor=this.cursor(),subscribed=this.peers().filter(peer=>peer.statePatch&&peer.stateVersion!==undefined);
  // A peer opting in during this sync has no version yet: its reply carries the state.
  // Every other subscriber should be at `base`. If one is not, it cannot detect that
  // from a patch it never received, so give it the whole state rather than none.
  const targets=subscribed.filter(peer=>peer.stateVersion===base),full={type:'event',event:'state',data:state,stateVersion:version,cursor};
  for(const peer of subscribed)if(peer.stateVersion!==base){this.host.send(peer,full);peer.stateVersion=version;}
  if(!targets.length)return;
  const o={},d=[];
  for(const key of changed){
   if(!sections.has(key)){d.push(key);continue;}
   if(!previous.has(key)){o[key]={v:state[key]};continue;}
   const node=diffState(JSON.parse(previous.get(key)),JSON.parse(sections.get(key)));if(node)o[key]=node;
  }
  const patch={...(Object.keys(o).length?{o}:{}),...(d.length?{d}:{})};
  const total=[...sections.values()].reduce((sum,json)=>sum+json.length,0),wasteful=JSON.stringify(patch).length>total*.6;
  for(const peer of targets){
   this.host.send(peer,wasteful?full:{type:'event',event:'state.patch',data:{base,version,patch},cursor});
   peer.stateVersion=version;
  }
 }
 publishLegacy(state,peers,{full,material},now){
  if(!peers.length||full===this.legacy.full)return;
  const elapsed=now-this.legacy.at;
  if(elapsed<(material===this.legacy.material?this.legacyVolatileMs:this.legacyMinMs))return;
  this.legacy={full,material,at:now};
  const value={type:'event',event:'state',data:state,cursor:this.cursor()};
  for(const peer of peers)this.host.send(peer,value);
 }
 /** Fields for a `sync` reply. A patch sent here precedes the reply on this transport. */
 sync(peer,args,state){
  if(args.statePatch==='v1')peer.statePatch=true;
  // A client that did not opt in gets the snapshot in this reply, as it always has.
  if(!peer.statePatch)return {state};
  const prior=peer.stateVersion;
  this.observe(state,{force:true});
  const version=this.version(),known=args.ifStateVersion;
  const current=typeof known==='string'&&(known===version||known===prior&&peer.stateVersion===version);
  peer.stateVersion=version;
  return current?{unchanged:true,stateVersion:version}:{state,stateVersion:version};
 }
}
