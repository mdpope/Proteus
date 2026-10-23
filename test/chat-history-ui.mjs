// Disposable mixed transcript shaped like a long tool-heavy update chat.
import {_electron as electron} from 'playwright';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-history-ui-'));let app;
try{
 app=await electron.launch({args:['test/account-queue-ui-host.cjs','--use-mock-keychain','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,PROTEUS_TEST_LONG_HISTORY:'1'}});
 const page=await app.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.locator('[data-page=runs]').first().click();await page.locator('.chat-index-row').filter({hasText:'Long mixed history fixture'}).click();
 await page.getByText('History marker 2506',{exact:false}).waitFor();const pane=page.locator('.conversation');
 let start=Number(await pane.getAttribute('data-event-start')),steps=0;assert.ok(start>2400);
 // A wheel at an already stationary top must still request the next page.
 while(start>0&&steps++<240){
  await pane.evaluate(p=>{p.scrollTop=0;});await pane.hover();await page.mouse.wheel(0,-600);
  await page.waitForFunction(prior=>Number(document.querySelector('.conversation').dataset.eventStart)<prior,start);
  start=Number(await pane.getAttribute('data-event-start'));await page.waitForTimeout(270);
 }
 assert.equal(start,0,'Every event must remain reachable, including across host transport pages');
 assert.ok(steps<45,'Tool-heavy history should advance in meaningful batches');
 assert.equal(await pane.locator('.activity-group-item').count(),0,'Collapsed groups must not build heavy descendants');
 const group=pane.locator('.activity-group').first();await group.locator(':scope>summary').click();await group.locator('.activity-group-item').first().waitFor();await group.locator(':scope>summary').click();await group.locator('.activity-group-item').first().waitFor({state:'detached'});
 assert.equal(await pane.locator('.message.user').count(),105);await page.getByText('History marker 0 ',{exact:false}).first().waitFor();
 await page.getByRole('button',{name:'↓ Jump to latest'}).click();
 assert.ok(Number(await pane.getAttribute('data-event-start'))>2400,'Jump to latest releases older rendered rows without deleting their cached history');
 const end=await pane.evaluate(p=>({gap:p.scrollHeight-p.clientHeight-p.scrollTop,last:p.querySelector('[data-key="event-2506"]')?.getBoundingClientRect().bottom,bottom:p.getBoundingClientRect().bottom}));assert.ok(end.gap<5,JSON.stringify(end));
 const followed=await pane.evaluate(async root=>{const {captureConversationPosition,applyConversationPosition}=await import('/features/chats/conversation.js');const applied=await applyConversationPosition(root,{key:'event-2400',index:2400,offset:8,follow:false});const position=captureConversationPosition(root);return {applied,key:position.key,offset:position.offset};});assert.equal(followed.applied,true);assert.equal(followed.key,'event-2400');assert.ok(Math.abs(followed.offset-8)<2);
 const readiness=await page.evaluate(async()=>{
  const {conversation,captureConversationPosition,applyConversationPosition,restoreConversationPosition,forgetConversation}=await import('/features/chats/conversation.js');
  const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),wait=async predicate=>{for(let attempt=0;attempt<200;attempt++){if(predicate())return;await pause(10);}throw Error('Conversation restoration did not settle');};
  const roots=[],ids=[],position=index=>({key:'event-'+index,index,offset:8,follow:false}),events=(start,count)=>Array.from({length:count},(_,index)=>({role:'user',text:'Restoration marker '+(start+index)+' '+'. '.repeat(80)}));
  const fixture=(name,{start=0,count=240,loadEarlier=async()=>{}}={})=>{const root=document.createElement('section');root.style.cssText='position:fixed;inset:0 auto auto 0;width:600px;height:320px;display:flex;flex-direction:column;z-index:1000;background:white';document.body.append(root);roots.push(root);const id='restoration-'+name;ids.push(id);const run={id,eventStart:start,eventCount:start+count,events:events(start,count)},options={loadEarlier,time:()=>'',copy:()=>{}};return {root,run,mount:()=>conversation(root,run,options)};};
  try{
   const delayed=fixture('delayed');restoreConversationPosition(delayed.root,position(200));await pause(3100);delayed.mount();await wait(()=>captureConversationPosition(delayed.root)?.key==='event-200');const delayedPosition=captureConversationPosition(delayed.root);
   // Existing DOM is not sufficient: the desired event can arrive in a later update.
   restoreConversationPosition(delayed.root,position(250));await pause(60);delayed.run.events.push(...events(240,40));delayed.run.eventCount=280;delayed.mount();await wait(()=>captureConversationPosition(delayed.root)?.key==='event-250');
   restoreConversationPosition(delayed.root,position(220));restoreConversationPosition(delayed.root,position(240));await wait(()=>captureConversationPosition(delayed.root)?.key==='event-240');
   const aborted=fixture('aborted'),controller=new AbortController();restoreConversationPosition(aborted.root,position(200),{signal:controller.signal});controller.abort();aborted.mount();await pause(60);const abortedFollow=captureConversationPosition(aborted.root)?.follow;
   const human=fixture('human');restoreConversationPosition(human.root,position(200));human.root.dispatchEvent(new Event('wheel'));human.mount();await pause(60);const humanFollow=captureConversationPosition(human.root)?.follow;
   const scoped=fixture('scope');let current=true;restoreConversationPosition(scoped.root,position(200),{current:()=>current});current=false;scoped.mount();await pause(60);const scopedFollow=captureConversationPosition(scoped.root)?.follow;
   let release,started;const began=new Promise(resolve=>started=resolve),gate=new Promise(resolve=>release=resolve),inflight=fixture('inflight',{start:100,count:40,loadEarlier:async()=>{started();await gate;inflight.run.eventStart=0;inflight.run.events=events(0,140);inflight.mount();}});inflight.mount();const cancellation=new AbortController(),applying=applyConversationPosition(inflight.root,position(20),{signal:cancellation.signal});await began;cancellation.abort();const cancelled=await Promise.race([applying,pause(100).then(()=>null)]);release();await pause(60);
   let failedReads=0;const failed=fixture('failed',{start:100,count:40,loadEarlier:async()=>{failedReads++;throw Error('Synthetic unavailable peer');}});failed.mount();const stop=restoreConversationPosition(failed.root,position(20));await pause(120);stop();
   return {delayed:Math.abs(delayedPosition.offset-8)<2,lateEvent:true,newestWins:true,abortedFollow,humanFollow,scopedFollow,inflightCancelled:cancelled===false,failedReads};
  }finally{for(const root of roots)root.remove();for(const id of ids)forgetConversation(id);}
 });assert.deepEqual(readiness,{delayed:true,lateEvent:true,newestWins:true,abortedFollow:true,humanFollow:true,scopedFollow:true,inflightCancelled:true,failedReads:1});
 const retained=await page.evaluate(async()=>{
  const {replaceChatMarkup}=await import('/features/chats/chat-dom.js');const target=document.createElement('section');document.body.append(target);
  const markup=value=>'<div class="remote-messages"><article data-event-key="4"><p>Stable selected words</p><details><summary>Details</summary>Retained details</details></article></div><form id="remote-composer"><textarea name="prompt">'+value+'</textarea></form>';
  replaceChatMarkup(target,markup('draft'),'host:chat');const row=target.querySelector('article'),input=target.querySelector('textarea'),details=row.querySelector('details'),text=row.querySelector('p').firstChild;
  input.focus();input.setSelectionRange(1,3);details.open=true;replaceChatMarkup(target,markup('draft continues'),'host:chat');
  const draftRetained=target.querySelector('textarea')===input&&document.activeElement===input&&input.value==='draft continues'&&input.selectionStart===1&&details.open;
  input.blur();document.getSelection().setBaseAndExtent(text,0,text,6);replaceChatMarkup(target,markup('draft continues'),'host:chat');
  const selectionRetained=target.querySelector('article')===row&&document.getSelection().toString()==='Stable';
  replaceChatMarkup(target,markup(''),'other-host:chat');const scopeChanged=target.querySelector('article')!==row&&target.querySelector('textarea')!==input;target.remove();return {draftRetained,selectionRetained,scopeChanged};
 });assert.deepEqual(retained,{draftRetained:true,selectionRetained:true,scopeChanged:true});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,eventCount:2507,steps,allHistoryReachable:true,keyedDOM:retained,readiness}));
}finally{await app?.close();fs.rmSync(home,{recursive:true,force:true});}
