import {mountMnemosyne} from '../mnemosyne/operations.js';
let ui, snapshot, activeArea = 'omi', activeTab = 'settings', dirty = false, draft, loading = false, lastRefresh = 0;
const $ = selector => document.querySelector(selector);
const tabs = ['settings'];
export function initOmi(value) { ui = value; }
export const initTranscription = initOmi;
const esc = value => ui.escape(String(value ?? ''));
const act = callback => async () => { try { await callback(); } catch (error) { ui.toast(error.message); } };
export function renderOmi() {
 if(document.querySelector('#mnemosyne-page')||document.querySelector('#omi-page'))return;
 document.querySelector('#main').innerHTML='<div id="mnemosyne-page"></div>';
 mountMnemosyne(document.querySelector('#mnemosyne-page'),{readSnapshot:()=>ui.api('/api/mnemosyne'),controlServices:args=>ui.api('/api/mnemosyne/control',args),readLogs:(job,stream)=>ui.api(`/api/mnemosyne/logs?job=${encodeURIComponent(job)}&stream=${encodeURIComponent(stream)}`),openSchedule:ui.openSchedule,openRun:ui.openRun,onError:error=>ui.toast(error.message),configure:()=>{document.querySelector('#main').innerHTML='';renderOwnerConfiguration();}});
}
function renderOwnerConfiguration() {
  if (!$('#omi-page')) {
    $('#main').innerHTML = `<div id="omi-page"><div class="heading"><div><div class="eyebrow">Recording workflows</div><h1>Mnemosyne configuration</h1><p class="muted">Recording preparation, transcript intake and follow-up processing.</p></div><div class="actions"><button id="mn-return">Back to operations</button><button id="omi-refresh">Refresh status</button></div></div><nav class="transcription-areas" aria-label="Transcription workflows"><button data-transcription-area="omi">Omi</button><button data-transcription-area="general">Optional filing</button></nav><div class="omi-tabs" role="tablist" aria-label="Transcription processing sections">${tabs.map(tab => `<button role="tab" data-omi-tab="${tab}">${tab[0].toUpperCase() + tab.slice(1)}</button>`).join('')}</div><div id="omi-content" aria-live="polite"></div></div>`;
    document.querySelectorAll('[data-transcription-area]').forEach(button => button.onclick = () => { activeArea = button.dataset.transcriptionArea; activeTab = 'settings'; draw(); });
    $('#mn-return').onclick=()=>{document.querySelector('#main').innerHTML='';renderOmi();};
    $('#omi-refresh').onclick = act(() => refresh());
    document.querySelectorAll('[data-omi-tab]').forEach(button => button.onclick = () => { activeTab = button.dataset.omiTab; draw(); });
    draw();
  }
  if (!loading && (!snapshot || (Date.now() - lastRefresh > 15000 && !dirty && activeTab !== 'settings'))) void refresh().catch(error => ui.toast(error.message));
}
export const renderTranscription = renderOmi;
async function refresh() {
  if (loading) return; loading = true;
  try { snapshot = await ui.api('/api/transcription'); lastRefresh = Date.now(); if (!dirty) draft = structuredClone(snapshot.settings); draw(); }
  finally { loading = false; }
}
function draw() {
  const host = $('#omi-content'); if (!host) return;
  document.querySelectorAll('[data-transcription-area]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.transcriptionArea===activeArea)));
  document.querySelectorAll('[data-omi-tab]').forEach(button => { button.setAttribute('aria-selected', String(button.dataset.omiTab === activeTab)); button.classList.toggle('active', button.dataset.omiTab === activeTab); });
  if (!snapshot) { host.innerHTML = '<p class="muted">Reading processing metadata…</p>'; return; }
  settings(host);
}
function settings(host) {
  if (!draft) draft = structuredClone(snapshot.settings);
  const general=activeArea==='general',fields=general?[['workflowRoot','Canonical personal workflow checkout'],['automationRoot','Codex automations folder']]:[['pipelineRoot','Pipeline state folder'],['pythonPath','Installed Python executable'],['workerPath','Installed omi_worker.py'],['configPath','Native config.json'],['timezone','Schedule timezone']];
  const gate=general?'intakeEnabled':'enabled',confirmation=general?'intakeTakeoverConfirmed':'takeoverConfirmed';
  host.innerHTML = `<form id="omi-settings" class="card"><h2>${general?'General transcript intake':'Native processing'} settings</h2><p>${general?'The canonical repository owns policy, model and cadence. Leave its path blank to use the checkout referenced by the existing Omi configuration. An explicit checkout works without an Omi runtime.':'Paths point to the existing private runtime. Proteus does not rewrite the native Omi configuration.'}</p><div class="omi-grid">${fields.map(([key,label])=>`<label>${label}<input name="${key}" value="${esc(draft[key])}" ${key==='workflowRoot'?'':'required'} autocomplete="off"></label>`).join('')}${general?'':`<label>Run timeout (minutes)<input name="timeoutMinutes" type="number" min="1" max="360" value="${esc(draft.timeoutMinutes)}" required></label>`}</div><div class="omi-cutover"><h3>Testing and replacement phase</h3><p>${general?'Pause the source Codex automations separately before enabling their replacements. The three Omi native services can remain active; Omi work continues through their existing executor and claims.':'All three native Omi services must be unloaded separately before native replacement schedules may execute.'} This screen never stops services or automations.</p><label class="omi-check"><input name="${confirmation}" type="checkbox" ${draft[confirmation]?'checked':''}>I have completed and reviewed the separate ${general?'Codex automation':'native-service'} cutover.</label><label class="omi-check"><input name="${gate}" type="checkbox" ${draft[gate]?'checked':''}>Allow Proteus to execute ${general?'general transcript intake':'Omi'} schedules</label><p class="note">Disabling blocks new executions, including stale snapshots. Already-running work requires explicit cancellation. Prepared schedules remain paused until individually enabled.</p></div><div class="actions"><button type="submit" class="primary">Save settings</button><button type="button" id="omi-discard">Discard draft</button><button type="button" id="omi-prepare">Prepare disabled alternatives</button><span id="omi-draft-status" class="note">${dirty?'Unsaved changes':''}</span></div><p id="omi-save-error" role="alert"></p><p class="note">Preparing alternatives preserves their identities and disables only this area’s schedules. It does not change the current native owner.</p></form>`;
  const form=$('#omi-settings');
  form.oninput=()=>{for(const element of form.elements)if(element.name)draft[element.name]=element.type==='checkbox'?element.checked:element.type==='number'?Number(element.value):element.value;dirty=true;$('#omi-draft-status').textContent='Unsaved changes';};
  form.onsubmit=event=>{event.preventDefault();void (async()=>{try{const value=await ui.api('/api/transcription/settings',{settings:draft,expectedRevision:draft.revision});dirty=false;draft=structuredClone(value.settings||value);ui.toast('Transcription settings saved.');await refresh();}catch(error){const message=$('#omi-save-error');if(message)message.textContent=error.message;ui.toast(error.message);}})();};
  $('#omi-prepare').onclick=act(async()=>{if(dirty)throw Error('Save or discard the configuration draft before preparing alternatives.');await ui.api('/api/transcription/prepare',{expectedRevision:snapshot.settings.revision,area:activeArea});ui.toast('Alternatives prepared and disabled; native services unchanged.');await ui.refresh(true);await refresh();});
  $('#omi-discard').onclick=()=>{dirty=false;draft=structuredClone(snapshot.settings);draw();};
}
