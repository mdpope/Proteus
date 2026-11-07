const positions = new Map();
// Kept in contract tests with the synchronous native window-layout validator.
export const MAX_VIEW_POSITIONS=256,MAX_POSITION_LOCATOR=2048;
function checkedPositions(values){
 if(values.size>MAX_VIEW_POSITIONS)throw Error('Reading-position capacity exceeded ('+values.size+'/'+MAX_VIEW_POSITIONS+'). Current reading state was not replaced.');
 for(const [key,entry]of values)if(key.length>MAX_POSITION_LOCATOR||![entry.top,entry.left].every(n=>Number.isFinite(n)&&Math.abs(n)<100_000_000))throw Error('Reading-position capture contains an invalid locator or offset. Current reading state was not replaced.');
 return values;
}
const observed=new WeakMap(),liveViews=new Set(),storageKey='proteus.view-positions.v1';
let initialized=false,initializing;
const writes=new Set();
export async function flushViewPositions(){for(const {root,key}of liveViews)if(root.isConnected&&(!root.dataset.viewKey||root.dataset.viewKey===key))rememberView(root,key);await Promise.all([...writes]);}
export function initializeViewPositions(){
  if(initializing)return initializing;
  initializing=(async()=>{const rows=globalThis.window?.desktop?.viewPositions?await window.desktop.viewPositions({action:'get'}):JSON.parse(globalThis.localStorage?.getItem(storageKey)||'[]');for(const [key,value]of rows||[])if(typeof key==='string'&&Array.isArray(value))positions.set(key,new Map(value));initialized=true;})();return initializing;
}
function persist(key,values){
  if(!initialized)return;
  while(positions.size>200)positions.delete(positions.keys().next().value);
  if(globalThis.window?.desktop?.viewPositions){const work=window.desktop.viewPositions({action:'set',key,position:[...values]});writes.add(work);void work.catch(error=>document.dispatchEvent(new CustomEvent('proteus-notice',{detail:error.message}))).finally(()=>writes.delete(work));}
  else try{localStorage.setItem(storageKey,JSON.stringify([...positions].map(([key,map])=>[key,[...map]])));}catch{}
}
function observe(root,key){
  for(const record of liveViews)if(!record.root.isConnected)record.dispose();
  const previous=observed.get(root);if(previous?.key===key)return;
  previous?.dispose();let timer;
  const save=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(root.isConnected&&(!root.dataset.viewKey||root.dataset.viewKey===key))rememberView(root,key);},250);};
  root.addEventListener('scroll',save,true);
  const record={root,key,dispose(){clearTimeout(timer);root.removeEventListener('scroll',save,true);liveViews.delete(record);observed.delete(root);}};
  observed.set(root,record);liveViews.add(record);
}
export function trackViewPosition(root,key){if(root&&key)observe(root,key);}
export function savedConversationPosition(key){
 const entry=[...(positions.get(key)?.values()||[])].find(entry=>entry.conversation);
 if(!entry)return null;
 const anchor=entry.anchor;return {key:anchor?.key||'',offset:anchor?.offset||0,follow:entry.follow};
}
export function savedArtifactPosition(key){return positions.get(key)?.get('artifact')?.artifact;}
export function rememberArtifactPosition(key,version,rows){
 if(!key||!Array.isArray(rows)||rows.length>24||typeof version!=='string'||!/^[a-f0-9]{64}$/.test(version))return;
 const values=new Map(positions.get(key)||[]),previous=values.get('artifact')?.artifact;
 const merged=new Map((previous?.version===version?previous.positions:[]).map(row=>[row.path,row]));for(const row of rows)merged.set(row.path,row);
 values.set('artifact',{top:0,left:0,artifact:{version,positions:[...merged.values()].slice(-24)}});checkedPositions(values);positions.set(key,values);persist(key,values);
}
globalThis.window?.addEventListener('pagehide',()=>{for(const {root,key} of liveViews)if(root.isConnected&&(!root.dataset.viewKey||root.dataset.viewKey===key))rememberView(root,key);});
const candidates = '[data-key], [data-chat-index], .message, .resource-row, .card, h2, h3';
function scrollables(root) {
  return [root,...root.querySelectorAll('*')].filter(node => {
    if(node.clientHeight<=0)return false;
    const style=getComputedStyle(node);
    // Visible overflow contributes layout height but is not a scrolling viewport.
    // Include horizontal-only and programmatically scrolled hidden containers.
    return node.scrollTop!==0||node.scrollLeft!==0||
      (node.scrollHeight>node.clientHeight+2&&/^(auto|scroll|overlay)$/.test(style.overflowY))||
      (node.scrollWidth>node.clientWidth+2&&/^(auto|scroll|overlay)$/.test(style.overflowX));
  });
}
function locator(root,node) {
  if(node===root)return 'root';
  if(node.id){const id='#'+CSS.escape(node.id);if(id.length<=MAX_POSITION_LOCATOR)return id;}
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
  // Lazy restoration must not replace a durable reading anchor with the
  // temporary loading screen observed by a refresh or shutdown checkpoint.
  if(root.dataset.positionLoading===key)return;
  const values=new Map();for(const node of scrollables(root))values.set(locator(root,node),{top:node.scrollTop,left:node.scrollLeft,conversation:node.matches('.conversation'),follow:node.matches('.conversation')&&node.scrollHeight-node.clientHeight-node.scrollTop<48,anchor:anchorFor(node)});
  const artifact=positions.get(key)?.get('artifact');if(artifact)values.set('artifact',artifact);
  checkedPositions(values);positions.set(key,values);
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
const documentRestorations=new WeakMap();
export function restoreDocumentView(root,key){
  if(!root||!key)return;
  documentRestorations.get(root)?.();
  const saved=positions.get(key);let cancelled=false,frame,timer;
  const events=['pointerdown','wheel','keydown'];
  const stop=()=>{if(cancelled)return;cancelled=true;cancelAnimationFrame(frame);clearTimeout(timer);observer?.disconnect();for(const type of events)root.removeEventListener(type,interact,true);documentRestorations.delete(root);};
  const interact=()=>{stop();rememberView(root,key);};
  const restore=()=>{if(cancelled||!root.isConnected||root.dataset.viewKey!==key){stop();return;}if(saved)positions.set(key,saved);restoreView(root,key);};
  const observer=typeof ResizeObserver==='function'?new ResizeObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(restore);}):null;
  documentRestorations.set(root,stop);for(const type of events)root.addEventListener(type,interact,true);
  observer?.observe(root);for(const child of root.children)observer?.observe(child);
  root.querySelectorAll('img').forEach(image=>image.addEventListener('load',restore,{once:true}));
  restore();frame=requestAnimationFrame(restore);timer=setTimeout(()=>{stop();if(root.isConnected&&root.dataset.viewKey===key)rememberView(root,key);},5000);
}
