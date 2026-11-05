import {createHash} from 'node:crypto';

const pick=(value,keys)=>Object.fromEntries(keys.filter(key=>value?.[key]!==undefined).map(key=>[key,value[key]]));
export const sourceMetadata=entry=>pick(entry,['id','name','kind','hash','path','mode','missing']);

// Report metadata only. MCP commands, environments and source bodies stay on the
// owner. Resolving this view never saves a schedule or launches a provider.
export function inspectSchedule(service,schedule,{prepared=false}={}){
 const resolved=prepared?schedule:service.engine.prepareSchedule(schedule,'manual');
 const managed=resolved.context?service.context.providerMcpContext(resolved.context):{mcpServers:{}};
 const profile=service.engine.permissions.describe(resolved);
 return {workspace:resolved.workspace,workspaceSources:resolved.context?.sourceWorkspaces||[],
  sources:(resolved.context?.entries||[]).map(sourceMetadata),
  mcpServerNames:[...new Set([...Object.keys(resolved.mcpServers||{}),...Object.keys(managed.mcpServers||{})])],
  executionPermissions:resolved.executionPermissions||null,
  effectivePermissions:pick(profile,['id','source','mode','readOnlyTools','workingFolders','readOnlyFolders','folders','rules']),
  permissionEvaluation:'current-owner-policy-for-this-configuration',
  unattendedGuaranteed:false};
}

export function scheduleSources(service,schedule,args){
 // Only the base selection catalog and already referenced workspace catalogs are
 // disclosed by a schedule-read grant; this is not a global workspace inventory.
 const base=service.context.get(schedule.context?.workspaceId||undefined);
 const ids=[...new Set([base.workspaceId,...(schedule.workspaceSources||[]).map(ref=>ref.workspaceId)])];
 const catalogs=ids.map(id=>service.context.get(id,{execution:true}));
 const rows=catalogs.flatMap(catalog=>catalog.entries.map(entry=>({workspaceId:catalog.workspaceId,...sourceMetadata(entry)})))
  .sort((a,b)=>a.workspaceId.localeCompare(b.workspaceId)||a.id.localeCompare(b.id));
 const snapshot=createHash('sha256').update(JSON.stringify(rows)).digest('hex');
 let offset=0;
 if(args.cursor){let cursor;try{cursor=JSON.parse(Buffer.from(args.cursor,'base64url').toString());}catch{throw Error('Invalid source cursor.');}
  if(cursor.snapshot!==snapshot||!Number.isSafeInteger(cursor.offset)||cursor.offset<0)throw Error('Source catalog changed. Restart paging.');offset=cursor.offset;}
 const limit=Math.max(1,Math.min(100,Math.floor(Number(args.limit)||50))),sources=rows.slice(offset,offset+limit);
 return {workspaces:catalogs.map(catalog=>({id:catalog.workspaceId,revision:catalog.revision})),sources,total:rows.length,snapshot,
  nextCursor:offset+sources.length<rows.length?Buffer.from(JSON.stringify({snapshot,offset:offset+sources.length})).toString('base64url'):null};
}
