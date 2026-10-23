import test from 'node:test';
import assert from 'node:assert/strict';
import {placeTabAfter} from '../public/shared/navigation/tab-placement.js';
test('new tabs are inserted immediately after the captured source without reordering other tabs',()=>{
 for(const parentId of [null,'chat','workspace','team'])for(const sourceId of ['a','b','c']){
  const tabs=['a','b','c','new'].map(id=>({id,parentId,profileId:'work'}));
  assert.equal(placeTabAfter(tabs,'new',sourceId),true);
  assert.equal(tabs[tabs.findIndex(t=>t.id===sourceId)+1].id,'new');
  assert.deepEqual(tabs.filter(t=>t.id!=='new').map(t=>t.id),['a','b','c']);
  assert.ok(tabs.every(t=>t.profileId==='work'&&t.parentId===parentId));
 }
});
test('a closed or moved source does not move the new tab to a different navigation area',()=>{
 const tabs=[{id:'other',parentId:'other'},{id:'new',parentId:'chat'}];
 const before=structuredClone(tabs);
 for(const id of ['missing','other','new',null])assert.equal(placeTabAfter(tabs,'new',id),false);
 assert.deepEqual(tabs,before);
});
