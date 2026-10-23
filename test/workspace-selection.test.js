import test from 'node:test';import assert from 'node:assert/strict';
import {rememberTabSelection,restoreTabSelection} from '../public/features/workspaces/workspace-selection.js';
const fixture=()=>[
 {id:'w1',type:'workspace',workspaceId:'one'},
 {id:'p1',type:'workspace',workspaceId:'one',projectId:'project-one',workspacePage:'tabs'},
 {id:'c1',type:'run',parentId:'p1'},
 {id:'b1',type:'browser',parentId:'c1',info:{url:'https://example.test/current',history:{entries:[{id:'first'},{id:'current'}],index:1}}},
 {id:'w2',type:'workspace',workspaceId:'two'},
 {id:'p2',type:'workspace',workspaceId:'two',projectId:'project-two',workspacePage:'configuration'},
 {id:'document',type:'remote-document',parentId:'p2',hostId:'viewer-origin'}
];
test('workspace tabs restore a project/chat/browser chain independently without changing resource state',()=>{
 const tabs=fixture(),before=structuredClone(tabs),selected=new Map(),options={projects:true};
 rememberTabSelection(tabs,'b1',selected,options);rememberTabSelection(tabs,'document',selected,options);
 assert.equal(restoreTabSelection(tabs,'w1',selected,options),'b1');
 assert.equal(restoreTabSelection(tabs,'w2',selected,options),'document');
 assert.deepEqual([...selected],[['c1','b1'],['p1','c1'],['w1','p1'],['p2','document'],['w2','p2']]);
 assert.deepEqual(tabs,before,'Navigation must preserve native views, histories and viewer authorization origin');
});
test('explicit project or workspace pages replace only their own remembered deeper selection',()=>{
 const tabs=fixture(),selected=new Map(),options={projects:true};
 rememberTabSelection(tabs,'b1',selected,options);rememberTabSelection(tabs,'document',selected,options);
 rememberTabSelection(tabs,'p1',selected,options);assert.equal(restoreTabSelection(tabs,'w1',selected,options),'p1');
 assert.equal(tabs.find(t=>t.id==='p1').workspacePage,'tabs');
 rememberTabSelection(tabs,'w1',selected,options);assert.equal(restoreTabSelection(tabs,'w1',selected,options),'w1');
 assert.equal(restoreTabSelection(tabs,'w2',selected,options),'document');
});
test('hidden, closed, moved and foreign-owner selections cannot be reopened through stale memory',()=>{
 const tabs=fixture(),options={projects:true},selected=new Map();rememberTabSelection(tabs,'b1',selected,options);
 tabs.find(t=>t.id==='b1').hidden=true;assert.equal(restoreTabSelection(tabs,'w1',selected,options),'c1');
 tabs.find(t=>t.id==='c1').navigationClosed=true;assert.equal(restoreTabSelection(tabs,'w1',selected,options),'p1');
 tabs.find(t=>t.id==='p1').workspaceId='two';assert.equal(restoreTabSelection(tabs,'w1',selected,options),'w1');
 tabs.find(t=>t.id==='p1').workspaceId='one';tabs.find(t=>t.id==='p1').hostId='different-owner';
 assert.equal(restoreTabSelection(tabs,'w1',selected,options),'w1');
});
test('legacy chat children still restore and malformed cycles terminate',()=>{
 const tabs=[{id:'chat',type:'run'},{id:'browser',type:'browser',parentId:'chat'}],selected=new Map();
 rememberTabSelection(tabs,'browser',selected);assert.equal(restoreTabSelection(tabs,'chat',selected),'browser');
 tabs[0].parentId='browser';selected.set('browser','chat');assert.equal(restoreTabSelection(tabs,'chat',selected),'browser');
 rememberTabSelection(tabs,'browser',selected);assert.equal(selected.get('chat'),'browser');
});
