const {atomicRename}=require('../../src/shared/atomic-rename.cjs');
const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');
const maxThumbnailBytes=256*1024;
const identityBytes=32;
const identityHash=value=>createHash('sha256').update(value).digest();
function thumbnail(bytes,stat,identity){
  const legacy=bytes[0]===255&&bytes[1]===216;
  if(!legacy&&bytes[0]!==0)return null;
  if(identity&&(legacy||!bytes.subarray(1,1+identityBytes).equals(identityHash(identity))))return null;
  const jpeg=legacy?bytes:bytes.subarray(1+identityBytes);
  if(jpeg[0]!==255||jpeg[1]!==216||jpeg.length>maxThumbnailBytes)return null;
  return {thumbnail:'data:image/jpeg;base64,'+jpeg.toString('base64'),thumbnailAt:stat.mtime.toISOString()};
}
class ThumbnailCache {
  constructor(home,{maxEntries=200,maxBytes=24*1024*1024}={}){this.directory=path.join(home,'tab-thumbnails');this.maxEntries=maxEntries;this.maxBytes=maxBytes;}
  file(key){if(typeof key!=='string'||!key||key.length>4096)throw Error('Choose a bounded thumbnail identity.');return path.join(this.directory,createHash('sha256').update(key).digest('hex')+'.jpg');}
  get(key){try{const file=this.file(key),stat=fs.statSync(file);if(stat.size>maxThumbnailBytes+1+identityBytes)return null;return thumbnail(fs.readFileSync(file),stat);}catch{return null;}}
  async getMatching(key,identity){
    const file=await fs.promises.open(this.file(key),'r').catch(()=>null);
    if(!file)return null;
    try{
      const stat=await file.stat();
      if(stat.size>maxThumbnailBytes+1+identityBytes)return null;
      const bytes=Buffer.alloc(stat.size);
      const {bytesRead}=await file.read(bytes);
      return bytesRead===bytes.length?thumbnail(bytes,stat,identity):null;
    }catch{return null;}finally{await file.close();}
  }
  set(key,bytes,identity){if(!Buffer.isBuffer(bytes)||bytes.length<16||bytes.length>maxThumbnailBytes||bytes[0]!==255||bytes[1]!==216)return false;const stored=identity?Buffer.concat([Buffer.from([0]),identityHash(identity),bytes]):bytes;fs.mkdirSync(this.directory,{recursive:true,mode:0o700});const file=this.file(key);if(fs.existsSync(file)&&fs.readFileSync(file).equals(stored))return false;const temp=file+'.tmp';fs.writeFileSync(temp,stored,{mode:0o600});atomicRename(temp,file);this.prune();return true;}
  delete(key){fs.rmSync(this.file(key),{force:true});}
  prune(){const rows=fs.readdirSync(this.directory).filter(name=>/^[a-f0-9]{64}\.jpg$/.test(name)).map(name=>{const file=path.join(this.directory,name),stat=fs.statSync(file);return {file,size:stat.size,at:stat.mtimeMs};}).sort((a,b)=>b.at-a.at);let bytes=0;rows.forEach((row,index)=>{bytes+=row.size;if(index>=this.maxEntries||bytes>this.maxBytes)fs.rmSync(row.file,{force:true});});}
}
module.exports={ThumbnailCache};
