const {atomicRename}=require('../../src/shared/atomic-rename.cjs');
const fs=require('node:fs');
const path=require('node:path');
const MAX_BYTES=512*1024,MAX_ENTRIES=200;
function normalizePosition(value){
  if(!Array.isArray(value)||value.length>32)throw Error('Invalid reading position.');
  return value.map(([locator,entry])=>{
    if(typeof locator!=='string'||locator.length>2048||!entry||![entry.top,entry.left].every(n=>Number.isFinite(n)&&Math.abs(n)<100_000_000))throw Error('Invalid reading position.');
    const anchor=entry.anchor;
    return [locator,{top:entry.top,left:entry.left,follow:entry.follow===true,...(anchor&&Number.isInteger(anchor.index)&&anchor.index>=0&&anchor.index<1_000_000&&Number.isFinite(anchor.offset)&&Math.abs(anchor.offset)<10_000_000?{anchor:{index:anchor.index,offset:anchor.offset,key:typeof anchor.key==='string'?anchor.key.slice(0,256):null,text:typeof anchor.text==='string'?anchor.text.slice(0,160):null}}:{})}];
  });
}
class ViewPositions {
  constructor(home){this.file=path.join(home,'view-positions.json');}
  read(){try{if(fs.statSync(this.file).size>MAX_BYTES+8192)throw Error();const data=JSON.parse(fs.readFileSync(this.file,'utf8'));if(data.schemaVersion!==1||!Array.isArray(data.entries))throw Error();return data;}catch(error){if(error.code==='ENOENT')return {schemaVersion:1,entries:[]};throw Error('Saved reading positions could not be read. The original file was preserved.');}}
  get(){return this.read().entries;}
  set(key,value){
    if(typeof key!=='string'||!key||key.length>2048)throw Error('Choose a bounded document view.');
    const data=this.read(),position=normalizePosition(value);
    data.entries=data.entries.filter(row=>row[0]!==key);data.entries.push([key,position]);
    while(data.entries.length>MAX_ENTRIES||Buffer.byteLength(JSON.stringify(data))>MAX_BYTES){if(data.entries.length===1)throw Error('Reading position exceeds its bounded limit.');data.entries.shift();}
    fs.mkdirSync(path.dirname(this.file),{recursive:true});const temp=this.file+'.tmp';fs.writeFileSync(temp,JSON.stringify(data)+'\n',{mode:0o600});atomicRename(temp,this.file);return {saved:true};
  }
}
module.exports={ViewPositions,normalizePosition};
