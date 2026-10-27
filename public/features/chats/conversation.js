import {mountSubagentViewer} from './subagent-view.js';
import {chatQuestions,mountQuestionCard,mountQuestionQueue} from './user-questions.js';
import {chatHistoryWindowStart,firstAssistantKeys} from './chat-history.js';
import {mountSvgPreviews} from './svg-preview.js';
import {bindRuntimeTimer,refreshRuntimeTimers,disposeRuntimeTimers,formatDuration,turnDuration,runtimeTotal,toolDuration,groupDuration} from './runtime.js';
import { mountMessageActions } from './message-actions.js';
import { toolPresentation, mountStructured, normalizedTool, activitySummary, permissionToolCallId, toolEventTime } from './tool-presentation.js';
import {activityEntries} from './activity-notes.js';
import {mountProviderActivity} from './provider-activity-view.js';
import {mountChatRecovery} from './chat-recovery-controls.js';
import { agentName, assistantName } from './agent-name.js';
import { sentAttachmentPreview, openSentAttachmentPreview } from './chat-attachments.js';
const views = new Map();
const viewIn=root=>[...views.values()].find(view=>view.shell.isConnected&&(root===view.scroll||root===view.shell||root?.contains(view.scroll)));
const eventIndex=key=>{const match=String(key||'').match(/^(?:activity-)?event-(\d+)$/);return match?Number(match[1]):null;};
export function captureConversationPosition(root){
 const view=viewIn(root);if(!view)return null;
 const {scroll,messages}=view,top=scroll.getBoundingClientRect().top;
 const node=[...messages.children].find(node=>node.getBoundingClientRect().bottom>top);
 return {key:node?.dataset.key||'',...(node&&eventIndex(node.dataset.key)!==null?{index:eventIndex(node.dataset.key)}:{}),offset:node?node.getBoundingClientRect().top-top:0,follow:scroll.scrollHeight-scroll.clientHeight-scroll.scrollTop<40};
}
export async function applyConversationPosition(root,position,{current:isCurrent=()=>true,signal}={}){
 const view=viewIn(root);if(!view||!position||!Number.isFinite(position.offset)||typeof position.key!=='string')return false;
 const generation=view.followPositionGeneration=(view.followPositionGeneration||0)+1,controller=new AbortController();let cancelled=false;
 const current=()=>!cancelled&&!signal?.aborted&&isCurrent()&&view.shell.isConnected&&viewIn(root)===view&&view.followPositionGeneration===generation;
 const cancel=()=>{cancelled=true;controller.abort();};for(const type of ['wheel','touchstart','pointerdown','keydown'])view.scroll.addEventListener(type,cancel,{capture:true,passive:true,signal:controller.signal});
 signal?.addEventListener('abort',cancel,{once:true,signal:controller.signal});
 const wait=async work=>{
  let abort;const cancelled=new Promise(resolve=>{abort=()=>resolve(false);controller.signal.addEventListener('abort',abort,{once:true});});
  try{return await Promise.race([Promise.resolve(work).then(()=>true),cancelled]);}finally{controller.signal.removeEventListener('abort',abort);}
 };
 try{
  if(!current())return false;
  if(position.follow){view.following=true;view.position();return true;}
  view.following=false;
  const index=Number.isSafeInteger(position.index)&&position.index>=0?position.index:eventIndex(position.key);
  while(current()&&index!==null&&index<view.eventStart){
   if(view.paging||view.prefetching){await new Promise(resolve=>setTimeout(resolve,16));continue;}
   const before=view.eventStart;if(!view.more||!view.fetchEarlier||view.pageError)return false;
   if(!await wait(view.loadEarlier(true))||!current()||view.eventStart===before)return false;
  }
  if(!current())return false;
  const nodes=[...view.messages.children];
  const node=nodes.find(node=>node.dataset.key===position.key)||nodes.find(node=>{const start=eventIndex(node.dataset.key);return index!==null&&start!==null&&start<=index&&Number(node.dataset.eventEnd)>index;});
  if(!node)return false;
  view.updating=true;view.scroll.scrollTop+=node.getBoundingClientRect().top-view.scroll.getBoundingClientRect().top-position.offset;view.top=view.scroll.scrollTop;view.following=false;view.position();return true;
 }finally{controller.abort();}
}
const positionRestorations=new WeakMap();
export function restoreConversationPosition(root,position,{current=()=>true,signal}={}){
 positionRestorations.get(root)?.();let stopped=false,applying=false,dirty=false,frame;
 const controller=new AbortController(),active=()=>!stopped&&!signal?.aborted&&root.isConnected&&current();
 const stop=()=>{if(stopped)return;stopped=true;cancelAnimationFrame(frame);observer.disconnect();controller.abort();if(positionRestorations.get(root)===stop)positionRestorations.delete(root);};
 const schedule=()=>{if(!active()){stop();return;}dirty=true;if(applying||frame)return;frame=requestAnimationFrame(()=>{frame=null;void apply();});};
 const apply=async()=>{
  if(!active()){stop();return;}applying=true;dirty=false;
  try{if(await applyConversationPosition(root,position,{current:active,signal:controller.signal}))stop();}
  finally{applying=false;if(!active())stop();else if(dirty)schedule();}
 };
 // Watch lifetime as well as content readiness. Slow peer loads may finish long
 // after tab selection; no timer may acknowledge an unapplied position.
 const observer=new MutationObserver(records=>{if(!active()){stop();return;}if(records.some(record=>record.target===root||root.contains(record.target)))schedule();});
 positionRestorations.set(root,stop);observer.observe(root.ownerDocument,{childList:true,subtree:true});
 for(const type of ['wheel','touchstart','pointerdown','keydown'])root.addEventListener(type,stop,{capture:true,passive:true,signal:controller.signal});
 signal?.addEventListener('abort',stop,{once:true,signal:controller.signal});schedule();return stop;
}
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
  mountSubagentViewer(target,run,options);
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
    jump.onclick = () => { view.following = true;view.renderStart=(view.run.eventStart||0)+chatHistoryWindowStart(view.run.events);conversation(view.target,view.run,view.options); };
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
  bindRuntimeTimer(document.querySelector('[data-runtime-total]'),()=>durationText(runtimeTotal(run.turns,now(),view.verified))+((run.timingPartial||run.turns?.some(t=>t.incomplete))?' · partial':''),!!run.turns?.some(t=>t.activeSince));
  view.updating = true;
  if(view.shell.parentElement!==target)target.replaceChildren(view.shell);
  let questionQueue=view.shell.querySelector('.user-question-queue');if(!questionQueue){questionQueue=document.createElement('div');questionQueue.className='user-question-queue';view.shell.prepend(questionQueue);}
  const questions=chatQuestions(run),questionOptions={answer:options.answerQuestion,notify:options.notify};
  mountQuestionQueue(questionQueue,run,{...questionOptions,jump:async question=>{
    view.following=false;
    while(question.eventIndex<view.eventStart&&view.more){const before=view.eventStart;await view.loadEarlier(true);if(view.eventStart===before)break;}
    const node=[...view.messages.querySelectorAll('[data-question-id]')].find(node=>node.dataset.questionId===question.id);
    if(node){node.scrollIntoView({block:'center'});node.querySelector('textarea')?.focus({preventScroll:true});view.top=view.scroll.scrollTop;}
    else options.notify?.('Load earlier messages to view this question.');
  }});
  const entries = activityEntries([...run.events.slice(view.renderStart-transportStart).map((event, index) => ({ key: `event-${view.renderStart+index}`, ...event })), ...Object.entries(run.liveMessages || {}).map(([id, text]) => ({ key: `stream-${id}`, role: 'assistant', text, streaming: true,data:{turnId:run.turns?.at(-1)?.id} }))].filter(entry => entry.role !== 'assistant' || entry.text?.trim()),run);
  const nodes = new Map([...view.messages.children].map(node => [node.dataset.key, node]));
  const firstAssistants=firstAssistantKeys(entries,run.events),turnsById=new Map((run.turns||[]).map(turn=>[turn.id,turn]));
  let next=view.messages.firstElementChild;
  const place=node=>{if(node===next)next=next.nextElementSibling;else view.messages.insertBefore(node,next);};
  for (const entry of entries) {
    let node = nodes.get(entry.key);
    if(entry.role==='activity'){
      if(!node){node=document.createElement('details');node.dataset.key=entry.key;node.className='activity-group';node.innerHTML='<summary></summary><div class="activity-group-items"></div>';}
      node.dataset.eventEnd=String((eventIndex(entry.items.at(-1)?.key)??eventIndex(entry.key))+1);
      const tools=entry.items.filter(item=>item.data?.tool).map(item=>normalizedTool(item.data.tool)), approvals=entry.items.filter(item=>item.data?.permission?.automatic),decisions=entry.items.filter(item=>item.data?.permission&&!item.data.permission.automatic),systems=entry.items.filter(item=>!item.data?.tool&&!item.data?.permission&&!item.data?.activityNote&&!item.data?.activity&&item.role!=='tool'),thinking=entry.items.filter(item=>item.data?.activityNote?.kind==='thinking').length,phases=entry.items.filter(item=>item.data?.activity&&item.data.activity.kind!=='usage').length,usage=entry.items.filter(item=>item.data?.activity?.kind==='usage').length;
      node.classList.toggle('running',tools.some(tool=>tool.status==='running'));
      if(entry.items.some(item=>item.data?.activity?.status==='running')&&['running','awaiting_input'].includes(run.status))node.classList.add('running');
      node.classList.toggle('failed',tools.some(tool=>['failed','error','interrupted'].includes(tool.status)));
      node.querySelector('summary').textContent=activitySummary(tools,approvals.length,decisions.length,systems.length)+(thinking?` · ${thinking} thinking ${thinking===1?'notice':'notices'}`:'')+(phases?` · ${phases} ${phases===1?'phase':'phases'}`:'')+(usage?' · usage':'');if(tools.length){const groupTimer=document.createElement('span');node.querySelector('summary').append(groupTimer);if(thinking||phases)groupTimer.before(document.createTextNode(' · Tools '));bindRuntimeTimer(groupTimer,()=>durationText(groupDuration(tools,now(),view.verified,run.turns)),tools.some(tool=>tool.status==='running'&&!tool.finishedAt));}
      node.populateActivity=()=>{
        if(!node.open)return;
        const signature=JSON.stringify(entry.items.map(item=>[item.key,item.role,item.at,item.text,item.data]));
        if(node.activitySignature!==signature){
        const content=node.querySelector('.activity-group-items');view.activityDisclosures ||= new Set();rememberDisclosures(content,view.activityDisclosures);content.replaceChildren();
        for(const item of entry.items){
          const row=document.createElement('div');row.className='activity-group-item';row.dataset.activityKey=item.key;
          if(item.data?.activity){
            mountProviderActivity(row,item,run,{...options,time:options.activityTime||options.time,verified:view.verified,now,disclosures:view.activityDisclosures,resize:view.position});
          }else if(item.data?.tool||item.role==='tool'){
            const tool=normalizedTool(item.data?.tool||{name:'Tool output',status:'output',output:item.text}),presentation=tool.presentation||toolPresentation(tool);row.classList.add(tool.status||'completed');
            const title=document.createElement('strong'),icon=document.createElement('span');icon.className='tool-icon'+(tool.status==='running'?' spinner':'');icon.setAttribute('aria-hidden','true');icon.textContent=tool.status==='running'?'':tool.status==='completed'?'✓':'!';title.append(icon,document.createTextNode(' '+(tool.summary||tool.name||'Tool')));row.append(title);
            const status=document.createElement('div');status.className='note';const at=toolEventTime(tool,item);status.textContent=(tool.status==='running'?'Working…':tool.status==='failed'?'Failed':tool.status==='completed'?'Completed':tool.status)+(at?' · '+(options.activityTime||options.time)(at):' · Completion time unavailable');row.append(status);const timer=document.createElement('span');status.append(timer);bindRuntimeTimer(timer,()=>durationText(toolDuration(tool,now(),view.verified,run.turns)),tool.status==='running'&&!tool.finishedAt&&!Number.isFinite(tool.durationMs));
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
          }else if(item.data?.activityNote){
            const note=item.data.activityNote;row.classList.add('activity-note');
            const title=document.createElement('strong');title.textContent=note.label;row.append(title);
            const stamp=document.createElement('div');stamp.className='note';stamp.textContent=note.source+(item.at?' · '+(options.activityTime||options.time)(item.at):' · Time not recorded');row.append(stamp);
            const details=document.createElement('details');details.dataset.disclosureKey=item.key+':activity-note';details.open=view.activityDisclosures.has(details.dataset.disclosureKey);
            const summary=document.createElement('summary');summary.textContent='Original saved event';const text=document.createElement('pre');text.textContent=item.text||'';const explanation=document.createElement('p');explanation.className='note';explanation.textContent='This is a saved status notice. Reasoning text and phase duration were not recorded.';details.append(summary,text,explanation);row.append(details);
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
      node.querySelector('.tool-status').textContent = tool.status;const toolTimer=document.createElement('span');node.querySelector('.tool-status').append(toolTimer);bindRuntimeTimer(toolTimer,()=>durationText(toolDuration(tool,now(),view.verified,run.turns)),tool.status==='running'&&!tool.finishedAt&&!Number.isFinite(tool.durationMs));
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
    if(eventIndex(entry.key)!==null)node.dataset.eventEnd=String(eventIndex(entry.key)+1);
    node.messageMarkdown=entry.text||'';
    node.className = `message ${['user', 'assistant', 'tool', 'system'].includes(entry.role) ? entry.role : 'system'}`;
    node.firstChild.textContent = `${entry.data?.delivery ? ({queued:'Queued next',steered:'Steering',sending:'Sending steering',failed:'Not delivered',removed:'Removed from queue',delivered:'Queued message delivered'}[entry.data.delivery.state] || '') + ' · ' : ''}${entry.role === 'assistant' ? assistantName(run, entry) : entry.role}${entry.streaming ? ' · streaming' : entry.at ? ' · ' + options.time(entry.at) : ''}`;
    if(entry.data?.question){node.classList.add('agent-question');node.firstChild.textContent=`${agentName(run)} · Question · ${entry.data.question.status||'pending'}${entry.at?' · '+options.time(entry.at):''}`;node.dataset.requestId=entry.data.question.id;}
    if(entry.data?.questionReply)node.dataset.requestId=entry.data.questionReply.requestId;
    if(entry.data?.agentFeedback)node.firstChild.textContent=`Task feedback${entry.at?' · '+options.time(entry.at):''}`;
    if(entry.role==='assistant'){
      const turn=turnsById.get(entry.data?.turnId)||(entry.streaming?run.turns?.at(-1):null);
      if(firstAssistants.has(entry.key)){const timer=document.createElement('span');node.firstChild.append(timer);bindRuntimeTimer(timer,()=>durationText(turnDuration(turn,now(),view.verified))+(turn?.incomplete?' · partial':''),!!turn?.activeSince);}
    }
    if(entry.data?.permission&&!entry.data.permission.automatic){let details=node.querySelector('.permission-original');if(!details){details=document.createElement('details');details.className='permission-original';node.append(details);}details.replaceChildren();const summary=document.createElement('summary');summary.textContent=entry.data.permission.intention||'Original approval request';const pre=document.createElement('pre');pre.textContent=entry.data.permission.request||'Original request was not recorded by this version.';details.append(summary,pre);}
    const body=node.querySelector('.text');
    ProteusMarkdown.mount(body, entry.text, { ...options, resize: view.position });
    const index=eventIndex(entry.key),eventQuestions=questions.filter(question=>question.eventIndex===index);
    let questionCards=node.querySelector('.user-question-cards');
    if(eventQuestions.length&&options.answerQuestion){if(!questionCards){questionCards=document.createElement('div');questionCards.className='user-question-cards';node.append(questionCards);}for(const question of eventQuestions){let card=[...questionCards.children].find(card=>card.dataset.questionId===question.id);if(!card){card=document.createElement('div');questionCards.append(card);}mountQuestionCard(card,question,{...questionOptions,key:run.id+':'+question.id});}}else questionCards?.remove();
    if(run.schedule.provider==='mtplx'&&entry.role==='assistant'&&!entry.streaming)mountSvgPreviews(body,{resize:view.position});
    mountChatRecovery(node,entry,run,{...options,resize:view.position});
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
export function forgetConversation(id) { const view = views.get(id); view?.observer.disconnect();disposeRuntimeTimers(view?.shell);view?.messages.querySelectorAll('.message').forEach(node=>node.messageActions?.destroy()); if (view) cancelAnimationFrame(view.frames); views.delete(id); }

export function setConversationVerified(id,verified){const view=views.get(id);if(view){view.verified=verified;refreshRuntimeTimers(view.shell);refreshRuntimeTimers(document.querySelector('[data-runtime-total]')?.parentElement);}}
