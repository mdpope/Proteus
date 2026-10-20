// Opt-in LIVE Codex desktop acceptance, using only synthetic workspace content.
// Run: PROTEUS_PREVIEW_LIVE=1 node test/desktop-preview-live.mjs
// Optional: PROTEUS_PREVIEW_LIVE_HOME=/absolute/private/preview (preserved),
// PROTEUS_PREVIEW_LIVE_EXECUTABLE=/path/to/Proteus Design Preview.app/Contents/MacOS/Proteus Design Preview
// The desktop runtime stages auth.json only. This test never reads/prints its contents,
// imports real chat history/config, or changes global HOME/CODEX_HOME.
import {_electron as electron} from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';

if(process.env.PROTEUS_PREVIEW_LIVE!=='1')throw new Error('Live model use is opt-in: set PROTEUS_PREVIEW_LIVE=1.');
const suppliedRoot=process.env.PROTEUS_PREVIEW_LIVE_HOME;
const rememberFolder=process.env.PROTEUS_PREVIEW_LIVE_REMEMBER==='1';
if(suppliedRoot&&!path.isAbsolute(suppliedRoot))throw new Error('PROTEUS_PREVIEW_LIVE_HOME must be absolute.');
const temporary=suppliedRoot?null:fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-live-preview-')));
const previewRoot=suppliedRoot||path.join(temporary,'preview');
const nonce=randomUUID().replaceAll('-',''),greeting='PREVIEW_LIVE_READY_'+nonce,finished='PREVIEW_LIVE_EDIT_OK_'+nonce;
const title='Synthetic live verification '+nonce.slice(0,8);
let app,page,runId,receipt={syntheticWorkspace:true,realProvider:true,passed:false};
const step=message=>console.log('[preview live] '+message);
const api=async(route,payload)=>page.evaluate(async({route,payload})=>{
 const response=await fetch(route,{...(payload?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}:{})});
 if(!response.ok)throw new Error('Preview API returned HTTP '+response.status);return response.json();
},{route,payload});
const currentRun=async()=>{const state=await api('/api/state');return state.runs.find(run=>run.id===runId);};
const until=async(check,label,timeout=180000)=>{
 const deadline=Date.now()+timeout;while(Date.now()<deadline){const result=await check();if(result)return result;await new Promise(resolve=>setTimeout(resolve,300));}throw new Error('Timed out waiting for '+label+'.');
};
const assertCompleted=run=>{assert.equal(run.status,'completed','Live turn failed or stopped: '+run.status);return run;};
const shellQuote=value=>"'"+value.replaceAll("'","'\\''")+"'";
try{
 // Refuse to take over an existing preview process; never quit or attach to another experiment.
 const connection=path.join(previewRoot,'app-data','connection.json');
 if(fs.existsSync(connection)){
  const {pid}=JSON.parse(fs.readFileSync(connection,'utf8'));let running=false;
  try{process.kill(pid,0);running=true;}catch(error){if(error.code==='EPERM')running=true;else if(error.code!=='ESRCH')throw error;}
  if(running)throw new Error('The requested preview home is already running. Use a fresh live-test home.');
 }
 step('Launching separate desktop with private provider session storage.');
 const executablePath=process.env.PROTEUS_PREVIEW_LIVE_EXECUTABLE;
 app=await electron.launch({...(executablePath?{executablePath,args:[]}:{args:['.']}),env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:previewRoot,PORT:'0'},timeout:120000});
 page=await app.firstWindow();page.setDefaultTimeout(30000);
 await page.locator('[data-preview-new-project]').waitFor({timeout:120000});
 const initial=await api('/api/state');assert.equal(initial.desktopPreview?.enabled,true);
 assert.equal(initial.schedules.length,0,'Use a synthetic preview with no operational schedules.');
 await api('/api/provider',{provider:'codex',force:true});
 const refreshed=await api('/api/state'),catalog=refreshed.providerStatuses?.codex;
 assert.equal(catalog?.available,true,'Existing authentication did not produce an available isolated Codex account: '+(catalog?.error||'status unavailable'));
 assert.equal(catalog.stale,false,'Codex catalog refresh must succeed before live model use.');assert.ok(!catalog.error,'Codex status reports an error.');
 assert.ok(catalog.checkedAt&&catalog.models?.length,'Fresh provider metadata is required.');
 const availableModels=catalog.models.filter(item=>item.policy?.state!=='disabled');
 const model=availableModels.find(item=>item.id===catalog.defaultModel||item.isDefault)||availableModels[0];assert.ok(model,'No enabled model is available.');
 const effort=model.controls?.defaultReasoningEffort||'';
 if(effort)assert.ok(model.controls.reasoningEfforts.includes(effort),'Default effort must be advertised.');
 receipt={...receipt,model:model.id,effort:effort||'provider default',catalogCheckedAt:catalog.checkedAt};
 step('Isolated account and refreshed catalog ready; starting real chat through the UI.');
 const workspace=refreshed.context.workspaces.find(item=>item.name==='Studio');assert.ok(workspace,'Synthetic Studio workspace is required.');
 const root=fs.realpathSync(workspace.cwd),privateRoot=fs.realpathSync(previewRoot);
 assert.ok(root.startsWith(privateRoot+path.sep),'The live test workspace must be inside the private preview.');
 assert.equal(workspace.approvals?.mode,'ask','Use a fresh Ask-mode workspace so the approval is real.');
 const target=path.join(root,'docs','live-verification-'+nonce+'.txt'),contents=finished+'\n';
 assert.equal(fs.existsSync(target),false);
 const existingIds=new Set(refreshed.runs.map(run=>run.id));
 await page.locator('[data-preview-open-project]').filter({hasText:'Design review'}).click();
 await page.locator('[data-preview-new-chat]').click();await page.locator('#chat-prompt').waitFor();
 await until(async()=>await page.locator('#chat-model option').count()>1,'available model picker');
 await page.locator('#chat-model').selectOption(model.id);
 // New-chat composer may compact the select visually, but native selectOption uses its real control.
 if(await page.locator('#chat-model-effort').isEnabled())await page.locator('#chat-model-effort').selectOption(effort,{force:true});
 else assert.equal(effort,'','A reported default effort requires an enabled picker.');
 await page.locator('#chat-title').fill(title);
 await page.locator('#chat-prompt').fill('This is an authorized synthetic desktop integration test. Do not use tools or read files. Reply with exactly '+greeting+'.');
 await page.locator('#dialog-submit').click();await page.locator('#followup').waitFor();
 const created=await until(async()=>{const state=await api('/api/state');return state.runs.find(run=>!existingIds.has(run.id)&&run.title===title);},'new live chat');runId=created.id;
 const first=assertCompleted(await until(async()=>{const run=await currentRun();if(run.pending)throw new Error('The initial no-tools turn unexpectedly requested input.');return !['queued','running'].includes(run.status)&&run;},'initial live response'));
 assert.equal(first.schedule.provider,'codex');assert.equal(first.schedule.model,model.id);assert.ok(first.providerSessionId);
 assert.equal(fs.realpathSync(first.providerHome),fs.realpathSync(path.join(previewRoot,'codex')),'Provider session home must remain private.');
 assert.ok(first.events.some(event=>event.role==='assistant'&&event.text.includes(greeting)),'Actual assistant greeting missing.');
 await page.locator('#conversation-host').getByText(greeting,{exact:false}).first().waitFor();
 receipt={...receipt,runId,providerSessionId:first.providerSessionId,initialResponseVerified:true};
 step('Live response received; requesting a single synthetic file edit requiring approval.');
 const command='/usr/bin/printf '+shellQuote('%s\n')+' '+shellQuote(finished)+' > '+shellQuote(target);
 const allowedCommands=new Set([command,...['/bin/zsh','/bin/bash','zsh','bash'].map(shell=>shell+' -lc '+shellQuote(command))]);
 await page.locator('#followup').fill(`Create exactly one new plain-text file at ${JSON.stringify(target)} containing exactly ${JSON.stringify(contents)}. This is an authorized disposable fixture inside the synthetic preview. Use your native apply_patch file tool. If that is unavailable, run exactly this command: ${command}\nDo not modify any other file, use network access, or run other commands. Let the normal provider approval UI request approval; do not simulate an approval. After the tool succeeds, reply with exactly ${finished}.`);
 await page.locator('#continue').click();
 await until(async()=>{const run=await currentRun();return ['queued','running','awaiting_input'].includes(run.status)||run.events.some(event=>event.role==='user'&&event.text.includes(target));},'file-edit continuation accepted');
 let approvals=0,second;
 const deadline=Date.now()+240000;
 while(Date.now()<deadline){
  const run=await currentRun();
  if(run.pending){
   const pending=run.pending,d=pending.details||{};
   assert.equal(pending.type,'permission','Only a real provider permission request is expected.');
   if(d.kind==='write')assert.equal(path.resolve(root,d.resolvedPath||d.fileName||''),target,'Refusing approval for any other file.');
   else if(d.kind==='shell')assert.ok(allowedCommands.has(d.fullCommandText),'Refusing command differing from the exact synthetic write.');
   else throw new Error('Refusing unexpected permission kind: '+d.kind);
   assert.equal(d.managedApprovalRequired===true,false,'Enterprise approval cannot be substituted by this test.');
   assert.ok(++approvals<=3,'Unexpected repeated approval loop.');
   await page.locator('.pending .preview-approval-request').waitFor();
   assert.match(await page.locator('.pending').innerText(),/Allow once/);
   await page.locator('#followup').fill('Synthetic draft preserved while approval is pending.');
   const current=await currentRun();assert.equal(current.pending?.id,pending.id,'Permission request changed before click.');
   if(rememberFolder){
    assert.equal(d.kind,'write','Remember test requires native file approval.');
    await page.locator('[data-preview-remember]').click();
    await page.locator('[data-preview-remember-choice=trust-folder-chat]').click();
    await page.locator('#dialog-submit').click();
   }else await page.locator('#approve').click();
   await until(async()=>{const next=await currentRun();return next.pending?.id!==pending.id;},'approval receipt',30000);
   assert.equal(await page.locator('#followup').inputValue(),'Synthetic draft preserved while approval is pending.');
  }else if(!['queued','running'].includes(run.status)){second=assertCompleted(run);break;}
  await new Promise(resolve=>setTimeout(resolve,300));
 }
 assert.ok(second,'File-edit turn did not complete.');assert.ok(approvals>0,'No real approval request was observed; do not claim approval UI acceptance.');
 assert.equal(fs.readFileSync(target,'utf8'),contents,'Verify actual file bytes, not just the model response.');
 assert.ok(second.events.some(event=>event.role==='assistant'&&event.text.includes(finished)),'Actual assistant completion missing.');
 assert.ok(second.events.some(event=>{const permission=event.permission||event.data?.permission;return permission?.automatic===false&&permission.decision===(rememberFolder?'trust-folder-chat':'approve');}),'Interactive approval receipt missing.');
 assert.equal(second.providerSessionId,first.providerSessionId,'Continuation must preserve provider session.');
 assert.equal(second.chatPermission?.mode==='autopilot',false,'Approve once must not enable broad chat approval.');
 await page.locator('#conversation-host').getByText(finished,{exact:false}).first().waitFor();
 const evidence=path.join(previewRoot,'live-verification');fs.mkdirSync(evidence,{recursive:true,mode:0o700});
 await page.screenshot({path:path.join(evidence,nonce+'.png')});
 if(rememberFolder){assert.ok(second.chatPermission?.folders?.some(folder=>folder.path===root&&folder.access==='read-write'),'Advertised chat-only workspace-folder grant missing');assert.ok(!second.events.some(event=>event.role==='system'&&/turn was stopped|permissions changed during/i.test(event.text)),'Adding folder access interrupted the turn');}
 receipt={...receipt,passed:true,rememberedChatFolder:rememberFolder,approvalCount:approvals,fileVerified:true,continuationVerified:true,draftPreserved:true,usageObserved:second.usage?.observed===true};
 fs.writeFileSync(path.join(evidence,nonce+'.json'),JSON.stringify(receipt,null,2)+'\n',{mode:0o600});
 step('PASS: live response, real inline approval, exact file result and same-session continuation.');
}catch(error){receipt.error=error.message;throw error;}
finally{
 // A failed check never approves or submits another message. Closing only this isolated app
 // cancels its unfinished test turn; a caller-owned preview directory is never deleted.
 await app?.close();
 if(temporary){fs.rmSync(temporary,{recursive:true,force:true});}
 console.log(JSON.stringify({...receipt,...(suppliedRoot?{previewRoot}:{}),temporaryDataRemoved:!!temporary}));
}
