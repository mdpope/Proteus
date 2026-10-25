// Explicit opt-in: real local model turns; all context and state are synthetic.
import {_electron as electron} from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
if(process.env.PROTEUS_MTPLX_LIVE!=='1')throw Error('Set PROTEUS_MTPLX_LIVE=1 to call the local model.');
const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-mtplx-'))),preview=path.join(root,'preview'),token='pilot-'+randomUUID(),errors=[];
let app,page,runId;const receipt={synthetic:true,provider:'mtplx',passed:false};
const api=(route,payload)=>page.evaluate(async({route,payload})=>{const response=await fetch(route,payload?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}:{});const value=await response.json();if(!response.ok)throw Error(value.error||'HTTP '+response.status);return value;},{route,payload});
const until=async(check,label,ms=180000)=>{const end=Date.now()+ms;while(Date.now()<end){const value=await check();if(value)return value;await new Promise(resolve=>setTimeout(resolve,250));}throw Error('Timed out: '+label);};
const current=async()=>(await api('/api/state')).runs.find(run=>run.id===runId);
const finish=()=>until(async()=>{const run=await current();return !['running','queued','awaiting_input'].includes(run.status)&&run;},'local model turn');
const openChat=async()=>{if(!await page.locator('#followup').isVisible()){await page.locator('[data-chat-subtab="'+runId+'"]').click();await page.locator('#followup').waitFor();}};
const close=async()=>{if(!app)return;const owned=app;app=null;const timer=setTimeout(()=>{void owned.evaluate(({app})=>app.exit(0)).catch(()=>owned.process().kill('SIGKILL'));},10000);try{await owned.close();}finally{clearTimeout(timer);}};
const launch=async()=>{const executablePath=process.env.PROTEUS_MTPLX_LIVE_EXECUTABLE;app=await electron.launch({...(executablePath?{executablePath,args:[]}:{args:['.']}),env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:preview,PORT:'0'},timeout:120000});page=await app.firstWindow();page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(30000);await page.locator('#topbar-home').waitFor({timeout:120000});};
try {
  await launch();
  let state=await api('/api/state');assert.equal(state.desktopPreview.enabled,true);
  await api('/api/provider',{provider:'mtplx',force:true});state=await api('/api/state');
  const catalog=state.providerStatuses.mtplx;assert.equal(catalog.available,true,catalog.error);assert.equal(catalog.stale,false);receipt.model=catalog.models[0].id;
  const workspace=state.context.workspaces.find(w=>w.name==='Studio');assert.ok(workspace.cwd.startsWith(preview+path.sep));
  fs.writeFileSync(path.join(workspace.cwd,'AGENTS.md'),'# Synthetic MTPLX pilot\n\nThe pilot verification token is '+token+'. Use supplied text only.\n',{flag:'wx',mode:0o600});
  await api('/api/context/refresh',{workspaceId:workspace.id});const context=await api('/api/context?workspaceId='+workspace.id),source=context.entries.find(e=>e.path===path.join(workspace.cwd,'AGENTS.md'));assert.ok(source);
  await page.locator('[data-preview-open-project]').filter({hasText:'Design review'}).click();
  await page.locator('[data-preview-new-chat]').click();const provider=page.locator('.new-chat-main select[id$="-provider"]');await provider.waitFor();const prefix=(await provider.getAttribute('id')).replace(/-provider$/,'');const field=name=>page.locator('#'+prefix+'-'+name);await provider.selectOption('mtplx');
  await until(async()=>await field('model').locator('option').count()>1,'MTPLX model picker');
  await field('model').selectOption(receipt.model);
  await field('context').locator('summary').first().click();await field('defaults').selectOption('false');await page.locator('[data-select-context="'+source.id+'"]').check();
  await field('title').fill('MTPLX pilot verification');
  await field('prompt').fill('Reply with the exact pilot verification token from the selected instructions. Remember the word amber-otter for my next message.');
  await page.locator('[data-chat-setup-submit]').click();await page.locator('#followup').waitFor();
  runId=await until(async()=>(await api('/api/state')).runs.find(r=>r.schedule.provider==='mtplx')?.id,'new MTPLX chat');
  let run=await finish();assert.equal(run.status,'completed',JSON.stringify(run.events.at(-1)));assert.ok(run.events.some(e=>e.role==='assistant'&&e.text.includes(token)));assert.equal(run.schedule.context.entries.length,1);assert.equal(run.schedule.context.entries[0].id,source.id);assert.ok(run.usage.observed);receipt.contextVerified=true;
  console.log('PASS live selected context and first response; checking history and SVG.');
  await openChat();
  await page.locator('#followup').fill('What word did I ask you to remember? Then draw a simple stop sign in a fenced svg code block. Use only svg, polygon and text elements, xmlns="http://www.w3.org/2000/svg", and static presentation attributes. No style attributes, CSS, scripts, links or images.');
  await page.locator('#continue').click();await until(async()=>(await current()).events.filter(e=>e.role==='user').length===2,'second turn');run=await finish();assert.equal(run.status,'completed',JSON.stringify(run.events.at(-1)));assert.match(run.events.filter(e=>e.role==='assistant').at(-1).text,/amber-otter/i);
  await openChat();await until(async()=>page.locator('.mtplx-svg-preview img').evaluateAll(images=>images.some(img=>img.complete&&img.naturalWidth>0)),'rendered SVG',15000);receipt.historyVerified=true;receipt.svgVerified=true;
  console.log('PASS live multi-turn history and rendered SVG.');
  const security=await page.evaluate(async()=>{const {safeSvg}=await import('/features/chats/svg-preview.js');const wrap=content=>'<svg xmlns="http://www.w3.org/2000/svg">'+content+'</svg>';return {shape:!!safeSvg(wrap('<circle r="10" fill="red"/>')),script:safeSvg(wrap('<script>alert(1)</script>')),event:safeSvg(wrap('<circle onload="alert(1)"/>')),external:safeSvg(wrap('<image href="https://example.com/x"/>')),html:safeSvg(wrap('<foreignObject><p>x</p></foreignObject>')),css:safeSvg(wrap('<rect style="fill:url(https://example.com)"/>')),entity:safeSvg('<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]>'+wrap('<text>&x;</text>')),gradient:!!safeSvg(wrap('<defs><linearGradient id="paint"><stop offset="0" stop-color="red"/></linearGradient></defs><rect fill="url(#paint)" width="20" height="20"/>'))};});
  assert.deepEqual(security,{shape:true,script:null,event:null,external:null,html:null,css:null,entity:null,gradient:true});receipt.svgSecurityVerified=true;
  await page.screenshot({path:path.join(root,'mtplx-chat.png')});
  await page.locator('#followup').fill('Write a very long detailed story with at least 100 paragraphs. Start now.');await page.locator('#continue').click();await until(async()=>(await current()).status==='running','cancellable turn');await page.locator('#cancel').click();run=await finish();assert.equal(run.status,'cancelled');receipt.stopVerified=true;
  console.log('PASS SVG isolation checks and real Stop; restarting isolated preview.');
  await close();await launch();state=await api('/api/state');run=state.runs.find(r=>r.id===runId);assert.ok(run.events.some(e=>e.role==='assistant'&&e.text.includes(token)));assert.equal(run.providerSessionId,'mtplx:'+runId);receipt.restartHistoryVerified=true;
  // Continue through the owner API after a real process restart, using the saved run.
  await api('/api/runs/'+runId+'/send',{mode:'queue',prompt:'Reply with only the word I asked you to remember in my first message.'});run=await finish();assert.equal(run.status,'completed',JSON.stringify(run.events.at(-1)));assert.match(run.events.filter(e=>e.role==='assistant').at(-1).text,/amber-otter/i);receipt.restartReplayVerified=true;
  assert.deepEqual(errors,[]);Object.assign(receipt,{passed:true,runId,inputTokens:run.usage.inputTokens,outputTokens:run.usage.outputTokens});
  console.log(JSON.stringify({...receipt,evidenceRoot:root},null,2));
} catch(error) {await page?.screenshot({path:path.join(root,'failure.png')}).catch(()=>{});console.error(error);console.error('Evidence: '+root);throw error;}
finally {fs.writeFileSync(path.join(root,'receipt.json'),JSON.stringify(receipt,null,2)+'\n',{mode:0o600});await close();}
