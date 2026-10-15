import test from 'node:test';
import assert from 'node:assert/strict';
import {computerName,computerPlatformLabel,computerDescription,authenticatedComputerMetadata,countRunningChats,hostRunningChatCount} from '../public/computer-identity.js';
test('configured name wins over stale host metadata without altering actual configured Mac names',()=>{
 assert.equal(computerName('Build Mac','workstation.example.test'),'Build Mac');
 assert.equal(computerName('',null,'  Office PC  '),'Office PC');
 assert.equal(computerName('bad\nname'),'Computer');
});
test('authenticated platform descriptions preserve host identity and tolerate older hosts',()=>{
 assert.equal(computerDescription({hostName:'Office desktop',hostPlatform:'linux'}),'Office desktop · Linux');
 assert.equal(computerDescription({label:'Build Mac',hostPlatform:'darwin'}),'Build Mac · macOS');
 assert.equal(computerDescription({label:'Windows workstation',hostPlatform:'win32'}),'Windows workstation · Windows');
 assert.equal(computerDescription({label:'Legacy destination'}),'Legacy destination');
 assert.equal(computerDescription({hostName:'<Desktop>',hostPlatform:'linux'}),'<Desktop> · Linux');
 assert.equal(computerPlatformLabel({hostPlatform:'__proto__',hostPlatformLabel:'macOS'}),'Computer');
 assert.deepEqual(authenticatedComputerMetadata({hostPlatform:'linux',hostPlatformLabel:'Wrong',hostArchitecture:'x64'}),{hostPlatform:'linux',hostPlatformLabel:'Linux',hostArchitecture:'x64'});
 assert.deepEqual(authenticatedComputerMetadata({hostPlatform:'future-system',hostArchitecture:'<script>'}),{hostPlatform:'unknown',hostPlatformLabel:'Computer',hostArchitecture:'unknown'});
 assert.deepEqual(authenticatedComputerMetadata(null),{hostPlatform:'unknown',hostPlatformLabel:'Computer',hostArchitecture:'unknown'});
 assert.equal(computerPlatformLabel({hostPlatform:{toString:null}}),'Computer');
});
test('running count deduplicates actual chats across views and excludes inactive or cached states',()=>{
 const rows=[{id:'one',hostId:'a',status:'running'},{id:'view',runId:'one',hostId:'a',status:'running'},
 {chatId:'one',hostId:'b',status:'running',chatType:'internet'}, {id:'schedule',status:'running',trigger:'schedule'},
 ...['queued','awaiting_input','completed','failed'].map(status=>({id:status,status})),
 {id:'archived',status:'running',archivedAt:'2026-01-01'},{id:'cached',status:'running',cached:true},
 {id:'offline',status:'running',online:false},{id:'stale',status:'running',updatedAt:'2026-01-01'},
 {id:'stale',status:'completed',updatedAt:'2026-01-02'}];
 assert.equal(countRunningChats(rows),3);
 assert.equal(countRunningChats([{id:'x',local:true,status:'running'},{id:'x',hostId:'a',status:'running'}],'a'),1);
});
test('authoritative host count covers chats outside the recent page but never counts offline hosts',()=>{
 assert.equal(hostRunningChatCount({runningChatCount:101,runs:[]}),101);
 assert.equal(hostRunningChatCount({runningChatCount:101},false),0);
 assert.equal(hostRunningChatCount({runs:[{id:'one',status:'running'},{id:'two',status:'queued'}]}),1);
});
test('web badge deduplicates simultaneous connections and removes offline observations',async()=>{
 const badge={hidden:true,textContent:'',setAttribute(name,value){this[name]=value;}};const previous=globalThis.document;globalThis.document={querySelector:()=>badge};
 try{const {observeRunningChats}=await import('../web/resources/js/running-chats.js');
  assert.equal(observeRunningChats('a','default',{runningChatCount:2}),2);
  assert.equal(observeRunningChats('a','remote',{runningChatCount:2}),2);
  assert.equal(observeRunningChats('b','shell',{runningChatCount:1}),3);
  assert.equal(observeRunningChats('a','default',null,false),3);
  assert.equal(observeRunningChats('a','remote',null,false),1);
  assert.equal(observeRunningChats('b','shell',{runningChatCount:0}),0);
  assert.equal(badge.textContent,'0');assert.equal(badge['aria-label'],'0 running chats');
 }finally{globalThis.document=previous;}
});
