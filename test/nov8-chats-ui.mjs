import {chromium,webkit,_electron as electron} from 'playwright';
import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const root=path.resolve(import.meta.dirname,'..');
const rows=Array.from({length:240},(_,i)=>({id:'synthetic-'+i,chatId:'synthetic-'+i,title:'Synthetic chat '+i,hostId:'local',hostLabel:'Fixture computer',destinationName:'Fixture computer',provider:'codex',model:'gpt-6.1-sol',reasoningEffort:'high',serviceTier:'priority',status:'completed',local:true,updatedAt:new Date(1794000000000-i*1000).toISOString()}));
const server=http.createServer(async(req,res)=>{try{if(req.url==='/'){res.setHeader('content-type','text/html');res.end('<meta name="viewport" content="width=device-width"><style>html,body{height:100%;margin:0}#remote-content{height:100%;box-sizing:border-box;padding:20px}button{font:inherit}*{box-sizing:border-box}</style><link rel="stylesheet" href="/public/proteus-theme.css"><link rel="stylesheet" href="/web/resources/css/remote.css"><div id="remote-content"></div>');return;}const file=path.join(root,req.url);if(!file.startsWith(root+path.sep))throw Error();res.setHeader('content-type',file.endsWith('.css')?'text/css':'text/javascript');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
async function showDesktopRows(page,rows){
 await page.evaluate(async rows=>{
  const {initChatsIndex,loadChatsIndex,renderChatsIndex}=await import('/features/chats/chats-index.js');
  initChatsIndex({state:{data:{runs:[],settings:{timezone:'America/Denver'}}},api:async()=>({items:rows,hosts:[],partial:false}),escape:v=>String(v??''),time:v=>v,toast(){}});
  await loadChatsIndex();renderChatsIndex(false,false);
 },rows);
}
async function showWebRows(page,rows){
 await page.evaluate(async rows=>{
  const {renderChatIndex}=await import('/web/resources/js/chats-index.js');
  renderChatIndex(document.querySelector('#remote-content'),{rows,hosts:[],escape:v=>String(v??''),time:v=>v,open(){},refresh(){},loadMore(){}});
 },rows);
}
async function verifyDashboard(page,showRows){
 const now=Date.now(), hour=3600000, at=hours=>new Date(now-hours*hour).toISOString();
 const operations=[['Finished fixture','completed',0],['Old failure','failed',75],['Old interruption','interrupted',76],
  ['Old question','awaiting_input',77],['New question','awaiting_input',1],['New failure','failed',71],['Aging question','awaiting_input',72-2500/hour]];
 await showRows(page,operations.map(([title,status,hours],i)=>({...rows[i],title,status,updatedAt:at(0),operation:{actionAt:at(hours)}})));
 const area=page.locator('#chat-index-rows');
 const active=area.locator('.ops-bucket-active .ops-row');
 const recent=area.locator('.ops-bucket-finished .ops-row');
 const stale=page.locator('.ops-categories [data-id=stale]');
 const aging=area.locator('.ops-row[title="Aging question"]');
 await aging.waitFor();
 assert.equal(await active.count(),3);
 assert.equal(await recent.locator('[data-field=status]').filter({hasText:'Stale'}).count(),3);
 assert.equal(await area.locator('.ops-bucket-finished [title="Old question"] [data-field=action]').textContent(),'Needs you');
 await area.locator('.ops-bucket-finished [title="Aging question"]').waitFor();
 assert.equal(await stale.locator('.ops-control-detail').textContent(),'4');
 assert.equal(await active.count(),2);
 const finished=area.locator('.ops-bucket-finished [title="Finished fixture"]');
 const metrics=()=>finished.evaluate(row=>({width:row.getBoundingClientRect().width,size:parseFloat(getComputedStyle(row.querySelector('strong')).fontSize),
  titleColor:getComputedStyle(row.querySelector('strong')).color,color:getComputedStyle(row).color,statusColor:getComputedStyle(row.querySelector('.ops-status')).color}));
 const normal=await metrics();
 assert.equal(normal.titleColor,normal.color);
 assert.notEqual(normal.statusColor,normal.titleColor);
 const slider=page.getByRole('slider',{name:'Card size'});
 await slider.fill('200');
 const large=await metrics();
 assert.equal(large.size,normal.size*2);
 assert.ok(large.width>normal.width);
 await stale.click();
 assert.equal(await area.locator('.ops-row').count(),4);
 await page.locator('.ops-layout [data-id=table]').click();
 const tableSlider=page.getByRole('slider',{name:'Table size'});
 await tableSlider.fill('150');
 await page.getByRole('button',{name:'Reset table size to 100%'}).click();
 assert.equal(await tableSlider.inputValue(),'100');
 assert.equal(await area.locator('.ops-bucket-finished .ops-table-header').isVisible(),true);
 await page.locator('.ops-layout [data-id=cards]').click();
 assert.equal(await slider.inputValue(),'200');
 await area.dispatchEvent('wheel',{ctrlKey:true,deltaY:45});
 assert.ok(Number(await slider.inputValue())<160);
 await page.locator('#chat-index-clear').click();
 await page.getByRole('button',{name:'Reset card size to 100%'}).click();
 assert.equal(await slider.inputValue(),'100');
}
async function verify(page,label){
 await page.locator('#chat-index-rows button').first().waitFor();assert.equal(await page.locator('#chat-index-more').count(),0);
 const area=page.locator('#chat-index-rows');assert.equal(await area.locator('button').count(),100);
 assert.match(await area.locator('button').first().textContent(),/gpt-6.1-sol/);assert.match(await area.locator('button').first().textContent(),/high · priority/);
 const first=await area.locator('button').first().elementHandle();
 const query=page.locator('#chat-index-query');
 assert.deepEqual(await page.locator('.ops-topbar').first().locator('h1,[role=tab]').allTextContents(),['Chats','All operations','User chats','Scheduled tasks','Internet searches']);
 assert.equal(await area.locator('.ops-bucket-finished .ops-bucket-count').textContent(),'/ 240');
 assert.equal(await page.locator('.ops-categories [data-id=finished] .ops-control-detail').textContent(),'240');
 assert.equal(await area.locator('.ops-row').first().evaluate(row=>getComputedStyle(row).borderInlineStartWidth),'3px');
 await query.fill('Synthetic chat 0');
 await page.locator('.ops-layout [data-id=table]').click();
 assert.equal(await query.inputValue(),'Synthetic chat 0');
 assert.equal(await area.getAttribute('data-layout'),'table');
 assert.equal(await area.locator('button').count(),1);
 assert.deepEqual(await area.locator('.ops-bucket-finished .ops-table-header span').allTextContents(),['Chat / current action','Status','Computer','Provider / model','Runtime','Input tokens','Output tokens','Activity']);
 assert.ok(await area.locator('.ops-bucket-finished .ops-table-header').isVisible());
 assert.equal(await area.locator('.ops-bucket-finished').evaluate(section=>{
  const header=section.querySelector('.ops-table-header'),row=section.querySelector('.ops-row');
  return getComputedStyle(header).gridTemplateColumns===getComputedStyle(row).gridTemplateColumns;
 }),true,'Headers and rows share column widths.');
 assert.equal(await first.evaluate(node=>node.isConnected),true,'Switching layout keeps the selected row identity.');
 await page.locator('#chat-index-clear').click();
 assert.equal(await query.inputValue(),'');
 assert.equal(await area.getAttribute('data-layout'),'table');
 await page.locator('.ops-layout [data-id=cards]').click();
 assert.equal(await area.locator('button').count(),100);
 const activeColumns=area.locator('.ops-bucket-finished .ops-items');
 if(label!=='electron')assert.ok(await activeColumns.evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length>=3));
 if(label==='electron'){
  // N11-09 desktop contract: #main is the single scrolling surface; the list is not a nested scroller.
  const layout=await area.evaluate(el=>({nested:el.scrollHeight>el.clientHeight+1,overflow:getComputedStyle(el).overflowY,main:document.querySelector('#main').scrollHeight>document.querySelector('#main').clientHeight}));
  assert.deepEqual(layout,{nested:false,overflow:'visible',main:true},label+' page-level scrolling');
  await page.evaluate(()=>{const main=document.querySelector('#main');main.scrollTop=main.scrollHeight;});await page.waitForTimeout(200);assert.equal(await area.locator('button').count(),200,label+' progressive rows');
 }else{
 const original=page.viewportSize();await page.setViewportSize({width:1024,height:original.height});
 const before=await area.evaluate(el=>({height:el.clientHeight,bottom:el.getBoundingClientRect().bottom,viewport:innerHeight}));assert.ok(before.height>100,label+' usable list');assert.ok(before.bottom<=before.viewport+1,label+' list fits');
 await page.locator('.chat-index-filter-panel summary').click();assert.ok(await area.evaluate(el=>el.clientHeight)>before.height,label+' hiding filters adds height');
 await page.locator('.chat-index-filter-panel summary').click();
 await page.setViewportSize(original);
 await area.evaluate(el=>el.scrollTop=el.scrollHeight);await page.waitForTimeout(200);assert.equal(await area.locator('button').count(),200,label+' progressive rows');
 }
 await page.screenshot({path:'/Users/developer/Source/ProteusWorkspace/nov8-chats-'+label+'.png'});
}
try{for(const [name,driver]of [['chromium',chromium],['webkit',webkit]]){const browser=await driver.launch();try{const page=await browser.newPage({viewport:{width:1440,height:900}});await page.goto(origin);await showWebRows(page,rows);await verify(page,name);
 const columns=()=>page.locator('.ops-bucket-finished .ops-items').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);
 await page.setViewportSize({width:1810,height:1000});assert.ok(await columns()>=4);
 await page.setViewportSize({width:2250,height:1000});assert.ok(await columns()>=6);
 await page.setViewportSize({width:390,height:844});assert.equal(await columns(),1);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.setViewportSize({width:1440,height:900});await verifyDashboard(page,showWebRows);}finally{await browser.close();}}
 const fixture=await sidebarFixture();let app;try{const executablePath=process.env.PROTEUS_TEST_EXECUTABLE;app=await electron.launch({executablePath,args:[...(executablePath?[]:['.']),'--use-mock-keychain'],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,CODEX_HOME:fixture.auth,PORT:'0'}});const page=await app.firstWindow();await page.locator('#topbar-home').waitFor();await page.waitForTimeout(1000);await showDesktopRows(page,rows);await verify(page,'electron');await verifyDashboard(page,showDesktopRows);}finally{await app?.close();await fixture.cleanup();}
 console.log('Passed Electron and Chromium/WebKit Cards/Table, progressive loading, live Stale transitions, Finished contrast and card sizing.');
}finally{await new Promise(resolve=>server.close(resolve));}
