// Read-only accounting. It never retires backups, staging, or external artifacts.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const {digest}=createRequire(import.meta.url)('../desktop/updates/update-package.cjs');
const {inventoryStorage}=createRequire(import.meta.url)('../desktop/updates/update-storage.cjs');
const options={artifactRoots:[]},args=process.argv.slice(2);
for(let index=0;index<args.length;index++){
 const flag=args[index],value=args[++index];
 if(!['--home','--installation','--artifact-root'].includes(flag)||!value||!path.isAbsolute(value))throw Error('Usage: node scripts/update-storage.mjs --home <absolute data home> --installation <absolute app directory> [--artifact-root <absolute directory>]');
 if(flag==='--artifact-root')options.artifactRoots.push(value);else options[flag.slice(2)]=fs.realpathSync(value);
}
if(!options.home||!options.installation)throw Error('Choose the exact data home and installation for dry-run accounting.');
const root=path.join(path.dirname(options.home),'Proteus Updates',digest(options.home+'\0'+options.installation).slice(0,24));
process.stdout.write(JSON.stringify(inventoryStorage(root,options),null,2)+'\n');
