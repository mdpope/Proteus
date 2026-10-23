const {atomicRename}=require('../../src/shared/atomic-rename.cjs');
// Host-owned per-logical-tab pause state. A corrupt record fails closed without
// overwriting it or preventing ordinary human browsing.
const fs=require('node:fs'),path=require('node:path');
const {createHash,randomUUID}=require('node:crypto');
class BrowserAgentAccess {
 constructor(home){this.file=path.join(home,'browser-agent-access.json');this.document={schemaVersion:1,revision:0,paused:[],shared:[]};try{this.document=this.read();}catch(error){this.error=error;}}
 key(id){return createHash('sha256').update(String(id)).digest('hex');}
 read(){try{if(fs.statSync(this.file).size>1024*1024)throw Error();const value=JSON.parse(fs.readFileSync(this.file,'utf8'));if(value.schemaVersion!==1||!Number.isSafeInteger(value.revision)||value.revision<0||!Array.isArray(value.paused)||value.paused.length>5000||value.paused.some(id=>typeof id!=='string'||!/^[a-f0-9]{64}$/.test(id))||new Set(value.paused).size!==value.paused.length)throw Error();if(value.shared!==undefined&&(!Array.isArray(value.shared)||value.shared.length>5000||value.shared.some(id=>typeof id!=='string'||!/^[a-f0-9]{64}$/.test(id))||new Set(value.shared).size!==value.shared.length))throw Error();return value;}catch(error){if(error.code==='ENOENT')return {schemaVersion:1,revision:0,paused:[],shared:[]};throw Error('Agent-control preferences could not be read. Agent page access is paused; the original record was preserved.');}}
 get revision(){return this.document.revision;}
 paused(id){return !!this.error||this.document.paused.includes(this.key(id))||!this.document.shared?.includes(this.key(id));}
 set(id,paused,expectedRevision){
  if(typeof paused!=='boolean')throw Error('Choose whether to pause agent control.');
  let current;try{current=this.read();}catch(error){this.error=error;throw error;}
  this.document=current;this.error=null;
  if(expectedRevision!==undefined&&expectedRevision!==current.revision)throw Error('Agent-control preferences changed. Refresh this tab and retry.');
  const key=this.key(id),keys=new Set(current.paused),shared=new Set(current.shared||[]);if(paused){keys.add(key);shared.delete(key);}else{keys.delete(key);shared.add(key);}if(keys.size>5000||shared.size>5000)throw Error('The saved agent-control preference limit has been reached.');
  if(keys.has(key)===current.paused.includes(key)&&shared.has(key)===(current.shared||[]).includes(key))return;
  const next={...current,revision:current.revision+1,paused:[...keys],shared:[...shared]},encoded=JSON.stringify(next)+'\n';if(Buffer.byteLength(encoded)>1024*1024)throw Error('Agent-control preferences exceed their storage limit.');fs.mkdirSync(path.dirname(this.file),{recursive:true,mode:0o700});const temporary=this.file+'.'+randomUUID()+'.tmp';
  try{fs.writeFileSync(temporary,encoded,{flag:'wx',mode:0o600});atomicRename(temporary,this.file);this.document=next;}finally{fs.rmSync(temporary,{force:true});}
 }
}
module.exports={BrowserAgentAccess};
