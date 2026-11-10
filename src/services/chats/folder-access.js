import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const requests=new WeakMap();
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

// The current owner and requesting chat are captured by the tool, never supplied
// by the model. Approval always needs a human; generic saved tool rules cannot
// expand folder authority. Existing provider sandboxes refresh on the next turn.
export function folderAccessTools(engine,runId){
 if(!engine||!runId)return [];
 const turn=engine.running.get(runId);
 return [{name:'proteus_folder_access',defer:'never',description:'Request an exact existing folder on this chat owner with read or read-write access. A human must approve on desktop, web or mobile; the owner then saves the grant for this chat only. Does not select instructions, grant shell/network permissions, or widen the active provider sandbox. Some providers need the next explicit turn to apply access. Use a stable UUID operationId; status reconciles a prior request without another prompt. Cannot modify other chats, delegated scopes or scheduled tasks.',parameters:{type:'object',properties:{action:{type:'string',enum:['request','status']},operationId:{type:'string'},folder:{type:'string'},access:{type:'string',enum:['read','read-write']},reason:{type:'string',maxLength:1000}},required:['action','operationId'],additionalProperties:false},handler:async args=>{
  if(!turn||engine.running.get(runId)!==turn||turn.controller.signal.aborted)throw Error('This folder tool no longer belongs to an active turn.');
  return JSON.stringify(await requestFolderAccess(engine,runId,args,turn));
 }}];
}
export async function requestFolderAccess(engine,runId,args,turn=engine.running.get(runId)){
 if(!args||Object.keys(args).some(key=>!['action','operationId','folder','access','reason'].includes(key)))throw Error('Use only the requesting chat folder-access fields.');
 if(!uuid.test(args.operationId||'')||!['request','status'].includes(args.action))throw Error('Use request or status with a stable UUID operationId.');
 const run=engine.getRun(runId);
 if(!turn||engine.running.get(runId)!==turn||turn.controller.signal.aborted||run.delegation||run.trigger!=='chat')throw Error('Folder access requires the requesting active, nondelegated user chat.');
 const receipts=run.folderAccessRequests||{},existing=receipts[args.operationId];
 let pending=requests.get(engine);if(!pending){pending=new Map();requests.set(engine,pending);}const key=runId+':'+args.operationId;
 if(args.action==='status')return existing?{...existing,operationId:args.operationId,...(existing.status==='pending'&&!pending.has(key)?{status:'interrupted',granted:false}:{} )}:{operationId:args.operationId,status:'not-found',granted:false};
 if(typeof args.folder!=='string'||!path.isAbsolute(args.folder)||/[\x00-\x1f\x7f]/.test(args.folder)||!['read','read-write'].includes(args.access)||typeof args.reason!=='string'||!args.reason.trim()||args.reason.length>1000||/[\x00-\x1f\x7f]/.test(args.reason))throw Error('Choose an existing absolute folder, read or read-write access, and a short reason.');
 const folder=fs.realpathSync(args.folder),stat=fs.statSync(folder);if(!stat.isDirectory())throw Error('Choose an existing folder on this computer.');
 const identity=stat.dev+':'+stat.ino,signature=createHash('sha256').update(JSON.stringify([args.folder,folder,identity,args.access,args.reason])).digest('hex');
 if(existing){if(existing.signature!==signature)throw Error('This operationId already belongs to a different folder request.');if(pending.has(key))return pending.get(key);return {operationId:args.operationId,...existing,...(existing.status==='pending'?{status:'interrupted',granted:false}:{} )};}
 if(Object.keys(receipts).length>=100)throw Error('This chat has reached its retained folder-request limit. Review existing requests before adding more.');
 const context=engine.describePermissions(run),chatRevision=run.chatPermissionRevision||null;
 const receipt={signature,status:'pending',folder,access:args.access,granted:false,requestedAt:engine.now()};run.folderAccessRequests={...receipts,[args.operationId]:receipt};engine.persist(run);
 const work=(async()=>{
  const question=`Add ${args.access==='read'?'read-only':'read and write'} access to ${folder} for this chat? ${args.reason} This does not change workspace defaults or grant command/network permission. Provider sandbox access may require the next explicit turn.`;
  let answer;try{answer=await engine.ask(run,{type:'permission',question,details:{kind:'folder-access',toolName:'proteus_folder_access',resolvedPath:folder,managedApprovalRequired:true,intention:question,args:{action:'request',folder,access:args.access,operationId:args.operationId}}},turn.controller.signal);}catch(error){receipt.status='interrupted';engine.persist(run);throw error;}
  if(answer!=='approve'){receipt.status='denied';engine.persist(run);return {operationId:args.operationId,...receipt};}
  const current=fs.realpathSync(args.folder),after=fs.statSync(current);
  if(engine.running.get(runId)!==turn||turn.controller.signal.aborted||current!==folder||after.dev+':'+after.ino!==identity)throw Error('The requesting turn or folder changed during approval. No folder grant was saved.');
  engine.setChatFolder(runId,folder,args.access,false,context.id,chatRevision,true,()=>{receipt.status='granted';receipt.granted=true;receipt.grantedAt=engine.now();receipt.activation='next-provider-turn';});
  return {operationId:args.operationId,...receipt};
 })();pending.set(key,work);try{return await work;}finally{pending.delete(key);}
}
