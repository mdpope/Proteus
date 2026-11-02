import {stageDesktopDistribution} from '../src/services/updates/desktop-distribution.js';
import {currentRelease} from '../src/services/updates/release-record.js';
import {fileURLToPath} from 'node:url';
const [output,...inputs]=process.argv.slice(2);
console.log(JSON.stringify(stageDesktopDistribution(inputs,output,{},currentRelease(fileURLToPath(new URL('..',import.meta.url)))||{}),null,2));
