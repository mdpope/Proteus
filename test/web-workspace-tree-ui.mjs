// Real tree module, colliding owner IDs, read-only synthetic catalogs, disposable browser.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium} from 'playwright';
const bundle=await build({stdin:{contents:"import {createWorkspaceTree} from './web/resources/js/workspace-tree.js';window.createWorkspaceTree=createWorkspaceTree",resolveDir:process.cwd()},bundle:true,write:false,format:'iife'});
const manifest=JSON.parse(fs.readFileSync('web/public/build/manifest.json'));const css=fs.readFileSync(path.join('web/public/build',manifest['resources/css/app.css'].file));
const server=http.createServer((req,res)=>{if(req.url==='/app.css'){res.setHeader('Content-Type','text/css');res.end(css);return;}res.setHeader('Content-Type',req.url==='/tree.js'?'text/javascript':'text/html');res.end(req.url==='/tree.js'?bundle.outputFiles[0].text:'<!doctype html><link rel="stylesheet" href="/app.css"><body class="web-desktop-shell" data-browser-account="synthetic" data-active-feature="workspaces"><div class="shell"><header class="shell-tabbar">Synthetic sidebar alignment acceptance</header><aside class="sidebar"><nav class="shell-navigation"><button id="shell-collapse-workspaces">Collapse all</button><div id="shell-recent-workspaces"></div></nav></aside><main class="shell-workspace"></main></div><script src="/tree.js"></script>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await chromium.launch({headless:true});const page=await browser.newPage();
 const mount=async()=>page.evaluate(()=>{window.calls=[];window.primary='a';window.statuses={a:{online:true,supported:true},b:{online:true,supported:true},old:{online:true,supported:false},offline:{online:false,supported:true}};window.tree=createWorkspaceTree({account:'synthetic',primaryHost:()=>primary,active:()=>window.activeTree,workspaces:()=>Object.keys(statuses).map(hostId=>({hostId,id:'shared',name:'Workspace '+hostId,hostName:hostId})),status:id=>statuses[id],projects:host=>host==='old'?[]:Array.from({length:9},(_,i)=>({id:'p'+i,workspaceId:'shared',name:'Manual '+i})),chats:host=>[{id:'same-chat',title:'Owner '+host,createdAt:'2026-10-18T00:00:00Z'}],request:async(host,method,args)=>{calls.push({host,method,args});return {revision:1,tabs:[{id:'chat:same-chat',type:'chat',chatId:'same-chat'},...Array.from({length:11},(_,i)=>({id:'tab'+i,type:i%2?'document':'browser',title:host+' item '+i,createdAt:new Date(2026,0,1+i).toISOString()}))]};},open:(row,item)=>{window.opened={row,item};}});tree.render();});
 await page.goto('http://127.0.0.1:'+server.address().port);await mount();
 assert.equal(await page.locator('#shell-recent-workspaces > [data-tree-host]').getAttribute('data-tree-host'),'a');
 assert.deepEqual(await page.locator('[data-tree-computer]').evaluateAll(nodes=>nodes.map(n=>n.dataset.treeComputer)),['b','old','offline']);
 assert.equal(await page.locator('.web-workspace-group>.web-group-heading .web-tree-computer').count(),0);
 await page.evaluate(()=>{window.activeTree={hostId:'b',id:'shared'};tree.render();});assert.equal(await page.locator('#shell-recent-workspaces > [data-tree-host]').getAttribute('data-tree-host'),'a');
 const owner=id=>page.locator(`[data-tree-host="${id}"]`),expand=id=>owner(id).locator(':scope > .web-group-heading [data-expand]').click(),project=id=>owner(id).locator('[data-tree-project=p0]');
 await expand('a');await project('a').locator('[data-expand]').click();await page.waitForFunction(()=>document.querySelectorAll('[data-tree-host=a] .web-tree-item').length===7);
 assert.equal(await owner('b').locator('[data-tree-project]').count(),0);
 // Production CSS must keep short project labels at the shallow left inset, not centered
 // by the app-wide button rule. Count/expander keep their right-hand columns at every width.
 for(const width of [190,230,260,460]){
  await page.setViewportSize({width:1440,height:1000});await page.evaluate(width=>document.body.style.setProperty('--web-sidebar-width',width+'px'),width);
  const geometry=await owner('a').evaluate(group=>{const rect=node=>node.getBoundingClientRect(),heading=group.querySelector('[data-tree-project=p0]>.web-group-heading'),button=heading.querySelector('[data-open]'),icon=button.querySelector('svg'),label=button.querySelector('span'),workspaceIcon=group.querySelector(':scope>.web-group-heading svg'),count=heading.querySelector('.web-tree-count'),expand=heading.querySelector('[data-expand]');return{inset:rect(icon).left-rect(button).left,shallow:rect(icon).left-rect(workspaceIcon).left,gap:rect(label).left-rect(icon).right,countAfter:rect(count).left>=rect(button).right-1,rightGap:rect(heading).right-rect(expand).right,overflow:rect(heading).right>rect(group).right};});
  assert.ok(geometry.inset>=9&&geometry.inset<=11,JSON.stringify({width,...geometry}));assert.ok(geometry.shallow>=0&&geometry.shallow<=6,JSON.stringify({width,...geometry}));assert.equal(geometry.gap,7);assert.equal(geometry.countAfter,true);assert.equal(geometry.rightGap,0);assert.equal(geometry.overflow,false);
  if(width===260)await page.screenshot({path:'/private/tmp/proteus-web-project-alignment-260.png'});
 }
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{document.body.style.setProperty('--web-sidebar-width','260px');document.body.classList.add('web-compact-sidebar','web-sidebar-overlay-open');});
 assert.equal(await project('a').locator('[data-open]').evaluate(node=>getComputedStyle(node).justifyContent),'flex-start');await page.screenshot({path:'/private/tmp/proteus-web-project-alignment-mobile.png'});
 await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>document.body.classList.remove('web-compact-sidebar','web-sidebar-overlay-open'));

 assert.deepEqual(await owner('a').locator('[data-tree-project] > .web-group-heading [data-open] span').allTextContents(),Array.from({length:7},(_,i)=>'Manual '+i));
 await project('a').locator('.web-tree-more').click();assert.equal(await project('a').locator('.web-tree-item').count(),11);
 await owner('a').locator(':scope > .web-tree-more').click();assert.equal(await owner('a').locator('[data-tree-project]').count(),9);
 await expand('a');await expand('a');assert.equal(await project('a').locator('.web-tree-item').count(),7);assert.equal(await owner('a').locator('[data-tree-project]').count(),7);
 await expand('b');await project('b').locator('[data-expand]').click();await project('b').locator('[data-tree-item="tab10"]').click();assert.equal(await page.evaluate(()=>opened.row.hostId),'b');
 await page.locator('[data-other-computers]').click();assert.equal(await owner('b').isVisible(),false);assert.equal(await owner('a').isVisible(),true);
 await page.reload();await mount();assert.equal(await page.locator('[data-other-computers]').getAttribute('aria-expanded'),'false');await page.locator('[data-other-computers]').click();assert.equal(await project('b').locator('.web-tree-item').count(),7);
 await page.evaluate(()=>{document.body.dataset.activeFeature='engine-room';tree.render();});assert.equal(await project('a').locator('.web-tree-item').count(),7);assert.equal(await project('b').locator('.web-tree-item').count(),7);
 await page.reload();await mount();await page.waitForFunction(()=>document.querySelectorAll('[data-tree-host=a] .web-tree-item').length===7);assert.equal(await project('b').locator('.web-tree-item').count(),7);
 await expand('old');assert.equal(await owner('old').locator('.web-tree-count').textContent(),'—');assert.match(await owner('old').innerText(),/Update this computer/);
 await expand('offline');assert.match(await owner('offline').innerText(),/Computer offline/);assert.equal(await page.evaluate(()=>calls.some(c=>c.host==='offline'||c.host==='old')),false);
 assert.equal(await page.evaluate(()=>calls.every(c=>c.method==='tabs.get'&&c.args.scope==='project')),true);
 await page.locator('#shell-collapse-workspaces').click();assert.equal(await page.locator('[data-tree-project]').count(),0);await page.reload();await mount();assert.equal(await page.locator('[data-tree-project]').count(),0);
 await page.evaluate(()=>{window.primary=null;tree.render();});assert.equal(await page.locator('#shell-recent-workspaces > [data-tree-host]').count(),0);assert.equal(await page.locator('[data-tree-computer]').count(),4);
 await page.evaluate(()=>{window.primary='b';tree.render();});assert.equal(await page.locator('#shell-recent-workspaces > [data-tree-host]').getAttribute('data-tree-host'),'b');assert.equal(await page.locator('[data-tree-computer=b]').count(),0);
 await page.evaluate(()=>{window.primary='a';tree.render();});await page.screenshot({path:'/private/tmp/proteus-web-other-computers-260.png'});
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.body.classList.add('web-compact-sidebar','web-sidebar-overlay-open'));await page.screenshot({path:'/private/tmp/proteus-web-other-computers-mobile.png'});
 console.log('PASS stable default-first owner grouping, named Other Computers, independent retained group/child expansion, no default fallback guessing,  owner-separated tree, manual catalog order, 7/+4 paging, nested collapse reset, retained expansion across features/reload, old/offline explanations, read-only inventory');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
