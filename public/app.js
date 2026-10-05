import { setMessageActionsContext, stopMessageSpeech } from './message-actions.js';
import { initRemoteDesktops, attachChatDestinations, mountMachineHistory, renderRemoteRun, openRemoteChat, mountRemoteSchedules } from './remote-desktops.js';
import { initChatsIndex, renderChatsIndex, recentChats, openIndexedChat, loadChatsIndex } from './chats-index.js';
import { initEngineRoom, engineSections, renderEngineRoom } from './engine-room.js';
import { initTeamTools, renderTeamTools, teamState, restoreTeamState, leaveTeamTools, ownsTeamBrowser, syncTeamBrowsers, teamBrowserBounds, selectTeamBrowser, forgetTeamBrowser } from './team-tools.js';
import { initBrowserOverview, showBrowserOverview, isBrowserOverviewOpen } from './browser-overview.js';
import { browserTarget, renderBrowserHome } from './browser-home.js';
import { requestPresentation, mountStructured } from './tool-presentation.js';
import { conversation, forgetConversation } from './conversation.js';
import { renderRemote } from './remote.js';
import { initOmi, renderOmi } from './omi.js';
import { initTerminals, renderTerminal, openTerminalDialog, openTerminalProfiles, disposeTerminalUi } from './terminals.js';
import { initLife, renderLife, renderLifeSetup, selectLifeSection } from './life.js';
import { initMarkdownPicker, openMarkdownPicker } from './markdown-picker.js';
import { initFeatures, renderContext, renderStandup, renderCredentials, fillBrowserLogin, contextPicker, contextSelection, bindContextPicker, modelPicker, modelControls, modelSelection, contextSize, refreshModels, sessionDetails, bindSessionDetails, bindPaths } from './features.js';
const chatIconPaths = '<path d="M3 4h10a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H8l-4 3v-4a3 3 0 0 1-1-2V4Z"/><path d="M17 8h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3l-3 2v-4"/>';
const pairedBubbles = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">${chatIconPaths}</svg>`;
const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const state = { data: null, page: 'schedules', engineSection:'resources', selected: null, tab: 'overview', tabs: [{ id: 'overview', label: 'Schedules', type: 'overview' }], draft: null, dirty: false, signature: '', markdown: null };
const friendly = value => ({ awaiting_input:'Needs feedback', completed:'Turn complete', queued:'Queued', running:'Running', cancelled:'Cancelled', interrupted:'Interrupted', failed:'Failed' }[value] || value);
const badge = status => `<span class="badge ${escape(status)}">${escape(friendly(status))}</span>`;
const time = (value, timezone) => value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleString(undefined, { timeZone: timezone || state.data?.settings?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone, year:'numeric', month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }) : 'Time unavailable';
let toastTimer, usageValue = null, usageBusy = false, appearanceBusy = false;
let previousFeature='', sidebarMinimized=localStorage.getItem('proteus.sidebar.minimized')==='true';
document.body.classList.toggle('sidebar-minimized',sidebarMinimized);
let workspaceReady=false, workspaceRestoring=false, workspaceClosing=false, lastWorkspace='';
const syncMessageContext=()=>setMessageActionsContext(JSON.stringify([state.data?.life?.identity?.accountId||'',state.data?.life?.identity?.workspaceId||'',state.data?.life?.identity?.origin||'',state.data?.life?.identity?.sessionId||'',state.tab,state.tabs.find(t=>t.id===state.tab)?.hostId||'local']));
const lifeVisible = () => state.data?.life?.enabled === true;
function saveWorkspace() {
  if(!workspaceReady || workspaceRestoring || workspaceClosing)return;
  const session={schemaVersion:1,active:state.tab,page:state.page,engineSection:state.engineSection,team:teamState(),tabs:state.tabs.map(tab=>({id:tab.id,type:tab.type,label:tab.label,...(tab.type==='browser'?{url:tab.info?.url||'',history:tab.info?.history,unloaded:tab.info?.loaded===false}:{}),...(tab.type==='markdown'?{file:tab.markdown?.file}:{}),...(tab.type==='terminal'?{terminal:tab.terminal}:{}),...(tab.type==='remote-run'?{hostId:tab.hostId,runId:tab.runId}:{})}))};
  const json=JSON.stringify(session);if(json===lastWorkspace)return;lastWorkspace=json;
  if(window.desktop?.workspaceSession)window.desktop.workspaceSession({action:'save',session}).catch(error=>{lastWorkspace='';toast(error.message);});
  else try{localStorage.setItem('proteus.workspace',json);}catch{}
}
function openFeatureTab(type) { if(type==='life'&&!lifeVisible())return;openTab({id:'feature-'+type,type,label:type==='omi'?'Transcription':type==='team'?'Team Tools':'Life'}); }
function restoreFeatureTabs() {
  if(!lifeVisible()){state.tabs=state.tabs.filter(tab=>tab.type!=='life');if(!state.tabs.some(t=>t.id===state.tab))state.tab='overview';}
}
async function restoreWorkspace() {
  workspaceRestoring=true;
  try {
    let saved=window.desktop?.workspaceSession?await window.desktop.workspaceSession({action:'get'}):JSON.parse(localStorage.getItem('proteus.workspace')||'null');
    if(!saved){let legacy=[];try{legacy=JSON.parse(localStorage.getItem('proteus.feature-tabs')||'[]');}catch{}saved={tabs:[...state.tabs,...legacy.filter(type=>['omi','life'].includes(type)).map(type=>({id:'feature-'+type,type,label:type==='omi'?'Transcription':'Life'}))],active:'overview',page:'schedules'};}
    const tabs=[], existingBrowser=window.desktop?await window.desktop.browser({action:'list'}):[];
    for(const entry of saved.tabs||[]) {
      const tab={...entry};
      if(tab.type==='standup'){tab.type='team';tab.id='feature-team';tab.label='Team Tools';if(saved.active===entry.id)saved.active=tab.id;if(!saved.team)saved.team={active:'standup'};}
      if(tab.type==='life'&&!lifeVisible())continue;
      if(tab.type==='run'&&!state.data.runs.some(run=>run.id===tab.id))continue;
      if(tab.type==='schedule'&&!state.data.schedules.some(schedule=>schedule.id===tab.id))continue;
      if(tab.type==='markdown') {
        try {tab.markdown=await api('/api/markdown',{file:tab.file});}
        catch(error){tab.markdown={file:tab.file,content:'',error:error.message};}
      }
      if(tab.type==='browser') {
        if(!window.desktop)continue;
        // A renderer reload reuses the live view; an app restart creates a private tab.
        const previous=tab.id;let info=existingBrowser.find(info=>info.id===tab.id);
        if(!info){info=await window.desktop.browser({action:'create',restore:true,unloaded:tab.unloaded===true,url:tab.url,history:tab.history});tab.info=info;tab.id=info.id;tabs.push(tab);if(saved.active===previous)saved.active=tab.id;continue;}
        tab.info=info;
      }
      if(!tabs.some(other=>other.id===tab.id))tabs.push(tab);
    }
    state.tabs=tabs.length?tabs:state.tabs;state.page=saved.page||'schedules';state.engineSection=saved.engineSection||'resources';restoreTeamState(saved.team,existingBrowser);state.tab=state.tabs.some(tab=>tab.id===saved.active)?saved.active:'overview';
  } catch(error) {toast(error.message);return;}
  finally {workspaceRestoring=false;}
  workspaceReady=true;render();saveWorkspace();
}
async function saveAppearance(patch) {
  if(appearanceBusy)return;
  appearanceBusy=true;
  const settings=state.data.settings, checkbox=$('#settings-show-usage'), saveButton=$('#save-settings');
  if(checkbox)checkbox.disabled=true;
  if(saveButton)saveButton.disabled=true;
  renderUsage();
  try {
    const saved=await api('/api/settings',{settings:{...settings,appearance:{...settings.appearance,...patch}},expectedRevision:settings.revision});
    state.data.settings=saved;
    // Keep unrelated Setup edits intact and advance only the revision this form owned.
    if(checkbox?.dataset.settingsRevision===settings.revision)checkbox.dataset.settingsRevision=saved.revision;
    state.signature=JSON.stringify(state.data);
    if(patch.showProviderUsage===true)void refreshUsage(true);
  } finally {
    appearanceBusy=false;
    if(checkbox){checkbox.disabled=false;checkbox.checked=state.data.settings.appearance?.showProviderUsage!==false;}
    if(saveButton)saveButton.disabled=false;
    renderUsage();
  }
}

