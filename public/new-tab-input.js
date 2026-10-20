// Keep native text editing available while the owner creates a requested tab.
// This is window-local, temporary UI state, never a keyboard log or saved draft.
let pending;
export function beginNewTabInput({replace=false}={}) {
  if(pending&&!replace)return pending;
  if(pending)pending.cancel();
  const input=document.createElement('input'),previous=document.activeElement;
  input.id='pending-new-tab-address';input.type='text';input.autocomplete='off';input.spellcheck=false;
  input.setAttribute('aria-label','Website address');
  input.style.cssText='position:fixed;left:0;bottom:0;width:1px;height:1px;opacity:0;pointer-events:none';
  const capture={input,id:null,bind(id){capture.id=id;},target:null,composing:false,submit:false,cancel(){if(pending!==capture)return;clear();if(previous?.isConnected)previous.focus({preventScroll:true});}};
  const clear=()=>{document.removeEventListener('pointerdown',leave,true);window.removeEventListener('pagehide',leave);input.remove();if(pending===capture)pending=null;};
  const leave=event=>{if(event?.type==='pointerdown'&&event.target===capture.target)return;if(pending===capture)clear();};
  capture.complete=()=>{
    const target=capture.target;if(!target?.isConnected||capture.composing||pending!==capture)return;
    const value=input.value,start=input.selectionStart,end=input.selectionEnd,submit=capture.submit;
    clear();target.value=value;target.focus({preventScroll:true});target.setSelectionRange(start,end);
    if(value)target.dispatchEvent(new Event('input',{bubbles:true}));
    if(submit)queueMicrotask(()=>{if(target.isConnected)target.form?.requestSubmit();});
  };
  input.onkeydown=event=>{if(event.key==='Enter'&&!event.isComposing){event.preventDefault();capture.submit=true;}};
  input.oncompositionstart=()=>{capture.composing=true;};
  input.oncompositionend=()=>{capture.composing=false;queueMicrotask(()=>capture.complete());};
  pending=capture;document.body.append(input);document.addEventListener('pointerdown',leave,true);window.addEventListener('pagehide',leave);input.focus({preventScroll:true});return capture;
}
export function focusNewTabAddress(target,id) {
  if(!pending){target.focus({preventScroll:true});return;}
  if(!pending.id||pending.id!==id)return;
  pending.target=target;pending.complete();
}
export async function withNewTabInput(createAndSelect) {
  const capture=beginNewTabInput();
  try{return await createAndSelect(capture);}catch(error){capture.cancel();throw error;}
}
