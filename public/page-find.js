// Non-mutating ranges preserve Markdown, links, selections and composer drafts.
export function findTextRanges(root, query) {
  if (!root || !query) return [];
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT), nodes=[];
  let text='',node;
  while ((node=walker.nextNode())) {
    const parent=node.parentElement;
    if (!parent || parent.closest('script,style,textarea,input,select,[hidden],[data-page-find]') || !parent.checkVisibility()) continue;
    const closed=parent.closest('details:not([open])');
    if (closed && !parent.closest('summary')) continue;
    const block=parent.closest('p,li,pre,h1,h2,h3,h4,td,th,button,label,summary');
    if (nodes.length && nodes.at(-1).block!==block) text+='\n';
    nodes.push({node,start:text.length,block}); text+=node.textContent;
  }
  const ranges=[],pattern=new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'giu');
  for (const match of text.matchAll(pattern)) {
    const at=match.index,length=match[0].length,start=nodes.findLast(part=>part.start<=at),end=nodes.findLast(part=>part.start<at+length);
    if (start && end) { const range=document.createRange();range.setStart(start.node,at-start.start);range.setEnd(end.node,at+length-end.start);ranges.push(range); }
  }
  return ranges;
}

export function installPageFind({scope=()=>document.querySelector('#main-content'),native=()=>null,onLayout=()=>{}}={}) {
  const panel=document.createElement('div');panel.className='page-find';panel.dataset.pageFind='';panel.hidden=true;
  panel.innerHTML='<input type="search" aria-label="Find in page" placeholder="Find in page"><span role="status" aria-live="polite">0 of 0</span><button type="button" data-prev aria-label="Previous match" title="Previous · Shift+Enter">↑</button><button type="button" data-next aria-label="Next match" title="Next · Enter">↓</button><button type="button" data-find-close aria-label="Close find" title="Close · Escape">×</button>';
  document.body.append(panel);
  const input=panel.querySelector('input'),count=panel.querySelector('span');
  let ranges=[],index=-1,epoch=0,activeNative=null,observer,timer,lastQuery='',lastNativeSearch=null;
  const nativeKey=target=>target?JSON.stringify([target.id,target.revision??0]):null;
  const stopNative=target=>{if(target)void Promise.resolve().then(()=>target.stop()).catch(()=>{});};
  const paint=()=>{CSS.highlights?.set('page-find-all',new Highlight(...ranges));CSS.highlights?.set('page-find-current',new Highlight(...(ranges[index]?[ranges[index]]:[])));count.textContent=`${ranges.length?index+1:0} of ${ranges.length}${scope()?.querySelector('[data-local-earlier],#remote-earlier-load')?' · loaded':''}`;};
  function reveal() {
    const range=ranges[index];if(!range)return;
    const element=range.startContainer.parentElement;element.scrollIntoView({block:'nearest',inline:'nearest'});
    // Center the precise occurrence, even inside a paragraph taller than its viewport.
    for(let parent=element;parent;parent=parent.parentElement){if(parent.scrollHeight>parent.clientHeight&&/auto|scroll/.test(getComputedStyle(parent).overflowY)){const rect=range.getBoundingClientRect(),box=parent.getBoundingClientRect();parent.scrollTop+=rect.top-box.top-parent.clientHeight/2;break;}}
  }
  async function search(direction=0,scroll=true,documentChanged=false) {
    if(panel.hidden)return;const target=native(),query=input.value,key=nativeKey(target);
    // A shell refresh must neither restart Chromium Find nor invalidate a pending explicit result.
    if(target&&!scroll&&!documentChanged&&lastNativeSearch?.key===key&&lastNativeSearch.query===query)return;
    const ticket=++epoch;
    const current=()=>ticket===epoch&&!panel.hidden&&input.value===query&&nativeKey(native())===key;
    if(activeNative&&activeNative.id!==target?.id)stopNative(activeNative);activeNative=target;
    if(target){lastNativeSearch={key,query};ranges=[];index=-1;lastQuery='';paint();if(!query){try{await target.stop();}catch{}return;}try{const result=await target.find(query,direction);if(current())count.textContent=`${result.activeMatchOrdinal||0} of ${result.matches||0}`;}catch(error){if(current())count.textContent=error.message;}return;}
    lastNativeSearch=null;
    if(direction&&ranges.length)index=(index+direction+ranges.length)%ranges.length;
    else {const previous=lastQuery===input.value?ranges[index]:null;ranges=findTextRanges(scope(),input.value);const retained=previous?ranges.findIndex(range=>range.startContainer===previous.startContainer&&range.startOffset===previous.startOffset):-1;index=retained>=0?retained:ranges.length?0:-1;lastQuery=input.value;}
    paint();if(scroll)reveal();
  }
  function close() {panel.hidden=true;epoch++;observer?.disconnect();clearTimeout(timer);ranges=[];index=-1;lastNativeSearch=null;paint();stopNative(activeNative);activeNative=null;onLayout(false);}
  function open() {
    panel.hidden=false;onLayout(true);input.focus();input.select();void search();
    observer?.disconnect();observer=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>void search(0,false),120);});
    const root=scope();if(root)observer.observe(root,{subtree:true,childList:true,characterData:true});
  }
  input.oninput=()=>{epoch++;clearTimeout(timer);timer=setTimeout(()=>void search(),120);};panel.querySelector('[data-prev]').onclick=()=>{clearTimeout(timer);void search(-1);};panel.querySelector('[data-next]').onclick=()=>{clearTimeout(timer);void search(1);};panel.querySelector('[data-find-close]').onclick=close;
  input.onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();clearTimeout(timer);void search(event.shiftKey?-1:1);}if(event.key==='Escape'){event.preventDefault();close();}};
  document.addEventListener('keydown',event=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='f'){event.preventDefault();open();}});
  return {open,close,refresh:({documentChanged=false}={})=>{if(!panel.hidden){onLayout(true);void search(0,false,documentChanged);}}};
}
