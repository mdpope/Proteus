export function allowancePreference(run,{available=true}={}){
 return `<div class="allowance-preference"><label><input type="checkbox" data-allowance-auto ${run.allowanceContinuation?.enabled?'checked':''} ${available?'':'disabled'}>Automatically continue when allowance resets</label><p class="note">${available?'This chat and its continuations. Waits for a provider-reported reset, then rechecks allowance on the executing computer.':'Update the executing computer to configure automatic allowance continuation.'}</p></div>`;
}
export function bindAllowancePreference(root,{run,command,reload,notify}){
 const input=root.querySelector('[data-allowance-auto]');if(!input||input.disabled)return;
 input.onchange=async()=>{input.disabled=true;try{await command({action:'allowance-auto',enabled:input.checked});await reload();}catch(error){input.checked=!!run.allowanceContinuation?.enabled;notify(error.message);if(input.isConnected)input.disabled=false;}};
}
export function bindActiveTimePreference(root,{run,command,reload,notify=()=>{}}){
 const input=root.querySelector('[data-active-time-auto]');if(!input||input.disabled)return;
 input.onchange=async()=>{input.disabled=true;try{await command({action:'active-time-auto',enabled:input.checked,expectedPreferenceVersion:run.activeTimeContinuation?.version||0});await reload();}catch(error){input.checked=!!run.activeTimeContinuation?.enabled;notify(error.message);}finally{if(input.isConnected)input.disabled=false;}};
}
export const allowanceResetLabel=value=>new Date(value).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',second:'2-digit',timeZoneName:'short'});
