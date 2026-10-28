const fs=require('node:fs');
const path=require('node:path');
const {createHash,randomUUID}=require('node:crypto');
const {atomicRename}=require('../../src/shared/atomic-rename.cjs');
const revision=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function validate(value){
  if(value?.schemaVersion!==1||!Array.isArray(value.rules)||value.rules.length>200)throw Error('Invalid link-routing preferences.');
  const ids=new Set();
  for(const rule of value.rules){
    if(typeof rule.id!=='string'||!rule.id||ids.has(rule.id)||rule.id.length>80||typeof rule.pattern!=='string'||!rule.pattern.trim()||rule.pattern.length>2048||/[\x00-\x1f\x7f]/.test(rule.pattern)||typeof rule.enabled!=='boolean')throw Error('Each rule needs a unique ID, URL pattern, and enabled setting.');
    ids.add(rule.id);
    const target=rule.destination;
    if(!target||['workspaceId','projectId'].some(key=>typeof target[key]!=='string'||!target[key]||target[key].length>200)||target.hostId!==undefined&&target.hostId!=='local'&&!/^[a-f0-9-]{36}$/i.test(target.hostId))throw Error('Choose an explicit workspace and project for each rule.');
  }
  if(value.defaults!==undefined)validateDefaults(value.defaults);
  return value;
}
const validDestination=target=>target&&['workspaceId','projectId'].every(key=>typeof target[key]==='string'&&target[key]&&target[key].length<=200)&&(target.hostId===undefined||target.hostId==='local'||/^[a-f0-9-]{36}$/i.test(target.hostId));
/** Picker defaults, modelled on SafariSelector's auto-select: a fixed project or the
 * last chosen one, opened after an optional countdown or when the picker is dismissed. */
function validateDefaults(value){
  if(!value||typeof value!=='object'||!['none','last','fixed'].includes(value.mode)||!Number.isInteger(value.autoSelectSeconds)||value.autoSelectSeconds<0||value.autoSelectSeconds>60)throw Error('Choose a default link destination and a countdown of 0–60 seconds.');
  if(value.mode==='fixed'&&!validDestination(value.destination))throw Error('Choose the default project for links.');
  return value;
}
class LinkRoutingStore{
  constructor(home){this.file=path.join(home,'browser-link-routing.json');this.lastFile=path.join(home,'browser-link-routing-last.json');}
  defaults(){const value=this.read();return value.defaults||{mode:'none',autoSelectSeconds:0};}
  saveDefaults(defaults,expectedRevision){
    const current=this.read();if(current.revision!==expectedRevision)throw Error('Link settings changed. Refresh before saving.');
    const next={...current,defaults:structuredClone(validateDefaults(defaults))};delete next.revision;validate(next);this.write(next);return this.read();
  }
  // Last choice is ordinary state, kept apart so link clicks never invalidate an open settings form.
  last(){try{const value=JSON.parse(fs.readFileSync(this.lastFile,'utf8'));return validDestination(value)?value:null;}catch{return null;}}
  recordLast(target){if(!validDestination(target))return;const value={hostId:target.hostId||'local',workspaceId:target.workspaceId,projectId:target.projectId};try{fs.mkdirSync(path.dirname(this.lastFile),{recursive:true,mode:0o700});const temporary=this.lastFile+'.'+randomUUID()+'.tmp';fs.writeFileSync(temporary,JSON.stringify(value)+'\n',{mode:0o600});atomicRename(temporary,this.lastFile);}catch{}}
  read(){
    let value;try{if(fs.statSync(this.file).size>1024*1024)throw Error('Link-routing preferences are too large.');value=JSON.parse(fs.readFileSync(this.file,'utf8'));}catch(error){if(error.code!=='ENOENT')throw Error('Link-routing preferences could not be read. The original file was preserved.');value={schemaVersion:1,rules:[]};}
    validate(value);return {...value,revision:revision(value)};
  }
  save(rules,expectedRevision){
    const current=this.read();if(current.revision!==expectedRevision)throw Error('Link rules changed. Refresh before saving.');
    const next={...current,rules:structuredClone(rules)};delete next.revision;validate(next);
    this.write(next);return this.read();
  }
  write(next){
    fs.mkdirSync(path.dirname(this.file),{recursive:true,mode:0o700});const temporary=this.file+'.'+randomUUID()+'.tmp';
    try{fs.writeFileSync(temporary,JSON.stringify(next,null,2)+'\n',{mode:0o600});atomicRename(temporary,this.file);}finally{try{fs.unlinkSync(temporary);}catch{}}
  }
}
module.exports={LinkRoutingStore,validate,validateDefaults};
