import test from 'node:test';
import assert from 'node:assert/strict';
import {subagentJournal,subagentSummaries,subagentPage} from '../src/services/chats/subagents.js';
const fixture=()=>{const run={providerSessionId:'parent'};return {run,journal:subagentJournal(run,'codex')};};
const spawn=(journal,parent,id)=>journal.codex({method:'item/completed',params:{threadId:parent,item:{type:'collabAgentToolCall',tool:'spawnAgent',id:'spawn-'+id,senderThreadId:parent,receiverThreadIds:[id],agentsStates:{[id]:{status:'running'}},prompt:'Synthetic delegated task'}}});
test('authoritative thread-start lineage permits early child requests before spawn completion',()=>{
 const {journal}=fixture();
 assert.equal(journal.codex({method:'thread/started',params:{thread:{id:'early-child',parentThreadId:'parent',source:{subAgent:{thread_spawn:{parent_thread_id:'parent'}}}}}}),true);
 assert.equal(journal.allows('early-child','early-turn'),true);
 assert.equal(journal.codex({method:'thread/started',params:{thread:{id:'spoofed',parentThreadId:'parent',source:{subAgent:{thread_spawn:{parent_thread_id:'unrelated'}}}}}}),false);
 assert.equal(journal.allows('spoofed'),false);
});
test('current Codex subAgentActivity identifies a child before its first approval without thread-start replay',()=>{
 const {journal}=fixture();
 journal.codex({method:'item/started',params:{threadId:'parent',item:{id:'activity',type:'subAgentActivity',kind:'started',agentThreadId:'current-child',agentPath:'worker'}}});
 assert.equal(journal.allows('current-child','child-turn'),true);
 assert.equal(journal.find('current-child').status,'running');
 journal.codex({method:'item/completed',params:{threadId:'unrelated',item:{id:'forged',type:'subAgentActivity',kind:'started',agentThreadId:'forged',agentPath:'worker'}}});
 assert.equal(journal.allows('forged'),false);
});
test('only provider-proven direct/nested descendants inherit parent routing; unrelated scope is rejected',()=>{
 const {run,journal}=fixture();assert.equal(journal.allows('unrelated'),false);spawn(journal,'unrelated','spoof');assert.equal(journal.allows('spoof'),false);
 spawn(journal,'parent','child');spawn(journal,'child','nested');assert.equal(journal.allows('nested'),true);assert.equal(journal.allows('parent'),true);assert.equal(run.subagents.length,2);
 assert.equal(journal.register('child',{parentId:'nested'}),null,'Existing relationships cannot be reparented into a cycle');
 journal.codex({method:'turn/started',params:{threadId:'child',turn:{id:'child-turn'}}});assert.equal(journal.allows('child','child-turn'),true);assert.equal(journal.allows('child','parent-turn'),false);
 journal.finish();assert.equal(journal.allows('child'),false);assert.equal(run.subagents[0].status,'interrupted');
});
test('child transcripts stay separate, deduplicate provider events, paginate and expose truncation honestly',()=>{
 const {run,journal}=fixture();spawn(journal,'parent','child');
 for(let i=0;i<205;i++)journal.append('child','assistant','Synthetic message '+i,'event-'+i);
 journal.append('child','assistant','Synthetic message 204','event-204');assert.equal(run.subagents[0].eventCount,205);assert.equal(run.subagents[0].events.length,200);
 const summary=subagentSummaries(run)[0];assert.equal('events' in summary,false);assert.equal(summary.transcriptAvailable,true);
 const page=subagentPage(run,summary.id);assert.equal(page.events.length,50);assert.equal(page.eventStart,155);assert.equal(page.truncated,true);assert.equal(page.earlier,155);
 assert.equal(subagentPage(run,summary.id,155).eventStart,105);assert.throws(()=>subagentPage(run,'other-parent-child'),/does not belong/);
});
test('restored history does not authorize requests from an earlier provider turn',()=>{
 const {run,journal}=fixture();spawn(journal,'parent','child');journal.append('child','assistant','Saved history','saved');
 const resumed=subagentJournal(run,'codex');assert.equal(resumed.allows('child'),false);assert.equal(subagentSummaries(run).length,1);assert.equal(subagentPage(run,run.subagents[0].id).events.length,1);
});
test('Copilot lifecycle and messages are recorded as child output without parent completion effects',()=>{
 const run={providerSessionId:'session'},j=subagentJournal(run,'copilot');
 assert.equal(j.copilot({type:'subagent.started',agentId:'child',data:{agentDisplayName:'Planner',agentDescription:'Plan synthetic task'}}),true);
 assert.equal(j.copilot({type:'assistant.message',agentId:'child',id:'m',data:{content:'Child output'}}),true);
 j.copilot({type:'subagent.completed',agentId:'child',data:{}});assert.equal(run.subagents[0].status,'completed');assert.equal(run.subagents[0].events[0].text,'Child output');assert.equal(j.copilot({type:'assistant.message',data:{content:'Parent'}}),false);
});
test('Claude Agent use records lineage and routes its transcript without exposing reasoning',()=>{
 const run={providerSessionId:'session'},j=subagentJournal(run,'claude');
 j.claude({type:'assistant',message:{content:[{type:'tool_use',name:'Agent',id:'child',input:{description:'Synthetic task'}}]}});
 assert.equal(j.claude({type:'assistant',parent_tool_use_id:'child',uuid:'child-message',message:{content:[{type:'thinking',thinking:'private'},{type:'text',text:'Child output'}]}}),true);
 j.claude({type:'user',uuid:'result',message:{content:[{type:'tool_result',tool_use_id:'child',content:'Done'}]}});
 assert.equal(run.subagents[0].status,'completed');assert.deepEqual(run.subagents[0].events.map(e=>e.text),['Child output','Done']);
});
