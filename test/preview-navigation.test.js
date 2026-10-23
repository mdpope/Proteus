import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPreviewNavigation,previewLastAccess,previewRelativeAge,previewItemIcon,previewChatActivity,previewTabsForScope} from '../public/shared/navigation/preview-navigation.js';

const at=hour=>`2026-10-16T${String(hour).padStart(2,'0')}:00:00.000Z`;
const fixture=()=>({
 projects:[{id:'p',workspaceId:'w',name:'Project',updatedAt:at(1)},{id:'q',workspaceId:'w',name:'Other',updatedAt:at(2)}],
 memberships:{chat:{projectId:'p',workspaceId:'w'},unopened:{projectId:'p',workspaceId:'w'},archived:{projectId:'p',workspaceId:'w'}},
 defaultProjectIds:{w:'p'},
 chats:[{id:'chat',title:'Chat',createdAt:at(3),updatedAt:at(15)},{id:'unopened',title:'Unopened',createdAt:at(6),updatedAt:at(16)},{id:'archived',title:'Archived',updatedAt:at(5),archivedAt:at(7)}],
 tabs:[
  {id:'workspace',type:'workspace',workspaceId:'w'},
  {id:'project',type:'workspace',projectId:'p',workspaceId:'w'},
  {id:'alias',type:'run',runId:'chat',parentId:'project',lastActivityAt:at(7)},
  {id:'quick',type:'run',runId:'chat',lastActivityAt:at(8)},
  {id:'browser',contentTabId:'browser-record',type:'browser',parentId:'project',hidden:true,info:{id:'browser',loaded:false,lastActivityAt:at(10)}},
  {id:'terminal',type:'terminal',parentId:'alias',terminal:{id:'existing-process'},lastActivityAt:at(9)},
  {id:'document',type:'markdown',parentId:'project',markdown:{file:'synthetic.md'}},
  {id:'agent-output',type:'agent-terminal',runId:'chat',parentId:'alias'},
  {id:'quick-browser',type:'browser',parentId:'quick',info:{associationChatId:'chat',lastActivityAt:at(20)}},
  {id:'direct',type:'browser',parentId:'workspace',info:{associationChatId:'chat',lastActivityAt:at(21)}},
 ]
});

test('project navigation counts current memberships and resources once, retaining hidden/unloaded tabs without resurfacing closed archives',()=>{
 const input=fixture(),before=JSON.stringify(input),navigation=buildPreviewNavigation(input),project=navigation.projects.find(project=>project.id==='p');
 assert.equal(project.chatCount,2);assert.equal(project.resourceCount,4);assert.equal(project.totalCount,6);
 assert.equal(project.items.some(item=>item.chatId==='archived'),false);
 assert.deepEqual(project.items.find(item=>item.chatId==='chat').tabIds,['alias','quick']);
 assert.equal(project.items.find(item=>item.tabId==='browser').hidden,true);
 assert.equal(project.items.find(item=>item.tabId==='browser').unloaded,true);
 assert.equal(project.items.find(item=>item.tabId==='terminal').tab.terminal,input.tabs.find(tab=>tab.id==='terminal').terminal);
 assert.equal(JSON.stringify(input),before,'Aggregation cannot mutate membership or resources.');
});

test('an archived chat is represented only by an existing open alias under its actual project',()=>{
 const input=fixture();input.tabs.push({id:'archived-quick',type:'run',runId:'archived',lastActivityAt:at(12)});
 assert.equal(buildPreviewNavigation(input).projects.find(project=>project.id==='p').items.some(item=>item.chatId==='archived'),false);
 input.tabs.push({id:'archived-project-view',type:'run',runId:'archived',parentId:'project',hidden:true});
 const project=buildPreviewNavigation(input).projects.find(project=>project.id==='p');
 assert.equal(project.chatCount,3);assert.equal(project.items.filter(item=>item.chatId==='archived').length,1);
 assert.equal(input.chats.find(row=>row.id==='archived').archivedAt,at(7));
});

