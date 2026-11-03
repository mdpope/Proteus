import {createHash} from 'node:crypto';
export const scheduleActions=['schedule-read','schedule-update','schedule-test','schedule-stop','schedule-refresh','schedule-configure-permissions'];
export function scheduleAccessScope(value){
 if(!value||typeof value!=='object'||Object.keys(value).some(key=>!['hostId','scheduleIds','actions'].includes(key))||typeof value.hostId!=='string'||!value.hostId||!Array.isArray(value.scheduleIds)||!value.scheduleIds.length||value.scheduleIds.length>100||value.scheduleIds.some(id=>typeof id!=='string'||!(/^[a-z0-9][a-z0-9-]{0,79}$/).test(id))||!Array.isArray(value.actions)||!value.actions.length||value.actions.some(action=>!scheduleActions.includes(action)))return null;
 return {hostId:value.hostId,scheduleIds:[...new Set(value.scheduleIds)].sort(),actions:[...new Set(value.actions)].sort()};
}
export function scheduleAccessRule(scope){const value=scheduleAccessScope(scope);return value?{kind:'custom-tool',tool:'proteus_schedules',action:'scope:'+createHash('sha256').update(JSON.stringify(value)).digest('hex'),scheduleScope:value}:null;}
export function matchesScheduleAccess(rule,scope){const expected=scheduleAccessRule(scope);return !!expected&&rule.kind==='custom-tool'&&rule.tool===expected.tool&&rule.action===expected.action;}
