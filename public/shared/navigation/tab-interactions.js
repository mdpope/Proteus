// Shared tab-strip behavior. The scroll mask appears only when the strip is clipped.
const revealedStrips=new Map();
export function resetTabReveals(){
  for(const record of revealedStrips.values()){cancelAnimationFrame(record.frame);clearTimeout(record.expiry);record.resize?.disconnect();}
  revealedStrips.clear();
}
export function revealWholeTab(list,node){
  if(!list?.isConnected||!node?.isConnected)return;
  const bounds=list.getBoundingClientRect(),rect=node.getBoundingClientRect(),margin=8;
  if(rect.width>bounds.width-margin*2){list.scrollLeft+=rect.left-bounds.left;return;}
  if(rect.left<bounds.left+margin)list.scrollLeft-=bounds.left+margin-rect.left;
  else if(rect.right>bounds.right-margin)list.scrollLeft+=rect.right-bounds.right+margin;
}
// Detect insertions at the strip boundary, including background/link/tool opens.
// Retain pending work across a DOM replacement; metadata polls and reorders do not scroll.
export function revealNewTabs(list,key,selector,getId){
  if(!list)return;
  const nodes=[...list.querySelectorAll(selector)],ids=nodes.map(getId),prior=revealedStrips.get(key);
  const record=prior||{ids:new Set(ids),pending:null,frame:null,tracked:null};
  const added=prior?ids.filter(id=>!record.ids.has(id)):[];
  record.ids=new Set(ids);record.list=list;record.selector=selector;record.getId=getId;
  if(added.length){record.pending=added.at(-1);record.tracked=record.pending;record.expires=Date.now()+10000;}
  revealedStrips.delete(key);revealedStrips.set(key,record);
  const stopTracking=()=>{record.resize?.disconnect();record.observedList=null;record.observedTab=null;clearTimeout(record.expiry);};
  while(revealedStrips.size>128){const oldest=revealedStrips.keys().next().value,expired=revealedStrips.get(oldest);expired.resize?.disconnect();clearTimeout(expired.expiry);revealedStrips.delete(oldest);}
  const cancel=()=>{record.pending=null;record.tracked=null;stopTracking();};
  if(!list.dataset.revealBound){list.dataset.revealBound='true';for(const event of ['wheel','pointerdown','touchstart','keydown'])list.addEventListener(event,cancel,{passive:true});}
  const schedule=()=>{
  if(!record.pending&&(!record.tracked||Date.now()>record.expires)){stopTracking();return;}
  if(record.frame)return;
  // Chrome adds its right-side overview control in the next frame. Measure
  // after that layout settles so its width cannot clip the newly revealed tab.
  record.frame=requestAnimationFrame(()=>{record.frame=requestAnimationFrame(()=>{
    record.frame=null;const current=record.list;if(!current.isConnected)return;
    const tab=[...current.querySelectorAll(record.selector)].find(node=>record.getId(node)===(record.pending||record.tracked));
    if(!tab){stopTracking();return;}
    revealWholeTab(current,tab);record.pending=null;
    if(record.observedList!==current||record.observedTab!==tab){
      stopTracking();record.observedList=current;record.observedTab=tab;
      record.resize=new ResizeObserver(schedule);record.resize.observe(current);record.resize.observe(tab);
      record.expiry=setTimeout(cancel,Math.max(0,record.expires-Date.now()));
    }
  });});
  };
  schedule();
}
export function bindTabEdges(list) {
  if (!list) return;
  const update = () => {
    const left = list.scrollLeft > 1;
    const right = list.scrollLeft + list.clientWidth < list.scrollWidth - 1;
    list.classList.toggle('clipped-left', left);
    list.classList.toggle('clipped-right', right);
  };
  list.addEventListener('scroll', update, {passive:true});
  const observer=new ResizeObserver(update);observer.observe(list);
  requestAnimationFrame(update);
  return () => observer.disconnect();
}

// Reordering never moves a tab across its parent or over a fixed workspace tab.
export function bindTabReorder(list, selector, getId, move) {
  if (!list) return;
  let dragged = null;
  const nodes = () => [...list.querySelectorAll(selector)];
  for (const node of nodes()) {
    node.draggable = true;
    node.setAttribute('aria-keyshortcuts', 'Alt+Shift+ArrowLeft Alt+Shift+ArrowRight');
    node.addEventListener('dragstart', event => {
      dragged = getId(node); node.classList.add('dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', dragged);
    });
    node.addEventListener('dragend', () => {
      dragged = null;
      for (const item of nodes()) item.classList.remove('dragging', 'drop-before', 'drop-after');
    });
    node.addEventListener('dragover', event => {
      if (!dragged || dragged === getId(node)) return;
      event.preventDefault(); event.dataTransfer.dropEffect = 'move';
      const after = event.clientX > node.getBoundingClientRect().left + node.clientWidth / 2;
      for (const item of nodes()) item.classList.remove('drop-before', 'drop-after');
      node.classList.add(after ? 'drop-after' : 'drop-before');
      const rect = list.getBoundingClientRect();
      if (event.clientX < rect.left + 28) list.scrollLeft -= 18;
      if (event.clientX > rect.right - 28) list.scrollLeft += 18;
    });
    node.addEventListener('drop', event => {
      event.preventDefault();
      const source = dragged, target = getId(node), after = event.clientX > node.getBoundingClientRect().left + node.clientWidth / 2;
      dragged = null;for(const item of nodes())item.classList.remove('dragging','drop-before','drop-after');
      if (source && target && source !== target) move(source, target, after);
    });
    node.addEventListener('keydown', event => {
      if (!(event.altKey && event.shiftKey && ['ArrowLeft', 'ArrowRight'].includes(event.key))) return;
      const items = nodes(), index = items.indexOf(node), direction = event.key === 'ArrowLeft' ? -1 : 1;
      const neighbor = items[index + direction]; if (!neighbor) return;
      event.preventDefault(); move(getId(node), getId(neighbor), direction > 0);
    });
  }
}

export function reorderById(items, source, target, after, getId = item => item.id) {
  const from = items.findIndex(item => getId(item) === source);
  const to = items.findIndex(item => getId(item) === target);
  if (from < 0 || to < 0 || from === to) return false;
  const [item] = items.splice(from, 1);
  const index = items.findIndex(entry => getId(entry) === target);
  items.splice(index + (after ? 1 : 0), 0, item);
  return true;
}
/** The tab to show when `tab` leaves its strip (moved or sent elsewhere) while
 * active: its right neighbour, else left, else its parent. Moving never follows the
 * tab into its destination; the user stays in the current project/scope. */
export function neighborAfterRemoval(tabs, tab, visible = item => !item.hidden && !item.navigationClosed) {
  const siblings = tabs.filter(item => item === tab || ((item.parentId || null) === (tab.parentId || null) && visible(item)));
  const index = siblings.indexOf(tab), next = siblings[index + 1] || siblings[index - 1];
  return next ? next.id : (tab.parentId || 'overview');
}
