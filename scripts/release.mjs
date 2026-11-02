import {parseArgs} from 'node:util';
import {currentRelease,openRelease} from '../src/services/updates/release-record.js';
const [action,...args]=process.argv.slice(2),root=new URL('..',import.meta.url);
const {fileURLToPath}=await import('node:url');
if(action==='status')console.log(JSON.stringify(currentRelease(fileURLToPath(root)),null,2));
else if(action==='open'){
 const {values}=parseArgs({args,options:{id:{type:'string'},name:{type:'string'},date:{type:'string'},plan:{type:'string'}}});
 console.log(JSON.stringify(openRelease(fileURLToPath(root),values),null,2));
}else throw Error('Use release.mjs status or open --id ID --name NAME --date YYYY-MM-DD [--plan docs/plan.md].');
