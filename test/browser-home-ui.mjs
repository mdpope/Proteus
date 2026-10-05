import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createServer} from 'node:http';

const home=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-browser-home-')));
const workspace=path.join(home,'workspace');
fs.mkdirSync(workspace);
fs.writeFileSync(path.join(home,'settings.json'),JSON.stringify({
  schemaVersion:1,provider:'rehearsal',model:'',timezone:'UTC',
  workspace:{cwd:workspace,additionalDirectories:[]},skillDirectories:[],mcpServers:{}
}));
const long='unbroken-title-and-address-segment-'.repeat(18);
const local=Array.from({length:77},(_,i)=>({
  id:'local-'+i,url:'https://example.test/'+long+i,
  title:'Local '+String(i).padStart(2,'0')+' '+long,
  visitedAt:new Date(Date.now()-i*1000).toISOString(),source:'desktop',
  ...(i%3?{deviceName:'Synthetic Local Mac',hostId:'11111111-1111-4111-8111-111111111111'}:{})
}));
fs.writeFileSync(path.join(home,'browsing-history.json'),JSON.stringify({
  version:1,enabled:true,retentionDays:90,items:local
}));
const shared=Array.from({length:73},(_,i)=>({
  id:'shared-'+i,url:'https://shared.example.test/'+long+i,
  title:'Shared '+String(i).padStart(2,'0')+' '+long,
  source:'mobile',...(i%2?{}:{deviceName:'Synthetic iPad'}),
  visitedAt:'2026-11-01T07:30:00Z',createdAt:'2026-11-01T09:30:00Z',updatedAt:'2026-12-01T09:30:00Z'
}));
const account={identity:{accountId:'synthetic',workspaceId:'synthetic'},teamLists:[{
  id:'11111111-1111-4111-8111-111111111111',name:'Synthetic team',members:[],
  random:[],fixed:[],timezone:'UTC',instructions:'Synthetic',links:[],revision:1
}],links:[
  {id:'link-1',title:long,url:'https://example.test/'+long,revision:1}
],history:shared};
let app;
const fixture=createServer((_req,res)=>{res.writeHead(200,{'Content-Type':'text/html'});res.end('<title>Synthetic visit metadata</title><p>Disposable visit</p>');});await new Promise(resolve=>fixture.listen(0,'127.0.0.1',resolve));const fixtureURL='http://127.0.0.1:'+fixture.address().port;
try{
  app=await electron.launch({args:['.','--use-mock-keychain','--user-data-dir='+path.join(home,'electron')],env:{
    ...process.env,PROTEUS_HOME:home,COPILOT_HOME:path.join(home,'copilot'),PORT:'0'
  },timeout:60000});
  const page=await app.firstWindow();
  page.setDefaultTimeout(15000);
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/api/app',route=>route.fulfill({json:account}));
  await page.route('**/api/team/lists',route=>route.fulfill({json:account}));
  await page.locator('#new-chat').waitFor();

  const checkLayout=async areaSelector=>{
    const metrics=await page.locator(areaSelector).evaluate(area=>{
      area.scrollTop=0;
      const search=area.querySelector('#browser-home-query');
      const box=area.getBoundingClientRect(),input=search.getBoundingClientRect();
      return {top:box.top,inputTop:input.top,inputBottom:input.bottom,bottom:box.bottom,
        overflow:area.scrollWidth-area.clientWidth,innerOverflow:area.firstElementChild.scrollWidth-area.firstElementChild.clientWidth};
    });
    assert.ok(metrics.inputTop>=metrics.top && metrics.inputBottom<=metrics.bottom,JSON.stringify(metrics));
    assert.ok(metrics.overflow<=1 && metrics.innerOverflow<=1,JSON.stringify(metrics));
    assert.equal(await page.locator(areaSelector+' #browser-shared-history .browser-history-row').count(),25);
    assert.equal(await page.locator(areaSelector+' #browser-home-history .browser-history-row').count(),25);
    assert.equal(await page.locator(areaSelector+' #browser-shared-more').isVisible(),true);
    assert.equal(await page.locator(areaSelector+' #browser-history-more').isVisible(),true);
  };
  const checkMetadata=async areaSelector=>{
    const rows=await page.locator(areaSelector).evaluate((area,fixtures)=>{
      const formatter=new Intl.DateTimeFormat(undefined,{year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'});
      return [...area.querySelectorAll('#browser-home-history .browser-history-row,#browser-shared-history .browser-history-row')].map(row=>{
        const url=row.dataset.historyUrl||row.dataset.sharedHistoryUrl,item=fixtures.find(item=>item.url===url);
        return {device:row.querySelector('small')?.textContent,time:row.querySelector('time')?.textContent,expectedDevice:item.deviceName||'Unknown device',expectedTime:formatter.format(new Date(item.visitedAt)),url};
      });
    },[...local,...shared]);
    assert.ok(rows.length>=50);
    for(const row of rows){assert.equal(row.device,row.expectedDevice);assert.equal(row.time,row.expectedTime);}
    assert.ok(rows.some(row=>row.device==='Unknown device'));assert.ok(rows.some(row=>row.device==='Synthetic Local Mac'));assert.ok(rows.some(row=>row.device==='Synthetic iPad'));
  };
  const waitForRows=async(selector,count)=>page.waitForFunction(
    ({selector,count})=>document.querySelectorAll(selector+' .browser-history-row').length===count,
    {selector,count}
  );

  await page.locator('#browser').click();
  await page.locator('#browser-area #browser-home-query').waitFor();
  await checkLayout('#browser-area');await checkMetadata('#browser-area');
  await page.locator('#browser-area #browser-shared-more').click();
  assert.equal(await page.locator('#browser-area #browser-shared-history .browser-history-row').count(),50);
  await page.locator('#browser-area #browser-history-more').click();
  await waitForRows('#browser-area #browser-home-history',50);
  await page.locator('#browser-area #browser-shared-more').click();
  assert.equal(await page.locator('#browser-area #browser-shared-history .browser-history-row').count(),73);
  assert.equal(await page.locator('#browser-area #browser-shared-more').isVisible(),false);
  await page.locator('#browser-area #browser-history-more').click();
  await page.locator('#browser-area #browser-history-more').click();
  await waitForRows('#browser-area #browser-home-history',77);await checkMetadata('#browser-area');
  assert.equal(await page.locator('#browser-area #browser-history-more').isVisible(),false);
  await page.locator('#browser-area #browser-history-filter').fill('Local 76');
  await waitForRows('#browser-area #browser-home-history',1);
  assert.equal(await page.locator('#browser-area #browser-history-more').isVisible(),false);
  await page.locator('#browser-area #browser-history-filter').fill('');
  await waitForRows('#browser-area #browser-home-history',25);
  await page.locator('#browser-area').evaluate(area=>{area.scrollTop=0;});
  await page.screenshot({path:'/private/tmp/proteus-browser-home-main.png'});

  await page.locator('[data-page="team"]').click();
  await page.locator('[data-team-tab="standup"]').click();
  await page.locator('#team-standup-dock').click();
  await page.locator('#team-new-browser').click();
  await page.locator('#team-browser-area #browser-home-query').waitFor();
  await page.setViewportSize({width:850,height:700});
  await checkLayout('#team-browser-area');await checkMetadata('#team-browser-area');
  await page.locator('#team-browser-area #browser-shared-more').click();await page.locator('#team-browser-area #browser-history-more').click();await waitForRows('#team-browser-area #browser-home-history',50);assert.equal(await page.locator('#team-browser-area #browser-shared-history .browser-history-row').count(),50);await checkMetadata('#team-browser-area');
  await page.screenshot({path:'/private/tmp/proteus-browser-home-team-docked.png'});

  // Use the production renderer with an injected failing page request to verify
  // that retries do not advance the cursor or duplicate earlier rows.
  await page.evaluate(async()=>{
    const {renderBrowserHome}=await import('/browser-home.js');
    const area=document.createElement('div');
    area.id='browser-home-fixture';
    area.className='browserarea';
    area.style.cssText='position:fixed;top:100px;left:100px;width:500px;height:500px;z-index:9999;overflow:auto';
    document.body.append(area);
    const items=Array.from({length:53},(_,i)=>({
      id:'retry-'+i,url:'https://example.test/retry/'+i,title:'Retry '+i,visitedAt:new Date().toISOString()
    }));
    window.__homeRequests=[];
    window.__failMore=true;
    await renderBrowserHome(area,{
      escape:value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])),
      time:value=>String(value||''),toast:()=>{},navigate:()=>{},
      api:async()=>({identity:{},links:[],history:[]}),
      browser:async request=>{
        window.__homeRequests.push(request);
        if(request.action!=='history')throw new Error('Unexpected operation');
        if(request.page===2 && window.__failMore){window.__failMore=false;throw new Error('Synthetic page failure');}
        const filtered=items.filter(item=>!request.query||item.title.includes(request.query));
        const start=(request.page-1)*request.pageSize;
        return {items:filtered.slice(start,start+request.pageSize),total:filtered.length,
          page:request.page,pageSize:request.pageSize,enabled:true,retentionDays:90};
      }
    });
  });
  await page.locator('#browser-home-fixture #browser-history-more').click();
  await page.locator('#browser-home-fixture #browser-history-error').getByText('Synthetic page failure').waitFor();
  assert.equal(await page.locator('#browser-home-fixture #browser-home-history .browser-history-row').count(),25);
  await page.locator('#browser-home-fixture #browser-history-more').click();
  await waitForRows('#browser-home-fixture #browser-home-history',50);
  assert.deepEqual(await page.locator('#browser-home-fixture #browser-home-history [data-history-url]').evaluateAll(nodes=>nodes.map(n=>n.dataset.historyUrl)),Array.from({length:50},(_,i)=>'https://example.test/retry/'+i));
  await page.locator('#browser-home-fixture #browser-history-filter').fill('Retry 52');
  await waitForRows('#browser-home-fixture #browser-home-history',1);
  assert.deepEqual(await page.evaluate(()=>window.__homeRequests.map(r=>[r.page,r.pageSize])),[[1,25],[2,25],[2,25],[1,25]]);
  // Exercise the actual main-process device callback, with local synthetic pages only.
  const hostId=await app.evaluate(async({app})=>{const service=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService();await service.remote.configure({enabled:false,label:'Synthetic visit Mac'});return service.remote.info().hostId;});
  for(const group of ['main','team']){
    const url=fixtureURL+'/'+group;
    const tab=await page.evaluate(({url,group})=>window.desktop.browser({action:'create',url,group}),{url,group});
    for(let attempt=0;attempt<100;attempt++){if(JSON.parse(fs.readFileSync(path.join(home,'browsing-history.json'))).items.some(item=>item.url===url))break;await new Promise(resolve=>setTimeout(resolve,50));}
    const visit=JSON.parse(fs.readFileSync(path.join(home,'browsing-history.json'))).items.find(item=>item.url===url);assert.ok(visit);assert.equal(visit.deviceName,'Synthetic visit Mac');assert.equal(visit.hostId,hostId);assert.equal(visit.deviceId,hostId);assert.ok(Number.isFinite(Date.parse(visit.visitedAt)));
    await page.evaluate(id=>window.desktop.browser({action:'close',id}),tab.id);
  }
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,checks:22,screenshots:[
    '/private/tmp/proteus-browser-home-main.png','/private/tmp/proteus-browser-home-team-docked.png'
  ]}));
}finally{
  if(app)await app.close();
  await new Promise(resolve=>fixture.close(resolve));
  fs.rmSync(home,{recursive:true,force:true});
}
