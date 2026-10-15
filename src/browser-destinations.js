import {chatMembership} from '../public/chat-membership.js';
export function browserDestinations(service,runId){
  const run=service.engine.getRun(runId),{workspaceId}=chatMembership(run);
  const workspaces=service.context.get().workspaces||[];
  return {defaultDestination:workspaceId?{type:'workspace',id:workspaceId}:{type:'chat',id:runId},destinations:[{type:'application',name:'Application tabs'},{type:'chat',id:runId,name:'This chat'},...workspaces.map(row=>({type:'workspace',id:row.id,name:row.name}))]};
}
export function browserDestination(service,runId,requested){
  const available=browserDestinations(service,runId),value=requested||available.defaultDestination;
  if(!value||!['application','workspace','chat'].includes(value.type))throw new Error('Choose application, workspace or chat navigation.');
  if(value.type==='application')return {group:'main',parentId:null,destination:{type:'application'},explicitParent:true};
  if(value.type==='chat'){const id=value.id||runId;if(id!==runId)throw new Error('Only this chat is available as a chat destination.');return {group:'main',parentId:runId,destination:{type:'chat',id},explicitParent:true};}
  const item=available.destinations.find(row=>row.type==='workspace'&&row.id===value.id);
  if(!item)throw new Error('That workspace is not available on this computer.');
  return {group:'main',parentId:`workspace:local:${item.id}`,workspaceId:item.id,workspaceName:item.name,destination:{type:'workspace',id:item.id},explicitParent:true};
}
