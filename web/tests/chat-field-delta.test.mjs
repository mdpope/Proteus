import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeChatHistory} from '../../public/features/chats/chat-history.js';
test('field removals survive later deltas and stale history, while explicit newer values restore fields',()=>{
 const old={id:'chat',eventCount:2,eventStart:0,events:[{text:'old'},{text:'recent'}],schedule:{model:'original'},nextModelOptions:{model:'next'},pending:{id:'question'}};
 const frozen=Object.freeze({...old});
 let run=mergeChatHistory(frozen,{id:'chat',eventCount:3,events:[],fieldDelta:true,eventPatches:[{index:2,event:{text:'new'}}],removedFields:['nextModelOptions']});
 run=mergeChatHistory(run,{id:'chat',eventCount:4,events:[],fieldDelta:true,eventPatches:[{index:3,event:{text:'latest'}}],removedFields:['pending']});
 run=mergeChatHistory(run,old);
 assert.equal(run.nextModelOptions,undefined);assert.equal(run.pending,undefined);assert.deepEqual(run.schedule,old.schedule);assert.equal(run.events.at(-1).text,'latest');
 run=mergeChatHistory(run,{id:'chat',eventCount:4,events:[],fieldDelta:true,nextModelOptions:{model:'restored'}});
 assert.deepEqual(run.nextModelOptions,{model:'restored'});assert.equal(run.pending,undefined);
 run=mergeChatHistory(run,old);assert.deepEqual(run.nextModelOptions,{model:'restored'});assert.equal(run.pending,undefined);
 assert.deepEqual(frozen.nextModelOptions,{model:'next'});
});
