import { requestPresentation, mountStructured } from './tool-presentation.js';
import { mountUsage } from './usage.js';
import { conversation, forgetConversation } from './conversation.js';
import { renderRemote } from './remote.js';
import { initFeatures, renderContext, renderStandup, renderCredentials, fillBrowserLogin, contextPicker, contextSelection, bindContextPicker, modelPicker, modelControls, modelSelection, contextSize, refreshModels, sessionDetails, bindSessionDetails, bindPaths } from './features.js';
const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const state = { data: null, page: 'schedules', selected: null, tab: 'overview', tabs: [{ id: 'overview', label: 'Schedules', type: 'overview' }], draft: null, dirty: false, signature: '', markdown: null };
const friendly = value => ({ awaiting_input:'Needs feedback', completed:'Turn complete', queued:'Queued', running:'Running', cancelled:'Cancelled', interrupted:'Interrupted', failed:'Failed' }[value] || value);
const badge = status => `<span class="badge ${escape(status)}">${escape(friendly(status))}</span>`;
const time = (value, timezone) => new Date(value).toLocaleString(undefined, { ...(timezone ? { timeZone: timezone } : {}), month:'short', day:'numeric', hour:'numeric', minute:'2-digit' });
let toastTimer, usageValue = null, usageBusy = false;
const renderUsage = () => mountUsage($('#copilot-usage'), usageValue, () => refreshUsage(true), usageBusy);
async function refreshUsage(force = false) {
  if (usageBusy) return;
  usageBusy = true; renderUsage();
  try { usageValue = await api('/api/usage', { force }); }
  catch (error) { usageValue = { ...usageValue, error: error.message }; }
  finally { usageBusy = false; renderUsage(); }
}
function toast(text) { $('#toast').textContent = text; $('#toast').style.display = 'block'; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').style.display = 'none', 5500); }
async function api(url, data) {
  const response = await fetch(url, data === undefined ? {} : { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(data) });
  const result = await response.json(); if (!response.ok) throw new Error(result.error || response.statusText); return result;
}
async function refresh(force = false) {
  if (!force && window.getSelection()?.isCollapsed === false) return;
  const data = await api('/api/state'); const signature = JSON.stringify(data);
  state.data = data;
  if (force || signature !== state.signature) { state.signature = signature; render(); }
}
function openTab(tab) {
  if (!state.tabs.some(item => item.id === tab.id)) state.tabs.push(tab);
  state.tab = tab.id; state.selected = tab.id; render();
}
async function schedule(id) {
  try { state.data = await api('/api/state'); } catch (error) { toast(error.message); return; }
  const value = state.data.schedules.find(s => s.id === id); if (!value || value.error) return toast(value?.error || 'Schedule missing.');
  state.draft = structuredClone(value); state.dirty = false;
  openTab({ id, label:value.name, type:'schedule' });
}
function runTab(run) { state.page = 'runs'; openTab({ id:run.id, label:run.title, type:'run' }); }
function render() {
  const data = state.data; if (!data) return;
  const waiting = data.runs.filter(r => ['awaiting_input','failed','interrupted'].includes(r.status)).length;
  $('#sidebar').innerHTML = `<div class="brand"><span class="brandmark">⤨</span>Proteus</div><div class="subtitle">Your agent control room</div>${[
    ['schedules','◷','Schedules', data.schedules.length], ['runs','◉','Run history', data.runs.length], ['attention','◇','Needs attention',waiting], ['context','▦','Workspaces',''], ['standup','☷','Standup',''], ['credentials','⚿','Credentials',''], ['providers','⌘','Providers',''], ['remote','⇄','Remote access',''], ['settings','⚙','Settings','']
  ].map(([id,icon,label,count]) => `<button class="navitem ${state.page === id ? 'active':''}" data-page="${id}"><span><span>${icon}</span><span class="navlabel">${label}</span></span>${count !== '' ? `<span class="count">${count}</span>`:''}</button>`).join('')}<div class="sidebottom"><section id="copilot-usage" aria-label="Copilot account usage"></section><div><span class="dot"></span>Local runner online</div><p>Prototype · v${data.version}<br>${data.scheduler.background ? 'Keeps running in the menu bar.' : 'Runs while the host is running.'}</p><button class="subtle" id="data-folder">Open data folder ↗</button></div>`;
  renderUsage();
  $('#topbar').innerHTML = `<div><span class="eyebrow">Local workspace</span><div class="small muted">Plain files. Your tools. Your schedule.</div></div><div class="actions"><button id="markdown">＋ Markdown</button><button id="browser">＋ Browser</button><button class="primary" id="new-chat">＋ New chat</button></div>`;
  renderTabs();
  $('#main').classList.remove('browser-main', 'run-main');
  const tab = state.tabs.find(t => t.id === state.tab);
  if (tab?.type === 'schedule') renderSchedule(tab.id);
  else if (tab?.type === 'run') renderRun(tab.id);
  else if (tab?.type === 'browser') renderBrowser();
  else if (tab?.type === 'markdown') renderMarkdown();
  else if (tab?.type === 'standup' || state.page === 'standup') renderStandup();
  else if (state.page === 'context') renderContext();
  else if (state.page === 'credentials') renderCredentials();
  else if (state.page === 'remote') renderRemote({ api, escape, toast });
  else if (state.page === 'settings') renderSettings();
  else if (state.page === 'providers') renderProviders();
  else if (state.page === 'runs' || state.page === 'attention') renderRuns();
  else renderOverview();
  document.querySelectorAll('[data-page]').forEach(button => button.onclick = () => { state.page = button.dataset.page; if (state.page === 'standup') { openTab({ id: 'standup', type: 'standup', label: 'Standup' }); return; } state.tab = 'overview'; state.tabs[0].label = button.querySelector('.navlabel').textContent; render(); });
  $('#new-chat').onclick = chatDialog; $('#browser').onclick = async () => { try { if (!window.desktop) throw new Error('Open the desktop app to use browser tabs.'); const info = await window.desktop.browser({action:'create'}); openTab({id:info.id,type:'browser',label:info.title || 'New tab',info}); } catch(e) { toast(e.message); } };
  $('#markdown').onclick = markdownDialog;
  $('#data-folder').onclick = () => window.desktop ? window.desktop.openPath(data.home) : toast(data.home);
  if (tab?.type !== 'browser') window.desktop?.browser({action:'hide'}).catch(e=>toast(e.message));
}
function renderOverview() {
  const data = state.data;
  $('#main').innerHTML = `<div class="heading"><div><div class="eyebrow">Set the rhythm</div><h1>Work that keeps moving.</h1><div class="muted">Give recurring work a schedule. Step in when it needs you.</div></div><div class="actions"><button id="import">Import JSON</button><button class="primary" id="new-schedule">＋ New schedule</button></div></div><div class="stats"><div class="stat"><span class="eyebrow">Schedules enabled</span><strong>${data.schedules.filter(s=>s.enabled).length}<span class="muted small"> / ${data.schedules.length}</span></strong></div><div class="stat"><span class="eyebrow">Runs recorded</span><strong>${data.runs.length}</strong></div><div class="stat"><span class="eyebrow">Waiting for you</span><strong>${data.runs.filter(r=>r.status==='awaiting_input').length}</strong></div></div><div class="card"><div class="heading"><h2>Your schedules</h2><span class="pill">JSON files · Live reload</span></div><table><thead><tr><th>Schedule</th><th>Cadence</th><th>Provider</th><th>Status</th><th></th></tr></thead><tbody>${data.schedules.map(s=>`<tr class="clickable" data-schedule="${escape(s.id)}"><td><strong>${escape(s.name || s.id)}</strong><div class="muted">${escape(s.error || s.workspace?.cwd.split('/').pop())}</div></td><td><code>${escape(s.cron || 'Invalid file')}</code><div class="muted">${escape(s.timezone || '')}</div></td><td>${escape(s.provider === 'rehearsal' ? 'Local rehearsal' : s.provider)}<div class="muted">${escape(s.model || 'No model usage')}</div></td><td>${badge(s.error ? 'failed' : s.enabled ? 'Enabled' : 'Paused')}</td><td>↗</td></tr>`).join('')}</tbody></table></div><p class="note">Edit schedule files in your editor or with an AI agent. Changes are validated before execution. Imported schedules start paused.</p>${data.schedulerErrors.length ? `<div class="banner">Scheduler: ${escape(data.schedulerErrors.at(-1).error)}</div>` : ''}${data.recoveryErrors.length ? `<div class="banner">Some run files could not be loaded. Inspect the data folder before continuing.</div>` : ''}`;
  document.querySelectorAll('[data-schedule]').forEach(el=>el.onclick=()=>schedule(el.dataset.schedule));
  $('#new-schedule').onclick = newSchedule; $('#import').onclick = importDialog;
}
function renderSchedule(id) {
  const contextOpen = $('#schedule-context')?.open;
  const original = state.data.schedules.find(s=>s.id===id);
  if (!original || original.error) { $('#main').innerHTML = `<div class="banner">${escape(original?.error || 'Schedule no longer exists.')}</div>`; return; }
  if (!state.draft || state.draft.id !== id || (!state.dirty && state.draft.revision !== original.revision)) state.draft = structuredClone(original);
  const s = state.draft;
  $('#main').innerHTML = `<div class="heading"><div><div class="eyebrow">Schedule / ${escape(s.id)}</div><h1>${escape(s.name)}</h1><div class="muted">${escape(s.provider === 'rehearsal' ? 'A no-cost rehearsal of scheduling, feedback, and continuation.' : 'A persistent conversation for every run.')}</div></div><div class="actions">${badge(s.enabled?'Enabled':'Paused')}<button class="primary" id="run-now">▶ Run now</button></div></div><p class="note">${s.source?.manifest ? `Owned by ${escape(s.source.system)} · Edit this source, then export/reconcile it into Proteus: <span class="filepath">${escape(s.source.manifest)}</span><button id="source-file">Open source manifest ↗</button><br>Proteus reads this exported schedule file: <span class="filepath">${escape(original.file)}</span>` : `App-owned schedule · ${escape(original.file)}`}</p><div class="grid"><section class="card"><h2>Schedule settings</h2>${state.dirty && s.revision !== original.revision ? '<p class="banner" role="status">The file changed outside Proteus. Your unsaved edits are preserved. Reload file to use the current file; saving this older draft is blocked.</p>' : ''}<div class="field"><label for="name">Name</label><input id="name" value="${escape(s.name)}"></div><div class="row"><div><label for="cron">Cron expression</label><input id="cron" class="cron" value="${escape(s.cron)}"></div><div><label for="timezone">Time zone</label><input id="timezone" value="${escape(s.timezone)}"></div></div><div class="row"><div><label for="provider">Provider</label><select id="provider"><option value="rehearsal" ${s.provider==='rehearsal'?'selected':''}>Local rehearsal</option><option value="copilot" ${s.provider==='copilot'?'selected':''}>GitHub Copilot</option><option value="codex" ${s.provider==='codex'?'selected':''}>Codex</option></select></div><div><label for="model">Model ID</label>${modelPicker('model',s.model,s.provider)}<button class="subtle" id="model-refresh">↻ Refresh models</button></div></div>${modelControls('model',s)}<div class="field"><label for="cwd">Workspace directory</label><input id="cwd" value="${escape(s.workspace.cwd)}"></div><div class="field"><label for="roots">Additional directories · one per line</label><textarea id="roots" rows="2">${escape(s.workspace.additionalDirectories.join('\n'))}</textarea></div><div class="field"><label for="prompt">Instructions</label><textarea id="prompt" rows="5">${escape(s.prompt)}</textarea></div><div class="row"><div><label for="misfire">After missed runs</label><select id="misfire"><option value="skip" ${s.misfire==='skip'?'selected':''}>Wait for the next scheduled time</option><option value="coalesce" ${s.misfire==='coalesce'?'selected':''}>Catch up once when available</option></select></div><div><label for="enabled">Execution</label><select id="enabled"><option value="false" ${!s.enabled?'selected':''}>Paused</option><option value="true" ${s.enabled?'selected':''}>Enabled</option></select></div></div>${contextPicker(s.contextSelection?.selectedIds || [], 'schedule', s.contextSelection || {})}<div class="formfooter"><span class="note" id="save-state">${state.dirty?'Unsaved changes':'Saved as a plain JSON file'}</span><div class="actions"><button id="reload">Reload file</button><button class="primary" id="save">Save schedule</button></div></div></section><div class="stack"><section class="card"><div class="heading"><h2>Next five runs</h2><button class="subtle" id="preview">↻ Preview</button></div><ul id="next-runs" class="nextlist">${(s.nextRuns || []).map((date,i)=>`<li><span class="muted">${i===0?'Next':String(i+1).padStart(2,'0')}</span><span>${escape(time(date,s.timezone))}</span></li>`).join('')}</ul><p class="note">${escape(s.timezone)} · Paused schedules show projected times.</p></section><section class="card"><div class="heading"><h2>The source of truth</h2><button class="subtle" id="open-file">Open file ↗</button></div><div class="filepath">${escape(original.file)}</div><p class="note">Reopening or Reload file reads the latest JSON from disk. External edits refresh automatically while this editor has no unsaved changes. Existing chats keep their captured schedule.</p><pre id="json-preview">${escape(JSON.stringify(clean(s),null,2))}</pre></section></div></div>`;
  const update = () => {
    Object.assign(s,{name:$('#name').value,cron:$('#cron').value,timezone:$('#timezone').value,provider:$('#provider').value,model:$('#model').value,...modelSelection('model'),prompt:$('#prompt').value,misfire:$('#misfire').value,enabled:$('#enabled').value==='true',workspace:{cwd:$('#cwd').value,additionalDirectories:$('#roots').value.split('\n').map(x=>x.trim()).filter(Boolean)}});
    if ($('#schedule-context')) s.contextSelection = { ...s.contextSelection, ...contextSelection('schedule') };
    state.dirty=true; $('#save-state').textContent='Unsaved changes'; $('#json-preview').textContent=JSON.stringify(clean(s),null,2);
  };
  document.querySelectorAll('#main input,#main textarea,#main select').forEach(el=>{ if (!el.closest('.context-picker')) el.addEventListener('input',()=>{update();$('#schedule-context').updatePreview();}); });
  bindContextPicker('schedule', { workspace: () => s.workspace, onChange: update });
  if (contextOpen) $('#schedule-context').open = true;
  $('#model-refresh').onclick=()=>refreshModels('model','provider',true);
  $('#provider').addEventListener('change',()=>refreshModels('model','provider'));
  void refreshModels('model','provider');
  $('#preview').onclick=async()=>{try{const data=await api('/api/preview',{cron:s.cron,timezone:s.timezone});$('#next-runs').innerHTML=data.nextRuns.map((d,i)=>`<li><span class="muted">${i+1}</span><span>${escape(time(d,s.timezone))}</span></li>`).join('');}catch(e){toast(e.message);}};
  $('#save').onclick=async()=>{try{await api('/api/schedules',{schedule:clean(s),expectedRevision:s.revision});state.dirty=false;await refresh(true);toast('Schedule saved.');}catch(e){toast(e.message);}};
  $('#reload').onclick=()=>schedule(id);
  $('#run-now').onclick=async()=>{try{if(state.dirty)throw new Error('Save your changes before running.');const run=await api('/api/run',{id});await refresh();runTab(run);}catch(e){toast(e.message);}};
  $('#source-file')?.addEventListener('click',()=>window.desktop?window.desktop.openPath(s.source.manifest):toast(s.source.manifest));
  $('#open-file').onclick=()=>window.desktop?window.desktop.openPath(original.file):toast(original.file);
}
function clean(s) { const result=structuredClone(s); for(const key of ['file','revision','nextRuns','error'])delete result[key];return result; }
function renderRuns() {
  const runs=state.data.runs.filter(r=>state.page!=='attention'||['awaiting_input','failed','interrupted'].includes(r.status));
  $('#main').innerHTML=`<div class="heading"><div><div class="eyebrow">Every run has a story</div><h1>${state.page==='attention'?'Ready for your input.':'Pick up where you left off.'}</h1><div class="muted">Open any run to inspect its history or continue the conversation.</div></div></div><div class="card">${runs.length?`<table><thead><tr><th>Run</th><th>Started</th><th>Provider</th><th>Status</th><th>Tokens</th></tr></thead><tbody>${runs.map(r=>`<tr class="clickable" data-run="${r.id}"><td><strong>${escape(r.title)}</strong><div class="muted">${escape(r.trigger)} · ${r.id.slice(0,8)}</div></td><td>${time(r.createdAt)}</td><td>${escape(r.schedule.provider)}</td><td>${badge(r.status)}</td><td>${r.usage.observed?(r.usage.inputTokens+r.usage.outputTokens).toLocaleString():'—'}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">No runs here yet.<br>Open a schedule and choose Run now to try the feedback flow.</div>'}</div>`;
  document.querySelectorAll('[data-run]').forEach(el=>el.onclick=()=>runTab(state.data.runs.find(r=>r.id===el.dataset.run)));
}
function renderRun(id) {
  $('#main').classList.add('run-main');
  $('#main').classList.toggle('show-chat-details', !!state.showChatDetails);
  state.detailScroll ??= {};
  const previousDetails = $('.chat-details');
  if (previousDetails) state.detailScroll[previousDetails.dataset.runId] = previousDetails.scrollTop;
  const run=state.data.runs.find(r=>r.id===id);if(!run)return;
  const pending=run.pending;
  const active=['queued','running','awaiting_input'].includes(run.status);
  const composerFocus=document.activeElement?.id==='followup';const cursor=$('#followup')?.selectionStart;
  state.chatDrafts ??= {};state.chatModelDrafts ??= {};
  const modelDraft = state.chatModelDrafts[id] || run.nextModelOptions || run.schedule;
  $('#main').innerHTML=`<div class="heading"><div><div class="eyebrow">${escape(run.schedule.provider)} / ${run.id.slice(0,8)}</div><h1>${escape(run.title)}</h1><div class="muted">${time(run.createdAt)} · ${escape(run.schedule.model || 'Local rehearsal, no AI calls')}</div></div><div class="actions"><button id="toggle-chat-details">${state.showChatDetails?'Chat':'Details'}</button>${badge(run.status)}</div></div><div class="grid chat-grid"><section class="card chat-pane"><div id="conversation-host"></div>${pending?`<div class="pending"><div class="eyebrow">Your input is needed</div><p>${escape(pending.question)}</p>${pending.details?`<div id="request-summary"></div><details class="raw-details"><summary>Raw request</summary><pre>${escape(JSON.stringify(pending.details,null,2))}</pre></details>`:''}${pending.type==='permission'?'<div class="actions"><button id="deny">Deny</button><button class="primary" id="approve">Approve once</button></div>'+permissionChoices(pending):`<textarea id="answer" placeholder="Add your feedback…" rows="2"></textarea><div class="actions"><button class="primary" id="reply">Send feedback</button></div>`}</div>`:run.status==='running'?'<p class="note" role="status"><span class="spinner" aria-hidden="true"></span>Working… you can queue a message or steer this turn.</p>':''}<div class="composer"><textarea id="followup" placeholder="${active?'Add an update while this runs…':'Continue this conversation…'}" rows="2">${escape(state.chatDrafts[id]||'')}</textarea><div class="composer-footer"><div class="composer-models" ${run.schedule.provider==='rehearsal'?'hidden':''}><input type="hidden" id="run-provider" value="${escape(run.schedule.provider)}">${modelPicker('run-model',modelDraft.model,run.schedule.provider)}${modelControls('run-model',modelDraft,true)}<button class="subtle" id="run-model-refresh" aria-label="Refresh model choices" title="Refresh model choices">↻</button></div><div class="composer-actions">${active?`<button id="steer" title="Send into the running turn using its current model settings" ${run.status!=='running'?'disabled':''}>Steer</button>`:''}<button class="primary" id="continue" title="${active?'Send after the current turn finishes':'Send message'}">${active?'Queue':'Send ↑'}</button>${['running','awaiting_input'].includes(run.status)?'<button class="danger" id="cancel" title="Stop the running turn">Stop</button>':''}</div></div>${run.queuedMessages?.length?`<p class="note">${run.queuedMessages.length} message(s) queued for after this turn.</p>${run.queuedMessages.map(m=>`<div class="queued-message"><span>${escape(m.prompt.slice(0,120))}</span><button data-remove-message="${escape(m.id)}" aria-label="Remove queued message">×</button></div>`).join('')}`:''}</div></section><div class="stack chat-details"><section class="card"><h2>Run details</h2>${permissionControls(run.permissionContext,{runId:run.id})}<p class="note">${run.automaticApprovals || 0} tool requests approved automatically. Approval details are retained in the run record.</p><p class="note">The original schedule and earlier context versions are retained when you refresh this chat.</p><div class="filepath">${[run.schedule.workspace.cwd,...run.schedule.workspace.additionalDirectories].map(escape).join('<br>')}</div><hr class="divider"><div class="usagegrid"><div class="usagebox"><span class="eyebrow">Input tokens</span><strong>${run.usage.observed?run.usage.inputTokens.toLocaleString():'—'}</strong></div><div class="usagebox"><span class="eyebrow">Output tokens</span><strong>${run.usage.observed?run.usage.outputTokens.toLocaleString():'—'}</strong></div></div><p class="note">${run.usage.observed?'Observed provider usage.':'No provider usage reported. Rehearsals make no model calls.'}</p><div class="note">${run.providerSessionId?'Provider session: '+escape(run.providerSessionId):'Session history saved locally.'}</div></section>${run.schedule.provider === 'copilot' ? `<section class="card"><h2>MCP connections</h2><p class="note">Connect selected integrations such as Atlassian. Sign-in opens on this Mac; the provider stores tokens outside chat.</p><button id="mcp-connections">Manage connections</button></section>` : ''}${sessionDetails(run)}<section class="card"><h2>Completion means a turn ended</h2><p class="note">Workflow completion still depends on its own validation and source coverage. A model finishing its response doesn’t certify external work.</p><details><summary>Schedule snapshot</summary><pre>${escape(JSON.stringify(run.schedule,null,2))}</pre></details></section></div></div>`;
  conversation($('#conversation-host'), run, {
    time, copy: text => window.desktop ? window.desktop.copyText(text) : navigator.clipboard.writeText(text),
    link: source => openMessageLink(source, run.schedule.workspace.cwd),
    image: async source => (await api('/api/chat-image', { id: run.id, source })).dataURL
  });
  const details = $('.chat-details'); details.dataset.runId = id; details.scrollTop = state.detailScroll[id] || 0;
  details.addEventListener('scroll', () => state.detailScroll[id] = details.scrollTop, { passive: true });
  $('#toggle-chat-details').onclick=()=>{state.showChatDetails=!state.showChatDetails;renderRun(id);};
  bindSessionDetails(run);
  $('#mcp-connections')?.addEventListener('click',()=>manageMcp(run));
  if($('#request-summary'))mountStructured($('#request-summary'),requestPresentation(pending.details));
  const updateButtons=()=>{ const empty=!$('#followup').value.trim(); $('#continue').disabled=empty; if($('#steer'))$('#steer').disabled=empty || run.status!=='running'; };
  $('#followup').oninput=()=>{state.chatDrafts[id]=$('#followup').value;updateButtons();}; updateButtons();
  refreshModels('run-model','run-provider');
  $('.composer-models').addEventListener('change',()=>{state.chatModelDrafts[id]={model:$('#run-model').value,...modelSelection('run-model')};});
  $('#run-model-refresh').onclick=()=>refreshModels('run-model','run-provider',true);
  if(composerFocus){$('#followup').focus();$('#followup').setSelectionRange(cursor,cursor);}
  const submit=async(action,data)=>{try{await api(`/api/runs/${id}/${action}`,data);await refresh(true);}catch(e){toast(e.message);}};
  $('#cancel')?.addEventListener('click',()=>submit('cancel',{}));
  $('#reply')?.addEventListener('click',()=>submit('reply',{answer:$('#answer').value,requestId:pending.id}));
  $('#approve')?.addEventListener('click',()=>submit('reply',{answer:'approve',requestId:pending.id}));
  $('#deny')?.addEventListener('click',()=>submit('reply',{answer:'deny',requestId:pending.id}));
  document.querySelectorAll('[data-permission-answer]').forEach(button=>button.onclick=()=>submit('reply',{answer:button.dataset.permissionAnswer,requestId:pending.id}));
  bindPermissionControls();
  const sendMessage=async mode=>{const text=$('#followup').value;const modelOptions={model:$('#run-model').value,...modelSelection('run-model')};try{await api(`/api/runs/${id}/send`,{prompt:text,mode,messageId:crypto.randomUUID(),...(mode==='queue'&&run.schedule.provider!=='rehearsal'?{modelOptions}:{})});state.chatDrafts[id]='';if(mode==='queue')delete state.chatModelDrafts[id];await refresh(true);}catch(e){toast(e.message);}};
  $('#continue').onclick=()=>sendMessage('queue');
  $('#steer')?.addEventListener('click',()=>sendMessage('steer'));
  document.querySelectorAll('[data-remove-message]').forEach(button=>button.onclick=()=>submit('remove-queued',{messageId:button.dataset.removeMessage}));
}
function quotaCards(quota) {
  return Object.entries(quota?.quotaSnapshots || {}).filter(([,q])=>q).map(([name,q])=>{
    const remaining=Number.isFinite(q.remainingPercentage)?Math.max(0,Math.min(100,q.remainingPercentage)):null;
    return `<div class="quota"><div class="heading"><span>${escape(name.replaceAll('_',' '))}</span><strong>${q.isUnlimitedEntitlement?'Unlimited':remaining===null?'Unavailable':remaining.toFixed(1)+'% remaining'}</strong></div>${!q.isUnlimitedEntitlement&&remaining!==null?`<progress max="100" value="${remaining}" aria-label="${escape(name)} quota remaining"></progress>`:''}<div class="note">${q.resetDate?'Resets '+escape(time(q.resetDate)):''}</div></div>`;
  }).join('');
}
function renderProviders() {
  const statuses=state.data.providerStatuses || {copilot:state.data.providerStatus};
  $('#main').innerHTML=`<div class="heading"><div><div class="eyebrow">Bring your own engine</div><h1>Providers & usage.</h1><div class="muted">Separate sign-ins and live capabilities for each provider.</div></div></div><div class="grid">${[['copilot','GitHub Copilot'],['codex','Codex']].map(([id,name])=>{
    const p=statuses[id];return `<section class="card"><div class="heading"><h2>${name}</h2>${badge(p?.available?'Connected':p?'Unavailable':'Not checked')}</div><p class="note">${id==='copilot'?'Uses the official Copilot SDK and your Copilot account.':'Uses the installed Codex CLI and its existing sign-in. Run codex login on this Mac if needed. Proteus sessions use your selected workspace directly.'}</p><button data-refresh-provider="${id}">Refresh connection & models</button>${p?.error?`<p class="banner">${escape(p.error)}</p>`:''}<p class="note">${p?.checkedAt?'Checked '+escape(time(p.checkedAt)):'Not checked'} · refreshes at launch and every five minutes</p>${id==='copilot'?quotaCards(p?.quota):'<p class="note">Account allowance is managed by Codex. Per-run token usage appears in chat details.</p>'}<ul class="nextlist">${(p?.models || []).map(m=>`<li><span>${escape(m.name||m.id)}</span><div><code>${escape(m.id)}</code><div class="note">Effort: ${escape(m.controls?.reasoningEfforts?.join(', ') || 'Not reported')}<br>${(m.controls?.contextTiers || []).map(t=>escape(contextSize(t))).join('<br>')}<br>Speed: ${escape((m.controls?.serviceTiers || []).map(t=>t.name||t.id).join(', ') || 'Provider default')}</div></div></li>`).join('')}</ul>${id==='codex'?'<p class="note">Selected instructions and skills are supplied as context. Agent prompts work when they do not declare editor-specific tool filters. Codex grants MCP access per selected server; each provider has separate workspace approvals. Chats remain with their original provider.</p>':''}</section>`;
  }).join('')}</div>`;
  document.querySelectorAll('[data-refresh-provider]').forEach(button=>button.onclick=async()=>{button.disabled=true;try{await api('/api/provider',{provider:button.dataset.refreshProvider,force:true});await refresh(true);}catch(e){toast(e.message);button.disabled=false;}});
}
async function manageMcp(run) {
  showDialog(`<h2>MCP connections</h2><p class="note">Sign in on the Mac, then refresh the connection. Continue or steer the chat to retry its work.</p><div id="mcp-list">Loading connections…</div><div class="actions"><button id="close-dialog">Close</button><button id="dialog-submit">Refresh connections</button></div>`,()=>{});
  const load=async()=>{try {const value=await api('/api/mcp',{runId:run.id,action:'status'}); $('#mcp-list').innerHTML=value.servers.map(s=>`<section class="card"><strong>${escape(s.name)}</strong> ${badge(s.status)}${s.error?`<p class="note">${escape(s.error)}</p>`:''}${s.remote?`<button data-connect-mcp="${escape(s.name)}">Connect / sign in</button>`:''}</section>`).join('') || '<p>No selected MCP servers.</p>';document.querySelectorAll('[data-connect-mcp]').forEach(button=>button.onclick=async()=>{button.disabled=true;try{const result=await api('/api/mcp',{runId:run.id,action:'login',server:button.dataset.connectMcp,openOnMac:!!window.desktop});if(result.authorizationUrl)window.open(result.authorizationUrl,'_blank','noopener,noreferrer');toast(result.status==='connected'?'Connected.':'Finish sign-in in the browser on this Mac, then refresh connections.');}catch(e){toast(e.message);}finally{button.disabled=false;}});}catch(e){$('#mcp-list').textContent=e.message;}};
  $('#dialog-submit').onclick=load; await load();
}
function showDialog(html, submit) {
  $('#dialog').innerHTML=html;$('#dialog').showModal();$('#close-dialog').onclick=()=>$('#dialog').close();$('#dialog-submit').onclick=async()=>{try{await submit();$('#dialog').close();await refresh(true);}catch(e){toast(e.message);}};
}
function chatDialog() {
  const defaults=state.data.settings; const context=state.data.context;
  const profile=context.workspaces.find(w=>w.id===context.defaultWorkspaceId);
  showDialog(`<h2>Start a workspace chat</h2><div class="field"><label>Workspace</label><select id="chat-workspace">${context.workspaces.map(w=>`<option value="${escape(w.id)}" ${w.id===profile.id?'selected':''}>${escape(w.name)}</option>`).join('')}</select></div><div class="field"><label>Command starting folder</label><input id="chat-cwd" value="${escape(profile.cwd)}"></div><details><summary>Workspace folders</summary><textarea id="chat-roots" rows="3">${escape(profile.additionalDirectories.join('\n'))}</textarea></details><div class="row"><div><label>Provider</label><select id="chat-provider"><option value="copilot" ${defaults.provider==='copilot'?'selected':''}>GitHub Copilot</option><option value="codex" ${defaults.provider==='codex'?'selected':''}>Codex</option><option value="rehearsal" ${defaults.provider==='rehearsal'?'selected':''}>Local rehearsal</option></select></div><div><label>Model</label>${modelPicker('chat-model',defaults.model,defaults.provider)}<button class="subtle" id="chat-model-refresh">↻ Refresh models</button></div></div>${modelControls('chat-model',defaults)}${contextPicker()}<div class="field"><label>Message</label><textarea id="chat-prompt" rows="4" placeholder="What would you like to work on?"></textarea></div><div class="actions"><button id="close-dialog">Cancel</button><button class="primary" id="dialog-submit">Start chat</button></div>`,async()=>{
    const run=await api('/api/chat',{workspaceId:$('#chat-workspace').value,workspace:{cwd:$('#chat-cwd').value,additionalDirectories:lines($('#chat-roots').value)},provider:$('#chat-provider').value,model:$('#chat-model').value,...modelSelection('chat-model'),prompt:$('#chat-prompt').value,...contextSelection()});await refresh();runTab(run);
  });
  $('#chat-workspace').onchange=()=>{const workspace=context.workspaces.find(w=>w.id===$('#chat-workspace').value);$('#chat-cwd').value=workspace.cwd;$('#chat-roots').value=workspace.additionalDirectories.join('\n');};
  $('#chat-provider').onchange=()=>refreshModels('chat-model','chat-provider');
  $('#chat-model-refresh').onclick=()=>refreshModels('chat-model','chat-provider',true);
  bindContextPicker('chat', { workspace: () => ({ cwd: $('#chat-cwd').value, additionalDirectories: lines($('#chat-roots').value) }) });
  for (const id of ['chat-cwd', 'chat-roots']) $('#' + id).addEventListener('input', () => $('#chat-context').updatePreview());
  $('#chat-workspace').addEventListener('change', () => $('#chat-context').updatePreview());
  void refreshModels('chat-model','chat-provider');
}

function newSchedule() {
  showDialog('<h2>New schedule</h2><div class="field"><label>Name</label><input id="new-name" placeholder="Weekly workspace review"></div><div class="actions"><button id="close-dialog">Cancel</button><button class="primary" id="dialog-submit">Create paused schedule</button></div>',async()=>{
    const name=$('#new-name').value.trim();if(!name)throw new Error('Enter a name.');const defaults=state.data.settings;
    const id=name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)+'-'+Date.now().toString(36);
    await api('/api/schedules',{schedule:{schemaVersion:1,id,name,enabled:false,cron:'0 9 * * 1-5',timezone:defaults.timezone,provider:defaults.provider,model:defaults.model,reasoningEffort:defaults.reasoningEffort,contextTier:defaults.contextTier,workspace:defaults.workspace,skillDirectories:defaults.skillDirectories,mcpServers:defaults.mcpServers,misfire:'skip',prompt:'Review this workspace and ask for feedback.'}});await refresh();schedule(id);
  });
}
function importDialog() { showDialog('<h2>Import schedules</h2><p class="note">Paste a JSON schedule or array. Imports are always paused.</p><textarea id="import-json" rows="10" placeholder="[{ … }]"></textarea><div class="actions"><button id="close-dialog">Cancel</button><button class="primary" id="dialog-submit">Import</button></div>',async()=>{const value=JSON.parse($('#import-json').value);await api('/api/import',{schedules:Array.isArray(value)?value:[value]});}); }
function markdownDialog() { showDialog('<h2>Open Markdown</h2><p class="note">Choose a file within a configured schedule workspace.</p><input id="markdown-path" placeholder="/absolute/path/README.md"><div class="actions"><button id="close-dialog">Cancel</button><button class="primary" id="dialog-submit">Open tab</button></div>',async()=>{state.markdown=await api('/api/markdown',{file:$('#markdown-path').value});openTab({id:'markdown',type:'markdown',label:state.markdown.file.split('/').pop()});}); }
function renderMarkdown() {
  const markdown=state.tabs.find(t=>t.id===state.tab)?.markdown || state.markdown;
  $('#main').innerHTML=`<div class="heading"><div><div class="eyebrow">Markdown preview</div><h1>${escape(markdown?.file.split('/').pop())}</h1><div class="filepath">${escape(markdown?.file)}</div></div></div><article class="card markdown-preview"></article><details><summary>Markdown source</summary><pre class="markdown">${escape(markdown?.content||'')}</pre></details>`;
  ProteusMarkdown.mount($('.markdown-preview'), markdown?.content || '', {
    copy: text => window.desktop ? window.desktop.copyText(text) : navigator.clipboard.writeText(text),
    link: source => openMessageLink(source, markdown.file.slice(0, markdown.file.lastIndexOf('/'))),
    image: async source => (await api('/api/markdown', { file: markdown.file, image: source })).dataURL
  });
}
async function openMessageLink(source, cwd) {
  try {
    const kind = ProteusMarkdown.linkKind(source);
    if (kind === 'web') {
      if (!window.desktop) { window.open(source, '_blank', 'noopener,noreferrer'); return; }
      const info = await window.desktop.browser({ action: 'create', url: source });
      openTab({ id: info.id, type: 'browser', label: info.title || 'New tab', info });
    } else if (kind === 'file') {
      const file = decodeURIComponent(new URL(source, 'file://' + cwd.replace(/\/$/, '') + '/').pathname);
      if (file.endsWith('.md')) { const markdown = await api('/api/markdown', { file }); openTab({ id: 'markdown:' + file, type: 'markdown', label: file.split('/').pop(), markdown }); }
      else if (window.desktop) await window.desktop.openPath(file);
      else toast(file);
    } else if (kind === 'mail') { await navigator.clipboard.writeText(source.slice(7)); toast('Email address copied.'); }
  } catch (error) { toast(error.message); }
}

function renderTabs() {
  $('#tabs').innerHTML=state.tabs.map(tab=>`<div class="tabitem ${state.tab===tab.id?'selected':''}"><button data-tab="${escape(tab.id)}" title="${escape(tab.info?.url || tab.label)}">${tab.type==='browser' ? (tab.info?.loading?'◌':'◎') : tab.type==='run'?'◉':tab.type==='markdown'?'▤':'◷'} &nbsp;${escape(tab.label || 'New tab')}</button>${tab.id!=='overview'?`<button class="tabclose" aria-label="Close ${escape(tab.label || 'tab')}" data-close="${escape(tab.id)}">×</button>`:''}</div>`).join('');
  document.querySelectorAll('[data-tab]').forEach(button=>button.onclick=()=>{state.tab=button.dataset.tab;const tab=state.tabs.find(t=>t.id===state.tab);if(tab.type==='schedule')schedule(tab.id);else render();});
  document.querySelectorAll('[data-close]').forEach(button=>button.onclick=async()=>{try{const id=button.dataset.close;const tab=state.tabs.find(t=>t.id===id);if(tab?.type==='browser')await window.desktop.browser({action:'close',id});forgetConversation(id);state.tabs=state.tabs.filter(t=>t.id!==id);if(state.tab===id)state.tab='overview';render();}catch(e){toast(e.message);}});
}
function browserBounds() {
  const area=$('#browser-area');const tab=state.tabs.find(t=>t.id===state.tab);if(!area || tab?.type!=='browser')return;
  const r=area.getBoundingClientRect();window.desktop?.browser({action:'show',id:tab.id,bounds:{x:r.x,y:r.y,width:r.width,height:r.height}}).catch(e=>toast(e.message));
}
function updateBrowserControls() {
  const tab=state.tabs.find(t=>t.id===state.tab);if(tab?.type!=='browser'||!$('#browser-url'))return;
  const info=tab.info||{};
  if(document.activeElement!==$('#browser-url'))$('#browser-url').value=info.url||'';
  $('#browser-back').disabled=!info.canGoBack;$('#browser-forward').disabled=!info.canGoForward;
  $('#browser-reload').textContent=info.loading?'×':'↻';$('#browser-reload').title=info.loading?'Stop loading':'Reload';
  $('#browser-share').setAttribute('aria-pressed',String(!!(info.shared||info.owner)));
  $('#browser-share').title=info.shared||info.owner?'Agent access on. You can interact too; turn off to take over privately.':'Private tab. Turn on Agent access to let a run use this page.';
  $('#browser-status').textContent=info.error||'';$('#browser-status').hidden=!info.error;
}
function renderBrowser() {
  $('#main').classList.add('browser-main');
  $('#main').innerHTML='<form class="browserbar" id="browser-form"><button type="button" id="browser-back" aria-label="Back">←</button><button type="button" id="browser-forward" aria-label="Forward">→</button><button type="button" id="browser-reload" aria-label="Reload or stop">↻</button><input id="browser-url" aria-label="Browser address" placeholder="Enter a website address" autocomplete="off" spellcheck="false"><button class="browser-go" type="submit" id="browser-go" aria-label="Load address" title="Load address">↵</button><button type="button" id="browser-fill-login" title="Fill login" aria-label="Fill login">⚿</button><button type="button" id="browser-share" aria-pressed="false">Agent access</button></form><div class="browserstatus" id="browser-status"></div><div id="browser-area" class="browserarea"></div>';
  const command=async(action,extra={})=>{try{await window.desktop.browser({action,id:state.tab,...extra});}catch(e){toast(e.message);}};
  $('#browser-fill-login').onclick=()=>fillBrowserLogin(state.tab);
  $('#browser-form').onsubmit=event=>{event.preventDefault();void command('navigate',{url:$('#browser-url').value});$('#browser-url').blur();};
  $('#browser-url').onfocus=()=>$('#browser-url').select();
  $('#browser-back').onclick=()=>command('back');$('#browser-forward').onclick=()=>command('forward');
  $('#browser-reload').onclick=()=>command(state.tabs.find(t=>t.id===state.tab)?.info?.loading?'stop':'reload');
  $('#browser-share').onclick=()=>command('share',{shared:$('#browser-share').getAttribute('aria-pressed')!=='true'});
  updateBrowserControls();requestAnimationFrame(browserBounds);
}
const lines=value=>value.split('\n').map(s=>s.trim()).filter(Boolean);
const permissionModeNames={ask:'Ask each time',custom:'Saved rules only',trusted:'Trusted workspace',autopilot:'Auto-approve tools'};
const permissionDrafts=new Map();
const displayedMode=context=>context.mode==='trusted'&&!context.readOnlyTools?'custom':context.mode;
function permissionChoices(pending) {
  const choices=pending.permissionChoices || [];
  return `<p class="note">${escape(pending.permissionReason || '')}</p>${choices.length?`<div class="permission-options">${choices.map(choice=>`<button data-permission-answer="${escape(choice.value)}" title="${escape(choice.label)}">${escape(choice.value==='always-tool'&&pending.details?.kind==='shell'?'Always allow this exact command':choice.label)}</button>`).join('')}</div><p class="note">Saved approvals apply to this workspace across chats and schedules. Auto-approve tools includes terminal commands and configured tools; terminal commands are not confined to folders. Enterprise-required approvals and questions still pause.</p>`:''}`;
}
function permissionControls(context, ref) {
  if(!context)return '';
  return `<div class="permission-control" data-context-id="${escape(context.id)}" data-permission-ref="${escape(JSON.stringify(ref))}"><label>Tool approvals</label><div class="actions"><select aria-label="Tool approval mode" data-permission-mode>${Object.entries(permissionModeNames).map(([mode,name])=>`<option value="${mode}" ${(permissionDrafts.get(context.id)||displayedMode(context))===mode?'selected':''}>${name}</option>`).join('')}</select><button data-save-permissions>Apply permissions</button></div><p class="note">Current: <strong>${escape(permissionModeNames[displayedMode(context)])}</strong>. Applying changes takes effect immediately in this chat, including a waiting tool. Saved rules only approves the folders and operations listed below.</p><p class="note">Trusted workspace allows file reads/writes in its folders, read-only MCP calls, and browser reading/navigation. Other operations use saved rules or ask. Auto-approve tools also allows terminal commands and configured tools; commands can access beyond these folders. Questions and enterprise-required approvals still pause.</p><details><summary>Authorized folders and saved rules</summary><ul>${context.folders.map(folder=>`<li><code>${escape(folder.path)}</code> · ${escape(folder.access)}</li>`).join('') || '<li>No folders trusted yet.</li>'}</ul><pre>${escape(JSON.stringify(context.rules,null,2))}</pre></details></div>`;
}
function permissionSettings() {
  const saved=state.data.permissions;
  return `<section class="card permissions-settings"><h2>Workspace permissions</h2><p class="note">Authorize once for chats and schedules with the same provider, roots, skills, and MCP configuration. Changes take effect on the next request, including requests waiting now. Adding a root or changing integrations needs a new authorization.</p><div class="filepath">${escape(saved.file)}</div>${state.data.permissionWorkspaces.map(context=>`<div class="permission-workspace"><h3>${escape(context.label)} <span class="pill">${escape(context.provider)}</span></h3><div class="filepath">${context.roots.map(escape).join('<br>')}</div>${permissionControls(context,context.ref)}</div>`).join('')}<h3>Saved authorizations</h3>${saved.workspaces.length?saved.workspaces.map(profile=>`<div class="permission-saved"><span>${escape(profile.label)} · ${escape(permissionModeNames[displayedMode(profile)])}<br><code>${escape(profile.cwd)}</code></span><button class="danger" data-revoke-permissions="${escape(profile.id)}">Revoke</button></div>`).join(''):'<p class="note">No saved authorizations.</p>'}</section>`;
}
function bindPermissionControls() {
  document.querySelectorAll('[data-permission-mode]').forEach(select=>select.onchange=()=>permissionDrafts.set(select.closest('.permission-control').dataset.contextId,select.value));
  document.querySelectorAll('[data-save-permissions]').forEach(button=>button.onclick=async()=>{
    const control=button.closest('.permission-control');
    try {await api('/api/permissions',{action:'set-mode',...JSON.parse(control.dataset.permissionRef),mode:control.querySelector('[data-permission-mode]').value,expectedContextId:control.dataset.contextId,expectedRevision:state.data.permissions.revision});permissionDrafts.delete(control.dataset.contextId);await refresh(true);toast('Permissions saved.');}catch(error){toast(error.message);}
  });
  document.querySelectorAll('[data-revoke-permissions]').forEach(button=>button.onclick=async()=>{
    try {await api('/api/permissions',{action:'revoke',id:button.dataset.revokePermissions,expectedRevision:state.data.permissions.revision});await refresh(true);toast('Authorization revoked. Future tool requests will ask.');}catch(error){toast(error.message);}
  });
}
function renderSettings() {
  const settings=state.data.settings;
  $('#main').innerHTML=`<div class="heading"><div><div class="eyebrow">Configuration</div><h1>Paths & defaults.</h1><p class="muted">Plain JSON settings for new chats and schedules. Existing runs keep their captured configuration.</p></div><button class="primary" id="save-settings">Save settings</button></div><div class="grid"><section class="card"><h2>Workspace</h2><div class="field"><label>Default working directory</label><input id="settings-cwd" value="${escape(settings.workspace.cwd)}"></div><div class="field"><label>Additional repositories / directories · one per line</label><textarea id="settings-roots" rows="5">${escape(settings.workspace.additionalDirectories.join('\n'))}</textarea></div><div class="row"><div><label>Default provider</label><select id="settings-provider"><option value="copilot" ${settings.provider==='copilot'?'selected':''}>GitHub Copilot</option><option value="codex" ${settings.provider==='codex'?'selected':''}>Codex</option><option value="rehearsal" ${settings.provider==='rehearsal'?'selected':''}>Local rehearsal</option></select></div><div><label>Default model</label>${modelPicker('settings-model',settings.model,settings.provider)}<button class="subtle" id="settings-model-refresh">↻ Refresh models</button></div></div>${modelControls('settings-model',settings)}<div class="field"><label>Time zone</label><input id="settings-timezone" value="${escape(settings.timezone)}"></div><div class="field"><label>Skill directories · one per line</label><textarea id="settings-skills" rows="3">${escape(settings.skillDirectories.join('\n'))}</textarea></div><details><summary>Default MCP servers · JSON</summary><p class="note">Use command arguments and environment references. Keep secrets in provider authentication or the system keychain.</p><textarea id="settings-mcp" rows="10">${escape(JSON.stringify(settings.mcpServers,null,2))}</textarea></details></section><section class="card"><h2>Where your files live</h2><p class="note">New app schedules:</p><div class="filepath">${escape(state.data.home)}/schedules/</div><p class="note">Run history:</p><div class="filepath">${escape(state.data.home)}/runs/</div><p class="note">Settings:</p><div class="filepath">${escape(settings.file)}</div><button id="open-settings">Open settings file ↗</button><hr class="divider"><h3>Repository-owned schedules</h3><p class="note">An imported organization workflows schedule remains owned by its organization workflows automation manifest. Change that source with AI, export it, then refresh the local copy. The schedule editor shows both locations.</p><h3>Workspace context</h3><p class="note">Copilot receives all listed roots and can read their instructions and files. The VS Code companion also sends the active file, selection location, and open file paths. VS Code’s code index, extension tools, and existing chat history are not copied.</p><h3>Copilot session storage</h3><p class="note">Choose an existing folder for new Copilot sessions. Existing sessions keep their original location. This also holds Copilot configuration; changing it can require sign-in.</p><input id="settings-copilot-home" placeholder="Provider default (~/.copilot)" value="${escape(settings.copilotDataDirectory || '')}"><h3>Data directory</h3><p class="note">Set PROTEUS_HOME before launching to use another data directory. Moving live run history is not performed by this settings screen.</p></section></div>`;
  $('#save-settings').onclick=async()=>{try{await api('/api/settings',{settings:{...settings,copilotDataDirectory:$('#settings-copilot-home').value.trim() || undefined,workspace:{cwd:$('#settings-cwd').value.trim(),additionalDirectories:lines($('#settings-roots').value)},provider:$('#settings-provider').value,model:$('#settings-model').value.trim(),...modelSelection('settings-model'),timezone:$('#settings-timezone').value.trim(),skillDirectories:lines($('#settings-skills').value),mcpServers:JSON.parse($('#settings-mcp').value)},expectedRevision:settings.revision});await refresh(true);toast('Settings saved.');}catch(e){toast(e.message);}};
  $('#settings-model-refresh').onclick=()=>refreshModels('settings-model','settings-provider',true);
  $('#settings-provider').onchange=()=>refreshModels('settings-model','settings-provider');
  void refreshModels('settings-model','settings-provider');
  $('#open-settings').onclick=()=>window.desktop?window.desktop.openPath(settings.file).catch(e=>toast(e.message)):toast(settings.file);
  $('#main').insertAdjacentHTML('beforeend',permissionSettings());
  bindPermissionControls();
}
window.desktop?.onBrowserState(infos=>{
  const ids=new Set(infos.map(info=>info.id));
  state.tabs=state.tabs.filter(tab=>tab.type!=='browser'||ids.has(tab.id));
  for(const info of infos){const tab=state.tabs.find(t=>t.id===info.id);if(tab){tab.info=info;tab.label=info.title||'New tab';}else state.tabs.push({id:info.id,type:'browser',label:info.title||'New tab',info});}
  if(!state.tabs.some(tab=>tab.id===state.tab)){state.tab='overview';render();}else{renderTabs();updateBrowserControls();}
});
window.desktop?.onAddressFocus(()=>$('#browser-url')?.focus());
window.desktop?.onBrowserResize(()=>requestAnimationFrame(browserBounds));
window.addEventListener('resize',()=>requestAnimationFrame(browserBounds));
window.addEventListener('keydown',event=>{if((event.metaKey||event.ctrlKey)&&event.key==='l'&&$('#browser-url')){event.preventDefault();$('#browser-url').focus();}});
initFeatures({state,escape,api,toast,refresh,openTab,showDialog,lines,restoreBrowser:()=>requestAnimationFrame(browserBounds)});
refresh().then(() => refreshUsage()).catch(e=>toast(e.message));
setInterval(() => refreshUsage(), 60_000);
setInterval(()=>{if((!document.activeElement?.matches('input,textarea,select') || document.activeElement?.id==='followup')&&!$('#dialog').open)refresh().catch(()=>{});},1500);

window.desktop?.onRemote(() => { state.page = 'remote'; state.tab = 'overview'; render(); });
let liveRefreshTimer;
const liveEvents = new EventSource('/api/events');
liveEvents.addEventListener('change', () => { if (liveRefreshTimer) return; liveRefreshTimer = setTimeout(() => { liveRefreshTimer = null; if ((!document.activeElement?.matches('input,textarea,select') || document.activeElement?.id==='followup') && !$('#dialog').open) refresh().catch(() => {}); }, 120); });
