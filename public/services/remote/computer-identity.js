import {readHostPlatformMetadata} from '../../models/host-platform.js';
// Configured connection names are authoritative; platform terms are never identity.
export function computerName(...values) {
  return values.find(value=>typeof value==='string'&&value.trim()&&value.length<=80&&!/[\x00-\x1f\x7f]/.test(value))?.trim() || 'Computer';
}
// Read platform metadata from authenticated host state, never a pairing invitation.
export function computerPlatformLabel(host = {}) {
  return readHostPlatformMetadata(host).hostPlatformLabel;
}
export function computerDescription(host = {}) {
  const platform=computerPlatformLabel(host);
  return computerName(host.hostName,host.label)+(platform==='Computer'?'':' · '+platform);
}
export const authenticatedComputerMetadata = readHostPlatformMetadata;
export function countRunningChats(rows=[],localHostId='local') {
  const latest=new Map();
  for(const row of rows){const id=row.chatId||row.runId||row.id;if(!id)continue;const host=row.local||!row.hostId||row.hostId==='local'?localHostId:row.hostId;const key=host+':'+id,old=latest.get(key);if(!old||String(row.updatedAt||'')>=String(old.updatedAt||''))latest.set(key,row);}
  return [...latest.values()].filter(row=>row.status==='running'&&!row.archivedAt&&!row.archived&&!row.cached&&row.online!==false).length;
}
export function hostRunningChatCount(state,online=true) {
  if(!online)return 0;
  return Number.isSafeInteger(state?.runningChatCount)&&state.runningChatCount>=0?state.runningChatCount:countRunningChats(state?.runs||[]);
}
