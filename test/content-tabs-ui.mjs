import {_electron as electron} from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const home=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-content-tabs-'))),workspace=path.join(home,'workspace');fs.mkdirSync(workspace);
fs.writeFileSync(path.join(home,'settings.json'),JSON.stringify({schemaVersion:1,provider:'rehearsal',model:'',timezone:'UTC',workspace:{cwd:workspace,additionalDirectories:[]},skillDirectories:[],mcpServers:{}}));
const tabs=[{id:'overview',type:'overview',label:'Schedules'}];
for(let i=0;i<14;i++){const file=path.join(workspace,`Document-${i}.md`);fs.writeFileSync(file,`# Document ${i}\n`);tabs.push({id:'markdown:'+file,type:'markdown',label:`Document-${i}.md`,file});}
fs.writeFileSync(path.join(home,'desktop-workspace.json'),JSON.stringify({schemaVersion:1,page:'runs',active:tabs.at(-1).id,tabs,team:{active:'overview',tabs:[]}}));
let app;const errors=[];
try{
 app=await electron.launch({args:['.','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,PORT:'0'},timeout:60000});
 const page=await app.firstWindow();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 const identity={accountId:'synthetic',workspaceId:'1'},account={identity,teamLists:[],links:[]};
 await page.route('**/api/state',async route=>{const response=await route.fetch(),data=await response.json();data.life={...data.life,identity};await route.fulfill({json:data});});
 await page.route('**/api/team/lists',route=>route.fulfill({json:account}));await page.route('**/api/app',route=>route.fulfill({json:account}));await page.reload();
 await page.locator('[data-page="home"].active').waitFor();await page.waitForFunction(()=>document.querySelectorAll('[data-tab-container]').length===14);
 const layout=await page.evaluate(()=>{const rect=id=>{const value=document.querySelector(id).getBoundingClientRect();return {x:value.x,y:value.y,width:value.width,height:value.height,bottom:value.bottom};};return {tabs:rect('#tabs'),sidebar:rect('#sidebar'),workspace:rect('#workspace'),viewport:innerWidth};});
 assert.equal(layout.tabs.x,0);assert.equal(layout.tabs.width,layout.viewport,'Content tab bar spans the full window');assert.equal(layout.tabs.height,40);assert.equal(layout.sidebar.y,layout.tabs.bottom,'Feature navigation starts below tabs');assert.equal(layout.workspace.y,layout.tabs.bottom);
 await page.screenshot({path:'/private/tmp/proteus-compact-tabs.png'});
 assert.equal(await page.locator('[data-tab-container]').count(),14);
 assert.equal(await page.locator('#tabs .tab-list').evaluate(node=>getComputedStyle(node).scrollbarWidth),'none');
 await page.locator('#tabs .tab-list').evaluate(node=>node.scrollLeft=node.scrollWidth);
 const before=await page.locator('#tabs .tab-list').evaluate(node=>node.scrollLeft);assert.ok(before>0);
 await page.locator('[data-tab-container]').last().click();await page.getByRole('heading',{name:'Document 13'}).waitFor();
 const after=await page.locator('#tabs .tab-list').evaluate(node=>node.scrollLeft);assert.ok(Math.abs(after-before)<4,'selecting a tab preserves horizontal scroll');
 await page.locator('[data-page="home"]').click();await page.locator('[data-page="home"].active').waitFor();
 assert.ok(Math.abs((await page.locator('#tabs .tab-list').evaluate(node=>node.scrollLeft))-before)<4,'sidebar navigation preserves horizontal scroll');
 await page.locator('#tab-add-menu summary').click();assert.equal(await page.locator('#tab-add-menu button:visible').count(),4);
 const mainBrowserIcon=await page.locator('#browser svg').innerHTML();
 await page.locator('[data-page="team"]').click();await page.locator('#team-subtabs').waitFor();
 assert.equal(await page.locator('#team-subtabs').evaluate(node=>node.getBoundingClientRect().height),38);
 assert.equal(await page.locator('[data-team-add="browser"] svg').innerHTML(),mainBrowserIcon,'Team and main add menus use the same browser icon');
 await page.locator('#team-subtabs .team-tab-add summary').click();await page.locator('[data-team-add="browser"]').click();
 await page.locator('#team-browser-form').waitFor();assert.equal(await page.locator('#team-browser-back').count(),1);assert.equal(await page.locator('#team-browser-forward').count(),1);assert.equal(await page.locator('#team-browser-reload').count(),1);assert.equal(await page.locator('#team-browser-go').count(),1);
 assert.deepEqual(errors,[]);console.log('Home startup, content tabs, stable scroll, hidden scrollbar and shared Team browser controls passed.');
}finally{await app?.close();fs.rmSync(home,{recursive:true,force:true});}
