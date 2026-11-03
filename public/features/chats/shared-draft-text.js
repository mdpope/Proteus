// Only composer text crosses this boundary. Tab descriptors carry an empty setup
// marker; attachment bytes, provider/source choices and approvals never enter it.
export function bindSharedDraftText({input,identity,request,storage=localStorage,changed=()=>{},notify=()=>{}}){
 if(!input)return {stop(){},sync:async()=>{}};
 const key='shared-text:'+JSON.stringify(identity),status=document.createElement('div');status.className='note shared-draft-status';status.setAttribute('role','status');
 // Draft state belongs with the chat heading; the composer is for message entry.
 const setupHeading=input.closest('.new-chat-tab-panel')?.querySelector(':scope > h2');
 const chatHeading=input.closest('#main')?.querySelector(':scope > .heading > div');
 if(setupHeading)setupHeading.after(status);
 else if(chatHeading){chatHeading.querySelectorAll('.shared-draft-status').forEach(node=>node.remove());chatHeading.append(status);}
 else input.after(status);
 let state;try{state=JSON.parse(storage.getItem(key)||'null');}catch{}state??={base:null,copies:[]};
 let busy=false,closed=false,lastInput=0,timer;
 const save=()=>storage.setItem(key,JSON.stringify(state));
 const set=text=>{if(input.value===text)return;input.value=text;changed(text);input.dispatchEvent(new Event('input',{bubbles:true}));};
 const retain=text=>{if(text&&!state.copies.some(item=>item.text===text)){state.copies=[...(state.copies||[]),{text,at:new Date().toISOString()}].slice(-8);save();}};
 const paint=(message='Draft text syncs across devices')=>{
  status.replaceChildren(document.createTextNode(message));
  if(state.conflict){
   const other=document.createElement('button');other.textContent='Use other draft';other.type='button';other.onclick=()=>{retain(input.value);set(state.conflict.text);state.base=state.conflict;delete state.conflict;delete state.pending;save();paint();};
   const mine=document.createElement('button');mine.textContent='Keep this draft';mine.type='button';mine.onclick=()=>{retain(state.conflict.text);state.base=state.conflict;delete state.conflict;delete state.pending;save();void tick();};status.append(' ',other,' ',mine);
  }
  if(state.copies?.length){const copies=document.createElement('details'),title=document.createElement('summary');title.textContent='Saved draft copies ('+state.copies.length+')';copies.append(title);for(const copy of state.copies){const text=document.createElement('pre');text.textContent=copy.text;copies.append(text);}status.append(copies);}
 };
 const conflict=remote=>{state.conflict=remote;save();paint('Draft changed on another device. Both versions are retained.');};
 const surface=input.closest('form,.new-chat-tab-panel')||input.closest('.composer');
 const guardSend=event=>{if(!state.conflict)return;if(event.type==='submit'||event.target.closest('[type="submit"],[data-chat-setup-submit],#continue,#steer,#peer-send,#peer-steer,[data-search-provider]')){event.preventDefault();event.stopImmediatePropagation();paint('Choose which draft to use before sending. Both versions are retained.');}};
 surface?.addEventListener('submit',guardSend,true);surface?.addEventListener('click',guardSend,true);
 async function tick(){
  if(closed||busy||Date.now()-lastInput<750)return;
  if(!input.isConnected){stop();return;}busy=true;
  if(input.offsetParent===null&&state.base&&input.value===state.base.text&&!state.pending){busy=false;return;}
  try{
   let local=input.value,remote=await request('get',identity);if(closed||!input.isConnected||input.value!==local)return;
   if(state.pending){const pending=state.pending;remote=await request('save',{...identity,...pending});if(closed||!input.isConnected)return;if(remote.conflict){delete state.pending;conflict(remote);return;}state.base={...remote,text:pending.text,revision:remote.appliedRevision};delete state.pending;save();local=input.value;}
   if(state.conflict){if(local===remote.text){state.base=remote;delete state.conflict;save();paint();}else conflict(remote);return;}
   if(!state.base){state.base=remote;if(local&&remote.text&&local!==remote.text){conflict(remote);return;}if(!local){set(remote.text);local=remote.text;}save();}
   if(local===state.base.text||local===remote.text){set(remote.text);state.base=remote;save();paint();return;}
   // Sending clears only the exact accepted text on the owner. A newer local
   // edit can safely continue from that clear without being mistaken for conflict.
   if(remote.text===''&&remote.clearedRevision===state.base.revision)state.base=remote;
   if(remote.text!==state.base.text){conflict(remote);return;}
   state.pending={text:local,expectedRevision:remote.revision,operationId:crypto.randomUUID()};save();
   const result=await request('save',{...identity,...state.pending});if(closed||!input.isConnected)return;
   if(result.conflict){delete state.pending;conflict(result);return;}
   state.base={...result,text:local,revision:result.appliedRevision};delete state.pending;save();paint('Draft text synced');
  }catch(error){paint('Draft kept on this device · '+(error.message||'Waiting for the owning computer'));}
  finally{busy=false;}
 }
 const edited=()=>{lastInput=Date.now();};input.addEventListener('input',edited);
 function stop(){closed=true;clearInterval(timer);input.removeEventListener('input',edited);surface?.removeEventListener('submit',guardSend,true);surface?.removeEventListener('click',guardSend,true);status.remove();}
 timer=setInterval(()=>void tick(),1500);paint();void tick();return {stop,sync:tick};
}
