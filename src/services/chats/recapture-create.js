import {createHash} from 'node:crypto';
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const digest=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
export async function recaptureCreate(service,peer,args){
 const payload=args.originalPayload;
 if(!/^[a-f0-9-]{36}$/i.test(args.originalTaskId||'')||!payload||payload.purpose||payload.attachments||payload.setupId)throw Error('Recapture is limited to an ordinary unsent create.');
 const local=peer.device.id==='local-chat-control',key=local?'agent:'+args.originalTaskId:peer.device.id+':'+args.originalTaskId;
 const prior=await service.remote.commandJournal.lookup(key);
 const originalDigest=local?args.originalDigest:digest(['chat.start',payload]);
 if(!prior||prior.digest!==originalDigest||prior.pending||prior.result||!/^Instructions changed\. Refresh context before starting: /.test(prior.error||''))throw Error('Owner has no settled pre-create source rejection. Do not recapture an uncertain delivery.');
 const claimKey='source-recapture:'+key,claimDigest=digest({originalDigest,payload});
 const settled=await service.remote.commandJournal.lookup(claimKey);
 if(settled){if(settled.digest!==claimDigest||settled.pending||!settled.result)throw Error('Prior recapture is uncertain. Inspect its owner receipt.');return settled.result;}
 const project=service.workspaceProjects.projectFor(payload),workspaceId=project?.workspaceId||payload.workspaceId||service.context.get().workspaceId;
 await service.context.refreshAsync({workspaceId});
 const schedule=await service.buildChatSchedule({...payload,...(workspaceId?{workspaceId}:{})});
 const currentProject=service.workspaceProjects.projectFor(payload);
 if(currentProject?.id!==project?.id||currentProject?.workspaceId!==project?.workspaceId)throw Error('Project changed during recapture. Review its current scope.');
 if(local)service.chatControl.assertCaller();else service.remote.requireCommandGrants(peer,'chat.recapture',args);
 // One durable logical-create claim also protects callers using different retry
 // operation IDs. A crash after this point remains uncertain, never auto-replayed.
 const {previous}=await service.remote.commandJournal.claim(claimKey,claimDigest,new Date().toISOString());
 if(previous){if(previous.pending||!previous.result)throw Error('Recapture is already in progress or uncertain.');return previous.result;}
 const run=service.engine.createRun(schedule,'chat');if(project)service.workspaceProjects.associate(run,project,service.engine);
 const result={runId:run.id,recaptured:true,originalTaskId:args.originalTaskId,sourceHashes:(schedule.context?.entries||[]).map(entry=>({id:entry.id,hash:entry.hash,kind:entry.kind}))};
 await service.remote.commandJournal.complete(claimKey,claimDigest,{result});return result;
}
