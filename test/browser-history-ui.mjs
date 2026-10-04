import {_electron as electron} from 'playwright';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import http from 'node:http';import assert from 'node:assert/strict';
const home=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-browser-history-')));const requests=[];
fs.writeFileSync(path.join(home,'settings.json'),JSON.stringify({schemaVersion:1,provider:'rehearsal',model:'',timezone:'UTC',workspace:{cwd:home,additionalDirectories:[]},skillDirectories:[],mcpServers:{}}));
const server=http.createServer((req,res)=>{requests.push({method:req.method,url:req.url});if(req.url==='/redirect'){res.writeHead(302,{Location:'/C'});res.end();return;}res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>History '+req.url+'</title><h1>'+req.url+'</h1><form method="post" action="/submitted"><input name="private" value=""><button>Submit</button></form>');});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const site='http://127.0.0.1:'+server.address().port;
let app,page;const errors=[];
const until=async fn=>{for(let i=0;i<150;i++){if(await fn())return;await new Promise(r=>setTimeout(r,100));}throw new Error('Condition timed out');};
const saved=()=>JSON.parse(fs.readFileSync(path.join(home,'desktop-workspace.json')));
const launch=async()=>{app=await electron.launch({args:['.','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,COPILOT_HOME:path.join(home,'copilot'),PORT:'0'},timeout:60000});page=await app.firstWindow();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));await page.locator('#new-chat').waitFor();};
const command=(action,id,extra={})=>page.evaluate(value=>window.desktop.browser(value),{action,id,...extra});
const inspect=(id,expr)=>app.evaluate(({app},{id,expr})=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().get(id).view.webContents.executeJavaScript(expr),{id,expr});
let id;
try{
 await launch();await page.locator('#browser').click();id=await page.locator('.tabitem.selected [data-tab]').getAttribute('data-tab');
 for(const suffix of ['/A','/B','/redirect'])await command('navigate',id,{url:site+suffix});
 // Intercept only the native popup in this disposable test to inspect real menu items.
 await app.evaluate(({Menu})=>{process.__historyMenus=[];const original=Menu.prototype.popup;process.__restoreHistoryPopup=()=>{Menu.prototype.popup=original;};Menu.prototype.popup=function(){process.__historyMenus.push(this);};});
 await until(()=>page.locator('#browser-back').isEnabled());
 const backBounds=await page.locator('#browser-back').boundingBox();await page.mouse.move(backBounds.x+backBounds.width/2,backBounds.y+backBounds.height/2);await page.mouse.down();
 await until(()=>app.evaluate(()=>process.__historyMenus.length===1));await page.mouse.up();
 assert.equal(await inspect(id,'location.pathname'),'/C');
 assert.deepEqual(await app.evaluate(()=>process.__historyMenus[0].items.map(item=>item.label)),['History /B','History /A']);
 await app.evaluate(()=>process.__historyMenus[0].items[1].click());await until(async()=>await inspect(id,'location.pathname')==='/A');
 await page.locator('#browser-forward').focus();await page.keyboard.press('ArrowDown');await until(()=>app.evaluate(()=>process.__historyMenus.length===2));
 assert.deepEqual(await app.evaluate(()=>process.__historyMenus[1].items.map(item=>item.label)),['History /B','History /C']);
 await app.evaluate(()=>process.__historyMenus[1].items[1].click());await until(async()=>await inspect(id,'location.pathname')==='/C');
 // A short click is ordinary Back; right-click exposes history without navigating.
 await page.locator('#browser-back').click();await until(async()=>await inspect(id,'location.pathname')==='/B');
 await page.locator('#browser-back').click({button:'right'});await until(()=>app.evaluate(()=>process.__historyMenus.length===3));assert.equal(await inspect(id,'location.pathname'),'/B');
 await command('forward',id);await until(async()=>await inspect(id,'location.pathname')==='/C');
 await app.evaluate(()=>process.__historyMenus[2].items[0].click());assert.equal(await inspect(id,'location.pathname'),'/C');
 await app.evaluate(()=>{process.__restoreHistoryPopup();delete process.__historyMenus;delete process.__restoreHistoryPopup;});
 await command('back',id);await until(async()=>await inspect(id,'location.pathname')==='/B');
 await inspect(id,"document.querySelector('input').value='PRIVATE_FORM_VALUE';true");await command('share',id,{shared:true});
 await until(()=>saved().tabs.find(t=>t.id===id)?.history?.index===1);
 const before=saved().tabs.find(t=>t.id===id);assert.deepEqual(before.history.entries.map(e=>e.url),['/A','/B','/C'].map(x=>site+x));assert.doesNotMatch(JSON.stringify(saved()),/PRIVATE_FORM_VALUE|pageState|postData|shared|owner/);
 await app.close();app=null;await launch();await page.locator('#browser-url').waitFor();id=await page.locator('.tabitem.selected [data-tab]').getAttribute('data-tab');await until(async()=>await inspect(id,'location.pathname')==='/B');
 assert.equal(await page.locator('#browser-share').getAttribute('aria-pressed'),'false');assert.equal(await inspect(id,"document.querySelector('input').value"),'');
 assert.equal(await page.locator('#browser-back').isEnabled(),true);assert.equal(await page.locator('#browser-forward').isEnabled(),true);
 await page.screenshot({path:'/private/tmp/proteus-browser-history-restored.png'});
 const content=await app.evaluate(async({app},id)=>(await process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().get(id).view.webContents.capturePage()).toPNG().toString('base64'),id);fs.writeFileSync('/private/tmp/proteus-browser-history-content.png',Buffer.from(content,'base64'));
 for(const [action,suffix] of [['back','/A'],['forward','/B'],['forward','/C']]){await command(action,id);await until(async()=>await inspect(id,'location.pathname')===suffix);}
 // Same-document URLs retain their own position without storing JS history.state.
 await inspect(id,"history.pushState({private:'PRIVATE_JS_STATE'},'', '/C#part');true");await until(()=>saved().tabs.find(t=>t.id===id)?.history?.entries.at(-1).url===site+'/C#part');assert.doesNotMatch(JSON.stringify(saved()),/PRIVATE_JS_STATE/);
 // A submitted page may be revisited as a GET; a restart must never replay its POST body.
 await inspect(id,"document.querySelector('input').value='PRIVATE_POST_BODY';document.querySelector('form').submit();true");await until(async()=>await inspect(id,'location.pathname')==='/submitted');await until(()=>saved().tabs.find(t=>t.id===id)?.url===site+'/submitted');
 const postCount=requests.filter(r=>r.method==='POST').length;assert.equal(postCount,1);assert.doesNotMatch(JSON.stringify(saved()),/PRIVATE_POST_BODY|pageState/);
 await app.close();app=null;await launch();await page.locator('#browser-url').waitFor();id=await page.locator('.tabitem.selected [data-tab]').getAttribute('data-tab');await until(async()=>await inspect(id,'location.pathname')==='/submitted');assert.equal(requests.filter(r=>r.method==='POST').length,postCount);assert.ok(requests.some(r=>r.method==='GET'&&r.url==='/submitted'));
 // Malicious restore descriptors cannot navigate to the privileged app origin or restore authority.
 const origin=new URL(page.url()).origin;const bad=await command('create',null,{restore:true,url:origin,history:{index:1,entries:[{url:site+'/A',title:'A',pageState:'PRIVATE'},{url:origin,title:'App'}]},shared:true,owner:'run'});assert.equal(bad.url,'');assert.equal(bad.shared,false);assert.equal(bad.owner,null);await command('close',bad.id);
 const legacy=await command('create',null,{restore:true,url:site+'/legacy'});assert.equal(legacy.url,site+'/legacy');await command('close',legacy.id);
 const agent=await app.evaluate(async({app},id)=>{const browser=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();await browser.command({action:'share',id,shared:true});return browser.agent({action:'list'},'synthetic-run');},id);assert.ok(agent.length);assert.ok(agent.every(info=>!('history' in info)));
 await command('close',id);await until(()=>saved().tabs.every(t=>t.type!=='browser'));assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,checks:13,screenshot:'/private/tmp/proteus-browser-history-restored.png'}));
}catch(error){console.error(JSON.stringify({message:error.message,errors,buttons:await page?.locator('.browserbar').innerHTML().catch(()=>''),state:await app?.evaluate(({app})=>{const b=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();return {active:b.active,menus:process.__historyMenus?.length,tabs:b.list()};}).catch(()=>null)}));throw error;}finally{if(app)await app.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(home,{recursive:true,force:true});}
