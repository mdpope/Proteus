import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {atomicJSON, atomicJSONAsync, readJSON} from '../../shared/files.js';
import {revision} from '../scheduling/schedules.js';

const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const states=new Set(['connected','needs-auth','failed','pending','not-connected','unknown']);
const text=value=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,300):'';
const timed=(engine,name,callback)=>engine.performanceDiagnostics?engine.performanceDiagnostics.measureSync(name,callback):callback();
const digest=value=>createHash('sha256').update(value).digest('hex');
const IDENTITY_CACHE_LIMIT=1024;
// This registry stores metadata, never credentials. A consumer includes its run/session:
// equal aliases/configurations do not prove that two sessions share a credential owner.
export class IntegrationHealth {
  constructor(home,{engine,context,onChange=()=>{},now=()=>Date.now()}={}) {
    this.context=context;
    this.file=path.join(home,'integration-health.json');this.engine=engine;this.onChange=onChange;this.now=now;this.pending=new Map();this.closed=false;this.identities=new Map();
    this.data=readJSON(this.file,{schemaVersion:1,profiles:{},observations:{}});
    if(this.data.schemaVersion!==1||!this.data.profiles||!this.data.observations)throw new Error('Invalid integration health registry.');
  }
  consumers(runId) {
    // Adapters may share a synchronous catalog projection for this operation.
    // Nothing survives into another enumeration, turn or revision check.
    let enumerate=()=>this.enumerateConsumers(runId);
    for(const provider of new Set(Object.values(this.engine.providers))) {
      if(typeof provider?.withMcpSelectionBatch!=='function')continue;
      const next=enumerate;enumerate=()=>provider.withMcpSelectionBatch(next);
    }
    return timed(this.engine,'integrations.consumers',enumerate);
  }
  enumerateConsumers(runId) {
    const rows=[];
    // Capturing one session event must not sort or resolve unrelated chats.
    let runs;
    if(runId){try{const run=this.engine.getRun(runId);runs=run?[run]:[];}catch{runs=[];}}
    else runs=this.engine.listRuns();
    for(const run of runs) {
      const provider=this.engine.providers[run.schedule.provider];
      let selected={};try{selected=timed(this.engine,'integrations.selected',()=>provider?.selectedMcp?.(run)||run.schedule.mcpServers||{});}catch{continue;}
      let contextJSON,contextDigest;
      for(const [server,config] of Object.entries(selected)) {
        const id=timed(this.engine,'integrations.identity',()=>{
          // Fingerprint exact current values, including in-place context edits.
          // The cached ID uses the original byte sequence, preserving registry
          // bindings/recovery counters. Retain only digests, never config secrets.
          contextJSON??=JSON.stringify(run.schedule.context||null);contextDigest??=digest(contextJSON);
          const prefix=JSON.stringify([run.id,run.providerSessionId||'',run.schedule.provider,server,config]).slice(0,-1)+',';
          const key=digest(prefix)+':'+contextDigest;
          let value=this.identities.get(key);
          if(value)this.identities.delete(key);else value=createHash('sha256').update(prefix).update(contextJSON).update(']').digest('hex');
          this.identities.set(key,value);
          if(this.identities.size>IDENTITY_CACHE_LIMIT)this.identities.delete(this.identities.keys().next().value);
          return value;
        });
        const metadata=this.data.profiles[id]||{},observation=this.data.observations[id]||{};
        const stale=!observation.checkedAt||this.now()-Date.parse(observation.checkedAt)>600000;
        const source=run.schedule.context?.entries?.find(entry=>entry.kind==='mcp'&&entry.key===server);
        rows.push({id,configurationId:source?hash([source.id,source.hash]):hash(['legacy',server,config]),sourceId:source?.id||null,sourceHash:source?.hash||null,sourcePath:source?.path||null,transport:config.type||'stdio',runId:run.id,chatTitle:run.title,provider:run.schedule.provider,server,profile:metadata,...observation,stale,
          connection:observation.connection||'unknown',authentication:observation.authentication||'unverified',access:observation.access||'unverified',
          identity:observation.identity||null,expiresAt:observation.expiresAt||null,
          canCheck:!!provider?.mcpStatus,canRecover:!!provider?.mcpRecover,canLogin:!!provider?.mcpLogin&&['http','sse'].includes(config.type),
          canSelect:!!provider?.selectIntegrationContext,contextCount:metadata.contexts?.length||0,
          nextCheckAt:observation.nextCheckAt||null});
      }
    }
    return rows;
  }
  configurations(consumers=this.consumers(),{selectedOnly=false}={}) {
    const groups=new Map(),config=this.context?.config();
    if(!selectedOnly)for(const entry of this.context?.catalog?.entries||[]){
      if(entry.kind!=='mcp')continue;
      const id=hash([entry.id,entry.hash]);groups.set(id,{id,sourceId:entry.id,sourceHash:entry.hash,name:entry.name,path:entry.path,transport:entry.transport,favorite:config?.favorites?.includes(entry.id)||false,discovered:true,consumers:[]});
    }
    for(const row of consumers){let group=groups.get(row.configurationId);if(!group){group={id:row.configurationId,sourceId:row.sourceId,sourceHash:row.sourceHash,name:row.server,path:row.sourcePath,transport:row.transport,discovered:false,favorite:false,consumers:[]};groups.set(group.id,group);}group.consumers.push(row);}
    return [...groups.values()].map(group=>{
      const current=group.consumers.filter(row=>!row.stale),issues=current.filter(row=>['failed','needs-auth'].includes(row.connection)||row.authentication==='needs-auth'||row.access==='denied');
      return {...group,sessionCount:group.consumers.length,issueCount:issues.length,summary:issues.length?'Needs attention':current.some(row=>row.connection==='connected')?'Connected in some sessions':group.consumers.length?'No recent connection evidence':'Not connected in a chat'};
    }).sort((a,b)=>Number(b.favorite)-Number(a.favorite)||a.name.localeCompare(b.name)||String(a.path).localeCompare(String(b.path)));
  }
  decorateCatalog(catalog){
    // Persisted observations only: ordinary page rendering never signs in, starts
    // runtimes, reads a vault or asks a provider to probe a service.
    const rows=this.configurations();const summaries=new Map(rows.filter(row=>row.discovered).map(row=>[row.sourceId,row.summary]));
    return {...catalog,entries:catalog.entries.map(entry=>entry.kind==='mcp'?{...entry,integrationStatus:summaries.get(entry.id)||'Not connected in a chat'}:entry)};
  }
  snapshot(runId) {const consumers=this.consumers(runId);return {revision:revision(this.data),observedAt:new Date(this.now()).toISOString(),sourceRevision:this.context?.config().revision,sourceRefreshedAt:this.context?.catalog?.refreshedAt,configurations:this.configurations(consumers,{selectedOnly:!!runId}),consumers,monitoring:'Status is observed on this computer. Authentication and connections remain specific to the provider and session. Refresh reads saved observations; Check connection probes a selected session.'};}
  save(id,profile,expectedRevision) {
    if(revision(this.data)!==expectedRevision)throw new Error('Integration profiles changed. Refresh before saving.');
    if(!this.consumers().some(row=>row.id===id))throw new Error('This connection configuration changed. Refresh it.');
    if(!profile||typeof profile!=='object'||!Array.isArray(profile.contexts)||profile.contexts.length>100)throw new Error('Provide at most 100 resource contexts.');
    const contexts=profile.contexts.map(c=>{if(!c||!text(c.label))throw new Error('Each context needs a label.');return {id:hash([text(c.label),text(c.tenant),text(c.subscription),text(c.organization),text(c.site)]),...Object.fromEntries(['label','tenant','subscription','organization','site'].map(k=>[k,text(c[k])]))};});
    if(new Set(contexts.map(c=>c.id)).size!==contexts.length)throw new Error('Resource contexts must be distinct.');
    this.data.profiles[id]={label:text(profile.label),expectedAccount:text(profile.expectedAccount),contexts};const saved=this.persist();return saved?.then?saved.then(()=>this.snapshot()):this.snapshot();
  }
  persist({background=false}={}){
    if(!background&&!this.writing){atomicJSON(this.file,this.data);this.writeError=null;this.onChange();return;}
    // Never let an older async snapshot replace a newer manual save. Once a
    // write is in flight, every producer joins the same ordered durable queue.
    const snapshot=structuredClone(this.data),previous=this.writing||Promise.resolve();
    const operation=previous.catch(()=>{}).then(()=>atomicJSONAsync(this.file,snapshot)).then(()=>{this.onChange();});
    this.writing=operation;
    operation.then(()=>{if(this.writing===operation){this.writing=null;this.writeError=null;}},error=>{this.writeError=error;if(this.writing===operation)this.writing=null;});
    return operation;
  }
  observe(run,servers,source='runtime',{background=false}={}) {
    const rows=this.consumers(run.id);let changed=false;
    for(const server of servers) {
      const row=rows.find(r=>r.server===server.name);if(!row)continue;
      const at=server.observedAt||new Date(this.now()).toISOString(),old=this.data.observations[row.id]||{};
      if(old.checkedAt&&Date.parse(at)<Date.parse(old.checkedAt))continue;
      const connection=states.has(server.status)?server.status:'unknown';
      let authentication=['token-accepted','needs-auth','not-required','unverified'].includes(server.authentication)?server.authentication:connection==='needs-auth'?'needs-auth':old.authentication||'unverified';
      if(old.authentication==='needs-auth'&&['unverified','not-required'].includes(authentication))authentication='needs-auth';
      const recovered=old.authentication==='needs-auth'&&authentication==='token-accepted';
      const entry={...old,connection,authentication,access:['verified','denied'].includes(server.access)?server.access:old.access||'unverified',checkedAt:at,source,scope:server.scope||'runtime',
        ...(server.identity?{identity:Object.fromEntries(['account','subject','tenant'].map(k=>[k,text(server.identity[k])]))}:{}),...(server.expiresAt&&Number.isFinite(Date.parse(server.expiresAt))?{expiresAt:new Date(server.expiresAt).toISOString()}:{}),
        ...(recovered?{recoveredAt:at}:{}),nextCheckAt:new Date(this.now()+300000).toISOString()};
      // Never persist raw errors, URLs, headers or runtime credentials.
      if(connection==='needs-auth'||connection==='failed')entry.issue=connection==='needs-auth'?'Sign-in may be required. Verify this consumer.':'Runtime connection failed. Verify this consumer.';
      else if(authentication==='token-accepted')delete entry.issue;
      if(old.connection!==connection||old.authentication!==authentication)entry.timeline=[...(old.timeline||[]),{at,connection,authentication,source}].slice(-20);
      this.data.observations[row.id]=entry;changed=true;
    }
    if(changed)return this.persist({background});
  }
  capture(run){if(!run?.mcpConnections)return;const servers=Object.entries(run.mcpConnections).filter(([,s])=>s.observedAt).map(([name,s])=>({name,...s}));if(!servers.length)return;const rows=this.consumers(run.id);if(servers.some(s=>{const row=rows.find(r=>r.server===s.name);return row&&(!row.checkedAt||Date.parse(s.observedAt)>Date.parse(row.checkedAt));}))this.observe(run,servers,'session-event');}
  async withProvider(providerId, callback) {
    if(this.pending.has(providerId))throw new Error('A connection check is already in progress for this provider.');
    // Install the hold before invoking SDK code, including synchronous adapters.
    const operation=Promise.resolve().then(callback);this.pending.set(providerId,operation);
    try{return await operation;}finally{this.pending.delete(providerId);}
  }
  async check(id,{recover=false,background=false,runId}={}) {
    // A locator narrows enumeration; it never authorizes a retained consumer.
    const row=this.consumers(runId).find(r=>r.id===id);if(!row)throw new Error('This connection configuration changed. Refresh it.');
    const validate=()=>{
      if(this.closed)throw new Error('Integration monitoring is closed.');
      const rows=this.consumers(row.runId);if(!rows.some(r=>r.id===id))throw new Error('Connection changed during verification. Refresh it.');
      const run=this.engine.getRun(row.runId),provider=this.engine.providers[row.provider];
      if([...this.engine.running.values()].some(slot=>slot.id!==run.id&&this.engine.getRun(slot.id)?.schedule.provider===run.schedule.provider)&&!provider.sessions)throw new Error('Connection check deferred until this provider’s active chats finish.');
      if(recover&&this.engine.running.has(run.id))throw new Error('Recovery waits until the active turn finishes; its tools will not be interrupted.');
      if(background&&!provider?.hasMcpSession?.(run))return null;
      return {run,provider,rows};
    };
    if(this.pending.has(row.provider))throw new Error('A connection check is already in progress for this provider.');
    if(!validate())return {deferred:true};
    return this.withProvider(row.provider,async()=>{
      const target=validate();if(!target)return {deferred:true};
      const {run,provider}=target;
      if(recover&&!provider?.mcpRecover)throw new Error('Automatic recovery is unavailable for this adapter. Sign in on the owning computer.');
      const result=recover?await provider.mcpRecover(run,row.server):provider.mcpHealth?await provider.mcpHealth(run,row.server):await provider.mcpStatus(run);
      const verified=validate();if(!verified)return {deferred:true};
      if(verified.provider!==provider)throw new Error('Connection changed during verification. Refresh it.');
      // Status APIs can report several servers. Bind each observation to the
      // configuration actually checked, never to a newly selected replacement.
      const servers=(result.servers||[]).filter(server=>{const before=target.rows.find(row=>row.server===server.name);return before&&verified.rows.some(row=>row.id===before.id);});
      await this.observe(run,servers,recover?'recovery':'verification',{background});
      return background?{consumer:this.consumers(row.runId).find(r=>r.id===id)}:this.snapshot(runId);
    });
  }
  tick(){
    if(this.closed||this.ticking)return this.ticking;
    const work=()=>this.backgroundTick();
    this.ticking=(this.engine.performanceDiagnostics?this.engine.performanceDiagnostics.measure('integrations.tick',work):work()).finally(()=>{this.ticking=null;});
    return this.ticking;
  }
  async backgroundTick(){
    const counts={runs:0,candidates:0,skipped:0,probed:0,rejected:0,globalEnumerations:1,batches:0};
    let items=0,start=performance.now();
    const yieldBatch=async()=>{
      if(++items<16&&performance.now()-start<8)return;
      counts.batches++;await new Promise(setImmediate);items=0;start=performance.now();
    };
    try{
      // One run inventory; dormant sessions never resolve selections or hash context.
      for(const candidate of this.engine.listRuns()){
        await yieldBatch();if(this.closed)break;counts.runs++;
        let rows;
        try{
          const run=this.engine.getRun(candidate.id);
          if(!run||!this.engine.providers[run.schedule.provider]?.hasMcpSession?.(run)){counts.skipped++;continue;}
          rows=timed(this.engine,'integrations.batch',()=>this.consumers(run.id));
        }catch{counts.rejected++;continue;}
        for(const row of rows){
          await yieldBatch();if(this.closed)break;counts.candidates++;
          try{
            const latest=this.data.observations[row.id];
            if(latest?.nextCheckAt&&Date.parse(latest.nextCheckAt)>this.now()){counts.skipped++;continue;}
            const result=await this.check(row.id,{background:true,runId:row.runId});
            if(result.deferred){counts.skipped++;continue;}counts.probed++;
            const current=result.consumer,attempts=current?.recoveryAttempts||0;
            if(!this.closed&&!this.engine.running.has(row.runId)&&current?.connection==='failed'&&current.authentication!=='needs-auth'&&current.canRecover&&attempts<3){
              const observation=this.data.observations[row.id];if(!observation)continue;
              observation.recoveryAttempts=attempts+1;
              try{await this.check(row.id,{recover:true,background:true,runId:row.runId});}
              finally{observation.nextCheckAt=new Date(this.now()+300000*2**attempts).toISOString();await this.persist({background:true});}
            }
          }catch{counts.rejected++;/* Passive checks never start a provider or sign-in. */}
        }
      }
      if(items){counts.batches++;await new Promise(setImmediate);}
    }finally{this.engine.performanceDiagnostics?.integrationBackground?.(counts);}
  }
  async agent(runId,args) {
    if(args.connectionId||['schema','repair'].includes(args.action)){if(!this.managed)throw Error('Managed connections are unavailable.');return this.managed.agent(runId,args);}
    const rows=this.consumers(runId);
    if(args.action==='list')return {...(this.managed?{managed:await this.managed.agent(runId,args)}:{}),consumers:rows,note:'Only integrations already selected for this chat. Labels are expected identities, not verified accounts. Use explicit resource IDs with the named MCP server.'};
    const row=rows.find(r=>r.id===args.consumerId);if(!row)throw new Error('Choose an integration already selected for this chat.');
    if(args.action==='verify'){await this.check(row.id,{runId});return this.consumers(runId).find(r=>r.id===row.id);}
    if(args.action==='select'){
      const context=row.profile.contexts?.find(c=>c.id===args.contextId);if(!context)throw new Error('Choose a configured resource context.');
      const provider=this.engine.providers[row.provider];
      if(!provider.selectIntegrationContext)throw new Error('This adapter cannot isolate account selection. Use the already configured MCP server and explicit resource IDs; do not change global login defaults.');
      return provider.selectIntegrationContext(this.engine.getRun(runId),row.server,context);
    }
    throw new Error('Unknown integration action.');
  }
  async close(){this.closed=true;await Promise.allSettled([...this.pending.values(),this.ticking]);await this.writing;if(this.writeError)throw this.writeError;this.identities.clear();}
}
