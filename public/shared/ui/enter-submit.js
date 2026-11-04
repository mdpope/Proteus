export function enterSubmits(event,{allowCommand=false}={}){
 return event.key==='Enter'&&!event.shiftKey&&!event.altKey&&!event.isComposing&&event.keyCode!==229&&(allowCommand||!event.ctrlKey&&!event.metaKey);
}
export function bindEnterSubmit(input,submit){
 input?.addEventListener('keydown',event=>{if(!enterSubmits(event))return;event.preventDefault();if(!event.repeat)submit();});
}
