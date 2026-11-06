import {stageDesktopDistribution} from '../src/services/updates/desktop-distribution.js';
import {currentRelease} from '../src/services/updates/release-record.js';
import {fileURLToPath} from 'node:url';
const [output,...args]=process.argv.slice(2),inputs=[],retainedInputs=[];
for(let i=0;i<args.length;i++){if(args[i]==='--retain'){if(!args[i+1]||args[i+1].startsWith('--'))throw Error('--retain requires an exact signed release folder.');retainedInputs.push(args[++i]);}else if(args[i].startsWith('--'))throw Error('Unknown distribution option.');else inputs.push(args[i]);}
console.log(JSON.stringify(stageDesktopDistribution(inputs,output,{},{...(currentRelease(fileURLToPath(new URL('..',import.meta.url)))||{}),retainedInputs}),null,2));
