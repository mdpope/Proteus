const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { safeHistoryURL } = require('./browser-history.cjs');
const { HistoryWriter } = require('./browsing-history-writer.cjs');
const MAX_BYTES=8*1024*1024;
class BrowsingHistory {
  constructor(home,{onVisit,onError,device=()=>({}),writer,retryMs=30000}={}) {
    this.onError=onError;this.retryMs=retryMs;this.timer=null;this.lastError=null;
    this.file=path.join(home,'browsing-history.json');this.onVisit=onVisit;this.device=device;
    this.writer=writer||new HistoryWriter(this.file);this.pendingSave=null;this.dirty=false;this.controlTail=Promise.resolve();this.explicitPending=0;this.closing=false;
    this.data={version:1,enabled:true,retentionDays:90,items:[]};
    try{if(fs.statSync(this.file).size>MAX_BYTES)throw new Error('History exceeds its size limit.');this.data=JSON.parse(fs.readFileSync(this.file,'utf8'));if(!Array.isArray(this.data.items))throw new Error('Invalid browser history.');}
    catch(e){if(e.code!=='ENOENT')throw new Error('Browser history could not be read; the original file was preserved.');}
  }
  async flushVisits(){
    if(this.pendingSave)return this.pendingSave;
    this.pendingSave=(async()=>{
      while(this.dirty){
        this.dirty=false;
        const items=[...this.data.items],snapshot={...this.data,items};
        try{
          const kept=await this.writer.save(snapshot,Date.now()),saved=new Set(items),retained=new Set(kept.map(index=>items[index]));
          // Prune only this snapshot's rows; later visits/title edits stay live.
          this.data.items=this.data.items.filter(item=>!saved.has(item)||retained.has(item));
          this.lastError=null;clearTimeout(this.timer);this.timer=null;
        }catch(error){this.dirty=true;throw error;}
      }
    })().finally(()=>{this.pendingSave=null;});
    return this.pendingSave;
  }
  report(error){
    this.lastError=error.code||'WRITE_FAILED';
    if(this.timer||this.closing)return;
    try{this.onError?.({code:this.lastError,message:'Browser history could not be saved. Free disk space or check storage access; Proteus will retry.'});}catch{}
    this.timer=setTimeout(()=>{this.timer=null;void this.flush().catch(error=>this.report(error));},this.retryMs);this.timer.unref?.();
  }
  saveVisit(){
    this.dirty=true;this.data.items=this.data.items.slice(-10000);
    if(this.timer||this.closing||this.explicitPending)return;
    queueMicrotask(()=>{if(!this.closing&&!this.explicitPending)void this.flushVisits().catch(error=>this.report(error));});
  }
  async flush(){await this.controlTail;return this.flushVisits();}
  async save(){this.dirty=true;return this.flush();}
  async close(){
    this.closing=true;clearTimeout(this.timer);this.timer=null;await this.controlTail;
    // An optional visit save may have failed during shutdown; retry once before closing.
    try{await this.pendingSave;}catch{}
    try{await this.flushVisits();}catch(error){this.lastError=error.code||'WRITE_FAILED';}
    await this.writer.close?.();
  }
  addVisit(url,title,appOrigin,profileId,observed){
    url=safeHistoryURL(url,appOrigin);if(!url||!this.data.enabled)return;
    const last=this.data.items.at(-1);
    if((last?.profileId||'default')===profileId&&last?.url===url&&observed.at-Date.parse(last.visitedAt)<5000){last.title=String(title||last.title).slice(0,200);this.saveVisit();return;}
    const origin=observed.device,deviceName=String(origin.name||'').trim().replace(/[\x00-\x1f\x7f]/g,'').slice(0,100);
    const hostId=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(origin.id||'')?origin.id:null;
    const item={profileId,...(deviceName?{deviceName}:{}),...(hostId?{hostId,deviceId:hostId}:{}),id:randomUUID(),url,title:String(title||new URL(url).hostname).slice(0,200),visitedAt:new Date(observed.at).toISOString(),source:'desktop'};
    this.data.items.push(item);this.saveVisit();
    if(profileId==='default')try{Promise.resolve(this.onVisit?.(item)).catch(()=>{});}catch{}
  }
  visit(url,title,appOrigin,profileId='default'){
    if(this.closing||!safeHistoryURL(url,appOrigin))return;
    const device=this.device()||{},observed={at:Date.now(),device:{id:device.id,name:device.name}};
    if(this.explicitPending){this.controlTail=this.controlTail.then(()=>this.addVisit(url,title,appOrigin,profileId,observed));return;}
    this.addVisit(url,title,appOrigin,profileId,observed);
  }
  list({query='',page=1,pageSize=50,profileId='default'}={}){const term=String(query).toLocaleLowerCase().slice(0,200),rows=[...this.data.items].reverse().filter(i=>(i.profileId||'default')===profileId).filter(i=>!term||(i.title+' '+i.url).toLocaleLowerCase().includes(term));pageSize=Math.max(1,Math.min(50,Math.floor(Number(pageSize)||50)));page=Math.max(1,Math.floor(Number(page)||1));return {items:rows.slice((page-1)*pageSize,page*pageSize),total:rows.length,page,pageSize,enabled:this.data.enabled,retentionDays:this.data.retentionDays,...(this.lastError?{persistenceError:this.lastError}:{})};}
  update(value){
    if(this.closing)return Promise.reject(new Error('Browser history is closing.'));
    this.explicitPending++;
    const task=this.controlTail.then(async()=>{
      await this.flushVisits();
      const next={...this.data,items:[...this.data.items]};
      if(value.action==='history-delete')next.items=next.items.filter(i=>i.id!==value.id);
      else if(value.action==='history-clear')next.items=[];
      else if(value.action==='history-settings'){if(typeof value.enabled!=='boolean'||![7,30,90,365].includes(value.retentionDays))throw new Error('Choose a valid history preference.');next.enabled=value.enabled;next.retentionDays=value.retentionDays;}
      else throw new Error('Unknown history operation.');
      const kept=await this.writer.save(next,Date.now());next.items=kept.map(index=>next.items[index]);
      this.data=next;this.lastError=null;clearTimeout(this.timer);this.timer=null;
      return this.list();
    });
    this.controlTail=task.catch(error=>{if(this.dirty)this.report(error);}).finally(()=>{this.explicitPending--;});
    return task;
  }
}
module.exports={BrowsingHistory};
