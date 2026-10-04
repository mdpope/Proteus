export class UsageCache {
  constructor(read, now = () => Date.now()) { this.read = read; this.now = now; this.value = null; this.next = 0; this.pending = null; }
  async get(force = false) {
    if (this.pending) return this.pending;
    if (!force && this.now() < this.next) return this.value;
    this.pending = (async () => {
      try {
        const quota = await this.read();
        this.value = { quota, checkedAt: new Date(this.now()).toISOString(), error: null };
        this.next = this.now() + 300_000;
      } catch (error) {
        this.value = { ...this.value, error: error.message || 'Copilot usage unavailable.' };
        this.next = this.now() + 60_000;
      }
      return this.value;
    })();
    try { return await this.pending; } finally { this.pending = null; }
  }
}

const percentage = value => Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : null;
const date = value => { if (value == null) return null; const d = new Date(typeof value === 'number' ? value * 1000 : value); return Number.isFinite(d.getTime()) ? d.toISOString() : null; };
export function normalizeProviderUsage(provider, raw) {
  if (Array.isArray(raw?.windows)) return { ...raw, provider, windows:raw.windows.map(w=>({...w,remainingPercent:percentage(w.remainingPercent)})) };
  if (provider === 'copilot') {
    const q=raw?.quotaSnapshots?.premium_interactions;
    return {provider,source:'GitHub Copilot account quota',available:!!q,windows:q?[{id:'premium_interactions',label:'Premium requests',remainingPercent:percentage(q.remainingPercentage),unlimited:q.isUnlimitedEntitlement===true,resetAt:date(q.resetDate)}]:[]};
  }
  if (provider === 'codex') {
    const limits=raw?.rateLimitsByLimitId ? Object.entries(raw.rateLimitsByLimitId) : raw?.rateLimits ? [['codex',raw.rateLimits]] : [];
    const windows=[];
    for(const [bucket,limit] of limits) for(const name of ['primary','secondary']) {const w=limit?.[name];if(!w)continue;windows.push({id:`${bucket}:${name}`,label:[limit.limitName||bucket,w.windowDurationMins ? `${w.windowDurationMins} minute window`:name].join(' · '),remainingPercent:Number.isFinite(w.usedPercent)?percentage(100-w.usedPercent):null,unlimited:false,resetAt:date(w.resetsAt),windowDurationMins:w.windowDurationMins??null});}
    return {provider,source:'Codex account rate limits',available:windows.length>0,windows};
  }
  return {provider,source:provider,available:false,windows:[],error:'Account usage unavailable.'};
}
export class ProviderUsageCache {
  constructor(adapters, now=()=>Date.now(), timeoutMs=10000) {this.adapters=adapters;this.now=now;this.timeoutMs=timeoutMs;this.providers={};this.next=0;this.pending=null;}
  async get(force=false) {
    if(this.pending)return this.pending;if(!force&&this.now()<this.next)return {providers:this.providers};
    this.pending=(async()=>{await Promise.all(Object.entries(this.adapters).map(async([id,adapter])=>{
      const previous=this.providers[id];let timer;try{const read=Promise.resolve().then(()=>typeof adapter==='function'?adapter():adapter.quota());const raw=await Promise.race([read,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Account usage request timed out.')),this.timeoutMs);})]);const value=normalizeProviderUsage(id,raw);
        const observed=Date.parse(value.observedAt||'');
        const expired=Number.isFinite(observed)&&value.windows.some(w=>w.resetAt&&Date.parse(w.resetAt)<=this.now());
        const stale=Number.isFinite(observed)&&(this.now()-observed>=300000||expired);
        this.providers[id]={...value,windows:value.windows.map(w=>{const past=w.resetAt&&Date.parse(w.resetAt)<=this.now();return {...w,...(past?{reportedResetAt:w.resetAt,resetAt:null,resetNote:'Provider supplied a past reset timestamp; next reset is unreported.'}:{}),...(Number.isFinite(observed)&&past?{reportedRemainingPercent:w.remainingPercent,remainingPercent:null,expired:true}:{})};}),checkedAt:new Date(this.now()).toISOString(),error:value.error||null,stale};
      }catch(error){this.providers[id]={...(previous||{provider:id,windows:[],available:false,checkedAt:null}),error:error.message||'Account usage unavailable.',stale:!!previous?.checkedAt};}finally{clearTimeout(timer);}
    }));this.next=this.now()+300000;return {providers:this.providers};})().finally(()=>{this.pending=null;});return this.pending;
  }
}
