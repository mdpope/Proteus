// Synthetic owner protocol; browser-engine/layout evidence, not physical iPhone acceptance.
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {build} from 'esbuild';import {chromium,webkit} from 'playwright';
const bundle=await build({stdin:{contents:"import {createWebWorkspaces} from './web/resources/js/workspaces.js';window.createWebWorkspaces=createWebWorkspaces",resolveDir:process.cwd()},bundle:true,write:false,outdir:'/private/tmp/unused-web-fixture',format:'iife'});
const js=bundle.outputFiles.find(f=>f.path.endsWith('.js')).text,css=bundle.outputFiles.find(f=>f.path.endsWith('.css')).text;
const manifest=JSON.parse(fs.readFileSync('web/public/build/manifest.json')),appCSS=fs.readFileSync(path.join('web/public/build',manifest['resources/css/app.css'].file));
const server=http.createServer((req,res)=>{const entries={'/fixture.js':['text/javascript',js],'/fixture.css':['text/css',css],'/app.css':['text/css',appCSS],'/markdown.js':['text/javascript',fs.readFileSync('public/markdown/runtime.js')],'/markdown.css':['text/css',fs.readFileSync('public/markdown/style.css')]};const item=entries[req.url];if(item){res.setHeader('content-type',item[0]);res.end(item[1]);return;}res.setHeader('content-type','text/html');res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><link rel="stylesheet" href="/fixture.css"><link rel="stylesheet" href="/markdown.css"><style>body{margin:0}#main{height:100dvh;min-width:0;overflow:auto}[data-workspace-page]{height:calc(100% - 56px);min-height:0}[data-workspace-content]{height:calc(100% - 60px);min-height:0}</style><main id="main"></main><script src="/markdown.js"></script><script src="/fixture.js"></script>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
const results=[];
try{for(const [name,engine,width,height]of [['chromium',chromium,1440,1000],['webkit-phone',webkit,390,844],['webkit-tablet',webkit,1024,1366]]){
 const browser=await engine.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(origin);
 await page.evaluate(async()=>{
  window.calls=[];window.notices=[];window.releaseA=null;window.ownerFileTabs={};
  const context={revision:'r1',workspaces:[{id:'a',name:'Synthetic A',cwd:'/synthetic/a'},{id:'b',name:'Synthetic B',cwd:'/synthetic/b'}]},catalog={revision:1,projects:[],memberships:{},defaultProjectIds:{}};
  const owner={host:{hostId:'owner',label:'Synthetic owner'},client:{status:'online'},state:{context,workspaceProjects:catalog,capabilities:['projects.v1','workspace.files.v1','workspace.files.tabs.v1']}};
  const rows=Array.from({length:200},(_,i)=>({name:i===0?'note.md':i===1?'pixel.png':i===2?'fixture.pdf':'file-'+i+'.txt',path:i===0?'note.md':i===1?'pixel.png':i===2?'fixture.pdf':'file-'+i+'.txt',kind:i===0?'markdown':i===1?'image':'file',type:i===0?'markdown':i===1?'image':'TXT',size:100,fileCreatedAt:'2026-11-05T00:00:00Z',fileModifiedAt:'2026-11-05T01:00:00Z'}));
  const ui={account:'synthetic',sessions:new Map([['owner',owner]]),hosts:new Map([['owner',owner.host]]),defaultHost:()=>null,rows:()=>[],escape:v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),notify:text=>notices.push(text),preserve:()=>{},connect:async()=>{},setView:key=>document.dispatchEvent(new CustomEvent('proteus:section',{detail:{key}})),render:()=>window.workspaceUI.render(document.querySelector('#main')),renderIndex:target=>target.textContent='Synthetic chat index',request:async(_owner,method,args)=>{
   calls.push({method,args});
   if(method==='context.get'){if(window.delayA&&args.workspaceId==='a')await new Promise(resolve=>window.releaseA=resolve);return context;}
   if(method==='projects.get')return catalog;
   if(method==='tabs.get')return {scope:args.scope,id:args.id,revision:1,tabs:ownerFileTabs[args.id]||[]};
   if(method==='files.open'){const tabs=ownerFileTabs[args.scopeId]||=[];let tab=tabs.find(tab=>tab.workspaceFile.file===args.file);if(!tab){const documentId=(tabs.length+1).toString(16).padStart(64,'0');tab={id:'document:'+documentId,documentId,type:'document',title:args.file,workspaceFile:{rootId:args.rootId,file:args.file,title:args.file}};tabs.push(tab);}return {scope:args.scope,id:args.scopeId,revision:tabs.length+1,tabs,tabId:tab.id};}
   if(method==='files.roots')return {canWrite:window.allowEdit===true,roots:[{id:'root-'+args.workspaceId,name:'Synthetic folder',path:'/synthetic/'+args.workspaceId,available:true}]};
   if(method==='files.browse')return {root:{name:'Synthetic folder'},directory:'',entries:rows.filter(row=>!args.query||row.name.includes(args.query)),nextOffset:null,scanLimited:false};
   if(method==='files.pdf')return {dataURL:'data:application/pdf;base64,'+btoa('%PDF-1.4\nsynthetic protocol fixture')};
   if(method==='files.resolve-link')return args.image?{dataURL:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII='}:{path:'next.md',name:'next.md',kind:'markdown'};
   if(method==='files.preview')return {file:'/synthetic/'+args.file,rootId:args.rootId,relativePath:args.file,title:args.file,mediaType:args.file.endsWith('.pdf')?'application/pdf':args.file.endsWith('.png')?'image/png':'text/markdown',dataURL:args.file.endsWith('.png')?'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=':undefined,content:'---\nstatus: synthetic\n---\n# Preview\n\n[[next|Next note]]\n\n![[pixel.png]]'};
   throw Error('Unexpected '+method);
  }};
  window.workspaceUI=createWebWorkspaces(ui);await workspaceUI.enter({hostId:'owner',id:'a'},'files');
 });
 await page.locator('[data-row]').filter({hasText:'note.md'}).waitFor();
 assert.equal(await page.locator('tbody tr').count(),200);assert.equal(await page.getByRole('button',{name:'New file',exact:true}).isDisabled(),true);if(width<650)assert.equal(await page.locator('.file-divider').isVisible(),false);
 assert.equal(await page.evaluate(()=>calls.filter(c=>c.method==='tabs.get').length),1,'Do not fetch every project history on workspace entry');
 const frames=await page.locator('.file-browser-list').evaluate(async node=>{const intervals=[];let before=performance.now();for(let i=0;i<45;i++)await new Promise(resolve=>requestAnimationFrame(now=>{intervals.push(now-before);before=now;node.scrollTop+=30;resolve();}));node.scrollTop=0;return intervals.sort((a,b)=>a-b);});
 await page.locator('[data-row]').filter({hasText:'note.md'}).click();await page.locator('aside .md-properties').waitFor();
 await page.getByRole('button',{name:'Open in tab',exact:true}).click();await page.locator('.markdown-preview .md-properties').waitFor();await page.locator('.markdown-preview img').waitFor();assert.equal(await page.getByRole('button',{name:'New file',exact:true}).count(),0);
 await page.getByRole('link',{name:'Next note',exact:true}).click();await page.getByRole('heading',{name:'next.md',exact:true}).waitFor();
 const saved=await page.evaluate(()=>localStorage.getItem('proteus.workspace-view.v1.synthetic'));assert.ok(!saved.includes('# Preview'));assert.ok(!saved.includes('data:image/'));assert.ok(saved.includes('next.md'));
 await page.evaluate(()=>workspaceUI.selectWorkspace('files'));await page.locator('[data-row]').filter({hasText:'pixel.png'}).click();await page.locator('aside img').waitFor();
 await page.getByRole('button',{name:'Open in tab',exact:true}).click();await page.locator('.file-image-preview').waitFor();
 await page.evaluate(()=>workspaceUI.selectWorkspace('files'));await page.locator('[data-row]').filter({hasText:'fixture.pdf'}).click();await page.waitForFunction(()=>document.querySelector('aside iframe')?.src.startsWith('blob:'));await page.getByRole('button',{name:'Open in tab',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.markdown-preview iframe')?.src.startsWith('blob:'));assert.equal(await page.evaluate(()=>calls.filter(c=>c.method==='files.pdf').length),2);
 await page.evaluate(()=>document.dispatchEvent(new CustomEvent('proteus:section',{detail:{key:'engine-room'}})));assert.equal(await page.locator('.file-image-preview').count(),0);
 const before=await page.evaluate(()=>calls.length);await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>calls.length),before,'No idle polling or hidden preview fetches');
 await page.evaluate(async()=>{window.delayA=true;window.first=workspaceUI.enter({hostId:'owner',id:'a'},'files');});await page.waitForFunction(()=>!!releaseA);
 await page.evaluate(()=>workspaceUI.enter({hostId:'owner',id:'b'},'files'));await page.waitForFunction(()=>workspaceUI.active.id==='b');await page.evaluate(async()=>{releaseA();await first;});assert.equal(await page.evaluate(()=>workspaceUI.active.id),'b');
 await page.locator('[data-row]').filter({hasText:'note.md'}).waitFor();assert.equal(await page.locator('#main').evaluate(node=>node.scrollWidth<=node.clientWidth),true);
 assert.deepEqual(errors,[]);assert.deepEqual(await page.evaluate(()=>notices),[]);
 results.push({engine:name,width,rows:200,frameMedianMs:Number(frames[Math.floor(frames.length*.5)].toFixed(2)),frameP95Ms:Number(frames[Math.floor(frames.length*.95)].toFixed(2)),idleRequests:0,fileTabs:true,staleNavigationIgnored:true});
 }finally{await browser.close();}
}console.log(JSON.stringify({passed:true,synthetic:true,physicalIOS:false,results}));}finally{await new Promise(resolve=>server.close(resolve));}
