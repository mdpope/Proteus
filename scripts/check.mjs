import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
function check(directory) {
  for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
    if(entry.isSymbolicLink()||['node_modules','vendor','dist','fixtures'].includes(entry.name))continue;
    const file=path.join(directory,entry.name);
    if(entry.isDirectory()){check(file);continue;}
    if(!/\.(?:js|cjs|mjs)$/.test(entry.name))continue;
    const result=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});
    if(result.status!==0)process.exit(result.status||1);
  }
}
for(const directory of ['src','desktop','public','relay','scripts','test'])check(directory);
