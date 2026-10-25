import test from 'node:test';import assert from 'node:assert/strict';
import {providerActivity} from '../src/shared/provider-activity.js';
import {providerActivityState} from '../public/features/chats/provider-activity-view.js';
import {activityEntries} from '../public/features/chats/activity-notes.js';
const fixture=provider=>{let now=100000;const events=[];const capture=providerActivity({provider,emit:(role,text,data)=>events.push({role,text,data}),update:()=>{},clock:()=>now});return {capture,events,tick:ms=>now+=ms,rows:()=>events.filter(e=>e.data?.activity).map(e=>e.data.activity)};};
test('observed phase intervals persist independently of messages; cancel closes active rows and no raw reasoning is retained',()=>{
 const f=fixture('mtplx');f.capture.start('one','thinking','MTPLX reasoning channel');f.tick(500);f.capture.end('one');f.capture.start('two','response','MTPLX text');f.tick(300);f.capture.finish();
 assert.equal(f.rows()[0].durationMs,500);assert.equal(f.rows()[1].durationMs,300);assert.equal(f.rows()[1].status,'interrupted');assert.deepEqual(activityEntries(f.events.map((e,i)=>({...e,key:'event-'+i})),{schedule:{provider:'mtplx'}}).map(e=>e.role),['activity']);
 const decoded=JSON.parse(JSON.stringify(f.events));assert.equal(decoded[0].data.activity.status,'completed');
});
test('Codex captures only public summary deltas and reported scoped usage; ignores raw reasoning',()=>{
 const f=fixture('codex'),send=(method,params)=>f.capture.receive({method,params});send('item/started',{item:{id:'r',type:'reasoning'}});send('item/reasoning/textDelta',{itemId:'r',delta:'RAW_PRIVATE_SENTINEL'});send('item/reasoning/summaryTextDelta',{itemId:'r',summaryIndex:0,delta:'Compare the available limits.'});f.tick(800);send('item/completed',{item:{id:'r',type:'reasoning',summary:[],content:['RAW_PRIVATE_SENTINEL']}});
 assert.equal(f.rows()[0].summary,'Compare the available limits.');assert.equal(f.rows()[0].durationMs,800);assert.ok(!JSON.stringify(f.events).includes('RAW_PRIVATE_SENTINEL'));
 send('thread/tokenUsage/updated',{tokenUsage:{total:{inputTokens:10,outputTokens:8,cachedInputTokens:3,reasoningOutputTokens:5,totalTokens:18}}});send('thread/tokenUsage/updated',{tokenUsage:{total:{inputTokens:12,outputTokens:9}}});assert.equal(f.rows().length,2);assert.equal(f.rows()[1].scope,'session');assert.equal(f.rows()[1].values.inputTokens,12);assert.equal(f.rows()[1].values.reasoningTokens,undefined,'missing data is not zero or an inferred prior detail');
});
test('Copilot records agent-scoped lifecycle and optional usage without retaining complete thinking text',()=>{
 const f=fixture('copilot'),send=(type,data,agentId)=>f.capture.receive({type,data,agentId,id:'usage-'+agentId});
 send('assistant.reasoning_delta',{reasoningId:'same',deltaContent:'RAW_COPILOT_SENTINEL'},'a');send('assistant.reasoning_delta',{reasoningId:'same',deltaContent:'RAW_COPILOT_SENTINEL'},'b');f.tick(700);send('assistant.reasoning',{reasoningId:'same',content:'RAW_COPILOT_SENTINEL'},'a');send('assistant.message_delta',{messageId:'m',deltaContent:'Answer'},'a');send('tool.execution_start',{},'a');send('assistant.usage',{inputTokens:10,outputTokens:4,reasoningTokens:2,cacheReadTokens:0},'a');
 assert.equal(f.rows()[0].durationMs,700);assert.equal(f.rows()[1].status,'running');assert.equal(f.rows().at(-1).values.cachedInputTokens,0);assert.ok(!JSON.stringify(f.events).includes('RAW_COPILOT_SENTINEL'));f.capture.finish();assert.equal(f.rows()[1].status,'interrupted');
});
test('Claude captures block lifecycle and disjoint cache accounting; signatures and raw thinking stay out',()=>{
 const f=fixture('claude'),send=event=>f.capture.receive({type:'stream_event',event});send({type:'message_start',message:{id:'c'}});send({type:'content_block_start',index:0,content_block:{type:'thinking',thinking:'RAW_CLAUDE_SENTINEL'}});send({type:'content_block_delta',index:0,delta:{type:'thinking_delta',thinking:'RAW_CLAUDE_SENTINEL'}});f.tick(400);send({type:'content_block_stop',index:0});f.capture.receive({type:'result',subtype:'success',usage:{input_tokens:2,cache_read_input_tokens:5,cache_creation_input_tokens:3,output_tokens:7}});
 assert.equal(f.rows()[0].durationMs,400);assert.equal(f.rows()[1].values.inputTokens,10);assert.equal(f.rows()[1].values.uncachedInputTokens,2);assert.ok(!JSON.stringify(f.events).includes('RAW_CLAUDE_SENTINEL'));
});
test('missing start/end/usage remains unknown, summaries are bounded, and historic running phases never gain invented timing',()=>{
 const f=fixture('codex');f.capture.receive({method:'item/completed',params:{item:{id:'late',type:'reasoning',summary:['x'.repeat(13000)]}}});assert.equal(f.rows()[0].durationMs,undefined);assert.equal(f.rows()[0].summary.length,12000);assert.equal(f.rows()[0].summaryTruncated,true);f.capture.usage('invalid',{inputTokens:-1,outputTokens:NaN},'turn','fixture');assert.equal(f.rows().length,1);
 assert.deepEqual(providerActivityState({status:'running',startedAt:'2026-01-01'},{status:'completed'}),{live:false,status:'End not recorded',duration:null});
});
