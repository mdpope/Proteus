// Confirm owner state before advertising an active remote turn or its available actions.
export function workingMessage(run,{verified=true,queue=true,steer=run?.chatControls?.steering===true}={}){
 if(run?.status!=='running'||run.pending||run.runtimeVerified===false||!verified)return null;
 if(run.progress?.stalled){const seconds=Math.max(0,Math.floor((Date.now()-Date.parse(run.progress.lastProgressAt))/1000)),minutes=Math.floor(seconds/60),tools=run.progress.waitingTools||[];return `No observable progress for ${minutes}m ${seconds%60}s. ${tools.length?'Waiting for '+tools.map(tool=>tool.name).join(', ')+'. ':'Waiting for the provider. '}Stop this turn to interrupt it, then inspect unfinished work before continuing. Queued messages are preserved.`;}
 return 'Working…'+(queue&&steer?' you can queue a message or steer this turn.':queue?' you can queue a message.':steer?' you can steer this turn.':'');
}
