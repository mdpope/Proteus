import {storageUsage} from './storage.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {OMI_JOBS, TRANSCRIPT_AUTOMATIONS, isOmiSchedule} from '../tools/omi.js';

const hash = value => createHash('sha256').update(String(value)).digest('hex');
const timestamp = value => typeof value === 'string' && /^\d{4}-\d\d-\d\dT/.test(value) && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
const number = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
const digest = value => /^[a-f0-9]{64}$/i.test(value || '') ? value : null;
const status = value => ['completed','running','queued','pending','failed','needs_attention','deferred','superseded','cancelled','interrupted','awaiting_input','filed','already_published'].includes(value) ? value : 'unknown';
const purpose = kind => ({new_jobs:'Conversation filing',review:'Review answer',session_boundary:'Conversation boundaries',session_correction:'Transcript correction'})[kind] || 'Native processing';
const model = value => typeof value === 'string' && /^(gpt|codex|o[1-9])[-.\w]{0,65}$/.test(value) ? value : null;
const array = value => Array.isArray(value) ? value : [];
const reference = value => typeof value === 'string' && value.length > 0 && value.length <= 256 ? hash(value) : null;

/** Observe existing native receipts, never execute a worker or reconstruct deleted transcripts.
 * All paths are fixed relative to the configured owner root. Only allowlisted metadata leaves
 * this boundary; native IDs become opaque stable references, never filenames or vault paths. */
