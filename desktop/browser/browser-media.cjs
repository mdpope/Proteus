const {atomicRename}=require('../../src/shared/atomic-rename.cjs');
const fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
class BrowserMedia {
 constructor(home){this.file=home?path.join(home,'browser-media.json'):null;this.value={schemaVersion:1,blockVideoAutoplay:false};if(this.file)try{const value=JSON.parse(fs.readFileSync(this.file,'utf8'));if(value.schemaVersion!==1||typeof value.blockVideoAutoplay!=='boolean')throw Error();this.value=value;}catch(error){if(error.code!=='ENOENT'){this.error='Video preferences could not be read; the original record was preserved.';this.value.blockVideoAutoplay=true;}}}
 get blocked(){return this.value.blockVideoAutoplay;}
 set(blocked){if(typeof blocked!=='boolean')throw Error('Choose whether to block video autoplay.');if(this.error)throw Error(this.error);const next={...this.value,blockVideoAutoplay:blocked};if(this.file){fs.mkdirSync(path.dirname(this.file),{recursive:true});const temp=this.file+'.'+randomUUID()+'.tmp';try{fs.writeFileSync(temp,JSON.stringify(next)+'\n',{mode:0o600,flag:'wx'});atomicRename(temp,this.file);}finally{fs.rmSync(temp,{force:true});}}this.value=next;return {blockVideoAutoplay:blocked};}
}
module.exports={BrowserMedia};
