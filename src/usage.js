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
export function normalizeProviderUsage(provider, raw, currentTime=Date.now()) {
  if (Array.isArray(raw?.windows)) return { ...raw, provider, windows:raw.windows.map(w=>({...w,remainingPercent:percentage(w.remainingPercent)})) };
  if (provider === 'copilot') {
    const q=raw?.quotaSnapshots?.premium_interactions;
    // This SDK has also returned resetDate as the time of the quota query. A
    // near-now value is not evidence of the billing reset, even with clock skew.
    const observedReset=date(q?.resetDate),future=observedReset&&Date.parse(observedReset)>currentTime+24*60*60*1000;
    const now=new Date(currentTime),nextMonth=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()+1,1)).toISOString();
    const billing=raw?.billingMode==='ai-credits'?'AI Credits':raw?.billingMode==='premium-requests'?'Premium requests':'Copilot allowance';
    return {provider,source:'GitHub Copilot account quota',available:!!q,windows:q?[{id:'premium_interactions',label:billing,remainingPercent:percentage(q.remainingPercentage),unlimited:q.isUnlimitedEntitlement===true,resetAt:future?observedReset:nextMonth,reportedResetAt:observedReset,resetSource:future?'provider':'expected-monthly',...(!future?{resetNote:'Expected first of next month at 00:00 UTC; provider reset is missing or past.'}:{}),...(raw?.billingMode?{}:{billingNote:'Billing type unverified; AI Credits and legacy premium requests are distinct.'})}]:[]};
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
  constructor(adapters, now=()=>Date.now(), timeoutMs=10000) {this.adapters=adapters;this.now=now;this.timeoutMs=timeoutMs;this.providers={};this.next=0;this.pending=null;this.active=true;this.lastCheckedAt=0;this.dirty=new Set();this.generation=0;}
  interval(){return this.active?300_000:3_600_000;}
  setActive(active){const was=this.active;this.active=active===true;if(was!==this.active&&this.lastCheckedAt)this.next=this.lastCheckedAt+this.interval();}
  invalidate(providerId){if(providerId&&this.adapters[providerId])this.dirty.add(providerId);else this.next=0;this.generation++;}
  async get(force=false) {
    if(this.pending)return this.pending;
    const targets=force||this.now()>=this.next?Object.entries(this.adapters):[...this.dirty].map(id=>[id,this.adapters[id]]).filter(([,adapter])=>adapter);
    if(!targets.length)return {providers:this.providers};
    const generation=this.generation;
    this.pending=(async()=>{await Promise.all(targets.map(async([id,adapter])=>{
      const previous=this.providers[id];let timer;try{const read=Promise.resolve().then(()=>typeof adapter==='function'?adapter():adapter.quota());const raw=await Promise.race([read,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Account usage request timed out.')),this.timeoutMs);})]);const value=normalizeProviderUsage(id,raw,this.now());
        const observed=Date.parse(value.observedAt||'');
        const expired=Number.isFinite(observed)&&value.windows.some(w=>w.resetAt&&Date.parse(w.resetAt)<=this.now());
        const stale=Number.isFinite(observed)&&(this.now()-observed>=300000||expired);
        this.providers[id]={...value,windows:value.windows.map(w=>{const past=w.resetAt&&Date.parse(w.resetAt)<=this.now();return {...w,...(past?{reportedResetAt:w.resetAt,resetAt:null,resetNote:'Provider supplied a past reset timestamp; next reset is unreported.'}:{}),...(Number.isFinite(observed)&&past?{reportedRemainingPercent:w.remainingPercent,remainingPercent:null,expired:true}:{})};}),checkedAt:new Date(this.now()).toISOString(),error:value.error||null,stale};
      }catch(error){this.providers[id]={...(previous||{provider:id,windows:[],available:false,checkedAt:null}),error:error.message||'Account usage unavailable.',stale:!!previous?.checkedAt};}finally{clearTimeout(timer);}
    }));this.lastCheckedAt=this.now();if(this.generation===generation){for(const [id] of targets)this.dirty.delete(id);this.next=this.lastCheckedAt+this.interval();}return {providers:this.providers};})().finally(()=>{this.pending=null;});return this.pending;
  }
}
