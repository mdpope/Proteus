export function browserReminderReplica({binding,request}){
 const worker=new Worker(new URL('./reminder-replica-worker.js',import.meta.url),{type:'module'}),waiting=new Map();let sequence=0,pending,last=0,epoch=0;
 worker.onmessage=({data})=>{const next=waiting.get(data.id);if(!next)return;waiting.delete(data.id);data.error?next.reject(Object.assign(Error(data.error),{status:data.status})):next.resolve(data.value);};
 worker.onerror=()=>{for(const next of waiting.values())next.reject(Error('SQLite reminder cache could not start.'));waiting.clear();};
 const call=(action,args={})=>new Promise((resolve,reject)=>{const id=++sequence;waiting.set(id,{resolve,reject});worker.postMessage({id,binding,action,...args});});
 async function sync(){if(pending)return pending;if(Date.now()-last<3000)return;const started=epoch;pending=(async()=>{let cursor=(await call('meta'))?.cursor||0;for(;;){const page=await request({since:cursor});await call('apply',{page});if(!page.hasMore)break;if(page.cursor<=cursor)throw Error('Reminder synchronization made no progress.');cursor=page.cursor;}if(started===epoch)last=Date.now();})();try{await pending;}finally{pending=null;}}
 return {invalidate(){last=0;epoch++;},async read(query){if(query.since!==undefined)return request(query);let offline=false;try{await sync();}catch(error){if(!(error instanceof TypeError)&&!(error.status>=500))throw error;offline=true;}const value=await call('read',{query});return {...value,cached:offline,readOnly:offline||value.readOnly};},async clear(){await call('clear');worker.terminate();}};
}
