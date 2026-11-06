import {build} from 'esbuild';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import assert from 'node:assert/strict';
const js=await build({stdin:{contents:`export {mountChatComposer} from './public/features/chats/chat-composer.js';`,resolveDir:process.cwd()},bundle:true,format:'esm',write:false});
const css=await build({stdin:{contents:'@import "./public/chat-design.css";@import "./web/resources/css/remote.css";',resolveDir:process.cwd(),loader:'css'},bundle:true,write:false});
const server=createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/composer.js'?'text/javascript':req.url==='/style.css'?'text/css':'text/html');res.end(req.url==='/composer.js'?js.outputFiles[0].text:req.url==='/style.css'?css.outputFiles[0].text:'<link rel="stylesheet" href="/style.css"><style>body{margin:0}main{padding:16px}textarea{box-sizing:border-box}</style><main><section class="remote-chat-main"><div class="remote-messages">'+ '<p>Retained reading history</p>'.repeat(100)+'./</div><form id="remote-composer"><textarea name="prompt"></textarea><div class="remote-composer-primary"><div class="composer-models"><select><option>Model</option></select></div><div class="remote-composer-actions"><button type="submit">Send</button></div></div></form></section></main>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage();
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(async()=>{const {mountChatComposer}=await import('/composer.js');mountChatComposer(document.querySelector('form'));document.querySelector('form').onsubmit=e=>{e.preventDefault();window.sent=new FormData(e.target).get('prompt');};});
  const editor=page.locator('textarea[name=prompt]');await editor.fill('short');await page.waitForTimeout(100);const short=await editor.evaluate(e=>e.clientHeight);
  await editor.fill('line\n'.repeat(12));await page.waitForTimeout(100);const growing=await editor.evaluate(e=>e.clientHeight);
  await editor.fill('long draft\n'.repeat(150));await page.waitForTimeout(100);
  const measured=await editor.evaluate(e=>({height:e.clientHeight,scroll:e.scrollHeight,overflow:getComputedStyle(e).overflowY}));
  assert.ok(growing>short,JSON.stringify({short,growing}));assert.ok(measured.height<650&&measured.scroll>measured.height);assert.equal(measured.overflow,'auto');
  const reading=await page.evaluate(async()=>{const pane=document.querySelector('.remote-messages'),e=document.querySelector('[name=prompt]');pane.scrollTop=80;const before=pane.scrollTop;e.scrollTop=120;e.value+='edited';e.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));return {before,after:pane.scrollTop,editor:e.scrollTop};});
  assert.ok(Math.abs(reading.after-reading.before)<1);assert.equal(reading.editor,120);
  await page.locator('button[type=submit]').click();assert.equal(await page.evaluate(()=>window.sent),'long draft\n'.repeat(150)+'edited');
  console.log(JSON.stringify({width,short,growing,...measured,reading,passed:true}));
 }
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
