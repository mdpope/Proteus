import test from 'node:test';
import assert from 'node:assert/strict';
import {activityNote,activityEntries} from '../public/features/chats/activity-notes.js';
import {groupActivity} from '../public/features/chats/tool-presentation.js';
const run=provider=>({schedule:{provider}});
const key=(events)=>events.map((e,i)=>({key:'event-'+i,...e}));
const flatten=entries=>entries.flatMap(e=>e.role==='activity'?e.items:[e]);

test('default grouping preserves every event and source history while joining MTPLX notices and tools',()=>{
 const entries=key([{role:'user',text:'Synthetic request'},{role:'system',text:'MTPLX is thinking.'},{role:'tool',data:{tool:{callId:'a',status:'completed',output:'Synthetic result'}}},{role:'system',text:'MTPLX is thinking.'},{role:'assistant',text:'Synthetic answer'}]);
 const before=structuredClone(entries);const grouped=activityEntries(entries,run('mtplx'));
 assert.deepEqual(grouped.map(e=>e.role),['user','activity','assistant']);
 assert.deepEqual(flatten(grouped).map(e=>[e.key,e.text,e.role]),entries.map(e=>[e.key,e.text,e.role]));assert.equal(grouped[1].items.length,3);assert.deepEqual(entries,before);
 assert.equal(Object.hasOwn(entries[1].data||{},'activityNote'),false);
});
test('ordinary prose, warnings, questions, feedback, unknown systems and streaming remain visible',()=>{
 const entries=key([{role:'assistant',text:'I am thinking about your request.'},{role:'system',text:'A warning'},{role:'system',text:'MTPLX is thinking.',data:{question:{id:'q'}}},{role:'system',text:'MTPLX is thinking.',data:{agentFeedback:true}},{role:'system',text:'MTPLX is thinking about something else.'},{role:'assistant',text:'Live text',streaming:true,data:{phase:'commentary'}}]);
 for(const provider of ['mtplx','claude','copilot','codex']){assert.ok(entries.every(e=>activityNote(e,run(provider))===null));assert.deepEqual(activityEntries(entries,run(provider)),entries);}
 assert.equal(activityNote({role:'system',text:'MTPLX is thinking.'},run('claude')),null);
});
test('Option 2 keeps all assistant updates inline, including explicit Codex commentary',()=>{
 const entries=key([{role:'assistant',text:'Checking',data:{phase:'commentary'}},{role:'tool',data:{tool:{status:'failed',error:'Synthetic failure'}}},{role:'system',text:'Failure needs attention'},{role:'assistant',text:'Answer',data:{phase:'final_answer'}},{role:'assistant',text:'Unknown kind'}]);
 for(const provider of ['mtplx','claude','copilot','codex']){const grouped=activityEntries(entries,run(provider));assert.deepEqual(grouped,groupActivity(entries));assert.equal(grouped[1].items[0].data.tool.status,'failed');}
});
