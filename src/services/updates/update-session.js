import {createHash} from 'node:crypto';
const starting=new WeakMap();
/** One durable new chat per user update operation; a retry never adopts an old chat. */
export async function startUpdateSession(service,request){
 const {engine,updates}=service;
 if(!updates?.packaged)throw Error('Install the desktop app before starting an update.');
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(request.operationId||''))throw Error('A stable update operation ID is required.');
 const selection={action:request.manifest?'import-release':'stage-release',channel:request.channel||'stable',...(request.manifest?{manifest:request.manifest}:{releaseId:request.releaseId,manifestDigest:request.manifestDigest})};
 const instructions=request.instructions||'';
 if(typeof instructions!=='string'||instructions.length>12000)throw Error('Update instructions must be text no longer than 12000 characters.');
 const signature=createHash('sha256').update(JSON.stringify(instructions?{...selection,instructions}:selection)).digest('hex');
 const existing=()=>{const run=engine.listRuns().find(run=>run.schedule.updateSession?.operationId===request.operationId);if(run&&run.schedule.updateSession.signature!==signature)throw Error('This update operation already selected a different release.');return run;};
 const prior=existing();if(prior)return prior;
 // Serialize different starts as well as retries while provider metadata loads.
 while(starting.has(engine)){
  await starting.get(engine);const run=existing();if(run)return run;
 }
 const operation=(async()=>{
  const job=updates.job();if(job&&!['complete','cancelled','attention'].includes(job.phase))throw Error('Finish or cancel the current update first.');
  if(engine.listRuns().some(run=>run.schedule.purpose==='update'&&['queued','running','awaiting_input'].includes(run.status)))throw Error('An update chat is already active. Finish it before starting another update.');
  const release=await updates.selectedRelease(selection);
  const schedule=await service.buildChatSchedule({purpose:'update',name:`Proteus ${release.version} update`,prompt:`Install the exact selected release ${release.version} (${release.buildRevision}).\nRelease ID: ${release.id}\nSource fingerprint: ${release.sourceFingerprint}\nStart with proteus_update ${selection.action} using these exact arguments: ${JSON.stringify(selection)}. Prepare and verify this release, record all completed and remaining work, then hand off from THIS new chat and verify installation after restart. Do not reuse a previous update chat or change provider defaults.${instructions?'\n\nAdditional authorized checks and migration instructions:\n'+instructions:''}`});
  schedule.updateSession={operationId:request.operationId,signature,releaseId:release.id,version:release.version,manifestDigest:selection.manifestDigest};
  return engine.createRun(schedule,'chat');
 })();
 starting.set(engine,operation);
 try{return await operation;}finally{if(starting.get(engine)===operation)starting.delete(engine);}
}
