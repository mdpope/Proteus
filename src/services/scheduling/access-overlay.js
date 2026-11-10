import path from 'node:path';
import fs from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value;
const digest=value=>createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
// Provider/model are implementation choices. Resource and connection selection
// are authority: changing them invalidates the overlay until explicitly reviewed.
export function scheduleAccessBinding(schedule){
 return digest({...Object.fromEntries(['id','workspace','contextSelection','workspaceSources','mcpServers','managedConnections','managedConnectionWorkspaceId'].map(key=>[key,schedule[key]??null])),source:schedule.source?{system:schedule.source.system,manifest:schedule.source.manifest}:null});
}
export function validateAccessOverlay(overlay){
 if(overlay&&Object.keys(overlay).some(key=>!['version','binding','grants','managedBindings'].includes(key)))throw Error('Invalid schedule overlay fields.');
 if(!overlay||overlay.version!==1||!/^[a-f0-9]{64}$/.test(overlay.binding||'')||!Array.isArray(overlay.grants)||overlay.grants.length>256)throw Error('Invalid schedule access overlay.');
 if(overlay.managedBindings!==undefined&&(!Array.isArray(overlay.managedBindings)||overlay.managedBindings.length>100||overlay.managedBindings.some(binding=>Object.keys(binding).length!==5||['connectionId','name','ownerId','workspaceId','configurationRevision'].some(key=>typeof binding[key]!=='string'||!binding[key]||binding[key].length>256))))throw Error('Invalid managed connection consent pins.');
 for(const grant of overlay.grants){
  if(Object.keys(grant).some(key=>!['id','approvedAt','revokedAt','folder','rule','command','commandScope'].includes(key)))throw Error('Schedule grants cannot contain request payloads.');
  if(typeof grant.id!=='string'||typeof grant.approvedAt!=='string'||!Number.isFinite(Date.parse(grant.approvedAt))||grant.revokedAt!==undefined&&!Number.isFinite(Date.parse(grant.revokedAt)))throw Error('Invalid schedule access consent.');
  if(grant.commandScope){if(grant.command||grant.folder||grant.rule||Object.keys(grant.commandScope).some(key=>!['scopeHash','sourceHash'].includes(key))||!['scopeHash','sourceHash'].every(key=>/^[a-f0-9]{64}$/.test(grant.commandScope[key]||'')))throw Error('Invalid scoped workflow command consent.');
  } else if(grant.command){
   const command=grant.command;
   if(grant.folder||grant.rule||command.version!==1||Object.keys(command).some(key=>!['version','cwd','commandHash','executable','executableSha256','inputs','digest','scopeHash','sourceHash'].includes(key))||!path.isAbsolute(command.cwd||'')||!path.isAbsolute(command.executable||'')||!['commandHash','executableSha256','digest','scopeHash','sourceHash'].every(key=>/^[a-f0-9]{64}$/.test(command[key]||''))||!Array.isArray(command.inputs)||command.inputs.length>10000||command.inputs.some(input=>Object.keys(input).some(key=>!['path','sha256'].includes(key))||!path.isAbsolute(input.path||'')||!/^[a-f0-9]{64}$/.test(input.sha256||'')))throw Error('Invalid scoped command identity.');
  } else if(grant.folder){if(!path.isAbsolute(grant.folder.path||'')||path.parse(grant.folder.path).root===grant.folder.path||!['read','read-write'].includes(grant.folder.access)||grant.rule)throw Error('Choose a narrow schedule folder.');}
  else {const rule=grant.rule;
   if(rule&&Object.entries(rule).some(([key,value])=>!['kind','server','tool','action','origin'].includes(key)||typeof value!=='string'||value.length>512||/[\x00-\x1f]/.test(value)))throw Error('Schedule rules cannot contain request payloads.');
   if(!rule||!['url','mcp','custom-tool'].includes(rule.kind)||JSON.stringify(rule).includes('*')||rule.kind==='url'&&(!/^https?:\/\//.test(rule.origin||'')||new URL(rule.origin).origin!==rule.origin)||['mcp','custom-tool'].includes(rule.kind)&&(!rule.tool||['proteus_folder_access','proteus_chats','proteus_schedules'].includes(rule.tool))||rule.kind==='mcp'&&!rule.server)throw Error('This operation needs a separately verified schedule grant. Shell access requires the verified host command identity path; raw shell rules are not captured here.');
  }
 }
}
export function addScheduleAccess(schedule,grant,{clock=()=>new Date(),managedBindings}={}){
 if(schedule.managedConnections?.length&&!managedBindings)throw Error('Capture the current managed connection bindings before saving schedule consent.');
 if(grant.folder)grant={folder:{...grant.folder,path:fs.realpathSync(grant.folder.path)}};
 const binding=scheduleAccessBinding(schedule),old=schedule.accessOverlay;
 if(old&&old.grants.some(grant=>!grant.revokedAt)&&old.binding!==binding)throw Error('Schedule resources changed. Review or revoke the previous access overlay before adding grants.');
 const overlay=old?structuredClone(old):{version:1,binding,grants:[],...(managedBindings?{managedBindings:structuredClone(managedBindings)}:{})};
 if(old&&!old.grants.some(grant=>!grant.revokedAt)){overlay.binding=binding;if(managedBindings)overlay.managedBindings=structuredClone(managedBindings);else delete overlay.managedBindings;}
 if(old&&managedBindings)assertScheduleManagedAccess(schedule,managedBindings);
 if(!overlay.grants.some(row=>!row.revokedAt&&digest({folder:row.folder,rule:row.rule,command:row.command,commandScope:row.commandScope})===digest(grant)))overlay.grants.push({...grant,id:randomUUID(),approvedAt:clock().toISOString()});
 validateAccessOverlay(overlay);return {...schedule,accessOverlay:overlay};
}
export function effectiveScheduleAccess(schedule){
 const overlay=schedule.accessOverlay;if(!overlay)return schedule.executionPermissions;
 validateAccessOverlay(overlay);
 const grants=overlay.grants.filter(grant=>!grant.revokedAt);
 if(!grants.length)return schedule.executionPermissions;
 if(schedule.managedConnections?.length&&!overlay.managedBindings)throw Error('Saved schedule access is missing managed connection identity pins. Review access.');
 if(overlay.binding!==scheduleAccessBinding(schedule))throw Error('Schedule resources changed. Review or revoke its saved access overlay before running.');
 for(const grant of grants)if(grant.folder&&fs.realpathSync(grant.folder.path)!==grant.folder.path)throw Error('Schedule folder identity changed. Review access.');
 const explicit=schedule.executionPermissions||{};
 if(!grants.length)return schedule.executionPermissions;
 return {...explicit,folders:[...(explicit.folders||[]),...grants.flatMap(grant=>grant.folder?[grant.folder]:[])],rules:[...(explicit.rules||[]),...grants.flatMap(grant=>grant.rule?[grant.rule]:[])]};
}
export function revokeScheduleAccess(schedule,id,{clock=()=>new Date()}={}){
 const overlay=structuredClone(schedule.accessOverlay);validateAccessOverlay(overlay);
 const grant=overlay.grants.find(row=>row.id===id);if(!grant)throw Error('Schedule access grant not found.');
 grant.revokedAt??=clock().toISOString();return {...schedule,accessOverlay:overlay};
}

export function assertScheduleManagedAccess(schedule,bindings){
 const overlay=schedule.accessOverlay;if(!overlay?.grants.some(grant=>!grant.revokedAt))return;
 if(digest(overlay.managedBindings||[])!==digest(bindings))throw Error('Managed connection identity or configuration changed. Review schedule access before connecting.');
}
