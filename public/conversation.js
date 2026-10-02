import { agentName } from './agent-name.js';
const views = new Map();
export function conversation(target, run, options) {
  let view = views.get(run.id);
  if (!view) {
    const shell = document.createElement('div'); shell.className = 'conversation-shell';
    shell.innerHTML = '<div class="conversation" id="conversation" tabindex="0" aria-label="Conversation"><div class="conversation-messages"></div></div><button class="jump-latest" hidden>↓ Jump to latest</button>';
    const scroll = shell.querySelector('.conversation'); const messages = shell.firstChild.firstChild; const jump = shell.querySelector('button');
    view = { shell, scroll, messages, jump, following: true, top: 0, updating: false, frames: 0 }; views.set(run.id, view);
    const position = () => {
      if (!shell.isConnected) return;
      view.updating = true; scroll.scrollTop = view.following ? scroll.scrollHeight : view.top;
      view.top = scroll.scrollTop; jump.hidden = view.following;
      cancelAnimationFrame(view.frames); view.frames = requestAnimationFrame(() => { view.updating = false; });
    };
    view.position = position;
    scroll.addEventListener('scroll', () => {
      if (view.updating || !shell.isConnected) return;
      view.top = scroll.scrollTop; view.following = scroll.scrollHeight - scroll.clientHeight - scroll.scrollTop < 40; jump.hidden = view.following;
    }, { passive: true });
    // User input wins even while a streamed update is being laid out.
    scroll.addEventListener('wheel', event => { if (event.deltaY < 0) { view.updating = false; view.following = false; jump.hidden = false; } }, { passive: true });
    jump.onclick = () => { view.following = true; position(); };
    view.observer = new ResizeObserver(position); view.observer.observe(messages); view.observer.observe(scroll);
  }
  view.updating = true;
  target.replaceChildren(view.shell);
  const entries = [...run.events.map((event, index) => ({ key: `event-${index}`, ...event })), ...Object.entries(run.liveMessages || {}).map(([id, text]) => ({ key: `stream-${id}`, role: 'assistant', text, streaming: true }))];
  const nodes = new Map([...view.messages.children].map(node => [node.dataset.key, node]));
  for (const entry of entries) {
    let node = nodes.get(entry.key);
    if (!node) { node = document.createElement('div'); node.className = 'message'; node.dataset.key = entry.key; node.innerHTML = '<div class="role"></div><div class="text"></div>'; }
    node.className = `message ${['user', 'assistant', 'tool', 'system'].includes(entry.role) ? entry.role : 'system'}`;
    node.firstChild.textContent = `${entry.role === 'assistant' ? entry.agentName || agentName(run) : entry.role}${entry.streaming ? ' · streaming' : entry.at ? ' · ' + options.time(entry.at) : ''}`;
    ProteusMarkdown.mount(node.lastChild, entry.text, { ...options, resize: view.position });
    view.messages.append(node); nodes.delete(entry.key);
  }
  for (const node of nodes.values()) node.remove();
  view.position();
}
export function forgetConversation(id) { const view = views.get(id); view?.observer.disconnect(); if (view) cancelAnimationFrame(view.frames); views.delete(id); }
