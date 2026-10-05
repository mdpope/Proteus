import { mountMessageActions } from './message-actions.js';
import { toolPresentation, mountStructured } from './tool-presentation.js';
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
  if(view.shell.parentElement!==target)target.replaceChildren(view.shell);
  const entries = [...run.events.map((event, index) => ({ key: `event-${(run.eventStart||0)+index}`, ...event })), ...Object.entries(run.liveMessages || {}).map(([id, text]) => ({ key: `stream-${id}`, role: 'assistant', text, streaming: true }))].filter(entry => (entry.role !== 'assistant' || entry.text?.trim()) && !entry.data?.permission?.automatic);
  const nodes = new Map([...view.messages.children].map(node => [node.dataset.key, node]));
  let next=view.messages.firstElementChild;
  const place=node=>{if(node===next)next=next.nextElementSibling;else view.messages.insertBefore(node,next);};
  for (const entry of entries) {
    let node = nodes.get(entry.key);
    if (entry.data?.tool) {
      let tool = entry.data.tool;
      const exitCode = ['bash', 'shell', 'powershell'].includes(tool.name) && tool.output?.match(/<shellId: [^<>\r\n]+ completed with exit code ([1-9]\d*)>\s*$/)?.[1];
      if (exitCode) tool = { ...tool, status: 'failed', error: tool.error || `Command exited with code ${exitCode}.` };
      if (!node) { node = document.createElement('details'); node.dataset.key = entry.key; node.innerHTML = '<summary><span class="tool-icon"></span><span class="tool-summary"></span><span class="tool-status"></span></summary><div class="tool-content"></div>'; }
      node.className = `tool-activity ${tool.status}`;
      node.querySelector('.tool-icon').className = 'tool-icon' + (tool.status === 'running' ? ' spinner' : '');
      node.querySelector('.tool-icon').textContent = tool.status === 'running' ? '' : tool.status === 'completed' ? '✓' : '!';
      node.querySelector('.tool-summary').textContent = tool.summary;
      node.querySelector('.tool-status').textContent = tool.status + (tool.durationMs !== undefined ? ` · ${(tool.durationMs / 1000).toFixed(1)}s` : '');
      const content = node.querySelector('.tool-content');
      const presentation = toolPresentation(tool);
      const signature = JSON.stringify([presentation,tool.arguments,tool.output]);
      if (node.toolSignature !== signature) {
        const oldTop = content.scrollTop; content.replaceChildren();
        const add=(tag,text,cls)=>{const element=document.createElement(tag);element.textContent=text;if(cls)element.className=cls;content.append(element);return element;};
        for(const file of presentation.targets) { const button=add('button',file,'tool-target');button.onclick=()=>options.link(file); }
        if(presentation.facts.length){const facts=add('div','');mountStructured(facts,{kind:'facts',facts:presentation.facts});}
        if(presentation.command)add('pre',presentation.command,'tool-command');
        if(presentation.progress)add('p',presentation.progress,'tool-progress');
        if(presentation.error)add('p',presentation.error,'tool-error');
        const output=add('div','','tool-result');mountStructured(output,presentation.output);
        if(presentation.approval)add('p',presentation.approval,'note');
        const raw=add('details','','raw-details');const summary=document.createElement('summary');summary.textContent='Raw arguments & output';const pre=document.createElement('pre');pre.textContent=[tool.arguments,tool.output,tool.attachments].filter(Boolean).join('\n\n');raw.append(summary,pre);
        content.scrollTop = oldTop; node.toolSignature = signature;
      }
      place(node); nodes.delete(entry.key); continue;
    }
    if (!node) { node = document.createElement('div'); node.className = 'message'; node.dataset.key = entry.key; node.innerHTML = '<div class="role"></div><div class="text"></div>'; }
    node.className = `message ${['user', 'assistant', 'tool', 'system'].includes(entry.role) ? entry.role : 'system'}`;
    node.firstChild.textContent = `${entry.data?.delivery ? ({queued:'Queued next',steered:'Steering',sending:'Sending steering',failed:'Not delivered',removed:'Removed from queue',delivered:'Queued message delivered'}[entry.data.delivery.state] || '') + ' · ' : ''}${entry.role === 'assistant' ? entry.agentName || agentName(run) : entry.role}${entry.streaming ? ' · streaming' : entry.at ? ' · ' + options.time(entry.at) : ''}`;
    const body=node.querySelector('.text');
    ProteusMarkdown.mount(body, entry.text, { ...options, resize: view.position });
    const completed=entry.role==='assistant'&&!entry.streaming&&!entry.data?.reasoning&&!['reasoning','thinking','analysis'].includes(entry.data?.phase||entry.phase||entry.type)&&entry.text?.trim();
    if(completed){
      let actions=node.querySelector('.message-actions');if(!actions){actions=document.createElement('div');node.append(actions);}
      node.messageActions=mountMessageActions(actions,{key:run.id+':'+entry.key,text:entry.text,rendered:body,copy:options.copy,notify:options.notify});
    }else if(node.messageActions){node.messageActions.destroy();node.querySelector('.message-actions')?.remove();node.messageActions=null;}
    place(node); nodes.delete(entry.key);
  }
  for (const node of nodes.values()){node.messageActions?.destroy();node.remove();}
  view.position();
}
export function forgetConversation(id) { const view = views.get(id); view?.observer.disconnect();view?.messages.querySelectorAll('.message').forEach(node=>node.messageActions?.destroy()); if (view) cancelAnimationFrame(view.frames); views.delete(id); }
