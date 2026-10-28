// External application links ask then open, and OAuth callbacks to a local
// loopback server receive their exact query or form post like a real browser.
import {_electron as electron} from 'playwright';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';
const until=async(fn,label)=>{for(let i=0;i<200;i++){if(await fn())return;await new Promise(resolve=>setTimeout(resolve,50));}throw Error('Timeout: '+label);};
const home=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-external-links-')));
fs.writeFileSync(path.join(home,'settings.json'),JSON.stringify({schemaVersion:1,provider:'rehearsal',model:'',timezone:'UTC',workspace:{cwd:home,additionalDirectories:[]},skillDirectories:[],mcpServers:{}}));
const callbacks=[];const callback=http.createServer((req,res)=>{let body='';req.on('data',chunk=>{body+=chunk;});req.on('end',()=>{callbacks.push({method:req.method,url:req.url,body});res.setHeader('Content-Type','text/html');res.end('<title>Callback</title>Auth code was successfully acquired.');});});
await new Promise(resolve=>callback.listen(0,'127.0.0.1',resolve));const callbackOrigin='http://127.0.0.1:'+callback.address().port;
const server=http.createServer((req,res)=>{
 if(req.url==='/authorize'){res.writeHead(302,{Location:callbackOrigin+'/oauth/callback?code=abc123&state=xyz'});res.end();return;}
 res.setHeader('Content-Type','text/html');
 if(req.url==='/formpost'){res.end(`<!doctype html><form method="post" action="${callbackOrigin}/oauth/post"><input name="code" value="def456"><input name="state" value="uvw"></form><script>document.forms[0].submit()</script>`);return;}
 res.end('<!doctype html><title>Meeting</title><a id="zoom" href="zoommtg://zoom.us/join?confno=123">Launch meeting</a><a id="script" href="file:///etc/hosts">Local file</a>');
});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const site='http://127.0.0.1:'+server.address().port;let app;
try{
 app=await electron.launch({args:['.','--use-mock-keychain','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,COPILOT_HOME:path.join(home,'copilot'),PORT:'0'},timeout:60000});const page=await app.firstWindow();page.setDefaultTimeout(15000);
 await page.route('**/api/team/lists',route=>route.fulfill({json:{identity:{accountId:'fixture',workspaceId:'1'},teamLists:[]}}));
 await page.locator('#tab-add-menu summary').waitFor();await page.waitForLoadState('load');
 // Record instead of launching real applications or showing a blocking dialog.
 await app.evaluate(({app,dialog,shell})=>{globalThis.externalPrompts=[];globalThis.externalOpened=[];const name=app.getApplicationNameForProtocol.bind(app);app.getApplicationNameForProtocol=url=>String(url).startsWith('zoommtg:')?'zoom.us':name(url);dialog.showMessageBox=async(_parent,options)=>{globalThis.externalPrompts.push(options);return {response:0,checkboxChecked:false};};shell.openExternal=async url=>{globalThis.externalOpened.push(url);};});
 const tab=await page.evaluate(url=>window.desktop.browser({action:'create',url}),site+'/meeting');await page.locator(`[data-tab="${tab.id}"]`).click();
 const run=(source)=>app.evaluate(({app},{id,source})=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().get(id).view.webContents.executeJavaScript(source),{id:tab.id,source});
 const url=()=>app.evaluate(({app},id)=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().get(id).view.webContents.getURL(),tab.id);
 await until(async()=>(await run('document.readyState'))==='complete','meeting page');
 await run("document.getElementById('zoom').click()");
 await until(()=>app.evaluate(()=>globalThis.externalOpened.length===1),'zoom link opened');
 const prompts=await app.evaluate(()=>globalThis.externalPrompts),opened=await app.evaluate(()=>globalThis.externalOpened);
 assert.equal(prompts.length,1);assert.equal(prompts[0].message,'Open zoom.us?');assert.match(prompts[0].checkboxLabel,/Always allow 127\.0\.0\.1/);
 assert.deepEqual(opened,['zoommtg://zoom.us/join?confno=123']);assert.equal(await url(),site+'/meeting','The page stays where it was');
 await run("document.getElementById('script').click()");await new Promise(resolve=>setTimeout(resolve,300));{const all=await app.evaluate(()=>globalThis.externalPrompts.map(item=>item.message));assert.deepEqual(all,['Open zoom.us?'],'file: is never offered to another app');}
 // OAuth authorization redirect to a loopback callback keeps the exact code and state.
 await app.evaluate(({app},{id,url})=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().get(id).view.webContents.loadURL(url),{id:tab.id,url:site+'/authorize'});
 await until(()=>callbacks.some(item=>item.url.startsWith('/oauth/callback')),'redirect callback');
 assert.equal(callbacks.find(item=>item.url.startsWith('/oauth/callback')).url,'/oauth/callback?code=abc123&state=xyz');
 await until(async()=>(await url())===callbackOrigin+'/oauth/callback?code=abc123&state=xyz','tab shows callback page');
 // response_mode=form_post delivers the form body to the loopback server.
 await app.evaluate(({app},{id,url})=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().get(id).view.webContents.loadURL(url),{id:tab.id,url:site+'/formpost'});
 await until(()=>callbacks.some(item=>item.url==='/oauth/post'),'form post callback');
 const post=callbacks.find(item=>item.url==='/oauth/post');assert.equal(post.method,'POST');assert.equal(post.body,'code=def456&state=uvw');
 console.log(JSON.stringify({prompt:prompts[0].message,opened,callbacks:callbacks.map(item=>({method:item.method,url:item.url,body:item.body}))}));
}finally{await app?.close();server.close();callback.close();fs.rmSync(home,{recursive:true,force:true});}
