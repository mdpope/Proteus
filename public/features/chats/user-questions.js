const drafts=new Map(),attempts=new Map();
export function chatQuestions(run){
  const questions=[...(run.userQuestions||[])];
  if(run.pending?.type==='question')questions.push({id:run.pending.id,text:run.pending.question,choices:run.pending.choices||[],status:'pending',blocking:true,eventIndex:(run.eventStart||0)+run.events.findIndex(event=>event.data?.question?.id===run.pending.id)});
  return questions;
}
const button=(label,action)=>{const node=document.createElement('button');node.type='button';node.textContent=label;node.onclick=action;return node;};
export function mountQuestionCard(host,question,{key,answer,notify=()=>{}}){
  const signature=JSON.stringify(question);host.questionActions={answer,notify};
  if(host.questionSignature===signature)return;
  host.questionSignature=signature;host.replaceChildren();host.className='user-question-card';host.dataset.questionId=question.id;
  const heading=document.createElement('h4');heading.textContent=question.text;host.append(heading);
  if(question.status!=='pending'){
    const status=document.createElement('p');status.textContent=question.status==='uncertain'?'Answer delivery unconfirmed. Inspect this session before sending another answer.':question.status==='sending'?'Sending answer…':question.status==='dismissed'?'Question dismissed.':'Answered'+(question.deliveryState==='queued'?' · queued for the next turn':'');host.append(status);return;
  }
  const form=document.createElement('form'),label=document.createElement('label'),input=document.createElement('textarea'),choices=document.createElement('div'),submit=document.createElement('button');
  label.textContent='Your answer';input.rows=2;input.value=drafts.get(key)||'';input.setAttribute('aria-label','Your answer');label.append(input);choices.className='user-question-choices';
  let messageId,submittedAnswer,busy=false;
  const send=async value=>{
    if(busy||!value.trim())return;busy=true;submit.disabled=true;
    // Retain the operation on transport uncertainty, including a retry after a
    // render. The owner rejects changed content or a second answer claim.
    const attempt=attempts.get(key);
    if(attempt&&attempt.answer!==value){host.questionActions.notify('Refresh the chat to inspect the previous answer before changing it.');busy=false;submit.disabled=false;return;}
    messageId=attempt?.messageId||crypto.randomUUID();submittedAnswer=value;attempts.set(key,{messageId,answer:submittedAnswer});
    try{await host.questionActions.answer(question,value,messageId);drafts.delete(key);attempts.delete(key);}catch(error){host.questionActions.notify(error.message);}finally{busy=false;submit.disabled=false;}
  };
  for(const choice of question.choices||[])choices.append(button(choice,()=>{input.value=choice;drafts.set(key,choice);void send(choice);}));
  input.oninput=()=>drafts.set(key,input.value);submit.type='submit';submit.textContent='Send answer';form.onsubmit=event=>{event.preventDefault();void send(input.value);};form.append(choices,label,submit);host.append(form);
}
export function mountQuestionQueue(host,run,{jump,answer,notify}){
  const questions=chatQuestions(run).filter(question=>['pending','sending','uncertain'].includes(question.status));
  const signature=JSON.stringify(questions);host.questionActions={jump,answer,notify};
  if(host.questionSignature===signature)return;
  const open=host.querySelector('details')?.open;host.questionSignature=signature;host.replaceChildren();host.hidden=!questions.length;
  if(!questions.length)return;
  const details=document.createElement('details'),summary=document.createElement('summary');details.open=!!open;summary.textContent=`Questions to answer (${questions.length})`;details.append(summary);
  for(const question of questions)details.append(button(question.text,()=>void host.questionActions.jump(question)));
  host.className='user-question-queue';host.append(details);
}
