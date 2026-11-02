import {createHash} from 'node:crypto';

// Only structured provider questions enter this queue. Message prose is never
// interpreted as a question or a grant, and answers keep the existing session.
export function captureUserQuestions(run, data, eventIndex, now) {
  if(!data?.providerItemId || !Array.isArray(data.userQuestions))return;
  run.userQuestions??=[];
  data.userQuestions.forEach((value,index)=>{
    if(typeof value?.title!=='string'||!value.title.trim())return;
    const id=createHash('sha256').update(JSON.stringify([run.schedule.provider,run.providerSessionId,data.providerItemId,index])).digest('hex');
    if(run.userQuestions.some(question=>question.id===id))return;
    run.userQuestions.push({id,text:value.title,...(Array.isArray(value.options)?{options:value.options.slice(0,32).map(option=>typeof option==='string'?{label:option}:{label:String(option?.label||'').slice(0,2000),description:String(option?.description||'').slice(0,4000)})}:{}),choices:Array.isArray(value.options)?value.options.map(option=>typeof option==='string'?option:option?.label).filter(option=>typeof option==='string'&&option.trim()):[],status:'pending',askedAt:now,eventIndex,provider:run.schedule.provider,sessionId:run.providerSessionId||null,providerItemId:data.providerItemId});
  });
}

export async function answerUserQuestion(engine,id,questionId,answer,messageId,action='answer',dispatch=null,inputOrigin=null) {
  const run=engine.getRun(id),question=run.userQuestions?.find(item=>item.id===questionId);
  if(!question)throw Error('This question is no longer available. Refresh the chat.');
  if(action==='dismiss'){
    if(question.status!=='pending')throw Error('This question already has a response.');
    question.status='dismissed';question.dismissedAt=engine.now();engine.persist(run);return run;
  }
  if(action!=='answer'||typeof answer!=='string'||!answer.trim()||answer.length>100000)throw Error('Enter an answer or select a choice.');
  if(typeof messageId!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(messageId))throw Error('A stable answer identifier is required.');
  if(question.messageId){
    if(question.messageId!==messageId||question.answer!==answer||question.attachmentSignature!==dispatch?.signature)throw Error('This question already has a response. Refresh the chat.');
    if(question.status==='uncertain'||question.status==='sending')throw Error('Answer delivery is unconfirmed. Inspect this session before sending another answer.');
    return run;
  }
  if(question.status!=='pending')throw Error('This question is no longer waiting for an answer.');
  if(question.provider!==run.schedule.provider||question.sessionId!==(run.providerSessionId||null))throw Error('The provider session changed. This question belongs to the earlier session.');
  if(run.pending&&!question.nativeRequest)throw Error('Answer the current input or approval request before sending this answer.');
  const native=question.nativeRequest?engine.backgroundQuestions.get(id+':'+question.id):null;
  if(question.nativeRequest&&!native)throw Error('The provider has already resolved this input request.');
  if(run.events.some(event=>event.data?.delivery?.id===messageId))throw Error('This answer identifier is already in use. Refresh the chat.');
  engine.updateGuard?.();
  const files=dispatch?engine.verifyAttachmentDispatch(run,dispatch):[];
  // Claim before awaiting transport. Restart or ambiguous delivery must never
  // replay a response or turn a repeated button click into a second user turn.
  if(inputOrigin)run.turnOrigin=inputOrigin;
  Object.assign(question,{answer,messageId,status:'sending',answeredAt:engine.now(),...(dispatch?{attachmentSignature:dispatch.signature}:{})});engine.persist(run);
  try{
    if(native){
      if(dispatch){run.questionAttachmentReplies??={};run.questionAttachmentReplies[question.id]={...dispatch,providerId:run.schedule.provider};}
      question.status='answered';question.deliveryState='native-input';engine.event(run,'user',answer,{questionReply:{requestId:question.id},delivery:{id:messageId,state:'delivered'},...(dispatch?{attachments:files}:{})});
      native.resolve(dispatch?answer+`\nThe user attached ${files.length} file(s). Call proteus_question_attachments with requestId ${question.id} to view them before continuing.`:answer);return run;
    }
    const provider=engine.providers[run.schedule.provider],canSteer=provider?.steer&&files.every(file=>provider.acceptedSteeringMediaTypes?.includes(file.mediaType));
    const mode=run.status==='running'&&engine.running.has(id)&&canSteer?'steer':'queue';
    await engine.send(id,`Answer to your question: ${question.text}\n\n${answer}`,mode,messageId,undefined,dispatch,undefined,inputOrigin);
    const event=run.events.find(item=>item.data?.delivery?.id===messageId),state=event?.data.delivery.state;
    if(!['queued','delivered','steered'].includes(state))throw Error('The provider did not confirm answer delivery.');
    event.data.questionReply={requestId:question.id};question.status='answered';question.deliveryState=state;engine.persist(run);return run;
  }catch(error){question.status='uncertain';question.deliveryError=error.message;engine.persist(run);throw error;}
}

export function recoverUserQuestions(run){
  for(const question of run.userQuestions||[]) {
    if(question.nativeRequest&&question.status==='pending')question.status='interrupted';
    if(question.status==='sending'){question.status='uncertain';question.deliveryError='Proteus stopped before confirming this answer. Inspect the provider session before sending again.';}
  }
}

export function askBackgroundQuestion(engine,run,request,signal,id){
  if(signal.aborted)return Promise.reject(Error('Question request ended'));
  const question={id,text:request.question,choices:request.choices||[],status:'pending',askedAt:engine.now(),eventIndex:run.events.length,provider:run.schedule.provider,sessionId:run.providerSessionId||null,nativeRequest:true,autoResolutionMs:request.autoResolutionMs??null};
  return new Promise((resolve,reject)=>{
    const key=run.id+':'+id,cleanup=()=>{engine.backgroundQuestions.delete(key);signal.removeEventListener('abort',abort);};
    const abort=()=>{cleanup();if(question.status==='pending')question.status=signal.reason?.code==='provider-resolved'?'resolved':'cancelled';engine.persist(run);reject(Error('Question request ended'));};
    engine.backgroundQuestions.set(key,{resolve:answer=>{cleanup();resolve(answer);}});signal.addEventListener('abort',abort,{once:true});
    (run.userQuestions??=[]).push(question);engine.event(run,'system',request.question,{question});
  });
}


// Queue visibility is review metadata, never an answer, cancellation or approval.
export function clearQuestionFromQueue(engine,id,questionId){
 if(typeof questionId!=='string'||!questionId||questionId.length>256)throw Error('Choose a question.');
 const run=engine.getRun(id);
 const question=run.userQuestions?.find(q=>q.id===questionId)
   || (run.pending?.type==='question'&&run.pending.id===questionId?{id:questionId,status:'pending'}:null)
   || run.events.find(event=>event.data?.question?.id===questionId)?.data?.question;
 if(!question||question.status!=='pending')throw Error('This question is no longer waiting for an answer.');
 if(Object.hasOwn(run.questionQueueCleared||{},questionId))return run;
 run.questionQueueCleared={...run.questionQueueCleared,[questionId]:engine.now()};engine.persist(run);return run;
}
