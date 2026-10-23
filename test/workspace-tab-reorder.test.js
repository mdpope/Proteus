import test from 'node:test';
import assert from 'node:assert/strict';
import {reorderWorkspaceTabSiblings} from '../public/features/workspaces/workspace-tabs.js';

const rows=()=>[
 {id:'project',type:'workspace'},
 {id:'a',parentId:'project',type:'run',runId:'chat-a'},
 {id:'other',parentId:'workspace',type:'terminal',terminal:{sessionId:'keep'}},
 {id:'hidden',parentId:'project',type:'markdown',hidden:true},
 {id:'b',parentId:'project',type:'browser',info:{url:'about:blank'}},
 {id:'c',parentId:'project',type:'browser'},
];
const ids=tabs=>tabs.map(tab=>tab.id);

test('preview tab reorder moves within owner slots without recreating tabs or changing other owners',()=>{
 const original=rows(),result=reorderWorkspaceTabSiblings(original,{id:'c',targetId:'a',parentId:'project',after:false});
 assert.deepEqual(ids(result),['project','c','other','a','hidden','b']);
 assert.deepEqual(ids(original),['project','a','other','hidden','b','c']);
 for(const tab of original)assert.equal(result.find(row=>row.id===tab.id),tab);
 assert.equal(result[2],original[2]);
});

test('filtered reorder inserts around the visible target and retains filtered-out sibling order and metadata',()=>{
 const original=rows(),result=reorderWorkspaceTabSiblings(original,{id:'b',targetId:'c',parentId:'project',after:true});
 assert.deepEqual(ids(result),['project','a','other','hidden','c','b']);
 assert.equal(result.find(tab=>tab.id==='hidden').hidden,true);
 assert.equal(result.find(tab=>tab.id==='a').runId,'chat-a');
});

test('preview tab reorder rejects cross-owner, stale owner, closed target and invalid placement without mutation',()=>{
 const original=rows(),before=ids(original);
 for(const placement of [
  {id:'a',targetId:'other',parentId:'project',after:true},
  {id:'a',targetId:'b',parentId:'workspace',after:false},
  {id:'a',targetId:'missing',parentId:'project',after:false},
  {id:'a',targetId:'b',parentId:'project',after:'false'},
  {id:'project',targetId:'a',after:false},
 ])assert.throws(()=>reorderWorkspaceTabSiblings(original,placement));
 assert.deepEqual(ids(original),before);
 assert.deepEqual(ids(reorderWorkspaceTabSiblings(original,{id:'a',targetId:'a',parentId:'project',after:true})),before);
});
