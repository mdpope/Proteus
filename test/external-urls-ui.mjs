import {_electron as electron} from 'playwright';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
import assert from 'node:assert/strict';
const fixture=await sidebarFixture();let app;
try{
 app=await electron.launch({...(process.env.PROTEUS_TEST_EXECUTABLE?{executablePath:process.env.PROTEUS_TEST_EXECUTABLE}:{}),args:process.env.PROTEUS_TEST_EXECUTABLE?[]:['.'],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,CODEX_HOME:fixture.auth,PORT:'0'}});
 const url=fixture.origin+'/external-browser-review';
 await app.evaluate(({app},url)=>app.emit('open-url',{preventDefault(){}},url),url);
 let shell=await app.firstWindow();await shell.locator('body.window-design-preview').waitFor();
 const inventory=()=>app.evaluate(({app})=>{const b=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();return [...b.tabs.values()].map(t=>({id:t.id,url:t.view?.webContents.getURL(),owner:t.owner,shared:t.shared,agentPaused:t.agentPaused,windowId:t.windowId,history:b.state(t).history}));});
 const wait=async(fn)=>{for(let i=0;i<150;i++){const rows=await inventory();if(fn(rows))return rows;await new Promise(r=>setTimeout(r,100));}throw Error('External URL did not become a visible browser tab');};
 let rows=await wait(rows=>rows.some(t=>t.url===url));const original=rows.find(t=>t.url===url);await shell.locator('[data-tab-container="'+original.id+'"].selected').waitFor();
 await app.evaluate(({app},url)=>{app.emit('open-url',{preventDefault(){}},url);app.emit('second-instance',{},['/synthetic/Proteus',url+'/second']);},url);
 rows=await wait(rows=>rows.filter(t=>t.url===url).length===2&&rows.some(t=>t.url===url+'/second'));
 for(const tab of rows.filter(t=>t.url?.startsWith(url))){assert.equal(tab.owner,null);assert.equal(tab.shared,false);assert.equal(tab.agentPaused,true);}
 const last=rows.find(t=>t.url===url+'/second');await shell.locator('[data-tab-container="'+last.id+'"].selected').waitFor();assert.ok(rows.some(t=>t.id===original.id));
 const count=rows.length;await app.evaluate(({app})=>app.emit('open-url',{preventDefault(){}},'https://user:secret@example.invalid'));await new Promise(r=>setTimeout(r,100));assert.equal((await inventory()).length,count);
 await app.evaluate(({BrowserWindow})=>{for(const w of BrowserWindow.getAllWindows())w.close();});
 for(let i=0;i<100&&!shell.isClosed();i++)await new Promise(r=>setTimeout(r,100));assert.ok(shell.isClosed());
 await app.evaluate(({app},url)=>app.emit('open-url',{preventDefault(){}},url+'/reopen'),url);
 rows=await wait(rows=>rows.some(t=>t.url===url+'/reopen'));const reopened=rows.find(t=>t.url===url+'/reopen');shell=app.windows().find(p=>p.url().startsWith('http:')&&!p.url().startsWith(fixture.origin));assert.ok(shell);await shell.locator('[data-tab-container="'+reopened.id+'"].selected').waitFor();
 await shell.getByRole('button',{name:'Home',exact:true}).click();await shell.locator('#home-screen .home-heading h1').waitFor();assert.equal(await shell.locator('#home-screen .home-heading h1').textContent(),'Proteus');assert.equal(await shell.locator('#home-browser-entry, #home-browser-query').count(),0);await shell.setViewportSize({width:1000,height:760});await shell.screenshot({path:'/private/tmp/proteus-browser-home-review.png'});
 console.log(JSON.stringify({homeBrandWithoutAddressEntry:true,passed:true,earlyOpen:true,warmOpen:true,secondInstance:true,repeatedURLsPreserved:true,backgroundReopen:true,noAgentGrants:true,credentialURLRejected:true}));
}finally{await app?.close();await fixture.cleanup();}
