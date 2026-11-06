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
 // Exercise the exact owner checkpoint invoked by update preflight with >32
 // independent scrollports, plus overflowing layout nodes that are not scrollports.
 await page.waitForFunction(()=>{const r=document.querySelector('#main');return r.dataset.positionLoading!==r.dataset.viewKey;});
 const many=await page.evaluate(async()=>{
  const root=document.querySelector('#main');
  const box=document.createElement('div');box.id='synthetic-scrollports';
  for(let i=0;i<40;i++){const n=document.createElement('div');n.id='synthetic-scroll-'+i;n.style.cssText='height:40px;overflow:auto';const content=document.createElement('div');content.style.height='300px';content.textContent='Synthetic nested reading anchor';n.append(content);box.append(n);}
  for(let i=0;i<60;i++){const n=document.createElement('div');n.style.cssText='height:2px;overflow:visible';const content=document.createElement('div');content.style.height='20px';content.textContent='Synthetic layout overflow';n.append(content);box.append(n);}
  root.append(box);for(let i=0;i<40;i++)document.querySelector('#synthetic-scroll-'+i).scrollTop=20+i;
  return {key:root.dataset.viewKey,markup:box.outerHTML};
 });
 await app.evaluate(async({app})=>{const main=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs');await main.getWindows().checkpointForQuit();});
 const captured=await page.evaluate(async key=>(await window.desktop.viewPositions({action:'get'})).find(row=>row[0]===key)[1],many.key);
 assert.equal(captured.filter(([key])=>key.startsWith('#synthetic-scroll-')).length,40);
 await page.evaluate(async value=>{
  const root=document.querySelector('#main');
  for(let i=0;i<40;i++)document.querySelector('#synthetic-scroll-'+i).scrollTop=0;
  const positions=await import('./shared/navigation/view-position.js');positions.restoreView(root,value.key);
 },many);
 const offsets=await page.evaluate(()=>Array.from({length:40},(_,i)=>document.querySelector('#synthetic-scroll-'+i).scrollTop));
 assert.deepEqual(offsets,Array.from({length:40},(_,i)=>20+i));
 assert.deepEqual(errors,[]);console.log('PASS actual document reading position through tab/feature switches, selected-page reload, other-feature reload and app restart');
}catch(error){console.error(error);throw error;}finally{await app?.close();await fixture.cleanup();}
