// Real Laravel-controller response fixtures rendered by the desktop Life API facade.
import { _electron as electron } from 'playwright';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
import {LifeStore} from '../src/life.js';
const root=process.cwd(),home=fs.mkdtempSync('/private/tmp/proteus-life-api-ui-'),output=path.join(home,'responses.json');
execFileSync('php',['artisan','test','--compact','--filter=LifeApiTest::test_desktop_food_pages'],{cwd:path.join(root,'web'),env:{...process.env,PROTEUS_LIFE_API_FIXTURE:output},stdio:'pipe'});
const f=JSON.parse(fs.readFileSync(output)),origin='https://synthetic.example.test';let credential={origin,clientId:'synthetic-public',accessToken:'synthetic-access',refreshToken:'synthetic-refresh',expiresAt:Date.now()+3600000,accountId:f.profile.accountId,workspaceId:f.profile.workspaceId};
const calls=[],errors=[];let authURL,held;
const vault={available(){},exists:()=>!!credential,load:()=>credential,save:c=>{credential=c;},clear:()=>{credential=null;}};
const reply=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
fs.writeFileSync(path.join(home,'life.json'),JSON.stringify({schemaVersion:3,enabled:true,websiteOrigin:origin,legacyArchived:true}));
const store=new LifeStore(home,{vault,openExternal:async url=>{authURL=new URL(url);},fetch:async(url,options)=>{
 if(url.endsWith('/native-config'))return reply({enabled:true,protocol:1,issuer:origin,clientId:'synthetic-public',redirectUri:'proteus://life-oauth/callback',authorizationEndpoint:origin+'/oauth/authorize',tokenEndpoint:origin+'/oauth/token',apiBase:origin+'/api/v1/life'});
 if(url.endsWith('/native-session'))return reply({ok:true});
 if(url.endsWith('/data')){
  const body=JSON.parse(options.body);calls.push(body);if(held)await held.promise;
  if(body.section!=='nutrition')return reply(f.sections[body.section]);
  const q=body.query;return reply(q.tab==='versions'?f.versions:q.tab==='foods'?(q.search==='056'?f.search:q.search==='absent'?f.empty:q.foodPage>=3?f.last:q.foodPage===2?f.second:f.first):f.day);
 }
 if(url.endsWith('/action')){const body=JSON.parse(options.body);calls.push(body);return reply({...f.profile,ok:true,record:{id:999}});}
 return reply(f.profile);
}});
store.save({schemaVersion:3,enabled:true,websiteOrigin:origin,legacyArchived:true},store.get().revision);await store.refresh();
const html=`<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/life.css"><style>body{padding:16px}#main{height:auto}#life-setup{max-width:1100px;margin:auto}</style><div id="life-setup"></div><main id="main"></main><script type="module">
import {initLife,renderLife,renderLifeSetup} from '/life.js';
const api=async(url,value)=>{const r=await fetch(url,{method:value===undefined?'GET':'POST',headers:{'Content-Type':'application/json'},body:value===undefined?undefined:JSON.stringify(value)});const v=await r.json();if(!r.ok)throw new Error(v.error);return v;};
window.desktop={lifeAccount:value=>api('/test/auth',value)};
window.state={data:{life:await api('/api/life')}};window.refreshLife=async()=>{state.data.life=await api('/api/life');renderLifeSetup('#life-setup');if(document.querySelector('#life-page'))renderLife();};window.showSetup=()=>{document.querySelector('#life-setup')?.remove();document.querySelector('#main').innerHTML='<section id=setup-sentinel><div id=life-setup></div></section>';renderLifeSetup('#life-setup');};
initLife({state,api,escape:v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),toast:()=>{},refresh:refreshLife});renderLifeSetup('#life-setup');renderLife();
</script>`;
const server=http.createServer(async(req,res)=>{try{
 if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}
 if(['/life.js','/life.css','/style.css','/proteus-theme.css'].includes(req.url)){res.setHeader('Content-Type',req.url.endsWith('.js')?'text/javascript':'text/css');res.end(fs.readFileSync(path.join(root,'public',req.url.slice(1))));return;}
 let text='';for await(const b of req)text+=b;const v=text?JSON.parse(text):{};let result;
 if(req.url==='/api/life')result=req.method==='GET'?store.get():store.save(v.settings,v.expectedRevision);
 else if(req.url==='/api/life/data')result=await store.data(v.section,v.query);
 else if(req.url==='/api/life/action')result=await store.action(v.action,v.input,v.idempotencyKey,v.identity);
 else if(req.url==='/test/auth')result=await store.auth(v.action,v);
 else throw new Error('Unsupported fixture route');res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));
 }catch(e){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e.message}));}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
