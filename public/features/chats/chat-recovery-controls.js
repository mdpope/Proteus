import {chatRecoveryState,activeTimeContinuationAvailable} from './chat-recovery-state.js';
import {bindRuntimeTimer,disposeRuntimeTimers} from './runtime.js';
import {allowanceResetLabel} from './allowance-controls.js';
const accessBlocked=text=>/schedule (?:resources|folder identity) changed|schedule.*(?:saved access|identity pins)|review schedule access/i.test(text||'');
export function mountChatRecovery(node,entry,run,options){
 const state=chatRecoveryState(run),show=options.recover&&['chat','manual','scheduled','schedule'].includes(run.trigger)&&state&&entry.role==='system'&&entry.at===state.eventAt&&entry.text===state.eventText;
 let controls=node.querySelector('.chat-recovery-controls');
 if(!show){if(controls){disposeRuntimeTimers(controls);controls.remove();}return;}
 if(!controls){controls=document.createElement('section');controls.className='chat-recovery-controls';node.append(controls);}
 const signature=JSON.stringify([state.incompatibleAgents,state.recoverable,state.activeTimeLimit,state.capacity,state.failureEventAt,state.retry,state.queuedCount,run.allowanceStatus,run.allowanceContinuation]);
 if(controls.signature===signature)return;
 controls.signature=signature;disposeRuntimeTimers(controls);controls.replaceChildren();
 const note=document.createElement('p');note.className='note';note.textContent=state.queuedCount?`${state.queuedCount} queued message${state.queuedCount===1?' is':'s are'} waiting. Continue the interrupted chat; the queue will run after it finishes.`:'Continue this chat from where it left off.';controls.append(note);
 const actions=document.createElement('div');actions.className='actions';controls.append(actions);
 let reviewButton, continueButton;
 const button=(label,action)=>{const element=document.createElement('button');element.type='button';element.textContent=label;element.onclick=async()=>{for(const item of actions.querySelectorAll('button'))item.disabled=true;try{await options.recover(action,state.failureEventAt);}catch(error){options.notify?.(error.message);if(accessBlocked(error.message)){note.textContent=error.message;offerReview();}}finally{for(const item of actions.querySelectorAll('button'))item.disabled=false;}};actions.append(element);return element;};
 let reviewPanel;
 function offerReview(){
  if(reviewButton||!options.reviewScheduleAccess)return;
  reviewButton=document.createElement('button');reviewButton.type='button';reviewButton.textContent='Review access';
  actions.append(reviewButton);
  reviewButton.onclick=async()=>{
   reviewButton.disabled=true;
   try{
    const data=await options.reviewScheduleAccess({action:'view'});
    if(!controls.isConnected)return;
    reviewPanel?.remove();reviewPanel=document.createElement('section');reviewPanel.className='card';
    const paragraph=text=>{const node=document.createElement('p');node.textContent=text;reviewPanel.append(node);};
    paragraph('Saved access for this interrupted turn');
    for(const [label,source] of [['Captured turn',data.captured],['Future schedule',data.future]]){
     paragraph(label+' · '+[...(source.folders||[]),...(source.services||[])].join(' · '));
     if(source.sourceIds?.length)paragraph('Explicitly selected sources · '+source.sourceIds.join(', '));
    }
    paragraph(data.grants.length?'Saved grants · '+data.grants.join(' · '):'There are no additional grants.');
    paragraph('Keeping access applies only to the captured turn. Revoking removes these saved grants from the schedule and may cause new permission prompts.');
    const decision=(label,action)=>{
     const item=document.createElement('button');item.type='button';item.textContent=label;
     item.onclick=async()=>{
      const buttons=[...reviewPanel.querySelectorAll('button')];buttons.forEach(button=>button.disabled=true);
      try{
       const result=await options.reviewScheduleAccess({action,expectedRevision:data.expectedRevision,expectedUpdatedAt:data.expectedUpdatedAt});
       if(result?.accepted!==true)throw Error('The owner did not confirm the access decision.');
       reviewPanel.remove();reviewPanel=null;reviewButton.remove();reviewButton=null;
       note.textContent='Access review saved. You can continue this chat from its interrupted checkpoint.';
       continueButton?.focus({preventScroll:true});
      }catch(error){paragraph(error.message);buttons.forEach(button=>button.disabled=false);}
     };
     reviewPanel.append(item);
    };
    if(data.canKeep)decision('Keep verified access for this turn','keep-captured');
    decision('Revoke saved access','revoke');
    const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';
    cancel.onclick=()=>{reviewPanel.remove();reviewPanel=null;reviewButton.focus({preventScroll:true});};
    reviewPanel.append(cancel);controls.append(reviewPanel);reviewPanel.querySelector('button')?.focus();
   }catch(error){note.textContent=error.message;}finally{if(reviewButton)reviewButton.disabled=false;}
  };
 }
 // A provider that cannot honor a selected agent's tool limits never started the
 // turn. Offer the one-step repair rather than a Continue that has nothing to resume.
 if(state.incompatibleAgents?.length){const names=state.incompatibleAgents.map(agent=>agent.name).join(', ');note.textContent=names+(state.incompatibleAgents.length===1?' is':' are')+' not compatible with this provider. Turn '+(state.incompatibleAgents.length===1?'it':'them')+' off for this chat and send your original request again.';button('Turn off '+names+' and retry request','retry-without-agents').className='primary';}
 if(state.recoverable){continueButton=button('Continue chat','continue');continueButton.className=state.incompatibleAgents?.length?'':'primary';}
 if(accessBlocked(state.eventText))offerReview();
 if(state.activeTimeLimit&&activeTimeContinuationAvailable(run))button('Continue and enable automatic continuation','active-time-continue-enable');
 if(state.recoverable&&state.allowance&&run.chatControls?.allowanceContinuation!==false){
  const pending=run.allowanceContinuation?.pending,status=run.allowanceStatus,waiting=pending?.state==='waiting'&&pending.failureEventAt===state.failureEventAt;
  if(waiting){button('Cancel allowance continuation','allowance-cancel');const waitingNote=document.createElement('p');waitingNote.className='note';waitingNote.textContent='Waiting until '+allowanceResetLabel(pending.nextAttemptAt)+'. '+(pending.reason||'Allowance will be checked again before continuing.');controls.append(waitingNote);}
  else if(status?.failureEventAt===state.failureEventAt&&status.resetAt&&Date.parse(status.resetAt)>Date.now())button('Continue chat when allowance resets at '+allowanceResetLabel(status.resetAt),'allowance-arm');
  else button('Check allowance reset time','allowance-check');
  if(!waiting&&status?.note){const unavailable=document.createElement('p');unavailable.className='note';unavailable.textContent=status.note;controls.append(unavailable);}
  if(pending?.state==='attention'){const attention=document.createElement('p');attention.className='note';attention.textContent=pending.reason;controls.append(attention);}
 }
 if(state.retry){
  button('Stop retrying','stop-retry');const countdown=document.createElement('span');countdown.className='note';actions.append(countdown);
  bindRuntimeTimer(countdown,()=>state.retry.nextAttemptAt?'Next retry in '+Math.max(0,Math.ceil((Date.parse(state.retry.nextAttemptAt)-Date.now())/1000))+'s':'Retrying…',!!state.retry.nextAttemptAt);
 }else if(state.capacity)button('Retry every 60 seconds','retry');
 options.resize?.();
}
