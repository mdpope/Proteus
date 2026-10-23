import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeChatHistory, chatHistoryWindowStart } from '../public/features/chats/chat-history.js';
import { remoteRun } from '../src/services/remote/remote.js';
const page=(first,last,count=last+1)=>({id:'chat',eventStart:first,eventCount:count,earlier:first,events:Array.from({length:last-first+1},(_,i)=>({text:String(first+i)}))});
test('history survives live refresh, sparse reconnect and stable prepend without duplicates',()=>{
 let run=mergeChatHistory(page(100,199),page(0,99));run=mergeChatHistory(run,page(101,200));
 assert.equal(run.events.length,201);assert.equal(run.eventCount,201);
 run=mergeChatHistory(run,page(300,399));assert.equal(run.retainedHistory[0].events.length,201);
 run=mergeChatHistory(run,page(200,299,400));assert.equal(run.events.length,400);assert.equal(run.earlier,0);assert.equal(run.retainedHistory.length,0);
 assert.equal(run.events[200].text,'200');
});
test('absolute history cursor cannot skip messages when new events arrive',()=>{
 const run={id:'chat',schedule:{},events:page(0,349).events};
 const result=remoteRun(run,150,undefined,100);
 assert.equal(result.eventStart,0);assert.equal(result.events.at(-1).text,'99');assert.equal(result.eventCount,350);
});

test('initial rendering stays small and every cached event remains reachable in older chunks',()=>{
 const events=Array.from({length:1000},(_,i)=>({text:'Message '+i}));let start=chatHistoryWindowStart(events);assert.equal(start,976);let count=events.length-start;
 while(start>0){const next=chatHistoryWindowStart(events,start);assert.ok(next<start);assert.ok(start-next<=100);count+=start-next;start=next;}
 assert.equal(count,1000);assert.equal(chatHistoryWindowStart(Array.from({length:20},()=>({text:'x'.repeat(20000)}))),14);
 assert.equal(chatHistoryWindowStart([{text:'x'.repeat(100000)}]),0);
});

test('collapsed tool-heavy pages advance in full transport batches without mounting output',()=>{
 const events=Array.from({length:2507},(_,i)=>({role:'tool',text:'Tool '+i,data:{tool:{output:'x'.repeat(20000)}}}));
 let first=chatHistoryWindowStart(events);assert.equal(first,2407);let pages=1;
 while(first>0){first=chatHistoryWindowStart(events,first);pages++;}
 assert.equal(pages,26);
});
