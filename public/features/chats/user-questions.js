import {mountQuestionAttachments} from './question-attachments.js';
import {bindEnterSubmit as bindQuestionReturn} from '../../shared/ui/enter-submit.js';
const drafts=new Map(),attempts=new Map(),queueStates=new Map();
// The transcript retains the original prose. Omit only a card heading that is
// already present there; choices and answer controls still belong to this card.
export function questionPromptVisible(question,text,questionCount=1){const normalize=value=>String(value||'').replace(/\s+/g,' ').trim();const prompt=normalize(question.text);return questionCount===1&&!!prompt&&normalize(text).includes(prompt);}
export {bindQuestionReturn};
// Remove only exact structured-choice list rows from presentation; preserve original events.
export function questionMessageText(text,questions=[]){
 const normalize=value=>String(value||'').replace(/\*\*/g,'').trim();
 const choices=new Set(questions.flatMap(question=>[...(question.choices||[]),...(question.options||[]).flatMap(option=>typeof option==='string'?[option]:[option.label,option.description?option.label+' — '+option.description:option.label])].map(normalize)));
 return String(text||'').split('\n').filter(line=>{const match=line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.+?)\s*$/);return !match||!choices.has(normalize(match[1]));}).join('\n');
}
export function chatQuestions(run){
  const questions=[...(run.userQuestions||[])];
  for(const [index,event] of (run.events||[]).entries()){const question=event.data?.question;if(question&&!questions.some(item=>item.id===question.id)&&run.pending?.id!==question.id)questions.push({...question,eventIndex:(run.eventStart||0)+index});}
  if(run.pending?.type==='question')questions.push({id:run.pending.id,text:run.pending.question,choices:run.pending.choices||[],options:run.pending.optionDetails||[],status:'pending',blocking:true,eventIndex:(run.eventStart||0)+run.events.findIndex(event=>event.data?.question?.id===run.pending.id)});
  return questions;
}
export function pendingQuestionHasCard(run){
 const start=run?.eventStart||0;return run?.pending?.type==='question'&&chatQuestions(run).some(question=>question.blocking&&question.eventIndex>=start&&question.eventIndex<start+(run.events||[]).length);
}
const button=(label,action)=>{const node=document.createElement('button');node.type='button';node.textContent=label;node.onclick=action;return node;};
export function mountQuestionCard(host,question,{key,answer,attachments,showHeading=true,notify=()=>{}}){
  const signature=JSON.stringify([question,showHeading]);host.questionActions={answer,notify};
  if(host.questionSignature===signature)return;
  host.questionSignature=signature;host.replaceChildren();host.className='user-question-card';host.dataset.questionId=question.id;
  if(showHeading){const heading=document.createElement('h4');heading.textContent=question.text;host.append(heading);}
  if(question.status!=='pending'){
    const status=document.createElement('p');status.textContent=question.status==='uncertain'?'Answer delivery unconfirmed. Inspect this session before sending another answer.':question.status==='sending'?'Sending answer…':question.status==='dismissed'?'Question dismissed.':'Answered'+(question.answer?': '+question.answer:'')+(question.deliveryState==='queued'?' · queued for the next turn':'');host.append(status);return;
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
  for(const choice of question.choices||[]){const node=button(choice,()=>{input.value=choice;drafts.set(key,choice);void send(choice);}),detail=(question.options||[]).find(option=>option?.label===choice)?.description;if(detail){const note=document.createElement('small');note.textContent=detail;node.append(document.createElement('br'),note);}choices.append(node);}
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
