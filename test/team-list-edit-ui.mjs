// Exercise the actual editor against a revisioned synthetic account, never a live list.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const fixture=await sidebarFixture();let app;
let list={id:'synthetic-team',name:'Review team',revision:4,timezone:'UTC',instructions:'Original agenda',members:[{id:'person-a',name:'Alice',mode:'random'},{id:'person-b',name:'Bob',mode:'fixed'}],links:[{id:'board',title:'Board',url:fixture.origin+'/board'}]};
const writes=[];
try{
 app=await electron.launch({args:['.'],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_DESIGN_DEMO:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,CODEX_HOME:fixture.auth,PORT:'0'}});
 const page=await app.firstWindow();page.setDefaultTimeout(20000);await page.locator('body.window-design-preview').waitFor();
 await page.route('**/api/team/lists',async route=>{
  const body=route.request().postDataJSON();
  if(body?.action==='save'){
   writes.push(body);assert.equal(body.expectedRevision,list.revision);list={...body.list,revision:list.revision+1};
   await route.fulfill({json:{id:list.id,teamList:list}});
  }else await route.fulfill({json:{identity:{accountId:'synthetic'},teamLists:[list]}});
 });
 await page.route('**/app.js',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('windowRestore.start().then(', 'window.teamEditReady=windowRestore.start().then(')+'\nwindow.openSyntheticTeam=()=>navigate("team");\n'});});
 await page.reload();await page.waitForFunction(()=>typeof window.openSyntheticTeam==='function');await page.evaluate(()=>window.teamEditReady);await page.evaluate(()=>window.openSyntheticTeam());
 await page.locator('#team-edit-list').click();await page.locator('#team-edit-name').fill('Revised team');
 await page.locator('#team-edit-members').fill('Alice\n! Bob\nCharlie');await page.locator('#team-edit-agenda').fill('Revised agenda');
 await page.locator('#dialog-submit').click();await page.locator('#dialog').waitFor({state:'hidden'});
 assert.equal(writes.length,1);assert.equal(list.id,'synthetic-team');assert.equal(list.members[0].id,'person-a');assert.equal(list.members[1].id,'person-b');assert.equal(list.members[1].mode,'fixed');assert.equal(list.members[2].name,'Charlie');assert.equal(list.links[0].id,'board');
 await page.reload();await page.waitForFunction(()=>typeof window.openSyntheticTeam==='function');await page.evaluate(()=>window.teamEditReady);await page.evaluate(()=>window.openSyntheticTeam());
 await page.locator('#team-edit-list').click();assert.equal(await page.locator('#team-edit-name').inputValue(),'Revised team');assert.equal(await page.locator('#team-edit-agenda').inputValue(),'Revised agenda');
 await page.locator('#close-dialog').click();assert.equal(writes.length,1,'Cancel and reopening must not save');
 console.log(JSON.stringify({passed:true,synthetic:true,revisionBoundSave:true,stableMembersAndLinks:true,reopened:true,cancelDoesNotWrite:true}));
}finally{
 if(app){const kill=setTimeout(()=>app.process().kill('SIGKILL'),10000);await app.close().catch(()=>{});clearTimeout(kill);}
 await fixture.cleanup();
}