const providerNames={copilot:'Copilot',codex:'Codex',claude:'Claude'};
function renderUsage() {
  const host=$('#provider-usage');if(!host)return;
  host.hidden=state.data?.settings?.appearance?.showProviderUsage===false;
  const collapsed=state.data?.settings?.appearance?.providerUsageCollapsed===true;
  host.classList.toggle('usage-collapsed',collapsed);
  host.innerHTML=`<div class="usage-heading"><span>AI Allowance</span><button id="toggle-usage" class="subtle" aria-label="${collapsed?'Expand':'Collapse'} AI allowance" aria-expanded="${!collapsed}" aria-controls="provider-usage-rows" ${appearanceBusy?'disabled':''}>${collapsed?'⌄':'⌃'}</button></div><div id="provider-usage-rows" ${collapsed?'hidden':''}>`+Object.entries(providerNames).map(([id,name])=>{
    const entry=usageValue?.providers?.[id];
    const windows=entry?.windows || [];
    const reported=windows.filter(w=>Number.isFinite(w.remainingPercent) && !w.unlimited);
    const remaining=reported.length?Math.max(0,Math.min(100,...reported.map(w=>w.remainingPercent))):null;
    const label=remaining!==null?remaining.toLocaleString(undefined,{maximumFractionDigits:1})+'%':windows.length&&windows.every(w=>w.unlimited)?'Unlimited':'Unavailable';
    return `<button class="provider-usage-row" data-usage-provider="${id}" aria-label="${name} usage details: ${label} remaining" title="${name}: ${label} remaining${entry?.stale?' · Last known':''}"><span>${name}</span><span class="usage-pill">${remaining!==null?`<progress max="100" value="${remaining}" aria-label="${name} allowance remaining"></progress>`:''}<strong>${remaining!==null?label:label==='Unlimited'?'∞':'—'}</strong></span>${entry?.stale?'<small class="usage-stale">Last known</small>':''}</button>`;
  }).join('')+'</div>';
  $('#toggle-usage').onclick=()=>saveAppearance({providerUsageCollapsed:!collapsed}).catch(e=>toast(e.message));
  host.querySelectorAll('[data-usage-provider]').forEach(button=>button.onclick=()=>showUsageDetails(button.dataset.usageProvider));
}
function showUsageDetails(id) {
  const entry=usageValue?.providers?.[id];const windows=entry?.windows || [];
  const dialog=$('#dialog');dialog.dataset.usageDetailProvider=id;
  dialog.innerHTML=`<div class="usage-dialog"><div class="heading"><div><div class="eyebrow">Account allowance</div><h2>${providerNames[id]}</h2></div><button id="usage-close" aria-label="Close usage details">×</button></div><p class="note">The sidebar shows the lowest reported remaining allowance. These account limits are separate from tokens in one chat.</p>${windows.length?windows.map(w=>{const remaining=Number.isFinite(w.remainingPercent)?Math.max(0,Math.min(100,w.remainingPercent)):null;return `<section class="usage-window"><div class="heading"><span>${escape(w.label || w.id)}</span><strong>${w.unlimited?'Unlimited':remaining===null?'Unavailable':remaining.toLocaleString(undefined,{maximumFractionDigits:1})+'% remaining'}</strong></div>${remaining!==null&&!w.unlimited?`<progress max="100" value="${remaining}" aria-label="${escape(w.label || w.id)} remaining"></progress>`:''}<p class="note">${w.resetAt?'Resets '+escape(new Date(w.resetAt).toLocaleString()):escape(w.resetNote || 'Reset time not reported')}</p></section>`;}).join(''):'<p>Account allowance has not been reported.</p>'}${entry?.error?`<p class="banner">${escape(entry.error)}</p>`:''}<p class="note">${entry?.checkedAt?'Last checked '+escape(new Date(entry.checkedAt).toLocaleString()):'Not checked'}${entry?.source?' · '+escape(entry.source):''}${entry?.observedAt?'<br>Provider observation: '+escape(new Date(entry.observedAt).toLocaleString()):''}</p><div class="actions"><button id="usage-refresh" ${usageBusy?'disabled':''}>Refresh usage</button><button id="usage-provider">Provider settings</button></div></div>`;
  if(!dialog.open)dialog.showModal();
  $('#usage-close').onclick=()=>dialog.close();
  $('#usage-refresh').onclick=()=>refreshUsage(true);
  $('#usage-provider').onclick=()=>{dialog.close();navigate('engine','providers');};
}
async function refreshUsage(force = false) {
  if (usageBusy || (!force && state.data?.settings?.appearance?.showProviderUsage===false)) return;
  usageBusy = true; renderUsage(); if($('#usage-refresh'))$('#usage-refresh').disabled=true;
  try { usageValue = await api('/api/usage', { force }); }
  catch (error) { usageValue = { ...usageValue, error: error.message }; }
  finally { usageBusy = false; renderUsage(); const dialog=$('#dialog');if(dialog.open && $('#usage-refresh') && dialog.dataset.usageDetailProvider)showUsageDetails(dialog.dataset.usageDetailProvider); }
}
function toast(text) { $('#toast').textContent = text; $('#toast').style.display = 'block'; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').style.display = 'none', 5500); }
async function api(url, data) {
  if(workspaceClosing)throw new Error('Proteus is closing.');
  const response = await fetch(url, data === undefined ? {} : { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(data) });
  const result = await response.json(); if (!response.ok) throw new Error(result.error || response.statusText); return result;
}
async function refresh(force = false) {
  if (!force && window.getSelection()?.isCollapsed === false) return;
  const data = await api('/api/state'); const signature = JSON.stringify(data);
  state.data = data;syncMessageContext();
  if (force || signature !== state.signature || $('#main').dataset.deferredControls) {
    state.signature = signature;
    const tab=state.tabs.find(t=>t.id===state.tab);
    if(tab?.type==='run' && $('#main').dataset.runId===tab.id && $('#conversation-host')) {
      renderRun(tab.id);
      for(const [page,count] of [['runs',recentChats(data.runs).length],['attention',recentChats(data.runs).filter(r=>['awaiting_input','failed','interrupted'].includes(r.status)).length]]) {
        const node=$(`[data-page="${page}"] .count`);if(node)node.textContent=count;
      }
    } else if(tab?.type==='browser' && $('#browser-form')) {renderTabs();updateBrowserControls();requestAnimationFrame(browserBounds);}
    else render();
  }
}
function openTab(tab) {
  const existing = state.tabs.find(item => item.id === tab.id);
  if (!existing) state.tabs.push(tab);
  else if (tab.type === 'markdown') Object.assign(existing, tab);
  state.tab = tab.id; state.selected = tab.id; render();
}
async function schedule(id) {
  try { state.data = await api('/api/state'); } catch (error) { toast(error.message); return; }
  const value = state.data.schedules.find(s => s.id === id); if (!value || value.error) return toast(value?.error || 'Schedule missing.');
  state.draft = structuredClone(value); state.dirty = false;
  openTab({ id, label:value.name, type:'schedule' });
}
function runTab(run) { state.page = 'runs'; openTab({ id:run.id, label:run.title, type:'run' }); }
function navigate(page, section) {
  const previous=state.tabs.find(tab=>tab.id===state.tab);
  if(previous?.type==='team' && page!=='team')void leaveTeamTools().catch(error=>toast(error.message));
  if(['omi','life','team'].includes(page)) { openFeatureTab(page); return; }
  if(page==='engine')state.engineSection=section||'resources';
  if(page==='life-section') { openFeatureTab('life'); return; }
  state.page=page;state.tab='overview';state.tabs[0].label=page==='runs'?'Chats':page==='attention'?'Needs attention':page==='engine'?'Engine Room':page==='remote'?'Connections':page==='settings'?'App Setup':page[0].toUpperCase()+page.slice(1);render();
}
function render() {
  const data = state.data; if (!data) return;
  restoreFeatureTabs();syncMessageContext();
  const activeTab=state.tabs.find(tab=>tab.id===state.tab);
  const activePage=['omi','life','team'].includes(activeTab?.type)?activeTab.type:['run','remote-run'].includes(activeTab?.type)?'runs':activeTab?.type==='schedule'?'schedules':state.page;
  const waiting = recentChats(data.runs).filter(r => ['awaiting_input','failed','interrupted'].includes(r.status)).length;
  const nav=[['schedules','◷','Schedules',data.schedules.length],['runs',pairedBubbles,'Chats',recentChats(data.runs).length],['attention','!','Needs attention',waiting],['omi','<svg class="transcription-nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M2 10v4M6 7v10M10 3v18M14 8v8M18 5v14M22 10v4"/></svg>','Transcription',''],...(lifeVisible()?[['life','♡','Life','']]:[]),['team','☷','Team Tools',''],['context','▦','Workspaces',''],['engine','⚙','Engine Room','']];
  const children=id=>id==='runs'?recentChats(data.runs).slice(0,5).map((row,i)=>`<button class="navchild" data-recent-chat="${i}" title="${escape(row.title||'Chat')}"><span>${escape(row.title||'Chat')}</span><small>${escape(row.destinationName||'This Mac')}</small></button>`).join('')+'<button class="navchild" data-page="runs">More</button>':id==='life'?['Overview','Nutrition','Garage','Fuel & mileage','Capture inbox','New capture','Account & security','Connections'].map((name,i)=>`<button class="navchild" data-life-section="${['overview','nutrition','garage','fuel','inbox','capture','security','connections'][i]}">${escape(name)}</button>`).join(''):id==='engine'?engineSections().map(([key,label])=>`<button class="navchild ${state.engineSection===key?'active':''}" data-engine-section="${key}">${escape(label)}</button>`).join(''):id==='team'?'<button class="navchild" data-team-section="overview">Overview</button><button class="navchild" data-team-section="standup">Standup</button>':' ';
  $('#sidebar').innerHTML = `<div class="brand"><span class="brandmark">⤨</span><span class="brand-text">Proteus</span><button id="sidebar-toggle" class="subtle" aria-label="Collapse sidebar" title="Collapse sidebar">‹</button></div><nav aria-label="Features">${nav.map(([id,icon,label,count])=>`<button class="navitem ${activePage===id?'active':''}" data-page="${id}"><span><span class="nav-icon">${icon}</span><span class="navlabel">${label}</span></span>${count!==''?`<span class="count">${count}</span>`:''}</button>${activePage===id?`<div class="navchildren">${children(id)}</div>`:''}`).join('')}</nav><div class="sidebottom"><section id="provider-usage" aria-label="Provider allowance remaining"></section><div><span class="dot"></span>Local runner online</div><p>Prototype · v${data.version}<br>${data.scheduler.background ? 'Keeps running in the menu bar.' : 'Runs while the host is running.'}</p><button class="subtle" id="data-folder">Open data folder ↗</button></div>`;
  renderUsage();
  renderTabs();
  saveWorkspace();
  if(previousFeature==='team'&&activeTab?.type!=='team')void leaveTeamTools().catch(error=>toast(error.message));
  previousFeature=activeTab?.type||'';
  $('#main').classList.remove('browser-main', 'run-main', 'team-main');
  const tab = state.tabs.find(t => t.id === state.tab);
  if (tab?.type === 'schedule') renderSchedule(tab.id);
  else if (tab?.type === 'run') renderRun(tab.id);
  else if (tab?.type === 'remote-run') void renderRemoteRun(tab);
  else if (tab?.type === 'browser') renderBrowser();
  else if (tab?.type === 'markdown') renderMarkdown();
  else if (tab?.type === 'standup') renderStandup();
  else if (tab?.type === 'omi') renderOmi();
  else if (tab?.type === 'life') renderLife();
  else if (tab?.type === 'team') renderTeamTools();
  else if (tab?.type === 'terminal') renderTerminal(tab);
  else if (state.page === 'context') renderContext();
  else if (state.page === 'credentials') renderCredentials();
  else if (state.page === 'remote') renderRemote({ api, escape, toast });
  else if (state.page === 'settings') renderSettings();
  else if (state.page === 'providers') renderProviders();
  else if (state.page === 'engine') renderEngineRoom(state.engineSection);
  else if (state.page === 'runs' || state.page === 'attention') renderChatsIndex(state.page==='attention');
  else renderOverview();
  document.querySelectorAll('[data-page]').forEach(button => button.onclick = () => navigate(button.dataset.page));
  document.querySelectorAll('[data-engine-section]').forEach(button=>button.onclick=()=>navigate('engine',button.dataset.engineSection));
  document.querySelectorAll('[data-team-section]').forEach(button=>button.onclick=()=>{teamState().active=button.dataset.teamSection;openFeatureTab('team');});
  document.querySelectorAll('#sidebar [data-life-section]').forEach(button=>button.onclick=()=>{openFeatureTab('life');selectLifeSection(button.dataset.lifeSection);});
  document.querySelectorAll('[data-recent-chat]').forEach(button=>button.onclick=()=>openIndexedChat(recentChats(data.runs)[Number(button.dataset.recentChat)]));
  $('#sidebar-toggle').textContent=sidebarMinimized?'›':'‹';$('#sidebar-toggle').setAttribute('aria-label',sidebarMinimized?'Expand sidebar':'Collapse sidebar');$('#sidebar-toggle').onclick=()=>{sidebarMinimized=!sidebarMinimized;document.body.classList.toggle('sidebar-minimized',sidebarMinimized);localStorage.setItem('proteus.sidebar.minimized',String(sidebarMinimized));render();requestAnimationFrame(browserBounds);};
  $('#data-folder').onclick = () => window.desktop ? window.desktop.openPath(data.home) : toast(data.home);
  if (!['browser','team'].includes(tab?.type)) window.desktop?.browser({action:'hide'}).catch(e=>toast(e.message));
}
function renderOverview() {
  const data = state.data;
  $('#main').innerHTML = `<div class="heading"><div><div class="eyebrow">Set the rhythm</div><h1>Work that keeps moving.</h1><div class="muted">Give recurring work a schedule. Step in when it needs you.</div></div><div class="actions"><button id="import">Import JSON</button><button class="primary" id="new-schedule">＋ New schedule</button></div></div><div class="stats"><div class="stat"><span class="eyebrow">Schedules enabled</span><strong>${data.schedules.filter(s=>s.enabled).length}<span class="muted small"> / ${data.schedules.length}</span></strong></div><div class="stat"><span class="eyebrow">Runs recorded</span><strong>${data.runs.length}</strong></div><div class="stat"><span class="eyebrow">Waiting for you</span><strong>${data.runs.filter(r=>r.status==='awaiting_input').length}</strong></div></div><div class="card"><div class="heading"><h2>Your schedules</h2><span class="pill">JSON files · Live reload</span></div><table><thead><tr><th>Schedule</th><th>Cadence</th><th>Provider</th><th>Status</th><th></th></tr></thead><tbody>${data.schedules.map(s=>`<tr class="clickable" data-schedule="${escape(s.id)}"><td><strong>${escape(s.name || s.id)}</strong><div class="muted">${escape(s.error || s.workspace?.cwd.split('/').pop())}</div></td><td><code>${escape(s.cron || 'Invalid file')}</code><div class="muted">${escape(s.timezone || '')}</div></td><td>${escape(s.provider === 'rehearsal' ? 'Local rehearsal' : s.provider)}<div class="muted">${escape(s.model || 'No model usage')}</div></td><td>${badge(s.error ? 'failed' : s.enabled ? 'Enabled' : 'Paused')}</td><td>↗</td></tr>`).join('')}</tbody></table></div><p class="note">Edit schedule files in your editor or with an AI agent. Changes are validated before execution. Imported schedules start paused.</p>${data.schedulerErrors.length ? `<div class="banner">Scheduler: ${escape(data.schedulerErrors.at(-1).error)}</div>` : ''}${data.recoveryErrors.length ? `<div class="banner">Some run files could not be loaded. Inspect the data folder before continuing.</div>` : ''}`;
  document.querySelectorAll('[data-schedule]').forEach(el=>el.onclick=()=>schedule(el.dataset.schedule));
  $('#new-schedule').onclick = newSchedule; $('#import').onclick = importDialog;void mountRemoteSchedules();
}
function renderSchedule(id) {
  const managed = state.data.schedules.find(item => item.id === id);
  if (managed?.provider === 'local-process') return renderManagedSchedule(managed);
  const contextOpen = $('#schedule-context')?.open;
  const original = state.data.schedules.find(s=>s.id===id);
  if (!original || original.error) { $('#main').innerHTML = `<div class="banner">${escape(original?.error || 'Schedule no longer exists.')}</div>`; return; }
  if (!state.draft || state.draft.id !== id || (!state.dirty && state.draft.revision !== original.revision)) state.draft = structuredClone(original);
  const s = state.draft;
  $('#main').innerHTML = `<div class="heading"><div><div class="eyebrow">Schedule / ${escape(s.id)}</div><h1>${escape(s.name)}</h1><div class="muted">${escape(s.provider === 'rehearsal' ? 'A no-cost rehearsal of scheduling, feedback, and continuation.' : 'A persistent conversation for every run.')}</div></div><div class="actions">${badge(s.enabled?'Enabled':'Paused')}<button class="primary" id="run-now">▶ Run now</button></div></div><p class="note">${s.source?.manifest ? `Owned by ${escape(s.source.system)} · Edit this source, then export/reconcile it into Proteus: <span class="filepath">${escape(s.source.manifest)}</span><button id="source-file">Open source manifest ↗</button><br>Proteus reads this exported schedule file: <span class="filepath">${escape(original.file)}</span>` : `App-owned schedule · ${escape(original.file)}`}</p><div class="grid"><section class="card"><h2>Schedule settings</h2>${state.dirty && s.revision !== original.revision ? '<p class="banner" role="status">The file changed outside Proteus. Your unsaved edits are preserved. Reload file to use the current file; saving this older draft is blocked.</p>' : ''}<div class="field"><label for="name">Name</label><input id="name" value="${escape(s.name)}"></div><div class="row"><div><label for="cron">Cron expression</label><input id="cron" class="cron" value="${escape(s.cron)}"></div><div><label for="timezone">Time zone</label><input id="timezone" value="${escape(s.timezone)}"></div></div><div class="row"><div><label for="provider">Provider</label><select id="provider"><option value="rehearsal" ${s.provider==='rehearsal'?'selected':''}>Local rehearsal</option><option value="copilot" ${s.provider==='copilot'?'selected':''}>GitHub Copilot</option><option value="codex" ${s.provider==='codex'?'selected':''}>Codex</option><option value="claude" ${s.provider==='claude'?'selected':''}>Claude</option></select></div><div><label for="model">Model ID</label>${modelPicker('model',s.model,s.provider)}<button class="subtle" id="model-refresh">↻ Refresh models</button></div></div>${modelControls('model',s)}<div class="field"><label for="cwd">Workspace directory</label><input id="cwd" value="${escape(s.workspace.cwd)}"></div><div class="field"><label for="roots">Additional directories · one per line</label><textarea id="roots" rows="2">${escape(s.workspace.additionalDirectories.join('\n'))}</textarea></div><div class="field"><label for="prompt">Instructions</label><textarea id="prompt" rows="5">${escape(s.prompt)}</textarea></div><div class="row"><div><label for="misfire">After missed runs</label><select id="misfire"><option value="skip" ${s.misfire==='skip'?'selected':''}>Wait for the next scheduled time</option><option value="coalesce" ${s.misfire==='coalesce'?'selected':''}>Catch up once when available</option></select></div><div><label for="enabled">Execution</label><select id="enabled"><option value="false" ${!s.enabled?'selected':''}>Paused</option><option value="true" ${s.enabled?'selected':''}>Enabled</option></select></div></div><label class="checkbox-row"><input id="schedule-notify" type="checkbox" ${s.notifications?.onCompletion===true?'checked':''}>Notify when this schedule completes</label>${contextPicker(s.contextSelection?.selectedIds || [], 'schedule', s.contextSelection || {})}<div class="formfooter"><span class="note" id="save-state">${state.dirty?'Unsaved changes':'Saved as a plain JSON file'}</span><div class="actions"><button id="reload">Reload file</button><button class="primary" id="save">Save schedule</button></div></div></section><div class="stack"><section class="card"><div class="heading"><h2>Next five runs</h2><button class="subtle" id="preview">↻ Preview</button></div><ul id="next-runs" class="nextlist">${(s.nextRuns || []).map((date,i)=>`<li><span class="muted">${i===0?'Next':String(i+1).padStart(2,'0')}</span><span>${escape(time(date,s.timezone))}</span></li>`).join('')}</ul><p class="note">${escape(s.timezone)} · Paused schedules show projected times.</p></section><section class="card"><div class="heading"><h2>The source of truth</h2><button class="subtle" id="open-file">Open file ↗</button></div><div class="filepath">${escape(original.file)}</div><p class="note">Reopening or Reload file reads the latest JSON from disk. External edits refresh automatically while this editor has no unsaved changes. Existing chats keep their captured schedule.</p><pre id="json-preview">${escape(JSON.stringify(clean(s),null,2))}</pre></section></div></div>`;
  const update = () => {
    Object.assign(s,{name:$('#name').value,cron:$('#cron').value,timezone:$('#timezone').value,provider:$('#provider').value,model:$('#model').value,...modelSelection('model'),prompt:$('#prompt').value,misfire:$('#misfire').value,enabled:$('#enabled').value==='true',workspace:{cwd:$('#cwd').value,additionalDirectories:$('#roots').value.split('\n').map(x=>x.trim()).filter(Boolean)}});
    s.notifications={...s.notifications,onCompletion:$('#schedule-notify').checked};
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
function renderManagedSchedule(original) {
  if (!state.draft || state.draft.id !== original.id || (!state.dirty && state.draft.revision !== original.revision)) state.draft=structuredClone(original);
  const s=state.draft;
  $('#main').innerHTML = `<div class="heading"><div><div class="eyebrow">Omi / Scheduled service</div><h1>${escape(s.name)}</h1><p class="muted">${escape(s.prompt)}</p></div>${badge(s.enabled ? 'Enabled' : 'Paused')}</div><div class="grid"><section class="card"><h2>Native processing</h2>${state.dirty && s.revision !== original.revision ? '<p class="banner">The schedule changed outside Proteus. Your draft is preserved; reload before saving.</p>' : ''}<p>Runs the installed Omi worker with its existing configuration and file locks. Execution also requires the Omi integration to be enabled after cutover.</p><div class="row"><label>Cron expression<input id="managed-cron" value="${escape(s.cron)}"></label><label>Time zone<input id="managed-timezone" value="${escape(s.timezone)}"></label></div><label>Schedule execution<select id="managed-enabled"><option value="false" ${!s.enabled?'selected':''}>Paused</option><option value="true" ${s.enabled?'selected':''}>Enabled after Omi cutover</option></select></label><label class="checkbox-row"><input id="managed-notify" type="checkbox" ${s.notifications?.onCompletion===true?'checked':''}>Notify when this schedule completes</label><div class="actions"><button class="primary" id="managed-save">Save schedule</button><button id="managed-reload">Reload file</button><button id="managed-settings">Omi settings & logs</button><button id="managed-run">Run now</button></div><p class="note" id="managed-save-state">${state.dirty?'Unsaved changes':'Fixed service commands are managed in Omi settings.'}</p></section><section class="card"><h2>Next projected runs</h2><ul class="nextlist">${(s.nextRuns || []).map(date => `<li>${escape(time(date,s.timezone))}</li>`).join('')}</ul><p class="note">Paused schedules show projected times.</p></section></div><section class="card"><h2>Schedule file</h2><p class="filepath">${escape(s.file)}</p><pre>${escape(JSON.stringify(clean(s),null,2))}</pre></section>`;
  const update=()=>{Object.assign(s,{cron:$('#managed-cron').value,timezone:$('#managed-timezone').value,enabled:$('#managed-enabled').value==='true',notifications:{...s.notifications,onCompletion:$('#managed-notify').checked}});state.dirty=true;$('#managed-save-state').textContent='Unsaved changes';};
  for(const selector of ['#managed-cron','#managed-timezone','#managed-enabled','#managed-notify'])$(selector).addEventListener('input',update);
  $('#managed-save').onclick=async()=>{try{await api('/api/schedules',{schedule:clean(s),expectedRevision:s.revision});state.dirty=false;await refresh(true);toast('Schedule saved. The Omi execution gate still applies.');}catch(error){toast(error.message);}};
  $('#managed-reload').onclick=()=>schedule(s.id);
  $('#managed-settings').onclick=()=>openFeatureTab('omi');
  $('#managed-run').onclick=async()=>{try{if(state.dirty)throw new Error('Save your changes before running.');const run=await api('/api/run',{id:s.id});await refresh();runTab(run);}catch(error){toast(error.message);}};
}
function renderRuns() {
  const runs=state.data.runs.filter(r=>state.page!=='attention'||['awaiting_input','failed','interrupted'].includes(r.status));
  $('#main').innerHTML=`<div class="heading"><div><div class="eyebrow">Every run has a story</div><h1>${state.page==='attention'?'Ready for your input.':'Pick up where you left off.'}</h1><div class="muted">Open any run to inspect its history or continue the conversation.</div></div></div><div class="card">${runs.length?`<table><thead><tr><th>Run</th><th>Started</th><th>Provider</th><th>Status</th><th>Tokens</th></tr></thead><tbody>${runs.map(r=>`<tr class="clickable" data-run="${r.id}"><td><strong>${escape(r.title)}</strong><div class="muted">${escape(r.trigger)} · ${r.id.slice(0,8)}</div></td><td>${time(r.createdAt)}</td><td>${escape(r.schedule.provider)}</td><td>${badge(r.status)}</td><td>${r.usage.observed?(r.usage.inputTokens+r.usage.outputTokens).toLocaleString():'—'}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">No runs here yet.<br>Open a schedule and choose Run now to try the feedback flow.</div>'}</div>`;
  document.querySelectorAll('[data-run]').forEach(el=>el.onclick=()=>runTab(state.data.runs.find(r=>r.id===el.dataset.run)));
  if(state.page==='runs')mountMachineHistory();
}
function updateConversation(run) {
  conversation($('#conversation-host'), run, {
    time, copy: text => window.desktop ? window.desktop.copyText(text) : navigator.clipboard.writeText(text),
    link: source => openMessageLink(source, run.schedule.workspace.cwd),
    image: async source => (await api('/api/chat-image', { id: run.id, source })).dataURL
  });
}
function renderNativeRun(run) {
  $('#main').classList.remove('run-main');
  $('#main').innerHTML=`<div class="heading"><div><div class="eyebrow">Omi / Native processing</div><h1>${escape(run.title)}</h1><p class="muted">${escape(time(run.createdAt))}</p></div><div class="actions">${badge(run.status)}${['queued','running'].includes(run.status)?'<button class="danger" id="native-cancel">Stop process</button>':''}</div></div><section class="card"><h2>Processing activity</h2><p class="note">Process completion is separate from successful transcription or filing. The worker retains its own outcomes, claims and recovery state.</p>${run.events.map(event=>`<article class="message system"><span class="note">${escape(time(event.at))}</span><pre>${escape(event.text)}</pre></article>`).join('')}</section>`;
  $('#native-cancel')?.addEventListener('click',async()=>{try{await api(`/api/runs/${run.id}/cancel`,{});await refresh(true);}catch(error){toast(error.message);}});
}
function renderRun(id) {
  const nativeRun=state.data.runs.find(run=>run.id===id && run.schedule.provider==='local-process');
  if(nativeRun)return renderNativeRun(nativeRun);
  $('#main').classList.add('run-main');
  $('#main').classList.toggle('show-chat-details', !!state.showChatDetails);
  state.detailScroll ??= {};
  const previousDetails = $('.chat-details');
  if (previousDetails) state.detailScroll[previousDetails.dataset.runId] = previousDetails.scrollTop;
  const run=state.data.runs.find(r=>r.id===id);if(!run)return;
  const main=$('#main');
  const controlSignature=JSON.stringify([run.status,run.pending,run.queuedMessages,run.schedule,run.permissionContext,run.permissionRevision,run.providerSessionId,run.nativeSessionPath,run.modelCapabilities,run.nextModelOptions,state.showChatDetails]);
  const interacting=main.contains(document.activeElement)&&document.activeElement.matches('input,select,textarea')&&document.activeElement.id!=='followup';
  if(main.dataset.runId===id && $('#conversation-host') && (main.dataset.controlSignature===controlSignature || interacting)) {
    if(main.dataset.controlSignature!==controlSignature)main.dataset.deferredControls='true';else delete main.dataset.deferredControls;
    updateConversation(run);
    const input=$('[data-usage-input]'),output=$('[data-usage-output]'),approvals=$('[data-auto-approvals]');
    if(input)input.textContent=run.usage.observed?run.usage.inputTokens.toLocaleString():'—';
    if(output)output.textContent=run.usage.observed?run.usage.outputTokens.toLocaleString():'—';
    if(approvals)approvals.textContent=run.automaticApprovals || 0;
    const usage=$('[data-usage-note]');if(usage)usage.textContent=run.usage.observed?'Observed provider usage.':'No provider usage reported. Rehearsals make no model calls.';
    return;
  }
  const expanded=new Set([...main.querySelectorAll('.chat-details details[open]')].map(d=>d.querySelector('summary')?.textContent));
  delete main.dataset.deferredControls;main.dataset.runId=id;main.dataset.controlSignature=controlSignature;
  const pending=run.pending;
  const active=['queued','running','awaiting_input'].includes(run.status);
  const composerFocus=document.activeElement?.id==='followup';const cursor=$('#followup')?.selectionStart;
  state.chatDrafts ??= {};state.chatModelDrafts ??= {};
  const modelDraft = state.chatModelDrafts[id] || run.nextModelOptions || run.schedule;
  $('#main').innerHTML=`<div class="heading"><div><div class="eyebrow">${escape(run.schedule.provider)} / ${run.id.slice(0,8)}</div><h1>${escape(run.title)}</h1><div class="muted">${time(run.createdAt)} · ${escape(run.schedule.model || 'Local rehearsal, no AI calls')}</div></div><div class="actions"><button id="toggle-chat-details">${state.showChatDetails?'Chat':'Details'}</button>${badge(run.status)}</div></div><div class="grid chat-grid"><section class="card chat-pane"><div id="conversation-host"></div>${pending?`<div class="pending"><div class="eyebrow">Your input is needed</div><p>${escape(pending.question)}</p>${pending.details?`<div id="request-summary"></div><details class="raw-details"><summary>Raw request</summary><pre>${escape(JSON.stringify(pending.details,null,2))}</pre></details>`:''}${pending.type==='permission'?'<div class="actions"><button id="deny">Deny</button><button class="primary" id="approve">Approve once</button></div>'+permissionChoices(pending):`<textarea id="answer" placeholder="Add your feedback…" rows="2"></textarea><div class="actions"><button class="primary" id="reply">Send feedback</button></div>`}</div>`:run.status==='running'?'<p class="note" role="status"><span class="spinner" aria-hidden="true"></span>Working… you can queue a message or steer this turn.</p>':''}<div class="composer"><textarea id="followup" placeholder="${active?'Add an update while this runs…':'Continue this conversation…'}" rows="2">${escape(state.chatDrafts[id]||'')}</textarea><div class="composer-footer"><div class="composer-models" ${run.schedule.provider==='rehearsal'?'hidden':''}><input type="hidden" id="run-provider" value="${escape(run.schedule.provider)}">${modelPicker('run-model',modelDraft.model,run.schedule.provider)}${modelControls('run-model',modelDraft,true)}<button class="subtle" id="run-model-refresh" aria-label="Refresh model choices" title="Refresh model choices">↻</button></div><div class="composer-actions">${active?`<button id="steer" title="Send into the running turn using its current model settings" ${run.status!=='running'?'disabled':''}>Steer</button>`:''}<button class="primary" id="continue" title="${active?'Send after the current turn finishes':'Send message'}">${active?'Queue':'Send ↑'}</button>${['running','awaiting_input'].includes(run.status)?'<button class="danger" id="cancel" title="Stop the running turn">Stop</button>':''}</div></div>${run.queuedMessages?.length?`<p class="note">${run.queuedMessages.length} message(s) queued for after this turn.</p>${run.queuedMessages.map(m=>`<div class="queued-message"><span>${escape(m.prompt.slice(0,120))}</span><button data-remove-message="${escape(m.id)}" aria-label="Remove queued message">×</button></div>`).join('')}`:''}</div></section><div class="stack chat-details"><section class="card"><h2>Run details</h2>${permissionControls(run.permissionContext,{runId:run.id})}<p class="note"><span data-auto-approvals>${run.automaticApprovals || 0}</span> tool requests approved automatically. Approval details are retained in the run record.</p><p class="note">The original schedule and earlier context versions are retained when you refresh this chat.</p><div class="filepath">${[run.schedule.workspace.cwd,...run.schedule.workspace.additionalDirectories].map(escape).join('<br>')}</div><hr class="divider"><div class="usagegrid"><div class="usagebox"><span class="eyebrow">Input tokens</span><strong data-usage-input>${run.usage.observed?run.usage.inputTokens.toLocaleString():'—'}</strong></div><div class="usagebox"><span class="eyebrow">Output tokens</span><strong data-usage-output>${run.usage.observed?run.usage.outputTokens.toLocaleString():'—'}</strong></div></div><p class="note" data-usage-note>${run.usage.observed?'Observed provider usage.':'No provider usage reported. Rehearsals make no model calls.'}</p><div class="note">${run.providerSessionId?'Provider session: '+escape(run.providerSessionId):'Session history saved locally.'}</div></section>${run.schedule.provider === 'copilot' ? `<section class="card"><h2>MCP connections</h2><p class="note">Connect selected integrations such as Atlassian. Sign-in opens on this Mac; the provider stores tokens outside chat.</p><button id="mcp-connections">Manage connections</button></section>` : ''}${sessionDetails(run)}<section class="card"><h2>Completion means a turn ended</h2><p class="note">Workflow completion still depends on its own validation and source coverage. A model finishing its response doesn’t certify external work.</p><details><summary>Schedule snapshot</summary><pre>${escape(JSON.stringify(run.schedule,null,2))}</pre></details></section></div></div>`;
  updateConversation(run);
  main.querySelectorAll('.chat-details details').forEach(d=>{if(expanded.has(d.querySelector('summary')?.textContent))d.open=true;});
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
  const sendMessage=async mode=>{const text=$('#followup').value;const modelOptions={model:$('#run-model').value,...modelSelection('run-model')};try{await api(`/api/runs/${id}/send`,{prompt:text,mode,messageId:crypto.randomUUID(),...(mode==='queue'&&run.schedule.provider!=='rehearsal'?{modelOptions}:{})});state.chatDrafts[id]='';$('#followup').value='';updateButtons();if(mode==='queue')delete state.chatModelDrafts[id];await refresh(true);}catch(e){toast(e.message);}};
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
  $('#main').innerHTML=`<div class="heading"><div><div class="eyebrow">Bring your own engine</div><h1>Providers</h1><div class="muted">Separate sign-ins and live capabilities for each provider.</div></div></div><div class="grid">${[['copilot','GitHub Copilot'],['codex','Codex'],['claude','Claude']].map(([id,name])=>{
    const p=statuses[id];return `<section class="card"><div class="heading"><h2>${name}</h2>${badge(p?.available?'Connected':p?'Unavailable':'Not checked')}</div><p class="note">${id==='copilot'?'Uses the official Copilot SDK and your Copilot account.':id==='codex'?'Uses the installed Codex CLI and its existing sign-in. Run codex login on this Mac if needed.':'Uses the installed Claude Code CLI and its sign-in. Claude desktop and CLI authentication may be separate.'}</p><div class="actions"><button data-refresh-provider="${id}">Refresh connection & models</button>${p?.authenticationCommand&&!p?.available?`<button data-copy-provider-login="${id}">Copy sign-in command</button>`:''}</div>${p?.error?`<p class="banner">${escape(p.error)}</p>`:''}<p class="note">${p?.checkedAt?'Checked '+escape(time(p.checkedAt)):'Not checked'} · refreshes at launch and every five minutes</p><p class="note">View allowance and reset details in Engine Room → Usage.</p><ul class="nextlist">${(p?.models || []).map(m=>`<li><span>${escape(m.name||m.id)}</span><div><code>${escape(m.id)}</code><div class="note">Effort: ${escape(m.controls?.reasoningEfforts?.join(', ') || 'Not reported')}<br>${(m.controls?.contextTiers || []).map(t=>escape(contextSize(t))).join('<br>')}<br>Speed: ${escape((m.controls?.serviceTiers || []).map(t=>t.name||t.id).join(', ') || 'Provider default')}</div></div></li>`).join('')}</ul>${id==='codex'?'<p class="note">Selected instructions and skills are supplied as context. Agent prompts work when they do not declare editor-specific tool filters. Codex grants MCP access per selected server; each provider has separate workspace approvals. Chats remain with their original provider.</p>':''}</section>`;
  }).join('')}</div>`;
  document.querySelectorAll('[data-copy-provider-login]').forEach(button=>button.onclick=async()=>{
    const command=statuses[button.dataset.copyProviderLogin]?.authenticationCommand;
    if(!command)return;
    const quote=value=>"'"+String(value).split("'").join("'\"'\"'")+"'";
    const text=[command.executable,...command.args].map(quote).join(' ');
    if(window.desktop)await window.desktop.copyText(text);else await navigator.clipboard.writeText(text);
    toast('Sign-in command copied. Run it in Terminal, then refresh this provider.');
  });
  document.querySelectorAll('[data-refresh-provider]').forEach(button=>button.onclick=async()=>{button.disabled=true;try{await api('/api/provider',{provider:button.dataset.refreshProvider,force:true});await refresh(true);}catch(e){toast(e.message);button.disabled=false;}});
}
async function manageMcp(run) {
  showDialog(`<h2>MCP connections</h2><p class="note" id="mcp-status" role="status">Checking connections…</p><div id="mcp-list"></div><div class="actions"><button id="close-dialog">Close</button><button id="dialog-submit">Refresh connections</button></div>`,()=>{});
  const dialog=$('#dialog'),list=$('#mcp-list'),status=$('#mcp-status');
  const alive=()=>dialog.open && $('#mcp-list')===list;
  let busy=false,checking=false,version=0,timer,waiting=null,listSignature='',end=Date.now()+600_000;
  const connect=async button=>{
    if(busy)return; busy=true;version++;end=Date.now()+600_000;button.disabled=true;button.textContent='Opening sign-in…';
    status.textContent='Starting '+button.dataset.connectMcp+' sign-in. Watch for a browser or macOS Keychain prompt.';
    try {
      const result=await api('/api/mcp',{runId:run.id,action:'login',server:button.dataset.connectMcp,openOnMac:!!window.desktop});
      if(!alive())return;
      if(result.authorizationUrl)window.open(result.authorizationUrl,'_blank','noopener,noreferrer');
      waiting=result.status==='connected'?null:button.dataset.connectMcp;
      status.textContent=waiting?'Finish sign-in in the browser on this Mac. Checking automatically for the connection…':'Connected. Continue or steer the chat to retry its work.';
    }catch(e){if(alive())status.textContent='Sign-in failed: '+e.message;}
    finally{busy=false;if(alive()){button.disabled=false;button.textContent=waiting?'Restart sign-in':'Connect / sign in';await load();clearTimeout(timer);timer=setTimeout(poll,5000);}}
  };
  const load=async()=>{
    if(busy || checking || !alive())return;checking=true;const current=version;
    try {
      const value=await api('/api/mcp',{runId:run.id,action:'status'});if(!alive() || current!==version)return;
      const signature=JSON.stringify([value.servers,waiting]);
      if(signature!==listSignature){listSignature=signature;list.innerHTML=value.servers.map(s=>`<section class="card"><strong>${escape(s.name)}</strong> ${badge(s.status)}${s.error?`<p class="note">${escape(s.error)}</p>`:''}${s.remote&&s.status!=='connected'?`<button data-connect-mcp="${escape(s.name)}">${waiting===s.name?'Restart sign-in':'Connect / sign in'}</button>`:''}</section>`).join('') || '<p>No selected MCP servers.</p>';
      list.querySelectorAll('[data-connect-mcp]').forEach(button=>button.onclick=()=>connect(button));}
      if(waiting&&value.servers.some(s=>s.name===waiting&&s.status==='connected')){status.textContent='Connected to '+waiting+'. Continue or steer the chat to retry its work.';waiting=null;}
      else if(status.textContent==='Checking connections…')status.textContent='Connections update automatically while this window is open. Sign-in opens on this Mac.';
    }catch(e){if(alive() && current===version)status.textContent='Could not check connections: '+e.message;}
    finally{checking=false;}
  };
  const poll=async()=>{if(!alive())return;await load();if(!alive())return;if(Date.now()<end)timer=setTimeout(poll,5000);else if(waiting)status.textContent='Still not connected. The sign-in may have timed out; use Restart sign-in or Refresh connections.';};
  dialog.addEventListener('close',()=>clearTimeout(timer),{once:true});
  $('#dialog-submit').onclick=load;await load();timer=setTimeout(poll,5000);
}
function showDialog(html, submit) {
  $('#dialog').innerHTML=html;$('#dialog').showModal();$('#close-dialog').onclick=()=>$('#dialog').close();if($('#dialog-submit'))$('#dialog-submit').onclick=async()=>{try{await submit();$('#dialog').close();await refresh(true);}catch(e){toast(e.message);}};
}
function chatDialog() {
  const defaults=state.data.settings; const context=state.data.context;
  const profile=context.workspaces.find(w=>w.id===context.defaultWorkspaceId);
  showDialog(`<h2>Start a workspace chat</h2><div class="field"><label>Workspace</label><select id="chat-workspace">${context.workspaces.map(w=>`<option value="${escape(w.id)}" ${w.id===profile.id?'selected':''}>${escape(w.name)}</option>`).join('')}</select></div><div class="field"><label>Command starting folder</label><input id="chat-cwd" value="${escape(profile.cwd)}"></div><details><summary>Workspace folders</summary><textarea id="chat-roots" rows="3">${escape(profile.additionalDirectories.join('\n'))}</textarea></details><div class="row"><div><label>Provider</label><select id="chat-provider"><option value="copilot" ${defaults.provider==='copilot'?'selected':''}>GitHub Copilot</option><option value="codex" ${defaults.provider==='codex'?'selected':''}>Codex</option><option value="claude" ${defaults.provider==='claude'?'selected':''}>Claude</option><option value="rehearsal" ${defaults.provider==='rehearsal'?'selected':''}>Local rehearsal</option></select></div><div><label>Model</label>${modelPicker('chat-model',defaults.model,defaults.provider)}<button class="subtle" id="chat-model-refresh">↻ Refresh models</button></div></div>${modelControls('chat-model',defaults)}${contextPicker()}<div class="field"><label>Message</label><textarea id="chat-prompt" rows="4" placeholder="What would you like to work on?"></textarea></div><div class="actions"><button id="close-dialog">Cancel</button><button class="primary" id="dialog-submit">Start chat</button></div>`,async()=>{
    const run=await api('/api/chat',{workspaceId:$('#chat-workspace').value,workspace:{cwd:$('#chat-cwd').value,additionalDirectories:lines($('#chat-roots').value)},provider:$('#chat-provider').value,model:$('#chat-model').value,...modelSelection('chat-model'),prompt:$('#chat-prompt').value,...contextSelection()});await refresh();runTab(run);
  });
  $('#chat-workspace').onchange=()=>{const workspace=context.workspaces.find(w=>w.id===$('#chat-workspace').value);$('#chat-cwd').value=workspace.cwd;$('#chat-roots').value=workspace.additionalDirectories.join('\n');};
  $('#chat-provider').onchange=()=>refreshModels('chat-model','chat-provider');
  $('#chat-model-refresh').onclick=()=>refreshModels('chat-model','chat-provider',true);
  bindContextPicker('chat', { workspace: () => ({ cwd: $('#chat-cwd').value, additionalDirectories: lines($('#chat-roots').value) }) });
  for (const id of ['chat-cwd', 'chat-roots']) $('#' + id).addEventListener('input', () => $('#chat-context').updatePreview());
  $('#chat-workspace').addEventListener('change', () => $('#chat-context').updatePreview());
  void refreshModels('chat-model','chat-provider');
  void attachChatDestinations(chatDialog);
}

function newSchedule() {
  showDialog('<h2>New schedule</h2><div class="field"><label>Name</label><input id="new-name" placeholder="Weekly workspace review"></div><div class="actions"><button id="close-dialog">Cancel</button><button class="primary" id="dialog-submit">Create paused schedule</button></div>',async()=>{
    const name=$('#new-name').value.trim();if(!name)throw new Error('Enter a name.');const defaults=state.data.settings;
    const id=name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)+'-'+Date.now().toString(36);
    await api('/api/schedules',{schedule:{schemaVersion:1,id,name,enabled:false,cron:'0 9 * * 1-5',timezone:defaults.timezone,provider:defaults.provider,model:defaults.model,reasoningEffort:defaults.reasoningEffort,contextTier:defaults.contextTier,workspace:defaults.workspace,skillDirectories:defaults.skillDirectories,mcpServers:defaults.mcpServers,misfire:'skip',prompt:'Review this workspace and ask for feedback.'}});await refresh();schedule(id);
  });
}
function importDialog() { showDialog('<h2>Import schedules</h2><p class="note">Paste a JSON schedule or array. Imports are always paused.</p><textarea id="import-json" rows="10" placeholder="[{ … }]"></textarea><div class="actions"><button id="close-dialog">Cancel</button><button class="primary" id="dialog-submit">Import</button></div>',async()=>{const value=JSON.parse($('#import-json').value);await api('/api/import',{schedules:Array.isArray(value)?value:[value]});}); }
function markdownDialog() { openMarkdownPicker('open'); }
function renderMarkdown() {
  const markdown=state.tabs.find(t=>t.id===state.tab)?.markdown || state.markdown;
  if(markdown?.error){$('#main').innerHTML=`<div class="heading"><h1>${escape(markdown.file?.split('/').pop())}</h1></div><p class="banner">${escape(markdown.error)}</p><p class="note">This file must still be inside a currently authorized workspace.</p><button id="markdown-retry">Retry file</button>`;$('#markdown-retry').onclick=async()=>{try{const value=await api('/api/markdown',{file:markdown.file});Object.assign(markdown,value,{error:null});renderMarkdown();}catch(error){toast(error.message);}};return;}
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
  const icons={markdown:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M6 15V9l3 3 3-3v6m3-4h4m-2-2v6m-2-2 2 2 2-2"/>',browser:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"/>',terminal:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m6 8 4 4-4 4m6 0h5"/>',chat:chatIconPaths};
  $('#tabs').innerHTML='<div class="tab-list">'+state.tabs.map(tab=>`<div data-tab-container="${escape(tab.id)}" class="tabitem ${state.tab===tab.id?'selected':''}"><button data-tab="${escape(tab.id)}" title="${escape(tab.info?.url || tab.label)}">${tab.type==='browser' ? (tab.info?.loading?'◌':'◎') : (['run','remote-run'].includes(tab.type)||(tab.type==='overview'&&state.page==='runs'))?pairedBubbles:tab.type==='team'?'☷':tab.type==='engine'||(tab.type==='overview'&&state.page==='engine')?'⚙':tab.type==='markdown'?'▤':tab.type==='life'?'♡':tab.type==='terminal'?'⌘':'◷'} &nbsp;${escape(tab.label || 'New tab')}</button>${tab.id!=='overview'?`<button class="tabclose" aria-label="Close ${escape(tab.label || 'tab')}" data-close="${escape(tab.id)}">×</button>`:''}</div>`).join('')+'</div><div class="tab-actions">'+[['markdown','Markdown','markdown'],['browser','Browser','browser'],['terminal','Terminal','terminal'],['new-chat','New chat','chat']].map(([id,label,icon])=>`<button id="${id}" class="tab-create" aria-label="${label}" title="${label}"><span aria-hidden="true">+</span><svg aria-hidden="true" viewBox="0 0 24 24">${icons[icon]}</svg></button>`).join('')+'</div>';
  document.querySelectorAll('[data-tab-container]').forEach(item=>item.onclick=event=>{if(event.target.closest('[data-close]') || window.getSelection()?.isCollapsed===false)return;state.tab=item.dataset.tabContainer;const tab=state.tabs.find(t=>t.id===state.tab);if(tab.type==='schedule')schedule(tab.id);else if(tab.type==='browser')selectBrowserTab(tab.info);else render();});
  document.querySelectorAll('[data-close]').forEach(button=>button.onclick=async event=>{event.stopPropagation();try{const id=button.dataset.close;const tab=state.tabs.find(t=>t.id===id);if(tab?.type==='team')await leaveTeamTools();if(tab?.type==='browser')await window.desktop.browser({action:'close',id});if(tab?.type==='terminal'){const current=await window.desktop.terminal({action:'state'});if(current.sessions.some(session=>session.id===tab.terminal.id))await window.desktop.terminal({action:'close',id:tab.terminal.id});disposeTerminalUi(tab.id);}forgetConversation(id);state.tabs=state.tabs.filter(t=>t.id!==id);saveWorkspace();if(state.tab===id)state.tab='overview';render();}catch(e){toast(e.message);}});
  document.querySelectorAll('[data-tab-container]').forEach(item=>{const tab=state.tabs.find(t=>t.id===item.dataset.tabContainer);if(tab?.type==='browser')item.oncontextmenu=event=>{event.preventDefault();showDialog('<h2>Browser tab</h2><button id="unload-browser-tab">Unload tab</button><button id="close-dialog">Cancel</button>',()=>{});$('#unload-browser-tab').onclick=async()=>{try{await window.desktop.browser({action:'unload',id:tab.id});tab.info.loaded=false;$('#dialog').close();if(state.tab===tab.id)renderBrowser();}catch(error){toast(error.message);}};};});
  $('#new-chat').onclick=chatDialog;$('#markdown').onclick=markdownDialog;
  $('#terminal').onclick=()=>openTerminalDialog();
  $('#browser').onclick=async()=>{try{if(!window.desktop)throw new Error('Open the desktop app to use browser tabs.');const info=await window.desktop.browser({action:'create'});openTab({id:info.id,type:'browser',label:info.title||'New tab',info});}catch(error){toast(error.message);}};
}

function browserBounds() {
  if(isBrowserOverviewOpen())return;
  if(previousFeature==='team'){teamBrowserBounds();return;}
  if($('#dialog').open){window.desktop?.browser({action:'hide'}).catch(e=>toast(e.message));return;}
  const area=$('#browser-area');const tab=state.tabs.find(t=>t.id===state.tab);if(!area || tab?.type!=='browser'||!tab.info?.url||tab.info?.loaded===false)return;
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
  $('#browser-share').insertAdjacentHTML('beforebegin','<button type="button" id="browser-overview" aria-label="Show all browser tabs" title="Tab overview · ⌘⇧\\">▦</button>');
  $('#browser-overview').onclick=()=>void showBrowserOverview('main');
  const navigateBrowser=async raw=>{try{const url=browserTarget(raw);await command('navigate',{url});const tab=state.tabs.find(t=>t.id===state.tab);if(tab){tab.info={...tab.info,url,loaded:true};renderBrowser();}}catch(error){toast(error.message);}};
  $('#browser-form').onsubmit=event=>{event.preventDefault();void navigateBrowser($('#browser-url').value);$('#browser-url').blur();};
  $('#browser-url').onfocus=()=>$('#browser-url').select();
  for (const direction of ['back', 'forward']) {
    const button = $('#browser-' + direction), tabId = state.tab;
    let holdTimer = null, held = false;
    const cancelHold = () => { clearTimeout(holdTimer); holdTimer = null; };
    const openHistory = () => {
      cancelHold();
      if (!button.isConnected || button.disabled || state.tab !== tabId) return;
      held = true; const bounds = button.getBoundingClientRect();
      void command('history-menu', {direction, x: bounds.left, y: bounds.bottom});
    };
    button.title = (direction === 'back' ? 'Back' : 'Forward') + ' · hold for history';
    button.setAttribute('aria-haspopup', 'menu');
    button.onpointerdown = event => { if (event.button !== 0) return; cancelHold(); held = false; holdTimer = setTimeout(openHistory, 450); };
    button.onpointerup = cancelHold; button.onpointercancel = cancelHold; button.onpointerleave = cancelHold;
    button.oncontextmenu = event => { event.preventDefault(); openHistory(); };
    button.onkeydown = event => { if (event.key === 'ArrowDown' || (event.shiftKey && event.key === 'F10')) { event.preventDefault(); openHistory(); } };
    button.onclick = event => { cancelHold(); if (held && event.detail !== 0) { held = false; return; } void command(direction); };
  }
  $('#browser-reload').onclick=()=>command(state.tabs.find(t=>t.id===state.tab)?.info?.loading?'stop':'reload');
  $('#browser-share').onclick=()=>command('share',{shared:$('#browser-share').getAttribute('aria-pressed')!=='true'});
  updateBrowserControls();
  const current=state.tabs.find(t=>t.id===state.tab);
  if(!current?.info?.url){void window.desktop?.browser({action:'hide'});void renderBrowserHome($('#browser-area'),{escape,toast,time,api,showDialog,browser:window.desktop.browser,navigate:navigateBrowser});}
  else if(current.info.loaded===false){void window.desktop?.browser({action:'hide'});$('#browser-area').innerHTML='<div class="empty"><p>This tab is unloaded.</p><button id="browser-load">Load tab</button></div>';$('#browser-load').onclick=async()=>{await command('activate');current.info.loaded=true;renderBrowser();};}
  else requestAnimationFrame(browserBounds);
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
  $('#main').innerHTML=`<div class="heading"><div><div class="eyebrow">Configuration</div><h1>App Setup</h1><p class="muted">Plain JSON settings for new chats and schedules. Existing runs keep their captured configuration.</p></div><button class="primary" id="save-settings">Save settings</button></div><div class="grid"><section class="card"><h2>Workspace</h2><div class="field"><label>Default working directory</label><input id="settings-cwd" value="${escape(settings.workspace.cwd)}"></div><div class="field"><label>Additional repositories / directories · one per line</label><textarea id="settings-roots" rows="5">${escape(settings.workspace.additionalDirectories.join('\n'))}</textarea></div><div class="row"><div><label>Default provider</label><select id="settings-provider"><option value="copilot" ${settings.provider==='copilot'?'selected':''}>GitHub Copilot</option><option value="codex" ${settings.provider==='codex'?'selected':''}>Codex</option><option value="claude" ${settings.provider==='claude'?'selected':''}>Claude</option><option value="rehearsal" ${settings.provider==='rehearsal'?'selected':''}>Local rehearsal</option></select></div><div><label>Default model</label>${modelPicker('settings-model',settings.model,settings.provider)}<button class="subtle" id="settings-model-refresh">↻ Refresh models</button></div></div>${modelControls('settings-model',settings)}<div class="field"><label>Time zone</label><input id="settings-timezone" value="${escape(settings.timezone)}"></div><div class="field"><label>Skill directories · one per line</label><textarea id="settings-skills" rows="3">${escape(settings.skillDirectories.join('\n'))}</textarea></div><details><summary>Default MCP servers · JSON</summary><p class="note">Use command arguments and environment references. Keep secrets in provider authentication or the system keychain.</p><textarea id="settings-mcp" rows="10">${escape(JSON.stringify(settings.mcpServers,null,2))}</textarea></details></section><section class="card"><h2>Where your files live</h2><p class="note">New app schedules:</p><div class="filepath">${escape(state.data.home)}/schedules/</div><p class="note">Run history:</p><div class="filepath">${escape(state.data.home)}/runs/</div><p class="note">Settings:</p><div class="filepath">${escape(settings.file)}</div><button id="open-settings">Open settings file ↗</button><hr class="divider"><h3>Repository-owned schedules</h3><p class="note">An imported organization workflows schedule remains owned by its organization workflows automation manifest. Change that source with AI, export it, then refresh the local copy. The schedule editor shows both locations.</p><h3>Workspace context</h3><p class="note">Copilot receives all listed roots and can read their instructions and files. The VS Code companion also sends the active file, selection location, and open file paths. VS Code’s code index, extension tools, and existing chat history are not copied.</p><h3>Copilot session storage</h3><p class="note">Choose an existing folder for new Copilot sessions. Existing sessions keep their original location. This also holds Copilot configuration; changing it can require sign-in.</p><input id="settings-copilot-home" placeholder="Provider default (~/.copilot)" value="${escape(settings.copilotDataDirectory || '')}"><h3>Data directory</h3><p class="note">Set PROTEUS_HOME before launching to use another data directory. Moving live run history is not performed by this settings screen.</p></section></div>`;
  $('#main').insertAdjacentHTML('afterbegin',`<section class="card setup-appearance"><h2>Appearance</h2><label><input id="settings-show-usage" type="checkbox" ${settings.appearance?.showProviderUsage!==false?'checked':''}>Show AI Allowance in the sidebar</label></section><section id="life-setup"></section>`);
  $('#settings-show-usage').dataset.settingsRevision=settings.revision;
  $('#settings-show-usage').onchange=event=>saveAppearance({showProviderUsage:event.target.checked}).catch(error=>toast(error.message));
  renderLifeSetup($('#life-setup'));
  $('#main').insertAdjacentHTML('beforeend','<section class="card"><h2>Terminal</h2><p class="note">Manage shell, font, colors and optional startup commands.</p><button id="terminal-profiles">Terminal profiles</button></section>');
  $('#terminal-profiles').onclick=()=>openTerminalProfiles();
  $('#save-settings').onclick=async()=>{try{await api('/api/settings',{settings:{...settings,appearance:{...settings.appearance,...state.data.settings.appearance,showProviderUsage:$('#settings-show-usage').checked},copilotDataDirectory:$('#settings-copilot-home').value.trim() || undefined,workspace:{cwd:$('#settings-cwd').value.trim(),additionalDirectories:lines($('#settings-roots').value)},provider:$('#settings-provider').value,model:$('#settings-model').value.trim(),...modelSelection('settings-model'),timezone:$('#settings-timezone').value.trim(),skillDirectories:lines($('#settings-skills').value),mcpServers:JSON.parse($('#settings-mcp').value)},expectedRevision:$('#settings-show-usage').dataset.settingsRevision});await refresh(true);toast('Settings saved.');}catch(e){toast(e.message);}};
  $('#settings-model-refresh').onclick=()=>refreshModels('settings-model','settings-provider',true);
  $('#settings-provider').onchange=()=>refreshModels('settings-model','settings-provider');
  void refreshModels('settings-model','settings-provider');
  $('#open-settings').onclick=()=>window.desktop?window.desktop.openPath(settings.file).catch(e=>toast(e.message)):toast(settings.file);
  $('#main').insertAdjacentHTML('beforeend',permissionSettings());
  bindPermissionControls();
}
window.desktop?.onShutdown?.(()=>{stopMessageSpeech();workspaceClosing=true;liveEvents.close();clearInterval(refreshInterval);clearInterval(usageInterval);clearTimeout(liveRefreshTimer);});
window.desktop?.onBrowserState(infos=>{
  if(workspaceRestoring||workspaceClosing)return;
  const currentBrowser=state.tabs.find(tab=>tab.id===state.tab&&tab.type==='browser');
  const previousSurface=currentBrowser?`${!!currentBrowser.info?.url}:${currentBrowser.info?.loaded!==false}`:null;
  const ids=new Set(infos.map(info=>info.id));
  state.tabs=state.tabs.filter(tab=>tab.type!=='browser'||ids.has(tab.id));
  syncTeamBrowsers(infos);
  for(const info of infos.filter(info=>info.group!=='team'&&!ownsTeamBrowser(info.id))){const tab=state.tabs.find(t=>t.id===info.id);if(tab){tab.info=info;tab.label=info.title||'New tab';}else state.tabs.push({id:info.id,type:'browser',label:info.title||'New tab',info});}
  if(!state.tabs.some(tab=>tab.id===state.tab)){state.tab='overview';render();}else{renderTabs();updateBrowserControls();if(currentBrowser&&previousSurface!==`${!!currentBrowser.info?.url}:${currentBrowser.info?.loaded!==false}`)renderBrowser();}saveWorkspace();
});
window.desktop?.onCloseTool?.((id)=>{state.tabs=state.tabs.filter(t=>t.id!==id);if(state.tab===id)state.tab='overview';render();});
window.desktop?.onNotification?.(()=>{if(state.page==='engine'&&state.engineSection==='notifications')renderEngineRoom('notifications');});
window.desktop?.onAddressFocus(()=>$('#browser-url')?.focus());
function selectBrowserTab(info) {
  if(info.group==='team'){selectTeamBrowser(info);openFeatureTab('team');}
  else {
    openTab({id:info.id,type:'browser',label:info.title||'New tab',info});
    const tab=state.tabs.find(tab=>tab.id===info.id);
    if(info.loaded===false && info.url && !tab.activating){
      tab.activating=true;
      void window.desktop.browser({action:'activate',id:info.id}).then(current=>{
        if(!state.tabs.includes(tab))return;
        tab.info=current;tab.label=current.title||tab.label;saveWorkspace();
        if(state.tab===tab.id)renderBrowser();
      }).catch(error=>{if(state.tab===tab.id)toast(error.message);}).finally(()=>{tab.activating=false;});
    }
  }
}
window.desktop?.onBrowserAction?.(value=>{
  if(value.type==='overview')void showBrowserOverview(value.group);
  else if(value.type==='select-tab')selectBrowserTab(value.info);
  else if(value.type==='chat-link'){chatDialog();$('#chat-prompt').value=value.url;$('#chat-prompt').focus();}
  else if(value.type==='error')toast(value.message);
});
window.desktop?.onBrowserResize(()=>requestAnimationFrame(browserBounds));
window.addEventListener('resize',()=>requestAnimationFrame(browserBounds));
window.addEventListener('keydown',event=>{if((event.metaKey||event.ctrlKey)&&event.key==='l'&&$('#browser-url')){event.preventDefault();$('#browser-url').focus();}});
window.addEventListener('keydown',event=>{if((event.metaKey||event.ctrlKey)&&event.shiftKey&&event.code==='Backslash'){event.preventDefault();void showBrowserOverview(previousFeature==='team'?'team':'main');}});
initBrowserOverview({escape,toast,select:selectBrowserTab,closed:forgetTeamBrowser,restore:()=>render()});
initRemoteDesktops({state,escape,toast,showDialog,openTab,time});
initChatsIndex({state,api,escape,toast,time,openLocal:runTab,openRemote:openRemoteChat});
initTeamTools({state,api,escape,toast,time,lines,showDialog,browserTarget,timezone:()=>state.data.settings.timezone,onChange:saveWorkspace});
initEngineRoom({state,api,escape,toast,time,providers:renderProviders,connections:()=>renderRemote({api,escape,toast}),setup:renderSettings,resourceChanged:(action,id)=>{if(action==='close')state.tabs=state.tabs.filter(tab=>tab.id!==id);saveWorkspace();},openAccount:()=>window.desktop?.openExternal(new URL('/security',state.data.life?.websiteOrigin||'https://proteus.example').href)});
initTerminals({state,escape,toast,showDialog,openTab});
initFeatures({state,escape,api,toast,refresh,openTab,showDialog,lines,restoreBrowser:()=>requestAnimationFrame(browserBounds)});
initOmi({state,escape,api,toast,refresh,openSchedule:schedule,openRun:id=>{const run=state.data.runs.find(item=>item.id===id);if(run)runTab(run);}});
initLife({state,escape,api,toast,refresh,openTab,showDialog,openSettings:()=>{navigate('engine','setup');}});
initMarkdownPicker({api,escape,showDialog,openTab,toast,defaultWorkspaceId:()=>state.data.context.defaultWorkspaceId});
new MutationObserver(()=>{if($('#dialog').open)window.desktop?.browser({action:'hide'}).catch(e=>toast(e.message));else requestAnimationFrame(browserBounds);}).observe($('#dialog'),{attributes:true,attributeFilter:['open']});
refresh().then(restoreWorkspace).then(async()=>{await Promise.allSettled([refreshUsage(),loadChatsIndex()]);render();}).catch(e=>toast(e.message));
const usageInterval=setInterval(() => refreshUsage(), 60_000);
const refreshInterval=setInterval(()=>{if((!document.activeElement?.matches('input,textarea,select') || !!$('#conversation-host'))&&!$('#dialog').open)refresh().catch(()=>{});},1500);

window.desktop?.onRemote(() => navigate('engine','connections'));
let liveRefreshTimer;
const liveEvents = new EventSource('/api/events');
liveEvents.addEventListener('change', () => { if (liveRefreshTimer) return; liveRefreshTimer = setTimeout(() => { liveRefreshTimer = null; if ((!document.activeElement?.matches('input,textarea,select') || !!$('#conversation-host')) && !$('#dialog').open) refresh().catch(() => {}); }, 120); });
