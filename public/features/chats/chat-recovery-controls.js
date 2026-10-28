import {chatRecoveryState} from './chat-recovery-state.js';
import {bindRuntimeTimer,disposeRuntimeTimers} from './runtime.js';
import {allowanceResetLabel} from './allowance-controls.js';
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
 const button=(label,action)=>{const element=document.createElement('button');element.type='button';element.textContent=label;element.onclick=async()=>{for(const item of actions.querySelectorAll('button'))item.disabled=true;try{await options.recover(action,state.failureEventAt);}catch(error){options.notify?.(error.message);}finally{for(const item of actions.querySelectorAll('button'))item.disabled=false;}};actions.append(element);return element;};
 // A provider that cannot honor a selected agent's tool limits never started the
 // turn. Offer the one-step repair rather than a Continue that has nothing to resume.
 if(state.incompatibleAgents?.length){const names=state.incompatibleAgents.map(agent=>agent.name).join(', ');note.textContent=names+(state.incompatibleAgents.length===1?' is':' are')+' not compatible with this provider. Turn '+(state.incompatibleAgents.length===1?'it':'them')+' off for this chat and send your original request again.';button('Turn off '+names+' and retry request','retry-without-agents').className='primary';}
 if(state.recoverable)button('Continue chat','continue').className=state.incompatibleAgents?.length?'':'primary';
 if(state.activeTimeLimit)button('Continue and enable automatic continuation','active-time-continue-enable');
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
