// An explicit question jump owns history loading and focus until later user input.
// Page loads may redraw the queue; retain the intent by owner, never by old DOM.
const intents=new WeakMap();
export async function navigateQuestion({owner,current,locate,loadEarlier,position=()=>{},notify=()=>{}}){
 intents.get(owner)?.abort();const controller=new AbortController();intents.set(owner,controller);
 const active=()=>!controller.signal.aborted&&current();
 const cancel=()=>controller.abort();
 for(const type of ['pointerdown','keydown','wheel','touchstart'])document.addEventListener(type,cancel,{capture:true,passive:true,signal:controller.signal});
 const wait=async task=>{
  let abort;const cancelled=new Promise(resolve=>{abort=()=>resolve(false);controller.signal.addEventListener('abort',abort,{once:true});});
  try{return await Promise.race([Promise.resolve(task),cancelled]);}finally{controller.signal.removeEventListener('abort',abort);}
 };
 try{
  while(active()){
   const card=locate();
   if(card){
    // A native disclosure can hide a question even after its message is loaded.
    for(let node=card.parentElement;node;node=node.parentElement)if(node.tagName==='DETAILS')node.open=true;
    const input=card.querySelector('textarea:not(:disabled)');
    card.scrollIntoView({block:'center',behavior:'instant'});input?.focus({preventScroll:true});position();
    return !!input;
   }
   if(!await wait(loadEarlier())){if(active())notify('This question could not be loaded. Retry loading earlier messages.');return false;}
  }
  return false;
 }catch(error){if(active())notify(error.message);return false;}
 finally{controller.abort();if(intents.get(owner)===controller)intents.delete(owner);}
}
