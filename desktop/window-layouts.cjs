const fs=require('node:fs');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const {validId}=require('./windows.cjs');
const {normalizePosition}=require('./view-positions.cjs');
const MAX_LAYOUT=18*1024*1024,MAX_TOTAL=128*1024*1024;
const uuid=value=>/^[a-f0-9-]{36}$/i.test(value||'');
const title=value=>{if(typeof value!=='string'||!value.trim()||value.trim().length>100)throw Error('Use a window name between 1 and 100 characters.');return value.trim();};
function validate(value){
 if(value.schemaVersion!==1||!Number.isSafeInteger(value.revision)||value.revision<0||!Array.isArray(value.layouts)||value.layouts.length>70||value.layouts.some(row=>!uuid(row.id)||!validId(row.windowId)||!['closed','named','previous'].includes(row.kind)||typeof row.name!=='string'||row.name.length>100)||new Set(value.layouts.map(row=>row.id)).size!==value.layouts.length)throw Error('Saved window sessions are invalid. The original record was preserved.');
 return value;
}
class WindowLayouts{
 constructor(home){this.file=path.join(home,'window-layouts.json');this.directory=path.join(home,'window-layouts');}
 read(){try{if(fs.statSync(this.file).size>256*1024)throw Error();return validate(JSON.parse(fs.readFileSync(this.file,'utf8')));}catch(error){if(error.code==='ENOENT')return {schemaVersion:1,revision:0,names:{},layouts:[]};throw Error('Saved window sessions could not be read. The original record was preserved.');}}
 commit(data,expected){const current=this.read();if(current.revision!==expected)throw Error('Window sessions changed. Refresh and retry.');const next=validate({...data,revision:expected+1});if(Buffer.byteLength(JSON.stringify(next))>256*1024)throw Error('Window session metadata exceeds its limit.');fs.mkdirSync(path.dirname(this.file),{recursive:true,mode:0o700});const temporary=this.file+'.'+randomUUID()+'.tmp';try{fs.writeFileSync(temporary,JSON.stringify(next)+'\n',{mode:0o600,flag:'wx'});fs.renameSync(temporary,this.file);}finally{fs.rmSync(temporary,{force:true});}return next;}
 name(id){return this.read().names?.[id]||'Untitled window';}
 rename(id,name,expected){if(!validId(id))throw Error('Choose a current window.');const data=this.read();if(data.revision!==expected)throw Error('Window sessions changed. Refresh and retry.');data.names={...data.names,[id]:title(name)};for(const row of data.layouts)if(row.windowId===id&&row.kind==='closed')row.name=title(name);return this.commit(data,expected);}
 renameLayout(id,name,expected){const data=this.read(),row=data.layouts.find(row=>row.id===id);if(!row)throw Error('Choose a saved window session.');row.name=title(name);return this.commit(data,expected);}
 snapshot(id){if(!uuid(id))throw Error('Choose a saved window session.');const file=path.join(this.directory,id+'.json');if(fs.statSync(file).size>MAX_LAYOUT)throw Error('Window session exceeds its limit.');const value=JSON.parse(fs.readFileSync(file,'utf8'));if(value.schemaVersion!==1||!value.session||!Array.isArray(value.positions)||value.positions.length>200)throw Error('Window session could not be restored. The original record was preserved.');for(const [key,position]of value.positions){if(typeof key!=='string'||key.length>2048)throw Error('Invalid window reading position.');normalizePosition(position);}return value;}
 capture({windowId,session,positions=[],bounds,maximized=false,kind='closed',name},expected){
  if(!validId(windowId)||!session||!['closed','named','previous'].includes(kind))throw Error('Choose an available window session.');
  const data=this.read();if(expected!==undefined&&data.revision!==expected)throw Error('Window sessions changed. Refresh and retry.');
  if(kind==='named'&&data.layouts.filter(row=>row.kind==='named').length>=50)throw Error('Remove a named window session before saving another (maximum 50).');
  const id=randomUUID(),snapshot={schemaVersion:1,session,positions},encoded=JSON.stringify(snapshot)+'\n';
  if(Buffer.byteLength(encoded)>MAX_LAYOUT)throw Error('Window session exceeds its bounded limit.');
  const row={id,windowId,kind,name:name?title(name):data.names?.[windowId]||'Untitled window',capturedAt:new Date().toISOString(),bounds,maximized,tabCount:(session.tabs||[]).filter(tab=>!tab.parentId&&!tab.navigationClosed&&!tab.hidden&&tab.type!=='overview').length,page:session.page||'home',active:session.tabs?.find(tab=>tab.id===session.active)?.label||session.page||'Home'};
  const old=data.layouts;
  data.layouts=[row,...old.filter(item=>kind!=='closed'||item.kind!=='closed'||item.windowId!==windowId)];
  let automatic=0;data.layouts=data.layouts.filter(item=>item.kind==='named'||++automatic<=20);
  const bytes=data.layouts.reduce((total,item)=>total+(item.id===id?Buffer.byteLength(encoded):fs.statSync(path.join(this.directory,item.id+'.json')).size),0);
  if(bytes>MAX_TOTAL)throw Error('Saved window sessions exceed 128 MiB. Remove an old session and retry.');
  fs.mkdirSync(this.directory,{recursive:true,mode:0o700});const file=path.join(this.directory,id+'.json'),temporary=file+'.tmp';
  try{fs.writeFileSync(temporary,encoded,{mode:0o600,flag:'wx'});fs.renameSync(temporary,file);this.snapshot(id);this.commit(data,data.revision);}catch(error){fs.rmSync(file,{force:true});throw error;}finally{fs.rmSync(temporary,{force:true});}
  for(const prior of old)if(!data.layouts.some(item=>item.id===prior.id))fs.rmSync(path.join(this.directory,prior.id+'.json'),{force:true});
  return row;
 }
 remove(id,expected){const data=this.read();if(!data.layouts.some(row=>row.id===id))throw Error('This window session is unavailable. Refresh the list.');data.layouts=data.layouts.filter(row=>row.id!==id);this.commit(data,expected);fs.rmSync(path.join(this.directory,id+'.json'),{force:true});}
 list(registry){const data=this.read();return {revision:data.revision,retention:'Latest 20 automatic snapshots; named sessions remain until removed (maximum 50, 128 MiB total).',open:[...registry.contexts.values()].map(ctx=>({id:ctx.id,name:data.names?.[ctx.id]||'Untitled window',current:registry.current()?.id===ctx.id,active:ctx.session?.get()?.page||'home'})),layouts:data.layouts.map(row=>({...row,open:registry.contexts.has(row.windowId)}))};}
}
module.exports={WindowLayouts};
