const own=(object,key)=>Object.prototype.hasOwnProperty.call(object||{},key);

// Redirects are durable organizational aliases, never execution/access grants.
export function resolvePreviewProject(catalog,id,workspaceId){
 if(typeof id!=='string'||!id)return null;
 const projects=Array.isArray(catalog?.projects)?catalog.projects:[],seen=new Set();
 let workspace=workspaceId;
 while(id&&!seen.has(id)){
  seen.add(id);
  const project=projects.find(row=>row.id===id),hasRedirect=own(catalog?.projectRedirects,id),redirect=hasRedirect?catalog.projectRedirects[id]:null;
  const moves=catalog?.projectMoves?.[id];
  if(workspace!==undefined&&moves?.some(move=>move.from===workspace))workspace=project?.workspaceId||moves.at(-1).to;
  if(project){if(workspace!==undefined&&project.workspaceId!==workspace&&!catalog.projectMoves?.[id]?.some(move=>move.from===workspace))return null;workspace??=project.workspaceId;}
  if(hasRedirect){
   if(!redirect||typeof redirect!=='object')return null;
   if(typeof redirect.workspaceId!=='string'||!redirect.workspaceId||typeof redirect.projectId!=='string'||!redirect.projectId)return null;
   if(workspace!==undefined&&redirect.workspaceId!==workspace)return null;
   workspace??=redirect.workspaceId;id=redirect.projectId;continue;
  }
  return project&&typeof project.workspaceId==='string'&&project.workspaceId?project:null;
 }
 return null;
}

export function remapPreviewBrowserPlacement(value,catalog,{hostId}={}){
 const prefix='project:'+(hostId||'local')+':';
 const projectId=id=>typeof id==='string'&&id.startsWith(prefix)?id.slice(prefix.length):null;
 if(!value||typeof value!=='object')return value;
 // Agent open responses wrap the route under destination; native state stores
 // the inner {type:'project',id,workspaceId} destination directly.
 const wrapped=value.destination?.destination?.type==='project'&&!value.destination.type;
 const route=wrapped?remapPreviewBrowserPlacement(value.destination,catalog,{hostId}):value.destination;
 const destination=value.destination?.type==='project'?value.destination:null;
 const workspace=value.workspaceId??destination?.workspaceId??(wrapped?route.workspaceId:undefined);
 const parent=projectId(value.parentId),target=parent&&resolvePreviewProject(catalog,parent,workspace);
 const destinationTarget=destination&&resolvePreviewProject(catalog,destination.id,workspace);
 let next=route!==value.destination?{...value,destination:route}:value;
 const set=(key,data)=>{if(next[key]===data)return;if(next===value)next={...value};next[key]=data;};
 if(target&&target.id!==parent)set('parentId',prefix+target.id);
 if(destinationTarget&&(destinationTarget.id!==destination.id||destinationTarget.workspaceId!==destination.workspaceId))set('destination',{...destination,id:destinationTarget.id,workspaceId:destinationTarget.workspaceId});
 const metadata=typeof value.projectId==='string'&&resolvePreviewProject(catalog,value.projectId,workspace);
 const metadataTarget=target||destinationTarget||metadata;
 if(metadataTarget&&((metadata&&metadata.id!==value.projectId&&metadata.id===metadataTarget.id)||next!==value||metadataTarget.workspaceId!==workspace)){
  if(own(value,'projectId')&&metadata?.id===metadataTarget.id)set('projectId',metadataTarget.id);
  if(own(value,'projectName'))set('projectName',metadataTarget.name);
  if(own(value,'workspaceId'))set('workspaceId',metadataTarget.workspaceId);
 }
 return next;
}

