import {_electron as electron} from 'playwright';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'proteus-native-markdown-'));
let app;
try {
 await fs.writeFile(path.join(dir,'main.cjs'),`const {app,BrowserWindow}=require('electron');app.whenReady().then(()=>{new BrowserWindow({width:393,height:650}).loadFile(${JSON.stringify(path.resolve('public/markdown/scratch-editor.html'))});});`);
 app=await electron.launch({args:[path.join(dir,'main.cjs')],env:{...process.env,ELECTRON_DISABLE_SECURITY_WARNINGS:'true'}});
 const page=await app.firstWindow(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.waitForFunction(()=>typeof window.configureScratch==='function');
 await page.evaluate(()=>{window.changes=[];window.webkit={messageHandlers:{scratchEdit:{postMessage:text=>window.changes.push(text)}}};window.configureScratch('# Heading\n\n**Bold content**\n\nKeep every byte.',false,{'--proteus-ink':'#ededed','--proteus-accent':'#c2e69c'});});
 await page.locator('.scratch-live-block strong').waitFor();
 assert.equal(await page.locator('.cm-editor').evaluate(node=>getComputedStyle(node).display),'flex');
 await page.evaluate(()=>window.configureScratch(null,true,{}));
 const editor=page.locator('.cm-content');await editor.click();await page.keyboard.press('Meta+End');
 await page.evaluate(()=>window.insertScratch('**','**'));await page.keyboard.press('Meta+z');
 assert.equal(await page.evaluate(()=>window.changes.at(-1)),'# Heading\n\n**Bold content**\n\nKeep every byte.');
 await page.evaluate(()=>window.configureScratch(null,false,{}));await page.locator('.scratch-live-block strong').waitFor();
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,bundledNativeMarkdown:true,formatUndoPreservesText:true,synthetic:true}));
} finally {await app?.close();await fs.rm(dir,{recursive:true,force:true});}
