import { _electron as electron } from 'playwright';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-artifact-ui-'));
let app;
const requests=[];
const server=createServer((request,response)=>{requests.push(request.url);response.writeHead(200,{'content-type':'text/plain'});response.end('unexpected');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}/leak`;
const html=`<meta http-equiv="refresh" content="0;url=${url}?meta"><img src="${url}?img"><script>console.log('PROTEUS_ARTIFACT_SCRIPT_RAN');fetch('${url}?fetch');location.href='${url}?nav';window.open('${url}?popup')</script>`;
const version=createHash('sha256').update(html).digest('hex');
try{
  app=await electron.launch({args:['test/artifact-preview-host.cjs','--use-mock-keychain',`--user-data-dir=${path.join(home,'electron')}`],env:{...process.env,PROTEUS_HOME:home},timeout:60000});
  await app.firstWindow();
  await app.evaluate(async(_electron,data)=>{while(!globalThis.preview)await new Promise(resolve=>setTimeout(resolve,20));await globalThis.preview.show(data);},{html,version,enabled:false,bounds:{x:0,y:0,width:600,height:400}});
  await new Promise(resolve=>setTimeout(resolve,500));
  let observed=await app.evaluate(()=>({console:globalThis.previewConsole,popups:globalThis.previewPopups}));
  assert.equal(requests.length,0,'static HTML must not make network requests');
  assert.equal(observed.popups,0);
  assert.ok(!observed.console.some(value=>value.includes('PROTEUS_ARTIFACT_SCRIPT_RAN')),'script must be disabled by default');
  await app.evaluate(async(_electron,data)=>globalThis.preview.show(data),{html,version,enabled:true,bounds:{x:0,y:0,width:600,height:400}});
  await new Promise(resolve=>setTimeout(resolve,500));
  observed=await app.evaluate(()=>({console:globalThis.previewConsole,popups:globalThis.previewPopups}));
  assert.ok(observed.console.some(value=>value.includes('PROTEUS_ARTIFACT_SCRIPT_RAN')),'explicit opt-in should run bounded inline script');
  assert.equal(requests.length,0,'script opt-in must not grant network access');
  assert.equal(observed.popups,0,'script opt-in must not permit popups');
  const boundedImage='<img src="data:image/png;base64,'+Buffer.alloc(1_500_000,65).toString('base64')+'">';
  await app.evaluate(async(_electron,data)=>globalThis.preview.show(data),{html:boundedImage,version:createHash('sha256').update(boundedImage).digest('hex'),enabled:false,bounds:{x:0,y:0,width:600,height:400}});
  assert.equal(requests.length,0,'a bounded approved inline image must not make a network request');
  const scrollHTML='<style>body{margin:0;height:4200px;background:linear-gradient(white,gray)}#nested{position:fixed;top:20px;left:20px;width:200px;height:140px;overflow:auto;background:white}#nested div{height:2200px}</style><div id="nested"><div>Approved nested scroll fixture</div></div>',scrollVersion=createHash('sha256').update(scrollHTML).digest('hex'),tabId='approved-scroll-tab';
  const support=await app.evaluate(async(_electron,data)=>globalThis.preview.show(data),{html:scrollHTML,version:scrollVersion,tabId,enabled:false,bounds:{x:0,y:0,width:600,height:400}});assert.equal(support.scrollAvailable,true,'opaque script-disabled preview supports isolated position metadata');
  const initial=await app.evaluate(async()=>{const p=globalThis.preview,wc=p.view.webContents;globalThis.previewEvaluate=async expression=>{const observer=globalThis.preview.scroll;const result=await observer.debug.sendCommand('Runtime.evaluate',{expression,returnByValue:true},observer.target.sessionId);if(result.exceptionDetails)throw Error(result.exceptionDetails.text);return result.result?.value;};const state=await globalThis.previewEvaluate(`({origin:location.origin,bridge:typeof globalThis[${JSON.stringify(p.scroll.binding)}],observer:typeof globalThis.__proteusArtifactPosition})`);await globalThis.previewEvaluate("window.dispatchEvent(new WheelEvent('wheel',{deltaY:600}));parent.postMessage({type:'proteus:artifact-scroll',positions:[{path:'root',y:1}]},'*');window.scrollTo(0,300)");return {...state,id:wc.id};});
  await new Promise(resolve=>setTimeout(resolve,200));assert.equal(initial.origin,'null');assert.equal(initial.bridge,'undefined');assert.equal(initial.observer,'undefined');assert.equal(await app.evaluate(()=>globalThis.previewScroll.length),0,'document scripts and forged messages cannot imitate native human input');
  // Electron sendInputEvent targets the outer WebContents, not the opaque OOPIF.
  // CDP input on its exact child session produces native trusted frame events.
  const wheel=async(x,y)=>app.evaluate(async({},{x,y})=>{const p=globalThis.preview,s=p.scroll;globalThis.previewWindow.show();globalThis.previewWindow.focus();p.view.webContents.focus();await new Promise(resolve=>setTimeout(resolve,80));await s.debug.sendCommand('Input.dispatchMouseEvent',{type:'mouseWheel',x,y,deltaY:600,deltaX:0},s.target.sessionId);},{x,y});
  const until=async predicate=>{for(let attempt=0;attempt<100;attempt++){if(await predicate())return;await new Promise(resolve=>setTimeout(resolve,30));}throw Error('Artifact scroll did not settle');};
  await wheel(400,200);await until(()=>app.evaluate(()=>globalThis.previewScroll.some(value=>value.positions.some(row=>row.path==='root'))));
  const capture=await app.evaluate(()=>globalThis.previewScroll.at(-1));assert.equal(capture.tabId,tabId);assert.equal(capture.version,scrollVersion);assert.ok(JSON.stringify(capture).length<8192);assert.deepEqual(Object.keys(capture.positions[0]).sort(),['left','path','top','x','y']);
  const apply=await app.evaluate(async(_electron,{tabId,version})=>{const p=globalThis.preview,count=globalThis.previewScroll.length;const result=await p.followScroll({tabId,version,positions:[{path:'root',top:0,left:0,x:0,y:.8}]});await new Promise(resolve=>setTimeout(resolve,180));return {result,countAfter:globalThis.previewScroll.length,count,id:p.view.webContents.id,top:await globalThis.previewEvaluate('scrollY')};},{tabId,version:scrollVersion});assert.equal(apply.result.applied,true);assert.equal(apply.id,initial.id);assert.ok(apply.top>2500);assert.equal(apply.countAfter,apply.count,'remote restoration must not echo as human input');
  assert.deepEqual(await app.evaluate(async(_electron,{tabId,version})=>globalThis.preview.followScroll({tabId,version,positions:[{path:'root',top:0,left:0,x:0,y:0}]}),{tabId:'different-tab',version:scrollVersion}),{applied:false});
  assert.deepEqual(await app.evaluate(async(_electron,{tabId})=>globalThis.preview.followScroll({tabId,version:'0'.repeat(64),positions:[{path:'root',top:0,left:0,x:0,y:0}]}),{tabId}),{applied:false});
  await wheel(100,100);await until(()=>app.evaluate(()=>globalThis.previewScroll.some(value=>value.positions.some(row=>row.path!=='root'))));
  const nested=await app.evaluate(()=>globalThis.previewScroll.flatMap(value=>value.positions).find(row=>row.path!=='root'));const nestedApply=await app.evaluate(async(_electron,{tabId,version,position})=>{const p=globalThis.preview,result=await p.followScroll({tabId,version,positions:[{...position,y:.5}]});return {result,top:await globalThis.previewEvaluate('document.querySelector("#nested").scrollTop'),id:p.view.webContents.id};},{tabId,version:scrollVersion,position:nested});assert.equal(nestedApply.result.applied,true);assert.ok(nestedApply.top>900&&nestedApply.top<1200);assert.equal(nestedApply.id,initial.id);
  await app.evaluate(async(_electron,data)=>{await globalThis.preview.show(data);globalThis.previewScroll=[];},{html:scrollHTML,version:scrollVersion,tabId,enabled:true,bounds:{x:0,y:0,width:600,height:400}});
  const forged=await app.evaluate(async()=>{const s=globalThis.preview.scroll;return globalThis.previewEvaluate(`window.dispatchEvent(new WheelEvent('wheel',{deltaY:600}));window.dispatchEvent(new PointerEvent('pointerdown'));window.scrollTo(0,300);({bridge:typeof globalThis[${JSON.stringify(s.binding)}],observer:typeof globalThis.__proteusArtifactPosition})`);});await new Promise(resolve=>setTimeout(resolve,180));assert.equal(forged.bridge,'undefined');assert.equal(forged.observer,'undefined');assert.equal(await app.evaluate(()=>globalThis.previewScroll.length),0,'script opt-in cannot forge a human position update');await wheel(400,200);await until(()=>app.evaluate(()=>globalThis.previewScroll.length>0));
  const cleanup=await app.evaluate(async()=>{const p=globalThis.preview,observer=p.scroll,wc=p.view.webContents,destroyed=new Promise(resolve=>wc.once('destroyed',resolve));await p.hide();await destroyed;return {closed:observer.closed,view:p.view,destroyed:wc.isDestroyed()};});assert.equal(cleanup.closed,true);assert.equal(cleanup.view,null);assert.equal(cleanup.destroyed,true);assert.equal(requests.length,0);
  console.log('Electron HTML preview preserves opaque origin/CSP, blocks network/popups and scripts by default; trusted root/nested scroll metadata, stale identity rejection, no echo/recreation, and cleanup pass.');
}finally{
  await app?.close().catch(()=>{});
  await new Promise(resolve=>server.close(resolve));
  fs.rmSync(home,{recursive:true,force:true});
}
