import {chatHistoryWindowStart} from './chat-history.js';
import {bindRuntimeTimer,formatDuration,turnDuration,runtimeTotal,toolDuration,groupDuration} from './runtime.js';
import { mountMessageActions } from './message-actions.js';
import { toolPresentation, mountStructured, normalizedTool, activitySummary, groupActivity, permissionToolCallId, toolEventTime } from './tool-presentation.js';
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
function rememberDisclosures(body,states){
  for(const details of body.querySelectorAll('[data-disclosure-key]')){if(details.open)states.add(details.dataset.disclosureKey);else states.delete(details.dataset.disclosureKey);}
}
export function conversation(target, run, options) {
  let view = views.get(run.id);
  if(view){views.delete(run.id);views.set(run.id,view);}
  for(const [id,cached] of views)if(views.size>=4&&id!==run.id&&!cached.shell.isConnected)forgetConversation(id);
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
    const earlier=document.createElement('div');earlier.className='history-status';earlier.setAttribute('role','status');scroll.prepend(earlier);view.earlier=earlier;
    view.loadEarlier=async(manual=false)=>{
      if(!view.more||!view.fetchEarlier||view.paging||(!manual&&view.pageError)||!shell.isConnected)return;
      if(!manual&&scroll.scrollTop>Math.max(240,scroll.clientHeight*.65))return;
      const underfilled=scroll.scrollHeight<=scroll.clientHeight+80;
      if(!manual&&!underfilled&&(!view.historyGestureAvailable||view.updating))return;
      // Keep the reading gesture available until its already-started cache fill completes.
      if(view.prefetching&&view.eventStart===(view.run.eventStart||0))return;
      view.historyGestureAvailable=false;
      view.paging=true;view.pageError=false;earlier.textContent='Loading earlier messages…';
      try{if(view.eventStart>(view.run.eventStart||0)){view.renderStart=(view.run.eventStart||0)+chatHistoryWindowStart(view.run.events,view.eventStart-(view.run.eventStart||0));conversation(view.target,view.run,view.options);}else {view.renderStart=Math.max(0,view.eventStart-100);await view.fetchEarlier();}earlier.textContent='';}catch(error){view.pageError=true;const retry=document.createElement('button');retry.textContent='Retry earlier messages';retry.title=error.message;retry.onclick=()=>void view.loadEarlier(true);earlier.replaceChildren(retry);}finally{view.paging=false;if(!view.pageError)requestAnimationFrame(()=>void view.loadEarlier());}
    };
    view.prefetch=async()=>{
      if(!view.fetchEarlier||view.prefetching||view.paging||view.following||!view.run?.eventStart||view.prefetchFailedAt===view.run.eventStart||view.eventStart-view.run.eventStart>=40||scroll.scrollTop>scroll.clientHeight*2)return;
      view.prefetching=true;const first=view.run.eventStart;try{await view.fetchEarlier();}catch{view.prefetchFailedAt=first;}finally{view.prefetching=false;if(view.historyGestureAvailable)void view.loadEarlier();}
    };
    scroll.addEventListener('scroll',()=>{void view.loadEarlier();void view.prefetch();},{passive:true});
    scroll.addEventListener('scroll', () => {
      if (view.updating || !shell.isConnected) return;
      view.top = scroll.scrollTop; view.following = scroll.scrollHeight - scroll.clientHeight - scroll.scrollTop < 40; jump.hidden = view.following;
    }, { passive: true });
    scroll.addEventListener('proteus:view-restored', () => {
      view.top = scroll.scrollTop;
      view.following = scroll.scrollHeight - scroll.clientHeight - scroll.scrollTop < 40;
      jump.hidden = view.following;
    });
    // User input wins even while a streamed update is being laid out.
    scroll.addEventListener('wheel', event => { if (event.deltaY < 0) {const now=Date.now();if(now-(view.lastHistoryGesture||0)>100){view.historyGestureAvailable=true;view.lastHistoryGesture=now;} view.updating = false; view.following = false; jump.hidden = false; void view.loadEarlier(); } }, { passive: true });
    scroll.addEventListener('touchstart',()=>{view.historyGestureAvailable=true;view.updating=false;view.following=false;},{passive:true});
    scroll.addEventListener('keydown',event=>{if(['ArrowUp','PageUp','Home'].includes(event.key)){view.historyGestureAvailable=true;view.updating=false;view.following=false;void view.loadEarlier();}});
    jump.onclick = () => { view.following = true; position(); };
    view.observer = new ResizeObserver(position); view.observer.observe(messages); view.observer.observe(scroll);
  }
  view.run=run;view.options=options;view.target=target;
  const transportStart=run.eventStart||0;
  view.renderStart=Math.max(transportStart,view.renderStart??transportStart+chatHistoryWindowStart(run.events));
  view.more=view.renderStart>0;view.fetchEarlier=options.loadEarlier;
  view.scroll.dataset.eventStart=String(view.renderStart);view.scroll.dataset.eventCount=String(run.eventCount??run.events.length);
  const oldStart=view.eventStart,oldHeight=view.scroll.scrollHeight,oldTop=view.scroll.scrollTop;view.eventStart=view.renderStart;
  view.verified=run.runtimeVerified!==false;const receipt=Date.now(),hostAt=Date.parse(run.observedAt),now=()=>Number.isFinite(hostAt)?hostAt+Date.now()-receipt:Date.now();
  const durationText=value=>formatDuration(value)+(view.verified?'':' · offline, unverified');
  bindRuntimeTimer(document.querySelector('[data-runtime-total]'),()=>durationText(runtimeTotal(run.turns,now(),view.verified))+((run.timingPartial||run.turns?.some(t=>t.incomplete))?' · partial':''));
  view.updating = true;
  if(view.shell.parentElement!==target)target.replaceChildren(view.shell);
  const entries = groupActivity([...run.events.slice(view.renderStart-transportStart).map((event, index) => ({ key: `event-${view.renderStart+index}`, ...event })), ...Object.entries(run.liveMessages || {}).map(([id, text]) => ({ key: `stream-${id}`, role: 'assistant', text, streaming: true,data:{turnId:run.turns?.at(-1)?.id} }))].filter(entry => entry.role !== 'assistant' || entry.text?.trim()));
  const nodes = new Map([...view.messages.children].map(node => [node.dataset.key, node]));
  let next=view.messages.firstElementChild;
  const place=node=>{if(node===next)next=next.nextElementSibling;else view.messages.insertBefore(node,next);};
  for (const entry of entries) {
    let node = nodes.get(entry.key);
    if(entry.role==='activity'){
      if(!node){node=document.createElement('details');node.dataset.key=entry.key;node.className='activity-group';node.innerHTML='<summary></summary><div class="activity-group-items"></div>';}
      const tools=entry.items.filter(item=>item.data?.tool).map(item=>normalizedTool(item.data.tool)), approvals=entry.items.filter(item=>item.data?.permission?.automatic),decisions=entry.items.filter(item=>item.data?.permission&&!item.data.permission.automatic),systems=entry.items.filter(item=>!item.data?.tool&&!item.data?.permission&&item.role!=='tool');
      node.classList.toggle('running',tools.some(tool=>tool.status==='running'));
      node.classList.toggle('failed',tools.some(tool=>['failed','error','interrupted'].includes(tool.status)));
      node.querySelector('summary').textContent=activitySummary(tools,approvals.length,decisions.length,systems.length);if(tools.length){const groupTimer=document.createElement('span');node.querySelector('summary').append(groupTimer);bindRuntimeTimer(groupTimer,()=>durationText(groupDuration(tools,now(),view.verified,run.turns)));}
      node.populateActivity=()=>{
        if(!node.open)return;
        const signature=JSON.stringify(entry.items.map(item=>[item.key,item.role,item.at,item.text,item.data]));
        if(node.activitySignature!==signature){
        const content=node.querySelector('.activity-group-items');view.activityDisclosures ||= new Set();rememberDisclosures(content,view.activityDisclosures);content.replaceChildren();
        for(const item of entry.items){
          const row=document.createElement('div');row.className='activity-group-item';row.dataset.activityKey=item.key;
          if(item.data?.tool||item.role==='tool'){
            const tool=normalizedTool(item.data?.tool||{name:'Tool output',status:'output',output:item.text}),presentation=tool.presentation||toolPresentation(tool);row.classList.add(tool.status||'completed');
            const title=document.createElement('strong'),icon=document.createElement('span');icon.className='tool-icon'+(tool.status==='running'?' spinner':'');icon.setAttribute('aria-hidden','true');icon.textContent=tool.status==='running'?'':tool.status==='completed'?'✓':'!';title.append(icon,document.createTextNode(' '+(tool.summary||tool.name||'Tool')));row.append(title);
            const status=document.createElement('div');status.className='note';const at=toolEventTime(tool,item);status.textContent=(tool.status==='running'?'Working…':tool.status==='failed'?'Failed':tool.status==='completed'?'Completed':tool.status)+(at?' · '+(options.activityTime||options.time)(at):' · Completion time unavailable');row.append(status);const timer=document.createElement('span');status.append(timer);bindRuntimeTimer(timer,()=>durationText(toolDuration(tool,now(),view.verified,run.turns)));
            if(tool.callId){const reference=document.createElement('div');reference.className='note tool-call-reference';reference.textContent='Tool call '+tool.callId;row.dataset.toolCallId=tool.callId;row.append(reference);}
            for(const fact of presentation.facts.filter(f=>f.label==='Pattern')){const line=document.createElement('div');line.className='tool-search-pattern';line.textContent='Pattern: '+fact.value;row.append(line);}
            if(presentation.error){const error=document.createElement('p');error.className='tool-error';error.textContent=presentation.error;row.append(error);}
            if(presentation.targets.length){const target=document.createElement('div');target.className='note';target.textContent=presentation.targets.join(' · ');row.append(target);}
            if(presentation.approval){const note=document.createElement('div');note.className='note';note.textContent=presentation.approval;row.append(note);}
            const details=document.createElement('details');details.innerHTML='<summary>Details</summary><div></div>';const body=details.querySelector('div');const populate=()=>{if(body.childElementCount)return;if(presentation.command){const command=document.createElement('pre');command.textContent=presentation.command;body.append(command);}if(presentation.facts.length){const facts=document.createElement('div');mountStructured(facts,{kind:'facts',facts:presentation.facts});body.append(facts);}if(presentation.progress){const progress=document.createElement('p');progress.textContent=presentation.progress;body.append(progress);}const output=document.createElement('div');mountStructured(output,presentation.output);body.append(output);};details.dataset.disclosureKey=item.key+':tool';details.open=view.activityDisclosures.has(details.dataset.disclosureKey);details.ontoggle=()=>{if(details.open)populate();};if(details.open)populate();row.append(details);
          }else if(item.data?.permission){
            const approval=item.data.permission,callId=permissionToolCallId(approval);row.classList.add('permission-entry');
            const title=document.createElement('strong');title.textContent=(approval.automatic?'✓ Automatic approval':'Permission '+(approval.decision||'decision'))+(approval.intention?' · '+approval.intention:approval.kind?' · '+approval.kind:'');row.append(title);
            const stamp=document.createElement('div');stamp.className='note';stamp.textContent=item.at?options.time(item.at):'Decision time unavailable';row.append(stamp);
            const note=document.createElement('div');note.className='note';note.textContent=[approval.reason||item.text,callId?'Tool call '+callId:null,approval.resolvedTarget?'Target '+approval.resolvedTarget:null,approval.matchedRoot?'Trusted root '+approval.matchedRoot:null].filter(Boolean).join(' · ');row.append(note);if(callId)row.dataset.toolCallId=callId;
            const details=document.createElement('details');details.dataset.disclosureKey=item.key+':request';details.open=view.activityDisclosures.has(details.dataset.disclosureKey);const summary=document.createElement('summary');summary.textContent='Original approval request';const pre=document.createElement('pre');pre.textContent=approval.request||'Original request was not recorded by this version.';details.append(summary,pre);row.append(details);
          }else{
            row.className='activity-group-item message system';
            const role=document.createElement('div');role.className='role';role.textContent='system'+(item.at?' · '+options.time(item.at):'');const body=document.createElement('div');body.className='text';row.append(role,body);ProteusMarkdown.mount(body,item.text||'',{...options,resize:view.position});
          }
          content.append(row);
        }
        node.activitySignature=signature;
      }
      };
      node.ontoggle=()=>{if(node.open)node.populateActivity();else{const body=node.querySelector('.activity-group-items');rememberDisclosures(body,view.activityDisclosures ||= new Set());body.replaceChildren();node.activitySignature=null;}view.position();};
      node.populateActivity();
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
      node.querySelector('.tool-status').textContent = tool.status;const toolTimer=document.createElement('span');node.querySelector('.tool-status').append(toolTimer);bindRuntimeTimer(toolTimer,()=>durationText(toolDuration(tool,now(),view.verified,run.turns)));
      const content = node.querySelector('.tool-content');
      const presentation = toolPresentation(tool);
      const pattern=presentation.facts.find(f=>f.label==='Pattern');if(pattern)node.querySelector('.tool-summary').textContent=(tool.summary||tool.name)+' · '+pattern.value;
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
    node.messageMarkdown=entry.text||'';
    node.className = `message ${['user', 'assistant', 'tool', 'system'].includes(entry.role) ? entry.role : 'system'}`;
    node.firstChild.textContent = `${entry.data?.delivery ? ({queued:'Queued next',steered:'Steering',sending:'Sending steering',failed:'Not delivered',removed:'Removed from queue',delivered:'Queued message delivered'}[entry.data.delivery.state] || '') + ' · ' : ''}${entry.role === 'assistant' ? entry.agentName || agentName(run) : entry.role}${entry.streaming ? ' · streaming' : entry.at ? ' · ' + options.time(entry.at) : ''}`;
    if(entry.data?.question){node.classList.add('agent-question');node.firstChild.textContent=`${agentName(run)} · Question · ${entry.data.question.status||'pending'}${entry.at?' · '+options.time(entry.at):''}`;node.dataset.requestId=entry.data.question.id;}
    if(entry.data?.questionReply)node.dataset.requestId=entry.data.questionReply.requestId;
    if(entry.role==='assistant'){
      const turn=run.turns?.find(t=>t.id===entry.data?.turnId)||(entry.streaming?run.turns?.at(-1):null);
      const first=entry.streaming?!(run.events||[]).some(e=>e.role==='assistant'&&e.data?.turnId===turn?.id):!entries.some(e=>e.key!==entry.key&&e.role==='assistant'&&e.data?.turnId===turn?.id&&entries.indexOf(e)<entries.indexOf(entry));
      if(first){const timer=document.createElement('span');node.firstChild.append(timer);bindRuntimeTimer(timer,()=>durationText(turnDuration(turn,now(),view.verified))+(turn?.incomplete?' · partial':''));}
    }
    if(entry.data?.permission&&!entry.data.permission.automatic){let details=node.querySelector('.permission-original');if(!details){details=document.createElement('details');details.className='permission-original';node.append(details);}details.replaceChildren();const summary=document.createElement('summary');summary.textContent=entry.data.permission.intention||'Original approval request';const pre=document.createElement('pre');pre.textContent=entry.data.permission.request||'Original request was not recorded by this version.';details.append(summary,pre);}
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
    if(entry.role==='user'&&options.edit){let edit=node.querySelector('[data-edit-message]');if(!edit){edit=document.createElement('button');edit.dataset.editMessage='';edit.className='subtle';edit.textContent='Edit and resend';node.append(edit);}edit.onclick=()=>options.edit(entry);}
    place(node); nodes.delete(entry.key);
  }
  for (const node of nodes.values()){node.messageActions?.destroy();node.remove();}
  if(oldStart!==undefined&&view.eventStart<oldStart&&!view.following)view.top=oldTop+view.scroll.scrollHeight-oldHeight;
  view.position();requestAnimationFrame(()=>void view.loadEarlier());
}
export function forgetConversation(id) { const view = views.get(id); view?.observer.disconnect();view?.messages.querySelectorAll('.message').forEach(node=>node.messageActions?.destroy()); if (view) cancelAnimationFrame(view.frames); views.delete(id); }

export function setConversationVerified(id,verified){const view=views.get(id);if(view)view.verified=verified;}
