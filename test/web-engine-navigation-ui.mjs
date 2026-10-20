// Actual Engine Room module, synthetic delayed services, disposable browser only.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const root=path.resolve(import.meta.dirname,'..');
const shared=`export const browserHistoryRequest=async()=>({visits:[]});export const ownerRequest=async()=>({sourceLibrary:[]});export const escapeHTML=value=>String(value??'');export const externalLink=()=>'';export const dateTime=value=>value;export const localDateTime=value=>value;export const recordBrowserVisit=async()=>{};export const defaultMacStatus=()=>({message:'Choose a Default Mac in Engine Room.'});export const updateDefaultMac=async()=>{};export const retryDefaultMac=async()=>{};export const defaultMacRequest=async()=>({supported:true,observedAt:'synthetic',totals:{memoryBytes:157286400,cpuPercent:1.2,processCount:2},processes:[{name:'Process '+ 'wide-'.repeat(300),memoryBytes:104857600,cpuPercent:1,tabIds:['a','b']},{name:'GPU',memoryBytes:52428800,cpuPercent:0.2}],tabs:[{id:'a',title:'Synthetic unnamed tab '+ 'long-label-'.repeat(300),group:'browser',loaded:true}]});export const appRequest=()=>new Promise(resolve=>{window.resolveApp=()=>resolve({preferences:{timezone:'UTC'},teamLists:[],links:[],history:[],notifications:[{id:'fixture',title:'Mac reconnected',downtimeSeconds:3,createdAt:'2026-10-06T21:00:00Z'},{id:'chat',title:'Chat completed',chatId:'synthetic',hostId:'synthetic-host',createdAt:'2026-10-06T20:00:00Z'}],logs:[],push:{}})});`;
const store=`window.pendingDestinations=[];export class BrowserDestinationStore{list(){return new Promise((resolve,reject)=>{window.pendingDestinations.push({resolve:()=>resolve([]),reject:()=>reject(new Error('Synthetic stale lookup failure'))})})}close(){window.closedStores=(window.closedStores||0)+1}}`;
const html=`<!doctype html><link rel="stylesheet" href="/app.css"><body data-browser-account="synthetic"><section id="engine-room"><h1 id="engine-title"></h1><p id="shared-notice"></p><nav>${['resources','connections','setup','usage','notifications','logs'].map(t=>`<button data-engine-tab="${t}">${t}</button>`).join('')}</nav><div id="engine-content"></div></section><script type="module" src="/app-tools.js"></script>`;
const server=http.createServer((req,res)=>{
    const pathname=new URL(req.url,'http://local').pathname;
    if(/^\/public\/[a-z0-9-]+\.js$/.test(pathname)){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(path.join(root,pathname.slice(1))));return;}
    if(pathname==='/app.css'){const manifest=JSON.parse(fs.readFileSync(path.join(root,'web/public/build/manifest.json')));res.setHeader('Content-Type','text/css');res.end(fs.readFileSync(path.join(root,'web/public/build',manifest['resources/css/app.css'].file)));return;}
    if(/^\/[a-z0-9-]+\.js$/.test(pathname)&&!['/app-tools.js','/shared-app.js','/remote-client.js','/remote-usage.js'].includes(pathname)){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(path.join(root,'web/resources/js',pathname.slice(1))));return;}
    const content=pathname==='/app-tools.js'?fs.readFileSync(path.join(root,'web/resources/js/app-tools.js')):pathname==='/shared-app.js'?shared:pathname==='/remote-client.js'?store:pathname==='/remote-usage.js'?'export const usagePanel=()=>"Synthetic allowance";':html;
    res.setHeader('Content-Type',pathname.endsWith('.js')?'text/javascript':'text/html');res.end(content);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
