// Shared tab-strip behavior. The scroll mask appears only when the strip is clipped.
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
      const source = dragged, target = getId(node), after = node.classList.contains('drop-after');
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
