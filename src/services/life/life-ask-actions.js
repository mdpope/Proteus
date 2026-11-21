import path from 'node:path';
import {createHash} from 'node:crypto';
import {atomicJSON,readJSON} from '../../shared/files.js';

// Voice is input, not authentication. A protected human approval starts one
// tool-assisted continuation; every concrete tool keeps its normal permission.
export class LifeAskActions {
 constructor(host){this.host=host;this.pending=new Map();this.closed=false;}
 bound(receipt){this.host.chat.assertBound(receipt);}
 file(receipt){return path.join(this.host.store.directory(receipt.requestId),'action.json');}
 async step(receipt,proposal){
  this.bound(receipt);const {service,chat}=this.host,run=chat.existing(receipt);
  if(!run)throw Error('The original action chat is unavailable.');
  if(service.engine.running.has(run.id))return {state:'running'};
  let state=readJSON(this.file(receipt),null);
  if(!state){
   const context=service.context.get(),selectedIds=this.host.settings().actionMcpIds||[];
   if(selectedIds.some(id=>!context.entries.some(entry=>entry.id===id&&entry.kind==='mcp')))throw Error('A selected Life Ask MCP is no longer available. Review Ask settings.');
   const transcript=readJSON(path.join(this.host.store.directory(receipt.requestId),'transcript.json')).transcript;
   const prompt='The person approved this voice request for tool-assisted execution. Perform only the request below. Use the registered Proteus app tools for Life Reminders, Scratchpad and chat delegation. Those built-in tools require no workspace MCP selection. For external services, use only explicitly selected MCP servers. Each tool still requires its normal permission. Do not treat voice identity as authorization, approve another agent request, widen source grants, or claim external success without verifying it. If the target, scope or effect is ambiguous, ask a concise question before acting.\n\nOriginal voice request:\n'+transcript+'\n\nProposed action:\n'+proposal.answer;
   const schedule=await service.buildChatSchedule({provider:run.schedule.provider,model:run.schedule.model,reasoningEffort:run.schedule.reasoningEffort,workspace:run.schedule.workspace,prompt,includeDefaults:false,selectedIds,agentId:null,skillDirectories:[],mcpServers:{}});
   this.bound(receipt);
   state={status:'proposed',accountID:receipt.accountID,chatId:receipt.chatId,prompt,context:schedule.context,mcpServers:schedule.mcpServers,summary:proposal.answer,mcpNames:schedule.context.entries.filter(e=>e.kind==='mcp').map(e=>e.name),messageId:'life-action-'+receipt.requestId};
   state.digest=createHash('sha256').update(JSON.stringify(state)).digest('hex');atomicJSON(this.file(receipt),state);
  }
  if(state.accountID!==receipt.accountID||state.chatId!==receipt.chatId)throw Error('The action account or chat changed.');
  if(state.result)return {state:'completed',result:state.result};
  if(state.status==='interrupted')throw Error('The action approval was interrupted. Review the original chat.');
  if(state.status==='denied')return {state:'completed',result:{kind:'action',answer:'Cancelled. No tool-assisted action was started.',item:'',professional:false,answeredAt:state.decidedAt}};
  if(state.status==='proposed'){
   if(!this.pending.has(receipt.requestId)){
    const controller=new AbortController();this.pending.set(receipt.requestId,controller);
    const question='Allow this Life Ask request to use tools?\n\n'+state.summary+'\n\n'+(state.mcpNames.length?'Selected MCPs: '+state.mcpNames.join(', ')+'. ':'Proteus app tools only. ')+'This approval starts one continuation. Individual actions still require their own permissions.';
    void service.engine.ask(run,{type:'permission',question,details:{kind:'life-ask-action',managedApprovalRequired:true,intention:state.summary,requestId:receipt.requestId,proposalDigest:state.digest}},controller.signal).then(answer=>{
     if(this.closed)return;this.bound(receipt);
     const current=readJSON(this.file(receipt));if(current.digest!==state.digest||current.status!=='proposed')throw Error('Action proposal changed.');
     current.status=answer==='approve'?'approved':'denied';current.decidedAt=Date.now();atomicJSON(this.file(receipt),current);
     run.status='completed';service.engine.persist(run);
    }).catch(()=>{
     // Account changes and Stop invalidate the proposal. Never leave a phantom
     // running turn or silently issue a new permission request on the next tick.
     const current=readJSON(this.file(receipt),null);
     if(current?.status==='proposed'){current.status='interrupted';atomicJSON(this.file(receipt),current);}
     if(!service.engine.running.has(run.id)&&['running','awaiting_input'].includes(run.status)){run.status='interrupted';service.engine.persist(run);}
    }).finally(()=>{this.pending.delete(receipt.requestId);if(!this.closed)this.host.wake();});
   }
   return {state:'awaiting_input'};
  }
  const delivery=run.events.find(event=>event.data?.delivery?.id===state.messageId);
  if(!delivery){
   if(['running','queued','awaiting_input'].includes(run.status))return {state:run.status};
   this.bound(receipt);
   run.schedule.context=state.context;run.schedule.mcpServers=state.mcpServers;
   run.schedule.executionPermissions={mode:'ask',folders:[],rules:[],readOnlyTools:false};run.chatPermission=null;
   run.schedule.lifeAsk.actionRequestId=receipt.requestId;
   service.engine.persist(run);
   await service.engine.send(run.id,state.prompt,'queue',state.messageId,undefined,undefined,undefined,{kind:'life-ask-approved-action',requestId:receipt.requestId});
   return {state:'queued'};
  }
  if(['queued','running','awaiting_input'].includes(run.status))return {state:run.status};
  if(run.status!=='completed')throw Error('The approved action was interrupted. Review the same chat; it will not be replayed.');
  const start=run.events.indexOf(delivery)+1,nextUser=run.events.findIndex((event,index)=>index>=start&&event.role==='user');
  const events=run.events.slice(start,nextUser<0?undefined:nextUser),answer=events.findLast(e=>e.role==='assistant'&&e.data?.phase==='final')||events.findLast(e=>e.role==='assistant');
  if(!answer?.text)throw Error('The action ended without an answer.');
  state.result={kind:'action',answer:answer.text,item:'',professional:false,answeredAt:Date.parse(answer.at)};atomicJSON(this.file(receipt),state);
  return {state:'completed',result:state.result};
 }
 cancel(run){if(run.status==='cancelled')this.pending.get(run.schedule?.lifeAsk?.requestId)?.abort();}
 close(){this.closed=true;for(const controller of this.pending.values())controller.abort();this.pending.clear();}
}
