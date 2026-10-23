import {chatMembership} from '../public/chat-membership.js';
import {chatResourcePlacement} from '../public/chat-resource-placement.js';
function previewProjects(service,enabled){
 if(!service.workspaceProjects&&(!enabled||!service.desktopPreview))return [];
 const workspaceIds=new Set((service.context.get().workspaces||[]).map(row=>row.id));
 return ((service.workspaceProjects||service.desktopPreview).get(service.engine).projects||[]).filter(project=>workspaceIds.has(project.workspaceId));
}
export function browserDestinations(service,runId,{preview=false}={}){
 const run=service.engine.getRun(runId),{workspaceId}=chatMembership(run);
 const workspaces=service.context.get().workspaces||[],projects=previewProjects(service,preview),member=service.workspaceProjects?service.workspaceProjects.membership(run):preview&&service.desktopPreview?service.desktopPreview.membership(run):null;
 const project=projects.find(row=>row.id===member?.projectId&&row.workspaceId===workspaceId);
 return {defaultDestination:['scheduled','manual','schedule'].includes(run.trigger)?{type:'chat',id:runId}:project?{type:'project',id:project.id}:workspaceId?{type:'workspace',id:workspaceId}:{type:'chat',id:runId},destinations:[{type:'application',name:'Application tabs'},{type:'chat',id:runId,name:'This chat'},...workspaces.map(row=>({type:'workspace',id:row.id,name:row.name})),...projects.map(row=>({type:'project',id:row.id,name:row.name,workspaceId:row.workspaceId,workspaceName:workspaces.find(workspace=>workspace.id===row.workspaceId)?.name}))]};
}
export function browserDestination(service,runId,requested,options={}){
 const available=browserDestinations(service,runId,options),value=requested||available.defaultDestination;
 const supported=(service.workspaceProjects||options.preview&&service.desktopPreview)?['application','workspace','chat','project']:['application','workspace','chat'];
 if(!value||!supported.includes(value.type))throw new Error('Choose '+supported.join(', ')+' navigation.');
 if(value.type==='application')return {group:'main',parentId:null,destination:{type:'application'},explicitParent:true};
 if(value.type==='chat'){const id=value.id||runId;if(id!==runId)throw new Error('Only this chat is available as a chat destination.');return {group:'main',parentId:runId,destination:{type:'chat',id},explicitParent:true};}
 const item=available.destinations.find(row=>row.type===value.type&&row.id===value.id);
 if(!item)throw new Error('That '+value.type+' is not available on this computer.');
 if(value.type==='project')return {group:'main',parentId:`project:local:${item.id}`,workspaceId:item.workspaceId,workspaceName:item.workspaceName,projectId:item.id,projectName:item.name,destination:{type:'project',id:item.id,workspaceId:item.workspaceId},explicitParent:true};
 return {group:'main',parentId:`workspace:local:${item.id}`,workspaceId:item.id,workspaceName:item.name,destination:{type:'workspace',id:item.id},explicitParent:true};
}
// A project is display placement. Document source authorization remains tied to the
// originating chat; do not manufacture a project permission/content-sync scope.
export function previewChatResourcePlacement(service,run,session){
 const member=chatMembership(run),projects=previewProjects(service,true),projectId=(service.workspaceProjects||service.desktopPreview)?.membership(run)?.projectId;
 const project=projects.find(row=>row.id===projectId&&row.workspaceId===member.workspaceId);
 if(!project)return chatResourcePlacement(run.id,session,member);
 const parentId=`project:local:${project.id}`,view=(session?.tabs||[]).find(tab=>tab.type==='run'&&!tab.hostId&&(tab.runId||tab.id)===run.id&&tab.parentId===parentId);
 return {scope:'chat',id:run.id,parentId,projectId:project.id,projectName:project.name,workspaceId:project.workspaceId,...(view?{afterId:view.id}:{})};
}
// Legacy workspace content sync has no project dimension. Keep project resources
// solely in the isolated desktop session instead of aliasing them into workspace scopes.
export function previewContentSession(session){
 if(!session)return session;
 const projects=new Set((session.tabs||[]).filter(tab=>tab.type==='workspace'&&tab.projectId).map(tab=>tab.id));
 return {...session,tabs:(session.tabs||[]).filter(tab=>!projects.has(tab.id)&&!projects.has(tab.parentId))};
}
