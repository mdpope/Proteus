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
 app=await electron.launch({args:['.','--use-mock-keychain','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,PORT:'0'},timeout:60000});
 const page=await app.firstWindow();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 await page.locator('[data-tab-container]').last().waitFor().catch(async error=>{console.error('Page errors',errors,'Windows',app.windows().map(p=>p.url()));console.error('Saved',await page.evaluate(async()=>window.desktop.workspaceSession({action:'get'})));throw error;});
 const identity={accountId:'synthetic',workspaceId:'1'},account={identity,teamLists:[],links:[]};
 await page.route('**/api/state',async route=>{const response=await route.fetch(),data=await response.json();data.life={...data.life,identity};await route.fulfill({json:data});});
 await page.route('**/api/team/lists',route=>route.fulfill({json:account}));await page.route('**/api/app',route=>route.fulfill({json:account}));
 // Restore a host-owned named profile with an isolated synthetic catalog. Its
 // renderer roundtrip must neither replace the profile nor keep mutating tabs.
 const profileId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 await app.evaluate(async({app},profileId)=>{
  const service=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService(),profiles=service.browserProfiles;
  profiles.account={life:{api:{identity:()=>({origin:'https://synthetic.example',accountId:'synthetic-profile-owner'})}},request:async()=>({items:[{id:profileId,name:'Synthetic Research',revision:1,settings:{}}]})};
  await profiles.handle({action:'enable',enabled:true});
  service.contentTabs.mutate({scope:'team',id:'team',expectedRevision:service.contentTabs.get('team','team').revision,operations:[{action:'open',tab:{id:'named-profile-fixture',type:'browser',profileId,title:'Synthetic Research',url:''}}]});
  service.contentTabRehearsalMutations=0;const mutate=service.contentTabs.mutate.bind(service.contentTabs);
  service.contentTabs.mutate=value=>{if(value.scope==='team')service.contentTabRehearsalMutations++;return mutate(value);};
 },profileId);
 let teamSyncGets=0;
 await page.route('**/api/content-tabs',async route=>{const value=route.request().postDataJSON();if(value.action==='get'&&value.scope==='team')teamSyncGets++;await route.continue();});
 await page.reload();
 await page.locator('[data-page="home"].active').waitFor();
 await page.waitForFunction(async profileId=>{const {teamState}=await import('./team-tools.js');return teamState().tabs.some(tab=>tab.contentTabId==='named-profile-fixture'&&tab.profileId===profileId);},profileId);
 const syncDeadline=Date.now()+15000;while(teamSyncGets<6&&Date.now()<syncDeadline)await page.waitForTimeout(100);assert.ok(teamSyncGets>=6,'at least six Team sync passes completed');
 const roundtrip=await app.evaluate(({app})=>{const service=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService();return {saved:service.contentTabs.get('team','team'),mutations:service.contentTabRehearsalMutations};});
 assert.equal(roundtrip.saved.tabs[0].profileId,profileId);assert.equal(roundtrip.saved.revision,1);assert.equal(roundtrip.mutations,0,'unchanged named-profile descriptors issue no mutations');
 await page.waitForFunction(()=>document.querySelectorAll('[data-tab-container]').length===14,null,{timeout:15000}).catch(async error=>{console.error('Restored tabs:',await page.locator('[data-tab-container]').allTextContents());console.error('Page errors:',errors);throw error;});
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
 const sidebarScroll=await page.locator('#tabs .tab-list').evaluate(node=>({left:node.scrollLeft,width:node.clientWidth,total:node.scrollWidth}));assert.ok(Math.abs(sidebarScroll.left-before)<4,'sidebar navigation preserves horizontal scroll '+JSON.stringify({before,after,sidebarScroll}));
 await page.locator('#tab-add-menu summary').click();assert.equal(await page.locator('#tab-add-menu button:visible').count(),6,'five standard tools and the synthetic named profile');
 const mainBrowserIcon=await page.locator('#browser svg').innerHTML();
 await page.locator('[data-page="team"]').click();await page.locator('#team-subtabs').waitFor();
 assert.equal(await page.locator('#team-subtabs').evaluate(node=>node.getBoundingClientRect().height),38);
 assert.equal(await page.locator('[data-team-add="browser"] svg').innerHTML(),mainBrowserIcon,'Team and main add menus use the same browser icon');
 await page.locator('#team-subtabs .team-tab-add summary').click();await page.locator('[data-team-add="browser"]').click();
 await page.locator('#team-browser-form').waitFor();assert.equal(await page.locator('#team-browser-back').count(),1);assert.equal(await page.locator('#team-browser-forward').count(),1);assert.equal(await page.locator('#team-browser-reload').count(),1);assert.equal(await page.locator('#team-browser-go').count(),1);
 assert.deepEqual(errors,[]);console.log('Home startup, content tabs, stable scroll, hidden scrollbar, named-profile sync without mutations and shared Team browser controls passed.');
}finally{await app?.close();fs.rmSync(home,{recursive:true,force:true});}
