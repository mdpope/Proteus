import {managedMcpBridge} from './managed-mcp-bridge.js';

import {validateManagedRequirements,managedWorkspace} from './managed-requirements.js';
export {validateManagedRequirements};
export function mergeManagedServers(selected,managed={}){
 if(Object.keys(managed).some(name=>Object.hasOwn(selected,name)))throw Error('A selected connection also has a native MCP definition. Remove the competing definition after migration verification.');
 return {...selected,...managed};
}

// Runs own only this short-lived provider bridge. The host retains shared
// authentication/transport; closing a chat never closes another chat's lease.
export async function prepareManagedRun(manager,args){
 const {run,ask,signal,update,emit}=args,requirements=validateManagedRequirements(run.schedule.managedConnections);
 if(!requirements.length)return null;
 if(!manager)throw Error('This owner does not provide managed MCP connections.');
 const workspaceId=managedWorkspace(run.schedule);
 const bindings=[],selected=[],unavailable=[];
 for(const requirement of requirements){
  try{
   const [binding]=manager.registry.capture({ownerId:manager.registry.ownerId,workspaceId,names:[requirement.name]});
   const definition=manager.definition(binding);
   if(!requirement.capabilities.every(c=>definition.capabilities.includes(c)))throw Error('Missing semantic capability.');
   bindings.push(binding);selected.push(requirement);
  }catch{
   if(requirement.required)throw Error(`Required managed connection ${requirement.name} has no matching workspace binding or capabilities.`);
   unavailable.push({...requirement,state:'configuration-mismatch'});
   emit('system',`Optional managed connection ${requirement.name} has no matching workspace binding. Continue independent work and retain the missing evidence scope.`);
  }
 }
 // Non-secret pins participate in the permission identity. Preserve the preceding
 // turn's pins as history when explicitly starting another turn after a change.
 const prior=run.schedule.managedConnectionBindings;
 if(prior&&JSON.stringify(prior)!==JSON.stringify(bindings)){
  run.managedConnectionHistory??=[];run.managedConnectionHistory.push({bindings:structuredClone(prior),endedAt:new Date().toISOString()});
 }
 run.schedule.managedConnectionBindings=structuredClone(bindings);
 const ready=[];run.managedConnectionReadiness=unavailable;update();
 for(const [index,binding]of bindings.entries()){
  if(signal.aborted)throw Error('Cancelled');
  const answer=await ask({type:'permission',question:`Connect managed ${binding.name} for this turn?`,details:{kind:'mcp-connect',serverName:binding.name,toolName:'*',readOnly:false,intention:'Connect the captured managed binding. Each tool retains its own permission check.'}},signal);
  if(!['approve','approve-auto'].includes(answer)){
   if(selected[index].required)throw Error('A required managed connection was declined.');
   run.managedConnectionReadiness.push({...selected[index],state:'permission-denied'});update();
   emit('system',`Optional managed connection ${binding.name} was declined. Continue independent work and retain the missing evidence scope.`);continue;
  }
  let status;
  try{status=await manager.ensureReady(binding,{signal});}
  catch(error){
   if(signal.aborted||selected[index].required)throw error;
   // Transport exceptions may contain private endpoint/error text. Persist only
   // a fixed gap state; optional readiness cannot stop unrelated evidence work.
   status={name:binding.name,state:'temporarily-unavailable',reason:'Readiness check failed or timed out.'};
  }
  if(signal.aborted)throw Error('Cancelled');
  run.managedConnectionReadiness.push({...status,name:binding.name,capabilities:[...selected[index].capabilities],required:selected[index].required});update();
  if(status.state==='ready')ready.push(binding);
  else if(selected[index].required)throw Error(`Required managed connection ${binding.name} is not ready: ${status.state}.`);
  else emit('system',`Optional managed connection ${binding.name} is unavailable (${status.state}). Continue independent work and retain the missing evidence scope.`);
 }
 let active=true;
 const bridge=await managedMcpBridge(manager,{runId:run.id,bindings:ready,isActive:()=>active&&!signal.aborted,
  authorize:async request=>{
   if(!active||signal.aborted)return false;
   const answer=await ask({type:'permission',question:`Allow ${request.connection.name} ${request.tool.name}?`,details:{kind:'mcp',serverName:request.connection.name,toolName:request.tool.name,args:request.arguments,readOnly:request.readOnly,intention:`${request.connection.name} ${request.tool.name}`}},signal);
   return active&&!signal.aborted&&['approve','approve-auto'].includes(answer);
  }
 });
 const close=async()=>{active=false;signal.removeEventListener('abort',abort);await bridge.close();};
 const abort=()=>{void close().catch(()=>{});};signal.addEventListener('abort',abort,{once:true});
 if(signal.aborted)await close();
 return {servers:bridge.servers,close};
}
