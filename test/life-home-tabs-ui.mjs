// Synthetic account and loopback website; no Home Assistant or real profile.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const fixture=await sidebarFixture();let app;const errors=[];
try {
 app=await electron.launch({args:['.'],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,CODEX_HOME:fixture.auth,PORT:'0'}});
 const page=await app.firstWindow();page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/api/state?*',async route=>{const response=await route.fetch(),data=await response.json();data.life={enabled:true,configured:true,ready:true,identity:{accountId:'synthetic-home'},capabilities:[]};await route.fulfill({json:data});});
 await page.route('**/api/life/data',route=>route.fulfill({json:{identity:{accountId:'synthetic-home'},data:{}}}));
 await page.route('**/api/life/home',route=>route.fulfill({json:{accountId:'synthetic-home',configured:true,origin:fixture.origin,revision:'synthetic',entities:[],services:[]}}));
 await page.reload();await page.locator('[data-page=life]').click();
 const sections=page.locator('#life-section-navigation');await sections.waitFor();
 assert.deepEqual(await sections.getByRole('button').allTextContents(),['Overview','Ask','Smart Home','Nutrition','Garage','Capture inbox','New capture','Account','Connections']);
 await sections.getByRole('button',{name:'Smart Home',exact:true}).click();
 const bar=page.locator('#feature-content-navigation');await bar.waitFor();
 await bar.getByRole('button',{name:'Home Assistant',exact:true}).click();await page.locator('#browser-url').waitFor();
 const command=args=>page.evaluate(args=>window.desktop.browser(args),args);
 await page.waitForFunction(origin=>document.querySelector('#browser-url')?.value.startsWith(origin),fixture.origin);
 const dashboard=(await command({action:'list'})).find(tab=>tab.url.startsWith(fixture.origin)&&!tab.url.includes('favicon-tab')&&!tab.url.includes('hidden-tab'));assert.ok(dashboard);
 assert.equal(await page.locator(`#tabs [data-tab="${dashboard.id}"]`).count(),0,'Grouped resources are not duplicated in the root strip');
 await bar.getByRole('button',{name:'Smart Home',exact:true}).click();await bar.getByRole('button',{name:/^Home Assistant/}).click();
 assert.equal((await command({action:'list'})).filter(tab=>tab.url===dashboard.url).length,1,'Persistent dashboard reuses its browser');
 await bar.getByRole('button',{name:'Add Smart Home tab'}).click();
 await page.locator('#main [data-new-tab-action]').filter({hasText:'New chat'}).waitFor();
 assert.equal(await bar.locator('[data-tab-container]').count(),2,'Home Assistant and the blank tab are resource tabs');
 assert.match(await bar.locator('[data-tab-container]').last().innerText(),/New Tab/i);
 await bar.locator('[data-tab-container] button').first().click();
 await page.reload();await page.locator('#feature-content-navigation').waitFor();
 assert.equal(await bar.locator('[data-tab-container]').count(),2,'Window restore retains the ordinary blank tab and feature placement');
 await bar.locator('[data-tab-container] button').last().click();
 assert.equal(await bar.locator('[data-tab-container]').count(),1);
 assert.equal(await bar.getByRole('button',{name:/^Home Assistant/}).count(),1);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,summary:'Canonical Life order, persistent embedded Home Assistant reuse, ordinary New Tab placement, restore and close'}));
} finally {if(app)await app.close();await fixture.cleanup();}
