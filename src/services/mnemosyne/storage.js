import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const nativePath=value=>typeof value==='string'&&value.startsWith('~/')?path.join(os.homedir(),value.slice(2)):value;
export async function storageUsage(settings,{maxEntries=500000,maxMilliseconds=10000}={}) {
 const result={observedAt:new Date().toISOString(),bytes:0,allocatedBytes:0,files:0,byType:[],complete:true,unavailableRoots:0,skippedLinks:0,scope:'Configured pipeline, incoming recordings and phone library. External ASR model stores and application installations are outside this scope.'};
 let config={};try{const base=await fs.realpath(settings.pipelineRoot),target=await fs.realpath(settings.configPath);if(!target.startsWith(base+path.sep))throw Error();const stat=await fs.stat(target);if(stat.size<=1048576)config=JSON.parse(await fs.readFile(target,'utf8'));else result.complete=false;}catch{result.complete=false;}
 const roots=[config.source_dir,config.library?.root,settings.pipelineRoot].filter(v=>typeof v==='string'&&path.isAbsolute(nativePath(v))).map(nativePath);
 const seen=new Set(),types=new Map(),started=Date.now();let examined=0;
 async function scan(folder){
  if(++examined>maxEntries||Date.now()-started>maxMilliseconds){result.complete=false;return;}
  let stat;try{stat=await fs.lstat(folder);}catch{result.complete=false;return;}
  if(stat.isSymbolicLink()){result.skippedLinks++;result.complete=false;return;}
  const identity=stat.dev+':'+stat.ino;if(seen.has(identity))return;seen.add(identity);
  if(stat.isDirectory()){let dir;try{dir=await fs.opendir(folder);let batch=[];for await(const entry of dir){if(['.venv','node_modules','.git'].includes(entry.name))continue;batch.push(scan(path.join(folder,entry.name)));if(batch.length===16){await Promise.all(batch);batch=[];}if(examined>maxEntries||Date.now()-started>maxMilliseconds){result.complete=false;break;}}await Promise.all(batch);}catch{result.complete=false;}return;}
  if(!stat.isFile())return;
  const ext=path.extname(folder).toLowerCase();const type=/^\.[a-z0-9]{1,10}$/.test(ext)?ext:'Other';
  const row=types.get(type)||{type,bytes:0,allocatedBytes:0,files:0};row.bytes+=stat.size;row.allocatedBytes+=(stat.blocks||0)*512;row.files++;types.set(type,row);
  result.bytes+=stat.size;result.allocatedBytes+=(stat.blocks||0)*512;result.files++;
 }
 for(const root of roots){try{await fs.access(root);await scan(root);}catch{result.unavailableRoots++;result.complete=false;}}
 result.byType=[...types.values()].sort((a,b)=>b.bytes-a.bytes);return result;
}
