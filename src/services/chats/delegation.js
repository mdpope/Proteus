import {randomUUID} from 'node:crypto';
import {permissionRuleId} from '../settings/permissions.js';
const active=new Set(['queued','running','awaiting_input']);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// Every adapter uses the same durable local task boundary. Provider, model,
// account and selected resources stay captured from the authorized parent.
export class DelegationService {
 constructor(engine){this.engine=engine;}
 children(id){return [...this.engine.runs.values()].filter(run=>run.delegation?.parentRunId===id);}
 current(parent){const slot=this.engine.running.get(parent.id);return !!slot&&!slot.controller.signal.aborted&&active.has(parent.status);}
 summary(child){return {id:child.id,name:child.title,provider:child.schedule.provider,status:child.status,startedAt:child.createdAt,observedAt:child.updatedAt,task:child.schedule.prompt,source:'Proteus delegated task',transcriptAvailable:true,eventCount:child.events.length,eventRevision:child.liveRevision||0,parentNativeId:child.delegation.parentRunId};}
 async handle(parentID,args){
  const parent=this.engine.getRun(parentID),children=this.children(parentID);
  if(!this.current(parent))throw Error('Delegation belongs to an ended parent turn.');
  if(args.action==='list')return {agents:children.map(child=>this.summary(child))};
  if(args.action==='spawn'){
   if(!uuid.test(args.operationId||'')||typeof args.prompt!=='string'||!args.prompt.trim()||args.prompt.length>100000)throw Error('A stable UUID operationId and a task of at most 100,000 characters are required.');
   const digest=permissionRuleId({prompt:args.prompt,name:args.name||''}),prior=children.find(child=>child.delegation.operationId===args.operationId);
   if(prior){if(prior.delegation.digest!==digest)throw Error('Delegation operationId already has different task content.');return this.summary(prior);}
   if(children.filter(child=>active.has(child.status)).length>=3||children.length>=32)throw Error('This parent supports at most three active and 32 retained delegated tasks.');
   let ancestor=parent,depth=0;while(ancestor.delegation){if(++depth>=3)throw Error('Delegation nesting limit reached.');ancestor=this.engine.getRun(ancestor.delegation.parentRunId);}
   const profile=structuredClone(this.engine.describePermissions(parent)),turnID=parent.turns?.at(-1)?.id||null;
   const schedule={...structuredClone(parent.schedule),id:'agent-'+randomUUID(),name:String(args.name||'Delegated task').slice(0,200),prompt:args.prompt,chatTitleManual:true,enabled:false};
   if(schedule.context)schedule.context={...schedule.context,followsWorkspace:false};
   delete schedule.contextSelection;delete schedule.ref;
   const child=this.engine.createRun(schedule,'chat',null,{deferStart:true});
   child.delegation={parentRunId:parentID,parentTurnId:turnID,operationId:args.operationId,digest,permissionProfile:profile};
   this.engine.persist(child);this.engine.startDeferredRun(child.id);this.engine.persist(parent);return this.summary(child);
  }
  const child=children.find(child=>child.id===args.agentId);if(!child)throw Error('This agent does not belong to this parent task.');
  if(args.action==='read')return this.page(parentID,child.id,args.beforeEvent);
  if(args.action==='wait'){
   const deadline=Date.now()+Math.min(25000,Math.max(0,args.timeoutMs??1000));
   while(active.has(child.status)&&this.current(parent)&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,Math.min(250,deadline-Date.now())));
   return {...this.summary(child),pending:child.pending?{type:child.pending.type,question:child.pending.question,humanApprovalRequired:child.pending.type==='permission'}:null};
  }
  throw Error('Choose spawn, list, read or wait.');
 }
 page(parentID,childID,before){const child=this.children(parentID).find(child=>child.id===childID);if(!child)throw Error('This agent does not belong to this parent task.');const end=Number.isSafeInteger(before)?Math.min(child.events.length,Math.max(0,before)):child.events.length,start=Math.max(0,end-50);return {id:child.id,liveMessages:{...(child.liveMessages||{})},events:child.events.slice(start,end),eventStart:start,eventCount:child.events.length,earlier:start||null,truncated:false};}
 stopChildren(parentID){for(const child of this.children(parentID))if(active.has(child.status))this.engine.cancel(child.id);}
}
export function delegationTools(control,runID){
 const engine=control?.service?.engine;if(!engine?.delegation||!runID)return [];
 const turn=engine.running.get(runID);
 return [{name:'proteus_agents',defer:'never',description:'Delegate authorized parts of this parent task to up to three concurrent agents on this same computer, provider, model and account, including Claude, Copilot, Codex and MTPLX. Children inherit only captured sources and applicable current permissions; they cannot approve tool requests. Use spawn with a stable UUID operationId and reuse it with identical task content after uncertain delivery. Use list/read/wait for actual status and transcript. A completed turn is not proof of an external outcome. Parent Stop ends active delegated work. Native subagents remain available where supported.',parameters:{type:'object',properties:{action:{type:'string',enum:['spawn','list','read','wait']},operationId:{type:'string'},prompt:{type:'string',maxLength:100000},name:{type:'string',maxLength:200},agentId:{type:'string'},beforeEvent:{type:'integer',minimum:0},timeoutMs:{type:'integer',minimum:0,maximum:25000}},required:['action'],additionalProperties:false},handler:async args=>{if(!turn||engine.running.get(runID)!==turn||turn.controller.signal.aborted)throw Error('This delegation tool no longer belongs to an active turn.');return JSON.stringify(await engine.delegation.handle(runID,args));}}];
}
