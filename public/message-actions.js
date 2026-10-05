// Shared desktop/web controls. Speech is user-initiated and uses local OS voices only.
const icons={copy:'<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',copied:'<path d="m5 12 4 4L19 6"/>',speak:'<path d="M11 4 6 8H3v8h3l5 4V4Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',stop:'<rect x="5" y="5" width="14" height="14" rx="2"/>',pause:'<path d="M8 5v14M16 5v14"/>',resume:'<path d="m8 4 12 8-12 8V4Z"/>'};
const svg=name=>`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
const handles=new Set(),mounts=new WeakMap();
let active=null,context='',observer;
const synthesis=()=>globalThis.speechSynthesis;
function localVoice(){
 const voices=synthesis()?.getVoices?.().filter(v=>v.localService===true)||[];
 const lang=document.documentElement.lang||navigator.language||'en',locale=navigator.language||lang;
 const compatible=v=>v.lang?.split('-')[0].toLowerCase()===lang.split('-')[0].toLowerCase();
 return voices.find(v=>v.default&&compatible(v))||voices.find(v=>v.lang?.toLowerCase()===locale.toLowerCase())||voices.find(v=>v.lang?.toLowerCase()===lang.toLowerCase())||voices.find(compatible)||voices.find(v=>v.default)||voices[0];
}
export function readableMessageText(rendered){
 if(!rendered)return '';
 const skip='button,input,select,textarea,svg,script,style,[hidden],[aria-hidden="true"],.code-toolbar,.mermaid-controls,.message-actions';
 const block=/^(P|DIV|H[1-6]|LI|UL|OL|PRE|BLOCKQUOTE|TR|TABLE|SECTION)$/;
 const read=node=>{
  if(node.nodeType===3)return node.textContent;
  if(node.nodeType!==1||node.matches(skip))return '';
  const style=getComputedStyle(node);if(style.display==='none'||style.visibility==='hidden')return '';
  if(node.tagName==='BR')return '\n';
  const text=[...node.childNodes].map(read).join('');
  return block.test(node.tagName)?'\n'+text+'\n':node.tagName==='TD'||node.tagName==='TH'?text+'\t':text;
 };
 return read(rendered).replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
}
function display(handle){
 const owner=active?.handle===handle?active:null,available=!!localVoice();
 handle.speak.disabled=!owner&&!available;
 handle.speak.innerHTML=svg(owner?'stop':'speak');
 handle.speak.setAttribute('aria-label',owner?'Stop reading aloud':available?'Read aloud':'Read aloud unavailable: no local system voice');
 handle.speak.setAttribute('aria-pressed',String(!!owner));
 handle.speak.title=owner?'Stop reading aloud':available?'Read aloud':'Read aloud unavailable: no local system voice';
 handle.playback.hidden=!owner;
 if(owner){
  const position=owner.seekPreview??Math.round(owner.index/owner.content.length*1000),percent=Math.round(position/10);
  handle.pause.innerHTML=svg(owner.paused?'resume':'pause');handle.pause.setAttribute('aria-label',owner.paused?'Resume reading':'Pause reading');handle.pause.title=owner.paused?'Resume reading':'Pause reading';
  handle.seek.value=String(position);handle.position.textContent=percent+'%';handle.seek.setAttribute('aria-valuetext',percent+' percent through message text');
 }
}
function cancelUtterance(owner){
 owner.generation++;
 if(owner.utterance)for(const event of ['onstart','onend','onerror','onboundary','onpause','onresume'])owner.utterance[event]=null;
 owner.utterance=null;try{const synth=synthesis();if(synth?.paused)synth.resume();synth?.cancel();}catch{}
}
export function stopMessageSpeech(){
 const old=active;active=null;
 if(old){cancelUtterance(old);old.handle.seeking=false;display(old.handle);}
}
export function setMessageActionsContext(key){
 const next=String(key??'');if(next!==context){stopMessageSpeech();context=next;}
}
function feedback(handle,message){handle.status.textContent=message;handle.notify?.(message);}
function reconcile(){
 for(const handle of handles)if(!handle.container.isConnected){handles.delete(handle);clearTimeout(handle.copyTimer);}
 if(active&&!active.handle.container.isConnected)stopMessageSpeech();
}
function observe(){
 if(observer||!document.documentElement)return;
 observer=new MutationObserver(reconcile);observer.observe(document.documentElement,{childList:true,subtree:true});
 synthesis()?.addEventListener?.('voiceschanged',()=>{for(const handle of handles)display(handle);});
 globalThis.addEventListener('pagehide',stopMessageSpeech);
}
function wordStart(text,index){
 index=Math.max(0,Math.min(text.length,index));
 while(index>0&&index<text.length&&!/\s/.test(text[index-1])&&!/\s/.test(text[index]))index--;
 while(index<text.length&&/\s/.test(text[index]))index++;
 return index;
}
function playChunk(owner){
 if(active!==owner)return;
 const start=owner.index;
 if(start>=owner.content.length){stopMessageSpeech();return;}
 let end=Math.min(start+240,owner.content.length);
 if(end<owner.content.length){const split=owner.content.lastIndexOf(' ',end);if(split>start+80)end=split;}
 // Chunk edges must never cut a surrogate pair (for example an emoji).
 if(end<owner.content.length&&/[\uDC00-\uDFFF]/.test(owner.content[end])&&/[\uD800-\uDBFF]/.test(owner.content[end-1]))end--;
 const generation=++owner.generation;
 try{
  const utterance=new SpeechSynthesisUtterance(owner.content.slice(start,end));owner.utterance=utterance;owner.awaitingResume=false;
  utterance.voice=owner.voice;utterance.lang=owner.voice.lang;
  const current=()=>active===owner&&owner.generation===generation;
  utterance.onboundary=event=>{if(current()&&Number.isFinite(event.charIndex)){owner.index=Math.max(owner.index,Math.min(end,start+event.charIndex));display(owner.handle);}};
  utterance.onpause=()=>{if(current()){owner.paused=true;display(owner.handle);}};
  utterance.onresume=()=>{if(current()){owner.paused=false;display(owner.handle);}};
  utterance.onend=()=>{if(!current())return;owner.index=end;while(owner.index<owner.content.length&&/\s/.test(owner.content[owner.index]))owner.index++;owner.utterance=null;display(owner.handle);if(owner.paused)owner.awaitingResume=true;else playChunk(owner);};
  utterance.onerror=event=>{if(!current())return;const handle=owner.handle;stopMessageSpeech();if(!['canceled','interrupted'].includes(event.error))feedback(handle,'Read aloud could not finish. Try again.');};
  const synth=synthesis();if(synth.paused)synth.resume();synth.speak(utterance);display(owner.handle);
 }catch{const handle=owner.handle;stopMessageSpeech();feedback(handle,'Read aloud could not start. Try again.');}
}
function seekTo(handle,fraction){
 const owner=active;if(!owner||owner.handle!==handle)return;
 cancelUtterance(owner);delete owner.seekPreview;owner.index=wordStart(owner.content,Math.round(owner.content.length*fraction));handle.seeking=false;
 if(owner.index>=owner.content.length){stopMessageSpeech();return;}
 if(owner.paused){owner.awaitingResume=true;display(handle);}else playChunk(owner);
}
/** Mount below a completed assistant body. Stable keys retain speech across synchronous rerenders. */
export function mountMessageActions(container,{key,text,rendered,copy,notify}={}){
 observe();key=String(key??'');
 let handle=mounts.get(container);
 if(handle&&handle.key!==key){handle.destroy();handle=null;}
 if(handle){handle.update({text,rendered,copy,notify});handles.add(handle);return handle;}
 container.classList.add('message-actions');container.setAttribute('role','group');container.setAttribute('aria-label','Message actions');
 const button=(action,label,icon)=>`<button type="button" class="message-action-button" data-message-action="${action}" aria-label="${label}" title="${label}">${svg(icon)}</button>`;
 container.innerHTML=button('copy','Copy message','copy')+button('speak','Read aloud','speak')+`<div class="message-playback" hidden>${button('pause','Pause reading','pause')}${button('stop','Stop reading aloud','stop')}<input type="range" data-message-seek min="0" max="1000" step="1" value="0" aria-label="Reading position" title="Position in message text"><output class="message-playback-position">0%</output></div><span class="message-action-status" role="status" aria-live="polite"></span>`;
 handle={container,key,text:String(text??''),rendered,copy,notify,copyButton:container.querySelector('[data-message-action="copy"]'),speak:container.querySelector('[data-message-action="speak"]'),pause:container.querySelector('[data-message-action="pause"]'),playback:container.querySelector('.message-playback'),seek:container.querySelector('[data-message-seek]'),position:container.querySelector('.message-playback-position'),status:container.querySelector('.message-action-status'),copyTimer:null,destroyed:false,seeking:false};
 handle.update=value=>{const next=String(value.text??'');if(active?.handle===handle&&handle.text!==next)stopMessageSpeech();Object.assign(handle,{...value,text:next});display(handle);};
 handle.destroy=()=>{if(active?.handle===handle)stopMessageSpeech();clearTimeout(handle.copyTimer);handles.delete(handle);mounts.delete(container);handle.destroyed=true;container.replaceChildren();};
 handle.copyButton.onclick=async()=>{
  try{
   const copyText=handle.copy||((value)=>navigator.clipboard.writeText(value));await copyText(handle.text);
   if(handle.destroyed||!container.isConnected)return;
   handle.copyButton.innerHTML=svg('copied');handle.copyButton.setAttribute('aria-label','Copied');handle.copyButton.title='Copied';feedback(handle,'Copied');
   clearTimeout(handle.copyTimer);handle.copyTimer=setTimeout(()=>{handle.copyButton.innerHTML=svg('copy');handle.copyButton.setAttribute('aria-label','Copy message');handle.copyButton.title='Copy message';handle.status.textContent='';},2000);
  }catch{if(!handle.destroyed)feedback(handle,'Copy failed. Try again.');}
 };
 handle.speak.onclick=()=>{
  if(active?.handle===handle){stopMessageSpeech();return;}
  stopMessageSpeech();const voice=localVoice(),content=readableMessageText(handle.rendered);
  if(!voice){display(handle);feedback(handle,'Read aloud unavailable: no local system voice.');return;}
  if(!content)return;
  active={handle,voice,content,index:0,paused:false,generation:0,utterance:null,awaitingResume:false};playChunk(active);
 };
 handle.pause.onclick=()=>{
  const owner=active;if(!owner||owner.handle!==handle)return;
  try{
   if(owner.paused){owner.paused=false;if(owner.awaitingResume)playChunk(owner);else synthesis().resume();}
   else {synthesis().pause();owner.paused=true;}
   display(handle);
  }catch{stopMessageSpeech();feedback(handle,'Playback control unavailable. Try again.');}
 };
 container.querySelector('[data-message-action="stop"]').onclick=()=>{if(active?.handle===handle)stopMessageSpeech();};
 handle.seek.oninput=()=>{const owner=active;if(!owner||owner.handle!==handle)return;owner.seekPreview=Number(handle.seek.value);display(handle);};
 handle.seek.onchange=()=>seekTo(handle,Number(handle.seek.value)/1000);
 // Whole-page web renders may replace the active toolbar in the same event turn.
 if(active?.handle.key===key){if(active.handle.text===handle.text)active.handle=handle;else stopMessageSpeech();}
 mounts.set(container,handle);handles.add(handle);display(handle);return handle;
}