let browser;
try{
    browser=await chromium.launch({headless:true});const page=await browser.newPage();page.setDefaultTimeout(10000);
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    const click=tab=>page.locator(`[data-engine-tab=${tab}]`).click();
    const heading=name=>page.locator('#engine-title').filter({hasText:name}).waitFor();
    const resolveApp=async()=>{await page.waitForFunction(()=>typeof window.resolveApp==='function');await page.evaluate(()=>window.resolveApp());};
    const resolveDestinations=async()=>{await page.waitForFunction(()=>window.pendingDestinations.length>0);await page.evaluate(()=>window.pendingDestinations.shift().resolve());};
    // A user can select a tab while the initial shared-data response is pending.
    await page.goto(origin+'/engine-room?tab=resources');await page.waitForFunction(()=>typeof window.resolveApp==='function');
    await click('connections');assert.equal(new URL(page.url()).searchParams.get('tab'),'connections');
    await resolveApp();await resolveDestinations();await heading('Connections');assert.deepEqual(errors,[]);
    // The chosen route survives reload and browser Back/Forward.
    await page.reload();await resolveApp();await resolveDestinations();await heading('Connections');
    await click('resources');await heading('Resources');await page.locator('.resource-stats').waitFor();assert.equal(await page.locator('.resource-stats>div').count(),3);assert.match(await page.locator('.resource-stats').innerText(),/150.0 MB/);assert.equal(await page.locator('#resource-data tbody tr').count(),2);assert.match(await page.locator('#resource-data').innerText(),/shared process/);await page.screenshot({path:'/private/tmp/proteus-review-web-resources.png',fullPage:true});assert.equal(new URL(page.url()).searchParams.get('tab'),'resources');
    for(const width of [1440,390]){await page.setViewportSize({width,height:844});const geometry=await page.evaluate(()=>{const row=document.querySelector('.resource-tab-row'),title=row.querySelector('strong'),actions=row.querySelector('div:last-child');return {wrap:getComputedStyle(title).whiteSpace,ellipsis:getComputedStyle(title).textOverflow,rowRight:row.getBoundingClientRect().right,actionsRight:actions.getBoundingClientRect().right,tableRight:document.querySelector('.resource-process-table').getBoundingClientRect().right,width:innerWidth,overflow:document.documentElement.scrollWidth,bodyStyle:getComputedStyle(document.body).display,engineWidth:document.querySelector('#engine-room').getBoundingClientRect().width,bodyWidth:document.body.getBoundingClientRect().width};});await page.screenshot({path:'/private/tmp/proteus-resource-web-'+width+'.png'});assert.equal(geometry.wrap,'nowrap');assert.equal(geometry.ellipsis,'ellipsis');assert.ok(geometry.actionsRight<=geometry.rowRight+1);assert.ok(geometry.tableRight<=geometry.width);assert.ok(geometry.overflow<=geometry.width);}await page.setViewportSize({width:1440,height:1000});
    await page.goBack();await resolveDestinations();await heading('Connections');
    await page.goForward();await heading('Resources');
    // A late Connections result cannot overwrite a newer section or leak its store.
    await click('connections');await page.waitForFunction(()=>window.pendingDestinations.length===1);
    await click('setup');await heading('App settings');await resolveDestinations();await heading('App settings');
    assert.equal(await page.locator('#default-mac-form').count(),0);
    // Returning to Connections creates a new request; the old one must stay stale
    // even when its tab name matches again. Its late error cannot replace notices.
    await click('connections');await page.waitForFunction(()=>window.pendingDestinations.length===1);
    await click('logs');await heading('Logs');await click('connections');await page.waitForFunction(()=>window.pendingDestinations.length===2);
    await page.evaluate(()=>window.pendingDestinations[1].resolve());await heading('Connections');
    await page.evaluate(()=>window.pendingDestinations[0].reject());await heading('Connections');
    assert.equal(await page.locator('#shared-notice').innerText(),'');
    assert.equal(await page.evaluate(()=>window.closedStores),5);
    // Unsolicited default-host/usage updates must not take navigation ownership.
    await page.evaluate(()=>{document.dispatchEvent(new CustomEvent('proteus:default-connected'));document.dispatchEvent(new CustomEvent('proteus:usage',{detail:{value:{providers:{}},destination:'Synthetic Mac'}}));});
    await heading('Connections');assert.equal(new URL(page.url()).searchParams.get('tab'),'connections');
    // Invalid deep links fall back safely, and a subsequent real tab is reloadable.
    await page.goto(origin+'/engine-room?tab=unsupported');await resolveApp();await heading('Resources');
    await click('notifications');await heading('Notifications');assert.equal(new URL(page.url()).searchParams.get('tab'),'notifications');
    assert.equal(await page.locator('#engine-content>.card').count(),2);assert.equal(await page.locator('.resource-row').count(),2);assert.equal(await page.locator('[data-read-notification]').count(),2);await page.screenshot({path:'/private/tmp/proteus-review-web-notifications.png',fullPage:true});
    await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({passed:true,checks:8,synthetic:true}));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
