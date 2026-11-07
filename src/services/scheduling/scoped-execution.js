import path from 'node:path';
import {createHash} from 'node:crypto';
import {canonicalPath} from '../settings/permissions.js';
const within=(file,root)=>{const rel=path.relative(root,file);return rel===''||(!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel));};

export function validateScopedExecution(schedule){
 const p=schedule.executionPermissions;
 if(p?.sandboxedCommands===undefined)return;
 if(typeof p.sandboxedCommands!=='boolean')throw Error('sandboxedCommands must be a boolean.');
 if(!p.sandboxedCommands)return;
 if(schedule.provider!=='codex'||p.mode!=='custom'||!p.folders?.length)throw Error('Scoped commands require Codex, custom mode and explicit folder grants.');
 for(const folder of p.folders)if(!path.isAbsolute(folder.path||'')||path.parse(folder.path).root===folder.path||!['read','read-write'].includes(folder.access))throw Error('Scoped commands require narrow absolute folder grants.');
 if(!p.folders.some(folder=>within(schedule.workspace.cwd,folder.path)))throw Error('Scoped command folders must include the working directory.');
}

// This is native sandbox autonomy, never an owner rule approving an interpreter.
// Network stays disabled; research uses separately authorized connector tools.
export function scopedExecutionSandbox(schedule){
 if(!schedule.executionPermissions?.sandboxedCommands)return null;
 validateScopedExecution(schedule);
 const cwd=canonicalPath(schedule.workspace.cwd,schedule.workspace.cwd),folders=schedule.executionPermissions.folders;
 const filesystem={':root':'deny',':minimal':'read',':tmpdir':'deny',':slash_tmp':'deny',':workspace_roots':{'.':'read','.git':'read','.agents':'read','.codex':'read','.aws':'read'}};
 // Node on macOS loads the OS OpenSSL configuration before running a command.
 // This public runtime directory contains no user credential state.
 if(process.platform==='darwin')filesystem['/System/Library/OpenSSL']='read';
 for(const folder of folders){if(canonicalPath(folder.path,cwd)!==folder.path)throw Error('Scoped folder identity changed; review and save current grants.');filesystem[folder.path]=folder.access==='read-write'?'write':'read';}
 const roots=[...new Set([cwd,...folders.map(folder=>folder.path)])].sort();
 const name='proteus-scoped-'+createHash('sha256').update(JSON.stringify({filesystem,roots})).digest('hex').slice(0,16);
 return {cwd,sandbox:'workspace-write',runtimeWorkspaceRoots:roots,managedProfile:name,scopedCommands:true,approvalPolicy:'on-request',policy:{networkAccess:false},config:{default_permissions:name,permissions:{[name]:{filesystem,network:{enabled:false}}}}};
}
