import {chatMembership} from '../public/chat-membership.js';
import {WorkspaceDeletion} from './workspace-deletion.js';
export class TabManagement {
 constructor(service){this.service=service;this.tail=Promise.resolve();this.workspaceDeletion=new WorkspaceDeletion(service);}
 scope({scope,id}){if(scope==='chat')this.service.engine.getRun(id);else if(scope==='workspace')this.service.context.scope(id);this.service.contentTabs.key(scope,id);}
 handle(value={}){const task=this.tail.then(()=>this.perform(value));this.tail=task.catch(()=>{});return task;}
 async perform(value){
  const {contentTabs,engine,context}=this.service;
  if(value.action==='delete-workspace')return this.workspaceDeletion.remove(value);
  if(value.action==='list'){
   const persisted=contentTabs.list({...value,type:['workspace','viewer'].includes(value.type)?undefined:value.type,scope:value.scope==='shell'?undefined:value.scope});
   const runtime=this.service.tabInventory?.()||[];
   const tabs=[...persisted.map(tab=>{const live=runtime.find(item=>item.id===tab.id);return {...live,...tab,url:tab.url||live?.url||null};}),...runtime.filter(tab=>!persisted.some(existing=>existing.id===tab.id))].filter(tab=>(!value.scope||tab.scope===value.scope||tab.location?.scope===value.scope)&&(!value.id||(tab.scopeId||tab.id)===value.id||tab.location?.id===value.id)&&(!value.type||tab.type===value.type));
   const offset=Math.max(0,Math.floor(Number(value.offset)||0)),limit=Math.max(1,Math.min(200,Math.floor(Number(value.limit)||100)));
   return {tabs:tabs.slice(offset,offset+limit),total:tabs.length,offset,limit,nextOffset:offset+limit<tabs.length?offset+limit:null,workspaces:context.get().workspaces.map(({id,name})=>({id,name})),observedAt:new Date().toISOString()};
  }
  if(value.scope==='shell'){
   const tabs=this.service.tabInventory?.()||[],tab=tabs.find(tab=>tab.id===value.tabId);
   if(!tab)throw new Error('Tab is no longer open.');if(tab.manageable===false)throw new Error('This permanent application surface stays open.');if(value.expectedRevision!==tab.revision)throw new Error('Navigation changed. Refresh before managing this tab.');
   if(!['close','hide','restore','reorder','move'].includes(value.action))throw new Error('Choose a supported navigation operation.');
   if(value.action==='move'){if(['workspace','chat'].includes(tab.type))throw new Error('Use workspace/chat membership operations for this tab.');if(value.destination.scope==='shell'){const parent=tabs.find(row=>row.id===value.destination.id||row.runtimeId===value.destination.id);if(!parent||!['workspace','chat'].includes(parent.type)||parent.revision!==value.destination.expectedRevision)throw new Error('Destination navigation changed. Refresh before moving.');}else this.scope(value.destination);}
   return this.service.tabRuntime({action:'shell-action',operation:value.action,tab,ids:value.ids,destination:value.destination,expectedRevision:value.expectedRevision});
  }
  if(['archive','unarchive','move-chat','delete-workspace'].includes(value.action)){
   if(value.action!=='move-chat')return engine.lifecycle(value.chatId,value.action,{expectedUpdatedAt:value.expectedUpdatedAt,expectedArchivedAt:value.expectedArchivedAt});
   const profile=value.workspaceId===null?null:context.scope(value.workspaceId);
   if(profile&&contentTabs.get('workspace',profile.id).tabs.filter(tab=>tab.chatId!==value.chatId).length>=100)throw new Error('Destination workspace is full.');
   const children=contentTabs.list().filter(tab=>tab.scope==='chat'&&tab.scopeId===value.chatId||tab.associationChatId===value.chatId&&tab.scope==='workspace');
   const destination={scope:profile?'workspace':'chat',id:profile?.id||value.chatId};
   const target=contentTabs.get(destination.scope,destination.id);
   if(target.tabs.length+children.filter(tab=>tab.scope!==destination.scope||tab.scopeId!==destination.id).length+1>100)throw new Error('Destination is full. Close or move tabs before moving this chat.');
   for(const tab of children)await this.service.tabRuntime?.({action:'prepare-move',tab,destination,source:{scope:tab.scope,id:tab.scopeId}});
   const run=engine.moveWorkspace(value.chatId,{workspaceId:profile?.id||null,workspaceName:profile?.name||'',expectedUpdatedAt:value.expectedUpdatedAt});
   for(const tab of children){if(tab.scope===destination.scope&&tab.scopeId===destination.id)continue;await contentTabs.moveAsync({scope:tab.scope,id:tab.scopeId,tabId:tab.id,expectedRevision:contentTabs.get(tab.scope,tab.scopeId).revision,destination:{...destination,expectedRevision:contentTabs.get(destination.scope,destination.id).revision},beforePublish:()=>this.service.tabRuntime?.({action:'move',tab,destination,source:{scope:tab.scope,id:tab.scopeId}})});}
   contentTabs.rehouseChat(run.id,chatMembership(run),run.title);
   await this.service.tabRuntime?.({action:'chat-moved',chatId:run.id,workspaceId:profile?.id||null,workspaceName:profile?.name||'',title:run.title});
   return {id:run.id,...chatMembership(run),updatedAt:run.updatedAt,moved:true};
  }
  this.scope(value);const current=await contentTabs.getAsync(value.scope,value.id),tab=current.tabs.find(tab=>tab.id===value.tabId);
  if(value.action!=='reorder'&&!tab)throw new Error('Tab is no longer open.');
  if(value.expectedRevision!==current.revision)throw new Error('Content tabs changed. Refresh before retrying.');
  if(value.action==='move'){
   this.scope(value.destination);
   if(tab.type==='chat'){
    if(value.destination.scope!=='workspace')throw new Error('Move a chat to a workspace using move-chat, or close its navigation tab.');
    return this.perform({action:'move-chat',chatId:tab.chatId,workspaceId:value.destination.id});
   }
   await this.service.tabRuntime?.({action:'prepare-move',tab,destination:value.destination,source:{scope:value.scope,id:value.id}});
   const result=await contentTabs.moveAsync({...value,tabId:tab.id,beforePublish:()=>this.service.tabRuntime?.({action:'move',tab,destination:value.destination,source:{scope:value.scope,id:value.id}})});
   return result;
  }
  const action={hide:'visibility',restore:'visibility',close:'close',reorder:'reorder',touch:'touch',persist:'persist'}[value.action];
  if(!action)throw new Error('Unknown tab management action.');
  const result=await contentTabs.mutateAsync({scope:value.scope,id:value.id,expectedRevision:value.expectedRevision,operations:[{action,id:value.tabId,...(action==='visibility'?{hidden:value.action==='hide'}:{}),...(action==='reorder'?{ids:value.ids}:{}),...(action==='persist'?{enabled:value.enabled}:{})}]});
  await this.service.tabRuntime?.({action:value.action,tab,destination:{scope:value.scope,id:value.id},enabled:value.enabled});
  return result;
 }
}
export function tabTools(manager,runId){return manager?[{name:'proteus_tabs',defer:'never',description:'List or manage Proteus tab metadata across browser, document/viewer, terminal and chat tabs. List supports scope/id/type filters and offset/limit pages (follow nextOffset until null), and returns title, URL, favicon, opened/last interaction dates and revision when recorded. Hidden tabs remain open. Move preserves execution/source owner; closing a chat tab does not delete or cancel its chat. Archive/unarchive and move-chat manage conversations explicitly. Use returned revisions for mutations; app/workflow authorization still applies.',parameters:{type:'object',properties:{offset:{type:'integer',minimum:0},limit:{type:'integer',minimum:1,maximum:200},action:{type:'string',enum:['list','hide','restore','reorder','close','move','touch','persist','archive','unarchive','move-chat','delete-workspace']},scope:{type:'string',enum:['main','team','workspace','chat','shell']},id:{type:'string'},type:{type:'string',enum:['browser','terminal','document','chat','workspace','viewer']},tabId:{type:'string'},expectedRevision:{type:['integer','string']},ids:{type:'array',items:{type:'string'}},destination:{type:'object',properties:{scope:{type:'string',enum:['main','team','workspace','chat','shell']},id:{type:'string'},expectedRevision:{type:['integer','string']}},required:['scope','id','expectedRevision'],additionalProperties:false},enabled:{type:'boolean'},chatId:{type:'string'},workspaceId:{type:['string','null']},moveToWorkspaceId:{type:['string','null']},expectedUpdatedAt:{type:'string'},expectedArchivedAt:{type:['string','null']}},required:['action'],additionalProperties:false},handler:async args=>JSON.stringify(await manager(args,runId))}]:[];}
