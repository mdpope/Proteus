import {_electron as electron} from 'playwright';
import {closeTestElectron} from './electron-cleanup.mjs';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
import assert from 'node:assert/strict';
const fixture=await sidebarFixture();let app,page;const errors=[];
try{
 app=await electron.launch({args:['.'],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_DESIGN_DEMO:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,PROTEUS_PREVIEW_AUTH:'none',PORT:'0'}});
 page=await app.firstWindow();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 await page.locator('[data-page=reminders]').click();await page.locator('[data-open]').filter({hasText:'Review the new navigation'}).first().click();await page.locator('.reminder-detail [name=title]').waitFor();
 const reminderRecent=page.locator('#sidebar [data-resource-feature=reminders]');await reminderRecent.filter({hasText:'Review the new navigation'}).waitFor();
 const reminderBar=page.getByRole('navigation',{name:'Reminder tabs',exact:true});await reminderBar.getByRole('button',{name:'Reminders',exact:true}).click();await reminderRecent.click();await page.locator('.reminder-detail [name=title]').waitFor();
 assert.equal(await reminderBar.locator('.feature-content-tab').count(),2,'Recent reminder reuses its existing tab');
 await page.locator('[data-page=scratchpad]').click();await page.getByLabel('Scratchpad storage folder',{exact:true}).fill(fixture.studio.cwd);await page.getByRole('button',{name:'Use this folder',exact:true}).click();await page.locator('.scratchpad-list').waitFor();
 await page.evaluate(async()=>{for(let i=0;i<9;i++){const response=await fetch('/api/scratchpad',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'create',title:'Recent scratch '+i,body:'Synthetic test only',operationId:crypto.randomUUID()})});if(!response.ok)throw Error(await response.text());}});
 await page.reload();await page.locator('.scratchpad-list').waitFor();const scratchBar=page.getByRole('navigation',{name:'Scratchpad tabs',exact:true});
 for(let i=0;i<9;i++){await page.locator('.scratchpad-row').filter({hasText:'Recent scratch '+i}).click();await page.getByLabel('Scratch title',{exact:true}).waitFor();await scratchBar.getByRole('button',{name:'Close Recent scratch '+i,exact:true}).click();await page.locator('.scratchpad-list').waitFor();}
 await page.waitForFunction(()=>document.querySelectorAll('#sidebar [data-resource-feature=scratchpad]').length===7);
 assert.equal(await page.locator('#sidebar [data-resource-feature=scratchpad]').first().getAttribute('title'),'Recent scratch 8');
 await page.locator('[data-resource-more=scratchpad]').click();await page.waitForFunction(()=>document.querySelectorAll('#sidebar [data-resource-feature=scratchpad]').length===9);
 await page.locator('#sidebar [data-resource-feature=scratchpad]').filter({hasText:'Recent scratch 0'}).click();await page.getByLabel('Scratch title',{exact:true}).waitFor();assert.equal(await page.getByLabel('Scratch title',{exact:true}).inputValue(),'Recent scratch 0');
 await scratchBar.getByRole('button',{name:'Close Recent scratch 0',exact:true}).click();await page.reload();await page.locator('#sidebar [data-resource-feature=scratchpad]').filter({hasText:'Recent scratch 0'}).waitFor();
 await page.locator('[data-page=reminders]').click();await reminderRecent.waitFor();await page.locator('[data-page=scratchpad]').click();await page.waitForFunction(()=>document.querySelectorAll('#sidebar [data-resource-feature=scratchpad]').length===7);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,closedRetention:true,more:true,reset:true,reload:true,stableReminderTab:true,synthetic:true}));
}catch(error){await page?.screenshot({path:process.cwd()+'/.runtime-tests/resource-recents-failure.png'}).catch(()=>{});throw error;}
finally{await closeTestElectron(app);await fixture.cleanup();}
