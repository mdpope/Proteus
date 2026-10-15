const fs=require('node:fs');
const path=require('node:path');
const {ElectronBlocker}=require('@ghostery/adblocker-electron');
class BrowserBlocker {
  constructor(home){this.file=path.join(home,'browser-filter-cache.bin');this.engine=null;this.error=null;this.updatedAt=null;try{const stat=fs.statSync(this.file);if(stat.size<32*1024*1024){this.engine=ElectronBlocker.deserialize(fs.readFileSync(this.file));this.updatedAt=stat.mtime.toISOString();}}catch{}}
  async update(){if(this.pending)return this.pending;this.pending=(async()=>{const engine=await ElectronBlocker.fromPrebuiltAdsAndTracking(async(url,options)=>{const response=await fetch(url,{...options,signal:AbortSignal.timeout(30000)});if(!response.ok)throw new Error('Filter update failed.');return response;});const data=Buffer.from(engine.serialize());if(data.length>32*1024*1024)throw new Error('Filter list is too large.');const tmp=this.file+'.tmp';fs.mkdirSync(path.dirname(this.file),{recursive:true});fs.writeFileSync(tmp,data,{mode:0o600});fs.renameSync(tmp,this.file);this.engine=engine;this.updatedAt=new Date().toISOString();this.error=null;})().catch(error=>{this.error=error.message;throw error;}).finally(()=>{this.pending=null;});return this.pending;}
  status(){return {ready:!!this.engine,updatedAt:this.updatedAt,error:this.error,updating:!!this.pending};}
  async ensure(url){let target;try{target=new URL(url);}catch{return;}if(!['http:','https:'].includes(target.protocol)||['localhost','127.0.0.1','[::1]'].includes(target.hostname)||target.hostname.endsWith('.test'))return;if(!this.engine||Date.now()-Date.parse(this.updatedAt||0)>86400000)await this.update();}
  before(details,callback){if(!this.engine)return callback({});this.engine.onBeforeRequest(details,callback);}
}
module.exports={BrowserBlocker};
