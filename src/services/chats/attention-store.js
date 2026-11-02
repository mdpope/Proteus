import path from 'node:path';
import {atomicJSON,readJSON} from '../../shared/files.js';
import {attentionToken,needsAttention,attentionItemToken} from '../../../public/features/chats/attention-state.js';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

/** Snapshot acknowledgement is owner-local and retryable. Actual pending input,
 * approval, history and execution state are never resolved by this service. */
export class AttentionStore{
 constructor(service){this.service=service;this.file=path.join(service.home,'attention-acknowledgements.json');this.data=readJSON(this.file,{schemaVersion:1,items:{},operations:{}});if(this.data.schemaVersion!==1||!this.data.items||!this.data.operations)throw Error('Invalid attention acknowledgements; original record preserved.');this.pending=new Map();}
 save(){atomicJSON(this.file,this.data);}
 visible(items){return items.filter(item=>this.data.items[item.id]!==attentionItemToken(item));}
 snapshot(){return {chats:this.service.engine.listRuns().filter(needsAttention).map(run=>({id:run.id,token:attentionToken(run)})),items:this.service.desktopAttention().map(item=>({id:item.id,token:attentionItemToken(item)}))};}
 clearLocal(snapshot){
  if(!snapshot||!Array.isArray(snapshot.chats)||!Array.isArray(snapshot.items)||snapshot.chats.length+snapshot.items.length>20000)throw Error('Choose a captured attention snapshot.');
  let cleared=0;const now=new Date().toISOString(),runs=new Map(this.service.engine.listRuns().map(run=>[run.id,run]));
  for(const row of snapshot.chats){const run=runs.get(row.id);if(run&&row.token===attentionToken(run)){if(['failed','interrupted'].includes(run.status)&&!run.failureEventAt&&!run.turns?.at(-1)?.id)run.failureEventAt=run.updatedAt||run.createdAt;run.attentionAcknowledged={token:row.token,at:now};this.service.engine.persist(run);cleared++;}}
  const items=new Map(this.service.desktopAttention().map(item=>[item.id,item]));
  for(const row of snapshot.items){const item=items.get(row.id);if(item&&row.token===attentionItemToken(item)){this.data.items[row.id]=row.token;if(item.kind==='notification')this.service.activity.read(item.notificationId);cleared++;}}
  this.save();this.service.notify();this.service.remote.changed();
  return {cleared,remaining:this.snapshot().chats.length+this.snapshot().items.length};
 }
 clearAll(request){
  if(!uuid.test(request.operationId||''))throw Error('A stable attention-clear operation ID is required.');
  if(this.pending.has(request.operationId))return this.pending.get(request.operationId);
  const work=this.performClear(request).finally(()=>this.pending.delete(request.operationId));this.pending.set(request.operationId,work);return work;
 }
 async performClear({operationId,issuedAt}){
  let operation=this.data.operations[operationId];
  if(!operation){
   if(!Number.isFinite(Date.parse(issuedAt))||Math.abs(Date.now()-Date.parse(issuedAt))>600000)throw Error('This attention-clear request expired. Start a new clear deliberately.');
   operation=this.data.operations[operationId]={issuedAt,snapshot:this.snapshot(),targets:(this.service.peers?.list()||[]).map(peer=>({hostId:peer.hostId,label:peer.label}))};this.save();
  }
  if(!operation.local){operation.local=this.clearLocal(operation.snapshot);this.save();}
  await Promise.all(operation.targets.map(async target=>{
   if(target.result||target.error&&!target.snapshot)return;
   try{
    if(!target.snapshot){target.snapshot=await this.service.peers.request(target.hostId,'attention.snapshot',{}, {timeoutMs:8000});this.save();}
    target.result=await this.service.peers.request(target.hostId,'attention.clear',{snapshot:target.snapshot},{id:operationId,issuedAt:operation.issuedAt,timeoutMs:8000});delete target.error;this.save();
   }catch(error){target.error=String(error.message).slice(0,500);this.save();}
  }));
  const completed=[operation.local,...operation.targets.flatMap(target=>target.result?[target.result]:[])];
  const failures=operation.targets.filter(target=>!target.result).map(target=>({hostId:target.hostId,label:target.label,error:target.error||'Unavailable'}));
  if(!operation.targets.some(target=>target.snapshot&&!target.result)){operation.complete=true;const finished=Object.entries(this.data.operations).filter(([,value])=>value.complete);for(const [id]of finished.slice(0,-64))delete this.data.operations[id];this.save();}
  return {operationId,cleared:completed.reduce((sum,result)=>sum+result.cleared,0),remaining:completed.reduce((sum,result)=>sum+result.remaining,0),failures};
 }
}
