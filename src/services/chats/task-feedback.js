import {taskFeedbackDelivery} from './task-feedback-kind.js';
const inFlight=new WeakMap();
const acceptsFeedback=run=>['running','queued','awaiting_input','completed'].includes(run.status)&&!run.archivedAt;

// Feedback is task data, never authority. A live-capable provider may receive it
// now; waiting/unsupported providers retain the existing queue boundary. An
// ambiguous steering acknowledgement must not become a second queued message.
export async function sendTaskFeedback(engine,parent,text,delivery){
  let jobs=inFlight.get(engine);if(!jobs){jobs=new Map();inFlight.set(engine,jobs);}
  if(jobs.has(delivery.id))return jobs.get(delivery.id);
  const operation=Promise.resolve().then(async()=>{
    if(!acceptsFeedback(parent))return;
    const receipt=()=>parent.events.find(event=>event.data?.delivery?.id===delivery.id)?.data.delivery;
    const prior=receipt();
    if(['sending','failed'].includes(prior?.state))throw Error('Task feedback delivery is unconfirmed. Inspect the originating session before retrying.');
    const steer=parent.status==='running'&&engine.running.has(parent.id)&&typeof engine.providers[parent.schedule.provider]?.steer==='function';
    let mode=steer?'steer':'queue';
    try{await engine.send(parent.id,text,mode,delivery.id,undefined,undefined,taskFeedbackDelivery);}
    catch(error){
      if(mode!=='steer'||receipt()||!acceptsFeedback(parent))throw error;
      // A turn can end before send's synchronous preflight. Queue only if no
      // user delivery was recorded and the human has not stopped the parent.
      mode='queue';await engine.send(parent.id,text,mode,delivery.id,undefined,undefined,taskFeedbackDelivery);
    }
    const result=receipt();if(['sending','failed'].includes(result?.state))throw Error('Task feedback delivery is unconfirmed. Inspect the originating session before retrying.');
    delivery.mode=result?.state==='steered'?'steer':mode;
  });
  jobs.set(delivery.id,operation);
  try{return await operation;}finally{if(jobs.get(delivery.id)===operation)jobs.delete(delivery.id);}
}
