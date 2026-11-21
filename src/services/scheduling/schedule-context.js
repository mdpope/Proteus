import {revision} from './schedules.js';
import {validateScopedExecution} from './scoped-execution.js';
import {permissionRuleId} from '../settings/permissions.js';
import {managedWorkspace} from '../integrations/managed-requirements.js';
export const workspaceSourceCategories=['folders','permissions','instructions','agents','skills','mcps'];
export function validateScheduleSources(schedule){
 if(schedule.autoRefreshSources!==undefined&&typeof schedule.autoRefreshSources!=='boolean')throw Error('Automatic source refresh must be true or false.');
 if(schedule.workspaceSources!==undefined&&(!Array.isArray(schedule.workspaceSources)||schedule.workspaceSources.some(ref=>typeof ref?.workspaceId!=='string'||!ref.workspaceId||!Array.isArray(ref.categories)||ref.categories.some(category=>!workspaceSourceCategories.includes(category)))))throw Error('Choose valid workspace references and configuration categories.');
 if(schedule.managedConnectionWorkspaceId!==undefined&&(typeof schedule.managedConnectionWorkspaceId!=='string'||! /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/.test(schedule.managedConnectionWorkspaceId)))throw Error('Choose an explicit managed connection workspace ID.');
 validateScopedExecution(schedule);
 const p=schedule.executionPermissions;
 if(p===undefined)return;
 if(!p||typeof p!=='object'||Array.isArray(p))throw Error('Choose valid schedule filesystem and approval settings.');
 if(p.mode!==undefined&&!['ask','custom','autopilot'].includes(p.mode))throw Error('Choose a valid schedule approval setting.');
 if(p.readOnlyTools!==undefined&&typeof p.readOnlyTools!=='boolean')throw Error('Choose a valid read-only tool setting.');
 if(p.folders!==undefined&&(!Array.isArray(p.folders)||p.folders.some(folder=>typeof folder?.path!=='string'||(!folder.path.startsWith('/')&&!/^[a-zA-Z]:[\\/]/.test(folder.path))||!['read','read-write'].includes(folder.access))))throw Error('Choose absolute schedule folder paths and read or read-write access.');
}
// Resolve fresh disk-backed sources for every run. The returned snapshot never
// changes placement or transfers another workspace's account/owner authority.
export function resolveScheduleContext(schedule,context,permissions,{refreshCaptured=false,workspaceId}={}){
 validateScheduleSources(schedule);
 const autoRefreshSources=schedule.autoRefreshSources===true&&!refreshCaptured;
 const base=context.capture({workspaceId,workspace:schedule.workspace,selectedIds:schedule.contextSelection?.selectedIds,agentId:schedule.contextSelection?.agentId,includeDefaults:schedule.contextSelection?.includeDefaults,autoRefreshSources});
 const entries=new Map(base.entries.map(entry=>[entry.id,entry])),roots=new Set([base.workspace.cwd,...base.workspace.additionalDirectories]);
 const changes=new Map((base.sourceRefresh||[]).map(change=>[change.id,change]));
 const sourceWorkspaces=[],profiles=[],agentIDs=new Set(base.agentId?[base.agentId]:[]);const kinds={instructions:'instruction',agents:'agent',skills:'skill',mcps:'mcp'};
 for(const ref of schedule.workspaceSources||[]){
  // Identity-only references must not resolve defaults, files or native MCPs.
  if(!ref.categories.length){
   const profile=context.scope(ref.workspaceId);
   if(profile.id!==ref.workspaceId)throw Error('Referenced workspace is missing: '+ref.workspaceId);
   sourceWorkspaces.push({workspaceId:profile.id,workspaceName:profile.name,configurationRevision:revision(profile),categories:[]});
   continue;
  }
  const snapshot=context.capture({workspaceId:ref.workspaceId,autoRefreshSources});
  if(!snapshot.workspaceId||snapshot.workspaceId!==ref.workspaceId)throw Error('Referenced workspace is missing: '+ref.workspaceId);
  const categories=[...new Set(ref.categories)],allowed=new Set(categories.map(category=>kinds[category]).filter(Boolean));
  for(const entry of snapshot.entries)if(allowed.has(entry.kind)){
   const previous=entries.get(entry.id);if(previous&&previous.hash!==entry.hash)throw Error('Workspace source definitions conflict: '+entry.name);entries.set(entry.id,entry);
  }
  for(const change of snapshot.sourceRefresh||[])if(allowed.has(entries.get(change.id)?.kind))changes.set(change.id,change);
  if(categories.includes('agents')&&snapshot.agentId)agentIDs.add(snapshot.agentId);
  if(categories.includes('folders'))for(const root of [snapshot.workspace.cwd,...snapshot.workspace.additionalDirectories])roots.add(root);
  if(!refreshCaptured&&categories.includes('permissions'))profiles.push(permissions.describe({...schedule,executionPermissions:undefined,workspace:snapshot.workspace,context:snapshot}));
  sourceWorkspaces.push({workspaceId:ref.workspaceId,workspaceName:snapshot.workspaceName,configurationRevision:snapshot.configurationRevision,sourceScopeRevision:snapshot.sourceScopeRevision,categories});
 }
 const explicit=schedule.executionPermissions||{},modes=[...new Set(profiles.map(profile=>profile.mode))];
 if(!explicit.mode&&modes.length>1)throw Error('Inherited workspace approval settings conflict. Choose an explicit schedule approval setting.');
 const folders=[...profiles.flatMap(profile=>[...(profile.workingFolders||[]),...(profile.folders||[])]),...(explicit.folders||[])];
 const rules=[...new Map([...profiles.flatMap(profile=>profile.rules||[]),...(explicit.rules||[])].map(rule=>[permissionRuleId(rule),rule])).values()];
 const executionPermissions=profiles.length||schedule.executionPermissions?{...explicit,...(!explicit.mode&&modes.length?{mode:modes[0]}:{}),folders:[...new Map(folders.map(folder=>[JSON.stringify([folder.path,folder.access]),folder])).values()],rules,...(explicit.readOnlyTools===undefined&&profiles.length?{readOnlyTools:profiles.every(profile=>profile.readOnlyTools)}:{})}:undefined;
 if(schedule.contextSelection?.agentId===undefined&&agentIDs.size>1)throw Error('Inherited main agents conflict. Choose an explicit schedule main agent.');
 const agentId=schedule.contextSelection?.agentId===undefined?[...agentIDs][0]||null:schedule.contextSelection.agentId;
 return {context:{...base,agentId,agentSelection:schedule.contextSelection?.agentId,entries:[...entries.values()],followsWorkspace:false,sourceWorkspaces,workspace:{cwd:base.workspace.cwd,additionalDirectories:[...roots].filter(root=>root!==base.workspace.cwd)},...(changes.size?{sourceRefresh:[...changes.values()]}:{})},executionPermissions};
}

