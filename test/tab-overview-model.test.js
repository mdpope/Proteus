import test from 'node:test';import assert from 'node:assert/strict';import {tabOverviewGroups} from '../public/shared/navigation/tab-overview-model.js';
const tabs=[{id:'ws',type:'workspace',workspaceId:'w',label:'Studio'},{id:'p1',type:'workspace',workspaceId:'w',projectId:'a',label:'One'},{id:'p2',type:'workspace',workspaceId:'w',projectId:'b',label:'Two'},{id:'chat',type:'run',parentId:'p1',label:'Chat'},{id:'browser',type:'browser',parentId:'p1'},{id:'other',type:'terminal',parentId:'p2'},{id:'hidden',type:'browser',parentId:'p1',hidden:true},{id:'else',type:'workspace',workspaceId:'else',projectId:'else'},{id:'elsebrowser',type:'browser',parentId:'else'},{id:'global',type:'browser'}];const catalog={projects:[{id:'b',name:'Two',workspaceId:'w'},{id:'a',name:'One',workspaceId:'w'}]};
test('workspace overview names projects, puts current first and includes chat/browser without leaking another workspace',()=>{const groups=tabOverviewGroups({tabs,catalog,scope:'p1',selectedId:'browser'});assert.deepEqual(groups.map(g=>g.title),['One','Two']);assert.deepEqual(groups.map(g=>g.tabs.map(t=>t.id)),[['chat','browser'],['other']]);assert.equal(groups[0].selectedId,'browser');});
test('top-level overview contains precisely top-level navigation tabs',()=>{assert.deepEqual(tabOverviewGroups({tabs,catalog,scope:'main',selectedId:'browser',topId:'ws'})[0].tabs.map(t=>t.id),['ws','global']);assert.equal(tabOverviewGroups({tabs,catalog,scope:'main',topId:'ws'})[0].selectedId,'ws');});
test('overview can discover project sections from restored views before catalogs arrive',()=>{assert.deepEqual(tabOverviewGroups({tabs,scope:'p2',selectedId:'other'}).map(g=>g.title),['Two','One']);});

test('browser scopes nested below a chat still resolve the workspace and current project',()=>{const nested=[...tabs,{id:'nested',type:'browser',parentId:'chat'}];const groups=tabOverviewGroups({tabs:nested,catalog,scope:'chat',selectedId:'nested'});assert.deepEqual(groups.map(g=>g.title),['One','Two']);assert.ok(groups[0].tabs.some(t=>t.id==='nested'));});

test('other projects are alphabetical and hidden ancestors exclude their descendants without duplicate legacy section identity',()=>{
 const catalog={projects:[{id:'z',name:'Zulu',workspaceId:'w'},{id:'b',name:'Two',workspaceId:'w'},{id:'a',name:'One',workspaceId:'w'},{id:'alpha',name:'Alpha',workspaceId:'w'}]};
 const extra=[...tabs,{id:'legacy',type:'browser',parentId:'ws'},{id:'hidden-chat',type:'run',parentId:'p1',hidden:true},{id:'hidden-child',type:'browser',parentId:'hidden-chat'}];
 const groups=tabOverviewGroups({tabs:extra,catalog,scope:'p1',selectedId:'browser'});
 assert.deepEqual(groups.map(g=>g.title),['One','Alpha','Two','Zulu','Studio']);assert.equal(new Set(groups.map(g=>g.id)).size,groups.length);
 assert.equal(groups.flatMap(g=>g.tabs).some(tab=>tab.id==='hidden-child'),false);assert.equal(groups.at(-1).id,'workspace:local:w');
});
