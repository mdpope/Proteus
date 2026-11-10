const fs=require('node:fs'),path=require('node:path');
const {atomicRename}=require('../../src/shared/atomic-rename.cjs');
const atomicJSON=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify(value),{mode:0o600});atomicRename(file+'.tmp',file);};
const types=new Set(['local-network','local-network-access','loopback-network']);
const websiteOrigin=value=>{try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password?url.origin:null;}catch{return null;}};
// Network access grants are local to this installation and profile partition.
// They must not travel with cloud-synced profile preferences to another owner.
class NetworkPermissions{
 constructor(browser){this.browser=browser;this.file=browser.options.home?path.join(browser.options.home,'browser-network-permissions.json'):null;this.rules=[];if(this.file)try{const stat=fs.statSync(this.file);if(stat.size<=2000000){const d=JSON.parse(fs.readFileSync(this.file,'utf8'));if(d.schemaVersion===1&&Array.isArray(d.rules)&&d.rules.length<=1000)this.rules=d.rules.filter(r=>typeof r.partition==='string'&&types.has(r.type)&&websiteOrigin(r.origin)===r.origin&&['allow','block'].includes(r.permission));}}catch{}}
 partition(profileId){return this.browser.sessionNames?.get(profileId)||this.browser.options.profiles?.partition(profileId)||('local:'+profileId);}
 permission(profileId,type,origin){origin=websiteOrigin(origin);if(!origin||!types.has(type))return 'block';try{return this.rules.find(r=>r.partition===this.partition(profileId)&&r.type===type&&r.origin===origin)?.permission||'ask';}catch{return 'block';}}
 save(profileId,type,origin,permission){origin=websiteOrigin(origin);if(!origin||!types.has(type)||!['allow','block'].includes(permission))throw Error('Choose an exact website network permission.');const partition=this.partition(profileId),rules=[...this.rules.filter(r=>!(r.partition===partition&&r.type===type&&r.origin===origin)),{partition,type,origin,permission}];if(rules.length>1000)throw Error('Review existing website network permissions before adding another.');if(this.file)atomicJSON(this.file,{schemaVersion:1,rules});this.rules=rules;}
}
module.exports={NetworkPermissions,networkPermissionTypes:types,websiteOrigin};
