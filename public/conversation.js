import { agentName } from './agent-name.js';
const views = new Map();
function readableOutput(value) {
  if (!value) return value;
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed?.snapshot === 'string') return [parsed.title, parsed.url, '', parsed.snapshot].filter(v => v !== undefined).join('\n');
    return JSON.stringify(parsed, null, 2);
  } catch { return value; }
}
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
  const entries = [...run.events.map((event, index) => ({ key: `event-${index}`, ...event })), ...Object.entries(run.liveMessages || {}).map(([id, text]) => ({ key: `stream-${id}`, role: 'assistant', text, streaming: true }))].filter(entry => (entry.role !== 'assistant' || entry.text?.trim()) && !entry.data?.permission?.automatic);
  const nodes = new Map([...view.messages.children].map(node => [node.dataset.key, node]));
  for (const entry of entries) {
    let node = nodes.get(entry.key);
    if (entry.data?.tool) {
      const tool = entry.data.tool;
      if (!node) { node = document.createElement('details'); node.dataset.key = entry.key; node.innerHTML = '<summary><span class="tool-icon"></span><span class="tool-summary"></span><span class="tool-status"></span></summary><div class="tool-content"></div>'; }
      node.className = `tool-activity ${tool.status}`;
      node.querySelector('.tool-icon').className = 'tool-icon' + (tool.status === 'running' ? ' spinner' : '');
      node.querySelector('.tool-icon').textContent = tool.status === 'running' ? '' : tool.status === 'completed' ? '✓' : '!';
      node.querySelector('.tool-summary').textContent = tool.summary;
      node.querySelector('.tool-status').textContent = tool.status + (tool.durationMs !== undefined ? ` · ${(tool.durationMs / 1000).toFixed(1)}s` : '');
      const content = node.querySelector('.tool-content');
      const fields = [['Progress', tool.progress], ['Approval', tool.approval], ['Arguments', tool.arguments], ['Output', readableOutput(tool.output)], ['Error', tool.error], ['Attachments', tool.attachments]].filter(([, value]) => value);
      const signature = JSON.stringify(fields);
      if (node.toolSignature !== signature) {
        const oldTop = content.scrollTop; content.replaceChildren();
        for (const [label, value] of fields) { const heading = document.createElement('div'); heading.className = 'note'; heading.textContent = label; const pre = document.createElement('pre'); pre.textContent = value; content.append(heading, pre); }
        content.scrollTop = oldTop; node.toolSignature = signature;
      }
      view.messages.append(node); nodes.delete(entry.key); continue;
    }
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
