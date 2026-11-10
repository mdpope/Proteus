import {ownerScopedCommandRequest} from './scoped-command-request.js';
import path from 'node:path';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {atomicJSON,readJSON} from '../../shared/files.js';
import {commandIdentity,qualifyScopedCommandRuntime,runScopedCommand} from './host-scoped-executor.js';
import {effectiveScheduleAccess,scheduleAccessBinding} from './access-overlay.js';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const inflight=new Map();
export function scopedCommandTools(engine,run,signal){
 if(!run.schedule.executionPermissions?.sandboxedCommands)return [];
 return [{name:'proteus_exec',defer:'never',description:'Execute argv through the host-owned filesystem/network/process sandbox. Use for ALL commands in this scoped schedule. Native provider shell execution is unavailable. Working directory is fixed; credentials and provider environment are excluded. Supply stable operationId; repeat it only to inspect the same uncertain invocation. Explicit Allow for this schedule saves this command identity for future providers/runs. Declare additional source inputs for identity checks. No shell expansion occurs.',parameters:{type:'object',properties:{operationId:{type:'string'},argv:{type:'array',minItems:1,maxItems:128,items:{type:'string'}},inputs:{type:'array',maxItems:128,items:{type:'string'}},timeoutMs:{type:'integer',minimum:100,maximum:60000}},required:['operationId','argv'],additionalProperties:false},handler:async args=>{
  if(signal.aborted||engine.running.get(run.id)?.controller.signal!==signal)throw Error('Scoped command capability is no longer active.');
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(args.operationId||''))throw Error('Use a stable UUID operationId.');
  if(Object.keys(args).some(key=>!['operationId','argv','inputs','timeoutMs'].includes(key)))throw Error('Unknown scoped command parameter.');
  const key=run.id+':'+args.operationId,signature=hash(args),file=path.join(engine.home,'scoped-executions',hash(key)+'.json'),prior=readJSON(file,null);
  if(prior){if(prior.signature!==signature)throw Error('operationId belongs to different command arguments.');if(prior.state==='completed')return JSON.stringify({...prior.result,replayed:true});throw Error('Previous command outcome is uncertain. Inspect the retained receipt and workflow artifacts before another invocation.');}
  if(inflight.has(key)){const current=inflight.get(key);if(current.signature!==signature)throw Error('operationId is already in use.');return current.promise;}
  const promise=(async()=>{
   await qualifyScopedCommandRuntime();
   const live=()=>{
    if(signal.aborted||engine.running.get(run.id)?.controller.signal!==signal)throw Error('This command belongs to an active turn.');
    const current=engine.schedules.get(run.schedule.permissionScope?.id||run.schedule.id),prepared=engine.prepareSchedule?engine.prepareSchedule(current):current;
    if(scheduleAccessBinding(prepared)!==scheduleAccessBinding(run.schedule))throw Error('Schedule resources changed. Start a new run with the reviewed resources.');
    // Execution starts from the captured permissions; only explicitly approved
    // owner overlay additions may extend them during this supervised run.
    const base={...run.schedule,executionPermissions:run.schedule.scheduleAccessBasePermissions||run.schedule.executionPermissions,accessOverlay:undefined};
    const active=current.accessOverlay?.grants.filter(grant=>!grant.revokedAt)||[];
    const folders=active.flatMap(grant=>grant.folder?[grant.folder]:[]);
    const policy={...base,executionPermissions:{...base.executionPermissions,folders:[...(base.executionPermissions.folders||[]),...folders]}};
    return {current,policy};
   };
   const initial=live(),identity=commandIdentity(initial.policy,args.argv,args.inputs||[]);
   const granted=state=>state.current.accessOverlay?.grants.some(grant=>!grant.revokedAt&&(grant.command?.digest===identity.digest||grant.commandScope?.scopeHash===identity.scopeHash&&grant.commandScope?.sourceHash===identity.sourceHash));
   let once=false;
   if(!granted(initial)){
    const answer=await engine.ask(run,{type:'permission',question:'Allow this scoped command? '+args.argv.map(value=>JSON.stringify(value)).join(' ').slice(0,4000)+' (fixed working directory; network and credential services denied)\nSandbox folders: '+initial.policy.executionPermissions.folders.map(folder=>folder.access+' '+folder.path).join('; ').slice(0,6000),details:ownerScopedCommandRequest({kind:'scoped-command',toolName:'proteus_exec',commandIdentity:identity,intention:'Approve this exact command, executable and source-input identity inside the schedule sandbox.'})},signal);
    if(!['approve','approve-auto','approve-schedule'].includes(answer))throw Error('Scoped command denied.');once=answer!=='approve-schedule';
   }
   const before=live();
   if(!once&&!granted(before))throw Error('Schedule command grant was revoked before launch.');
   if(commandIdentity(before.policy,args.argv,args.inputs||[]).digest!==identity.digest)throw Error('Command or source identity changed during approval. Review again.');
   fs.mkdirSync(path.dirname(file),{recursive:true});atomicJSON(file,{version:1,signature,state:'running',startedAt:new Date().toISOString(),commandDigest:identity.digest});
   try{
    const revocation=new AbortController(),required=before.current.accessOverlay?.grants.filter(grant=>!grant.revokedAt&&(grant.folder||!once&&(grant.command?.digest===identity.digest||grant.commandScope?.scopeHash===identity.scopeHash&&grant.commandScope?.sourceHash===identity.sourceHash)))||[];
    const check=()=>{try{const now=engine.schedules.get(before.current.id);if(required.some(grant=>!now.accessOverlay?.grants.some(current=>current.id===grant.id&&!current.revokedAt&&hash(current)===hash(grant))))revocation.abort();}catch{revocation.abort();}};
    engine.scopedCommandChecks??=new Set();engine.scopedCommandChecks.add(check);const timer=setInterval(check,500);
    let result;try{result=await runScopedCommand(before.policy,args.argv,{signal:AbortSignal.any([signal,revocation.signal]),timeoutMs:args.timeoutMs});}finally{clearInterval(timer);engine.scopedCommandChecks.delete(check);}
    if(revocation.signal.aborted)result.revoked=true;
    atomicJSON(file,{version:1,signature,state:'completed',finishedAt:new Date().toISOString(),result});return JSON.stringify(result);
   }catch(error){atomicJSON(file,{version:1,signature,state:'uncertain',finishedAt:new Date().toISOString()});throw error;}
  })().finally(()=>inflight.delete(key));
  inflight.set(key,{signature,promise});return promise;
 }}];
}
