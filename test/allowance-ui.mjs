import {_electron as electron} from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const home=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-allowance-')));
const workspace=path.join(home,'workspace');fs.mkdirSync(workspace);
const settingsFile=path.join(home,'settings.json');
fs.writeFileSync(settingsFile,JSON.stringify({schemaVersion:1,provider:'rehearsal',model:'',timezone:'UTC',workspace:{cwd:workspace,additionalDirectories:[]},skillDirectories:[],mcpServers:{}}));
const usage={providers:{copilot:{windows:[{id:'synthetic',label:'Synthetic allowance',remainingPercent:70,resetAt:'2030-01-01T00:00:00Z'}]},codex:{stale:true,windows:[{id:'synthetic',label:'Synthetic allowance',remainingPercent:41.5}]},claude:{windows:[{id:'synthetic',label:'Synthetic allowance',unlimited:true}]}}};
let app,page;const errors=[],checks=[];
const saved=()=>JSON.parse(fs.readFileSync(settingsFile));
async function until(fn){for(let i=0;i<100;i++){if(await fn())return;await new Promise(r=>setTimeout(r,100));}throw new Error('Condition timed out');}
async function launch(){
 app=await electron.launch({args:['.','--use-mock-keychain','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,COPILOT_HOME:path.join(home,'copilot'),PORT:'0'},timeout:60000});
 assert.equal(await app.evaluate(({app})=>app.commandLine.hasSwitch('use-mock-keychain')),true);
 page=await app.firstWindow();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/api/usage',route=>route.fulfill({json:usage}));await page.reload();await page.locator('#new-chat').waitFor();
}
async function layout(width){
 await page.setViewportSize({width,height:900});await until(async()=>/41.5%/.test(await page.locator('[data-usage-provider=codex]').textContent()));
 const bounds=await page.locator('.provider-usage-row').evaluateAll(nodes=>nodes.map(node=>{const b=node.getBoundingClientRect(),m=node.querySelector('.usage-pill').getBoundingClientRect();return {x:b.x,y:b.y,right:b.right,width:b.width,meterY:m.y,meterRight:m.right,scroll:node.scrollWidth,client:node.clientWidth};}));
 assert.equal(bounds.length,3);assert.ok(bounds.every(b=>Math.abs(b.y-bounds[0].y)<1),'Providers share one row');assert.ok(bounds.every(b=>Math.abs(b.meterY-bounds[0].meterY)<1),'Meters remain aligned even with stale status');
 assert.ok(bounds[0].right<=bounds[1].x&&bounds[1].right<=bounds[2].x,'Columns do not overlap');assert.ok(bounds.every(b=>b.scroll<=b.client&&b.meterRight<=b.right+1),'Compact labels/meters fit each column '+JSON.stringify({width,bounds}));
 const panel=await page.locator('#provider-usage').boundingBox();assert.ok(bounds[2].right<=panel.x+panel.width+1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
}
try{
 await launch();for(const width of [1440,1024,760])await layout(width);checks.push('three columns with aligned meters at wide and narrow desktop widths');
 assert.equal(saved().appearance?.providerUsageCollapsed??false,false);assert.equal(await page.locator('[data-usage-provider=copilot] progress').getAttribute('value'),'70');assert.match(await page.locator('[data-usage-provider=codex]').getAttribute('title'),/41.5% remaining.*Last known/);assert.equal(await page.locator('[data-usage-provider=claude] strong').innerText(),'∞');checks.push('default compact percentages, unlimited and stale information');
 await page.locator('#provider-usage').screenshot({path:'/private/tmp/proteus-allowance-three-columns.png'});
 await page.locator('[data-usage-provider=codex]').focus();await page.keyboard.press('Enter');await page.getByRole('heading',{name:'Codex',exact:true}).waitFor();await page.getByText('41.5% remaining',{exact:true}).waitFor();await page.locator('#usage-close').click();checks.push('keyboard usage detail control and reported percentage');
 usage.providers.claude={windows:[]};await page.locator('[data-usage-provider=claude]').click();await page.locator('#usage-refresh').click();await page.getByText('Account allowance has not been reported.',{exact:true}).waitFor();await page.locator('#usage-close').click();assert.equal(await page.locator('[data-usage-provider=claude] strong').innerText(),'—');assert.match(await page.locator('[data-usage-provider=claude]').getAttribute('title'),/Unavailable/);checks.push('unavailable tooltip and details');
 await page.getByRole('button',{name:'Collapse AI allowance',exact:true}).click();await until(()=>saved().appearance?.providerUsageCollapsed===true);assert.equal(await page.locator('.provider-usage-row:visible').count(),0);assert.equal(await page.getByRole('button',{name:'Expand AI allowance',exact:true}).getAttribute('aria-expanded'),'false');checks.push('collapsed label and expander only');
 await app.close();app=null;await launch();await page.getByRole('button',{name:'Expand AI allowance',exact:true}).waitFor();assert.equal(await page.locator('.provider-usage-row:visible').count(),0);await page.getByRole('button',{name:'Expand AI allowance',exact:true}).click();await until(()=>saved().appearance?.providerUsageCollapsed===false);await layout(1024);checks.push('collapsed preference survives isolated restart and expands to three columns');
 await page.locator('[data-page=engine]').click();await page.locator('[data-engine-section=setup]').click();await page.locator('#settings-show-usage').uncheck();await until(()=>saved().appearance?.showProviderUsage===false);assert.equal(await page.locator('#provider-usage').isVisible(),false);await app.close();app=null;await launch();assert.equal(await page.locator('#provider-usage').isVisible(),false);assert.equal(saved().appearance.providerUsageCollapsed,false);checks.push('hidden preference survives restart independently from collapse');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,checks,screenshot:'/private/tmp/proteus-allowance-three-columns.png',keychain:'mock; disposable synthetic data only'}));
}finally{if(app)await app.close();fs.rmSync(home,{recursive:true,force:true});}
