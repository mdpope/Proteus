// Disposable native renderer; synthetic history and pairing code only.
import {_electron as electron} from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {publicAssets} from '../src/shared/public-assets.js';
const root=process.cwd(),home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-ask-ui-')),assets=publicAssets(path.join(root,'public'));
const html=`<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/life.css"><style>body{padding:24px}#main{height:auto}</style><main id="main"></main><script type="module">
import {renderLifeAsk} from '/features/tools/life-ask.js';
import {renderRemote} from '/services/remote/remote.js';
import {mountLifeAsk} from '/web-life-ask.js';
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
window.calls=[];window.opened=[];window.errors=[];const owner={section:'ask'};
let ask={settings:{enabled:false,configured:true,model:'synthetic-model',reasoningEffort:'medium'},revision:'one',models:[{id:'synthetic-model',name:'Synthetic model',controls:{reasoningEfforts:['low','medium']}}],items:[{requestId:'request',chatId:'synthetic-chat',title:'Synthetic question',summary:'A synthetic answer.',state:'answered',times:{admittedAt:Date.now()}}]};
const remote={status:'online',enabled:true,label:'Synthetic owner',mode:'external',port:4318,relayURL:'wss://synthetic.invalid',publicURL:'wss://synthetic.invalid',addresses:[],computerAccess:{managed:false,revision:'one'},workspaces:[],devices:[{id:'synthetic-omi',name:'Synthetic Mnemosyne',scope:'mnemosyne.ask',online:true,pairedAt:new Date().toISOString()}]};
const api=async(route,value)=>{if(value)calls.push({route,value});if(route==='/api/life/ask'){if(value)ask={...ask,settings:{...ask.settings,...value.settings},revision:'two'};return structuredClone(ask);}if(route==='/api/remote'){if(value?.action==='pair')return {code:'SYNTHETIC-NOT-A-PAIRING-KEY',qr:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>',expiresAt:Date.now()+300000};return remote;}if(route==='/api/computer-access')return remote.computerAccess;throw Error('Unexpected fixture route');};
const ui={api,escape,toast:message=>{if(!/saved/.test(message))errors.push(message);},openTab:tab=>opened.push(tab)};
window.askUI=()=>{document.querySelector('#main').innerHTML='<div id="ask"></div>';renderLifeAsk(document.querySelector('#ask'),{ui,owner,isCurrent:()=>true});};
window.connectionsUI=()=>renderRemote(ui);askUI();
window.webAskUI=()=>{document.querySelector('#main').innerHTML='<div id="ask"></div>';window.webView=mountLifeAsk(document.querySelector('#ask'),{accountID:'synthetic',escape,destinations:async()=>[{hostId:'owner',label:'Synthetic owner'},{hostId:'other',label:'Other account computer'}],request:async hostID=>({...ask,accountID:hostID==='owner'?'synthetic':'other-account',hostID,items:hostID==='owner'?ask.items:[{title:'MUST NOT DISPLAY'}]}),open:(hostID,chatID)=>opened.push({hostID,chatID})});};
</script>`;
const server=http.createServer((req,res)=>{if(req.url==='/'){res.setHeader('Content-Type','text/html');return res.end(html);}if(req.url==='/web-life-ask.js'){res.setHeader('Content-Type','text/javascript');return res.end(fs.readFileSync(path.join(root,'web/resources/js/life-ask.js')));}const asset=assets[req.url];if(!asset){res.writeHead(404);return res.end();}res.setHeader('Content-Type',asset[1]);res.end(fs.readFileSync(path.join(root,'public',asset[0])));});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
fs.writeFileSync(path.join(home,'main.cjs'),`const {app,BrowserWindow}=require('electron');app.whenReady().then(()=>{const w=new BrowserWindow({width:1200,height:960,webPreferences:{contextIsolation:true,nodeIntegration:false}});w.loadURL('http://127.0.0.1:${server.address().port}');});app.on('window-all-closed',()=>app.quit());`);
let app;const errors=[];
try{
 app=await electron.launch({args:[path.join(home,'main.cjs'),'--user-data-dir='+path.join(home,'electron')]});const page=await app.firstWindow();page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(10000);
 await page.getByRole('heading',{name:'Voice requests'}).waitFor();await page.getByLabel('Enable Life Ask on this computer').check();await page.getByRole('button',{name:'Save Ask settings'}).click();
 await page.waitForFunction(()=>calls.some(call=>call.route==='/api/life/ask'&&call.value.settings.enabled));
 await page.getByRole('button',{name:'Synthetic question',exact:true}).click();assert.equal(await page.evaluate(()=>opened[0].id),'synthetic-chat');
 await page.evaluate(()=>connectionsUI());await page.getByRole('button',{name:'Pair Mnemosyne (Life Ask only)',exact:true}).click();
 await page.getByRole('heading',{name:'Mnemosyne · Life Ask only'}).first().waitFor();
 assert.equal(await page.locator('[data-device-id="synthetic-omi"] input').count(),0);assert.equal(await page.locator('#remote-copy-web').count(),0);
 const pair=await page.evaluate(()=>calls.find(call=>call.value.action==='pair').value);assert.equal(pair.purpose,'life-ask');assert.equal(pair.management,undefined);
 await page.evaluate(()=>webAskUI());await page.getByText('This computer is signed in to a different Life account.').waitFor();assert.equal(await page.getByText('MUST NOT DISPLAY').count(),0);
 await page.getByRole('button',{name:'Synthetic question',exact:true}).click();assert.deepEqual(await page.evaluate(()=>opened.at(-1)),{hostID:'owner',chatID:'synthetic-chat'});
 await page.evaluate(()=>webView.close());assert.equal(await page.locator('#ask').innerText(),'');
 assert.deepEqual(errors,[]);assert.deepEqual(await page.evaluate(()=>errors),[]);
 console.log(JSON.stringify({passed:true,checks:['Ask settings','exact chat navigation','scoped pairing purpose','separate scoped device listing','no broad permission switches']}));
}finally{await app?.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(home,{recursive:true,force:true});}
