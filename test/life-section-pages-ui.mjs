// Third-layer Life pages (Nutrition, Garage) use the shared feature tab strip, with the same tab types as Projects.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const fixture=await sidebarFixture();let app;const errors=[];
try {
 app=await electron.launch({args:['.'],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,CODEX_HOME:fixture.auth,PORT:'0'}});
 const page=await app.firstWindow();page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/api/state?*',async route=>{const response=await route.fetch(),data=await response.json();data.life={enabled:true,configured:true,ready:true,identity:{accountId:'synthetic-life'},capabilities:[]};await route.fulfill({json:data});});
 await page.route('**/api/life/data',route=>route.fulfill({json:{identity:{accountId:'synthetic-life'},days:[],periods:[],vehicleCards:[],tasks:[],counts:{},foods:[],entries:[]}}));
 await page.reload();await page.locator('[data-page=life]').click();
 const sections=page.locator('#life-section-navigation');await sections.waitFor();
 await sections.getByRole('button',{name:'Nutrition',exact:true}).click();
 const strip=page.locator('#feature-content-navigation');await strip.waitFor();
 assert.deepEqual(await strip.locator('.feature-content-tab').allInnerTexts(),['Overview','Meal days','Daily log','Averages','Food Library']);
 assert.equal(await strip.getByRole('button',{name:'Overview',exact:true}).getAttribute('aria-current'),'page');
 await strip.getByRole('button',{name:'Averages',exact:true}).click();await page.locator('#life-content').waitFor();
 assert.equal(await strip.getByRole('button',{name:'Averages',exact:true}).getAttribute('aria-current'),'page');
 await sections.getByRole('button',{name:'Garage',exact:true}).click();
 assert.deepEqual(await strip.locator('.feature-content-tab').allInnerTexts(),['Overview','Vehicles','Fuel & mileage']);
 await strip.getByRole('button',{name:'Fuel & mileage',exact:true}).click();assert.equal(await strip.getByRole('button',{name:'Fuel & mileage',exact:true}).getAttribute('aria-current'),'page');
 // Double-clicking empty strip space creates a tab, like Projects; the new tab offers chat and search.
 await strip.locator('.feature-tab-list').dblclick({position:{x:900,y:10}});
 const types=page.locator('#main [data-new-tab-action]');await types.filter({hasText:'New chat'}).waitFor();await types.filter({hasText:'Internet Search'}).waitFor();
 assert.equal(await strip.locator('[data-tab-container]').count(),1);
 if(process.env.SHOT)await page.screenshot({path:process.env.SHOT});
 assert.deepEqual(errors,[]);console.log('Passed Life Nutrition and Garage pages, shared tab strip, double-click new tab and chat/search types.');
} finally {if(app)await app.close();await fixture.cleanup();}
