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
  app=await electron.launch({args:['test/artifact-preview-host.cjs',`--user-data-dir=${path.join(home,'electron')}`],env:{...process.env,PROTEUS_HOME:home},timeout:60000});
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
  console.log('Electron HTML preview blocks meta/image/fetch/navigation/popup requests; scripts require opt-in.');
}finally{
  await app?.close().catch(()=>{});
  await new Promise(resolve=>server.close(resolve));
  fs.rmSync(home,{recursive:true,force:true});
}