export function sourceRefreshEvent(snapshot,at){
 const changes=Array.isArray(snapshot?.sourceRefresh)?snapshot.sourceRefresh.filter(change=>typeof change?.name==='string'&&typeof change.from==='string'&&typeof change.to==='string'):[];
 if(!changes.length)return null;
 const sources=changes.map(({name,from,to})=>`${name} (${from.slice(0,12)} → ${to.slice(0,12)})`).join(', ');
 return {role:'system',text:'Automatically refreshed '+sources,at,data:{sourceRefresh:changes}};
}

const busyStatuses=new Set(['queued','running','awaiting_input']);

export async function refreshRunSources({engine,context},run,{selection={},beforeApply,apply}){
 const before=run.schedule,old=before.context;
 const ensureIdle=()=>{
  if(busyStatuses.has(run.status)||engine.running.has(run.id))throw Error('Wait for this turn to finish before changing context.');
 };
 ensureIdle();
 // The original snapshot can recover the base and references of a run
 // previously refreshed by the single-workspace path.
 const original=run.initialSchedule?.context;
 const references=old?.sourceWorkspaces??original?.sourceWorkspaces??before.workspaceSources;
 const workspaceId=old?.workspaceId||undefined;
 const workspace=old?.followsWorkspace?undefined:old?.baseWorkspace||before.workspace;
 const agentId=selection.agentId===undefined?old?.agentId:selection.agentId||null;
 const options={selectedIds:selection.selectedIds??old?.selectedIds??[],includeDefaults:selection.includeDefaults??old?.includeDefaults??true,agentId};
 if(references?.length){
  const sourceWorkspaceIds=new Set([workspaceId||context.get().workspaceId,
   ...references.filter(ref=>ref.categories.length).map(ref=>ref.workspaceId)]);
  for(const id of sourceWorkspaceIds)await context.refreshAsync({workspaceId:id});
 }else{
  await context.refreshAsync({workspaceId});
 }
 beforeApply?.();
 ensureIdle();
 if(engine.getRun(run.id)!==run||run.schedule!==before)throw Error('Captured settings changed during refresh. Open chat details and try again.');
 let snapshot;
 if(references?.length){
  const sourceCapture=old?.sourceWorkspaces?.length?old:original;
  const capturedAgent=sourceCapture?.agentSelection===undefined?before.contextSelection?.agentId:sourceCapture.agentSelection;
  const contextSelection={...options,agentId:selection.agentId===undefined||agentId===(old?.agentId||null)?capturedAgent:agentId};
  snapshot=resolveScheduleContext({
   ...before,workspace:sourceCapture?.baseWorkspace||workspace,
   contextSelection,workspaceSources:references.map(({workspaceId,categories})=>({workspaceId,categories}))
  },context,engine.permissions,{refreshCaptured:true,workspaceId}).context;
 }else{
  snapshot=context.capture({workspaceId,workspace,...options});
 }
 if(before.managedConnections?.length)managedWorkspace({...before,context:snapshot});
 return apply(snapshot,old);
}
