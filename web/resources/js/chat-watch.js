// One visible chat owns one transport watch. Serialize subscription and release so
// leaving during a slow chat.get cannot clear first and subscribe afterward.
export function createVisibleChatWatch({request,updated,failed}) {
    let lease=null, queue=Promise.resolve();
    const enqueue=work=>{const result=queue.then(work);queue=result.catch(()=>{});return result;};
    const matches=(current,id)=>lease?.current===current&&lease.client===current.client&&lease.id===id;
    const release=old=>enqueue(async()=>{
        if(old?.token&&old.current.client===old.client&&old.client.status==='online')await request(old.current,'chat.watch',{id:old.id,watch:'none',watchToken:old.token});
    });
    function clear(){const old=lease;lease=null;if(old)void release(old).catch(failed);}
    function read(current,id,{visible=true}={}){
        if(!visible){clear();return request(current,'chat.get',{id,watch:'none'});}
        if(!matches(current,id)){
            const old=lease;
            lease={current,client:current.client,id,token:current.state?.capabilities?.includes('chat.watch.v1')?crypto.randomUUID():null};
            if(old)void release(old).catch(failed);
        }
        const captured=lease;
        return enqueue(async()=>{
            if(lease!==captured||current.client!==captured.client)throw Object.assign(new Error('The visible chat changed.'),{cancelled:true});
            const result=await request(current,'chat.get',{id,watch:'delta',fieldDelta:'v1',...(captured.token?{watchToken:captured.token}:{})});
            if(lease!==captured||current.client!==captured.client)throw Object.assign(new Error('The visible chat changed.'),{cancelled:true});
            return result;
        });
    }
    function ensure(current,id){
        if(matches(current,id))return;
        const work=read(current,id),captured=lease;
        void work.then(result=>{if(lease===captured&&current.client===captured.client)updated(current,id,result);}).catch(error=>{if(lease===captured){clear();if(!error.cancelled)failed(error);}});
    }
    return {read,ensure,clear};
}
