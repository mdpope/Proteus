// Current unified history API, disposable desktop home, no account/provider credentials.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createServer} from 'node:http';
const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-browser-home-')),workspace=path.join(home,'workspace');fs.mkdirSync(workspace);
fs.writeFileSync(path.join(home,'settings.json'),JSON.stringify({schemaVersion:1,provider:'rehearsal',model:'',timezone:'UTC',workspace:{cwd:workspace,additionalDirectories:[]},skillDirectories:[],mcpServers:{}}));
const requests=[],fixture=createServer((req,res)=>{requests.push(req.url);res.writeHead(200,{'Content-Type':'text/html'});res.end('<title>Synthetic visit</title><h1>Disposable visit</h1>');});await new Promise(resolve=>fixture.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+fixture.address().port,account={identity:{accountId:'synthetic',workspaceId:'synthetic'},teamLists:[{id:'synthetic-team',name:'Synthetic team',members:[],random:[],fixed:[],timezone:'UTC',instructions:'Synthetic',links:[],revision:1}],links:[{id:'shared-link',title:'Synthetic shared link',url:origin+'/shared',revision:1}]};
const visits=Array.from({length:53},(_,i)=>({eventId:'home-'+i,url:'https://example.test/'+i,title:'Local '+String(i).padStart(2,'0')+' '+('long-title-'.repeat(15)),visitedAt:new Date(Date.now()-i*1000).toISOString(),profileId:'default',sourceHostId:'synthetic-owner'}));
let app,page;const historyRequests=[];
try{
 app=await electron.launch({args:['.','--use-mock-keychain','--user-data-dir='+path.join(home,'browser')],env:{...process.env,PROTEUS_HOME:home,COPILOT_HOME:path.join(home,'copilot'),PORT:'0'},timeout:60000});
 page=await app.firstWindow();const errors=[];page.on('request',request=>{if(request.url().endsWith('/api/browser-history'))historyRequests.push(request.postDataJSON());});page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/api/app',route=>route.fulfill({json:account}));await page.route('**/api/team/lists',route=>route.fulfill({json:account}));await page.locator('#topbar-home').waitFor();
 await page.evaluate(async visits=>{const response=await fetch('/api/browser-history',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'record',events:visits})});if(!response.ok)throw Error(await response.text());},visits);
 const rows=area=>page.locator(area+' #browser-home-history .browser-history-row');
 const count=async(area,n)=>page.waitForFunction(({area,n})=>document.querySelectorAll(area+' #browser-home-history .browser-history-row').length===n,{area,n});
 const layout=async area=>{const metrics=await page.locator(area).evaluate(node=>({overflow:node.scrollWidth-node.clientWidth,inner:node.firstElementChild.scrollWidth-node.firstElementChild.clientWidth}));assert.ok(metrics.overflow<=1&&metrics.inner<=1,JSON.stringify(metrics));};
 await page.locator('#tab-add-menu summary').click();await count('#browser-area',25);
 assert.equal(await page.locator('#browser-home-url').evaluate(node=>document.activeElement===node),true);assert.equal(await page.locator('#browser-home-url').getAttribute('placeholder'),'https://example.com');assert.equal(await page.locator('#browser-history-filter').count(),0);assert.ok(await page.locator('[data-new-tab-action]').count()>2);await layout('#browser-area');
 await page.locator('#browser-history-more').click();await count('#browser-area',50);await page.locator('#browser-history-more').click();await count('#browser-area',53);assert.equal(await page.locator('#browser-history-more').isVisible(),false);
 await page.locator('#browser-home-url').fill('Local 52');await count('#browser-area',1);assert.match(await rows('#browser-area').innerText(),/Local 52/);
 await page.locator('#browser-home-url').fill(origin+'/typed');await page.locator('#browser-home-url').press('Enter');await page.waitForFunction(url=>document.querySelector('#browser-url')?.value===url,origin+'/typed');
 for(let i=0;i<100&&!requests.includes('/typed');i++)await new Promise(resolve=>setTimeout(resolve,50));assert.ok(requests.includes('/typed'));
 await page.locator('[data-page="team"]').click();await page.locator('[data-team-tab="standup"]').click();await page.locator('#team-standup-dock').click();await page.locator('.team-tab-add summary').click();await count('#team-browser-area',25);await page.setViewportSize({width:850,height:700});await layout('#team-browser-area');
 await page.locator('#team-browser-area #browser-home-url').fill('Local 52');await count('#team-browser-area',1);await page.locator('#team-browser-area #browser-home-url').fill('');await count('#team-browser-area',25);
 await page.evaluate(async()=>{
  const {renderBrowserHome}=await import('/browser-home.js');const area=document.createElement('div');area.id='browser-home-fixture';area.className='browserarea';area.style.cssText='position:fixed;top:100px;left:100px;width:500px;height:500px;z-index:9999;overflow:auto';document.body.append(area);window.homeRequests=[];let fail=true;
  const items=Array.from({length:53},(_,i)=>({eventId:'retry-'+i,url:'https://example.test/retry/'+i,title:'Retry '+i,visitedAt:new Date().toISOString()}));
  await renderBrowserHome(area,{escape:value=>String(value??''),toast:()=>{},navigate:()=>{},api:async(route,value)=>{if(route==='/api/app')return {identity:{},links:[]};if(route!=='/api/browser-history'||value.action!=='query')throw Error('Unexpected synthetic operation');window.homeRequests.push(value.cursor||'0');if(value.cursor==='25'&&fail){fail=false;throw Error('Synthetic page failure');}const start=Number(value.cursor||0);return {items:items.slice(start,start+25),nextCursor:String(start+25),hasMore:start+25<items.length,enabled:true,retentionDays:90};}});
 });
 await page.locator('#browser-home-fixture #browser-history-more').click();await page.locator('#browser-home-fixture #browser-history-error').getByText('Synthetic page failure').waitFor();assert.equal(await rows('#browser-home-fixture').count(),25);
 await page.locator('#browser-home-fixture #browser-history-more').click();await count('#browser-home-fixture',50);assert.deepEqual(await page.evaluate(()=>window.homeRequests),['0','25','25']);assert.equal(await rows('#browser-home-fixture').evaluateAll(nodes=>new Set(nodes.map(node=>node.dataset.historyUrl)).size),50);
 assert.deepEqual(errors,[]);console.log('PASS actual desktop +, focused combined address/history filtering, Enter navigation, creation blocks, Team dock layout and cursor-safe pagination retry');
}catch(error){console.error('HISTORY REQUESTS',JSON.stringify(historyRequests.filter(row=>row.action==='query')));if(page)console.error('STATE',await rows('#team-browser-area').count(),await page.locator('#team-browser-area #browser-home-url').inputValue({timeout:1000}).catch(()=>null));console.error(error);throw error;}finally{await app?.close();await new Promise(resolve=>fixture.close(resolve));fs.rmSync(home,{recursive:true,force:true,maxRetries:10,retryDelay:100});}
