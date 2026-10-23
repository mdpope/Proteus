const {atomicRename}=require('../../src/shared/atomic-rename.cjs');
const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {getDomain}=require('tldts-experimental');
function siteOrigin(value){try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password?u.origin:null;}catch{return null;}}
function scaleDomain(value){if(!siteOrigin(value))return null;const u=new URL(value);return getDomain(u.hostname,{allowPrivateDomains:true})||u.host.toLowerCase();}
function safeIcon(value){return typeof value==='string'&&value.length<=98304&&/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(value)?value:'';}
// Device-local hints/icons, keyed by the account-owned partition, never by a
// display name. No cookies, paths, queries or page contents are stored here.
class BrowserSiteSettings{
 constructor(home){this.file=home&&path.join(home,'browser-sites.json');this.data={schemaVersion:1,profiles:{}};try{if(fs.statSync(this.file).size>8*1024*1024)throw Error('Site hints exceed their storage limit.');const saved=JSON.parse(fs.readFileSync(this.file,'utf8'));if(saved.schemaVersion===1&&saved.profiles&&typeof saved.profiles==='object')this.data=saved;}catch{} }
 key(partition){return createHash('sha256').update(partition).digest('hex');}
 entries(partition){return this.data.profiles[this.key(partition)]||{};}
 get(partition,url){return this.entries(partition)[siteOrigin(url)]||{};}
 scale(partition,url){const value=this.data.pageScales?.[this.key(partition)]?.[scaleDomain(url)]?.percent;return Number.isFinite(value)&&value>=25&&value<=500?value:100;}
 rememberScale(partition,url,percent){
  const domain=scaleDomain(url);if(!domain||!Number.isFinite(percent)||percent<25||percent>500)throw Error('Choose a website page scale between 25% and 500%.');
  const previous=this.data.pageScales,key=this.key(partition),entries={...(previous?.[key]||{})};
  entries[domain]={...entries[domain],percent:Math.round(percent),updatedAt:new Date().toISOString()};const domains=Object.keys(entries);while(domains.length>1000)delete entries[domains.shift()];
  this.data.pageScales={...previous,[key]:entries};try{this.flush({strict:true});}catch(error){this.data.pageScales=previous;throw error;}return entries[domain].percent;
 }
 remember(partition,url,changes={}){const origin=siteOrigin(url);if(!origin)return;const key=this.key(partition),entries=this.data.profiles[key]??={};const previous=entries[origin]||{},next={...previous,...changes};if(changes.favicon!==undefined)next.favicon=safeIcon(changes.favicon);if(JSON.stringify(previous)===JSON.stringify(next)&&entries[origin])return;entries[origin]=next;const origins=Object.keys(entries);while(origins.length>1000)delete entries[origins.shift()];clearTimeout(this.timer);this.timer=setTimeout(()=>this.flush(),100);this.timer.unref?.();}
 flush({strict=false}={}){clearTimeout(this.timer);if(!this.file)return;const temporary=this.file+'.tmp';try{const json=JSON.stringify(this.data);if(Buffer.byteLength(json)>8*1024*1024)throw Error('Website settings exceed their storage limit.');fs.mkdirSync(path.dirname(this.file),{recursive:true});fs.writeFileSync(temporary,json,{mode:0o600});fs.chmodSync(temporary,0o600);atomicRename(temporary,this.file);}catch(error){try{fs.unlinkSync(temporary);}catch{}if(strict)throw Error('Website scale could not be saved: '+error.message);}}

}
function siteUserAgent(mode,base,chromeVersion){const version=chromeVersion||'144.0.0.0';if(mode==='mobile')return `Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version} Mobile Safari/537.36`;return base.replace(/\s(?:Electron|Proteus)\/[^\s]+/gi,'');}
function presentationURL(value,mode){const url=new URL(value);if(mode==='desktop'&&url.hostname==='m.youtube.com')url.hostname='www.youtube.com';return url.href;}
module.exports={BrowserSiteSettings,siteOrigin,scaleDomain,safeIcon,siteUserAgent,presentationURL};
