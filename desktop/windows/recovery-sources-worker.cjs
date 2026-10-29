const {parentPort,workerData}=require('node:worker_threads');
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const {normalizeSession}=require('./workspace-session.cjs');
try{
 const {home,since}=workerData,sources=[],gaps=[];let total=0;
 const read=(relative,kind,at)=>{
  const file=path.join(home,relative);
  try{
   const stat=fs.lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>18*1024*1024)throw Error('Invalid or oversized session');
   total+=stat.size;if(total>192*1024*1024)throw Error('Recovery source budget exceeded');
   const bytes=fs.readFileSync(file),raw=JSON.parse(bytes);
   sources.push({id:relative,kind,at:at||stat.mtime.toISOString(),sha256:createHash('sha256').update(bytes).digest('hex'),session:normalizeSession(raw.session||raw,{projects:true})});
  }catch(error){if(error.code!=='ENOENT')gaps.push({id:relative,error:error.message});}
 };
 read('desktop-workspace.json','legacy');
 let names=[];try{names=fs.readdirSync(path.join(home,'window-sessions'));}catch(error){if(error.code!=='ENOENT')throw error;}
 if(names.length>1000)throw Error('Too many retained window sessions');
 for(const name of names.sort())if(/^[a-f0-9-]{36}\.json$/i.test(name))read(path.join('window-sessions',name),'window');
 let layouts;try{layouts=JSON.parse(fs.readFileSync(path.join(home,'window-layouts.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
 if(layouts){if(layouts.schemaVersion!==1||!Array.isArray(layouts.layouts)||layouts.layouts.length>70)throw Error('Invalid saved window catalog');
  for(const row of layouts.layouts)if(Date.parse(row.capturedAt)>=since){if(!/^[a-f0-9-]{36}$/i.test(row.id))throw Error('Invalid saved window ID');read(path.join('window-layouts',row.id+'.json'),row.kind,row.capturedAt);}
 }
 parentPort.postMessage({sources,gaps});
}catch(error){parentPort.postMessage({error:error.message});}
