const positions = new Map();
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
}
export function restoreView(root,key){
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
