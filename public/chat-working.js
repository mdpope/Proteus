// Confirm owner state before advertising an active remote turn or its available actions.
export function workingMessage(run,{verified=true,queue=true,steer=run?.chatControls?.steering===true}={}){
 if(run?.status!=='running'||run.pending||run.runtimeVerified===false||!verified)return null;
 return 'Working…'+(queue&&steer?' you can queue a message or steer this turn.':queue?' you can queue a message.':steer?' you can steer this turn.':'');
}
