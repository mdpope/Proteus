import {contentTabMetadata,windowContentTabId} from '../../models/content-tab-descriptor.js';

function identity(tab,descriptors,documentFile,scope,id){
 if(tab.type==='markdown'&&!tab.contentTabId&&documentFile){
  const file=tab.file||tab.markdown?.file;
  return descriptors.find(row=>{if(row.type!=='document')return false;try{return documentFile(scope,id,row)===file;}catch{return false;}})?.id||tab.id;
 }
 return windowContentTabId(tab);
}
function newView(descriptor,parentId,scope,id,documentFile){
 const common={contentTabId:descriptor.id,...(parentId?{parentId}:{}),label:descriptor.title};
 if(descriptor.type==='browser')return {...common,id:'restored:'+crypto.randomUUID(),type:'browser'};
 if(descriptor.type==='chat')return {...common,id:(parentId?parentId+':':'')+'chat:'+descriptor.chatId,type:'run',runId:descriptor.chatId};
 if(descriptor.type==='terminal')return {...common,id:(parentId?parentId+':':'')+'terminal:'+descriptor.terminalId,type:'terminal',terminal:{id:descriptor.terminalId}};
 if(descriptor.type==='document'){
  let file;try{file=documentFile?.(scope,id,descriptor);}catch{}
  if(!file)return {...common,id:'unavailable:'+descriptor.id,type:'unavailable',unavailableDescriptor:descriptor,unavailableReason:'The document source is unavailable on this owner. Retry after restoring its authorized source.'};
  return {...common,id:'restored:'+crypto.randomUUID(),type:'markdown',file,...(descriptor.chatId?{associationChatId:descriptor.chatId}:{})};
 }
 throw Error('Unsupported saved-window descriptor. The original session was preserved.');
}

// Pure presentation projection: owner membership/order is authoritative, while
// view IDs, aliases, drafts and selection stay window-local. No resource starts,
// registry mutations, page loads or document reads occur here.
export function reconcileWindowSession(value,read,{documentFile}={}){
 const session=structuredClone(value),original=session.tabs||[],parents=new Map(original.map(tab=>[tab.id,tab]));
 const reconcile=(tabs,scope,id,parentId)=>{
  const owner=read(scope,id);if(!owner||owner.revision===0)return tabs;
  return owner.tabs.flatMap(descriptor=>{
   const matches=tabs.filter(tab=>identity(tab,owner.tabs,documentFile,scope,id)===descriptor.id);
   return (matches.length?matches:[newView(descriptor,parentId,scope,id,documentFile)]).map(tab=>({
    ...tab,...contentTabMetadata(descriptor),contentTabId:descriptor.id,customTitle:descriptor.customTitle,
    hidden:!!descriptor.hidden,label:descriptor.title,title:descriptor.title,
    ...(descriptor.type==='browser'?{
     // Pending navigation retains its whole branch for ordinary conflict
     // handling; restoring a layout is not permission to discard that branch.
     ...(!tab.navigationPending?{url:descriptor.url,history:descriptor.history}:{}),
     profileId:descriptor.profileId||'default',persist:!!descriptor.persist,unloaded:true,loaded:false
    }:{})
   }));
  });
 };
 const retain=tab=>[tab,...original.filter(child=>child.parentId===tab.id).flatMap(retain)];
 const visit=tab=>{
  const children=original.filter(child=>child.parentId===tab.id);
  if(tab.hostId||tab.navigationClosed||tab.connectionPaused)return retain(tab);
  const scope=tab.type==='workspace'?(tab.projectId?'project':'workspace'):tab.type==='run'?'chat':null;
  return [tab,...(scope?reconcile(children,scope,tab.projectId||tab.workspaceId||tab.runId||tab.id,tab.id):children).flatMap(visit)];
 };
 session.tabs=original.filter(tab=>!tab.parentId||!parents.has(tab.parentId)).flatMap(visit);
 if(session.team)session.team.tabs=reconcile(session.team.tabs||[],'team','team');
 const available=id=>session.tabs.some(tab=>tab.id===id&&!tab.hidden&&!tab.navigationClosed);
 if(!available(session.active)){
  let fallback=parents.get(session.active)?.parentId;const seen=new Set();
  while(fallback&&!available(fallback)&&!seen.has(fallback)){seen.add(fallback);fallback=parents.get(fallback)?.parentId;}
  session.active=available(fallback)?fallback:'overview';
 }
 if(session.selectedChildren)session.selectedChildren=Object.fromEntries(Object.entries(session.selectedChildren).filter(([parent,child])=>available(parent)&&available(child)&&session.tabs.some(tab=>tab.id===child&&(tab.parentId===parent||tab.type==='workspace'&&parents.get(parent)?.workspaceId===tab.workspaceId))));
 if(session.team&&!session.team.tabs.some(tab=>tab.id===session.team.active&&!tab.hidden)&&!['overview','standup'].includes(session.team.active))session.team.active='overview';
 return session;
}
