// Shared inert viewer, synthetic byte arrays and a disposable loopback server only.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';
import assert from 'node:assert/strict';import {chromium} from 'playwright';
const root=path.resolve(import.meta.dirname,'..'),errors=[];let browser;
const server=http.createServer((request,response)=>{const url=new URL(request.url,'http://fixture');if(url.pathname==='/'){response.end('<!doctype html><body></body>');return;}const file=path.resolve(root,'.'+url.pathname);if(!file.startsWith(root+'/public/')||!fs.existsSync(file)){response.writeHead(404);response.end();return;}response.setHeader('Content-Type','text/javascript');response.end(fs.readFileSync(file));});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try{
 browser=await chromium.launch({headless:true});const page=await browser.newPage();page.on('pageerror',error=>errors.push(error.message));await page.goto('http://127.0.0.1:'+server.address().port);
 await page.evaluate(async()=>{
  const {openStoredAttachments}=await import('/public/features/chats/chat-attachments.js');
  window.reads=[];const items=[{name:'first.txt',size:12,modifiedAt:'2026-11-02T10:00:00.000Z'},{name:'second.txt',size:12},{name:'inert.html',size:12}];
  await openStoredAttachments(items,0,async(item,index)=>{reads.push(index);return {...item,mediaType:index===2?'text/html':'text/plain',bytes:new TextEncoder().encode(index===2?'<script>window.executed=true</script>':'Synthetic file '+index)};});
 });
 assert.deepEqual(await page.evaluate(()=>reads),[0]);assert.equal(await page.getByRole('button',{name:'Previous attachment'}).isDisabled(),true);assert.match(await page.locator('[data-file-details]').textContent(),/Modified/);
 await page.getByRole('button',{name:'Next attachment'}).click();await page.waitForFunction(()=>document.querySelector('.attachment-text')?.textContent==='Synthetic file 1');assert.deepEqual(await page.evaluate(()=>reads),[0,1]);assert.doesNotMatch(await page.locator('[data-file-details]').textContent(),/Modified|Created|Unknown/);
 await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>document.querySelector('.attachment-text')?.textContent.includes('<script>'));assert.equal(await page.getByRole('button',{name:'Next attachment'}).isDisabled(),true);assert.equal(await page.evaluate(()=>!!window.executed),false);assert.equal(await page.locator('dialog script,dialog iframe').count(),0);
 await page.keyboard.press('ArrowLeft');await page.waitForFunction(()=>document.querySelector('.attachment-text')?.textContent==='Synthetic file 1');await page.getByRole('button',{name:'Close attachment'}).click();await page.locator('dialog').waitFor({state:'detached'});assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,orderedLazyReads:true,arrowControlsAndKeyboard:true,optionalFileDates:true,inertHTML:true}));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
