// N11-09 regression: the Chats list scrolls from anywhere over its rows, progressively appends
// more chats at the bottom without duplicates or jumps, and reports its end. Synthetic data.
import {_electron as electron} from 'playwright';import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import {randomUUID} from 'node:crypto';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';import {atomicJSON} from '../src/shared/files.js';
const fixture=await sidebarFixture();let app;
try{
 const extra=260;
 for(let i=0;i<extra;i++){const run=structuredClone(fixture.user[0]),id=randomUUID(),at=new Date(Date.now()-(i+60)*60000).toISOString();Object.assign(run,{id,title:'Synthetic scrolling chat '+String(i).padStart(3,'0'),titleRevision:randomUUID(),createdAt:at,updatedAt:at});run.schedule={...run.schedule,id:'synthetic-'+id,name:run.title};atomicJSON(path.join(fixture.locations.home,'runs',id+'.json'),run);}
 app=await electron.launch({args:['.','--use-mock-keychain','--user-data-dir='+fixture.locations.userData],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_AUTH:'none',PROTEUS_PREVIEW_HOME:fixture.locations.root,PROTEUS_HOME:fixture.locations.home,CODEX_HOME:fixture.auth,PORT:'0'}});
 const page=await app.firstWindow(),errors=[];page.on('pageerror',error=>errors.push(error.message));await page.locator('#topbar-home').waitFor();
 await page.locator('[data-preview-page="chats"]').first().click();await page.locator('#chat-index-rows .chat-index-row').first().waitFor();
 await page.waitForFunction(count=>document.querySelectorAll('#chat-index-rows .chat-index-row').length>=count,100);
 // Exercise the global page too: the sidebar's first Chats entry opens a workspace list.
 if(process.env.PROTEUS_TEST_CHAT_SCOPE!=='workspace')await page.evaluate(async()=>{const {renderChatsIndex}=await import('/features/chats/chats-index.js');renderChatsIndex(false,false);document.querySelector('#main').scrollTop=0;});
 // Other fixture projects intentionally reuse titles; isolate the unique scrolling fixture.
 await page.locator('#chat-index-query').fill('Synthetic scrolling chat');
 const state=()=>page.evaluate(()=>{const rows=[...document.querySelectorAll('#chat-index-rows .chat-index-row')].map(row=>row.title);return {count:rows.length,unique:new Set(rows).size,top:document.querySelector('#main').scrollTop,status:document.querySelector('.chat-index-status')?.textContent||''};});
 const box=await page.locator('#chat-index-rows .chat-index-row').nth(2).boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
 const start=await state();await page.mouse.wheel(0,500);await page.waitForTimeout(300);const wheeled=await state();
 assert.ok(wheeled.top>start.top,'a wheel over a row scrolls the Chats page');
 // Keep scrolling from over the list until the end of the history is reached.
 let previous=wheeled,appendedWithoutJump=true,steps=0;
 while(!/end of list/.test(previous.status)&&steps++<200){await page.mouse.wheel(0,900);await page.waitForTimeout(60);const next=await state();if(next.count>previous.count&&next.top<previous.top-5)appendedWithoutJump=false;previous=next;}
 const final=await state();
 assert.match(final.status,/end of list/);assert.ok(final.count>=extra,'progressive loading reaches older chats');assert.equal(final.unique,final.count,'no duplicate rows');assert.equal(appendedWithoutJump,true,'appending keeps the reading position');
 // An unchanged five-second refresh must not rebuild the list under the reader.
 const marker=await page.evaluate(()=>{const row=document.querySelector('#chat-index-rows .chat-index-row');row.dataset.retained='yes';return document.querySelector('#main').scrollTop;});
 await page.waitForTimeout(5800);
 const retained=await page.evaluate(()=>({kept:document.querySelector('#chat-index-rows .chat-index-row')?.dataset.retained==='yes',top:document.querySelector('#main').scrollTop}));
 assert.equal(retained.kept,true,'unchanged index polls keep existing rows');assert.ok(Math.abs(retained.top-marker)<2);
 // Search still filters the same surface and the status reflects the filtered set.
 await page.locator('#chat-index-query').fill('Synthetic scrolling chat 007');await page.waitForTimeout(200);
 const filtered=await state();assert.equal(filtered.count,1);assert.match(filtered.status,/1 chat · end of list/);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,synthetic:true,wheelScrolled:wheeled.top-start.top,rows:final.count,steps,appendedWithoutJump}));
}finally{await app?.close().catch(()=>{});await fixture.cleanup();}
