// Current project navigation, real transcript deltas and a disposable owner.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const fixture=await sidebarFixture();let app;
try{
 app=await electron.launch({args:['.','--use-mock-keychain','--user-data-dir='+fixture.locations.userData],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,PROTEUS_HOME:fixture.locations.home,CODEX_HOME:fixture.auth,PORT:'0'}});
 const page=await app.firstWindow();page.setDefaultTimeout(15000);await page.locator('#topbar-home').waitFor();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 const id=fixture.user[0].id;
 await app.evaluate(({app},id)=>{const e=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService().engine;e.drain=async()=>{};const r=e.getRun(id);r.status='running';r.events=Array.from({length:16},(_,i)=>({role:i%2?'assistant':'user',text:'Earlier synthetic message '+i+'\n\n'+'Readable paragraph.\n\n'.repeat(8),at:e.now()}));delete r.liveMessages;e.persist(r);},id);
 await page.evaluate(async id=>{const {openIndexedChat}=await import('/features/chats/chats-index.js');await openIndexedChat({local:true,chatId:id});},id);
 const composer=page.locator('#followup');await composer.waitFor();await composer.fill('Keep this unsent reply while output streams.');const original=await composer.elementHandle(),scroll=page.locator('#conversation');
 await scroll.evaluate(node=>{node.dispatchEvent(new WheelEvent('wheel',{deltaY:-300}));node.scrollTop=250;node.dispatchEvent(new Event('scroll'));});const top=await scroll.evaluate(node=>node.scrollTop);assert.ok(top>0);
 // Cross the old three-second cutoff while a visible affected chat receives deltas.
 await app.evaluate(async({app},id)=>{const e=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService().engine,r=e.getRun(id);for(let i=0;i<16;i++){e.stream(r,'synthetic-stream','Live output '+i+'.\n\n');await new Promise(resolve=>setTimeout(resolve,250));}},id);
 await page.waitForFunction(()=>document.querySelector('#conversation')?.textContent.includes('Live output 15.'));
 assert.equal(await composer.inputValue(),'Keep this unsent reply while output streams.');assert.ok(await original.evaluate(node=>node.isConnected));assert.ok(Math.abs(await scroll.evaluate(node=>node.scrollTop)-top)<3,'Streaming retains reading position');
 await app.evaluate(({app},id)=>{const e=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService().engine,r=e.getRun(id);delete r.liveMessages;e.event(r,'assistant','Completed synthetic output.');},id);
 await page.getByText('Completed synthetic output.',{exact:true}).waitFor();assert.ok(Math.abs(await scroll.evaluate(node=>node.scrollTop)-top)<3,'Durable messages retain reading position');assert.equal(await composer.inputValue(),'Keep this unsent reply while output streams.');assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,visibleStreamBeyondOldCutoff:true,composerRetained:true,readingPositionRetained:true,durableMessageRefresh:true,synthetic:true}));
}finally{await app?.close();await fixture.cleanup();}