export class MnemosyneOperations {
  constructor({omi, engine, clock = () => new Date()}) { this.omi=omi; this.engine=engine; this.clock=clock; this.pending=null; }
  async readJSON(root, relative, budget) {
    let file;
    try {
      const base=await fs.realpath(root), target=await fs.realpath(path.join(base,relative));
      if(!target.startsWith(base+path.sep))return null;
      file=await fs.open(target,'r');const stat=await file.stat();
      if(!stat.isFile()||stat.size>262144)return null;
      if(budget){if(stat.size>budget.remaining){budget.exhausted=true;return null;}budget.remaining-=stat.size;}
      const bytes=Buffer.alloc(stat.size+1),{bytesRead}=await file.read(bytes,0,bytes.length,0);
      if(bytesRead!==stat.size)return null;
      const value=JSON.parse(bytes.subarray(0,bytesRead).toString());
      return {value,modifiedAt:stat.mtime.toISOString()};
    } catch { return null; } finally { await file?.close(); }
  }
  async nativeActivity(root) {
    const rows=[],budget={remaining:8*1024*1024,exhausted:false};let directory,examined=0,truncated=false;
    try {
      const base=await fs.realpath(root), folder=await fs.realpath(path.join(base,'semantic/work'));
      if(!folder.startsWith(base+path.sep))throw Error('Outside owner root');
      directory=await fs.opendir(folder);
      for await(const entry of directory){
        if(++examined>200||budget.exhausted){truncated=true;break;}
        if(!entry.isDirectory()||! /^[a-zA-Z0-9-]{8,120}$/.test(entry.name))continue;
        const prefix='semantic/work/'+entry.name;
        const state=await this.readJSON(base,prefix+'/state.json',budget);
        if(!state||state.value.record_id!==entry.name)continue;
        const work=state.value;
        const [execution,completion,effects,mapping]=await Promise.all(['execution-receipt.json','completion.json','context-effects.json'].map(file=>this.readJSON(base,prefix+'/'+file,budget)).concat(this.readJSON(base,'intake/'+entry.name+'/source-map.json',budget)));
        const result=completion?.value, guarded=effects?.value;
        const mapped=mapping?.value?.record_id===entry.name?mapping.value:null;
        const effectsVerified=guarded?.record_id===entry.name&&guarded.status==='verified';
        const usage={};
        for(const item of array(execution?.value?.usage).slice(0,32))for(const key of ['input_tokens','cached_input_tokens','output_tokens'])if(number(item?.[key])!==null)usage[key]=(usage[key]||0)+item[key];
        rows.push({id:'native:'+hash(entry.name),origin:'native',owner:'Mnemosyne',purpose:purpose(work.kind),status:status(work.status),
          observedAt:state.modifiedAt,startedAt:timestamp(work.started_at),finishedAt:timestamp(work.finished_at),
          model:model(execution?.value?.model),effort:null,durationSeconds:number(execution?.value?.elapsed_seconds),usage,
          sourceRevision:digest(work.input_sha256||work.request?.source_revision),
          claim:hash(entry.name),eventRefs:array(mapped?.outputs).slice(0,64).map(item=>reference(item.canonical_event_id||item.record_id)).filter(Boolean),
          sourceMapObserved:!!mapped,sourceMapRevision:digest(mapped?.spec_sha256),
          stages:[{stage:'Request',state:'Claim recorded'},{stage:'Model outcome',state:execution?'Execution receipt recorded':'Not retained / unobserved'},
            {stage:'Deterministic validation',state:effectsVerified?'Native validation receipt recorded':result?.boundary_checked===true?'Boundary check recorded':'Not independently observed'},
            {stage:'Guarded effects',state:result?.boundary_checked===true?'No publication by design':effectsVerified?'Native effects receipt recorded':'Unverified'},
            {stage:'Final receipt',state:result?status(result.status):'Not observed'}],
          effects:effectsVerified?array(guarded.effects).slice(0,16).filter(item=>['people','projects','commitments','household_registers','filing'].includes(item?.area)&&['applied','not_applicable','delegated_hcos','deferred'].includes(item.status)).map(item=>({area:item.area,outcome:item.status})):[],
          filing:result?.boundary_checked===true?'not_applicable':effectsVerified&&['filed','already_published'].includes(result?.result?.status)?'native_receipt':'unverified',
          history:'Historical CLI conversations are not reconstructed. Receipt evidence does not revalidate destination files.'});
      }
      return {available:true,rows:rows.sort((a,b)=>b.observedAt.localeCompare(a.observedAt)),examined,truncated};
    }catch{return {available:false,rows,examined,truncated};}
  }
  async snapshot() {
    // Coalesce simultaneous desktop/web reads without a resident watcher or idle polling.
    if(this.pending)return this.pending;
    this.pending=this.collect().finally(()=>{this.pending=null;});return this.pending;
  }
  async collect() {
    const raw=await this.omi.status(),observedAt=this.clock().toISOString();
    const [native,storage,serviceControl]=await Promise.all([this.nativeActivity(raw.settings.pipelineRoot),storageUsage(raw.settings),this.omi.serviceControl?this.omi.serviceControl().catch(()=>({available:false,state:'unknown'})):Promise.resolve({available:false,state:'unavailable'})]);
    const schedules=this.engine.schedules.list().filter(isOmiSchedule).map(item=>({id:item.id,name:[...OMI_JOBS,...TRANSCRIPT_AUTOMATIONS].find(job=>job.scheduleId===item.id)?.name.replace(/^Omi · /,'')||'Transcript workflow',enabled:item.enabled===true,cron:item.cron,revision:item.revision,owner:item.provider==='local-process'?'Prepared alternative':'Proteus',job:item.integration?.job}));
    const runs=this.engine.listRuns().filter(run=>isOmiSchedule(run.schedule)).slice(0,100).map(run=>({id:'proteus:'+run.id,runId:run.id,origin:'proteus',owner:'Proteus',purpose:TRANSCRIPT_AUTOMATIONS.find(job=>job.scheduleId===run.schedule.id)?.name||'Transcript processing',status:status(run.status),observedAt:timestamp(run.updatedAt||run.createdAt),startedAt:timestamp(run.startedAt),finishedAt:timestamp(run.finishedAt),model:model(run.schedule.model),effort:['low','medium','high','xhigh','max','ultra'].includes(run.schedule.reasoningEffort)?run.schedule.reasoningEffort:null,sourceRevision:digest(run.schedule.integration?.sourceRevision),usage:{},effects:[],filing:'unverified',stages:[{stage:'Request',state:'Proteus run recorded'},{stage:'Model outcome',state:status(run.status)},{stage:'Deterministic validation',state:'Inspect workflow receipts'},{stage:'Guarded effects',state:'Not inferred from model status'},{stage:'Final receipt',state:'Inspect workflow receipts'}]}));
    return {schemaVersion:1,observedAt,runtimeAvailable:raw.status.runtimeAvailable,
      services:raw.status.nativeServices.map(item=>({id:item.id,name:OMI_JOBS.find(job=>job.id===item.id)?.name.replace(/^Omi · /,''),owner:'Native service',state:item.state,observedAt:raw.status.checkedAt,heartbeat:'unknown',control:'owner-only'})),
      serviceControl,storage,metadata:raw.status.metadata,schedules,activity:[...native.rows,...runs].sort((a,b)=>(b.observedAt||'').localeCompare(a.observedAt||'')),
      nativeHistory:{available:native.available,examined:native.examined,truncated:native.truncated,limit:200},
      sources:[{id:'omi',name:'Omi',state:raw.status.runtimeAvailable?'configured':'unconfigured'},{id:'stardate',name:'Stardate',state:'not_connected'},{id:'exports',name:'Audio / text exports',state:raw.automations.some(item=>item.canonicalVerified)?'filing_configured':'unconfigured'}],
      adapters:raw.automations.map(item=>({id:item.id,name:item.name,configured:item.canonicalVerified===true,owner:'Proteus workflow',independent:false})),
      configuration:{desktopOnly:true,nativeReplacementEnabled:raw.status.enabled,intakeEnabled:raw.status.intakeEnabled},
      limitations:['Loaded service is ownership evidence, not continuous health.','Native receipts retain their original outcomes; destination files are not revalidated here.','Stardate watcher migration and neutral library publication require separate native-owner acceptance.']};
  }
  control(args) {
    if(!args||Object.keys(args).some(key=>!['action','expectedRevision','expectedSettingsRevision'].includes(key))||!['pause','resume','restart'].includes(args.action))throw Error('Choose a supported native service action.');
    return this.omi.serviceControl(args.action,args.expectedRevision,args.expectedSettingsRevision);
  }
  logs(job,stream='out') {
    const {localPath,...safe}=this.omi.logs(job,stream,100);
    return {...safe,observedAt:this.clock().toISOString()};
  }
}
