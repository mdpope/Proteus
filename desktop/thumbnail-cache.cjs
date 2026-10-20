const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');
class ThumbnailCache {
  constructor(home,{maxEntries=200,maxBytes=24*1024*1024}={}){this.directory=path.join(home,'tab-thumbnails');this.maxEntries=maxEntries;this.maxBytes=maxBytes;}
  file(key){if(typeof key!=='string'||!key||key.length>4096)throw Error('Choose a bounded thumbnail identity.');return path.join(this.directory,createHash('sha256').update(key).digest('hex')+'.jpg');}
  get(key){try{const file=this.file(key),stat=fs.statSync(file);if(stat.size>256*1024)return null;return {thumbnail:'data:image/jpeg;base64,'+fs.readFileSync(file).toString('base64'),thumbnailAt:stat.mtime.toISOString()};}catch{return null;}}
  set(key,bytes){if(!Buffer.isBuffer(bytes)||bytes.length<16||bytes.length>256*1024||bytes[0]!==255||bytes[1]!==216)return false;fs.mkdirSync(this.directory,{recursive:true,mode:0o700});const file=this.file(key);if(fs.existsSync(file)&&fs.readFileSync(file).equals(bytes))return false;const temp=file+'.tmp';fs.writeFileSync(temp,bytes,{mode:0o600});fs.renameSync(temp,file);this.prune();return true;}
  delete(key){fs.rmSync(this.file(key),{force:true});}
  prune(){const rows=fs.readdirSync(this.directory).filter(name=>/^[a-f0-9]{64}\.jpg$/.test(name)).map(name=>{const file=path.join(this.directory,name),stat=fs.statSync(file);return {file,size:stat.size,at:stat.mtimeMs};}).sort((a,b)=>b.at-a.at);let bytes=0;rows.forEach((row,index)=>{bytes+=row.size;if(index>=this.maxEntries||bytes>this.maxBytes)fs.rmSync(row.file,{force:true});});}
}
module.exports={ThumbnailCache};
