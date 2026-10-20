import path from 'node:path';
import {createHash} from 'node:crypto';
import {atomicJSON, readJSON} from './files.js';
import {revision} from './schedules.js';

const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const states=new Set(['connected','needs-auth','failed','pending','not-connected','unknown']);
const text=value=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,300):'';
const timed=(engine,name,callback)=>engine.performanceDiagnostics?engine.performanceDiagnostics.measureSync(name,callback):callback();
const digest=value=>createHash('sha256').update(value).digest('hex');
const IDENTITY_CACHE_LIMIT=1024;
// This registry stores metadata, never credentials. A consumer includes its run/session:
// equal aliases/configurations do not prove that two sessions share a credential owner.
export class IntegrationHealth {
  constructor(home,{engine,onChange=()=>{},now=()=>Date.now()}={}) {
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
        rows.push({id,runId:run.id,chatTitle:run.title,provider:run.schedule.provider,server,profile:metadata,...observation,stale,
          connection:observation.connection||'unknown',authentication:observation.authentication||'unverified',access:observation.access||'unverified',
          identity:observation.identity||null,expiresAt:observation.expiresAt||null,
          canCheck:!!provider?.mcpStatus,canRecover:!!provider?.mcpRecover,canLogin:!!provider?.mcpLogin&&['http','sse'].includes(config.type),
          canSelect:!!provider?.selectIntegrationContext,contextCount:metadata.contexts?.length||0,
          nextCheckAt:observation.nextCheckAt||null});
      }
    }
    return rows;
  }
  snapshot(runId) {return {revision:revision(this.data),observedAt:new Date(this.now()).toISOString(),consumers:this.consumers(runId),monitoring:'Passive checks every five minutes; recovery only through supported adapters. Unknown expiry is not estimated.'};}
  save(id,profile,expectedRevision) {
    if(revision(this.data)!==expectedRevision)throw new Error('Integration profiles changed. Refresh before saving.');
    if(!this.consumers().some(row=>row.id===id))throw new Error('This connection configuration changed. Refresh it.');
    if(!profile||typeof profile!=='object'||!Array.isArray(profile.contexts)||profile.contexts.length>100)throw new Error('Provide at most 100 resource contexts.');
    const contexts=profile.contexts.map(c=>{if(!c||!text(c.label))throw new Error('Each context needs a label.');return {id:hash([text(c.label),text(c.tenant),text(c.subscription),text(c.organization),text(c.site)]),...Object.fromEntries(['label','tenant','subscription','organization','site'].map(k=>[k,text(c[k])]))};});
    if(new Set(contexts.map(c=>c.id)).size!==contexts.length)throw new Error('Resource contexts must be distinct.');
    this.data.profiles[id]={label:text(profile.label),expectedAccount:text(profile.expectedAccount),contexts};this.persist();return this.snapshot();
  }
  persist(){atomicJSON(this.file,this.data);this.onChange();}
  observe(run,servers,source='runtime') {
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
    if(changed)this.persist();
  }
  capture(run){if(!run?.mcpConnections)return;const servers=Object.entries(run.mcpConnections).filter(([,s])=>s.observedAt).map(([name,s])=>({name,...s}));if(!servers.length)return;const rows=this.consumers(run.id);if(servers.some(s=>{const row=rows.find(r=>r.server===s.name);return row&&(!row.checkedAt||Date.parse(s.observedAt)>Date.parse(row.checkedAt));}))this.observe(run,servers,'session-event');}
  async withProvider(providerId, callback) {
    if(this.pending.has(providerId))throw new Error('A connection check is already in progress for this provider.');
    // Install the hold before invoking SDK code, including synchronous adapters.
    const operation=Promise.resolve().then(callback);this.pending.set(providerId,operation);
    try{return await operation;}finally{this.pending.delete(providerId);}
  }
  async check(id,{recover=false,background=false}={}) {
    const row=this.consumers().find(r=>r.id===id);if(!row)throw new Error('This connection configuration changed. Refresh it.');
    const run=this.engine.getRun(row.runId),provider=this.engine.providers[row.provider];
    // Serialize across each provider: some runtimes close their client when configuration changes.
    if(this.pending.has(row.provider))throw new Error('A connection check is already in progress for this provider.');
    if([...this.engine.running.values()].some(slot=>slot.id!==run.id&&this.engine.getRun(slot.id).schedule.provider===run.schedule.provider)&&!provider.sessions)throw new Error('Connection check deferred until this provider’s active chats finish.');
    if(recover&&this.engine.running.has(run.id))throw new Error('Recovery waits until the active turn finishes; its tools will not be interrupted.');
    if(background&&!provider?.hasMcpSession?.(run))return {deferred:true};
    if(recover&&!provider?.mcpRecover)throw new Error('Automatic recovery is unavailable for this adapter. Sign in on the owning computer.');
    return this.withProvider(row.provider,async()=>{
      const result=recover?await provider.mcpRecover(run,row.server):provider.mcpHealth?await provider.mcpHealth(run,row.server):await provider.mcpStatus(run);
      if(!this.consumers(run.id).some(r=>r.id===id))throw new Error('Connection changed during verification. Refresh it.');
      this.observe(run,result.servers||[],recover?'recovery':'verification');return this.snapshot();
    });
  }
  async tick(){
    if(this.closed||this.ticking)return;this.ticking=true;
    try{for(const row of this.consumers()){
      if(this.closed)break;if(row.nextCheckAt&&Date.parse(row.nextCheckAt)>this.now())continue;
      try{
        await this.check(row.id,{background:true});
        const latest=this.consumers(row.runId).find(r=>r.id===row.id),attempts=latest?.recoveryAttempts||0;
        if(!this.engine.running.has(row.runId)&&latest?.connection==='failed'&&latest.authentication!=='needs-auth'&&latest.canRecover&&attempts<3&&this.engine.providers[row.provider]?.hasMcpSession?.(this.engine.getRun(row.runId))){
          const observation=this.data.observations[row.id];observation.recoveryAttempts=attempts+1;
          try{await this.check(row.id,{recover:true,background:true});}finally{this.data.observations[row.id].nextCheckAt=new Date(this.now()+300000*2**attempts).toISOString();this.persist();}
        }
      }catch{/* Bounded passive checks never open sign-in or send a model turn. */}
    }}finally{this.ticking=false;}
  }
  async agent(runId,args) {
    const rows=this.consumers(runId);
    if(args.action==='list')return {consumers:rows,note:'Only integrations already selected for this chat. Labels are expected identities, not verified accounts. Use explicit resource IDs with the named MCP server.'};
    const row=rows.find(r=>r.id===args.consumerId);if(!row)throw new Error('Choose an integration already selected for this chat.');
    if(args.action==='verify'){await this.check(row.id);return this.consumers(runId).find(r=>r.id===row.id);}
    if(args.action==='select'){
      const context=row.profile.contexts?.find(c=>c.id===args.contextId);if(!context)throw new Error('Choose a configured resource context.');
      const provider=this.engine.providers[row.provider];
      if(!provider.selectIntegrationContext)throw new Error('This adapter cannot isolate account selection. Use the already configured MCP server and explicit resource IDs; do not change global login defaults.');
      return provider.selectIntegrationContext(this.engine.getRun(runId),row.server,context);
    }
    throw new Error('Unknown integration action.');
  }
  async close(){this.closed=true;await Promise.allSettled(this.pending.values());this.identities.clear();}
}
