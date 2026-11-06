import {validateScopedExecution} from './scoped-execution.js';
import {permissionRuleId} from '../settings/permissions.js';
export const workspaceSourceCategories=['folders','permissions','instructions','agents','skills','mcps'];
export function validateScheduleSources(schedule){
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
export function resolveScheduleContext(schedule,context,permissions){
 validateScheduleSources(schedule);
 const base=context.capture({workspace:schedule.workspace,selectedIds:schedule.contextSelection?.selectedIds,agentId:schedule.contextSelection?.agentId,includeDefaults:schedule.contextSelection?.includeDefaults});
 const entries=new Map(base.entries.map(entry=>[entry.id,entry])),roots=new Set([base.workspace.cwd,...base.workspace.additionalDirectories]);
 const sourceWorkspaces=[],profiles=[],agentIDs=new Set(base.agentId?[base.agentId]:[]);const kinds={instructions:'instruction',agents:'agent',skills:'skill',mcps:'mcp'};
 for(const ref of schedule.workspaceSources||[]){
  const snapshot=context.capture({workspaceId:ref.workspaceId});
  if(!snapshot.workspaceId||snapshot.workspaceId!==ref.workspaceId)throw Error('Referenced workspace is missing: '+ref.workspaceId);
  const categories=[...new Set(ref.categories)],allowed=new Set(categories.map(category=>kinds[category]).filter(Boolean));
  for(const entry of snapshot.entries)if(allowed.has(entry.kind)){
   const previous=entries.get(entry.id);if(previous&&previous.hash!==entry.hash)throw Error('Workspace source definitions conflict: '+entry.name);entries.set(entry.id,entry);
  }
  if(categories.includes('agents')&&snapshot.agentId)agentIDs.add(snapshot.agentId);
  if(categories.includes('folders'))for(const root of [snapshot.workspace.cwd,...snapshot.workspace.additionalDirectories])roots.add(root);
  if(categories.includes('permissions'))profiles.push(permissions.describe({...schedule,executionPermissions:undefined,workspace:snapshot.workspace,context:snapshot}));
  sourceWorkspaces.push({workspaceId:ref.workspaceId,workspaceName:snapshot.workspaceName,configurationRevision:snapshot.configurationRevision,categories});
 }
 const explicit=schedule.executionPermissions||{},modes=[...new Set(profiles.map(profile=>profile.mode))];
 if(!explicit.mode&&modes.length>1)throw Error('Inherited workspace approval settings conflict. Choose an explicit schedule approval setting.');
 const folders=[...profiles.flatMap(profile=>[...(profile.workingFolders||[]),...(profile.folders||[])]),...(explicit.folders||[])];
 const rules=[...new Map([...profiles.flatMap(profile=>profile.rules||[]),...(explicit.rules||[])].map(rule=>[permissionRuleId(rule),rule])).values()];
 const executionPermissions=profiles.length||schedule.executionPermissions?{...explicit,...(!explicit.mode&&modes.length?{mode:modes[0]}:{}),folders:[...new Map(folders.map(folder=>[JSON.stringify([folder.path,folder.access]),folder])).values()],rules,...(explicit.readOnlyTools===undefined&&profiles.length?{readOnlyTools:profiles.every(profile=>profile.readOnlyTools)}:{})}:undefined;
 if(schedule.contextSelection?.agentId===undefined&&agentIDs.size>1)throw Error('Inherited main agents conflict. Choose an explicit schedule main agent.');
 const agentId=schedule.contextSelection?.agentId===undefined?[...agentIDs][0]||null:schedule.contextSelection.agentId;
 return {context:{...base,agentId,entries:[...entries.values()],followsWorkspace:false,sourceWorkspaces,workspace:{cwd:base.workspace.cwd,additionalDirectories:[...roots].filter(root=>root!==base.workspace.cwd)}},executionPermissions};
}
