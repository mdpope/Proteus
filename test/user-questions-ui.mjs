// Shared desktop renderer, synthetic owner only. No live chats or model calls.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';
import assert from 'node:assert/strict';import {chromium} from 'playwright';
const root=process.env.PROTEUS_TEST_APP_ROOT||path.resolve(import.meta.dirname,'..');
const html='<!doctype html><link rel="stylesheet" href="/public/style.css"><style>body{height:100vh}#host{height:75vh}.conversation-shell{height:100%;display:flex;flex-direction:column}.conversation{overflow:auto;flex:1}.message{padding:24px}</style><textarea id="draft">Retained composer draft</textarea><div id="host"></div><script>window.ProteusMarkdown={mount:(node,text)=>node.textContent=text}</script>';
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://fixture').pathname,file=path.resolve(root,'.'+pathname);if(pathname.startsWith('/public/')&&file.startsWith(root+path.sep)&&fs.existsSync(file)){res.setHeader('Content-Type',file.endsWith('.css')?'text/css':'text/javascript');res.end(fs.readFileSync(file));}else{res.setHeader('Content-Type','text/html');res.end(html);}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1100,height:900}});const errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto('http://127.0.0.1:'+server.address().port);
 await page.evaluate(async()=>{
  const {conversation}=await import('/public/features/chats/conversation.js');const events=Array.from({length:300},(_,index)=>({role:'assistant',text:index===0?'Choose a destination':'Synthetic message '+index}));
  const run={id:'synthetic-question-chat',status:'running',schedule:{provider:'codex'},userQuestions:[{id:'choice',text:'Choose a destination',choices:['Project A','Project B'],status:'pending',eventIndex:0},{id:'custom',text:'Any instructions?',choices:[],status:'pending',eventIndex:1}],eventStart:200,eventCount:300,events:events.slice(200),earlier:200};
  window.fixture={run,calls:[],notices:[],fail:false,pauseHistory:true};
  const render=()=>conversation(document.querySelector('#host'),run,{time:String,notify:text=>fixture.notices.push(text),copy:()=>{},questionAttachments:{providerId:'codex',mediaTypes:{codex:['image/png','text/plain']},destination:'Synthetic owner · Test chat',chatId:run.id,send:async(action,args)=>{if(action==='begin'){fixture.upload={...args,attachmentId:'fixture-file'};return {uploadId:'fixture-upload'};}if(action==='finish')return fixture.upload;if(action==='authorize')return {consentId:'fixture-consent'};return {}; }},loadEarlier:async()=>{if(fixture.pauseHistory){fixture.pauseHistory=false;fixture.historyStarted=true;await new Promise(resolve=>fixture.resumeHistory=resolve);}run.eventStart=Math.max(0,run.eventStart-100);run.events=events.slice(run.eventStart);render();},clearQuestion:async question=>{run.questionQueueCleared={...run.questionQueueCleared,[question.id]:'synthetic-reviewed'};render();},answerQuestion:async(question,answer,messageId,delivery)=>{fixture.calls.push({id:question.id,answer,messageId,delivery});if(fixture.fail)throw Error('Synthetic uncertain transport');run.userQuestions.find(item=>item.id===question.id).status='answered';render();}});
  fixture.render=render;render();
 });
 // One question click must survive an earlier history request already in flight.
 await page.evaluate(async()=>{const {applyConversationPosition}=await import('/public/features/chats/conversation.js');fixture.positionTask=applyConversationPosition(document.querySelector('#host'),{key:'event-150',index:150,offset:0,follow:false});});
 await page.waitForFunction(()=>fixture.historyStarted);
 await page.locator('.user-question-queue summary').click();await page.getByRole('button',{name:'Choose a destination',exact:true}).click();
 await page.evaluate(()=>fixture.resumeHistory());
 await page.waitForFunction(()=>document.activeElement?.closest('[data-question-id]')?.dataset.questionId==='choice',null,{timeout:4000});
 assert.equal(await page.evaluate(()=>fixture.run.eventStart),0);

 assert.equal(await page.locator('[data-question-id="choice"] h4').count(),0,'The transcript already shows this question');assert.equal(await page.locator('[data-question-id="custom"] h4').textContent(),'Any instructions?','Distinct question prompts remain visible');
 await page.getByRole('button',{name:'Project B',exact:true}).click();await page.waitForFunction(()=>fixture.calls.length===1);assert.equal(await page.locator('#draft').inputValue(),'Retained composer draft');assert.equal(await page.locator('.user-question-queue summary').textContent(),'Questions to answer (1)');
 const custom=page.locator('[data-question-id="custom"]');const clear=custom.getByRole('button',{name:'Clear from queue',exact:true}),send=custom.getByRole('button',{name:'Send answer',exact:true});
 const cb=await clear.boundingBox(),sb=await send.boundingBox();assert.ok(cb.x+cb.width<=sb.x,'Clear sits immediately left of Send answer');
 await custom.locator('textarea').fill('Retained reviewed draft');await clear.click();assert.equal(await page.locator('.user-question-queue').isHidden(),true);assert.equal(await custom.locator('textarea').inputValue(),'Retained reviewed draft');assert.equal(await page.evaluate(()=>fixture.calls.length),1,'Clearing must not answer');assert.equal(await custom.getByRole('button',{name:'Send answer',exact:true}).isEnabled(),true);await custom.locator('textarea').fill('');
 const input=page.locator('[data-question-id="custom"] textarea');await input.press('Enter');assert.equal(await page.evaluate(()=>fixture.calls.length),1,'Empty Return must not send');assert.equal(await input.inputValue(),'');await input.fill('A custom answer');await page.evaluate(()=>fixture.render());assert.equal(await input.inputValue(),'A custom answer');
 await input.press('Shift+Enter');assert.equal(await input.inputValue(),'A custom answer\n');assert.equal(await page.evaluate(()=>fixture.calls.length),1);
 await input.press('Backspace');await input.dispatchEvent('keydown',{key:'Enter',isComposing:true});await input.dispatchEvent('keydown',{key:'Enter',repeat:true});assert.equal(await page.evaluate(()=>fixture.calls.length),1,'Composition and held Return must not send');
 await page.evaluate(()=>fixture.fail=true);await input.press('Enter');await page.waitForFunction(()=>fixture.notices.length===1);assert.equal(await input.inputValue(),'A custom answer','Return submits without inserting a newline');
 await page.evaluate(()=>{fixture.run.liveMessages={stream:'Synthetic stream'};fixture.render();});await page.locator('[data-question-id="custom"]').getByRole('button',{name:'Send answer',exact:true}).click();await page.waitForFunction(()=>fixture.calls.length===3);const attempts=await page.evaluate(()=>fixture.calls.slice(1));assert.equal(attempts[0].messageId,attempts[1].messageId);
 await page.evaluate(()=>{fixture.fail=false;fixture.run.userQuestions.push({id:'file',text:'Show the Windows error',choices:[],status:'pending',eventIndex:2});fixture.render();});
 const fileCard=page.locator('[data-question-id="file"]');await fileCard.locator('input[type=file]').setInputFiles({name:'windows-error.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLytQAAAABJRU5ErkJggg==','base64')});await fileCard.locator('textarea').fill('Windows error screenshot');await fileCard.getByRole('button',{name:'Send answer',exact:true}).click();await page.getByRole('button',{name:'Confirm Send',exact:true}).click();await page.waitForFunction(()=>fixture.calls.length===4);const delivered=await page.evaluate(()=>fixture.calls.at(-1));assert.deepEqual(delivered.delivery.attachments,['fixture-file']);assert.equal(delivered.delivery.messageId,delivered.messageId);assert.equal(delivered.delivery.providerId,'codex');assert.equal(await page.locator('#draft').inputValue(),'Retained composer draft');
 // Later user input cancels a delayed jump instead of stealing focus back.
 const navigation=await page.evaluate(async()=>{
  const {navigateQuestion}=await import('/public/features/chats/question-navigation.js');
  const owner={},draft=document.querySelector('#draft');let release,ready=false,positions=0;
  const card=document.querySelector('[data-question-id="custom"]');
  const jump=navigateQuestion({owner,current:()=>true,locate:()=>ready?card:null,loadEarlier:()=>new Promise(resolve=>release=()=>{ready=true;resolve(true);}),position:()=>positions++});
  draft.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));draft.focus();release();const cancelled=await jump;
  const preserved=document.activeElement===draft;
  let releaseFirst,firstReady=false;
  const first=navigateQuestion({owner,current:()=>true,locate:()=>firstReady?card:null,loadEarlier:()=>new Promise(resolve=>releaseFirst=()=>{firstReady=true;resolve(true);}),position:()=>positions++});
  const second=await navigateQuestion({owner,current:()=>true,locate:()=>document.querySelector('[data-question-id="file"]'),loadEarlier:async()=>false});
  releaseFirst();await first;
  return {cancelled,preserved,positions,secondAnsweredCard:second,focusedOldQuestion:document.activeElement?.closest('[data-question-id]')?.dataset.questionId==='custom'};
 });assert.deepEqual(navigation,{cancelled:false,preserved:true,positions:0,secondAnsweredCard:false,focusedOldQuestion:false});
 // Keyed renders reuse the composer input: one sync timer/status survives rebinding.
 const draftLifecycle=await page.evaluate(async()=>{
  const {bindSharedDraftText}=await import('/public/features/chats/shared-draft-text.js');
  const input=document.querySelector('#draft'),set=window.setInterval,clear=window.clearInterval,timers=new Set();
  window.setInterval=(...args)=>{const id=set(...args);timers.add(id);return id;};window.clearInterval=id=>{timers.delete(id);clear(id);};
  const values=new Map(),storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};let binding;
  try{
   for(let index=0;index<12;index++)binding=bindSharedDraftText({input,identity:{kind:'reply',id:'synthetic'},storage,request:async()=>({text:input.value,revision:1})});
   await Promise.resolve();const active={timers:timers.size,statuses:document.querySelectorAll('.shared-draft-status').length,draft:input.value};
   binding.stop();binding.stop();return {...active,remainingTimers:timers.size,remainingStatuses:document.querySelectorAll('.shared-draft-status').length};
  }finally{binding?.stop();window.setInterval=set;window.clearInterval=clear;}
 });assert.deepEqual(draftLifecycle,{timers:1,statuses:1,draft:'Retained composer draft',remainingTimers:0,remainingStatuses:0});
 await page.setViewportSize({width:640,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,pagedQuestionJump:true,firstClickDuringHistoryLoad:true,laterInputCancelsFocus:true,choicesAndCustomAnswer:true,composerAndAnswerDraftsPreserved:true,uncertainOperationPreserved:true,narrowLayout:true}));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
