const deletionIntents = new Map();
const startIntents = new Map();

export async function requestScheduleStart(schedule,hostId,request){
 const key=JSON.stringify([hostId,schedule.id,schedule.revision]);
 const operationId=startIntents.get(key)||crypto.randomUUID();
 startIntents.set(key,operationId);
 const result=await request({id:schedule.id,expectedRevision:schedule.revision,operationId});
 if(!result?.id&&!result?.runId)throw new Error('The owner returned no run ID. Check recent runs before trying again.');
 startIntents.delete(key);
 return result;
}

export async function confirmScheduleDeletion(schedule,hostId,hostName,request){
 if(!window.confirm(`Delete “${schedule.name}” from ${hostName}? This permanently removes the schedule and its future triggers. Existing runs and chats remain. If there is active or queued work, deletion is blocked.`))return false;
 const key=JSON.stringify([hostId,schedule.id,schedule.revision]);
 const operationId=deletionIntents.get(key)||crypto.randomUUID();
 deletionIntents.set(key,operationId);
 const result=await request({id:schedule.id,expectedRevision:schedule.revision,operationId});
 if(result?.deleted!==true)throw new Error('The owner did not confirm deletion. Refresh the schedule before continuing.');
 deletionIntents.delete(key);
 return true;
}
