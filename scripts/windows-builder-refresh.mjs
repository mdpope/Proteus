// Repair an expired provider-managed Node reference without redesignating the
// builder, accepting an arbitrary executable, or changing its source/key/npm.
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {parseArgs} from 'node:util';import {pathToFileURL} from 'node:url';
import packages from '../desktop/updates/update-package.cjs';import builder from '../desktop/updates/windows-builder.cjs';import {ensurePrivateHome,hasPrivatePermissions} from '../src/shared/private-paths.cjs';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function refreshPlan(policy,observation){
 const {root,home,installation,priorBytes,expectedPolicyHash,node,nodeVersion,nodeSha256,publisher,oldNodeExists,build}=observation;
 if(packages.digest(priorBytes)!==expectedPolicyHash)throw Error('The builder policy changed. Inspect it again.');
 const same=(a,b)=>path.win32.normalize(a).toLowerCase()===path.win32.normalize(b).toLowerCase();
 if(!same(policy.root,root)||!same(policy.home,home)||!same(policy.installation,installation)||policy.repository!==builder.repository)throw Error('The policy belongs to another installation.');
 if(oldNodeExists)throw Error('The configured Node still exists; this operation only repairs a missing provider runtime.');
 const family=value=>{const match=/^(.*\\cua_node)\\[a-f0-9]{16,64}\\bin\\node\.exe$/i.exec(value);if(!match)throw Error('Use the same existing provider-managed Node family.');return match[1];};
 if(!same(family(policy.node),family(node)))throw Error('The replacement belongs to another provider runtime family.');
 const version=/^v?(\d+)\.(\d+)\./.exec(nodeVersion||'');if(!version||Number(version[1])<22||Number(version[1])===22&&Number(version[2])<16)throw Error('The existing Node is too old for this source.');
 if(!/(?:^|,\s*)(?:CN|O)="?OpenAI OpCo, LLC"?(?:,|$)/i.test(publisher||'')||!/^[a-f0-9]{64}$/.test(nodeSha256||''))throw Error('Verify the existing provider executable publisher and hash.');
 if(build&&(build.running||!['cancelled','complete'].includes(build.phase)))throw Error('Finish or reconcile the current owner build before refreshing tools.');
 const next={...policy,node},nextBytes=Buffer.from(JSON.stringify(next,null,2)+'\n');
 const plan={schemaVersion:1,action:'refresh-provider-node',root,home,installation,priorPolicyHash:expectedPolicyHash,nextPolicyHash:packages.digest(nextBytes),oldNode:policy.node,node,nodeVersion,nodeSha256,publisher,changedFields:['node'],build:build?{operationId:build.operationId,phase:build.phase,requestHash:build.requestHash}:null};
 return {plan,planDigest:packages.digest(JSON.stringify(plan)),next,nextBytes};
}
export function runRefresh(argv){
 if(process.platform!=='win32')throw Error('Inspect and refresh the designated builder on Windows.');
 const {values}=parseArgs({args:argv,options:{home:{type:'string'},installation:{type:'string'},'expected-policy-sha256':{type:'string'},apply:{type:'string'},'operation-id':{type:'string'}}});
 if(!/^[a-f0-9]{64}$/.test(values['expected-policy-sha256']||''))throw Error('Supply the independently observed policy SHA-256.');
 const home=fs.realpathSync(values.home),installation=fs.realpathSync(values.installation),root=path.join(path.dirname(home),'Proteus Updates',packages.digest(home+'\0'+installation).slice(0,24)),file=path.join(root,'windows-builder.json');
 const policy=builder.readPolicy(root),priorBytes=fs.readFileSync(file),node=fs.realpathSync(process.execPath),receipt=values['operation-id']&&path.join(root,'builder-toolchain',values['operation-id']+'.json');
 if(values['operation-id']&&!uuid.test(values['operation-id']))throw Error('Use a stable UUID operation ID.');
 if(receipt&&fs.existsSync(receipt)){
  const old=JSON.parse(fs.readFileSync(receipt));if(old.phase==='complete'&&old.priorPolicyHash===values['expected-policy-sha256']&&old.node===node&&(!values.apply||old.planDigest===values.apply)&&packages.fileDigest(file)===old.nextPolicyHash)return {reconciled:true,phase:old.phase,operationId:old.operationId,planDigest:old.planDigest,priorPolicyHash:old.priorPolicyHash,nextPolicyHash:old.nextPolicyHash,node,receipt};
  throw Error('This refresh has an earlier receipt. Inspect its intent and current policy before any further write.');
 }
 for(const key of ['source','npmCli','git','publisherKey'])if(!fs.statSync(policy[key])[key==='source'?'isDirectory':'isFile']())throw Error('Existing prerequisite is unavailable: '+key);
 if(!hasPrivatePermissions(policy.publisherKey))throw Error('The existing publisher key protection needs inspection.');
 if(execFileSync(policy.git,['-C',policy.source,'remote','get-url','origin'],{encoding:'utf8',windowsHide:true}).trim()!==builder.repository)throw Error('Preserve the authorized repository and account route.');
 const ps=path.join(process.env.SystemRoot,'System32','WindowsPowerShell','v1.0','powershell.exe');
 const publisher=execFileSync(ps,['-NoProfile','-NonInteractive','-Command',"$s=Get-AuthenticodeSignature -LiteralPath $env:PROTEUS_BUILDER_NODE_CHECK_PATH; if($s.Status -ne 'Valid'){throw 'Existing runtime signature is not valid'}; $s.SignerCertificate.Subject"],{env:{...process.env,PROTEUS_BUILDER_NODE_CHECK_PATH:node},encoding:'utf8',windowsHide:true}).trim();
 const observation={root,home,installation,priorBytes,expectedPolicyHash:values['expected-policy-sha256'],node,nodeVersion:process.version,nodeSha256:packages.fileDigest(node),publisher,oldNodeExists:fs.existsSync(policy.node),build:builder.buildStatus(root).job};
 const selected=refreshPlan(policy,observation);execFileSync(node,[policy.npmCli,'--version'],{encoding:'utf8',windowsHide:true});
 if(!values.apply)return {dryRun:true,...selected.plan,planDigest:selected.planDigest};
 if(values.apply!==selected.planDigest||!receipt)throw Error('Apply requires the unchanged planDigest and a stable operation ID.');
 ensurePrivateHome(path.dirname(receipt));const lock=path.join(root,'builder-toolchain.lock'),fd=fs.openSync(lock,'wx',0o600);
 try{
  if(packages.fileDigest(file)!==selected.plan.priorPolicyHash||packages.fileDigest(node)!==selected.plan.nodeSha256)throw Error('Policy or executable changed before refresh.');
  const current=builder.buildStatus(root).job;if(JSON.stringify(current?{operationId:current.operationId,phase:current.phase,requestHash:current.requestHash}:null)!==JSON.stringify(selected.plan.build)||current?.running)throw Error('The owner build changed before refresh.');
  const intent={...selected.plan,planDigest:selected.planDigest,operationId:values['operation-id'],phase:'intent',priorPolicyBase64:priorBytes.toString('base64'),at:new Date().toISOString()};packages.atomic(receipt,intent);
  packages.atomic(file,selected.next);if(packages.fileDigest(file)!==selected.plan.nextPolicyHash)throw Error('The refreshed policy did not verify. Preserve its receipt.');
  const complete={...intent,phase:'complete',completedAt:new Date().toISOString()};packages.atomic(receipt,complete);return {updated:true,operationId:complete.operationId,planDigest:complete.planDigest,priorPolicyHash:complete.priorPolicyHash,nextPolicyHash:complete.nextPolicyHash,node,receipt};
 }finally{fs.closeSync(fd);fs.unlinkSync(lock);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){try{console.log(JSON.stringify(runRefresh(process.argv.slice(2)),null,2));}catch(error){console.error(error.message);process.exitCode=1;}}
