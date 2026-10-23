const {atomicRename}=require('../../src/shared/atomic-rename.cjs');
const fs=require('node:fs');
const path=require('node:path');
const {ElectronBlocker}=require('@ghostery/adblocker-electron');
const {createHash}=require('node:crypto');
const {parse}=require(require('node:module').createRequire(require.resolve('@ghostery/adblocker-electron')).resolve('tldts-experimental'));
class BrowserBlocker {
  constructor(home){this.file=path.join(home,'browser-filter-cache.bin');this.engine=null;this.error=null;this.updatedAt=null;try{const stat=fs.statSync(this.file);if(stat.size<32*1024*1024){this.engine=ElectronBlocker.deserialize(fs.readFileSync(this.file));this.updatedAt=stat.mtime.toISOString();}}catch{}}
  async update(){if(this.pending)return this.pending;this.pending=(async()=>{const engine=await ElectronBlocker.fromPrebuiltAdsAndTracking(async(url,options)=>{const response=await fetch(url,{...options,signal:AbortSignal.timeout(30000)});if(!response.ok)throw new Error('Filter update failed.');return response;});const data=Buffer.from(engine.serialize());if(data.length>32*1024*1024)throw new Error('Filter list is too large.');const tmp=this.file+'.tmp';fs.mkdirSync(path.dirname(this.file),{recursive:true});fs.writeFileSync(tmp,data,{mode:0o600});atomicRename(tmp,this.file);this.engine=engine;this.updatedAt=new Date().toISOString();this.error=null;})().catch(error=>{this.error=error.message;throw error;}).finally(()=>{this.pending=null;});return this.pending;}
  status(){return {ready:!!this.engine,updatedAt:this.updatedAt,error:this.error,updating:!!this.pending};}
  async ensure(url){let target;try{target=new URL(url);}catch{return;}if(!['http:','https:'].includes(target.protocol)||['localhost','127.0.0.1','[::1]'].includes(target.hostname)||target.hostname.endsWith('.test'))return;if(!this.engine||Date.now()-Date.parse(this.updatedAt||0)>86400000)await this.update();}
  before(details,callback){if(!this.engine)return callback({});this.engine.onBeforeRequest(details,callback);}
  async inject(event,url,changes,{revision=0,current=()=>true}={}){
    if(!this.engine||!current())return;
    const parsed=parse(url),base=changes===undefined;
    const {active,styles,scripts}=this.engine.getCosmeticsFilters({domain:parsed.domain||'',hostname:parsed.hostname||'',url,classes:changes?.classes,hrefs:changes?.hrefs,ids:changes?.ids,getBaseRules:base,getInjectionRules:base,getExtendedRules:false,getRulesFromHostname:base,getRulesFromDOM:!base,callerContext:{frameId:event.frameId,processId:event.processId,lifecycle:changes?.lifecycle}});
    if(active===false||!current())return;
    this.injected??=new WeakMap();let document=this.injected.get(event.sender);if(!document||document.revision!==revision||document.url!==url){document={revision,url,scripts:new Set()};this.injected.set(event.sender,document);}
    if(styles)await event.sender.insertCSS(styles,{cssOrigin:'user'});
    for(const script of scripts||[]){
      if(!current())return;const hash=createHash('sha256').update(script).digest('hex');if(document.scripts.has(hash))continue;
      // Each scriptlet owns its helper bindings. Global function redeclarations
      // otherwise replace a prior proxy's captured helper and can make native
      // Function#toString recurse into itself (observed in X login).
      await event.sender.executeJavaScript('(()=>{\n'+script+'\n})()',true);
      if(current())document.scripts.add(hash);
    }
  }
}
module.exports={BrowserBlocker};
