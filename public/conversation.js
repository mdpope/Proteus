import { mountMessageActions } from './message-actions.js';
import { toolPresentation, mountStructured } from './tool-presentation.js';
import { agentName } from './agent-name.js';
import { sentAttachmentPreview, openSentAttachmentPreview } from './chat-attachments.js';
const views = new Map();
function readableOutput(value) {
  if (!value) return value;
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed?.snapshot === 'string') return [parsed.title, parsed.url, '', parsed.snapshot].filter(v => v !== undefined).join('\n');
    return JSON.stringify(parsed, null, 2);
  } catch { return value; }
}
function groupActivity(entries){
  const result=[];let batch=[];
  const flush=()=>{if(batch.length){result.push({key:'activity-'+batch[0].key,role:'activity',items:batch,at:batch.at(-1).at});batch=[];}};
  for(const entry of entries){if(entry.data?.tool||entry.data?.permission?.automatic){batch.push(entry);continue;}flush();result.push(entry);}flush();return result;
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
  const entries = groupActivity([...run.events.map((event, index) => ({ key: `event-${(run.eventStart||0)+index}`, ...event })), ...Object.entries(run.liveMessages || {}).map(([id, text]) => ({ key: `stream-${id}`, role: 'assistant', text, streaming: true }))].filter(entry => entry.role !== 'assistant' || entry.text?.trim()));
  const nodes = new Map([...view.messages.children].map(node => [node.dataset.key, node]));
  let next=view.messages.firstElementChild;
  const place=node=>{if(node===next)next=next.nextElementSibling;else view.messages.insertBefore(node,next);};
  for (const entry of entries) {
    let node = nodes.get(entry.key);
    if(entry.role==='activity'){
      if(!node){node=document.createElement('details');node.dataset.key=entry.key;node.className='activity-group';node.innerHTML='<summary></summary><div class="activity-group-items"></div>';}
      const tools=entry.items.filter(item=>item.data?.tool), approvals=entry.items.filter(item=>item.data?.permission?.automatic),failed=tools.filter(item=>item.data.tool.status==='failed').length,running=tools.filter(item=>item.data.tool.status==='running').length;
      node.querySelector('summary').textContent=`Activity · ${tools.length} ${tools.length===1?'tool':'tools'}${approvals.length?' · '+approvals.length+' automatic '+(approvals.length===1?'approval':'approvals'):''}${failed?' · '+failed+' failed':running?' · '+running+' running':''}`;
      const signature=JSON.stringify(entry.items.map(item=>[item.key,item.data?.tool?.status,item.data?.tool?.summary,item.data?.tool?.output,item.data?.permission]));
      if(node.activitySignature!==signature){const content=node.querySelector('.activity-group-items');content.replaceChildren();for(const item of entry.items){const row=document.createElement('div');row.className='activity-group-item';if(item.data?.tool){const tool=item.data.tool,presentation=toolPresentation(tool);const title=document.createElement('strong');title.textContent=(tool.status==='completed'?'✓ ':tool.status==='running'?'◌ ':'! ')+(tool.summary||tool.name||'Tool');row.append(title);if(presentation.targets.length){const target=document.createElement('div');target.className='note';target.textContent=presentation.targets.join(' · ');row.append(target);}if(presentation.approval){const note=document.createElement('div');note.className='note';note.textContent=presentation.approval;row.append(note);}const details=document.createElement('details');details.innerHTML='<summary>Details</summary><div></div>';mountStructured(details.querySelector('div'),presentation.output);row.append(details);}else{const approval=item.data.permission;const title=document.createElement('strong');title.textContent='✓ Automatic approval'+(approval.kind?' · '+approval.kind:'');row.append(title);const note=document.createElement('div');note.className='note';note.textContent=[approval.reason,approval.toolCallId?'Tool call '+approval.toolCallId:null,approval.resolvedTarget?'Target '+approval.resolvedTarget:null,approval.matchedRoot?'Trusted root '+approval.matchedRoot:null].filter(Boolean).join(' · ');row.append(note);}content.append(row);}node.activitySignature=signature;}
      place(node);nodes.delete(entry.key);continue;
    }
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
    let files=node.querySelector('.message-attachments');
    if(entry.data?.attachments?.length){
      if(!files){files=document.createElement('div');files.className='message-attachments';body.after(files);}
      files.replaceChildren();
      for(const attachment of entry.data.attachments){
        const chip=document.createElement('div');chip.className='message-attachment';
        const preview=sentAttachmentPreview(entry.data?.delivery?.id,attachment.name);
        if(preview){const button=document.createElement('button');button.type='button';button.title='Preview '+attachment.name;const image=document.createElement('img');image.src=preview;image.alt='';button.append(image);button.onclick=()=>openSentAttachmentPreview(entry.data.delivery.id,attachment.name);chip.append(button);}
        const label=document.createElement('span');label.textContent=attachment.name;const type=document.createElement('small');type.textContent=attachment.mediaType+(preview?'':' · preview available only in the sending session');label.append(type);chip.append(label);files.append(chip);
      }
    }else files?.remove();
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
