import test from 'node:test';import assert from 'node:assert/strict';
import {updateCoordinatorPermission} from '../src/services/updates/update-permissions.js';
const run={id:'own-update',schedule:{purpose:'update',updateAuthorization:{tool:'proteus_update',scopeVersion:2,hostId:'own-host',grantedAt:'2026-11-01T00:00:00Z'}}};
const request=(tool,args={})=>({kind:'custom-tool',toolName:tool,args});
test('persisted owner update authorization covers exact preflight through canonical and fresh names',()=>{
 const restored=JSON.parse(JSON.stringify(run));
 for(const prefix of ['', 'mcp__proteus_app__'])for(const [tool,args] of [
  ['proteus_update',{action:'prepare'}],['proteus_tabs',{action:'list'}],['proteus_browser',{action:'destinations'}],
  ['proteus_desktop',{action:'status'}],['proteus_desktop',{action:'call',backend:'cua',tool:'get_window_state',arguments:{pid:42,window_id:12}}],
  ['proteus_chats',{action:'read',hostId:'own-host',chatId:'own-update'}]
 ])assert.equal(updateCoordinatorPermission(restored,request(prefix+tool,args),{pid:42})?.allowed,true,tool);
});
test('update authorization never grants unrelated writes, page access, external owners or protected requests',()=>{
 for(const [tool,args] of [
  ['proteus_tabs',{action:'close'}],['proteus_browser',{action:'snapshot'}],['proteus_browser',{action:'open'}],
  ['proteus_chats',{action:'read',hostId:'other-host',chatId:run.id}],['proteus_chats',{action:'read',chatId:'other-chat'}],
  ['proteus_chats',{action:'create'}],['proteus_chats',{action:'reply',answer:'approve'}],
  ['proteus_desktop',{action:'call',backend:'cua',tool:'click',arguments:{pid:42}}],
  ['proteus_desktop',{action:'call',backend:'cua',tool:'get_window_state',arguments:{pid:99}}],
  ['shell',{command:'anything'}],['fake__proteus_update',{}]
 ])assert.equal(updateCoordinatorPermission(run,request(tool,args),{pid:42}),null,tool);
 for(const flag of ['managedApprovalRequired','requestSandboxBypass'])assert.equal(updateCoordinatorPermission(run,{...request('proteus_update'),[flag]:true}),null);
 assert.equal(updateCoordinatorPermission(run,{...request('proteus_update'),kind:'mcp'}),null);
 assert.equal(updateCoordinatorPermission({...run,schedule:{...run.schedule,purpose:'build'}},request('proteus_update')),null);
 const legacy={...run,schedule:{purpose:'update',updateAuthorization:{tool:'proteus_update'}}};
 assert.equal(updateCoordinatorPermission(legacy,request('proteus_update'))?.allowed,true);
 assert.equal(updateCoordinatorPermission(legacy,request('proteus_tabs',{action:'list'})),null,'Legacy grants do not silently expand');
});
