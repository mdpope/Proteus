import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const { retirementCandidates, RECENT_MS }=require('../desktop/browser-retention.cjs');

test('browser retention keeps latest six and all tabs touched within an hour across groups',()=>{
  const now=1_000_000_000;
  const tab=(id,age,extra={})=>({id,lastTouchedAt:now-age,view:{webContents:{isCurrentlyAudible:()=>false}},...extra});
  const tabs=Array.from({length:9},(_,i)=>tab('tab-'+i,RECENT_MS+90_000+i*1_000,{group:i%2?'team':'main'}));
  assert.deepEqual(retirementCandidates(tabs,now,null).map(item=>item.id),['tab-6','tab-7','tab-8']);
  tabs[8].lastTouchedAt=now-30_000;
  assert.deepEqual(retirementCandidates(tabs,now,null).map(item=>item.id),['tab-5','tab-6','tab-7']);
});

test('active, audible, shared, agent-owned, downloading and recently used tabs stay loaded',()=>{
  const now=1_000_000_000;
  const tabs=Array.from({length:12},(_,i)=>({id:'tab-'+i,lastTouchedAt:now-RECENT_MS-100_000-i*1000,view:{webContents:{isCurrentlyAudible:()=>i===7}},...(i===8?{shared:true}:{}),...(i===9?{owner:'agent'}:{}),...(i===10?{downloads:new Set(['download'])}:{})}));
  assert.deepEqual(retirementCandidates(tabs,now,'tab-6').map(item=>item.id),['tab-11']);
  tabs[11].lastTouchedAt=now-RECENT_MS+1;
  assert.deepEqual(retirementCandidates(tabs,now,'tab-6').map(item=>item.id),['tab-5']);
});
