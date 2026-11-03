import {scheduleAccessScope} from '../settings/schedule-access-rule.js';
import path from 'node:path';
import fs from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {atomicJSON,readJSON} from '../../shared/files.js';
import {revision,validateSchedule} from './schedules.js';
import {validateModelOptions} from '../../models/model-catalog.js';
const active=new Set(['queued','running','awaiting_input']),uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const digest=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const pick=(value,keys)=>Object.fromEntries(keys.filter(key=>value[key]!==undefined).map(key=>[key,value[key]]));
const editable=['name','cron','timezone','provider','model','reasoningMode','reasoningEffort','contextTier','serviceTier','prompt','misfire','contextSelection','workspaceSources','executionPermissions','notifications'];

// This tool owns schedule/test intents only. Native services and their takeover
// gates remain with their existing owners. No operation resolves tool approvals.
export class ScheduleControl {
 constructor(service){this.service=service;this.root=path.join(service.home,'schedule-tests');this.file=path.join(this.root,'operations.json');this.records=readJSON(this.file,{version:1,operations:[]});if(this.records.version!==1||!Array.isArray(this.records.operations))throw Error('Invalid schedule test receipts; original data preserved.');this.accessFile=path.join(this.root,'access.json');this.access=readJSON(this.accessFile,{version:1,grants:[]});if(this.access.version!==1||!Array.isArray(this.access.grants)||this.access.grants.some(grant=>!scheduleAccessScope(grant.scope)))throw Error('Invalid schedule access store; original preserved.');this.inflight=new Map();this.locks=new Set();}
 host(args){const host=this.service.chatControl.localId();if(args.hostId!==host)throw Error('Choose this owning computer from computers. Schedule control does not fall back to another host.');return host;}
 permitted(actor,hostId,action,id){if(actor==='operator')return true;const contextId=this.service.chatControl.context(actor);return this.access.grants.some(grant=>grant.actor===actor&&grant.contextId===contextId&&grant.scope.hostId===hostId&&grant.scope.actions.includes(action)&&grant.scope.scheduleIds.includes(id));}
 check(actor,args,action,id=args.scheduleId){this.host(args);this.service.chatControl.assertCaller();if(!this.permitted(actor,args.hostId,action,id))throw Error('Schedule access is not authorized for this exact scope. Use request-access.');}
 async requestAccess(actor,args){
  if(actor==='operator')throw Error('The trusted owner already controls its schedules.');
  const scope=scheduleAccessScope({hostId:args.hostId,scheduleIds:args.scheduleIds,actions:args.actions});if(!scope)throw Error('Choose exact schedule IDs and supported actions.');
  const engine=this.service.engine,run=engine.getRun(actor),turn=engine.running.get(actor),contextId=this.service.chatControl.context(actor);if(!turn||turn.controller.signal.aborted)throw Error('Schedule access belongs to an active originating turn.');
  const details={kind:'schedule-access',toolName:'proteus_schedules',args:{scope},intention:`Allow ${scope.actions.join(', ')} for schedules ${scope.scheduleIds.join(', ')} on this owner? This does not approve their tools or enable native replacements.`};
  const answer=await engine.ask(run,{type:'permission',question:details.intention,details},turn.controller.signal);
  if(!['approve','approve-auto'].includes(answer))throw Error('Schedule access was denied.');
  if(engine.running.get(actor)!==turn||turn.controller.signal.aborted||this.service.chatControl.context(actor)!==contextId)throw Error('The originating context changed during schedule approval.');
  if(answer==='approve-auto'&&!engine.decidePermission(run,details).allowed)throw Error('Schedule scope approval changed.');
  this.service.chatControl.assertCaller();const grant={id:randomUUID(),actor,contextId,scope,createdAt:new Date().toISOString()};this.access.grants.push(grant);atomicJSON(this.accessFile,this.access);return {granted:true,grant};
 }
 current(args){const schedule=this.service.engine.schedules.get(args.scheduleId);if(!args.expectedRevision||revision(schedule)!==args.expectedRevision)throw Error('Schedule changed. Read the current revision before proceeding.');return schedule;}
 view(schedule){return {...pick(schedule,['id','name','enabled','cron','timezone','provider','model','reasoningMode','reasoningEffort','contextTier','serviceTier','prompt','misfire','contextSelection','workspaceSources','executionPermissions','notifications','source','error']),prompt:String(schedule.prompt||'').slice(0,24000),promptTruncated:String(schedule.prompt||'').length>24000,revision:revision(schedule),mcpServerNames:Object.keys(schedule.mcpServers||{}),capturedSources:(schedule.context?.entries||[]).map(entry=>pick(entry,['id','name','kind','hash'])),availableMcpServerNames:[...new Set([...Object.keys(this.service.settings.get().mcpServers||{}),...Object.keys(schedule.mcpServers||{})])]};}
 save(){atomicJSON(this.file,this.records);}
 runView(run,{results=true}={}){let budget=24000;const events=results?run.events.slice(-20).reverse().map(event=>{const text=String(event.text||'').slice(0,Math.max(0,Math.min(6000,budget)));budget-=text.length;return {role:event.role,at:event.at,text};}).reverse():undefined;return {runId:run.id,scheduleId:run.schedule.id,scheduleRevision:run.scheduleTest?.scheduleRevision||run.scheduleRevision,futureScheduleRevision:run.scheduleTest?.futureScheduleRevision||null,runRevision:revision(run.schedule),operationId:run.scheduleTest?.operationId||null,status:run.status,pending:run.pending?{id:run.pending.id,type:run.pending.type,question:String(run.pending.question||'').slice(0,2000),humanApprovalRequired:run.pending.type==='permission'}:null,createdAt:run.createdAt,updatedAt:run.updatedAt,captured:pick(run.schedule,['provider','model','reasoningMode','reasoningEffort','contextTier','serviceTier']),...(results?{sourceHashes:(run.schedule.context?.entries||[]).slice(0,200).map(entry=>pick(entry,['id','hash','kind'])),usage:pick(run.usage||{},['inputTokens','outputTokens','cachedInputTokens','totalTokens','observed']),events}:{}),outcome:run.status==='completed'?'model-turn-completed':'not-completed',externalOutcomeVerified:false};}
 targetRun(args){const run=this.service.engine.getRun(args.runId);if(run.schedule.id!==args.scheduleId||!['manual','scheduled'].includes(run.trigger))throw Error('Choose an exact run of this schedule.');if(run.schedule.provider==='local-process')throw Error('Native service runs keep their existing control boundary.');return run;}
 idle(run){if(active.has(run.status)||this.service.engine.running.has(run.id))throw Error('Wait for the captured run to finish before changing its sources.');}
 async preflight(schedule,{captured=false}={}){
  if(schedule.provider==='local-process')throw Error('Native service replacements cannot be started by this tool. Observe/control their existing owner.');
  validateSchedule(schedule);const engine=this.service.engine,prepared=structuredClone(captured?schedule:engine.prepareSchedule(schedule,'manual'));if(prepared.context)prepared.context.followsWorkspace=false;engine.beforeRun?.(prepared);
  for(const folder of [prepared.workspace.cwd,...prepared.workspace.additionalDirectories])if(!fs.statSync(folder).isDirectory())throw Error('A configured working directory is unavailable.');
  const selection=schedule.contextSelection?.selectedIds||[];
  for(const id of selection)if(!prepared.context?.entries?.some(entry=>entry.id===id))throw Error('A selected source is unavailable. Refresh sources before testing.');
  if(prepared.context?.warnings?.some(warning=>/missing|unavailable|failed|not found/i.test(warning.message||'')))throw Error('Selected sources have loading errors. Review and refresh before testing.');
  if(prepared.provider!=='rehearsal'){
   const catalog=await this.service.catalogs[prepared.provider]?.get(true),model=catalog?.models?.find(item=>item.id===prepared.model);
   if(!catalog?.available||catalog.stale||catalog.error||!model)throw Error('Refresh an available owner provider/model before testing.');validateModelOptions(prepared,model);
  }
  const managed=prepared.context?this.service.context.providerMcpContext(prepared.context):{mcpServers:{}};
  if(Object.keys(prepared.mcpServers||{}).some(name=>managed.disabledLegacyMcp?.includes(name)))throw Error('A selected MCP source is disabled on this owner.');
  const definitions={...prepared.mcpServers,...managed.mcpServers};
  for(const definition of Object.values(definitions))if(!definition||typeof definition!=='object'||(!definition.command&&!definition.url))throw Error('A selected MCP tool definition is unavailable.');
  const profile=engine.permissions.describe(prepared);
  return {prepared,summary:{captured:pick(prepared,['provider','model','reasoningMode','reasoningEffort','contextTier','serviceTier']),sourceHashes:(prepared.context?.entries||[]).map(entry=>pick(entry,['id','hash','kind'])),mcpServerNames:Object.keys(definitions),toolConfigurationChecked:true,approvalMode:profile.mode,permissionsRequireHumanWhenNotPreauthorized:true}};
 }
 async start(actor,args){
  this.check(actor,args,'schedule-test');if(!uuid.test(args.operationId||''))throw Error('Supply a stable UUID operationId.');
  const key=actor+':'+args.operationId,signature=digest(args),prior=this.records.operations.find(record=>record.key===key);
  if(prior){if(prior.signature!==signature)throw Error('operationId already belongs to different test arguments.');const run=[...this.service.engine.runs.values()].find(run=>run.scheduleTest?.receiptId===prior.receiptId);if(run)return {taskId:prior.receiptId,state:'accepted',...this.runView(run)};throw Error('Previous test start is uncertain; inspect the retained receipt before submitting another operation.');}
  if(this.inflight.has(key)){const pending=this.inflight.get(key);if(pending.signature!==signature)throw Error('operationId is in flight with different arguments.');return pending.promise;}
  if(this.locks.has(args.scheduleId))throw Error('A test preflight is already in progress for this schedule.');
  const promise=(async()=>{this.locks.add(args.scheduleId);try{
   let schedule=this.current(args),captured=false;
   if(args.action==='retry-test'){
    const previous=this.targetRun({...args,runId:args.retryOf});if(active.has(previous.status))throw Error('Stop or finish the previous test first.');
    if(!['future-runs','captured-run'].includes(args.settingsScope))throw Error('Choose future-runs or captured-run settings explicitly.');
    if(args.settingsScope==='captured-run'){if(args.expectedRunRevision!==revision(previous.schedule))throw Error('Captured run settings changed. Read its revision again.');schedule=structuredClone(previous.schedule);captured=true;}
   }else if(args.settingsScope!=='future-runs')throw Error('New tests use explicit future-runs settings.');
   if([...this.service.engine.runs.values()].some(run=>run.schedule.id===args.scheduleId&&active.has(run.status)))throw Error('This schedule already has an active run.');
   const {prepared,summary}=await this.preflight(schedule,{captured});this.check(actor,args,'schedule-test');this.current(args);
   const receipt={key,receiptId:randomUUID(),operationId:args.operationId,signature,actor,scheduleId:args.scheduleId,scheduleRevision:revision(prepared),futureScheduleRevision:args.expectedRevision,preparedAt:new Date().toISOString(),settingsScope:args.settingsScope,retryOf:args.retryOf||null};
   this.records.operations.push(receipt);this.save();
   // The receipt is durable before creation; the initial run write includes its
   // linkage before provider execution. A crash can reconcile either side.
   const run=this.service.engine.createRun(prepared,'manual',null,{prepared:true,scheduleTest:{receiptId:receipt.receiptId,operationId:args.operationId,scheduleRevision:revision(prepared),futureScheduleRevision:args.expectedRevision,settingsScope:args.settingsScope,retryOf:args.retryOf||null}});
   receipt.runId=run.id;receipt.acceptedAt=new Date().toISOString();this.save();return {taskId:receipt.receiptId,state:'accepted',preflight:summary,...this.runView(run)};
  }finally{this.locks.delete(args.scheduleId);}})();
  this.inflight.set(key,{signature,promise});try{return await promise;}finally{this.inflight.delete(key);}
 }
 async handle(args={},actor='operator'){
  const control=this.service.chatControl,turn=actor==='operator'?null:this.service.engine.running.get(actor);
  return control.callers.run({actor,turn},async()=>{
   control.assertCaller();if(this.closed)throw Error('Schedule controls are closing.');
   if(args.action==='computers')return {computers:[{hostId:control.localId(),label:this.service.remote.info().label,local:true}]};
   this.host(args);
   if(args.action==='request-access')return this.requestAccess(actor,args);
   if(args.action==='list'){
    const rows=this.service.engine.schedules.list().filter(schedule=>this.permitted(actor,args.hostId,'schedule-read',schedule.id)).map(schedule=>pick(this.view(schedule),['id','name','enabled','provider','model','reasoningEffort','cron','timezone','revision','error'])).sort((a,b)=>a.id.localeCompare(b.id)),snapshot=digest(rows);
    let offset=0;if(args.cursor){let cursor;try{cursor=JSON.parse(Buffer.from(args.cursor,'base64url').toString());}catch{throw Error('Invalid schedule cursor.');}if(cursor.snapshot!==snapshot||!Number.isSafeInteger(cursor.offset)||cursor.offset<0)throw Error('Schedule inventory changed. Restart paging.');offset=cursor.offset;}
    const limit=Math.max(1,Math.min(100,Math.floor(Number(args.limit)||50))),schedules=rows.slice(offset,offset+limit);return {schedules,total:rows.length,snapshot,nextCursor:offset+schedules.length<rows.length?Buffer.from(JSON.stringify({snapshot,offset:offset+schedules.length})).toString('base64url'):null};
   }
   const permission={read:'schedule-read',status:'schedule-read',update:'schedule-update',enable:'schedule-update',disable:'schedule-update',preflight:'schedule-test','start-test':'schedule-test','retry-test':'schedule-test','stop-test':'schedule-stop','refresh-sources':'schedule-refresh'}[args.action];if(!permission)throw Error('Unknown schedule action.');this.check(actor,args,permission);
   if(args.action==='read')return this.view(this.service.engine.schedules.get(args.scheduleId));
   if(args.action==='status'){if(args.runId)return this.runView(this.targetRun(args));return {runs:[...this.service.engine.runs.values()].filter(run=>run.schedule.id===args.scheduleId).slice(-100).map(run=>this.runView(run,{results:false}))};}
   if(['start-test','retry-test'].includes(args.action))return this.start(actor,args);
   if(args.action==='stop-test'){
    if(!uuid.test(args.operationId||''))throw Error('Supply a stable stop operationId.');
    const run=this.targetRun(args);if(run.trigger==='scheduled'&&!run.scheduleTest)throw Error('Stop-test cannot cancel an ordinary recurring execution.');
    const key=actor+':'+args.operationId,signature=digest(args),prior=this.records.operations.find(record=>record.key===key);
    if(prior){if(prior.signature!==signature)throw Error('Stop operationId belongs to different arguments.');if(!prior.acceptedAt)throw Error('Previous stop is uncertain; inspect this exact run before acting.');return {taskId:prior.receiptId,state:'accepted',stopRequestedAt:prior.acceptedAt,...this.runView(run)};}
    if(args.expectedRunRevision!==revision(run.schedule))throw Error('Read the exact run revision before stopping this test.');
    const record={key,receiptId:randomUUID(),signature,action:'stop-test',actor,runId:run.id,scheduleId:args.scheduleId,preparedAt:new Date().toISOString()};this.records.operations.push(record);this.save();
    if(active.has(run.status))this.service.engine.cancel(run.id);record.acceptedAt=new Date().toISOString();this.save();return {taskId:record.receiptId,state:'accepted',stopRequestedAt:record.acceptedAt,...this.runView(run)};
   }
   const schedule=this.current(args);
   if(args.action==='preflight'){const result=await this.preflight(schedule);this.check(actor,args,permission);this.current(args);return result.summary;}
   if(['enable','disable','update'].includes(args.action)){
    if(args.settingsScope!=='future-runs')throw Error('Schedule changes require explicit future-runs scope. Captured runs remain unchanged.');
    if(schedule.source?.manifest&&args.action!=='disable')throw Error('Repository-owned schedules must be updated through their source workflow.');
    let next={...schedule};
    if(args.action==='update'){
     if(!args.changes||typeof args.changes!=='object'||Array.isArray(args.changes)||Object.keys(args.changes).some(key=>![...editable,'mcpServerNames'].includes(key)))throw Error('Choose supported schedule settings.');
     if(args.changes.executionPermissions!==undefined||args.changes.workspaceSources?.some(ref=>ref.categories?.includes('permissions')))this.check(actor,args,'schedule-configure-permissions');
     const rules=args.changes.executionPermissions?.rules;
     if(rules!==undefined&&(!Array.isArray(rules)||rules.some(rule=>!rule||!['shell','mcp','custom-tool','url','chat-access'].includes(rule.kind)||rule.kind==='shell'&&(typeof rule.command!=='string'||Object.keys(rule).some(key=>!['kind','command'].includes(key))||/^(?:cat|python[\d.]*|node|bash|sh|zsh|pwsh|powershell)(?:\.exe)?$/i.test(rule.command.trim()))||['mcp','custom-tool'].includes(rule.kind)&&(!rule.tool||rule.tool==='*'||rule.action==='*'||rule.kind==='mcp'&&(!rule.server||rule.server==='*')))))throw Error('Use exact commands or constrained tool/action rules, not broad shell or tool approvals.');
     if(args.changes.executionPermissions?.mode==='autopilot')throw Error('This tool cannot introduce blanket automatic permissions. Use constrained tools/action rules.');
     next={...next,...pick(args.changes,editable)};
     if(args.changes.mcpServerNames!==undefined){const available={...this.service.settings.get().mcpServers,...schedule.mcpServers},names=args.changes.mcpServerNames;if(!Array.isArray(names)||names.length>100||names.some(name=>typeof name!=='string'||!Object.hasOwn(available,name)))throw Error('Select existing owner MCP server names.');next.mcpServers=Object.fromEntries(names.map(name=>[name,available[name]]));}
    }else next.enabled=args.action==='enable';
    if(next.provider==='local-process')throw Error('Native replacement schedule settings keep their existing owner controls.');
    if(args.action==='disable')validateSchedule(next);else {const preflight=await this.preflight(next);if((args.changes?.executionPermissions!==undefined||args.changes?.workspaceSources?.some(ref=>ref.categories?.includes('permissions')))&&preflight.summary.approvalMode==='autopilot')throw Error('Use constrained permissions instead of introducing blanket automatic approval.');}this.check(actor,args,permission);this.current(args);const saved=this.service.engine.schedules.save(next,args.expectedRevision);this.service.engine.emit('change');return this.view(saved);
   }
   if(args.action==='refresh-sources'){
    if(schedule.provider==='local-process')throw Error('Native services keep their existing owner controls.');
    if(!['future-runs','existing-run'].includes(args.settingsScope))throw Error('Choose future-runs or existing-run source refresh.');
    let run,before;
    if(args.settingsScope==='existing-run'){run=this.targetRun(args);this.idle(run);before=revision(run.schedule);if(args.expectedRunRevision!==before)throw Error('Captured run settings changed.');}
    await this.service.context.refreshAsync({workspaceId:(run?.schedule||schedule).context?.workspaceId});this.check(actor,args,permission);this.current(args);
    if(run){this.idle(run);if(revision(run.schedule)!==before)throw Error('Captured settings changed during refresh.');}
    const base=run?.schedule||schedule,selection=base.contextSelection||{selectedIds:base.context?.selectedIds||[],agentId:base.context?.agentId,includeDefaults:base.context?.includeDefaults??false};
    const prepared=this.service.engine.prepareSchedule({...base,contextSelection:selection},'manual');
    if(run){run.initialSchedule??=structuredClone(run.schedule);run.contextHistory??=[];if(run.schedule.context)run.contextHistory.push(run.schedule.context);run.schedule={...run.schedule,context:prepared.context,workspace:prepared.workspace};this.service.engine.event(run,'system','Captured sources explicitly refreshed by the owner for a future turn; history and model settings are retained.');return this.runView(run);}
    const saved=this.service.engine.schedules.save({...schedule,contextSelection:selection},args.expectedRevision);this.service.engine.emit('change');return this.view(saved);
   }
  });
 }
 async close(){this.closed=true;await Promise.allSettled([...this.inflight.values()].map(item=>item.promise));}
}
