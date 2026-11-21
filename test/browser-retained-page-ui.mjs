import {_electron as electron} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import assert from 'node:assert/strict';

const home=await fs.mkdtemp(path.join(os.tmpdir(),'proteus-retained-page-'));
let server,app,port,mode='original',continueResponse,repeatedRequests=0;
const start=async()=>{
 server=http.createServer((request,response)=>{
   if(request.url==='/repeat'){
    response.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});
    const repeat=++repeatedRequests<12?'<script>setTimeout(()=>location.assign(location.href),25)</script>':'';
    response.end('<title>Repeated same-address navigation</title>'+repeat);
    return;
   }
  if(request.url!=='/preview'){response.writeHead(404);response.end();return;}
  const write=()=>{response.writeHead(mode==='error'?503:200,{'Content-Type':'text/html','Cache-Control':'no-store'});
   response.end(`<title>Fixture ${mode}</title><main><h1>Fixture ${mode}</h1></main>`);};
  if(mode==='delayed')continueResponse=write;else write();
 });
 await new Promise(resolve=>server.listen(port||0,'127.0.0.1',resolve));
 port=server.address().port;
};
const stop=async()=>{if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));server=null;}};
try{
 await start();
 const url='http://127.0.0.1:'+port+'/preview';
 app=await electron.launch({args:['.','--use-mock-keychain','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,PORT:'0'},timeout:60000});
 const page=await app.firstWindow();
 await page.locator('#home-screen').waitFor();
 const command=value=>page.evaluate(value=>window.desktop.browser(value),value);
 const {id}=await command({action:'create',url});
 await page.locator(`[data-tab="${id}"]`).click();
 const native=(code,value)=>app.evaluate(({app},{code,value})=>{
  const main=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs');
  return new Function('main','value','return ('+code+')(main,value)')(main,value);
 },{code:code.toString(),value});
 await native(async(main,id)=>{const browser=main.getBrowser();
  const tab=browser.get(id);
  await browser.withTabWindow(tab,()=>browser.captureThumbnail(tab));
 },id);
 const saved=address=>native(async(main,{id,address})=>{const b=main.getBrowser(),tab=b.get(id);return b.thumbnails.getMatching(b.thumbnailKey(tab),address);},{id,address});
 assert.ok(await saved(url));
 assert.equal(await saved(url+'?different-page'),null);
 const visual=page.locator('#browser-area .browser-retained-page'),image=visual.locator('img');
 const hasImage=()=>image.evaluate(img=>img.complete&&img.naturalWidth>0);
 const waitFor=async(callback)=>{for(let i=0;i<200;i++){if(await callback())return;await new Promise(resolve=>setTimeout(resolve,50));}throw Error('Timed out');};

 await stop();
 await command({action:'reload',id});
 await visual.getByText('Saved view · Website unreachable').waitFor();
 await waitFor(hasImage);
 const oldImage=await image.getAttribute('src');
 assert.equal(await native((main,id)=>main.getBrowser().get(id).view.getVisible(),id),false);
 const notice=await native((main,id)=>main.getService().activity.notifications().items.find(item=>item.browserIssue?.tabId===id),id);
 assert.match(notice.title,/is unreachable/);

 await command({action:'unload',id});
 // Explicit activation follows the same history restoration used when the
 // renderer selects a previously unloaded tab.
 await command({action:'activate',id});
 await visual.getByText('Saved view · Website unreachable').waitFor();
 await waitFor(hasImage);
 assert.equal(await command({action:'retained-page',id,frameId:'different-view'}),null);
 assert.ok(oldImage.startsWith('data:image/jpeg;base64,'));
 assert.equal((await command({action:'list'})).find(row=>row.id===id).url,url);

 await start();
 mode='error';
 await command({action:'reload',id});
 await visual.getByText('Saved view · Website unreachable').waitFor();
 assert.match((await command({action:'list'})).find(row=>row.id===id).error,/HTTP 503/);

 mode='delayed';
 const retry=command({action:'reload',id});
 await visual.getByText('Saved view · Checking for updates…').waitFor();
 await waitFor(()=>!!continueResponse);
 mode='updated';continueResponse();
 await retry;
 await visual.waitFor({state:'detached'});
 assert.equal(await native((main,id)=>main.getBrowser().get(id).view.webContents.getTitle(),id),'Fixture updated');
 assert.equal(await native((main,id)=>main.getBrowser().get(id).view.getVisible(),id),true);

 const repeatedURL=new URL('/repeat',url).href;
 const repeated=await command({action:'create',url:repeatedURL});
 await page.locator(`[data-tab="${repeated.id}"]`).click();
 await waitFor(()=>repeatedRequests>=12);
 const savedHistory=await native((main,id)=>main.getBrowser().get(id).logicalHistory,repeated.id);
 assert.equal(savedHistory.entries.length,1,'automatic same-address loads do not create repeated history entries');
 assert.equal(savedHistory.entries[0].url,repeatedURL);
 console.log('Verified saved view on failed reload, HTTP 503 and retry. Twelve same-address page loads kept one history entry.');
}finally{await app?.close();await stop();await fs.rm(home,{recursive:true,force:true});}
