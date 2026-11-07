import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {canonicalPath} from '../settings/permissions.js';
import {validateSchedule,revision} from './schedules.js';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const inside=(file,root)=>{const relative=path.relative(root,file);return relative===''||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative));};
function bytes(file){if(!fs.statSync(file).isFile()||fs.statSync(file).size>1024*1024)throw Error('Source/export must be a regular file of at most 1 MiB.');return fs.readFileSync(file);}

// The workflow validates its foreign manifest. This boundary verifies its exact
// bytes, exported Proteus schema, ownership and caller revision; it runs no exporter.
export function reconciliationPlan(current,evidence){
 if(!current.source?.manifest||!current.source.system)throw Error('Choose a source-owned schedule.');
 if(!evidence||!['manifestSha256','exportSha256'].every(key=>/^[a-f0-9]{64}$/.test(evidence[key]||'')))throw Error('Supply exact manifest and export SHA-256 hashes.');
 const manifest=canonicalPath(current.source.manifest,current.workspace.cwd),exportPath=canonicalPath(evidence.exportPath,current.workspace.cwd);
 const roots=[current.workspace.cwd,...current.workspace.additionalDirectories].map(root=>canonicalPath(root,current.workspace.cwd));
 if(!path.isAbsolute(evidence.exportPath||'')||!manifest||!exportPath||!roots.some(root=>root&&inside(exportPath,root)))throw Error('Choose an export inside this schedule’s configured working folders.');
 const manifestBytes=bytes(manifest),exportBytes=bytes(exportPath);
 if(sha(manifestBytes)!==evidence.manifestSha256||sha(exportBytes)!==evidence.exportSha256)throw Error('Source/export changed. Regenerate and preview current evidence.');
 const document=JSON.parse(exportBytes),rows=Array.isArray(document)?document:[document],matches=rows.filter(row=>row.id===current.id);
 if(matches.length!==1)throw Error('Export must contain exactly one matching schedule.');
 const exported=matches[0];validateSchedule(exported);
 if(exported.source?.system!==current.source.system||exported.source?.manifest!==current.source.manifest)throw Error('Source ownership mismatch.');
 const next={...current,...exported,source:{...current.source,...exported.source},enabled:current.enabled};
 for(const key of ['file','revision','nextRuns','error'])delete next[key];
 if(next.executionPermissions?.folders)next.executionPermissions={...next.executionPermissions,folders:next.executionPermissions.folders.map(folder=>({...folder,path:canonicalPath(folder.path,next.workspace.cwd)}))};
 validateSchedule(next);
 const source={manifestSha256:evidence.manifestSha256,exportSha256:evidence.exportSha256,exportPath,manifest};
 return {next,source,planDigest:sha(JSON.stringify({revision:revision(current),next,source})),resultRevision:revision(next)};
}