export function remapPreviewProjectSession(value,catalog,{hostId}={}){
 if(!value||!Array.isArray(value.tabs))return value;
 const prefix='project:'+(hostId||'local')+':';
 const projectId=id=>typeof id==='string'&&id.startsWith(prefix)?id.slice(prefix.length):null;
 const roots=new Map(),replacements=new Map(),parents=new Map(),required=new Map(),chatParents=new Map(),associatedProjects=new Set();
 for(const tab of value.tabs){
  if(tab.type!=='workspace'||!tab.projectId||(tab.hostId||undefined)!==hostId)continue;
  const target=resolvePreviewProject(catalog,tab.projectId,tab.workspaceId);
  if(!target)continue;
  const targetId=prefix+target.id;
  if(target.id===tab.projectId&&target.workspaceId===tab.workspaceId)roots.set(targetId,tab);
  else {parents.set(tab.id,targetId);replacements.set(tab,target);required.set(targetId,target);}
 }
 // Current owner membership also rehouses old global quick views. Keep the same
 // chat/view IDs so children retain their source and live session identities.
 for(const tab of value.tabs){
  if(tab.type!==(hostId?'remote-run':'run')||(tab.hostId||undefined)!==hostId)continue;
  const member=catalog?.memberships?.[tab.runId||tab.id],target=member&&resolvePreviewProject(catalog,member.projectId,member.workspaceId);
  if(target){const id=prefix+target.id;associatedProjects.add(id);if(tab.parentId!==id)chatParents.set(tab.id,id);required.set(id,target);}
 }
 // A browser creation can finish after its old root was removed from the session.
 for(const tab of value.tabs){
  const source=projectId(tab.parentId);if(!source)continue;
  const target=resolvePreviewProject(catalog,source);
  if(target&&target.id!==source){parents.set(tab.parentId,prefix+target.id);required.set(prefix+target.id,target);}
 }
 const tabs=[];
 for(const original of value.tabs){
  let tab=original;
  const replacement=replacements.get(tab);
  if(replacement){
   const id=prefix+replacement.id;if(roots.has(id))continue;
   tab={...tab,id,projectId:replacement.id,workspaceId:replacement.workspaceId,workspaceName:catalog.workspaces?.find(workspace=>workspace.id===replacement.workspaceId)?.name||replacement.workspaceId,label:replacement.name};
   if(own(tab,'projectName'))tab.projectName=replacement.name;
   roots.set(id,tab);
  }
  // Organization metadata applies to every child kind; viewer origin and
  // terminal descriptors remain untouched. New-chat configuration is recaptured.
  const moved=tab.projectId&&resolvePreviewProject(catalog,tab.projectId,tab.workspaceId);
  if(moved&&moved.workspaceId!==tab.workspaceId)tab={...tab,workspaceId:moved.workspaceId,projectId:moved.id};
  if(tab.newChatDraft){
   const root=projectId(tab.parentId),target=root&&resolvePreviewProject(catalog,root,tab.newChatDraft.workspaceId);
   if(target&&catalog.projectMoves?.[root]?.length&&tab.newChatDraft.workspaceId!==target.workspaceId){
    const draft={...tab.newChatDraft,workspaceId:target.workspaceId,projectId:target.id,configurationReset:target.workspaceId},form={...draft.form};
    for(const key of Object.keys(form))if(/^(?:peer-)?(?:workspace|project|cwd|roots|agent|defaults)$/.test(key))delete form[key];
    draft.form=form;delete draft.selection;delete draft.peerSources;delete draft.details;tab={...tab,newChatDraft:draft};
   }
  }
  const parent=chatParents.get(tab.id)||parents.get(tab.parentId);
  if(parent)tab={...tab,parentId:parent};
  if(tab.type==='browser'){
   tab=remapPreviewBrowserPlacement(tab,catalog,{hostId});
   if(tab.info){const info=remapPreviewBrowserPlacement(tab.info,catalog,{hostId});if(info!==tab.info)tab={...tab,info};}
  }
  tabs.push(tab);
 }
 for(const [id,target] of required){
  if(roots.has(id))continue;
  const root={id,type:'workspace',workspaceId:target.workspaceId,projectId:target.id,label:target.name,workspacePage:'chats',...(hostId?{hostId}:{})};
  const index=tabs.findIndex(tab=>tab.parentId===id);tabs.splice(index<0?tabs.length:index,0,root);roots.set(id,root);
 }
 for(const target of required.values()){
  if(!associatedProjects.has(prefix+target.id))continue;
  const id='workspace:'+(hostId||'local')+':'+target.workspaceId;
  if(tabs.some(tab=>tab.id===id))continue;
  const projectIndex=tabs.findIndex(tab=>tab.id===prefix+target.id);
  tabs.splice(projectIndex<0?tabs.length:projectIndex,0,{id,type:'workspace',workspaceId:target.workspaceId,label:catalog.workspaces?.find(row=>row.id===target.workspaceId)?.name||target.workspaceId,workspacePage:'projects',...(hostId?{hostId}:{})});
 }
 const active=parents.get(value.active)||value.active;
 let selectedChildren=value.selectedChildren;
 if(selectedChildren&&typeof selectedChildren==='object'){
  const selected={};
  // Existing destination selection wins unless a moved child is currently active.
  for(const [parent,child] of Object.entries(selectedChildren))if(!parents.has(parent))selected[parent]=parents.get(child)||child;
  for(const [parent,child] of Object.entries(selectedChildren))if(parents.has(parent)){
   const target=parents.get(parent),nextChild=parents.get(child)||child;
   if(!own(selected,target)||child===value.active)selected[target]=nextChild;
  }
  const activeAncestors=new Set();let activeView=value.tabs.find(tab=>tab.id===value.active);
  while(activeView&&!activeAncestors.has(activeView.id)){activeAncestors.add(activeView.id);activeView=value.tabs.find(tab=>tab.id===activeView.parentId);}
  for(const [view,parent] of chatParents){
   const old=value.tabs.find(tab=>tab.id===view)?.parentId;
   const target=tabs.find(tab=>tab.id===parent),workspace=target&&'workspace:'+(hostId||'local')+':'+target.workspaceId;
   if(activeAncestors.has(view)){selected[parent]=view;if(old)selected[old]=parent;if(workspace)selected[workspace]=parent;}
   else if(old&&selectedChildren[old]===view){selected[parent]??=view;selected[old]=parent;}
  }
  const activeTab=tabs.find(tab=>tab.id===active);
  if(activeTab&&parents.has(value.tabs.find(tab=>tab.id===active)?.parentId))selected[activeTab.parentId]=active;
  const before=Object.entries(selectedChildren),after=Object.entries(selected);
  if(before.length!==after.length||before.some(([key,child])=>selected[key]!==child))selectedChildren=selected;
 }
 if(active===value.active&&selectedChildren===value.selectedChildren&&tabs.length===value.tabs.length&&tabs.every((tab,index)=>tab===value.tabs[index]))return value;
 return {...value,tabs,active,...(selectedChildren!==undefined?{selectedChildren}:{})};
}
