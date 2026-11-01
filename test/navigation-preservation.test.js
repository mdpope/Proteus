import test from 'node:test';
import assert from 'node:assert/strict';
import {captureNavigation,verifyNavigation} from '../src/services/updates/navigation-preservation.js';
function fixture(){
 const data={workspaces:[{id:'workspace',name:'Synthetic',folders:['/PRIVATE_PATH']}],projects:[{id:'project',name:'Synthetic',workspaceId:'workspace'}],defaultProjectIds:{workspace:'project'},memberships:{chat:{projectId:'project'}},scopes:{'project:project':{revision:1,tabs:[{id:'browser',type:'browser',url:'https://PRIVATE_URL.invalid',history:{entries:[{id:'a',url:'https://PRIVATE_URL.invalid'}],index:0}},{id:'chat:chat',type:'chat',chatId:'chat'}],closed:{retired:1}}}};
 const session={active:'runtime-browser',tabs:[{id:'project-root',type:'workspace',projectId:'project'},{id:'runtime-browser',contentTabId:'browser',type:'browser',parentId:'project-root'}],chatDrafts:{chat:'PRIVATE_DRAFT'}};
 const service={context:{config:()=>data},workspaceProjects:{read:()=>data},contentTabs:{read:()=>data},navigationSessions:()=>[{id:'window',session}]};
 return {data,session,service};
}
test('private upgrade receipts compare canonical navigation and tolerate runtime view remapping',()=>{
 const f=fixture(),before=captureNavigation(f.service);assert.doesNotMatch(JSON.stringify(before),/PRIVATE_PATH|PRIVATE_URL|PRIVATE_DRAFT/);
 f.session.tabs[1].id='new-runtime-browser';f.session.active='new-runtime-browser';
 assert.deepEqual(verifyNavigation(before,captureNavigation(f.service)),{workspaces:1,projects:1,scopes:1,tabs:2,windows:1});
});
test('loss, reassignment, order/history corruption and closed-tab resurrection block acceptance',()=>{
 for(const corrupt of [f=>f.data.workspaces=[],f=>f.data.projects[0].workspaceId='wrong',f=>f.data.memberships.chat.projectId='wrong',f=>f.data.scopes['project:project'].tabs.reverse(),f=>f.data.scopes['project:project'].tabs.pop(),f=>f.data.scopes['project:project'].tabs[0].history.entries=[],f=>f.data.scopes['project:project'].closed={},f=>f.session.chatDrafts={}]){
  const f=fixture(),before=captureNavigation(f.service);corrupt(f);assert.throws(()=>verifyNavigation(before,captureNavigation(f.service)),/changed during upgrade/);
 }
});
