// N11-17 regression: streamed transcript updates write only what changed, while the visible
// result stays identical to a full render. Synthetic data only; no provider is called.
import {_electron as electron} from 'playwright';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-streaming-render-'));let app;
try{
 app=await electron.launch({args:['test/account-queue-ui-host.cjs','--use-mock-keychain','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home}});
 const page=await app.firstWindow(),errors=[];page.on('pageerror',error=>errors.push(error.message));await page.waitForFunction(()=>typeof ProteusMarkdown==='object');
 const result=await page.evaluate(async()=>{
  const {conversation,forgetConversation}=await import('/features/chats/conversation.js');
  const root=document.createElement('section');root.style.cssText='position:fixed;inset:0 auto auto 0;width:700px;height:500px;display:flex;flex-direction:column;z-index:1000;background:white';document.body.append(root);
  const at='2026-11-11T16:00:00Z',turn={id:'turn-1',intervals:[],activeSince:at};
  const run={id:'streaming-render-fixture',status:'running',schedule:{provider:'rehearsal'},turns:[turn],eventStart:0,eventCount:3,events:[
   {role:'user',text:'Synthetic question',at,data:{}},
   {role:'tool',text:'out',at,data:{tool:{id:'t1',name:'Synthetic read',status:'completed',output:'Synthetic result'},turnId:'turn-1'}},
   {role:'system',text:'Automatic approval',at,data:{permission:{automatic:true,kind:'read'},turnId:'turn-1'}}],liveMessages:{}};
  const options={time:()=>'10:00',copy:async()=>{},loadEarlier:async()=>{}};
  const live=()=>root.querySelector('[data-key="stream-live"] .text');
  const mutations=[];const observer=new MutationObserver(list=>mutations.push(...list));
  const render=text=>{run.liveMessages.live=text;conversation(root,run,options);};
  const normalized=html=>{const t=document.createElement('template');t.innerHTML=html;return t.innerHTML;};
  const first='## Heading\n\nFirst paragraph with **bold**.\n\n```js\nconst value = 1;\n```\n\nGrowing';
  render(first);const heading=live().querySelector('h2'),code=live().querySelector('.md-code');
  const roleLabel=root.querySelector('[data-key="stream-live"] .role'),timer=roleLabel.querySelector('span');
  observer.observe(root,{subtree:true,childList:true,characterData:true,attributes:true});
  render(first+' text keeps streaming.');await new Promise(requestAnimationFrame);observer.takeRecords().forEach(r=>mutations.push(r));
  const touched=new Set(mutations.map(r=>(r.target.nodeType===1?r.target:r.target.parentElement)?.closest('[data-key]')?.dataset.key));
  const growth={headingKept:live().querySelector('h2')===heading,codeKept:live().querySelector('.md-code')===code,matchesFullRender:live().innerHTML===normalized(ProteusMarkdown.render(first+' text keeps streaming.')),onlyStreamingRowTouched:[...touched].every(key=>key==='stream-live'),timerReused:roleLabel.querySelector('span')===timer};
  // A change in an earlier block replaces from that block onward and still matches a full render.
  const edited=first.replace('First paragraph','Edited paragraph')+' text keeps streaming.';render(edited);
  const edit={headingKept:live().querySelector('h2')===heading,matchesFullRender:live().innerHTML===normalized(ProteusMarkdown.render(edited)),paragraph:live().querySelector('p').textContent};
  // Completion changes the label once; an unchanged re-render then writes nothing.
  delete run.liveMessages.live;run.events.push({role:'assistant',text:edited,at,data:{turnId:'turn-1'}});run.eventCount=4;turn.activeSince=null;turn.intervals=[[at,'2026-11-11T16:00:05Z']];conversation(root,run,options);
  const label=root.querySelector('[data-key="event-3"] .role')?.textContent;
  mutations.length=0;observer.takeRecords();conversation(root,run,options);await new Promise(requestAnimationFrame);const idle=observer.takeRecords().length+mutations.length;
  const groupSummary=root.querySelector('.activity-group > summary')?.textContent||'';
  observer.disconnect();forgetConversation(run.id);root.remove();
  return {growth,edit,label,idleMutations:idle,groupSummary};
 });
 assert.deepEqual(result.growth,{headingKept:true,codeKept:true,matchesFullRender:true,onlyStreamingRowTouched:true,timerReused:true},JSON.stringify(result));
 assert.equal(result.edit.headingKept,true);assert.equal(result.edit.matchesFullRender,true);assert.match(result.edit.paragraph,/^Edited paragraph/);
 assert.match(result.label,/· 10:00/);assert.match(result.label,/5s/);
 assert.equal(result.idleMutations,0,'an unchanged transcript refresh must not touch the DOM');
 assert.ok(result.groupSummary.length>0);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,...result}));
}finally{await app?.close();fs.rmSync(home,{recursive:true,force:true});}
