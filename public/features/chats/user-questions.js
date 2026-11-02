import {mountQuestionAttachments} from './question-attachments.js';
const drafts=new Map(),attempts=new Map(),queueStates=new Map();
// The transcript retains the original prose. Omit only a card heading that is
// already present there; choices and answer controls still belong to this card.
export function questionPromptVisible(question,text,questionCount=1){const normalize=value=>String(value||'').replace(/\s+/g,' ').trim();const prompt=normalize(question.text);return questionCount===1&&!!prompt&&normalize(text).includes(prompt);}
export function bindQuestionReturn(input,submit){
  if(!input)return;
  input.addEventListener('keydown',event=>{if(event.key!=='Enter'||event.shiftKey||event.altKey||event.ctrlKey||event.metaKey||event.isComposing||event.keyCode===229)return;event.preventDefault();if(!event.repeat)submit();});
}
export function chatQuestions(run){
  const questions=[...(run.userQuestions||[])];
  if(run.pending?.type==='question')questions.push({id:run.pending.id,text:run.pending.question,choices:run.pending.choices||[],status:'pending',blocking:true,eventIndex:(run.eventStart||0)+run.events.findIndex(event=>event.data?.question?.id===run.pending.id)});
  return questions;
}
const button=(label,action)=>{const node=document.createElement('button');node.type='button';node.textContent=label;node.onclick=action;return node;};
export function mountQuestionCard(host,question,{key,answer,attachments,showHeading=true,notify=()=>{}}){
  const signature=JSON.stringify([question,showHeading]);host.questionActions={answer,notify};
  if(host.questionSignature===signature)return;
  host.questionSignature=signature;host.replaceChildren();host.className='user-question-card';host.dataset.questionId=question.id;
  if(showHeading){const heading=document.createElement('h4');heading.textContent=question.text;host.append(heading);}
  if(question.status!=='pending'){
    const status=document.createElement('p');status.textContent=question.status==='uncertain'?'Answer delivery unconfirmed. Inspect this session before sending another answer.':question.status==='sending'?'Sending answer…':question.status==='dismissed'?'Question dismissed.':'Answered'+(question.deliveryState==='queued'?' · queued for the next turn':'');host.append(status);return;
  }
  const form=document.createElement('form'),label=document.createElement('label'),input=document.createElement('textarea'),choices=document.createElement('div'),submit=document.createElement('button');
  label.textContent='Your answer';input.rows=2;input.value=drafts.get(key)||'';input.setAttribute('aria-label','Your answer');label.append(input);choices.className='user-question-choices';
  const attachmentHost=document.createElement('div'),footer=document.createElement('div');footer.className='user-question-footer';
  const picker=attachments?mountQuestionAttachments({...attachments,key:'question:'+key,requestId:question.id,host:attachmentHost,textarea:input,notify}):{files:()=>[],payload:async()=>({}),clear:()=>{}};
  let messageId,submittedAnswer,busy=false;
  const send=async value=>{
    if(busy||!value.trim()&&!picker.files().length)return;value=value.trim()?value:'Please review the attached files.';busy=true;submit.disabled=true;
    // Retain the operation on transport uncertainty, including a retry after a
    // render. The owner rejects changed content or a second answer claim.
    const attempt=attempts.get(key);
    const files=picker.files();
    if(attempt&&(attempt.answer!==value||attempt.files.length!==files.length||files.some((file,index)=>file!==attempt.files[index]))){host.questionActions.notify('Refresh the chat to inspect the previous answer before changing it.');busy=false;submit.disabled=false;return;}
    messageId=attempt?.messageId||crypto.randomUUID();submittedAnswer=value;
    try{const delivery=attempt?.delivery||await picker.payload(value,messageId);attempts.set(key,{messageId,answer:submittedAnswer,files,delivery});await host.questionActions.answer(question,value,messageId,delivery);drafts.delete(key);attempts.delete(key);picker.clear();}catch(error){host.questionActions.notify(error.message);}finally{busy=false;submit.disabled=false;}
  };
  for(const choice of question.choices||[])choices.append(button(choice,()=>{input.value=choice;drafts.set(key,choice);void send(choice);}));
  input.oninput=()=>drafts.set(key,input.value);bindQuestionReturn(input,()=>form.requestSubmit());submit.type='submit';submit.textContent='Send answer';form.onsubmit=event=>{event.preventDefault();void send(input.value);};footer.append(attachmentHost,submit);form.append(choices,label,footer);host.append(form);
}
export function mountQuestionQueue(host,run,{jump,answer,notify}){
  const questions=chatQuestions(run).filter(question=>['pending','sending','uncertain'].includes(question.status));
  const signature=JSON.stringify(questions);host.questionActions={jump,answer,notify};
  if(host.questionSignature===signature)return;
  const open=host.querySelector('details')?.open;host.questionSignature=signature;host.replaceChildren();host.hidden=!questions.length;
  if(!questions.length)return;
  const details=document.createElement('details'),summary=document.createElement('summary');details.open=queueStates.get(run.id)??!!open;details.ontoggle=()=>{if(details.isConnected)queueStates.set(run.id,details.open);};summary.textContent=`Questions to answer (${questions.length})`;details.append(summary);
  for(const question of questions)details.append(button(question.text,()=>{details.open=false;queueStates.set(run.id,false);void host.questionActions.jump(question);}));
  host.className='user-question-queue';host.append(details);
}
