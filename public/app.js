const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const state = { data: null, page: 'schedules', selected: null, tab: 'overview', tabs: [{ id: 'overview', label: 'Schedules', type: 'overview' }], draft: null, dirty: false, signature: '', markdown: null };
const friendly = value => ({ awaiting_input:'Needs feedback', completed:'Turn complete', queued:'Queued', running:'Running', cancelled:'Cancelled', interrupted:'Interrupted', failed:'Failed' }[value] || value);
const badge = status => `<span class="badge ${escape(status)}">${escape(friendly(status))}</span>`;
const time = (value, timezone) => new Date(value).toLocaleString(undefined, { ...(timezone ? { timeZone: timezone } : {}), month:'short', day:'numeric', hour:'numeric', minute:'2-digit' });
let toastTimer;
function toast(text) { $('#toast').textContent = text; $('#toast').style.display = 'block'; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').style.display = 'none', 5500); }
async function api(url, data) {
  const response = await fetch(url, data === undefined ? {} : { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(data) });
  const result = await response.json(); if (!response.ok) throw new Error(result.error || response.statusText); return result;
}
async function refresh(force = false) {
  const data = await api('/api/state'); const signature = JSON.stringify(data);
  state.data = data;
  if (force || signature !== state.signature) { state.signature = signature; render(); }
}
function openTab(tab) {
  if (!state.tabs.some(item => item.id === tab.id)) state.tabs.push(tab);
  state.tab = tab.id; state.selected = tab.id; render();
}
function schedule(id) {
  const value = state.data.schedules.find(s => s.id === id); if (!value || value.error) return toast(value?.error || 'Schedule missing.');
  state.draft = structuredClone(value); state.dirty = false;
  openTab({ id, label:value.name, type:'schedule' });
}
function runTab(run) { state.page = 'runs'; openTab({ id:run.id, label:run.title, type:'run' }); }
function render() {
  const data = state.data; if (!data) return;
  const waiting = data.runs.filter(r => ['awaiting_input','failed','interrupted'].includes(r.status)).length;
  $('#sidebar').innerHTML = `<div class="brand"><span class="brandmark">⤨</span>Proteus</div><div class="subtitle">Your agent control room</div>${[
    ['schedules','◷','Schedules', data.schedules.length], ['runs','◉','Run history', data.runs.length], ['attention','◇','Needs attention',waiting], ['providers','⌘','Providers','']
  ].map(([id,icon,label,count]) => `<button class="navitem ${state.page === id ? 'active':''}" data-page="${id}"><span><span>${icon}</span><span class="navlabel">${label}</span></span>${count !== '' ? `<span class="count">${count}</span>`:''}</button>`).join('')}<div class="sidebottom"><div><span class="dot"></span>Local runner online</div><p>Prototype · v${data.version}<br>Runs while the app is open.</p><button class="subtle" id="data-folder">Open data folder ↗</button></div>`;
  $('#topbar').innerHTML = `<div><span class="eyebrow">Local workspace</span><div class="small muted">Plain files. Your tools. Your schedule.</div></div><div class="actions"><button id="markdown">＋ Markdown</button><button id="browser">＋ Browser</button><button class="primary" id="new-chat">＋ New chat</button></div>`;
  $('#tabs').innerHTML = state.tabs.map(tab => `<button data-tab="${escape(tab.id)}" class="${state.tab === tab.id ? 'selected':''}">${tab.type === 'run' ? '◉' : tab.type === 'browser' ? '◎' : tab.type === 'markdown' ? '▤' : '◷'} &nbsp;${escape(tab.label)}</button>`).join('');
  const tab = state.tabs.find(t => t.id === state.tab);
  if (tab?.type === 'schedule') renderSchedule(tab.id);
  else if (tab?.type === 'run') renderRun(tab.id);
  else if (tab?.type === 'browser') renderBrowser();
  else if (tab?.type === 'markdown') renderMarkdown();
  else if (state.page === 'providers') renderProviders();
  else if (state.page === 'runs' || state.page === 'attention') renderRuns();
  else renderOverview();
  document.querySelectorAll('[data-page]').forEach(button => button.onclick = () => { state.page = button.dataset.page; state.tab = 'overview'; state.tabs[0].label = button.querySelector('.navlabel').textContent; render(); });
  document.querySelectorAll('[data-tab]').forEach(button => button.onclick = () => { state.tab = button.dataset.tab; const tab = state.tabs.find(t=>t.id===state.tab); if(tab.type === 'schedule') schedule(tab.id); else render(); });
  $('#new-chat').onclick = chatDialog; $('#browser').onclick = () => openTab({id:'browser',type:'browser',label:'Workspace browser'});
  $('#markdown').onclick = markdownDialog;
  $('#data-folder').onclick = () => window.desktop ? window.desktop.openPath(data.home) : toast(data.home);
  if (tab?.type !== 'browser') window.desktop?.hideBrowser();
}
function renderOverview() {
  const data = state.data;
  $('#main').innerHTML = `<div class="heading"><div><div class="eyebrow">Set the rhythm</div><h1>Work that keeps moving.</h1><div class="muted">Give recurring work a schedule. Step in when it needs you.</div></div><div class="actions"><button id="import">Import JSON</button><button class="primary" id="new-schedule">＋ New schedule</button></div></div><div class="stats"><div class="stat"><span class="eyebrow">Schedules enabled</span><strong>${data.schedules.filter(s=>s.enabled).length}<span class="muted small"> / ${data.schedules.length}</span></strong></div><div class="stat"><span class="eyebrow">Runs recorded</span><strong>${data.runs.length}</strong></div><div class="stat"><span class="eyebrow">Waiting for you</span><strong>${data.runs.filter(r=>r.status==='awaiting_input').length}</strong></div></div><div class="card"><div class="heading"><h2>Your schedules</h2><span class="pill">JSON files · Live reload</span></div><table><thead><tr><th>Schedule</th><th>Cadence</th><th>Provider</th><th>Status</th><th></th></tr></thead><tbody>${data.schedules.map(s=>`<tr class="clickable" data-schedule="${escape(s.id)}"><td><strong>${escape(s.name || s.id)}</strong><div class="muted">${escape(s.error || s.workspace?.cwd.split('/').pop())}</div></td><td><code>${escape(s.cron || 'Invalid file')}</code><div class="muted">${escape(s.timezone || '')}</div></td><td>${escape(s.provider === 'rehearsal' ? 'Local rehearsal' : s.provider)}<div class="muted">${escape(s.model || 'No model usage')}</div></td><td>${badge(s.error ? 'failed' : s.enabled ? 'Enabled' : 'Paused')}</td><td>↗</td></tr>`).join('')}</tbody></table></div><p class="note">Edit schedule files in your editor or with an AI agent. Changes are validated before execution. Imported schedules start paused.</p>${data.schedulerErrors.length ? `<div class="banner">Scheduler: ${escape(data.schedulerErrors.at(-1).error)}</div>` : ''}${data.recoveryErrors.length ? `<div class="banner">Some run files could not be loaded. Inspect the data folder before continuing.</div>` : ''}`;
  document.querySelectorAll('[data-schedule]').forEach(el=>el.onclick=()=>schedule(el.dataset.schedule));
  $('#new-schedule').onclick = newSchedule; $('#import').onclick = importDialog;
}
function renderSchedule(id) {
  const original = state.data.schedules.find(s=>s.id===id);
  if (!original || original.error) { $('#main').innerHTML = `<div class="banner">${escape(original?.error || 'Schedule no longer exists.')}</div>`; return; }
  if (!state.draft || state.draft.id !== id || (!state.dirty && state.draft.revision !== original.revision)) state.draft = structuredClone(original);
  const s = state.draft;
  $('#main').innerHTML = `<div class="heading"><div><div class="eyebrow">Schedule / ${escape(s.id)}</div><h1>${escape(s.name)}</h1><div class="muted">${escape(s.provider === 'rehearsal' ? 'A no-cost rehearsal of scheduling, feedback, and continuation.' : 'A persistent conversation for every run.')}</div></div><div class="actions">${badge(s.enabled?'Enabled':'Paused')}<button class="primary" id="run-now">▶ Run now</button></div></div><div class="grid"><section class="card"><h2>Schedule settings</h2><div class="field"><label for="name">Name</label><input id="name" value="${escape(s.name)}"></div><div class="row"><div><label for="cron">Cron expression</label><input id="cron" class="cron" value="${escape(s.cron)}"></div><div><label for="timezone">Time zone</label><input id="timezone" value="${escape(s.timezone)}"></div></div><div class="row"><div><label for="provider">Provider</label><select id="provider"><option value="rehearsal" ${s.provider==='rehearsal'?'selected':''}>Local rehearsal</option><option value="copilot" ${s.provider==='copilot'?'selected':''}>GitHub Copilot</option></select></div><div><label for="model">Model ID</label><input id="model" value="${escape(s.model)}" placeholder="gpt-6-sol"></div></div><div class="field"><label for="cwd">Workspace directory</label><input id="cwd" value="${escape(s.workspace.cwd)}"></div><div class="field"><label for="roots">Additional directories · one per line</label><textarea id="roots" rows="2">${escape(s.workspace.additionalDirectories.join('\n'))}</textarea></div><div class="field"><label for="prompt">Instructions</label><textarea id="prompt" rows="5">${escape(s.prompt)}</textarea></div><div class="row"><div><label for="misfire">After missed runs</label><select id="misfire"><option value="skip" ${s.misfire==='skip'?'selected':''}>Wait for the next scheduled time</option><option value="coalesce" ${s.misfire==='coalesce'?'selected':''}>Catch up once when available</option></select></div><div><label for="enabled">Execution</label><select id="enabled"><option value="false" ${!s.enabled?'selected':''}>Paused</option><option value="true" ${s.enabled?'selected':''}>Enabled</option></select></div></div><div class="formfooter"><span class="note" id="save-state">${state.dirty?'Unsaved changes':'Saved as a plain JSON file'}</span><div class="actions"><button id="reload">Reload file</button><button class="primary" id="save">Save schedule</button></div></div></section><div class="stack"><section class="card"><div class="heading"><h2>Next five runs</h2><button class="subtle" id="preview">↻ Preview</button></div><ul id="next-runs" class="nextlist">${(s.nextRuns || []).map((date,i)=>`<li><span class="muted">${i===0?'Next':String(i+1).padStart(2,'0')}</span><span>${escape(time(date,s.timezone))}</span></li>`).join('')}</ul><p class="note">${escape(s.timezone)} · Paused schedules show projected times.</p></section><section class="card"><div class="heading"><h2>The source of truth</h2><button class="subtle" id="open-file">Open file ↗</button></div><div class="filepath">${escape(original.file)}</div><pre id="json-preview">${escape(JSON.stringify(clean(s),null,2))}</pre></section></div></div>`;
  const update = () => {
    Object.assign(s,{name:$('#name').value,cron:$('#cron').value,timezone:$('#timezone').value,provider:$('#provider').value,model:$('#model').value,prompt:$('#prompt').value,misfire:$('#misfire').value,enabled:$('#enabled').value==='true',workspace:{cwd:$('#cwd').value,additionalDirectories:$('#roots').value.split('\n').map(x=>x.trim()).filter(Boolean)}});
    state.dirty=true; $('#save-state').textContent='Unsaved changes'; $('#json-preview').textContent=JSON.stringify(clean(s),null,2);
  };
  document.querySelectorAll('#main input,#main textarea,#main select').forEach(el=>el.addEventListener('input',update));
  $('#preview').onclick=async()=>{try{const data=await api('/api/preview',{cron:s.cron,timezone:s.timezone});$('#next-runs').innerHTML=data.nextRuns.map((d,i)=>`<li><span class="muted">${i+1}</span><span>${escape(time(d,s.timezone))}</span></li>`).join('');}catch(e){toast(e.message);}};
  $('#save').onclick=async()=>{try{await api('/api/schedules',{schedule:clean(s),expectedRevision:s.revision});state.dirty=false;await refresh(true);toast('Schedule saved.');}catch(e){toast(e.message);}};
  $('#reload').onclick=()=>{state.dirty=false;state.draft=null;render();};
  $('#run-now').onclick=async()=>{try{if(state.dirty)throw new Error('Save your changes before running.');const run=await api('/api/run',{id});await refresh();runTab(run);}catch(e){toast(e.message);}};
  $('#open-file').onclick=()=>window.desktop?window.desktop.openPath(original.file):toast(original.file);
}
function clean(s) { const result=structuredClone(s); for(const key of ['file','revision','nextRuns','error'])delete result[key];return result; }
function renderRuns() {
  const runs=state.data.runs.filter(r=>state.page!=='attention'||['awaiting_input','failed','interrupted'].includes(r.status));
  $('#main').innerHTML=`<div class="heading"><div><div class="eyebrow">Every run has a story</div><h1>${state.page==='attention'?'Ready for your input.':'Pick up where you left off.'}</h1><div class="muted">Open any run to inspect its history or continue the conversation.</div></div></div><div class="card">${runs.length?`<table><thead><tr><th>Run</th><th>Started</th><th>Provider</th><th>Status</th><th>Tokens</th></tr></thead><tbody>${runs.map(r=>`<tr class="clickable" data-run="${r.id}"><td><strong>${escape(r.title)}</strong><div class="muted">${escape(r.trigger)} · ${r.id.slice(0,8)}</div></td><td>${time(r.createdAt)}</td><td>${escape(r.schedule.provider)}</td><td>${badge(r.status)}</td><td>${r.usage.observed?(r.usage.inputTokens+r.usage.outputTokens).toLocaleString():'—'}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">No runs here yet.<br>Open a schedule and choose Run now to try the feedback flow.</div>'}</div>`;
  document.querySelectorAll('[data-run]').forEach(el=>el.onclick=()=>runTab(state.data.runs.find(r=>r.id===el.dataset.run)));
}
function renderRun(id) {
  const run=state.data.runs.find(r=>r.id===id);if(!run)return;
  const pending=run.pending;
  $('#main').innerHTML=`<div class="heading"><div><div class="eyebrow">${escape(run.schedule.provider)} / ${run.id.slice(0,8)}</div><h1>${escape(run.title)}</h1><div class="muted">${time(run.createdAt)} · ${escape(run.schedule.model || 'Local rehearsal, no AI calls')}</div></div><div class="actions">${badge(run.status)}${['running','queued','awaiting_input'].includes(run.status)?'<button class="danger" id="cancel">Stop run</button>':''}</div></div><div class="grid"><section class="card"><div class="conversation" id="conversation">${run.events.map(e=>`<div class="message ${escape(e.role)}"><div class="role">${escape(e.role)} · ${time(e.at)}</div><div class="text">${escape(e.text)}</div></div>`).join('')}</div>${pending?`<div class="pending"><div class="eyebrow">Your input is needed</div><p>${escape(pending.question)}</p>${pending.details?`<pre>${escape(JSON.stringify(pending.details,null,2))}</pre>`:''}${pending.type==='permission'?'<div class="actions"><button id="deny">Deny</button><button class="primary" id="approve">Approve once</button></div>':`<textarea id="answer" placeholder="Add your feedback…" rows="2"></textarea><div class="actions"><button class="primary" id="reply">Send feedback</button></div>`}</div>`:!['queued','running'].includes(run.status)?'<div class="composer"><textarea id="followup" placeholder="Continue this conversation…" rows="2"></textarea><div class="actions"><button class="primary" id="continue">Continue session →</button></div></div>':'<p class="note"><span class="dot"></span>Working… updates appear here.</p>'}</section><div class="stack"><section class="card"><h2>Run details</h2><p class="note">Every run keeps the schedule as it was when work began.</p><div class="filepath">${escape(run.schedule.workspace.cwd)}</div><hr class="divider"><div class="usagegrid"><div class="usagebox"><span class="eyebrow">Input tokens</span><strong>${run.usage.observed?run.usage.inputTokens.toLocaleString():'—'}</strong></div><div class="usagebox"><span class="eyebrow">Output tokens</span><strong>${run.usage.observed?run.usage.outputTokens.toLocaleString():'—'}</strong></div></div><p class="note">${run.usage.observed?'Observed provider usage.':'No provider usage reported. Rehearsals make no model calls.'}</p><div class="note">${run.providerSessionId?'Provider session: '+escape(run.providerSessionId):'Session history saved locally.'}</div></section><section class="card"><h2>Completion means a turn ended</h2><p class="note">Workflow completion still depends on its own validation and source coverage. A model finishing its response doesn’t certify external work.</p><details><summary>Schedule snapshot</summary><pre>${escape(JSON.stringify(run.schedule,null,2))}</pre></details></section></div></div>`;
  const submit=async(action,data)=>{try{await api(`/api/runs/${id}/${action}`,data);await refresh(true);}catch(e){toast(e.message);}};
  $('#cancel')?.addEventListener('click',()=>submit('cancel',{}));
  $('#reply')?.addEventListener('click',()=>submit('reply',{answer:$('#answer').value,requestId:pending.id}));
  $('#approve')?.addEventListener('click',()=>submit('reply',{answer:'approve',requestId:pending.id}));
  $('#deny')?.addEventListener('click',()=>submit('reply',{answer:'deny',requestId:pending.id}));
  $('#continue')?.addEventListener('click',()=>submit('resume',{prompt:$('#followup').value}));
}
function quotaCards(quota) {
  return Object.entries(quota?.quotaSnapshots || {}).filter(([,q])=>q).map(([name,q])=>{
    const remaining=Number.isFinite(q.remainingPercentage)?Math.max(0,Math.min(100,q.remainingPercentage)):null;
    return `<div class="quota"><div class="heading"><span>${escape(name.replaceAll('_',' '))}</span><strong>${q.isUnlimitedEntitlement?'Unlimited':remaining===null?'Unavailable':remaining.toFixed(1)+'% remaining'}</strong></div>${!q.isUnlimitedEntitlement&&remaining!==null?`<progress max="100" value="${remaining}" aria-label="${escape(name)} quota remaining"></progress>`:''}<div class="note">${q.resetDate?'Resets '+escape(time(q.resetDate)):''}</div></div>`;
  }).join('');
}
function renderProviders() {
  const p=state.data.providerStatus;
  $('#main').innerHTML=`<div class="heading"><div><div class="eyebrow">Bring your own engine</div><h1>Providers & usage.</h1><div class="muted">One control room. Separate authentication and capabilities for each provider.</div></div><button class="primary" id="refresh-provider">Check Copilot connection</button></div><div class="grid"><div class="card"><div class="heading"><h2>GitHub Copilot</h2>${badge(p?.available?'Connected':p?'Unavailable':'Not checked')}</div><p class="note">Uses GitHub Copilot authentication and model access through the official SDK.</p>${p?.error?`<div class="banner">${escape(p.error)}</div>`:''}<div class="usagegrid"><div class="usagebox"><span class="eyebrow">Available models</span><strong>${p?.models?.length ?? '—'}</strong></div><div class="usagebox"><span class="eyebrow">Quota source</span><strong class="small">${p?.quota?'Copilot account API':'Unavailable'}</strong></div></div><p class="note">Account quota and per-run tokens are separate measurements. Missing data is shown as unavailable.</p>${quotaCards(p?.quota)}${p?.quota?`<details><summary>Provider response</summary><pre>${escape(JSON.stringify(p.quota,null,2))}</pre></details>`:''}${p?.quotaError?`<p class="note">${escape(p.quotaError)}</p>`:''}</div><div class="card"><h2>Model catalog</h2>${p?.models?.length?`<ul class="nextlist">${p.models.map(m=>`<li><span>${escape(m.name||m.id)}</span><code>${escape(m.id)}</code></li>`).join('')}</ul>`:'<p class="muted">Check the connection to discover models allowed for your account.</p>'}<hr class="divider"><h3>Provider boundary</h3><p class="note">The prototype implements Copilot and a local rehearsal provider. Additional providers can supply session creation, continuation, events, permissions, and usage through the same interface.</p></div></div>`;
  $('#refresh-provider').onclick=async()=>{const button=$('#refresh-provider');button.disabled=true;button.textContent='Connecting…';try{await api('/api/provider',{});await refresh(true);}catch(e){toast(e.message);button.disabled=false;}};
}
function showDialog(html, submit) {
  $('#dialog').innerHTML=html;$('#dialog').showModal();$('#close-dialog').onclick=()=>$('#dialog').close();$('#dialog-submit').onclick=async()=>{try{await submit();$('#dialog').close();await refresh(true);}catch(e){toast(e.message);}};
}
function chatDialog() {
  const first=state.data.schedules.find(s=>!s.error);
  showDialog(`<h2>Start a workspace chat</h2><p class="note">Point the conversation at a directory. A VS Code companion can supply all workspace roots.</p><div class="field"><label>Workspace</label><input id="chat-cwd" value="${escape(first?.workspace.cwd||'')}"></div><div class="row"><div><label>Provider</label><select id="chat-provider"><option value="copilot">GitHub Copilot</option><option value="rehearsal">Local rehearsal</option></select></div><div><label>Model</label><input id="chat-model" value="gpt-6-sol"></div></div><div class="field"><label>Message</label><textarea id="chat-prompt" rows="4" placeholder="What would you like to work on?"></textarea></div><div class="actions"><button id="close-dialog">Cancel</button><button class="primary" id="dialog-submit">Start chat</button></div>`,async()=>{const run=await api('/api/chat',{workspace:{cwd:$('#chat-cwd').value,additionalDirectories:[]},provider:$('#chat-provider').value,model:$('#chat-model').value,prompt:$('#chat-prompt').value});await refresh();runTab(run);});
}
function newSchedule() {
  showDialog('<h2>New schedule</h2><div class="field"><label>Name</label><input id="new-name" placeholder="Weekly workspace review"></div><div class="actions"><button id="close-dialog">Cancel</button><button class="primary" id="dialog-submit">Create paused schedule</button></div>',async()=>{
    const name=$('#new-name').value.trim();if(!name)throw new Error('Enter a name.');const first=state.data.schedules.find(s=>!s.error);
    const id=name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)+'-'+Date.now().toString(36);
    await api('/api/schedules',{schedule:{schemaVersion:1,id,name,enabled:false,cron:'0 9 * * 1-5',timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,provider:'rehearsal',model:'',workspace:{cwd:first?.workspace.cwd||'/',additionalDirectories:[]},misfire:'skip',prompt:'Review this workspace and ask for feedback.'}});await refresh();schedule(id);
  });
}
function importDialog() { showDialog('<h2>Import schedules</h2><p class="note">Paste a JSON schedule or array. Imports are always paused.</p><textarea id="import-json" rows="10" placeholder="[{ … }]"></textarea><div class="actions"><button id="close-dialog">Cancel</button><button class="primary" id="dialog-submit">Import</button></div>',async()=>{const value=JSON.parse($('#import-json').value);await api('/api/import',{schedules:Array.isArray(value)?value:[value]});}); }
function markdownDialog() { showDialog('<h2>Open Markdown</h2><p class="note">Choose a file within a configured schedule workspace.</p><input id="markdown-path" placeholder="/absolute/path/README.md"><div class="actions"><button id="close-dialog">Cancel</button><button class="primary" id="dialog-submit">Open tab</button></div>',async()=>{state.markdown=await api('/api/markdown',{file:$('#markdown-path').value});openTab({id:'markdown',type:'markdown',label:state.markdown.file.split('/').pop()});}); }
function renderMarkdown() { $('#main').innerHTML=`<div class="heading"><div><div class="eyebrow">Markdown source</div><h1>${escape(state.markdown?.file.split('/').pop())}</h1><div class="filepath">${escape(state.markdown?.file)}</div></div></div><pre class="markdown">${escape(state.markdown?.content||'')}</pre>`; }
$('#main').addEventListener('scroll',()=>{if(state.tab==='browser')window.desktop?.hideBrowser();});
function renderBrowser() {
  $('#main').innerHTML='<div class="heading"><div><div class="eyebrow">Your hands on the controls</div><h1>Workspace browser.</h1><div class="muted">Browse and sign in yourself. Browser sessions stay separate from the app.</div></div></div><div class="browserbar"><input id="browser-url" aria-label="Browser URL" value="https://example.com"><button class="primary" id="browser-go">Open page</button><button id="browser-hide">Hide page</button></div><div class="browserarea" id="browser-area"><div class="empty">Desktop prototype: an interactive browser tab.<br>Agent control through Playwright is a separate connection, not yet wired to this embedded tab.</div></div>';
  $('#browser-go').onclick=async()=>{try{if(!window.desktop)throw new Error('Run npm run desktop to use embedded browser tabs.');const r=$('#browser-area').getBoundingClientRect();await window.desktop.openBrowser({url:$('#browser-url').value,bounds:{x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height)}});}catch(e){toast(e.message);}};
  $('#browser-hide').onclick=()=>window.desktop?.hideBrowser();
}
refresh().catch(e=>toast(e.message));
setInterval(()=>{if(!document.activeElement?.matches('input,textarea,select')&&!$('#dialog').open)refresh().catch(()=>{});},1500);
