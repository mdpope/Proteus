let ui, snapshot, activeTab = 'overview', dirty = false, draft, loading = false, lastRefresh = 0;
const $ = selector => document.querySelector(selector);
const tabs = ['overview', 'schedules', 'runs', 'logs', 'settings'];
let selectedLog = 'audio', logStream = 'out', logResult;
export function initOmi(value) { ui = value; }
const esc = value => ui.escape(String(value ?? ''));
const act = callback => async () => { try { await callback(); } catch (error) { ui.toast(error.message); } };
const stamp = value => value ? new Date(value).toLocaleString() : 'Not observed';
export function renderOmi() {
  if (!$('#omi-page')) {
    $('#main').innerHTML = `<div id="omi-page"><div class="heading"><div><div class="eyebrow">Recording workflows</div><h1>Omi processing</h1><p class="muted">Transcription, revisable sessions and reviewed filing on this Mac.</p></div><button id="omi-refresh">Refresh status</button></div><div class="omi-tabs" role="tablist" aria-label="Omi processing sections">${tabs.map(tab => `<button role="tab" data-omi-tab="${tab}">${tab[0].toUpperCase() + tab.slice(1)}</button>`).join('')}</div><div id="omi-content" aria-live="polite"></div></div>`;
    $('#omi-refresh').onclick = act(() => refresh());
    document.querySelectorAll('[data-omi-tab]').forEach(button => button.onclick = () => { activeTab = button.dataset.omiTab; draw(); });
    draw();
  }
  if (!loading && (!snapshot || (Date.now() - lastRefresh > 15000 && !dirty && activeTab !== 'settings'))) void refresh().catch(error => ui.toast(error.message));
}
async function refresh() {
  if (loading) return; loading = true;
  try { snapshot = await ui.api('/api/omi'); lastRefresh = Date.now(); if (!dirty) draft = structuredClone(snapshot.settings); draw(); }
  finally { loading = false; }
}
function draw() {
  const host = $('#omi-content'); if (!host) return;
  document.querySelectorAll('[data-omi-tab]').forEach(button => { button.setAttribute('aria-selected', String(button.dataset.omiTab === activeTab)); button.classList.toggle('active', button.dataset.omiTab === activeTab); });
  if (!snapshot) { host.innerHTML = '<p class="muted">Reading processing metadata…</p>'; return; }
  if (activeTab === 'settings') settings(host);
  else if (activeTab === 'overview') overview(host);
  else if (activeTab === 'schedules') schedules(host);
  else if (activeTab === 'runs') runs(host);
  else logs(host);
}
function overview(host) {
  const state = snapshot.status;
  const metadata = state.metadata || {};
  host.innerHTML = `<div class="omi-banner"><strong>${state.enabled ? 'Proteus processing enabled' : 'Observation mode · execution disabled'}</strong><p>${state.enabled ? 'Individual schedules control recurring execution. Native ownership is checked before every run.' : 'Preparing schedules keeps them disabled. Existing Omi and iCloud services continue independently.'}</p></div><div class="omi-grid"><section class="card"><h2>Pipeline</h2><p>${state.runtimeAvailable ? 'Installed native runtime found' : 'Configure the installed runtime in Settings'}</p><p>Native execution keeps the existing claims, locks, retention rules and domain routing.</p><p class="note">Bluetooth capture, phone review and the iCloud library remain in the Omi iCloud app.</p></section><section class="card"><h2>Native service ownership</h2>${(state.nativeServices || []).map(service => `<p><strong>${esc(service.id)}</strong> <span class="pill">${esc(service.state)}</span></p>`).join('')}<p class="note">Loaded means launchd owns this service; it does not mean a job is currently running.</p></section></div><div class="omi-grid">${Object.entries(metadata).map(([name, value]) => `<section class="card"><h2>${esc(name[0].toUpperCase() + name.slice(1))}</h2><p class="note">${value.available ? 'Last metadata update: ' + esc(stamp(value.modifiedAt)) : 'No bounded status snapshot available'}</p><pre class="omi-metadata">${esc(JSON.stringify(Object.fromEntries(Object.entries(value).filter(([key]) => !['available','modifiedAt'].includes(key))), null, 2))}</pre></section>`).join('')}</div><p class="note">Status snapshots can be stale. Successful ASR or process exit does not certify completed semantic filing.</p>`;
}
function schedules(host) {
  const stored = (ui.state.data?.schedules || []).filter(value => value.integration?.type === 'omi');
  host.innerHTML = `<section class="card"><div class="heading"><h2>Regular Proteus schedules</h2><button id="omi-prepare">Prepare disabled schedules</button></div><p>Three native jobs run every minute when enabled. The two existing personal Codex automations also handle non-Omi intake and quality review, so they remain separate schedules.</p><p class="note">Preparing again disables existing Omi schedules while preserving their edits. Source automations and launchd services are never changed.</p>${snapshot.jobs.map(job => { const schedule = stored.find(item => item.id === job.scheduleId); return `<article class="omi-job"><div><h3>${esc(job.name)}</h3><p>${esc(job.description)}</p><code>${esc([job.command, ...job.args].join(' '))}</code><p class="note">Every minute · installed Python runtime · ${schedule ? (schedule.enabled ? 'enabled' : 'disabled') : 'not prepared'}</p></div>${schedule ? `<button data-omi-schedule="${esc(schedule.id)}">Open schedule</button>` : ''}</article>`; }).join('')}${snapshot.automations.map(item => { const schedule = stored.find(value => value.id === item.scheduleId); return `<article class="omi-job"><div><h3>${esc(item.name)}</h3><p>${item.available ? `Source ${esc(item.sourceStatus)} · ${esc(item.cron)} · ${esc(item.model)}` : 'Source automation unavailable'}</p><p class="note">${item.id === 'intake' ? 'Hourly intake, native executor catch-up and non-Omi imports.' : 'Daily follow-up review and summary/context quality audit.'} Source must be paused before Proteus can execute its replacement.</p></div>${schedule ? `<button data-omi-schedule="${esc(schedule.id)}">Open schedule</button>` : ''}</article>`; }).join('')}</section>`;
  $('#omi-prepare').onclick = act(async () => { await ui.api('/api/omi/prepare', { expectedRevision: snapshot.settings.revision }); ui.toast('Omi schedules prepared and disabled.'); await ui.refresh(true); await refresh(); });
  host.querySelectorAll('[data-omi-schedule]').forEach(button => button.onclick = () => ui.openSchedule?.(button.dataset.omiSchedule));
}
function runs(host) {
  const records = (ui.state.data?.runs || []).filter(run => run.schedule?.integration?.type === 'omi').slice(0, 100);
  host.innerHTML = `<section class="card"><h2>Processing history in Proteus</h2><p class="note">Native launchd history appears under Logs. Proteus records only jobs started here.</p>${records.length ? records.map(run => `<article class="omi-job"><div><h3>${esc(run.title || run.schedule.name)}</h3><p>${esc(run.status)} · ${esc(stamp(run.createdAt))}</p></div><button data-omi-run="${esc(run.id)}">Open run</button></article>`).join('') : '<p>No Proteus processing runs yet.</p>'}</section>`;
  host.querySelectorAll('[data-omi-run]').forEach(button => button.onclick = () => ui.openRun?.(button.dataset.omiRun));
}
function logs(host) {
  host.innerHTML = `<section class="card"><h2>Native processing logs</h2><div class="omi-log-controls"><label>Job<select id="omi-log-job">${snapshot.jobs.map(job => `<option value="${esc(job.id)}" ${selectedLog === job.id ? 'selected' : ''}>${esc(job.name)}</option>`).join('')}</select></label><label>Stream<select id="omi-log-stream"><option value="out" ${logStream === 'out' ? 'selected' : ''}>Output</option><option value="err" ${logStream === 'err' ? 'selected' : ''}>Errors</option></select></label><button id="omi-log-load">Read recent metadata</button></div><p class="note">Bounded to the last 100 lines and 256 KiB. Only approved numeric counts, timestamps and status values appear. Transcript text, diagnostic prose, credentials and private paths are withheld.</p><div id="omi-log-output"></div></section>`;
  $('#omi-log-job').onchange = event => { selectedLog = event.target.value; logResult = null; drawLog(); };
  $('#omi-log-stream').onchange = event => { logStream = event.target.value; logResult = null; drawLog(); };
  $('#omi-log-load').onclick = act(async () => { const job = selectedLog, stream = logStream; const result = await ui.api(`/api/omi/logs?job=${encodeURIComponent(job)}&stream=${stream}&limit=100`); if (job === selectedLog && stream === logStream) { logResult = result; drawLog(); } });
  drawLog();
}
function drawLog() {
  const host = $('#omi-log-output'); if (!host) return;
  host.innerHTML = !logResult ? '<p class="muted">Choose a job and read its metadata.</p>' : `<p>${logResult.available ? `${esc(logResult.records.length)} metadata records · ${esc(logResult.withheld)} lines withheld · ${esc(stamp(logResult.modifiedAt))}` : 'No readable native log available.'}</p>${window.desktop?.openPath && logResult.localPath ? '<button id="omi-open-log">Open native log on this Mac</button><p class="note">Opens the original private diagnostic file locally. Its contents are not sent through the API.</p>' : ''}<pre class="omi-metadata">${esc(logResult.records.map(value => JSON.stringify(value)).join('\n') || 'No permitted metadata in this sample.')}</pre>`;
  if ($('#omi-open-log')) $('#omi-open-log').onclick = act(() => window.desktop.openPath(logResult.localPath));
}
function settings(host) {
  if (!draft) draft = structuredClone(snapshot.settings);
  host.innerHTML = `<form id="omi-settings" class="card"><h2>Processing settings</h2><p>Paths point to the existing private runtime. Proteus stores these settings in its own data directory and does not rewrite the native Omi config.</p><div class="omi-grid">${[['pipelineRoot','Pipeline state folder'],['pythonPath','Installed Python executable'],['workerPath','Installed omi_worker.py'],['configPath','Native config.json'],['automationRoot','Codex automations folder'],['timezone','Schedule timezone']].map(([key,label]) => `<label>${label}<input name="${key}" value="${esc(draft[key])}" required autocomplete="off"></label>`).join('')}<label>Run timeout (minutes)<input name="timeoutMinutes" type="number" min="1" max="360" value="${esc(draft.timeoutMinutes)}" required></label></div><div class="omi-cutover"><h3>Testing and replacement phase</h3><p>Enabling requires all three native services to be unloaded separately. A source Codex automation must also be paused before its replacement can run. This screen never stops those services or automations.</p><label class="omi-check"><input name="takeoverConfirmed" type="checkbox" ${draft.takeoverConfirmed ? 'checked' : ''}>I have completed and reviewed the separate native-service cutover.</label><label class="omi-check"><input name="enabled" type="checkbox" ${draft.enabled ? 'checked' : ''}>Allow Proteus to execute Omi schedules</label><p class="note">Disable blocks new executions, including stale chat snapshots. An already-running native transaction is allowed to finish; cancellation is an explicit run action.</p></div><div class="actions"><button type="submit" class="primary">Save settings</button><button type="button" id="omi-discard">Discard draft</button><span id="omi-draft-status" class="note">${dirty ? 'Unsaved changes' : ''}</span></div></form>`;
  const form = $('#omi-settings');
  form.oninput = () => { for (const element of form.elements) if (element.name) draft[element.name] = element.type === 'checkbox' ? element.checked : element.type === 'number' ? Number(element.value) : element.value; dirty = true; $('#omi-draft-status').textContent = 'Unsaved changes'; };
  form.onsubmit = event => { event.preventDefault(); void act(async () => { const value = await ui.api('/api/omi/settings', { settings: draft, expectedRevision: draft.revision }); dirty = false; draft = structuredClone(value.settings || value); ui.toast('Omi settings saved.'); await refresh(); })(); };
  $('#omi-discard').onclick = () => { dirty = false; draft = structuredClone(snapshot.settings); draw(); };
}
