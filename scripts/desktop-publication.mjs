import fs from 'node:fs';
import {desktopPublicationPlan,retireDesktopPublications} from '../src/services/updates/desktop-publication.js';
const [publicRoot,receiptFile,action,planDigest]=process.argv.slice(2);
if(action!==undefined&&action!=='--apply')throw Error('Use PUBLIC_ROOT DISTRIBUTION_RECEIPT [--apply PLAN_DIGEST].');
const receipt=JSON.parse(fs.readFileSync(receiptFile,'utf8'));
console.log(JSON.stringify(action?retireDesktopPublications(publicRoot,receipt,planDigest):desktopPublicationPlan(publicRoot,receipt),null,2));
