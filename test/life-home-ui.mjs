import {_electron as electron} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import http from 'node:http';
const root=path.resolve(import.meta.dirname,'..'),home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-home-ui-'));
const html=`<!doctype html><meta charset="utf-8"><main></main><script type="module">
import {mountHome} from '/home.js';
window.calls=[];window.current=true;window.opened=null;let configured=false,allowed=[],state='off',drop=true;
const value=()=>({accountId:'synthetic',revision:'r1',configured,origin:configured?'http://automation.example.test.test:8123':'',allowed,entities:[{id:'light.office',name:'Office',state,domain:'light'},{id:'lock.door',name:'Door',state:'locked',domain:'lock'}],services:[...['turn_on','turn_off'].map(service=>({domain:'light',service,name:service,fields:[]})),{domain:'lock',service:'unlock',name:'Unlock',fields:[]}]});
window.view=mountHome(document.querySelector('main'),{configure:true,isCurrent:()=>current,openWebsite:async url=>{opened=url;},request:async args=>{
 calls.push(args);if(args.action==='configure'){configured=true;allowed=args.entities;return value();}
 if(args.action==='execute'){state='on';if(drop){drop=false;throw Error('Synthetic lost response.');}return {answer:'Office is on.'};}return value();
}});
</script>`;
const server=http.createServer((req,res)=>{if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end(html);}else if(req.url==='/home.js'){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(path.join(root,'public/features/tools/life-home.js')));}else{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
fs.writeFileSync(path.join(home,'main.cjs'),`const {app,BrowserWindow}=require('electron');app.whenReady().then(()=>{const win=new BrowserWindow({width:1100,height:900});win.loadURL('http://127.0.0.1:${server.address().port}');});app.on('window-all-closed',()=>app.quit());`);
let app;try{
 app=await electron.launch({args:[path.join(home,'main.cjs'),'--user-data-dir='+path.join(home,'data')],cwd:root});const page=await app.firstWindow(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.getByLabel('Home Assistant address',{exact:true}).fill('http://automation.example.test.test:8123');await page.getByLabel('Home Assistant access token',{exact:true}).fill('synthetic-secret');await page.getByRole('button',{name:'Connect Home Assistant',exact:true}).click();
 assert.equal(await page.getByRole('checkbox').count(),0);await page.getByRole('button',{name:'Control Door',exact:true}).click();assert.equal(await page.getByLabel('Home Assistant service',{exact:true}).inputValue(),'lock.unlock');
 await page.getByRole('button',{name:'On',exact:true}).click();await page.getByRole('status').filter({hasText:'Synthetic lost response'}).waitFor();await page.getByRole('button',{name:'On',exact:true}).click();await page.getByRole('status').filter({hasText:'Office is on.'}).waitFor();
 const commands=await page.evaluate(()=>calls.filter(x=>x.action==='execute'));assert.equal(commands.length,2);assert.equal(commands[0].operationId,commands[1].operationId);assert.equal(await page.getByLabel('Home Assistant access token',{exact:true}).inputValue(),'');
 await page.getByRole('button',{name:'Open Home Assistant',exact:true}).click();assert.equal(await page.evaluate(()=>opened),'http://automation.example.test.test:8123');
 const before=await page.evaluate(()=>calls.length);await page.evaluate(()=>{current=false;});await page.getByRole('button',{name:'Off',exact:true}).click();assert.equal(await page.evaluate(()=>calls.length),before);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,checks:['connection','secret field cleared','all domains and no allowlist','same command identity on retry','dashboard link','account guard']}));
}finally{await app?.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(home,{recursive:true,force:true});}
