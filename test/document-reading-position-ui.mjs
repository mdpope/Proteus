// Actual renderer and restart, using only a disposable authorized document.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const fixture=await sidebarFixture();let app,page;const errors=[];
fs.writeFileSync(fixture.document,'# Synthetic sidebar document\n\n'+Array.from({length:150},(_,i)=>'## Section '+i+'\n\n'+('Disposable reading-position content. '.repeat(12))+'\n\n').join(''));
const launch=async()=>{app=await electron.launch({...(process.env.PROTEUS_PREVIEW_EXECUTABLE?{executablePath:process.env.PROTEUS_PREVIEW_EXECUTABLE,args:['--use-mock-keychain','--user-data-dir='+fixture.locations.userData]}:{args:['.','--use-mock-keychain','--user-data-dir='+fixture.locations.userData]}),env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,PROTEUS_HOME:fixture.locations.home,CODEX_HOME:fixture.auth,PORT:'0'}});page=await app.firstWindow();page.on('pageerror',error=>errors.push(error.message));await page.locator('#topbar-home').waitFor();};
const openDocument=async()=>{const expand=page.locator('[data-preview-workspace-expand="'+fixture.studio.id+'"]');if(await expand.getAttribute('aria-expanded')!=='true')await expand.click();await page.locator('[data-preview-project="'+fixture.project.id+'"]').first().click();await page.locator('[data-preview-resource]').filter({hasText:'Synthetic sidebar document'}).first().click();await page.locator('#main .markdown-preview h2').first().waitFor();};
const offset=()=>page.locator('#main').evaluate(node=>node.scrollTop);
const restored=async expected=>{await page.waitForFunction(expected=>Math.abs(document.querySelector('#main').scrollTop-expected)<8,expected,{timeout:10000});assert.ok(Math.abs(await offset()-expected)<8);};
try{
 await launch();await openDocument();await page.locator('#main').evaluate(node=>{node.scrollTop=2450;node.dispatchEvent(new Event('scroll'));});const expected=await offset();assert.ok(expected>2000);
 await page.locator('[data-page="engine"]').click();await openDocument();await restored(expected);
 await page.reload();await page.locator('#main .markdown-preview h2').first().waitFor();await restored(expected);
 // Pagehide from another feature must not overwrite the document with that feature's offset.
 await page.locator('[data-page="engine"]').click();await page.reload();await page.locator('#topbar-home').waitFor();await openDocument();await restored(expected);
 await app.close();app=null;await launch();await page.locator('#main .markdown-preview h2').first().waitFor();await restored(expected);
 assert.deepEqual(errors,[]);console.log('PASS actual document reading position through tab/feature switches, selected-page reload, other-feature reload and app restart');
}catch(error){console.error(error);throw error;}finally{await app?.close();await fixture.cleanup();}