fs.writeFileSync(path.join(home,'main.cjs'),"const {app,BrowserWindow}=require('electron');app.whenReady().then(()=>{const w=new BrowserWindow({width:1400,height:1000,webPreferences:{contextIsolation:true,nodeIntegration:false}});w.loadURL("+JSON.stringify(url)+");});app.on('window-all-closed',()=>app.quit());");
let app;try{
 app=await electron.launch({args:[path.join(home,'main.cjs'),'--user-data-dir='+path.join(home,'electron')]});const page=await app.firstWindow();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
 await page.locator('#life-account-logout').waitFor();assert.equal(await page.locator('#life-plan-form,#life-check-upgrade,#life-pick-profile').count(),0);
 assert.ok(!(await page.locator('#life-setup').innerText()).includes('Sign in to continue.'));
 const originalOrigin=await page.locator('.life-account-origin').innerText();
 await page.locator('.life-account-origin').evaluate(el=>{el.textContent='https://a-very-long-synthetic-website-name-for-responsive-account-summary.example.test';});
 for(const width of [1400,390]){await page.setViewportSize({width,height:1000});const geometry=await page.locator('.life-account-summary').evaluate(el=>{const badge=el.querySelector('.life-account-badge').getBoundingClientRect(),actions=el.querySelector('.life-account-actions').getBoundingClientRect(),card=el.closest('#life-setup-card');return {gap:actions.top-badge.bottom,width:card.clientWidth,scroll:card.scrollWidth};});assert.ok(geometry.gap>=10);assert.ok(geometry.scroll<=geometry.width+1);await page.locator('#life-setup').screenshot({path:'/private/tmp/proteus-life-connected-setup-'+width+'.png'});}
 await page.locator('.life-account-origin').evaluate((el,text)=>el.textContent=text,originalOrigin);await page.setViewportSize({width:1400,height:1000});
 await page.locator('[data-nutrition-tab="foods"]').click();await page.getByText('1–25 of 56 foods · Page 1 of 3',{exact:true}).waitFor();assert.equal(await page.locator('[data-life-food]').count(),25);
 await page.locator('#life-food-next').click();await page.getByText('26–50 of 56 foods · Page 2 of 3',{exact:true}).waitFor();
 await page.locator('#life-food-next').click();await page.getByText('51–56 of 56 foods · Page 3 of 3',{exact:true}).waitFor();assert.equal(await page.locator('[data-life-food]').count(),6);
 await page.locator('[data-life-food]').last().click();await page.getByRole('heading',{name:'Synthetic food 056 · version history'}).waitFor();assert.equal(await page.locator('#life-food-form-name').inputValue(),'Synthetic food 056');
 await page.locator('#life-food-form-calories').fill('125');await page.locator('#life-food-form button[type=submit]').click();await page.waitForFunction(()=>!document.querySelector('#life-food-form [type=submit]').disabled);
 assert.equal(calls.find(c=>c.action==='food.save').expectedAccountId,f.profile.accountId);
 await page.locator('#life-food-back').click();await page.locator('#life-food-search-search').fill('056');await page.locator('#life-food-search button').click();await page.getByText('1–1 of 1 foods · Page 1 of 1',{exact:true}).waitFor();
 await page.locator('#life-food-search-search').fill('absent');await page.locator('#life-food-search button').click();await page.getByText('No matching foods · Page 1 of 1',{exact:true}).waitFor();
 await page.locator('[data-nutrition-tab="day"]').click();await page.locator('#life-meal-form-food_id').waitFor();assert.equal(await page.locator('#life-meal-form-food_id option').count(),57);
 await page.screenshot({path:'/private/tmp/proteus-life-api-desktop.png',fullPage:true});
 // A pending read and draft from account A must not survive logout.
 await page.locator('#life-meal-form-note').fill('OLD_ACCOUNT_PRIVATE_DRAFT');
 let release;held={promise:new Promise(r=>release=r),resolve:()=>release()};await page.locator('#life-refresh').click();await page.locator('#life-account-logout').click();await page.locator('#life-account-login').waitFor();release();held=null;
 assert.ok(!(await page.locator('#main').innerText()).includes('OLD_ACCOUNT_PRIVATE_DRAFT'));assert.equal(await page.locator('#life-meal-form').count(),0);
 assert.match(await page.locator('#life-connection-state').innerText(),/Sign in/);await page.evaluate(()=>window.showSetup());await page.locator('#life-account-login').click();await page.locator('#life-account-cancel').waitFor();assert.equal(await page.locator('#setup-sentinel').count(),1);assert.equal(await page.locator('#life-page').count(),0);assert.match(await page.locator('#life-account-status').innerText(),/Finish signing in/);assert.equal(authURL.origin,origin);assert.equal(authURL.searchParams.get('code_challenge_method'),'S256');await page.locator('#life-account-cancel').click();await page.locator('#life-account-login').waitFor();
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,checks:['actual Laravel projections','desktop25-page contract','late-page edit selectedFood','full meal picker','identity-bound mutation','logout discards draft and late query','API-only setup and system browser PKCE','sign-in stays in Setup with pending status and Cancel','signed-out connection label','connected Setup badge spacing at390/1400px and long URL wrapping'],screenshot:'/private/tmp/proteus-life-api-desktop.png'}));
}finally{held?.resolve?.();if(app)await app.close();await store.close();await new Promise(r=>server.close(r));fs.rmSync(home,{recursive:true,force:true});}
