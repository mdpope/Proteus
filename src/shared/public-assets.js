import fs from 'node:fs';import path from 'node:path';
/** Build an exact URL allowlist from public code assets. Nested feature folders
 * are supported; symlinks and files outside the public tree are never served. */
export function publicAssets(directory){
 const assets={'/':['index.html','text/html']};
 const walk=(folder,prefix='')=>{for(const entry of fs.readdirSync(folder,{withFileTypes:true})){
  if(!/^[A-Za-z0-9_.-]+$/.test(entry.name)||entry.isSymbolicLink())continue;
  const relative=prefix+entry.name;
  if(entry.isDirectory())walk(path.join(folder,entry.name),relative+'/');
  else if(entry.isFile()&&/\.(js|css)$/.test(entry.name))assets['/'+relative]=[relative,entry.name.endsWith('.css')?'text/css':'text/javascript'];
 }};walk(directory);return assets;
}
