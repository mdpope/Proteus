const continuation='Continue this conversation from where the interrupted turn left off. Preserve completed work and do not repeat completed external actions. Finish the current work before processing queued follow-up messages.';
// Only a known, permanent legacy rejection permits the manual-send equivalent.
// Timeouts and uncertain deliveries never fall through to a second operation.
export async function recoverRemoteChat({run,action,expectedFailureEventAt,request,mutate}){
 try{return await mutate('chat.recover',{id:run.id,action,expectedFailureEventAt});}
 catch(error){
  if(action!=='continue'||!['scheduled','schedule','manual'].includes(run.trigger)||!/Open an ordinary chat before continuing\./.test(error.message))throw error;
  const fresh=await request('chat.get',{id:run.id,watch:'summary'}),messageId='continue_'+run.id+'_'+String(expectedFailureEventAt).replace(/[^0-9]/g,'');
  if(fresh.events?.some(event=>event.data?.delivery?.id===messageId))return {runId:run.id};
  if(!['failed','interrupted'].includes(fresh.status)||fresh.archivedAt||fresh.pending||fresh.failureEventAt!==expectedFailureEventAt||fresh.providerSessionId!==run.providerSessionId||fresh.schedule?.provider!==run.schedule?.provider)throw Error('This remote chat changed. Refresh before continuing.');
  return mutate('chat.send',{id:run.id,prompt:continuation,mode:'queue',messageId});
 }
}
