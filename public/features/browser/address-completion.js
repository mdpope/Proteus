import {browserAddressCompletion} from '../../models/browser-address-completion.js';

// The suffix is presentation only. Typed text, selection and undo remain native.
export function bindAddressCompletion(input,{load,navigate,disabled=()=>false}) {
  if(!input||input.dataset.addressCompletion)return;
  input.dataset.addressCompletion='true';input.setAttribute('aria-autocomplete','both');
  const controller=new AbortController(),{signal}=controller,host=document.createElement('span'),ghost=document.createElement('span'),typed=document.createElement('span'),suffix=document.createElement('span');
  host.className='address-completion';ghost.className='address-ghost';typed.className='address-ghost-typed';suffix.className='address-ghost-suffix';ghost.setAttribute('aria-hidden','true');
  input.before(host);host.append(input,ghost);ghost.append(typed,suffix);
  let sites=[],candidate=null,generation=0,timer,composing=false,dismissed=null,loading=false,again=false;
  const paint=()=>{
    const atEnd=document.activeElement===input&&input.selectionStart===input.value.length&&input.selectionEnd===input.value.length;
    candidate=atEnd&&!composing&&!disabled()&&dismissed!==input.value?browserAddressCompletion(input.value,sites):null;
    ghost.hidden=!candidate;typed.textContent=input.value;suffix.textContent=candidate?.suffix||'';
    if(!candidate)return;
    const style=getComputedStyle(input);ghost.style.font=style.font;ghost.style.letterSpacing=style.letterSpacing;ghost.style.paddingLeft=style.paddingLeft;ghost.style.paddingRight=style.paddingRight;ghost.style.borderLeftWidth=style.borderLeftWidth;ghost.style.borderRightWidth=style.borderRightWidth;
    ghost.style.textIndent=style.textIndent;ghost.style.width=input.offsetWidth+'px';ghost.style.height=input.offsetHeight+'px';ghost.style.top=input.offsetTop+'px';ghost.style.left=input.offsetLeft+'px';
    typed.style.marginLeft=-input.scrollLeft+'px';
  };
  const refresh=async()=>{if(document.activeElement!==input)return;if(loading){again=true;return;}loading=true;const version=++generation,query=input.value;try{const values=await load(query);if(version!==generation||!input.isConnected||input.value!==query)return;sites=values;paint();}catch{if(version===generation){sites=[];paint();}}finally{loading=false;if(again){again=false;void refresh();}}};
  input.addEventListener('focus',()=>{dismissed=null;void refresh();paint();},{signal});
  input.addEventListener('input',()=>{dismissed=null;paint();clearTimeout(timer);timer=setTimeout(()=>void refresh(),75);},{signal});
  input.addEventListener('blur',()=>{candidate=null;ghost.hidden=true;generation++;},{signal});
  for(const name of ['select','click','keyup','scroll'])input.addEventListener(name,paint,{signal});
  document.addEventListener('selectionchange',()=>{if(document.activeElement===input)paint();},{signal});
  input.addEventListener('compositionstart',()=>{composing=true;paint();},{signal});input.addEventListener('compositionend',()=>{composing=false;paint();void refresh();},{signal});
  input.addEventListener('keydown',event=>{
    if(event.isComposing||event.keyCode===229||composing)return;
    if(['Escape','Delete','ArrowUp','ArrowDown'].includes(event.key)){dismissed=input.value;paint();return;}
    paint();if(!candidate||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
    if(event.key==='Tab'||event.key==='Enter'){
      event.preventDefault();event.stopImmediatePropagation();const chosen=candidate;dismissed=input.value;
      if(event.key==='Tab'){input.value=chosen.value;input.setSelectionRange(input.value.length,input.value.length);input.dispatchEvent(new Event('input',{bubbles:true}));paint();}
      else{input.value=chosen.url;ghost.hidden=true;input.blur();navigate(chosen.url);}
    }
  },{capture:true,signal});
  const resize=new ResizeObserver(paint);resize.observe(input);
  const observer=new MutationObserver(()=>{if(!input.isConnected){clearTimeout(timer);generation++;controller.abort();resize.disconnect();observer.disconnect();}});observer.observe(document.body,{childList:true,subtree:true});
  if(document.activeElement===input)void refresh();
  return {refresh,paint};
}
