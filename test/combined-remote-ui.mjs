// Actual shared renderer modules with a synthetic remote owner. No providers,
// pairing, user chats, permissions or external services are contacted.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';
import assert from 'node:assert/strict';import {chromium} from 'playwright';
const root=process.env.PROTEUS_TEST_APP_ROOT||path.resolve(import.meta.dirname,'..');
const html='<!doctype html><link rel="stylesheet" href="/public/style.css"><link rel="stylesheet" href="/public/parity.css"><link rel="stylesheet" href="/public/chat-design.css"><link rel="stylesheet" href="/public/palette.css"><link rel="stylesheet" href="/public/toast.css"><main id="main"></main><dialog id="dialog"></dialog><div id="toast"></div><script src="/public/markdown/runtime.js"></script>';
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://fixture').pathname,file=path.resolve(root,'.'+pathname);if(pathname.startsWith('/public/')&&file.startsWith(root+path.sep)){res.setHeader('Content-Type',file.endsWith('.css')?'text/css':'text/javascript');res.end(fs.readFileSync(file));}else{res.setHeader('Content-Type','text/html');res.end(html);}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);
 await page.evaluate(async()=>{
  const remote=await import('/public/services/remote/remote-desktops.js'),features=await import('/public/shared/ui/features.js'),details=await import('/public/features/chats/chat-details.js'),links=await import('/public/shared/ui/link-preview.js'),toast=await import('/public/shared/ui/toast.js');
  const failureAt=new Date().toISOString(),resetAt=new Date(Date.now()+60000).toISOString(),workspace={id:'owner-workspace',name:'Owner workspace',cwd:'/synthetic/owner'};
  const run={id:'owner-chat',title:'Synthetic remote scheduled chat',trigger:'scheduled',status:'failed',createdAt:failureAt,updatedAt:failureAt,failureEventAt:failureAt,providerSessionId:'owner-session',runtimeVerified:true,attentionRequired:false,events:[{role:'assistant',at:failureAt,text:'Synthetic [relative file](Notes/a.md).'}, {role:'system',at:failureAt,text:'Claude rate_limit',data:{failure:{kind:'allowance'}}}],schedule:{provider:'codex',model:'owner-model',reasoningEffort:'low',contextTier:'default',serviceTier:'',workspace},context:{workspaceId:workspace.id,workspaceName:workspace.name,entries:[]},chatControls:{steering:true,recovery:true,scheduledRecovery:true,allowanceContinuation:true},permissionContext:{id:'owner-permission',chatRevision:'revision-1',workspaceId:workspace.id,workspaceName:workspace.name,workspaceMode:'custom',mode:'custom',chatMode:'inherit',readOnlyTools:true,workspaceFolders:[{path:'/synthetic/owner',access:'read-write'}],folders:[{path:'/synthetic/owner',access:'read-write'}],rules:[],chatFolders:[],chatRules:[],automaticFolders:[{path:'/synthetic/copilot',access:'read-write',label:'Copilot working folder (automatic)'}]},allowanceStatus:{failureEventAt:failureAt,resetAt},queuedMessages:[{id:'retained-queue',prompt:'Retain queued work'}]};
  const catalog={models:[{id:'owner-model',name:'Owner model',controls:{reasoningEfforts:['low','high'],contextTiers:[{id:'default',promptTokens:128000},{id:'long_context',promptTokens:256000}],serviceTiers:[{id:'fast',name:'Fast'}]}}],checkedAt:new Date().toISOString()};
  const tab={id:'peer:owner:'+run.id,type:'remote-run',hostId:'owner',runId:run.id,label:run.title},state={tab:tab.id,tabs:[tab],data:{runs:[],providerStatuses:{codex:{models:[{id:'local-model',name:'Local model'}]}}}},calls=[],notices=[];
  const peer={hostId:'owner',label:'Synthetic owner',status:'online'};
  window.fixture={run,catalog,state,calls,notices,legacy:false};
  window.desktop={copyText:async()=>{},onPeer:()=>{},peers:async call=>{
   calls.push(structuredClone(call));if(['list','read'].includes(call.action))return [peer];if(call.action==='connect')return {};const a=call.args||{};
   if(call.method==='sync')return {state:{context:{workspaces:[workspace]},capabilities:['chat.permissions.shared.v1','chat.permissions.folders.v1','chat.permissions.chat.v1','chat.permissions.pending.v1'],attachmentMediaTypes:{},questionAttachmentMediaTypes:{}}};
   if(call.method==='chat.get')return structuredClone({...run,eventStart:0,eventCount:run.events.length,earlier:0});
   if(call.method==='provider.status')return structuredClone(catalog);
   if(call.method==='chat.permissions'){
    if(a.id!==run.id||a.expectedContextId!==run.permissionContext.id)throw Error('Wrong owner/context');const p=run.permissionContext;
    if(a.action==='set-chat-mode'){p.chatMode=a.mode;p.mode=a.mode==='inherit'?p.workspaceMode:a.mode;}
    if(a.action==='grant-chat-folder')p.chatFolders.push({path:a.folder,access:a.access});
    p.chatRevision+='x';return structuredClone(run);
   }
   if(call.method==='chat.recover'){
    if(a.id!==run.id)throw Error('Wrong chat');
    if(a.action==='allowance-auto'){run.allowanceContinuation={enabled:a.enabled};if(a.enabled)run.allowanceContinuation.pending={state:'waiting',failureEventAt:run.failureEventAt,nextAttemptAt:new Date(Date.parse(resetAt)+5000).toISOString()};}
    else if(a.action==='allowance-arm')run.allowanceContinuation={enabled:false,pending:{state:'waiting',failureEventAt:run.failureEventAt,nextAttemptAt:new Date(Date.parse(resetAt)+5000).toISOString()}};
    else if(a.action==='allowance-cancel')run.allowanceContinuation.pending.state='cancelled';
    else if(a.action==='continue'){if(fixture.legacy)throw Error('Open an ordinary chat before continuing.');run.status='queued';}
    return {runId:run.id};
   }
   if(call.method==='chat.send'){run.status='queued';run.events.push({role:'user',at:new Date().toISOString(),text:a.prompt,data:{delivery:{id:a.messageId,state:'delivered'}}});return {runId:run.id};}
   throw Error('Unexpected owner method '+call.method);
  }};
  const ui={state,escape:value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),toast:message=>notices.push(message),time:value=>new Date(value).toLocaleString(),api:async()=>{throw Error('A remote operation reached the local API');},replaceChatContent:html=>document.querySelector('#main').innerHTML=html,openTab:()=>{throw Error('Must retain original remote chat');},showDialog:(html,submit)=>{const dialog=document.querySelector('#dialog');dialog.innerHTML=html;dialog.showModal();dialog.querySelector('#close-dialog')?.addEventListener('click',()=>dialog.close());dialog.querySelector('#dialog-submit')?.addEventListener('click',async()=>{try{await submit();dialog.close();}catch(error){ui.toast(error.message);}});},openWorkspace:value=>{fixture.openedWorkspace=value;}};
  features.initFeatures(ui);remote.initRemoteDesktops(ui);fixture.render=()=>remote.renderRemoteRun(tab);fixture.expectedPermissions=()=>{const host=document.createElement('div');host.innerHTML=details.approvalDetails(run.permissionContext,{desktopPreview:true,workspaceName:workspace.name});return host.firstElementChild.outerHTML;};links.installLinkPreview();fixture.toast=toast.createToast(document.querySelector('#toast'));await fixture.render();
 });
 await page.locator('#peer-next-model option[value="owner-model"]').waitFor({state:'attached'});assert.equal(await page.locator('#peer-next-model').inputValue(),'owner-model');assert.equal(await page.locator('#peer-next-model-effort').getAttribute('aria-label'),'Thinking effort');assert.equal(await page.locator('#peer-next-model option[value="local-model"]').count(),0);
 assert.equal(await page.locator('.preview-permissions').evaluate(node=>node.outerHTML),await page.evaluate(()=>fixture.expectedPermissions()));
 await page.locator('#peer-followup').fill('Retained remote draft');await page.locator('#peer-next-model-effort').selectOption('high');
 await page.locator('#peer-next-model-context').selectOption('long_context');
 await page.evaluate(()=>{fixture.catalog.models.push({id:'owner-fixed',name:'Owner fixed context',controls:{reasoningEfforts:['high'],contextTiers:[{id:'default'}],serviceTiers:[]}});});
 await page.locator('#peer-refresh-models').click();
 await page.locator('#peer-next-model option[value="owner-fixed"]').waitFor({state:'attached'});
 await page.locator('#peer-next-model').selectOption('owner-fixed');
 assert.equal(await page.locator('#peer-next-model-context').isVisible(),false);assert.equal(await page.locator('#peer-next-model-context').inputValue(),'default');
 await page.locator('#peer-next-model').selectOption('owner-model');assert.equal(await page.locator('#peer-next-model-context').isVisible(),true);
 await page.locator('[data-preview-chat-mode="ask"]').click();await page.waitForFunction(()=>fixture.run.permissionContext.chatMode==='ask');await page.locator('[data-preview-chat-mode="ask"][aria-pressed=true]').waitFor();assert.equal(await page.locator('#peer-followup').inputValue(),'Retained remote draft');assert.equal(await page.locator('#peer-next-model-effort').inputValue(),'high');
 await page.locator('[data-preview-add-folder]').click();assert.equal(await page.locator('[data-preview-pick-folder]').isDisabled(),true);await page.locator('#preview-folder-path').fill('/synthetic/owner/extra');await page.locator('#preview-folder-access').selectOption('read-write');await page.locator('#dialog-submit').click();await page.locator('#dialog').waitFor({state:'hidden'});await page.waitForFunction(()=>fixture.run.permissionContext.chatFolders.length===1);
 await page.locator('[data-allowance-auto]').check();await page.getByRole('button',{name:'Cancel allowance continuation',exact:true}).waitFor();assert.equal(await page.locator('[data-allowance-auto]').isChecked(),true);await page.locator('[data-allowance-auto]').uncheck();await page.getByRole('button',{name:/Continue chat when allowance resets at/}).click();await page.getByRole('button',{name:'Cancel allowance continuation',exact:true}).waitFor();await page.getByRole('button',{name:'Cancel allowance continuation',exact:true}).click();
 const link=page.locator('.message a').first();const beforeHover=await page.evaluate(()=>fixture.calls.length);await link.hover();await page.locator('.link-destination-preview').filter({hasText:'file:///synthetic/owner/Notes/a.md'}).waitFor();assert.equal(await page.evaluate(()=>fixture.calls.length),beforeHover);await page.mouse.move(0,0);await page.locator('.link-destination-preview').waitFor({state:'hidden'});
 await page.evaluate(()=>fixture.toast('Synthetic bottom notification'));const bounds=await page.locator('#toast').boundingBox();assert.ok(bounds.y>800);await page.locator('[aria-label="Dismiss notification"]').click();
 await page.evaluate(()=>{fixture.legacy=true;});await page.getByRole('button',{name:'Continue chat',exact:true}).click();await page.waitForFunction(()=>fixture.run.status==='queued');assert.equal(await page.evaluate(()=>fixture.calls.filter(c=>c.method==='chat.send').length),1);assert.equal(await page.evaluate(()=>fixture.run.providerSessionId),'owner-session');assert.equal(await page.evaluate(()=>fixture.run.queuedMessages[0].id),'retained-queue');assert.equal(await page.locator('#peer-followup').inputValue(),'Retained remote draft');
 assert.deepEqual(await page.evaluate(()=>fixture.state.data.providerStatuses.codex.models.map(m=>m.id)),['local-model']);assert.deepEqual(await page.evaluate(()=>fixture.notices),[]);assert.deepEqual(errors,[]);
 await page.setViewportSize({width:640,height:900});await page.screenshot({path:process.cwd()+'/.runtime-tests/combined-remote-narrow.png'});
 console.log(JSON.stringify({passed:true,sharedPermissions:true,ownerModelCatalog:true,unsupportedContextHidden:true,supportedContextSelectable:true,remoteDraftAndModelRetained:true,ownerAllowanceControls:true,legacyScheduledContinue:true,relativeLinkPreviewWithoutReads:true,bottomWebToast:true,noProviderCalls:true}));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
