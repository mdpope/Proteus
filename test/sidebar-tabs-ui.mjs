import {_electron as electron} from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const home=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-sidebar-tabs-')));
const workspace=path.join(home,'workspace');fs.mkdirSync(workspace);
const settingsFile=path.join(home,'settings.json');
fs.writeFileSync(settingsFile,JSON.stringify({schemaVersion:1,provider:'rehearsal',model:'',timezone:'UTC',workspace:{cwd:workspace,additionalDirectories:[]},skillDirectories:[],mcpServers:{},appearance:{showProviderUsage:false}}));
for(const name of ['First','Second'])fs.writeFileSync(path.join(workspace,name+'.md'),'# '+name+' synthetic note');
let app,page;const errors=[];
const until=async predicate=>{for(let i=0;i<100;i++){if(await predicate())return;await new Promise(r=>setTimeout(r,100));}throw new Error('Condition timed out');};
const saved=()=>JSON.parse(fs.readFileSync(settingsFile));
const session=()=>JSON.parse(fs.readFileSync(path.join(home,'desktop-workspace.json')));
async function launch(){
 app=await electron.launch({args:['.','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,COPILOT_HOME:path.join(home,'copilot'),PORT:'0'},timeout:60000});
 page=await app.firstWindow();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/api/usage',route=>route.fulfill({json:{providers:Object.fromEntries(['copilot','codex','claude'].map((id,i)=>[id,{windows:[{id:'test',label:'Synthetic allowance',remainingPercent:70+i,resetAt:'2030-01-01T00:00:00Z'}]}]))}}));
 await page.locator('#new-chat').waitFor();
}
try{
 await launch();await page.locator('[data-page="settings"]').click();
 assert.equal(await page.locator('#provider-usage').isVisible(),false,'Existing disabled flag is preserved');
 await page.locator('#settings-timezone').fill('America/Denver');
 await page.locator('#settings-show-usage').check();await page.locator('#provider-usage').waitFor({state:'visible'});await until(()=>saved().appearance.showProviderUsage===true);
 assert.equal(await page.locator('#settings-timezone').inputValue(),'America/Denver','Appearance save preserves unrelated form edits');
 await page.locator('#save-settings').click();await until(()=>saved().timezone==='America/Denver');
 // Collapsing retains a compact, accessible provider summary and does not disable the feature.
 await page.getByRole('button',{name:'Collapse AI usage',exact:true}).click();await until(()=>saved().appearance.providerUsageCollapsed===true);
 assert.equal(saved().appearance.showProviderUsage,true);assert.equal(await page.locator('.usage-collapsed .provider-usage-row').count(),3);
 assert.equal(await page.getByRole('button',{name:'Expand AI usage',exact:true}).getAttribute('aria-expanded'),'false');
 await until(async()=>/71%/.test(await page.locator('[data-usage-provider="codex"]').innerText()));
 assert.equal(await page.locator('.usage-collapsed [data-usage-provider="codex"] progress').isVisible(),true,'Compact oval retains progress fill');
 await page.locator('[data-page="schedules"]').click();await page.locator('[data-page="settings"]').click();assert.equal(await page.locator('#settings-show-usage').isChecked(),true);
 await page.locator('#settings-show-usage').uncheck();await page.locator('#provider-usage').waitFor({state:'hidden'});await until(()=>saved().appearance.showProviderUsage===false);
 await page.locator('[data-page="schedules"]').click();await page.locator('[data-page="settings"]').click();assert.equal(await page.locator('#settings-show-usage').isChecked(),false);
 await page.locator('#settings-show-usage').check();await page.locator('#provider-usage').waitFor({state:'visible'});await until(()=>saved().appearance.showProviderUsage===true);
 assert.equal(await page.locator('#provider-usage').evaluate(node=>node.classList.contains('usage-collapsed')),true);
 // Failed saves restore the checkbox and leave the persisted preference unchanged.
 await page.route('**/api/settings',route=>route.fulfill({status:409,json:{error:'Synthetic settings conflict'}}));
 await page.locator('#settings-show-usage').uncheck();await page.getByText('Synthetic settings conflict',{exact:true}).waitFor();
 assert.equal(await page.locator('#settings-show-usage').isChecked(),true);assert.equal(saved().appearance.showProviderUsage,true);
 await page.unroute('**/api/settings');
 // Real isolated application restart; never touch the operator's installed application.
 await app.close();app=null;await launch();await page.locator('[data-page="settings"]').click();
 assert.equal(await page.locator('#settings-show-usage').isChecked(),true);await page.getByRole('button',{name:'Expand AI usage',exact:true}).waitFor();
 await page.screenshot({path:'/private/tmp/proteus-sidebar-collapsed.png'});
 await page.getByRole('button',{name:'Expand AI usage',exact:true}).click();await until(()=>saved().appearance.providerUsageCollapsed===false);
 await page.locator('[data-usage-provider="codex"]').click();await page.getByText('71% remaining',{exact:true}).waitFor();await page.locator('#usage-close').click();
 const tabs=[{id:'overview',type:'overview',label:'Schedules'},...['First','Second'].map(name=>({id:'markdown:'+path.join(workspace,name+'.md'),type:'markdown',file:path.join(workspace,name+'.md'),label:name+'.md'}))];
 await page.evaluate(tabs=>window.desktop.workspaceSession({action:'save',session:{schemaVersion:1,page:'schedules',active:tabs[2].id,tabs}}),tabs);await page.reload();await page.getByRole('heading',{name:'Second synthetic note',exact:true}).waitFor();
 const first=page.locator('[data-tab-container]').filter({has:page.locator('[data-tab]').filter({hasText:'First.md'})});
 // The upper inset is outside both inner buttons, proving the tab rectangle itself activates.
 const point=await first.evaluate(node=>{const r=node.getBoundingClientRect();return {x:r.left+2,y:r.top+1};});
 assert.equal(await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.hasAttribute('data-tab-container'),point),true);
 await page.mouse.click(point.x,point.y);await page.getByRole('heading',{name:'First synthetic note',exact:true}).waitFor();await until(()=>session().active===tabs[1].id);
 // Observe rendered selections while closing a background tab.
 await page.evaluate(()=>{window.__tabSelections=[];new MutationObserver(()=>window.__tabSelections.push(document.querySelector('.tabitem.selected [data-tab]')?.dataset.tab)).observe(document.querySelector('#tabs'),{childList:true,subtree:true,attributes:true});});
 await page.locator('[data-close]').filter({hasText:'×'}).nth(1).click();await until(()=>session().tabs.length===2);
 assert.equal(session().active,tabs[1].id);assert.equal(await page.locator('.tabitem.selected [data-tab]').getAttribute('data-tab'),tabs[1].id);
 const selections=await page.evaluate(()=>window.__tabSelections);assert.ok(selections.length>0);assert.ok(!selections.includes(tabs[2].id));
 await page.locator('[data-tab="overview"]').focus();await page.keyboard.press('Enter');await page.getByRole('heading',{name:'Work that keeps moving.',exact:true}).waitFor();
 await page.screenshot({path:'/private/tmp/proteus-sidebar-tabs-fixed.png'});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,checks:10,screenshots:['/private/tmp/proteus-sidebar-collapsed.png','/private/tmp/proteus-sidebar-tabs-fixed.png']}));
}finally{if(app)await app.close();fs.rmSync(home,{recursive:true,force:true});}