test('only actual project ancestry includes descendants; quick-view associations cannot sweep resources into a project',()=>{
 const navigation=buildPreviewNavigation(fixture()),project=navigation.projects.find(project=>project.id==='p');
 assert.equal(navigation.projectIdForTab(fixture().tabs.find(tab=>tab.id==='terminal')),'p');
 assert.equal(navigation.projectIdForTab(fixture().tabs.find(tab=>tab.id==='quick-browser')),null);
 assert.equal(project.items.some(item=>['quick-browser','direct'].includes(item.tabId)),false);
 assert.equal(project.items.some(item=>item.tabId==='agent-output'),true);
});

test('meaningful activity sorts items while projects retain manual catalog order',()=>{
 const input=fixture();input.tabs.push({id:'q-root',type:'workspace',projectId:'q',workspaceId:'w',lastActivityAt:at(11)});
 let navigation=buildPreviewNavigation(input);assert.equal(navigation.projects[0].id,'p');
 const project=navigation.projects.find(project=>project.id==='p');
 assert.deepEqual(project.items.slice(0,4).map(item=>item.tabId||item.chatId),['browser','terminal','chat','unopened']);
 assert.equal(project.items.find(item=>item.chatId==='chat').lastAccess,Date.parse(at(8)),'A later provider update does not affect user activity.');
 input.tabs.find(tab=>tab.id==='terminal').lastActivityAt=at(12);
 navigation=buildPreviewNavigation(input);assert.equal(navigation.projects[0].id,'p');
 assert.equal(navigation.projects[0].items[0].tabId,'terminal');
});

test('remote identity collisions and explicit unhoused membership never enter local project chat counts',()=>{
 const input=fixture();input.chats.push({chatId:'chat',hostId:'remote',local:false,projectId:'q',title:'Remote collision',updatedAt:at(23)});
 input.tabs.push({id:'remote-chat',runId:'chat',hostId:'remote',type:'remote-run',lastActivityAt:at(23)});
 input.memberships.unopened={projectId:null,workspaceId:null};input.chats.find(row=>row.id==='unopened').projectId='p';
 const project=buildPreviewNavigation(input).projects.find(project=>project.id==='p');
 assert.equal(project.chatCount,1);assert.equal(project.items.find(item=>item.chatId==='chat').title,'Chat');
 assert.equal(project.items.find(item=>item.chatId==='chat').lastAccess,Date.parse(at(8)));
});

test('resource aliases share a logical identity while same-URL independent tabs remain separate; malformed cycles terminate',()=>{
 const input=fixture();input.tabs.push({id:'browser-alias',contentTabId:'browser-record',type:'browser',parentId:'project',lastActivityAt:at(11)});
 input.tabs.push({id:'other-browser',type:'browser',parentId:'project',info:{url:'about:blank'}});
 input.tabs.push({id:'loop-a',type:'browser',parentId:'loop-b'},{id:'loop-b',type:'markdown',parentId:'loop-a'});
 const project=buildPreviewNavigation(input).projects.find(project=>project.id==='p');
 assert.equal(project.resourceCount,5);
 const browser=project.items.find(item=>item.tabId==='browser-alias');assert.deepEqual(browser.tabIds,['browser','browser-alias']);
 assert.equal(browser.lastAccess,Date.parse(at(11)));
 assert.equal(project.items.some(item=>item.tabId?.startsWith('loop')),false);
});

test('preview ages show floored whole minutes below an hour and preserve hour/day boundaries and unknown values',()=>{
 const now=Date.parse(at(12));
 for(const value of [undefined,null,0,'invalid'])assert.equal(previewRelativeAge(value,now),'—');
 for(const [elapsed,expected] of [
  [-1000,'<1m'],[0,'<1m'],[59999,'<1m'],[60000,'1m'],[119999,'1m'],
  [13*60000,'13m'],[45*60000+59999,'45m'],[3600000-1,'59m'],
  [3600000,'1h'],[7200000-1,'1h'],[7200000,'2h'],
  [86400000-1,'23h'],[86400000,'1d'],[3*86400000,'3d'],
 ])assert.equal(previewRelativeAge(now-elapsed,now),expected,`elapsed ${elapsed} ms`);
 assert.equal(previewRelativeAge(new Date(now-13*60000).toISOString(),now),'13m');
});

