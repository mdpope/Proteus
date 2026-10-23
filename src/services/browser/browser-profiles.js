import path from 'node:path';
import {createHash} from 'node:crypto';
import {atomicJSON,readJSON} from '../../shared/files.js';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function validateBrowserSettings(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!['blockingEnabled','exceptions','notifications','extensions','allowExtensionAgents'].includes(key)))throw new Error('Invalid browser settings.');
 const origin=value=>{const url=new URL(value);if(!['http:','https:'].includes(url.protocol)||url.origin!==value||value.length>2048)throw new Error('Use a website origin without a path or credentials.');return value;};
 if(value.blockingEnabled!==undefined&&typeof value.blockingEnabled!=='boolean')throw new Error('Choose a blocking preference.');
 for(const key of ['exceptions','notifications','extensions'])if(value[key]!==undefined&&(!Array.isArray(value[key])||value[key].length>200))throw new Error('Too many browser settings.');
 const result={...(value.blockingEnabled===undefined?{}:{blockingEnabled:value.blockingEnabled})};
 if(value.allowExtensionAgents!==undefined){if(typeof value.allowExtensionAgents!=='boolean')throw new Error('Choose extension agent access.');result.allowExtensionAgents=value.allowExtensionAgents;}
 if(value.exceptions)result.exceptions=value.exceptions.map(origin);
 if(value.notifications)result.notifications=value.notifications.map(item=>{if(!['ask','allow','block'].includes(item.permission))throw new Error('Choose a notification permission.');return {origin:origin(item.origin),permission:item.permission};});
 if(value.extensions)result.extensions=value.extensions.map(item=>{if(!/^[a-p]{32}$/.test(item.id)||typeof item.enabled!=='boolean')throw new Error('Invalid extension preference.');return {id:item.id,enabled:item.enabled};});
 return result;
}
export class BrowserProfiles {
  constructor(home,account){this.file=path.join(home,'browser-profiles.json');this.account=account;this.data=readJSON(this.file,{version:1,enabled:false,account:null,items:[],defaultSettings:{}});this.verified=false;this.error=null;}
  identity(){const session=this.account.session||this.account.life.api;session.load?.();return session.identity();}
  key(identity=this.identity()){return identity?createHash('sha256').update(JSON.stringify([identity.origin,identity.accountId])).digest('hex'):null;}
  available(){return this.data.enabled&&!!this.identity()&&this.data.account===this.key();}
  list(){return {enabled:this.data.enabled,authenticated:!!this.identity(),available:this.available(),verified:this.verified,error:this.error,cached:this.available()&&!this.verified,items:[{id:'default',name:'Default',settings:this.data.defaultSettings||{}},...(this.available()?this.data.items:[])]};}
  get(id='default'){const item=this.list().items.find(item=>item.id===id);if(!item)throw new Error('This browser profile is unavailable. Sign in and refresh profiles in Browser Preferences.');return item;}
  partition(id='default'){this.get(id);return id==='default'?'persist:proteus-browser':'persist:proteus-profile-'+this.data.account+'-'+id;}
  async refresh(){const identity=this.identity();if(!identity){this.verified=false;return this.list();}if(!this.data.enabled)return this.list();try{const result=await this.account.request({path:'/browser-profiles'});if(this.key(identity)!==this.key())throw new Error('The browser profile account changed.');const items=result.items||[];if(!Array.isArray(items)||items.length>32||items.some(item=>!UUID.test(item.id)||typeof item.name!=='string'))throw new Error('Invalid browser profile definitions.');this.data={...this.data,account:this.key(identity),items:items.map(item=>({...item,settings:validateBrowserSettings(Array.isArray(item.settings)&&item.settings.length===0?{}:item.settings||{})}))};atomicJSON(this.file,this.data);this.verified=true;this.error=null;return this.list();}catch(error){this.verified=false;this.error=error.message;throw error;}}
  async handle(value={}){
    if(value.action==='list')return this.list();
    if(value.action==='refresh')return this.refresh();
    if(value.action==='enable'){if(typeof value.enabled!=='boolean')throw new Error('Choose whether profile sync is enabled.');if(value.enabled&&!this.identity())throw new Error('Sign in to your Proteus account first.');const previous=this.data;this.data={...previous,enabled:value.enabled};try{if(value.enabled)await this.refresh();else{this.verified=false;atomicJSON(this.file,this.data);}}catch(error){this.data=previous;throw error;}return this.list();}
    if(value.action==='settings'){const profile=this.get(value.id),settings=validateBrowserSettings(value.settings);if(profile.id==='default'){const next={...this.data,defaultSettings:settings};atomicJSON(this.file,next);this.data=next;return this.list();}return this.handle({action:'save',id:profile.id,name:profile.name,settings,expectedRevision:profile.revision});}
    if(value.id==='default')throw new Error('Default is a local profile and cannot be renamed or removed.');
    if(!this.available())throw new Error('Enable profile sync after signing in to your Proteus account.');
    if(!this.verified)await this.refresh();
    const id=value.id;if(id&&!UUID.test(id))throw new Error('Choose a browser profile.');
    if(value.action==='save')await this.account.request({path:'/browser-profiles'+(id?'/'+id:''),method:id?'PUT':'POST',identity:this.identity(),body:{name:value.name,settings:validateBrowserSettings(value.settings||{}),...(id?{expectedRevision:value.expectedRevision}:{})}});
    else if(value.action==='delete')await this.account.request({path:'/browser-profiles/'+id,method:'DELETE',identity:this.identity(),body:{expectedRevision:value.expectedRevision}});
    else throw new Error('Unknown profile operation.');
    return this.refresh();
  }
}
