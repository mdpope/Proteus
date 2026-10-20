const positions = new Map();
const observed=new WeakMap(),liveViews=new Set(),storageKey='proteus.view-positions.v1';
let initialized=false,initializing;
export function initializeViewPositions(){
  if(initializing)return initializing;
  initializing=(async()=>{const rows=globalThis.window?.desktop?.viewPositions?await window.desktop.viewPositions({action:'get'}):JSON.parse(globalThis.localStorage?.getItem(storageKey)||'[]');for(const [key,value]of rows||[])if(typeof key==='string'&&Array.isArray(value))positions.set(key,new Map(value));initialized=true;})();return initializing;
}
function persist(key,values){
  if(!initialized)return;
  while(positions.size>200)positions.delete(positions.keys().next().value);
  if(globalThis.window?.desktop?.viewPositions)void window.desktop.viewPositions({action:'set',key,position:[...values]}).catch(error=>document.dispatchEvent(new CustomEvent('proteus-notice',{detail:error.message})));
  else try{localStorage.setItem(storageKey,JSON.stringify([...positions].map(([key,map])=>[key,[...map]])));}catch{}
}
function observe(root,key){
  for(const record of liveViews)if(!record.root.isConnected)record.dispose();
  const previous=observed.get(root);if(previous?.key===key)return;
  previous?.dispose();let timer;
  const save=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(root.isConnected)rememberView(root,key);},250);};
  root.addEventListener('scroll',save,true);
  const record={root,key,dispose(){clearTimeout(timer);root.removeEventListener('scroll',save,true);liveViews.delete(record);observed.delete(root);}};
  observed.set(root,record);liveViews.add(record);
}
globalThis.window?.addEventListener('pagehide',()=>{for(const {root,key} of liveViews)if(root.isConnected)rememberView(root,key);});
const candidates = '[data-key], [data-chat-index], .message, .resource-row, .card, h2, h3';
function scrollables(root) {
  return [root,...root.querySelectorAll('*')].filter(node => node.scrollHeight > node.clientHeight + 2 && node.clientHeight > 0 && getComputedStyle(node).overflowY !== 'hidden');
}
function locator(root,node) {
  if(node===root)return 'root';
  if(node.id)return '#'+CSS.escape(node.id);
  const path=[];while(node&&node!==root){path.unshift([...node.parentElement.children].indexOf(node));node=node.parentElement;}return path.join('.');
}
function find(root,key){
  if(key==='root')return root;
  if(key.startsWith('#'))return root.querySelector(key);
  let node=root;for(const index of key.split('.'))node=node?.children[Number(index)];return node||null;
}
function anchorFor(node){
  const visible=node.getBoundingClientRect();let best=null;
  const list=[...node.querySelectorAll(node.matches('.conversation')?'[data-key]':candidates)];
  for(let i=0;i<list.length;i++){const rect=list[i].getBoundingClientRect();if(rect.bottom>=visible.top+2&&rect.top<=visible.bottom){best={index:i,offset:rect.top-visible.top,key:list[i].dataset.key||null,text:list[i].textContent?.trim().slice(0,160)||null};break;}}
  return best;
}
export function rememberView(root,key){
  if(!root||!key)return;
  const values=new Map();for(const node of scrollables(root))values.set(locator(root,node),{top:node.scrollTop,left:node.scrollLeft,follow:node.matches('.conversation')&&node.scrollHeight-node.clientHeight-node.scrollTop<48,anchor:anchorFor(node)});
  positions.set(key,values);
  persist(key,values);
}
export function restoreView(root,key){
  if(!root||!key)return;
  observe(root,key);
  const values=positions.get(key);if(!root||!values)return;
  for(const [path,entry] of values){const node=find(root,path);if(!node)continue;
    node.scrollLeft=entry.left;
    if(entry.follow){node.scrollTop=node.scrollHeight;continue;}
    const anchor=entry.anchor, list=anchor?[...node.querySelectorAll(node.matches('.conversation')?'[data-key]':candidates)]:[];
    const target=anchor&&(anchor.key?list.find(item=>item.dataset.key===anchor.key):anchor.text?list.map((item,index)=>({item,index})).filter(entry=>entry.item.textContent?.trim().startsWith(anchor.text)).sort((a,b)=>Math.abs(a.index-anchor.index)-Math.abs(b.index-anchor.index))[0]?.item:list[anchor.index]);
    if(target){const visible=node.getBoundingClientRect();node.scrollTop+=target.getBoundingClientRect().top-visible.top-anchor.offset;}
    else node.scrollTop=entry.top;
    node.dispatchEvent(new Event('proteus:view-restored'));
  }
}