test('recorded activity and favicon rendering retain bounded embedded-browser metadata',()=>{
 assert.equal(previewLastAccess({lastActivityAt:'invalid',info:{lastActivityAt:at(5)}},{lastActivityAt:at(6)}),Date.parse(at(6)));
 assert.match(previewItemIcon('browser','data:image/png;base64,AAAA'),/<img/);
 assert.doesNotMatch(previewItemIcon('browser','https://example.invalid/icon.png'),/<img/);
 assert.doesNotMatch(previewItemIcon('browser','data:image/png;base64,'+'A'.repeat(98304)),/<img/);
 assert.match(previewItemIcon('chat'),/<svg/);
});


test('selection and provider output do not advance recency; user sends and creation do',()=>{
 const input=fixture(),before=buildPreviewNavigation(input).projects.map(project=>({id:project.id,items:project.items.map(item=>[item.key,item.lastAccess])}));
 for(const tab of input.tabs){if(tab.type==='run')tab.openedAt=at(23);tab.lastTouchedAt=at(23);tab.info={...tab.info,lastTouchedAt:at(23)};}
 input.chats[0].updatedAt=at(23);input.chats[0].events=[{role:'assistant',at:at(23)},{role:'tool',at:at(23)},{role:'user',at:at(23),data:{delivery:{state:'failed'}}},{role:'user',at:at(23),data:{delivery:{state:'sending'}}}];
 assert.deepEqual(buildPreviewNavigation(input).projects.map(project=>({id:project.id,items:project.items.map(item=>[item.key,item.lastAccess])})),before);
 input.chats[0].events.push({role:'user',at:at(22)});
 assert.equal(buildPreviewNavigation(input).projects[0].items[0].chatId,'chat');
 assert.equal(previewChatActivity({createdAt:at(1),updatedAt:at(23),events:[{role:'assistant',at:at(23)}],queuedMessages:[{at:at(20)}]}),Date.parse(at(20)));
 assert.equal(previewLastAccess({openedAt:at(2),lastTouchedAt:at(23)}),Date.parse(at(2)));
 assert.equal(previewLastAccess({lastActivityAt:at(2),info:{lastActivityAt:at(4)},lastTouchedAt:at(23)}),Date.parse(at(4)));
});

test('Tabs table scopes exact workspace/project roots and excludes remote collisions, stale roots and chat descendants',()=>{
 const input=fixture();input.projects.push({id:'r',workspaceId:'other',name:'Other workspace'});
 input.tabs.push({id:'other-root',type:'workspace',workspaceId:'other',projectId:'r'},{id:'other-resource',type:'browser',parentId:'other-root'},
  {id:'remote-root',type:'workspace',workspaceId:'w',projectId:'p',hostId:'remote'},{id:'remote-resource',type:'browser',parentId:'remote-root',hostId:'remote'},
  {id:'stale-root',type:'workspace',workspaceId:'w',projectId:'r'},{id:'stale-resource',type:'browser',parentId:'stale-root'},
  {id:'q-root',type:'workspace',workspaceId:'w',projectId:'q'},{id:'q-resource',type:'markdown',parentId:'q-root'});
 assert.deepEqual(previewTabsForScope({...input,workspaceId:'w',projectId:'p'}).map(tab=>tab.id),['alias','browser','document']);
 assert.deepEqual(previewTabsForScope({...input,workspaceId:'w'}).map(tab=>tab.id),['alias','browser','document','direct','q-resource']);
 assert.equal(buildPreviewNavigation(input).projects.find(project=>project.id==='r').items.some(item=>item.tabId==='stale-resource'),false);
});
