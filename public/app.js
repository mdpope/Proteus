import {chatType} from './chat-types.js';
import {internetSearchDialog} from './internet-search.js';
import {selectChatType} from './chats-index.js';
import { mergeChatHistory } from './chat-history.js';
import { renderAgentTerminal } from './agent-terminal.js';
import {usageSidebar,usageDetails} from './provider-usage-view.js';
import { bindDesktopBrowserRecents } from './browser-recents.js';
import { mountHome } from './home.js';
import { createTabSynchronizer, syncableTabURL } from './content-tab-sync.js';
import { browserTabIcon } from './browser-icons.js';
import { setMessageActionsContext, stopMessageSpeech } from './message-actions.js';
import { chatIconPaths, addTabMenuItems } from './add-tab-menu.js';
import { initRemoteDesktops, attachChatDestinations, mountMachineHistory, renderRemoteRun, renderRemoteDocument, forgetRemoteDocument, openRemoteChat, renameRemoteChat, mountRemoteSchedules } from './remote-desktops.js';
import { initChatsIndex, renderChatsIndex, recentChats, attentionChats, reconcileIndexedChat, openIndexedChat, loadChatsIndex } from './chats-index.js';
import { initEngineRoom, engineSections, renderEngineRoom } from './engine-room.js';
import { initTeamTools, renderTeamTools, teamState, restoreTeamState, leaveTeamTools, ownsTeamBrowser, syncTeamBrowsers, teamBrowserBounds, selectTeamBrowser, forgetTeamBrowser, closeTeamTabById } from './team-tools.js';
import { initBrowserOverview, showBrowserOverview, isBrowserOverviewOpen } from './browser-overview.js';
import { browserTarget, renderBrowserHome } from './browser-home.js';
import { browserAddress, updateAgentAccess, bindBrowserHistoryButton, browserSurfaceIdentity, browserSurfaceRevision, selectBrowserSurface } from './browser-toolbar.js';
import { bindBrowserAddressMenu } from './browser-address-menu.js';
import { bindTabEdges, bindTabReorder, reorderById } from './tab-interactions.js';
import { rememberView, restoreView } from './view-position.js';
import { showContextMenu, copyContextText } from './context-menu.js';
import { requestPresentation, mountStructured } from './tool-presentation.js';
import { conversation, forgetConversation } from './conversation.js';
import { mountAttachmentPicker, restoreSentAttachments, selectedAttachments, clearAttachments, prepareLocalAttachments } from './chat-attachments.js';
import { renderProviderAuth } from './provider-auth.js';
import { renderRemote } from './remote.js';
import { initOmi, renderOmi } from './omi.js';
import { initTerminals, renderTerminal, openTerminalDialog, openTerminalProfiles, disposeTerminalUi } from './terminals.js';
import { initLife, renderLife, renderLifeSetup, selectLifeSection } from './life.js';
import { initMarkdownPicker, openMarkdownPicker } from './markdown-picker.js';
import { initFeatures, renderContext, renderStandup, renderCredentials, fillBrowserLogin, contextPicker, contextSelection, bindContextPicker, modelPicker, modelControls, modelSelection, contextSize, refreshModels, sessionDetails, bindSessionDetails, bindPaths } from './features.js';
const pairedBubbles = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">${chatIconPaths}</svg>`;
const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const state = { data: null, page: 'home', engineSection:'resources', selected: null, tab: 'overview', tabs: [{ id: 'overview', label: 'Schedules', type: 'overview' }], draft: null, dirty: false, signature: '', markdown: null };
const friendly = value => ({ awaiting_input:'Needs feedback', completed:'Turn complete', queued:'Queued', running:'Running', cancelled:'Cancelled', interrupted:'Interrupted', failed:'Failed' }[value] || value);
const runUsageNote=run=>run.usage?.observed?'Observed provider usage.':run.schedule?.provider==='rehearsal'?'No provider usage reported. Rehearsals make no model calls.':'This provider did not report turn usage. The turn may have failed before a model response.';
const badge = status => `<span class="badge ${escape(status)}">${escape(friendly(status))}</span>`;
const time = (value, timezone) => value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleString(undefined, { timeZone: timezone || state.data?.settings?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone, year:'numeric', month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }) : 'Time unavailable';
let toastTimer, usageValue = null, usageBusy = false, appearanceBusy = false;
let previousFeature='', tabScrollLeft=0, cleanupMainEdges, cleanupChatEdges, sidebarMinimized=localStorage.getItem('proteus.sidebar.minimized')==='true';
document.body.classList.toggle('sidebar-minimized',sidebarMinimized);
let workspaceReady=false, workspaceRestoring=false, workspaceClosing=false, lastWorkspace='';
const selectedChildren=new Map();
function reorderVisibleTabs(source,target,after,parentId=null){const visible=state.tabs.filter(tab=>parentId?tab.parentId===parentId:!tab.parentId&&!['overview','omi','life','team','engine','home','standup'].includes(tab.type));if(!visible.some(tab=>tab.id===source)||!visible.some(tab=>tab.id===target))return;const ordered=visible.slice();if(!reorderById(ordered,source,target,after))return;const positions=state.tabs.map((tab,index)=>visible.includes(tab)?index:-1).filter(index=>index>=0);positions.forEach((position,index)=>state.tabs[position]=ordered[index]);saveWorkspace();if(parentId)renderChatSubtabs();else renderTabs();}
const syncMessageContext=()=>setMessageActionsContext(JSON.stringify([state.data?.life?.identity?.accountId||'',state.data?.life?.identity?.workspaceId||'',state.data?.life?.identity?.origin||'',state.data?.life?.identity?.sessionId||'',state.tab,state.tabs.find(t=>t.id===state.tab)?.hostId||'local']));
const lifeVisible = () => state.data?.life?.enabled === true;
let applyingContentTabs=false, contentSyncTimer;
function saveWorkspace() {
  if(!workspaceReady || workspaceRestoring || workspaceClosing)return;
  if(!applyingContentTabs){clearTimeout(contentSyncTimer);contentSyncTimer=setTimeout(()=>void contentTabSync.all(),100);}
  const team=teamState();
  const session={schemaVersion:1,active:state.tab,page:state.page,engineSection:state.engineSection,selectedChildren:Object.fromEntries(selectedChildren),team:{...team,tabs:team.tabs.map(tab=>({id:tab.id,type:tab.type||'browser',contentTabId:tab.contentTabId,customTitle:tab.customTitle,...(tab.browserId?{browserId:tab.browserId,url:tab.url||'',title:tab.title||'',favicon:tab.favicon,history:tab.history,lastTouchedAt:tab.lastTouchedAt}:{}),...(tab.type==='terminal'?{label:tab.label,terminal:tab.terminal}:{}),...(tab.type==='markdown'?{label:tab.label,file:tab.file||tab.markdown?.file}:{})}))},tabs:state.tabs.map(tab=>({id:tab.id,type:tab.type,label:tab.label,contentTabId:tab.contentTabId,customTitle:tab.customTitle,...(tab.parentId?{parentId:tab.parentId}:{}),...(tab.type==='browser'?{url:tab.info?.url||'',history:tab.info?.history,unloaded:tab.info?.loaded===false,favicon:tab.info?.favicon,lastTouchedAt:tab.info?.lastTouchedAt}:{}),...(tab.type==='markdown'?{file:tab.markdown?.file}:{}),...(tab.type==='terminal'?{terminal:tab.terminal}:{}),...(['remote-run','remote-document'].includes(tab.type)?{hostId:tab.hostId,runId:tab.runId}:{}),...(tab.type==='remote-document'?{documentId:tab.documentId,mediaType:tab.mediaType}:{})}))};
  const json=JSON.stringify(session);if(json===lastWorkspace)return;lastWorkspace=json;
  if(window.desktop?.workspaceSession)window.desktop.workspaceSession({action:'save',session}).catch(error=>{lastWorkspace='';toast(error.message);});
  else try{localStorage.setItem('proteus.workspace',json);}catch{}
}
function openFeatureTab(type) { if(type==='life'&&!lifeVisible())return;state.page=type;state.tab='overview';render(); }
function restoreFeatureTabs() {
  if(!lifeVisible()){state.tabs=state.tabs.filter(tab=>tab.type!=='life');if(!state.tabs.some(t=>t.id===state.tab))state.tab='overview';}
}
async function restoreWorkspace() {
  workspaceRestoring=true;
  try {
    let saved=window.desktop?.workspaceSession?await window.desktop.workspaceSession({action:'get'}):JSON.parse(localStorage.getItem('proteus.workspace')||'null');
    if(!saved){let legacy=[];try{legacy=JSON.parse(localStorage.getItem('proteus.feature-tabs')||'[]');}catch{}saved={tabs:[...state.tabs,...legacy.filter(type=>['omi','life'].includes(type)).map(type=>({id:'feature-'+type,type,label:type==='omi'?'Transcription':'Life'}))],active:'overview',page:'home'};}
    const tabs=[], restoredBrowserIds=new Map(), existingBrowser=window.desktop?await window.desktop.browser({action:'list'}):[];
    for(const entry of saved.tabs||[]) {
      const tab={...entry};
      if(tab.type==='standup'){tab.type='team';tab.id='feature-team';tab.label='Team Tools';if(saved.active===entry.id)saved.active=tab.id;if(!saved.team)saved.team={active:'standup'};}
      if(['omi','life','team','standup','engine','home'].includes(tab.type)){if(saved.active===entry.id){saved.page=tab.type==='standup'?'team':tab.type;saved.active='overview';}continue;}
      if(tab.type==='run'&&!state.data.runs.some(run=>run.id===tab.id))continue;
      if(tab.type==='schedule'&&!state.data.schedules.some(schedule=>schedule.id===tab.id))continue;
      if(tab.type==='markdown') {
        try {tab.markdown=await api('/api/markdown',{file:tab.file});}
        catch(error){tab.markdown={file:tab.file,content:'',error:error.message};}
      }
      if(tab.type==='browser') {
        if(!window.desktop)continue;
        // A renderer reload reuses the live view; an app restart creates a private tab.
        const previous=tab.id;tab.contentTabId??=previous;let info=existingBrowser.find(info=>info.id===tab.id);
        if(!info){info=await window.desktop.browser({action:'create',restore:true,parentId:tab.parentId,unloaded:saved.active!==previous,url:tab.url,history:tab.history,favicon:tab.favicon,history:tab.history,lastTouchedAt:tab.lastTouchedAt});tab.info=info;tab.id=info.id;restoredBrowserIds.set(previous,tab.id);tabs.push(tab);if(saved.active===previous)saved.active=tab.id;continue;}
        tab.info=info;
      }
      if(!tabs.some(other=>other.id===tab.id))tabs.push(tab);
    }
    // Remembered selections use client-local view IDs, just like the active tab.
    // Remap them before saving; otherwise the workspace ownership filter drops them.
    selectedChildren.clear();for(const [parent,child] of Object.entries(saved.selectedChildren||{}))selectedChildren.set(parent,restoredBrowserIds.get(child)||child);state.tabs=tabs.length?tabs.filter(tab=>!tab.parentId||tabs.some(parent=>parent.id===tab.parentId&&['run','remote-run'].includes(parent.type))):state.tabs;state.page=saved.page||'home';state.engineSection=saved.engineSection||'resources';restoreTeamState(saved.team,existingBrowser);state.tab=state.tabs.some(tab=>tab.id===saved.active)?saved.active:'overview';
    for(const info of existingBrowser.filter(item=>item.loaded!==false&&item.id!==state.tab))try{await window.desktop.browser({action:'unload',id:info.id});info.loaded=false;}catch{/* Protected audible, agent-owned or downloading views retain their work. */}
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


function renderUsage() {
  const host=$('#provider-usage');if(!host)return;
  host.hidden=state.data?.settings?.appearance?.showProviderUsage===false;
  const collapsed=state.data?.settings?.appearance?.providerUsageCollapsed===true;
  host.classList.toggle('usage-collapsed',collapsed);
  host.innerHTML=usageSidebar(usageValue,{collapsed,appearanceBusy});
  $('#toggle-usage').onclick=()=>saveAppearance({providerUsageCollapsed:!collapsed}).catch(e=>toast(e.message));
  host.querySelectorAll('[data-usage-provider]').forEach(button=>button.onclick=()=>showUsageDetails(button.dataset.usageProvider));
}
function showUsageDetails(id) {
  const entry=usageValue?.providers?.[id];const windows=entry?.windows || [];
  const dialog=$('#dialog');dialog.dataset.usageDetailProvider=id;
  dialog.innerHTML=usageDetails(usageValue,id,{busy:usageBusy});
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
const localHistories=new Map(), historyRequests=new Map();
async function loadRunView(id,before){
  if(before===undefined&&historyRequests.has(id))return historyRequests.get(id);
  const task=(async()=>{const prior=localHistories.get(id),query=new URLSearchParams({id});if(before!==undefined)query.set('beforeEvent',before);else if(prior?.historyCursor)query.set('cursor',prior.historyCursor);
    const incoming=await api('/api/chat-view?'+query),run=mergeChatHistory(localHistories.get(id),incoming);
    localHistories.delete(id);localHistories.set(id,run);while(localHistories.size>4){const old=localHistories.keys().next().value;localHistories.delete(old);forgetConversation(old);}return run;
  })();if(before===undefined)historyRequests.set(id,task);
  try{return await task;}finally{if(historyRequests.get(id)===task)historyRequests.delete(id);}
}
let refreshing=null;
async function refresh(force=false){if(refreshing)return refreshing;refreshing=refreshState(force);try{return await refreshing;}finally{refreshing=null;}}
async function refreshState(force = false) {
  if (!force && window.getSelection()?.isCollapsed === false) return;
  const data = await api('/api/state?summaries=1'); const signature = JSON.stringify(data);
  const selected=state.tabs.find(tab=>tab.id===state.tab);if(selected?.type==='run'||selected?.type==='agent-terminal')await loadRunView(selected.type==='run'?selected.id:selected.parentId);
  state.data = data;syncMessageContext();if(workspaceReady)void contentTabSync.all();
  if (force || selected?.type==='run' || selected?.type==='agent-terminal' || signature !== state.signature || $('#main').dataset.deferredControls) {
    state.signature = signature;
    const tab=state.tabs.find(t=>t.id===state.tab);
    if(tab?.type==='run' && $('#main').dataset.runId===tab.id && $('#conversation-host')) {
      renderRun(tab.id);
      for(const [page,count] of [['runs',recentChats(data.runs).length],['attention',attentionChats(data.runs).length]]) {
        const node=$(`[data-page="${page}"] .count`);if(node)node.textContent=count;
      }
    } else if(tab?.type==='browser' && $('#browser-form')) {renderTabs();updateBrowserControls();requestAnimationFrame(browserBounds);}
    else render();
  }
}
function openTab(tab) {
  if(tab.parentId&&!state.tabs.some(parent=>parent.id===tab.parentId&&['run','remote-run'].includes(parent.type)))delete tab.parentId;
  const existing = state.tabs.find(item => item.id === tab.id);
  if (!existing) state.tabs.push(tab);
  else if (tab.type === 'markdown' || tab.parentId) Object.assign(existing, tab);
  const remembered=!tab.parentId&&['run','remote-run'].includes(tab.type)?selectedChildren.get(tab.id):null;state.tab=remembered&&state.tabs.some(child=>child.id===remembered&&child.parentId===tab.id)?remembered:tab.id; if(tab.parentId)selectedChildren.set(tab.parentId,tab.id);state.selected = state.tab; render();
}
async function schedule(id) {
  try { state.data = await api('/api/state?summaries=1'); } catch (error) { toast(error.message); return; }
  const value = state.data.schedules.find(s => s.id === id); if (!value || value.error) return toast(value?.error || 'Schedule missing.');
  state.draft = structuredClone(value); state.dirty = false;
  openTab({ id, label:value.name, type:'schedule' });
}
function runTab(run) { state.page = 'runs'; openTab({ id:run.id, label:run.title, type:'run' }); }
function revokeHostContent(hostId){
  contentTabSync.forgetHost(hostId);
  const parents=new Set(state.tabs.filter(tab=>tab.type==='remote-run'&&tab.hostId===hostId).map(tab=>tab.id));
  const removed=state.tabs.filter(tab=>(tab.type==='remote-run'&&tab.hostId===hostId)||(tab.type==='remote-document'&&tab.hostId===hostId)||(tab.type==='browser'&&parents.has(tab.parentId)));
  for(const tab of state.tabs){if(parents.has(tab.parentId)&&!removed.includes(tab))delete tab.parentId;}
  state.tabs=state.tabs.filter(tab=>!removed.includes(tab));for(const parent of parents)selectedChildren.delete(parent);
  if(removed.some(tab=>tab.id===state.tab)){state.tab='overview';state.page='runs';}
  for(const tab of removed){if(tab.type==='remote-document')forgetRemoteDocument(tab.id);if(tab.type==='browser')void window.desktop.browser({action:'close',id:tab.id}).catch(()=>{});}
  saveWorkspace();render();
}
function reconcileDeletedChat(row){
  const parent=row.local||row.hostId==='local'?row.chatId:'peer:'+row.hostId+':'+row.chatId;
  const removed=new Set([parent]);
  for(const tab of state.tabs.filter(tab=>tab.parentId===parent)){
    if(tab.type==='remote-document'){removed.add(tab.id);forgetRemoteDocument(tab.id);}
    else delete tab.parentId; // Keep independent browser, file and terminal work open.
  }
  state.tabs=state.tabs.filter(tab=>!removed.has(tab.id));
  state.data.runs=state.data.runs.filter(run=>run.id!==row.chatId);
  if(removed.has(state.tab)){state.tab='overview';state.page='runs';}
  saveWorkspace();render();
}
const reviewingFailures=new Set();
function reviewLocalFailure(run){
  if(!['failed','interrupted'].includes(run.status)||run.failureReviewedAt||$('#main')?.dataset.runId!==run.id)return;
  const expectedFailureEventAt=run.failureEventAt||run.updatedAt,key=run.id+':'+expectedFailureEventAt;
  if(reviewingFailures.has(key))return;reviewingFailures.add(key);
  void api('/api/chat-attention',{action:'review',id:run.id,expectedFailureEventAt}).then(response=>{reconcileIndexedChat({...recentChats(state.data.runs).find(row=>row.local&&row.chatId===run.id),...response});return refresh(true);}).catch(error=>toast(error.message)).finally(()=>reviewingFailures.delete(key));
}
function navigate(page, section) {
  const previous=state.tabs.find(tab=>tab.id===state.tab);
  if(previous?.type==='team' && page!=='team')void leaveTeamTools().catch(error=>toast(error.message));
  if(['omi','life','team'].includes(page)) { openFeatureTab(page); return; }
  if(page==='engine')state.engineSection=section||'resources';
  if(page==='life-section') { openFeatureTab('life'); return; }
  state.page=page;state.tab='overview';render();
}
function render() {
  const data = state.data; if (!data) return;
  const outgoingBrowserRevision=browserSurfaceRevision();selectBrowserSurface();
  const main=$('#main');rememberView(main,main.dataset.viewKey);const nextViewKey=state.tab==='overview'?'page:'+state.page:'tab:'+state.tab;main.dataset.viewKey=nextViewKey;
  restoreFeatureTabs();syncMessageContext();
  const activeTab=state.tabs.find(tab=>tab.id===state.tab);if(activeTab?.parentId)selectedChildren.set(activeTab.parentId,activeTab.id);
  const parentTab=activeTab?.parentId?state.tabs.find(tab=>tab.id===activeTab.parentId):null;
  const activePage=['omi','life','team'].includes(activeTab?.type)?activeTab.type:['run','remote-run'].includes(activeTab?.type)||parentTab?'runs':activeTab?.type==='schedule'?'schedules':state.page;
  const waiting = attentionChats(data.runs).length;
  const nav=[['home','⌂','Home',''],['schedules','◷','Schedules',data.schedules.length],['runs',pairedBubbles,'Chats',recentChats(data.runs).filter(r=>chatType(r)==='user').length],['internet', '⌕','Internet Searches',recentChats(data.runs).filter(r=>chatType(r)==='internet').length],['attention','!','Needs attention',waiting],['omi','<svg class="transcription-nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M2 10v4M6 7v10M10 3v18M14 8v8M18 5v14M22 10v4"/></svg>','Transcription',''],...(lifeVisible()?[['life','♡','Life','']]:[]),['team','☷','Team Tools',''],['context','▦','Workspaces',''],['engine','⚙','Engine Room','']];
  const children=id=>['runs','internet'].includes(id)?recentChats(data.runs).filter(r=>chatType(r)===(id==='internet'?'internet':'user')).slice(0,7).map((row,i)=>`<button class="navchild" data-recent-chat="${i}" data-recent-type="${id==='internet'?'internet':'user'}" title="${escape(row.title||'Chat')}"><span>${escape(row.title||'Chat')}</span><small>${escape(row.destinationName||'This Mac')}</small></button>`).join(''):id==='life'?['Overview','Nutrition','Garage','Fuel & mileage','Capture inbox','New capture','Account & security','Connections'].map((name,i)=>`<button class="navchild" data-life-section="${['overview','nutrition','garage','fuel','inbox','capture','security','connections'][i]}">${escape(name)}</button>`).join(''):id==='engine'?engineSections().map(([key,label])=>`<button class="navchild ${state.engineSection===key?'active':''}" data-engine-section="${key}">${escape(label)}</button>`).join(''):id==='team'?'<button class="navchild" data-team-section="overview">Overview</button><button class="navchild" data-team-section="standup">Standup</button>':' ';
  $('#sidebar').innerHTML = `<div class="brand"><span class="brandmark">⤨</span><span class="brand-text">Proteus</span><button id="sidebar-toggle" class="subtle" aria-label="Collapse sidebar" title="Collapse sidebar">‹</button></div><nav aria-label="Features">${nav.map(([id,icon,label,count])=>`<button class="navitem ${activePage===id?'active':''}" data-page="${id}"><span><span class="nav-icon">${icon}</span><span class="navlabel">${label}</span></span>${count!==''?`<span class="count">${count}</span>`:''}</button>${activePage===id?`<div class="navchildren">${children(id)}</div>`:''}`).join('')}</nav><div class="sidebottom"><section id="provider-usage" aria-label="Provider allowance remaining"></section><div><span class="dot"></span>Local runner online</div><p>Prototype · v${data.version}<br>${data.scheduler.background ? 'Keeps running in the menu bar.' : 'Runs while the host is running.'}</p><button class="subtle" id="data-folder">Open data folder ↗</button></div>`;
  renderUsage();
  renderTabs();
  saveWorkspace();
  if(previousFeature==='team'&&activePage!=='team')void leaveTeamTools(outgoingBrowserRevision).catch(error=>toast(error.message));
  previousFeature=activePage;
  $('#main').classList.remove('browser-main', 'run-main', 'remote-run-main', 'team-main', 'terminal-main');
  const tab = state.tabs.find(t => t.id === state.tab);
  if(tab?.type!=='remote-document')void window.desktop?.artifactPreview?.({action:'hide'}).catch(()=>{});
  if (tab?.type === 'schedule') renderSchedule(tab.id);
  else if (tab?.type === 'run') renderRun(tab.id);
  else if (tab?.type === 'remote-run') void renderRemoteRun(tab);
  else if (tab?.type === 'remote-document') void renderRemoteDocument(tab);
  else if (tab?.type === 'browser') renderBrowser();
  else if (tab?.type === 'markdown') renderMarkdown();
  else if (tab?.type === 'standup') renderStandup();
  else if (tab?.type === 'omi') renderOmi();
  else if (tab?.type === 'life') renderLife();
  else if (tab?.type === 'team') renderTeamTools();
  else if(tab?.type==='agent-terminal'){const run=localHistories.get(tab.parentId);if(run)renderAgentTerminal(main,run);else void loadRunView(tab.parentId).then(()=>{if(state.tab===tab.id)render();});}
  else if (tab?.type === 'terminal') { main.classList.add('terminal-main');renderTerminal(tab); }
  else if (state.page === 'context') renderContext();
  else if (state.page === 'credentials') renderCredentials();
  else if (state.page === 'remote') renderRemote({ api, escape, toast });
  else if (state.page === 'settings') renderSettings();
  else if (state.page === 'providers') renderProviders();
  else if (state.page === 'engine') renderEngineRoom(state.engineSection);
  else if (state.page === 'runs' || state.page==='internet' || state.page === 'attention') renderChatsIndex(state.page==='attention');
  else if (state.page === 'home') void renderHome();
  else if (state.page === 'team') renderTeamTools();
  else if (state.page === 'omi') renderOmi();
  else if (state.page === 'life') renderLife();
  else renderOverview();
  if(tab?.type!=='remote-run'&&tab?.type!=='browser')renderChatSubtabs();
  document.querySelectorAll('[data-page]').forEach(button => button.onclick = () => {if(['runs','internet'].includes(button.dataset.page))selectChatType(button.dataset.page==='internet'?'internet':'user');navigate(button.dataset.page);});
  document.querySelectorAll('[data-engine-section]').forEach(button=>button.onclick=()=>navigate('engine',button.dataset.engineSection));
  document.querySelectorAll('[data-team-section]').forEach(button=>button.onclick=()=>{teamState().active=button.dataset.teamSection;openFeatureTab('team');});
  document.querySelectorAll('#sidebar [data-life-section]').forEach(button=>button.onclick=()=>{openFeatureTab('life');selectLifeSection(button.dataset.lifeSection);});
  document.querySelectorAll('[data-recent-chat]').forEach(button=>button.onclick=()=>openIndexedChat(recentChats(data.runs).filter(r=>chatType(r)===button.dataset.recentType)[Number(button.dataset.recentChat)]));
  $('#sidebar-toggle').textContent=sidebarMinimized?'›':'‹';$('#sidebar-toggle').setAttribute('aria-label',sidebarMinimized?'Expand sidebar':'Collapse sidebar');$('#sidebar-toggle').onclick=()=>{sidebarMinimized=!sidebarMinimized;document.body.classList.toggle('sidebar-minimized',sidebarMinimized);localStorage.setItem('proteus.sidebar.minimized',String(sidebarMinimized));render();requestAnimationFrame(browserBounds);};
  $('#data-folder').onclick = () => window.desktop ? window.desktop.openPath(data.home) : toast(data.home);
  if (tab?.type!=='browser'&&activePage!=='team') window.desktop?.browser({action:'hide',...browserSurfaceIdentity()}).catch(e=>toast(e.message));
}
async function renderHome() {
  const main=$('#main');main.innerHTML='<p class="note">Loading Home…</p>';
  try {
    const value=await api('/api/home');if(state.page!=='home'||state.tab!=='overview')return;
    mountHome(main,value,{desktop:true,markdown:(target,source)=>ProteusMarkdown.mount(target,source,{allowExternalImages:false,link:source=>{if(ProteusMarkdown.linkKind(source)==='web')window.desktop?.openExternal(source).catch(error=>toast(error.message));},copy:text=>window.desktop?.copyText(text)}),navigate:page=>navigate(page==='chats'?'runs':page==='schedules'?'overview':page)});
  } catch(error){if(state.page==='home'&&state.tab==='overview')main.innerHTML=`<p class="banner">${escape(error.message)}</p>`;}
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
  $('#main').innerHTML = `<div class="heading"><div><div class="eyebrow">Schedule / ${escape(s.id)}</div><h1>${escape(s.name)}</h1><div class="muted">${escape(s.provider === 'rehearsal' ? 'A no-cost rehearsal of scheduling, feedback, and continuation.' : 'A persistent conversation for every run.')}</div></div><div class="actions">${badge(s.enabled?'Enabled':'Paused')}<button class="primary" id="run-now">▶ Run now</button></div></div><section class="schedule-source"><div><strong>Ownership</strong><p>${s.source?.manifest ? `Owned by ${escape(s.source.system)} · Edit the source, then export/reconcile into Proteus.` : 'App-owned schedule'}</p></div>${s.source?.manifest ? `<div><strong>Source manifest</strong><div class="filepath">${escape(s.source.manifest)}</div></div><div class="actions"><button id="source-file">Open source manifest ↗</button></div>` : ''}<div><strong>Exported schedule file</strong><div class="filepath">${escape(original.file)}</div></div></section><div class="grid"><section class="card"><h2>Schedule settings</h2>${state.dirty && s.revision !== original.revision ? '<p class="banner" role="status">The file changed outside Proteus. Your unsaved edits are preserved. Reload file to use the current file; saving this older draft is blocked.</p>' : ''}<div class="field"><label for="name">Name</label><input id="name" value="${escape(s.name)}"></div><div class="row"><div><label for="cron">Cron expression</label><input id="cron" class="cron" value="${escape(s.cron)}"></div><div><label for="timezone">Time zone</label><input id="timezone" value="${escape(s.timezone)}"></div></div><div class="row"><div><label for="provider">Provider</label><select id="provider"><option value="rehearsal" ${s.provider==='rehearsal'?'selected':''}>Local rehearsal</option><option value="copilot" ${s.provider==='copilot'?'selected':''}>Copilot</option><option value="codex" ${s.provider==='codex'?'selected':''}>Codex</option><option value="claude" ${s.provider==='claude'?'selected':''}>Claude</option></select></div><div><label for="model">Model ID</label>${modelPicker('model',s.model,s.provider)}<button class="subtle" id="model-refresh">↻ Refresh models</button></div></div>${modelControls('model',s)}<div class="field"><label for="cwd">Workspace directory</label><input id="cwd" value="${escape(s.workspace.cwd)}"></div><div class="field"><label for="roots">Additional directories · one per line</label><textarea id="roots" rows="2">${escape(s.workspace.additionalDirectories.join('\n'))}</textarea></div><div class="field"><label for="prompt">Instructions</label><textarea id="prompt" rows="5">${escape(s.prompt)}</textarea></div><div class="row"><div><label for="misfire">After missed runs</label><select id="misfire"><option value="skip" ${s.misfire==='skip'?'selected':''}>Wait for the next scheduled time</option><option value="coalesce" ${s.misfire==='coalesce'?'selected':''}>Catch up once when available</option></select></div><div><label for="enabled">Execution</label><select id="enabled"><option value="false" ${!s.enabled?'selected':''}>Paused</option><option value="true" ${s.enabled?'selected':''}>Enabled</option></select></div></div><label class="checkbox-row"><input id="schedule-notify" type="checkbox" ${s.notifications?.onCompletion===true?'checked':''}>Notify when this schedule completes</label>${contextPicker(s.contextSelection?.selectedIds || [], 'schedule', s.contextSelection || {})}<div class="formfooter"><span class="note" id="save-state">${state.dirty?'Unsaved changes':'Saved as a plain JSON file'}</span><div class="actions"><button id="reload">Reload file</button><button class="primary" id="save">Save schedule</button></div></div></section><div class="stack"><section class="card"><div class="heading"><h2>Next five runs</h2><button class="subtle" id="preview">↻ Preview</button></div><ul id="next-runs" class="nextlist">${(s.nextRuns || []).map((date,i)=>`<li><span class="muted">${i===0?'Next':String(i+1).padStart(2,'0')}</span><span>${escape(time(date,s.timezone))}</span></li>`).join('')}</ul><p class="note">${escape(s.timezone)} · Paused schedules show projected times.</p></section><section class="card"><h2>The source of truth</h2><div class="filepath">${escape(original.file)}</div><div class="actions"><button class="subtle" id="open-file">Open file ↗</button></div><p class="note">Reopening or Reload file reads the latest JSON from disk. External edits refresh automatically while this editor has no unsaved changes. Existing chats keep their captured schedule.</p><pre id="json-preview">${escape(JSON.stringify(clean(s),null,2))}</pre></section></div></div>`;
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
  const host=$('#conversation-host');let earlier=host.parentElement.querySelector('[data-local-earlier]');
  if(run.earlier&&!earlier){earlier=document.createElement('button');earlier.dataset.localEarlier='';earlier.textContent='Load earlier messages';host.before(earlier);}
  if(earlier){earlier.hidden=!run.earlier;earlier.onclick=async()=>{earlier.disabled=true;try{await loadRunView(run.id,run.eventStart);if(state.tab===run.id)renderRun(run.id);}catch(error){toast(error.message);}finally{earlier.disabled=false;}};}
  conversation($('#conversation-host'), run, {
    edit:entry=>{const input=$('#followup');if(!input)return;if((input.value.trim()&&input.value!==entry.text||selectedAttachments('run:'+run.id).length)&&!confirm('Replace the current unsent draft with this message?'))return;input.value=entry.text||'';input.dispatchEvent(new Event('input'));input.focus();const restored=restoreSentAttachments('run:'+run.id,entry.data?.delivery?.id);if((entry.data?.attachments?.length||0)>restored)toast('Text restored. Some files are no longer available here; reattach them before sending.');},
    time, copy: text => window.desktop ? window.desktop.copyText(text) : navigator.clipboard.writeText(text),
    link: source => openMessageLink(source, run.schedule.workspace.cwd, run.id),
    image: async source => (await api('/api/chat-image', { id: run.id, source })).dataURL
  });
}
function renderNativeRun(run) {
  $('#main').classList.remove('run-main');
  replaceChatContent(`<div class="heading"><div><div class="eyebrow">Omi / Native processing</div><h1>${escape(run.title)}</h1><p class="muted">${escape(time(run.createdAt))}</p></div><div class="actions">${badge(run.status)}${['queued','running'].includes(run.status)?'<button class="danger" id="native-cancel">Stop process</button>':''}</div></div><section class="card"><h2>Processing activity</h2><p class="note">Process completion is separate from successful transcription or filing. The worker retains its own outcomes, claims and recovery state.</p>${run.events.map(event=>`<article class="message system"><span class="note">${escape(time(event.at))}</span><pre>${escape(event.text)}</pre></article>`).join('')}</section>`);
  $('#native-cancel')?.addEventListener('click',async()=>{try{await api(`/api/runs/${run.id}/cancel`,{});await refresh(true);}catch(error){toast(error.message);}});
}
function renderRun(id) {
  const loaded=localHistories.get(id);if(!loaded){void loadRunView(id).then(()=>{if(state.tab===id)renderRun(id);}).catch(error=>toast(error.message));return;}
  const nativeRun=loaded.schedule.provider==='local-process'?loaded:null;
  if(nativeRun){renderNativeRun(nativeRun);renderChatSubtabs();return;}
  $('#main').classList.add('run-main');
  $('#main').classList.toggle('show-chat-details', !!state.showChatDetails);
  state.detailScroll ??= {};
  const previousDetails = $('.chat-details');
  if (previousDetails) state.detailScroll[previousDetails.dataset.runId] = previousDetails.scrollTop;
  const run=loaded;
  const main=$('#main');
  const controlSignature=JSON.stringify([run.title,run.titleRevision,run.chatType,run.status,run.archivedAt,run.pending,run.queuedMessages,run.schedule,run.permissionContext,run.permissionRevision,run.providerSessionId,run.nativeSessionPath,run.modelCapabilities,run.nextModelOptions,state.showChatDetails]);
  const interacting=main.contains(document.activeElement)&&document.activeElement.matches('input,select,textarea')&&document.activeElement.id!=='followup';
  if(main.dataset.runId===id && $('#conversation-host') && (main.dataset.controlSignature===controlSignature || interacting)) {
    if(main.dataset.controlSignature!==controlSignature)main.dataset.deferredControls='true';else delete main.dataset.deferredControls;
    updateConversation(run);
    reviewLocalFailure(run);
    const input=$('[data-usage-input]'),output=$('[data-usage-output]'),approvals=$('[data-auto-approvals]');
    if(input)input.textContent=run.usage.observed?run.usage.inputTokens.toLocaleString():'—';
    if(output)output.textContent=run.usage.observed?run.usage.outputTokens.toLocaleString():'—';
    if(approvals)approvals.textContent=run.automaticApprovals || 0;
    const usage=$('[data-usage-note]');if(usage)usage.textContent=runUsageNote(run);
    return;
  }
  const expanded=new Set([...main.querySelectorAll('.chat-details details[open]')].map(d=>d.querySelector('summary')?.textContent));
  delete main.dataset.deferredControls;main.dataset.runId=id;main.dataset.controlSignature=controlSignature;
  const pending=run.pending;
  const active=['queued','running','awaiting_input'].includes(run.status);
  const composerFocus=document.activeElement?.id==='followup';const cursor=$('#followup')?.selectionStart;
  state.chatDrafts ??= {};state.chatModelDrafts ??= {};
  const modelDraft = state.chatModelDrafts[id] || run.nextModelOptions || run.schedule;
  replaceChatContent(`<div class="heading"><div><div class="eyebrow">${escape(run.schedule.provider)} / ${run.id.slice(0,8)}</div><div class="chat-title-line"><h1>${escape(run.title)}</h1><button id="chat-rename" class="chat-rename" type="button" aria-label="Rename chat" title="Rename chat">✎</button></div><div class="muted">${time(run.createdAt)} · ${escape(run.schedule.model || (run.schedule.provider==='rehearsal'?'Local rehearsal, no AI calls':'Provider default model'))}</div></div><div class="actions"><button id="toggle-chat-details">${state.showChatDetails?'Chat':'Details'}</button>${run.chatType==='internet'?'<button id="chat-promote" class="chat-secondary-action">Promote to User Chat</button>':''}<button id="chat-archive" class="chat-secondary-action">${run.archivedAt?'Unarchive':'Archive'}</button><button id="chat-delete" class="chat-secondary-action danger">Delete</button>${badge(run.status)}</div></div><div class="grid chat-grid"><section class="card chat-pane"><div id="conversation-host"></div>${pending?`<div class="pending"><div class="eyebrow">Your input is needed</div><p>${escape(pending.question)}</p>${pending.details?`<div id="request-summary"></div><details class="raw-details"><summary>Raw request</summary><pre>${escape(JSON.stringify(pending.details,null,2))}</pre></details>`:''}${pending.type==='permission'?'<div class="actions"><button id="deny">Deny</button><button class="primary" id="approve">Approve once</button></div>'+permissionChoices(pending):`<textarea id="answer" placeholder="Add your feedback…" rows="2"></textarea><div class="actions"><button class="primary" id="reply">Send feedback</button></div>`}</div>`:run.status==='running'?'<p class="note" role="status"><span class="spinner" aria-hidden="true"></span>Working… you can queue a message or steer this turn.</p>':''}<div class="composer"><textarea id="followup" placeholder="${active?'Add an update while this runs…':'Continue this conversation…'}" rows="2">${escape(state.chatDrafts[id]||'')}</textarea><div class="composer-footer"><div id="run-attachments"></div><div class="composer-models" ${run.schedule.provider==='rehearsal'?'hidden':''}><input type="hidden" id="run-provider" value="${escape(run.schedule.provider)}">${modelPicker('run-model',modelDraft.model,run.schedule.provider)}${modelControls('run-model',modelDraft,true)}<button class="subtle" id="run-model-refresh" aria-label="Refresh model choices" title="Refresh model choices">↻</button></div><div class="composer-actions">${active?`<button id="steer" title="Send into the running turn using its current model settings" ${run.status!=='running'?'disabled':''}>Steer</button>`:''}<button class="primary" id="continue" title="${active?'Send after the current turn finishes':'Send message'}">${active?'Queue':'Send ↑'}</button>${['running','awaiting_input'].includes(run.status)?'<button class="danger" id="cancel" title="Stop the running turn">Stop</button>':''}</div></div>${run.queuedMessages?.length?`<p class="note">${run.queuedMessages.length} message(s) queued for after this turn.</p>${run.queuedMessages.map(m=>`<div class="queued-message"><span>${escape(m.prompt.slice(0,120))}</span>${run.status==='running'&&!m.attachmentDispatch?`<button data-steer-queued="${escape(m.id)}" title="Send now using the current turn’s model">Steer now</button>`:''}<button data-remove-message="${escape(m.id)}" aria-label="Remove queued message">×</button></div>`).join('')}`:''}</div></section><div class="stack chat-details"><section class="card"><h2>Run details</h2><p class="note">Total AI runtime <strong data-runtime-total>Unavailable</strong></p>${permissionControls(run.permissionContext,{runId:run.id})}<p class="note"><span data-auto-approvals>${run.automaticApprovals || 0}</span> tool requests approved automatically. Approval details are retained in the run record.</p><p class="note">The original schedule and earlier context versions are retained when you refresh this chat.</p><div class="filepath">${[run.schedule.workspace.cwd,...run.schedule.workspace.additionalDirectories].map(escape).join('<br>')}</div><hr class="divider"><div class="usagegrid"><div class="usagebox"><span class="eyebrow">Input tokens</span><strong data-usage-input>${run.usage.observed?run.usage.inputTokens.toLocaleString():'—'}</strong></div><div class="usagebox"><span class="eyebrow">Output tokens</span><strong data-usage-output>${run.usage.observed?run.usage.outputTokens.toLocaleString():'—'}</strong></div></div><p class="note" data-usage-note>${runUsageNote(run)}</p><div class="note">${run.providerSessionId?'Provider session: '+escape(run.providerSessionId):'Session history saved locally.'}</div></section>${state.data.mcpStatusProviders?.includes(run.schedule.provider) ? `<section class="card"><h2>MCP connections</h2><p class="note">${state.data.mcpLoginProviders?.includes(run.schedule.provider)?'Inspect selected integrations and open supported sign-in on this Mac.':'Inspect the selected connections for this chat. Complete any required sign-in in the provider on this Mac.'}</p><button id="mcp-connections">Manage connections</button></section>` : ''}${sessionDetails(run)}<section class="card"><h2>Completion means a turn ended</h2><p class="note">Workflow completion still depends on its own validation and source coverage. A model finishing its response doesn’t certify external work.</p><details><summary>Schedule snapshot</summary><pre>${escape(JSON.stringify(run.schedule,null,2))}</pre></details></section></div></div>`);
  renderChatSubtabs();
  updateConversation(run);
  reviewLocalFailure(run);
  main.querySelectorAll('.chat-details details').forEach(d=>{if(expanded.has(d.querySelector('summary')?.textContent))d.open=true;});
  const details = $('.chat-details'); details.dataset.runId = id; details.scrollTop = state.detailScroll[id] || 0;
  details.addEventListener('scroll', () => state.detailScroll[id] = details.scrollTop, { passive: true });
  $('#toggle-chat-details').onclick=()=>{state.showChatDetails=!state.showChatDetails;renderRun(id);};
  $('#chat-rename').onclick=()=>renameChat({id:run.id,title:run.title,titleRevision:run.titleRevision,local:true});
  $('#chat-promote')?.addEventListener('click',async()=>{try{await api('/api/chat-lifecycle',{action:'promote',id,expectedUpdatedAt:run.updatedAt});await loadChatsIndex();await loadRunView(id);render();}catch(error){toast(error.message);}});
  $('#chat-archive').onclick=async()=>{try{await api('/api/chat-lifecycle',{action:run.archivedAt?'unarchive':'archive',id,expectedUpdatedAt:run.updatedAt,expectedArchivedAt:run.archivedAt||null});await loadChatsIndex();await refresh(true);}catch(error){toast(error.message);}};
  $('#chat-delete').onclick=()=>showDialog(`<h2>Delete ${escape(run.title)}?</h2><p>This removes only the Proteus chat record. Generated files and the provider's original session remain untouched. Independent browser and terminal tabs stay open. Running or queued work must finish or be stopped first.</p><button id="close-dialog">Cancel</button><button id="dialog-submit" class="danger">Delete chat</button>`,async()=>{await api('/api/chat-lifecycle',{action:'delete',id,expectedUpdatedAt:run.updatedAt,expectedArchivedAt:run.archivedAt||null});reconcileDeletedChat({chatId:id,local:true});await loadChatsIndex();await refresh(true);});
  bindSessionDetails(run);
  $('#mcp-connections')?.addEventListener('click',()=>manageMcp(run));
  if($('#request-summary'))mountStructured($('#request-summary'),requestPresentation(pending.details));
  const updateButtons=()=>{if(!$('#followup')||!$('#continue'))return;const empty=!$('#followup').value.trim(); $('#continue').disabled=empty; if($('#steer'))$('#steer').disabled=empty || run.status!=='running'; };
  $('#followup').oninput=()=>{state.chatDrafts[id]=$('#followup').value;updateButtons();}; updateButtons();
  const attachmentPicker=mountAttachmentPicker({key:'run:'+id,host:$('#run-attachments'),textarea:$('#followup'),provider:()=>run.schedule.provider,mediaTypes:state.data.attachmentMediaTypes||{},notify:toast,onChange:updateButtons});
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
  const sendMessage=async mode=>{const text=$('#followup').value;const modelOptions={model:$('#run-model').value,...modelSelection('run-model')};try{if(mode==='steer'&&selectedAttachments('run:'+id).length)throw new Error('Attachments must be queued as a new turn.');const messageId=crypto.randomUUID();const delivery=mode==='queue'?await prepareLocalAttachments({key:'run:'+id,providerId:run.schedule.provider,destination:'This Mac · '+run.title,chatId:id,messageId,mediaTypes:state.data.attachmentMediaTypes||{},post:api}):null;await api(`/api/runs/${id}/send`,{prompt:text,mode,messageId,...(delivery||{}),...(mode==='queue'&&run.schedule.provider!=='rehearsal'?{modelOptions}:{})});clearAttachments('run:'+id);state.chatDrafts[id]='';if($('#main').dataset.runId===id&&$('#followup'))$('#followup').value='';updateButtons();if(mode==='queue')delete state.chatModelDrafts[id];await refresh(true);}catch(e){if(e.message!=='Attachment send cancelled.')toast(e.message);}};
  $('#continue').onclick=()=>sendMessage('queue');
  $('#steer')?.addEventListener('click',()=>sendMessage('steer'));
  document.querySelectorAll('[data-steer-queued]').forEach(button=>button.onclick=()=>submit('steer-queued',{messageId:button.dataset.steerQueued}));
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
  const mounted=new Map([...document.querySelectorAll('[data-provider-auth]')].map(node=>[node.dataset.providerAuth,node]));
  $('#main').innerHTML=`<div class="heading"><div><div class="eyebrow">Bring your own engine</div><h1>Providers</h1><div class="muted">Separate sign-ins and live capabilities for each provider.</div></div></div><div class="grid">${[['copilot','Copilot'],['codex','Codex'],['claude','Claude']].map(([id,name])=>{
    const p=statuses[id];return `<section class="card"><div class="heading"><h2>${name}</h2>${badge(p?.available?'Connected':p?'Unavailable':'Not checked')}</div><p class="note">${id==='copilot'?'Uses the official Copilot SDK and your Copilot account.':id==='codex'?'Uses the installed Codex CLI and its existing sign-in. Run codex login on this Mac if needed.':'Uses the installed Claude Code CLI and its sign-in. Claude desktop and CLI authentication may be separate.'}</p><div class="actions"><button data-refresh-provider="${id}">Refresh connection & models</button>${p?.authenticationCommand&&!p?.available?`<button data-copy-provider-login="${id}">Copy sign-in command</button>`:''}</div><div data-provider-auth="${id}"></div>${p?.error?`<p class="banner">${escape(p.error)}</p>`:''}<p class="note">${p?.checkedAt?'Checked '+escape(time(p.checkedAt)):'Not checked'} · refreshes at launch and every five minutes</p><p class="note">View allowance and reset details in Engine Room → Usage.</p><ul class="nextlist">${(p?.models || []).map(m=>`<li><span>${escape(m.name||m.id)}</span><div><code>${escape(m.id)}</code><div class="note">Effort: ${escape(m.controls?.reasoningEfforts?.join(', ') || 'Not reported')}<br>${(m.controls?.contextTiers || []).map(t=>escape(contextSize(t))).join('<br>')}<br>Speed: ${escape((m.controls?.serviceTiers || []).map(t=>t.name||t.id).join(', ') || 'Provider default')}</div></div></li>`).join('')}</ul>${id==='codex'?'<p class="note">Selected instructions and skills are supplied as context. Agent prompts work when they do not declare editor-specific tool filters. Codex grants MCP access per selected server; each provider has separate workspace approvals. Chats remain with their original provider.</p>':''}</section>`;
  }).join('')}</div>`;
  for(const container of document.querySelectorAll('[data-provider-auth]')){const id=container.dataset.providerAuth,old=mounted.get(id);if(old){container.replaceWith(old);continue;}renderProviderAuth(container,id,{api,openExternal:url=>window.desktop.openExternal(url),onConnected:async providerId=>{await api('/api/provider',{provider:providerId,force:true});await refresh(true);}});}
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
  const canLogin=state.data.mcpLoginProviders?.includes(run.schedule.provider)===true;
  showDialog(`<h2>MCP connections</h2>${canLogin?'':'<p class="note">Connection status only. Complete sign-in in the provider on this Mac, then refresh here.</p>'}<p class="note" id="mcp-status" role="status">Checking connections…</p><div id="mcp-list"></div><div class="actions"><button id="close-dialog">Close</button><button id="dialog-submit">Refresh connections</button></div>`,()=>{});
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
      if(signature!==listSignature){listSignature=signature;list.innerHTML=value.servers.map(s=>`<section class="card"><strong>${escape(s.name)}</strong> ${badge(s.status)}${s.error?`<p class="note">${escape(s.error)}</p>`:''}${canLogin&&s.remote&&s.status!=='connected'?`<button data-connect-mcp="${escape(s.name)}">${waiting===s.name?'Restart sign-in':'Connect / sign in'}</button>`:''}</section>`).join('') || '<p>No selected MCP servers.</p>';
      list.querySelectorAll('[data-connect-mcp]').forEach(button=>button.onclick=()=>connect(button));}
      if(waiting&&value.servers.some(s=>s.name===waiting&&s.status==='connected')){status.textContent='Connected to '+waiting+'. Continue or steer the chat to retry its work.';waiting=null;}
      else if(status.textContent==='Checking connections…')status.textContent=canLogin?'Connections update automatically while this window is open. Supported sign-in opens on this Mac.':'Selected connection status updates while this window is open. Sign in through the provider on this Mac if needed.';
    }catch(e){if(alive() && current===version)status.textContent='Could not check connections: '+e.message;}
    finally{checking=false;}
  };
  const poll=async()=>{if(!alive())return;await load();if(!alive())return;if(Date.now()<end)timer=setTimeout(poll,5000);else if(waiting)status.textContent='Still not connected. The sign-in may have timed out; use Restart sign-in or Refresh connections.';};
  dialog.addEventListener('close',()=>clearTimeout(timer),{once:true});
  $('#dialog-submit').onclick=load;await load();timer=setTimeout(poll,5000);
}
function showDialog(html, submit) {
  void window.desktop?.browser({action:'overlay',token:'renderer-overlays',visible:true});
  $('#dialog').innerHTML=html;$('#dialog').showModal();$('#close-dialog').onclick=()=>$('#dialog').close();if($('#dialog-submit'))$('#dialog-submit').onclick=async()=>{try{await submit();$('#dialog').close();await refresh(true);}catch(e){toast(e.message);}};
}
function renameChat(row){
  showDialog(`<h2>Rename chat</h2><div class="field"><label for="rename-chat-title">Chat name</label><input id="rename-chat-title" maxlength="200" value="${escape(row.title||'')}"></div><div class="actions"><button id="close-dialog">Cancel</button><button class="primary" id="dialog-submit">Save name</button></div>`,async()=>{
    const title=$('#rename-chat-title').value.trim();if(!title)throw new Error('Enter a chat name.');
    const result=row.local||!row.hostId||row.hostId==='local'?await api('/api/chat-title',{id:row.chatId||row.id,title,expectedTitleRevision:row.titleRevision}):await renameRemoteChat(row.hostId,row.chatId||row.id,title,row.titleRevision);
    const id=row.local||!row.hostId||row.hostId==='local'?row.chatId||row.id:'peer:'+row.hostId+':'+(row.chatId||row.id);
    const cached=localHistories.get(id);if(cached)Object.assign(cached,result);const summary=state.data.runs.find(item=>item.id===id);if(summary)Object.assign(summary,result);
    const tab=state.tabs.find(item=>item.id===id);if(tab)tab.label=tab.type==='remote-run'?result.title+' · '+(tab.hostLabel||'Paired Mac'):result.title;
    await loadChatsIndex();saveWorkspace();renderTabs();
  });
  $('#rename-chat-title').focus();$('#rename-chat-title').select();
}
function chatDialog(onCreated=null,guard=()=>{},draft={}) {
  const context=state.data.context,profile=context.workspaces.find(w=>w.id===context.defaultWorkspaceId)||context.workspaces[0];
  let added=[],catalogGeneration=0,catalogReady=false;
  showDialog(`<h2>Start a new chat</h2><div class="new-chat-grid"><label>Workspace<select id="chat-workspace">${context.workspaces.map(w=>`<option value="${escape(w.id)}" ${w.id===profile.id?'selected':''}>${escape(w.name)}</option>`).join('')}</select></label></div><div class="new-chat-grid"><label>Command starting folder<select id="chat-cwd"></select></label><label>Chat name (optional)<input id="chat-title" maxlength="200" placeholder="A name can be chosen automatically"></label></div><details class="new-chat-folders"><summary>Workspace folders</summary><ul id="chat-folder-list"></ul><button type="button" id="chat-add-folder" aria-label="Add folders for this chat">＋ Add folders for this chat</button><p class="note" id="chat-folder-status">Added folders apply only to this chat.</p><textarea id="chat-roots" hidden></textarea></details>${contextPicker()}<section class="composer new-chat-composer"><label class="sr-only" for="chat-prompt">Message</label><textarea id="chat-prompt" rows="4" placeholder="What would you like to work on?"></textarea><div class="new-chat-toolbar"><div id="chat-attachments"></div><label>Provider<select id="chat-provider"><option value="">Select provider first</option><option value="copilot">Copilot</option><option value="codex">Codex</option><option value="claude">Claude</option><option value="rehearsal">Local rehearsal</option></select></label><label id="chat-model-label" hidden>Model${modelPicker('chat-model','','')}</label>${modelControls('chat-model',{})}</div><p id="chat-catalog-status" class="note" role="status"></p><div class="new-chat-submit"><button class="primary" id="dialog-submit" disabled>Start chat</button></div></section><div class="actions"><button id="close-dialog">Cancel</button></div>`,async()=>{
    guard();if(!catalogReady||!$('#chat-provider').value||!$('#chat-prompt').value.trim())throw new Error('Choose a provider and available model, then enter a message.');
    const providerId=$('#chat-provider').value,model=$('#chat-model').value;if(providerId!=='rehearsal'&&!state.data.providerStatuses?.[providerId]?.models?.some(m=>m.id===model))throw new Error('Choose an available model.');
    const messageId=crypto.randomUUID(),draftId=crypto.randomUUID();const delivery=await prepareLocalAttachments({key:'new-chat',providerId,destination:'This Mac · new chat',draftId,messageId,mediaTypes:state.data.attachmentMediaTypes||{},post:api});
    const run=await api('/api/chat',{workspaceId:$('#chat-workspace').value,workspace:{cwd:$('#chat-cwd').value,additionalDirectories:lines($('#chat-roots').value)},provider:providerId,model,name:$('#chat-title').value.trim(),...modelSelection('chat-model'),prompt:$('#chat-prompt').value,...contextSelection(),...(delivery||{})});clearAttachments('new-chat');await refresh();if(onCreated)onCreated({id:run.id,type:'run',label:run.title});else runTab(run);
  });
  $('#chat-prompt').value=draft.prompt||'';$('#chat-title').value=draft.title||'';
  const dialog=$('#dialog');dialog.classList.add('new-chat-dialog');dialog.addEventListener('close',()=>dialog.classList.remove('new-chat-dialog'),{once:true});
  const alive=()=>dialog.open&&!!$('#chat-provider');
  const fields=dialog.querySelector('[data-model-picker="chat-model"]');fields.hidden=true;
  const validate=()=>{if(!alive())return;const p=$('#chat-provider').value;$('#dialog-submit').disabled=!catalogReady||!p||(p!=='rehearsal'&&!$('#chat-model').value)||!$('#chat-prompt').value.trim();};
  const workspace=()=>context.workspaces.find(w=>w.id===$('#chat-workspace').value);
  const folders=()=>{const w=workspace();return [...new Set([w.cwd,...w.additionalDirectories,...added])];};
  const updateRoots=()=>{$('#chat-roots').value=folders().filter(p=>p!==$('#chat-cwd').value).join('\n');$('#chat-context')?.updatePreview?.();};
  const drawFolders=()=>{const w=workspace(),paths=folders(),selected=$('#chat-cwd').value;$('#chat-cwd').innerHTML=paths.map(p=>`<option value="${escape(p)}">${escape(p)}</option>`).join('');$('#chat-cwd').value=paths.includes(selected)?selected:w.cwd;$('#chat-folder-list').innerHTML=paths.map(p=>`<li><span>${escape(p)} <small>${added.includes(p)?'Added for this chat':'Workspace folder'}</small></span>${added.includes(p)?`<button data-remove-chat-folder="${escape(p)}" aria-label="Remove added folder">Remove</button>`:''}</li>`).join('');dialog.querySelectorAll('[data-remove-chat-folder]').forEach(button=>button.onclick=()=>{const p=button.dataset.removeChatFolder;if($('#chat-cwd').value===p)$('#chat-folder-status').textContent='Starting folder reset to the workspace default.';added=added.filter(x=>x!==p);drawFolders();});updateRoots();};
  $('#chat-add-folder').onclick=async()=>{try{if(!window.desktop?.choosePaths)throw new Error('Open the desktop app to choose additional folders.');const paths=await window.desktop.choosePaths({kind:'folder',multiple:true});if(!alive())return;added=[...new Set([...added,...paths.filter(p=>!folders().includes(p))])];drawFolders();}catch(error){toast(error.message);}};
  $('#chat-workspace').onchange=()=>{$('#chat-cwd').value='';added=[];drawFolders();};$('#chat-cwd').onchange=updateRoots;
  bindContextPicker('chat',{workspace:()=>({cwd:$('#chat-cwd').value,additionalDirectories:lines($('#chat-roots').value)})});drawFolders();
  $('.new-chat-toolbar').append($('#dialog-submit'));$('.new-chat-submit')?.remove();
  const picker=mountAttachmentPicker({key:'new-chat',host:$('#chat-attachments'),textarea:$('#chat-prompt'),provider:()=>$('#chat-provider').value,mediaTypes:state.data.attachmentMediaTypes||{},notify:toast,onChange:validate});
  $('#chat-provider').onchange=async()=>{const version=++catalogGeneration,p=$('#chat-provider').value;catalogReady=false;$('#chat-model-label').hidden=!p;fields.hidden=!p;$('#chat-catalog-status').textContent=p?'Loading models…':'';$('#chat-model').value='';validate();picker.refresh();if(!p)return;await refreshModels('chat-model','chat-provider',true);if(!alive()||version!==catalogGeneration)return;const data=state.data.providerStatuses?.[p];catalogReady=p==='rehearsal'||(data?.available!==false&&!data?.error&&data?.models?.length>0);$('#chat-catalog-status').textContent=catalogReady?'':data?.error||'No model catalog is available. Select the provider again to retry.';validate();};
  $('#chat-model').addEventListener('change',validate);$('#chat-prompt').addEventListener('input',validate);
  void attachChatDestinations(draft=>chatDialog(onCreated,guard,draft)).then(()=>{if(alive()){$('#dialog .new-chat-grid').prepend($('#dialog .peer-destination'));}});
}

function newSchedule() {
  showDialog('<h2>New schedule</h2><div class="field"><label>Name</label><input id="new-name" placeholder="Weekly workspace review"></div><div class="actions"><button id="close-dialog">Cancel</button><button class="primary" id="dialog-submit">Create paused schedule</button></div>',async()=>{
    const name=$('#new-name').value.trim();if(!name)throw new Error('Enter a name.');const defaults=state.data.settings;
    const id=name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)+'-'+Date.now().toString(36);
    await api('/api/schedules',{schedule:{schemaVersion:1,id,name,enabled:false,cron:'0 9 * * 1-5',timezone:defaults.timezone,provider:defaults.provider,model:defaults.model,reasoningEffort:defaults.reasoningEffort,contextTier:defaults.contextTier,workspace:defaults.workspace,skillDirectories:defaults.skillDirectories,mcpServers:defaults.mcpServers,misfire:'skip',prompt:'Review this workspace and ask for feedback.'}});await refresh();schedule(id);
  });
}
function importDialog() { showDialog('<h2>Import schedules</h2><p class="note">Paste a JSON schedule or array. Imports are always paused.</p><textarea id="import-json" rows="10" placeholder="[{ … }]"></textarea><div class="actions"><button id="close-dialog">Cancel</button><button class="primary" id="dialog-submit">Import</button></div>',async()=>{const value=JSON.parse($('#import-json').value);await api('/api/import',{schedules:Array.isArray(value)?value:[value]});}); }
function markdownDialog(parentId=null) { openMarkdownPicker('open',parentId); }
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
async function openMessageLink(source, cwd, originId=selectedChatParent()?.id) {
  const origin=state.tabs.find(tab=>tab.id===originId);
  try {
    const kind = ProteusMarkdown.linkKind(source);
    if (kind === 'web') {
      if (!window.desktop) { window.open(source, '_blank', 'noopener,noreferrer'); return; }
      if(state.data.settings.preferences?.clickedLinks==='system'){await window.desktop.openLink(source);return;}
      const info = await window.desktop.browser({ action: 'create', url: source, parentId:origin?.id });
      const parent=origin;openTab({ id: info.id, type: 'browser', label: info.title || 'New tab', info,...(parent?{parentId:parent.id}:{}) });
    } else if (kind === 'file') {
      const file = decodeURIComponent(new URL(source, 'file://' + cwd.replace(/\/$/, '') + '/').pathname);
      if (file.endsWith('.md')) { const markdown = await api('/api/markdown', { file }); const parent=origin;openTab({ id: 'markdown:' + file, type: 'markdown', label: file.split('/').pop(), markdown,...(parent?{parentId:parent.id}:{}) }); }
      else if (window.desktop) await window.desktop.openPath(file);
      else toast(file);
    } else if (kind === 'mail') { await navigator.clipboard.writeText(source.slice(7)); toast('Email address copied.'); }
  } catch (error) { toast(error.message); }
}

function renameContentTab(tab){showDialog(`<h2>Rename tab</h2><label>Tab name<input id="content-tab-title" maxlength="200" value="${escape(tab.label||'')}"></label><button id="close-dialog">Cancel</button><button id="dialog-submit">Save name</button>`,async()=>{const title=$('#content-tab-title').value.trim();if(!title)throw new Error('Enter a tab name.');tab.customTitle=title;tab.label=title;saveWorkspace();renderChatSubtabs();});}
const scopeParent=scope=>state.tabs.find(tab=>scope.hostId?tab.type==='remote-run'&&tab.hostId===scope.hostId&&tab.runId===scope.id:tab.type==='run'&&tab.id===scope.id);
async function descriptorFor(tab,parent){
  const title=tab.customTitle||tab.label||tab.title||'New tab',named=tab.customTitle?{customTitle:tab.customTitle}:{};
  if(tab.type==='browser'&&syncableTabURL(tab.info?.url||tab.url||'')===null)return null;
  if(tab.type==='browser')return {id:tab.contentTabId||tab.id,type:'browser',title,...named,url:tab.info?.url||tab.url||'',...(tab.info?.history?{history:tab.info.history}:{})};
  if(tab.type==='remote-document')return {id:'document:'+tab.documentId,type:'document',title,...named,documentId:tab.documentId,mediaType:tab.mediaType||'text/markdown'};
  if(tab.type==='markdown'&&parent?.type==='run'){const file=tab.markdown?.file||tab.file;if(!file)return null;const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(parent.id+'\0'+file));const documentId=[...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');return {id:'document:'+documentId,type:'document',title,...named,documentId,mediaType:'text/markdown'};}
  return null;
}
const contentTabSync=createTabSynchronizer({
  scopes:()=>window.desktop?[...state.tabs.filter(tab=>['run','remote-run'].includes(tab.type)).map(tab=>({scope:'chat',id:tab.runId||tab.id,...(tab.hostId?{hostId:tab.hostId}:{})})),{scope:'team',id:'team'}]:[],
  readLocal:async scope=>{if(scope.scope==='team')return teamState().tabs.filter(tab=>tab.browserId&&syncableTabURL(tab.url||'')!==null).map(tab=>({id:tab.contentTabId||tab.id,type:'browser',title:tab.customTitle||tab.title||'New tab',...(tab.customTitle?{customTitle:tab.customTitle}:{}),url:tab.url||'',...(tab.history?{history:tab.history}:{})}));const parent=scopeParent(scope);if(!parent)return [];return (await Promise.all(state.tabs.filter(tab=>tab.parentId===parent.id).map(tab=>descriptorFor(tab,parent)))).filter(Boolean);},
  request:(scope,action,args={})=>scope.hostId?window.desktop.peers({action:'request',hostId:scope.hostId,method:action==='get'?'tabs.get':'tabs.mutate',args:{scope:scope.scope,id:scope.id,...args}}):api('/api/content-tabs',{action,scope:scope.scope,id:scope.id,...args}),
  apply:async(scope,descriptors,captured)=>{
    const parent=scopeParent(scope);if(scope.scope==='chat'&&!parent)return;
    applyingContentTabs=true;let changed=false;
    try{
      const list=scope.scope==='team'?teamState().tabs:state.tabs.filter(tab=>tab.parentId===parent.id);
      const ids=new Set(descriptors.map(tab=>tab.id));
      const descriptorId=async tab=>scope.scope==='team'?(tab.contentTabId||tab.id):(await descriptorFor(tab,parent))?.id;
      const currentOrder=[];for(const tab of list){const id=await descriptorId(tab);if(id)currentOrder.push(id);}const orderChangedDuringRequest=currentOrder.join('\0')!==captured.map(tab=>tab.id).join('\0');
      for(const tab of list.slice()){const id=await descriptorId(tab);if(!id||ids.has(id)||!captured.some(item=>item.id===id))continue;const currentDescriptor=scope.scope==='team'?{id:tab.contentTabId||tab.id,type:'browser',title:tab.customTitle||tab.title||'New tab',...(tab.customTitle?{customTitle:tab.customTitle}:{}),url:tab.url||'',...(tab.history?{history:tab.history}:{})}:await descriptorFor(tab,parent);if(JSON.stringify(currentDescriptor)!==JSON.stringify(captured.find(item=>item.id===id)))continue;if(tab.type==='browser'||tab.browserId)await window.desktop.browser({action:'close',id:tab.browserId||tab.id});if(tab.type==='remote-document')forgetRemoteDocument(tab.id);if(scope.scope==='team'){teamState().tabs=teamState().tabs.filter(item=>item!==tab);if(teamState().active===tab.id)teamState().active='overview';}else{state.tabs=state.tabs.filter(item=>item!==tab);if(state.tab===tab.id)state.tab=parent.id;}changed=true;}
      for(const descriptor of descriptors){let tab;for(const candidate of list){if(await descriptorId(candidate)===descriptor.id){tab=candidate;break;}}
        if(!tab){if(descriptor.type==='browser'){const info=await window.desktop.browser({action:'create',group:scope.scope==='team'?'team':'main',restore:true,unloaded:true,parentId:parent?.id,url:descriptor.url,history:descriptor.history,title:descriptor.title});if(scope.scope==='chat'&&!state.tabs.includes(parent)){await window.desktop.browser({action:'close',id:info.id});return;}tab=scope.scope==='team'?{id:'team:'+crypto.randomUUID(),type:'browser',browserId:info.id,url:info.url,history:info.history,title:descriptor.title,loaded:false}:{id:info.id,type:'browser',label:descriptor.title,parentId:parent.id,info};}
          else if(scope.hostId)tab={id:'document:'+scope.hostId+':'+scope.id+':'+descriptor.documentId,type:'remote-document',parentId:parent.id,hostId:scope.hostId,runId:scope.id,documentId:descriptor.documentId,mediaType:descriptor.mediaType,label:descriptor.title};
          else{const document=await api('/api/content-tabs',{action:'document',scope:'chat',id:scope.id,documentId:descriptor.documentId});if(!state.tabs.includes(parent))return;tab={id:'markdown:'+document.file,type:'markdown',parentId:parent.id,markdown:document,label:descriptor.title};}
          tab.contentTabId=descriptor.id;tab.customTitle=descriptor.customTitle;if(scope.scope==='team')teamState().tabs.push(tab);else{const existing=state.tabs.find(item=>item.id===tab.id);if(existing){Object.assign(existing,tab);tab=existing;}else state.tabs.push(tab);}changed=true;
        }
        // Preserve edits made while the request was in flight; they are sent next.
        const current=scope.scope==='team'?{id:tab.contentTabId||tab.id,type:'browser',title:tab.customTitle||tab.title||'New tab',...(tab.customTitle?{customTitle:tab.customTitle}:{}),url:tab.url||'',...(tab.history?{history:tab.history}:{})}:await descriptorFor(tab,parent);
        const initial=captured.find(item=>item.id===descriptor.id);
        if(initial&&JSON.stringify(current)!==JSON.stringify(initial))continue;
        if((tab.customTitle||tab.label||tab.title)!==descriptor.title||tab.customTitle!==descriptor.customTitle){tab.customTitle=descriptor.customTitle;if(scope.scope==='team')tab.title=descriptor.title;else tab.label=descriptor.title;changed=true;}
        if(descriptor.type==='browser'&&!(tab.loaded||tab.info?.loaded)&&JSON.stringify(tab.info?.history||tab.history)!==JSON.stringify(descriptor.history)){const info=await window.desktop.browser({action:'restore-history',id:tab.browserId||tab.id,url:descriptor.url,history:descriptor.history});if(tab.info)tab.info=info;else Object.assign(tab,{url:info.url,history:info.history});changed=true;}
        if(descriptor.type==='browser'&&(tab.info?.url||tab.url||'')!==descriptor.url){if(tab.loaded||tab.info?.loaded)await window.desktop.browser({action:'navigate',id:tab.browserId||tab.id,url:descriptor.url});if(tab.info)tab.info.url=descriptor.url;else tab.url=descriptor.url;changed=true;}
      }
      const full=scope.scope==='team'?teamState().tabs:state.tabs;
      const relevant=[];for(const tab of full)if(scope.scope==='team'||tab.parentId===parent.id){const id=await descriptorId(tab);if(ids.has(id))relevant.push({tab,id});}
      const ordered=descriptors.map(item=>relevant.find(entry=>entry.id===item.id)?.tab).filter(Boolean);const positions=full.map((tab,index)=>relevant.some(entry=>entry.tab===tab)?index:-1).filter(index=>index>=0);
      if(!orderChangedDuringRequest&&positions.some((position,index)=>full[position]!==ordered[index])){positions.forEach((position,index)=>full[position]=ordered[index]);changed=true;}
      if(changed){saveWorkspace();renderTabs();renderChatSubtabs();if(state.page==='team'&&state.tab==='overview')renderTeamTools();}
    }finally{applyingContentTabs=false;}
  },
  onError:(error,scope,initialized)=>{if(initialized&&!/offline|closed|not paired|unavailable|not connected/i.test(error.message))toast(error.message);}
});
function selectedChatParent(){
  const selected=state.tabs.find(tab=>tab.id===state.tab);
  if(['run','remote-run'].includes(selected?.type))return selected;
  return selected?.parentId?state.tabs.find(tab=>tab.id===selected.parentId&&['run','remote-run'].includes(tab.type)):null;
}
function tabToLeft(tab, tabs=state.tabs) {
  const siblings=tabs.filter(item=>tab.parentId?item.parentId===tab.parentId:!item.parentId&&!['overview','omi','life','team','engine','home','standup'].includes(item.type));
  const index=siblings.findIndex(item=>item.id===tab.id);
  return siblings[index-1]?.id || tab.parentId || 'overview';
}
async function closeChildTab(tab){
  // Native close emits browser-state before the IPC promise resolves. Move selection first.
  const previous=state.tab, previousChild=selectedChildren.get(tab.parentId), replacement=tabToLeft(tab);
  if(state.tab===tab.id)state.tab=replacement;
  if(selectedChildren.get(tab.parentId)===tab.id)selectedChildren.set(tab.parentId,replacement);
  try {
  if(tab.type==='browser')await window.desktop.browser({action:'close',id:tab.id});
  if(tab.type==='terminal'){const current=await window.desktop.terminal({action:'state'});if(current.sessions.some(session=>session.id===tab.terminal.id))await window.desktop.terminal({action:'close',id:tab.terminal.id});disposeTerminalUi(tab.id);}
  if(tab.type==='remote-document')forgetRemoteDocument(tab.id);
  state.tabs=state.tabs.filter(item=>item.id!==tab.id);
  saveWorkspace();render();
  } catch(error) { if(state.tabs.some(item=>item.id===previous))state.tab=previous;if(previousChild&&state.tabs.some(item=>item.id===previousChild))selectedChildren.set(tab.parentId,previousChild);render();throw error; }
}
function replaceChatContent(html){$('#main').innerHTML=html;}
function renderChatSubtabs(){
  const parent=selectedChatParent();if(!parent){cleanupChatEdges?.();$('#chat-subtabs')?.remove();return;}
  const children=state.tabs.filter(tab=>tab.parentId===parent.id);
  const signature=JSON.stringify([parent.id,parent.label,state.tab,children.map(tab=>[tab.id,tab.label,tab.type,tab.info?.favicon,tab.info?.agentControlling])]);
  if($('#chat-subtabs')?.dataset.signature===signature)return;
  cleanupChatEdges?.();const previousScroll=$('#chat-subtabs .chat-subtab-list')?.scrollLeft||0;$('#chat-subtabs')?.remove();
  const bar=document.createElement('nav');bar.id='chat-subtabs';bar.dataset.signature=signature;bar.setAttribute('aria-label','Chat tabs');
  bar.innerHTML=`<div class="chat-subtab-list"><button class="${state.tab===parent.id?'selected':''}" data-chat-subtab="${escape(parent.id)}" title="${escape(parent.label)}">${pairedBubbles}<span>Chat</span></button>${children.map(tab=>`<div class="chat-subtab ${state.tab===tab.id?'selected':''}"><button data-chat-subtab="${escape(tab.id)}" title="${escape(tab.label)}">${tab.type==='browser'?browserTabIcon(tab.info,escape):tab.type==='terminal'?'⌘':'▤'}<span>${escape(tab.label)}</span></button><button data-chat-child-close="${escape(tab.id)}" aria-label="Close ${escape(tab.label)}">×</button></div>`).join('')}</div><details class="chat-tab-add"><summary aria-label="Add tab to chat" title="Add tab to chat">＋</summary><div class="chat-tab-add-options">${addTabMenuItems('chat')}</div></details>`;
  // Navigation belongs to the workspace, independent of each content view's padding/scroll.
  $('#main').before(bar);
  bar.querySelectorAll('[data-chat-subtab]').forEach(button=>button.onclick=()=>{const selected=state.tabs.find(tab=>tab.id===button.dataset.chatSubtab);if(!selected)return;state.tab=selected.id;selectedChildren.set(parent.id,selected.id);if(selected.type==='browser')selectBrowserTab(selected.info);else render();});
  const childList=bar.querySelector('.chat-subtab-list');childList.scrollLeft=previousScroll;cleanupChatEdges=bindTabEdges(childList);bindTabReorder(childList,'.chat-subtab',node=>node.querySelector('[data-chat-subtab]')?.dataset.chatSubtab,(source,target,after)=>reorderVisibleTabs(source,target,after,parent.id));
  bar.querySelectorAll('[data-chat-child-close]').forEach(button=>button.onclick=event=>{event.stopPropagation();const tab=state.tabs.find(item=>item.id===button.dataset.chatChildClose);if(tab)void closeChildTab(tab).catch(error=>toast(error.message));});
  bar.querySelector('.chat-tab-add summary').onclick=event=>{if(state.tabs.find(tab=>tab.id===state.tab)?.type!=='browser')return;event.preventDefault();const rect=event.currentTarget.getBoundingClientRect();void window.desktop.browser({action:'popup-menu',items:[{id:'markdown',label:'Markdown file'},{id:'browser',label:'Browser'},{id:'terminal',label:'Terminal'},...(parent.type==='run'?[{id:'agent-terminal',label:'Agent terminal output'}]:[])],x:rect.left,y:rect.bottom}).then(choice=>{if(choice)bar.querySelector('[data-chat-add="'+choice+'"]')?.click();}).catch(error=>toast(error.message));};
  bar.querySelectorAll('[data-chat-add]').forEach(button=>button.onclick=async()=>{bar.querySelector('details').open=false;try{if(button.dataset.chatAdd==='agent-terminal'){if(parent.type!=='run')throw new Error('Agent command output is available on the executing Mac; remote chat activity remains in its conversation.');openTab({id:'agent-terminal:'+parent.id,type:'agent-terminal',label:'Agent terminal output',parentId:parent.id});}else if(button.dataset.chatAdd==='browser'){const info=await window.desktop.browser({action:'create',parentId:parent.id});openTab({id:info.id,type:'browser',label:info.title||'New tab',parentId:parent.id,info});}else if(button.dataset.chatAdd==='terminal')void openTerminalDialog(parent.id);else markdownDialog(parent.id);}catch(error){toast(error.message);}});
}

async function closeTopTab(id){
  const closing=state.tabs.find(item=>item.id===id);if(!closing)return;
  if(state.tab===id||state.tabs.find(item=>item.id===state.tab)?.parentId===id){state.tab=tabToLeft(closing);const remembered=selectedChildren.get(state.tab);if(state.tabs.some(item=>item.id===remembered&&item.parentId===state.tab))state.tab=remembered;}
  if(['run','remote-run'].includes(closing.type)){const scope={scope:'chat',id:closing.runId||closing.id,...(closing.hostId?{hostId:closing.hostId}:{})};await contentTabSync.sync(scope);contentTabSync.forget(scope);}
  const children=state.tabs.filter(tab=>tab.parentId===id);
  for(const child of children){if(child.type==='browser')await window.desktop.browser({action:'close',id:child.id});if(child.type==='terminal'){const current=await window.desktop.terminal({action:'state'});if(current.sessions.some(session=>session.id===child.terminal.id))await window.desktop.terminal({action:'close',id:child.terminal.id});disposeTerminalUi(child.id);}if(child.type==='remote-document')forgetRemoteDocument(child.id);}
  const tab=state.tabs.find(item=>item.id===id);if(!tab)return;
  if(tab.type==='browser')await window.desktop.browser({action:'close',id});
  if(tab.type==='terminal'){const current=await window.desktop.terminal({action:'state'});if(current.sessions.some(session=>session.id===tab.terminal.id))await window.desktop.terminal({action:'close',id:tab.terminal.id});disposeTerminalUi(tab.id);}
  localHistories.delete(id);forgetConversation(id);selectedChildren.delete(id);state.tabs=state.tabs.filter(item=>item.id!==id&&item.parentId!==id);
  if(state.tab===id||children.some(child=>child.id===state.tab))state.tab='overview';saveWorkspace();render();
}
async function closeCurrentTab(){
  const tab=state.tabs.find(item=>item.id===state.tab);if(!tab)return;
  if(tab.parentId)await closeChildTab(tab);else if(!['overview','omi','life','team','engine','home','standup'].includes(tab.type))await closeTopTab(tab.id);
}
function renderTabs() {
  const menuWasOpen=$('#tab-add-menu')?.open===true;
  cleanupMainEdges?.();tabScrollLeft=$('#tabs .tab-list')?.scrollLeft??tabScrollLeft;
  $('#tabs').innerHTML='<button id="topbar-home" aria-label="Proteus Home" title="Proteus Home"><span class="brandmark" aria-hidden="true">⤨</span><strong>Proteus</strong></button><div class="tab-list">'+state.tabs.filter(tab=>!tab.parentId&&!['overview','omi','life','team','engine','home','standup'].includes(tab.type)).map(tab=>`<div data-tab-container="${escape(tab.id)}" class="tabitem ${state.tab===tab.id||state.tabs.find(active=>active.id===state.tab)?.parentId===tab.id?'selected':''}"><button data-tab="${escape(tab.id)}" title="${escape(tab.info?.url || tab.label)}">${tab.type==='browser' ? browserTabIcon(tab.info,escape) : (['run','remote-run'].includes(tab.type)||(tab.type==='overview'&&state.page==='runs'))?pairedBubbles:tab.type==='team'?'☷':tab.type==='engine'||(tab.type==='overview'&&state.page==='engine')?'⚙':tab.type==='markdown'?'▤':tab.type==='life'?'♡':tab.type==='terminal'?'⌘':'◷'} &nbsp;${escape(tab.label || 'New tab')}</button>${`<button class="tabclose" aria-label="Close ${escape(tab.label || 'tab')}" data-close="${escape(tab.id)}">×</button>`}</div>`).join('')+'</div><div class="tab-actions"><button id="all-tabs-overview" class="tab-create" aria-label="Tab overview" title="Tab overview · ⌘⇧\\">▦</button><details id="tab-add-menu" class="tab-add-menu"><summary class="tab-create" aria-label="Add tab" title="Add tab">＋</summary><div class="tab-add-options">'+addTabMenuItems('main')+'</div></details></div>';
  $('#topbar-home').onclick=()=>navigate('home');$('#all-tabs-overview').onclick=()=>void showBrowserOverview(previousFeature==='team'?'team':selectedChatParent()?.id||'main');
  const list=$('#tabs .tab-list');if(list){list.scrollLeft=tabScrollLeft;list.onscroll=()=>{tabScrollLeft=list.scrollLeft;};cleanupMainEdges=bindTabEdges(list);bindTabReorder(list,'.tabitem',node=>node.dataset.tabContainer,(source,target,after)=>reorderVisibleTabs(source,target,after));}

  document.querySelectorAll('[data-tab-container]').forEach(item=>item.onclick=event=>{if(event.target.closest('[data-close]') || window.getSelection()?.isCollapsed===false)return;state.tab=item.dataset.tabContainer;const remembered=selectedChildren.get(state.tab);if(remembered&&state.tabs.some(child=>child.id===remembered&&child.parentId===state.tab))state.tab=remembered;const tab=state.tabs.find(t=>t.id===state.tab);if(tab.type==='schedule')schedule(tab.id);else if(tab.type==='browser')selectBrowserTab(tab.info);else render();});
  document.querySelectorAll('[data-close]').forEach(button=>button.onclick=event=>{event.stopPropagation();void closeTopTab(button.dataset.close).catch(error=>toast(error.message));});

  const mainMenu=$('#tab-add-menu');mainMenu.open=menuWasOpen;mainMenu.querySelector('summary').onclick=event=>{if(state.tabs.find(tab=>tab.id===state.tab)?.type!=='browser')return;event.preventDefault();const rect=event.currentTarget.getBoundingClientRect();void window.desktop.browser({action:'popup-menu',items:[{id:'markdown',label:'Markdown file'},{id:'browser',label:'Browser'},{id:'terminal',label:'Terminal'},{id:'new-chat',label:'New chat'},{id:'internet-search',label:'Internet Search'}],x:rect.left,y:rect.bottom}).then(choice=>{if(choice)mainMenu.querySelector('#'+choice)?.click();}).catch(error=>toast(error.message));};
  $('#internet-search').onclick=()=>{ $('#tab-add-menu').open=false;internetSearchDialog({state,escape,showDialog,api,toast,refresh,open:runTab}); };
  $('#new-chat').onclick=()=>{ $('#tab-add-menu').open=false;chatDialog(); };$('#markdown').onclick=()=>{ $('#tab-add-menu').open=false;markdownDialog(); };
  $('#terminal').onclick=()=>{ $('#tab-add-menu').open=false;openTerminalDialog(); };
  $('#browser').onclick=async()=>{ $('#tab-add-menu').open=false;try{if(!window.desktop)throw new Error('Open the desktop app to use browser tabs.');const info=await window.desktop.browser({action:'create'});openTab({id:info.id,type:'browser',label:info.title||'New tab',info});}catch(error){toast(error.message);}};
}

function browserBounds() {
  if(isBrowserOverviewOpen())return;
  if($('#dialog').open){window.desktop?.browser({action:'hide',...browserSurfaceIdentity()}).catch(e=>toast(e.message));return;}
  const area=$('#browser-area'),tab=state.tabs.find(t=>t.id===state.tab);
  if(area&&tab?.type==='browser'){
    if(!tab.info?.url||tab.info?.loaded===false)return;
    const r=area.getBoundingClientRect();selectBrowserSurface();window.desktop?.browser({action:'show',id:tab.id,bounds:{x:r.x,y:r.y,width:r.width,height:r.height},...browserSurfaceIdentity()}).catch(e=>toast(e.message));
    return;
  }
  if(previousFeature==='team')teamBrowserBounds();
}
function updateBrowserControls() {
  const tab=state.tabs.find(t=>t.id===state.tab);if(tab?.type!=='browser'||!$('#browser-url'))return;
  const info=tab.info||{};
  if(document.activeElement!==$('#browser-url'))$('#browser-url').value=info.url||'';
  $('#browser-back').disabled=!info.canGoBack;$('#browser-forward').disabled=!info.canGoForward;
  $('#browser-reload').textContent=info.loading?'×':'↻';$('#browser-reload').title=info.loading?'Stop loading':'Reload';
  updateAgentAccess($('#browser-share'), info);
  $('#browser-status').textContent=info.error||'';$('#browser-status').hidden=!info.error;
}
function renderBrowser() {
  selectBrowserSurface();
  $('#main').classList.add('browser-main');
  $('#main').innerHTML='<form class="browserbar" id="browser-form"><button type="button" id="browser-back" aria-label="Back">←</button><button type="button" id="browser-forward" aria-label="Forward">→</button><button type="button" id="browser-reload" aria-label="Reload or stop">↻</button>'+browserAddress('browser','Browser address')+'<button class="browser-go" type="submit" id="browser-go" aria-label="Load address" title="Load address">↵</button><button type="button" id="browser-fill-login" title="Fill login" aria-label="Fill login">⚿</button></form><div class="browserstatus" id="browser-status"></div><div id="browser-area" class="browserarea"></div>';
  const command=async(action,extra={})=>{try{await window.desktop.browser({action,id:state.tab,...extra});}catch(e){toast(e.message);}};
  $('#browser-fill-login').onclick=()=>fillBrowserLogin(state.tab);
  $('#browser-fill-login').insertAdjacentHTML('afterend','<button type="button" id="browser-overview" aria-label="Show all browser tabs" title="Tab overview · ⌘⇧\\">▦</button>');
  $('#browser-overview').onclick=()=>void showBrowserOverview(selectedChatParent()?.id||'main');
  bindBrowserAddressMenu($('#browser-url'),state.tab,{showDialog,toast});
  const navigateBrowser=async raw=>{try{const url=browserTarget(raw);await command('navigate',{url});const tab=state.tabs.find(t=>t.id===state.tab);if(tab){tab.info={...tab.info,url,loaded:true};renderBrowser();}}catch(error){toast(error.message);}};
  $('#browser-form').onsubmit=event=>{event.preventDefault();void navigateBrowser($('#browser-url').value);$('#browser-url').blur();};
  bindDesktopBrowserRecents($('#browser-url'),{api,navigate:navigateBrowser,toast});
  for (const direction of ['back', 'forward']) {
    const button = $('#browser-' + direction), tabId = state.tab;
    bindBrowserHistoryButton(button, {direction, tabId, group:'main', selectionRevision:browserSurfaceRevision,
      isCurrent:()=>state.tab===tabId,
      command:(action,extra)=>window.desktop.browser({action,id:tabId,...extra}),
      onError:error=>toast(error.message)});
  }
  $('#browser-reload').onclick=()=>command(state.tabs.find(t=>t.id===state.tab)?.info?.loading?'stop':'reload');
  $('#browser-share').onclick=()=>command('share',{shared:$('#browser-share').getAttribute('aria-pressed')!=='true'});
  updateBrowserControls();
  const current=state.tabs.find(t=>t.id===state.tab);
  if(!current?.info?.url){void window.desktop?.browser({action:'hide',...browserSurfaceIdentity()});void renderBrowserHome($('#browser-area'),{escape,toast,time,api,showDialog,browser:window.desktop.browser,navigate:navigateBrowser});}
  else if(current.info.loaded===false){void window.desktop?.browser({action:'hide',...browserSurfaceIdentity()});$('#browser-area').innerHTML='<div class="empty"><p>This tab is unloaded.</p><button id="browser-load">Load tab</button></div>';$('#browser-load').onclick=async()=>{await command('activate');current.info.loaded=true;renderBrowser();};}
  else requestAnimationFrame(browserBounds);
  renderChatSubtabs();
  if(!current?.info?.url)$('#browser-url').focus({preventScroll:true});
}
const lines=value=>value.split('\n').map(s=>s.trim()).filter(Boolean);
const permissionModeNames={ask:'Ask each time',custom:'Saved rules only',trusted:'Trusted workspace',autopilot:'Auto-approve tools'};
const permissionDrafts=new Map();
const displayedMode=context=>context.mode==='trusted'&&!context.readOnlyTools?'custom':context.mode;
function permissionChoices(pending) {
  const choices=pending.permissionChoices || [];
  return `<p class="note">Approve once applies only to this request. Saved workspace choices remain on this Mac until revoked and also affect other chats and schedules with the same configuration.</p><p class="note">${escape(pending.permissionReason || '')}</p>${choices.length?`<div class="permission-options">${choices.map(choice=>`<button data-permission-answer="${escape(choice.value)}" title="${escape(choice.label)}">${escape(choice.value==='always-tool'&&pending.details?.kind==='shell'?'Always allow this exact command':choice.label)}</button>`).join('')}</div><p class="note">Saved approvals apply to this workspace across chats and schedules. Auto-approve tools includes terminal commands and configured tools; terminal commands are not confined to folders. Enterprise-required approvals and questions still pause.</p>`:''}`;
}
function permissionControls(context, ref) {
  if(!context)return '';
  return `<div class="permission-control" data-context-id="${escape(context.id)}" data-permission-ref="${escape(JSON.stringify(ref))}"><label>Workspace tool approvals</label><p class="note">Saved on this Mac for this and future chats and scheduled runs with the same provider and workspace configuration, until changed or revoked. Chat-only approval survives restart and applies only to this chat and its future continuations.</p><div class="actions"><select aria-label="Tool approval mode" data-permission-mode>${Object.entries(permissionModeNames).map(([mode,name])=>`<option value="${mode}" ${(permissionDrafts.get(context.id)||context.workspaceMode||displayedMode(context))===mode?'selected':''}>${name}</option>`).join('')}</select><button data-save-permissions>Apply permissions</button></div><p class="note">Effective: <strong>${escape(permissionModeNames[displayedMode(context)])}</strong> from ${context.source==='chat'?'this chat':'the workspace'}. Workspace setting: ${escape(permissionModeNames[context.workspaceMode||displayedMode(context)])}. Changing the workspace setting also affects other chats and schedules with this context.</p><p class="note">Trusted workspace allows file reads/writes in its folders, read-only MCP calls, and browser reading/navigation. Other operations use saved rules or ask. Auto-approve tools also allows terminal commands and configured tools; commands can access beyond these folders. Questions and enterprise-required approvals still pause.</p><details><summary>Authorized folders and saved rules</summary><ul>${context.folders.map(folder=>`<li><code>${escape(folder.path)}</code> · ${escape(folder.access)}</li>`).join('') || '<li>No folders trusted yet.</li>'}</ul><pre>${escape(JSON.stringify(context.rules,null,2))}</pre></details>${ref.runId?`<div class="chat-permission-scope"><h3>This chat only</h3><p class="note">${context.chatMode==='autopilot'?'Auto-approve this chat and future continuations is on. It lasts through continuation and restart until revoked or this chat’s permission context changes.':'This chat inherits its workspace setting.'} Auto-approval stays within existing granted resources; it does not grant new filesystem access. Mandatory approvals and sandbox rules still apply.</p><div class="actions"><button data-chat-autoapprove ${context.chatMode==='autopilot'?'disabled':''}>Auto-approve this chat and future continuations</button><button data-chat-inherit ${context.chatMode==='autopilot'?'':'disabled'}>Use workspace setting</button></div></div>`:''}</div>`;
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
  document.querySelectorAll('[data-chat-autoapprove],[data-chat-inherit]').forEach(button=>button.onclick=async()=>{const control=button.closest('.permission-control'),ref=JSON.parse(control.dataset.permissionRef),run=state.data.runs.find(item=>item.id===ref.runId);if(!run)return;try{await api('/api/permissions',{action:'set-chat-mode',runId:run.id,mode:button.hasAttribute('data-chat-autoapprove')?'autopilot':'inherit',expectedContextId:control.dataset.contextId,expectedChatRevision:run.permissionContext.chatRevision});await refresh(true);toast(button.hasAttribute('data-chat-autoapprove')?'Chat-only auto-approval saved.':'Chat now uses its workspace setting.');}catch(error){toast(error.message);}});
  document.querySelectorAll('[data-revoke-permissions]').forEach(button=>button.onclick=async()=>{
    try {await api('/api/permissions',{action:'revoke',id:button.dataset.revokePermissions,expectedRevision:state.data.permissions.revision});await refresh(true);toast('Authorization revoked. Future tool requests will ask.');}catch(error){toast(error.message);}
  });
}
function renderSettings() {
  const settings=state.data.settings;
  $('#main').innerHTML=`<div class="heading"><div><div class="eyebrow">Configuration</div><h1>App Setup</h1><p class="muted">Plain JSON settings for new chats and schedules. Existing runs keep their captured configuration.</p></div><button class="primary" id="save-settings">Save settings</button></div><div class="grid"><section class="card"><h2>Workspace</h2><div class="field"><label>Default working directory</label><input id="settings-cwd" value="${escape(settings.workspace.cwd)}"></div><div class="field"><label>Additional repositories / directories · one per line</label><textarea id="settings-roots" rows="5">${escape(settings.workspace.additionalDirectories.join('\n'))}</textarea></div><div class="row"><div><label>Default provider</label><select id="settings-provider"><option value="copilot" ${settings.provider==='copilot'?'selected':''}>Copilot</option><option value="codex" ${settings.provider==='codex'?'selected':''}>Codex</option><option value="claude" ${settings.provider==='claude'?'selected':''}>Claude</option><option value="rehearsal" ${settings.provider==='rehearsal'?'selected':''}>Local rehearsal</option></select></div><div><label>Default model</label>${modelPicker('settings-model',settings.model,settings.provider)}<button class="subtle" id="settings-model-refresh">↻ Refresh models</button></div></div>${modelControls('settings-model',settings)}<div class="field"><label>Time zone</label><input id="settings-timezone" value="${escape(settings.timezone)}"></div><div class="field"><label>Skill directories · one per line</label><textarea id="settings-skills" rows="3">${escape(settings.skillDirectories.join('\n'))}</textarea></div><details><summary>Default MCP servers · JSON</summary><p class="note">Use command arguments and environment references. Keep secrets in provider authentication or the system keychain.</p><textarea id="settings-mcp" rows="10">${escape(JSON.stringify(settings.mcpServers,null,2))}</textarea></details></section><section class="card"><h2>Where your files live</h2><p class="note">New app schedules:</p><div class="filepath">${escape(state.data.home)}/schedules/</div><p class="note">Run history:</p><div class="filepath">${escape(state.data.home)}/runs/</div><p class="note">Settings:</p><div class="filepath">${escape(settings.file)}</div><button id="open-settings">Open settings file ↗</button><hr class="divider"><h3>Repository-owned schedules</h3><p class="note">An imported organization workflows schedule remains owned by its organization workflows automation manifest. Change that source with AI, export it, then refresh the local copy. The schedule editor shows both locations.</p><h3>Workspace context</h3><p class="note">Copilot receives all listed roots and can read their instructions and files. The VS Code companion also sends the active file, selection location, and open file paths. VS Code’s code index, extension tools, and existing chat history are not copied.</p><h3>Copilot session storage</h3><p class="note">Choose an existing folder for new Copilot sessions. Existing sessions keep their original location. This also holds Copilot configuration; changing it can require sign-in.</p><input id="settings-copilot-home" placeholder="Provider default (~/.copilot)" value="${escape(settings.copilotDataDirectory || '')}"><h3>Data directory</h3><p class="note">Set PROTEUS_HOME before launching to use another data directory. Moving live run history is not performed by this settings screen.</p></section></div>`;
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
async function closeTabSet(tabs){for(const tab of tabs){if(!state.tabs.some(item=>item.id===tab.id))continue;if(tab.parentId)await closeChildTab(tab);else await closeTopTab(tab.id);}}
function insertionAnchor(tab){return state.tabs.includes(tab)&&(!tab.parentId||state.tabs.some(t=>t.id===tab.parentId));}
async function addAdjacent(tab,after,event){
  const parentId=tab.parentId||null,rect=event.target.getBoundingClientRect();
  const choice=await window.desktop.browser({action:'popup-menu',items:[{id:'browser',label:'Browser'},{id:'markdown',label:'Markdown file'},{id:'terminal',label:'Terminal'},...(!parentId?[{id:'new-chat',label:'New chat'}]:[])],x:rect.left,y:rect.bottom});
  if(!choice)return;if(!insertionAnchor(tab))throw new Error('The insertion tab was closed. Choose another tab.');
  const guard=()=>{if(!insertionAnchor(tab))throw new Error('The insertion tab was closed. Nothing was inserted.');};
  const insert=created=>{guard();const existing=state.tabs.find(t=>t.id===created.id);if(existing)throw new Error('That file is already open. Select its existing tab.');const index=state.tabs.indexOf(tab);state.tabs.splice(index+(after?1:0),0,{...created,...(parentId?{parentId}:{})});openTab(state.tabs.find(t=>t.id===created.id));};
  if(choice==='browser'){const info=await window.desktop.browser({action:'create',parentId});if(!insertionAnchor(tab)){await window.desktop.browser({action:'close',id:info.id});throw new Error('The insertion tab was closed.');}state.tabs=state.tabs.filter(t=>t.id!==info.id);insert({id:info.id,type:'browser',label:info.title||'New tab',info});}
  else if(choice==='terminal')openTerminalDialog(parentId,insert,guard);
  else if(choice==='markdown')openMarkdownPicker('open',parentId,insert,guard);
  else chatDialog(insert,guard);
}
let transferringTab=false;
function transferTabDialog(tab,copy=false,teamSource=null){
  if(tab.type!=='browser')throw new Error('Transfers currently support browser tabs. Chats cannot be nested; live terminals and host-bound documents keep their original owner.');
  const destinations=state.tabs.filter(t=>t.type==='run'&&t.id!==tab.parentId);
  showDialog(`<h2>${copy?'Send a tab copy':'Send tab'}</h2><label>Destination<select id="tab-destination"><option value="main">Application tabs</option><option value="team">Team Tools</option>${destinations.map(t=>`<option value="${escape(t.id)}">Chat · ${escape(t.label)}</option>`).join('')}</select></label><p class="note">Browser tabs stay on this Mac. Copies are independent, unloaded pages. Moving preserves the current page and revokes its old agent access. Projects are deferred; remote hosts, live terminals, chats and protected documents cannot be transferred.</p><div class="actions"><button id="close-dialog">Cancel</button><button id="dialog-submit">${copy?'Copy tab':'Move tab'}</button></div>`,async()=>{
    if(teamSource?!teamState().tabs.includes(teamSource):!state.tabs.includes(tab))throw new Error('The source tab was closed.');const target=$('#tab-destination').value,parent=destinations.find(t=>t.id===target);
    if(!['main','team'].includes(target)&&(!parent||!state.tabs.includes(parent)))throw new Error('The destination chat was closed.');
    if(tab.info?.agentControlling)throw new Error('Wait for the agent’s browser operation to finish before transferring this tab.');
    const originalIndex=state.tabs.indexOf(tab),wasActive=state.tab===tab.id;let info;
    transferringTab=true;
    try{
      if(copy)info=await window.desktop.browser({action:'create',restore:true,unloaded:true,url:tab.info?.url||'',history:tab.info?.history,title:tab.customTitle||tab.label,group:target==='team'?'team':'main',parentId:parent?.id});
      else info=await window.desktop.browser({action:'transfer',id:tab.id,group:target==='team'?'team':'main',parentId:parent?.id});
      if(parent&&!state.tabs.includes(parent)){if(copy)await window.desktop.browser({action:'close',id:info.id});else await window.desktop.browser({action:'transfer',id:info.id,group:teamSource?'team':'main',parentId:tab.parentId||null});throw new Error('The destination chat was closed. The source tab was kept.');}
      const next={...tab,id:info.id,contentTabId:copy?info.id:tab.contentTabId,info};delete next.parentId;if(parent)next.parentId=parent.id;
      if(!copy){if(teamSource)forgetTeamBrowser(tab.id);else state.tabs=state.tabs.filter(item=>item!==tab);if(tab.parentId)selectedChildren.delete(tab.parentId);}
      if(target==='team'){selectTeamBrowser(info);if(wasActive&&!copy)state.tab=tab.parentId||'overview';}
      else{state.tabs.push(next);if(wasActive&&!copy)state.tab=next.id;}
      saveWorkspace();render();
    }finally{transferringTab=false;}
  });
}
function selectedText(){return window.getSelection()?.toString()||'';}
function selectContents(node){const range=document.createRange();range.selectNodeContents(node);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);}
async function openContextLink(href,external=false,parentId=null){const url=new URL(href,location.href);if(!['https:','http:'].includes(url.protocol))throw new Error('Only HTTP and HTTPS links can open as browser tabs.');if(external){await window.desktop.openLink(url.href);return;}const info=await window.desktop.browser({action:'create',url:url.href,parentId});openTab({id:info.id,type:'browser',label:info.title||url.host,info,...(parentId?{parentId}:{})});}
document.addEventListener('contextmenu',event=>{
  if(event.defaultPrevented||event.target.closest('#chat-context-menu,.proteus-context-menu'))return;
  const target=event.target,selection=selectedText();
  const tabNode=target.closest('[data-tab-container],.chat-subtab');
  if(tabNode){const id=tabNode.dataset.tabContainer||tabNode.querySelector('[data-chat-subtab]')?.dataset.chatSubtab,tab=state.tabs.find(item=>item.id===id);if(!tab)return;const siblings=tab.parentId?state.tabs.filter(item=>item.parentId===tab.parentId):state.tabs.filter(item=>!item.parentId&&!['overview','omi','life','team','engine','home','standup'].includes(item.type));const index=siblings.findIndex(item=>item.id===id);const items=[{id:'add-left',label:'Add tab to left'},{id:'add-right',label:'Add tab to right'},{id:'move-tab',label:'Send tab to chat / Team Tools…',enabled:tab.type==='browser'},{id:'copy-tab',label:'Send a tab copy to chat / Team Tools…',enabled:tab.type==='browser'},...(tab.parentId?[{id:'rename-tab',label:'Rename tab…'}]:[]),{id:'close',label:'Close tab'},{id:'close-others',label:'Close other tabs',enabled:siblings.length>1},{id:'close-right',label:'Close tabs to the right',enabled:index<siblings.length-1}];if(['run','remote-run'].includes(tab.type))items.unshift({id:'rename',label:'Rename chat…'});if(tab.type==='browser')items.push({id:'unload',label:'Unload browser tab'});
    void showContextMenu(event,items,toast).then(async choice=>{if(choice==='add-left'||choice==='add-right')await addAdjacent(tab,choice==='add-right',event);else if(choice==='move-tab'||choice==='copy-tab')transferTabDialog(tab,choice==='copy-tab');else if(choice==='rename')renameChat({id:tab.id,chatId:tab.runId||tab.id,title:tab.chatTitle||tab.label,titleRevision:tab.titleRevision||state.data.runs.find(run=>run.id===tab.id)?.titleRevision,hostId:tab.hostId,local:tab.type==='run'});else if(choice==='rename-tab')renameContentTab(tab);else if(choice==='close')await closeTabSet([tab]);else if(choice==='close-others')await closeTabSet(siblings.filter(item=>item.id!==id));else if(choice==='close-right')await closeTabSet(siblings.slice(index+1));else if(choice==='unload'){await window.desktop.browser({action:'unload',id});tab.info.loaded=false;if(state.tab===id)renderBrowser();}}).catch(error=>toast(error.message));return;
  }
  if(target.closest('[data-chat-index],.terminal-canvas,#browser-url,#team-browser-url'))return;
  if(target.closest('#chat-rename,#peer-chat-rename,#peer-run-title,.chat-title-line h1')){const tab=state.tabs.find(item=>item.id===state.tab);if(tab&&['run','remote-run'].includes(tab.type)){void showContextMenu(event,[{id:'rename',label:'Rename chat…'}],toast).then(choice=>{if(choice==='rename')renameChat({id:tab.id,chatId:tab.runId||tab.id,title:tab.chatTitle||tab.label,titleRevision:tab.titleRevision||state.data.runs.find(run=>run.id===tab.id)?.titleRevision,hostId:tab.hostId,local:tab.type==='run'});});return;}}
  const editable=target.closest('input,textarea,[contenteditable=true]');if(editable){const start=editable.selectionStart,end=editable.selectionEnd,value=editable.value||'',picked=Number.isInteger(start)?value.slice(start,end):selection;const items=[{id:'undo',label:'Undo'},{id:'redo',label:'Redo'},{id:'cut',label:'Cut',enabled:!!picked},{id:'copy',label:'Copy',enabled:!!picked},{id:'paste',label:'Paste'},{id:'select-all',label:'Select All'}];void showContextMenu(event,items,toast).then(async choice=>{if(!choice)return;editable.focus({preventScroll:true});if(Number.isInteger(start))editable.setSelectionRange(start,end);if(choice==='copy')await copyContextText(picked);else if(choice==='cut'){await copyContextText(picked);editable.setRangeText('',start,end,'start');editable.dispatchEvent(new Event('input',{bubbles:true}));}else if(choice==='paste'){const text=await navigator.clipboard.readText();if(Number.isInteger(start))editable.setRangeText(text,start,end,'end');else document.execCommand('insertText',false,text);editable.dispatchEvent(new Event('input',{bubbles:true}));}else if(choice==='select-all')editable.select?.();else document.execCommand(choice);}).catch(error=>toast(error.message));return;}
  const link=target.closest('a[href]');if(link){const href=link.href,parentId=selectedChatParent()?.id||null;const items=[{id:'copy-link',label:'Copy link address'},{id:'open-tab',label:'Open in new browser tab'},{id:'open-external',label:'Open in default browser'}];if(selection)items.unshift({id:'copy-selection',label:'Copy selection'});void showContextMenu(event,items,toast).then(async choice=>{if(choice==='copy-selection')await copyContextText(selection);else if(choice==='copy-link')await copyContextText(href);else if(choice==='open-tab')await openContextLink(href,false,parentId);else if(choice==='open-external')await openContextLink(href,true,parentId);}).catch(error=>toast(error.message));return;}
  const message=target.closest('.message');if(message){const markdown=message.messageMarkdown||message.querySelector('.text')?.textContent||'',code=target.closest('pre code,pre')?.textContent;const items=selection?[{id:'copy-selection',label:'Copy selection'}]:[{id:'copy-message',label:'Copy message'},{id:'copy-markdown',label:'Copy as Markdown'}];if(code)items.push({id:'copy-code',label:'Copy code'});if(message.querySelector('[data-message-action="speak"]'))items.push({id:'read-aloud',label:'Read Aloud'});void showContextMenu(event,items,toast).then(async choice=>{if(choice==='copy-selection')await copyContextText(selection);else if(choice==='copy-message')await copyContextText(message.querySelector('.text')?.innerText||markdown);else if(choice==='copy-markdown')await copyContextText(markdown);else if(choice==='copy-code')await copyContextText(code);else if(choice==='read-aloud')message.querySelector('[data-message-action="speak"]')?.click();}).catch(error=>toast(error.message));return;}
  const area=target.closest('.markdown-preview,.home-document,.detail-facts,.tool-content,pre,.resource-row,.chat-details,#team-content');if(area){const items=[selection?{id:'copy-selection',label:'Copy selection'}:{id:'copy-value',label:'Copy value or entry'},{id:'select-all',label:'Select All in this area'}];void showContextMenu(event,items,toast).then(async choice=>{if(choice==='copy-selection')await copyContextText(selection);else if(choice==='copy-value')await copyContextText(target.closest('dd,pre,.resource-row')?.textContent||area.textContent);else if(choice==='select-all')selectContents(area);}).catch(error=>toast(error.message));}
},true);
window.desktop?.onShutdown?.(()=>{stopMessageSpeech();workspaceClosing=true;liveEvents.close();clearInterval(refreshInterval);clearInterval(usageInterval);clearTimeout(liveRefreshTimer);});
window.desktop?.onDocumentOpened?.(async value=>{const run=state.data.runs.find(r=>r.id===value.runId);if(!run)return;if(!state.tabs.some(t=>t.id===run.id))openTab({id:run.id,type:'run',label:run.title});openTab({id:'markdown:'+value.document.file,contentTabId:'document:'+value.documentId,type:'markdown',parentId:run.id,label:value.document.file.split('/').pop(),markdown:value.document});});
window.desktop?.onBrowserState(infos=>{
  if(workspaceRestoring||workspaceClosing||transferringTab)return;
  const currentBrowser=state.tabs.find(tab=>tab.id===state.tab&&tab.type==='browser');
  const previousSurface=currentBrowser?`${!!currentBrowser.info?.url}:${currentBrowser.info?.loaded!==false}`:null;
  const ids=new Set(infos.map(info=>info.id));
  if(currentBrowser&&!ids.has(currentBrowser.id)){state.tab=tabToLeft(currentBrowser);if(currentBrowser.parentId)selectedChildren.set(currentBrowser.parentId,state.tab);}
  state.tabs=state.tabs.filter(tab=>tab.type!=='browser'||ids.has(tab.id));
  syncTeamBrowsers(infos);
  for(const info of infos.filter(info=>info.group!=='team'&&!ownsTeamBrowser(info.id))){const tab=state.tabs.find(t=>t.id===info.id);if(tab){tab.info=info;tab.label=tab.customTitle||info.title||'New tab';}else {const parentId=info.parentId||info.owner;let parent=state.tabs.find(t=>t.id===parentId&&['run','remote-run'].includes(t.type));if(!parent&&info.owner){const run=state.data.runs.find(r=>r.id===info.owner);if(run){parent={id:run.id,type:'run',label:run.title};state.tabs.push(parent);}}state.tabs.push({id:info.id,type:'browser',label:info.title||'New tab',info,...(parent?{parentId:parent.id}:{})});}}
  if(!state.tabs.some(tab=>tab.id===state.tab)){state.tab='overview';render();}else if(currentBrowser&&!ids.has(currentBrowser.id)){render();}else{renderTabs();renderChatSubtabs();updateBrowserControls();if(currentBrowser&&previousSurface!==`${!!currentBrowser.info?.url}:${currentBrowser.info?.loaded!==false}`)renderBrowser();}saveWorkspace();
});
window.desktop?.onCloseCurrentTab?.(()=>void closeCurrentTab().catch(error=>toast(error.message)));
window.desktop?.onCloseTool?.((id)=>{state.tabs=state.tabs.filter(t=>t.id!==id);if(state.tab===id)state.tab='overview';render();});
window.desktop?.onNotification?.(()=>{if(state.page==='engine'&&state.engineSection==='notifications')renderEngineRoom('notifications');});
window.desktop?.onAddressFocus(()=>$('#browser-url')?.focus());
function selectBrowserTab(info) {
  if(info.group==='team'){selectTeamBrowser(info);openFeatureTab('team');}
  else {
    openTab({id:info.id,type:'browser',label:info.title||'New tab',info,...(info.parentId?{parentId:info.parentId}:{})});
    const tab=state.tabs.find(tab=>tab.id===info.id);
    if(info.loaded===false && info.url && !tab.activating){
      tab.activating=true;
      void window.desktop.browser({action:'activate',id:info.id}).then(current=>{
        if(!state.tabs.includes(tab))return;
        tab.info=current;tab.label=tab.customTitle||current.title||tab.label;saveWorkspace();
        if(state.tab===tab.id)renderBrowser();
      }).catch(error=>{if(state.tab===tab.id)toast(error.message);}).finally(()=>{tab.activating=false;});
    }
  }
}
window.desktop?.onBrowserAction?.(value=>{
  if(value.type==='overview')void showBrowserOverview(value.parentId||value.group);
  else if(value.type==='select-tab')selectBrowserTab(value.info);
  else if(value.type==='chat-link'){chatDialog();$('#chat-prompt').value=value.url;$('#chat-prompt').focus();}
  else if(value.type==='error')toast(value.message);
});
window.desktop?.onBrowserResize(()=>requestAnimationFrame(browserBounds));
window.addEventListener('resize',()=>requestAnimationFrame(browserBounds));
window.addEventListener('keydown',event=>{if((event.metaKey||event.ctrlKey)&&event.key==='l'&&$('#browser-url')){event.preventDefault();$('#browser-url').focus();}});
window.addEventListener('keydown',event=>{if((event.metaKey||event.ctrlKey)&&event.shiftKey&&event.code==='Backslash'){event.preventDefault();void showBrowserOverview(previousFeature==='team'?'team':selectedChatParent()?.id||'main');}});
function overviewGroups(browserTabs,scope='main'){
  const previews=new Map(browserTabs.map(tab=>[tab.id,tab]));
  const item=(tab,team=false,locked=false)=>{const preview=previews.get(team?tab.browserId:tab.id),kind=tab.type||'browser';return {id:tab.id,selected:team?(state.page==='team'&&state.tab==='overview'&&(teamState().active===tab.id||tab.id==='team-'+teamState().active)):state.tab===tab.id,title:tab.label||tab.title||preview?.title||'New tab',kind,url:tab.info?.url||tab.url||preview?.url||'',thumbnail:preview?.thumbnail,loaded:preview?.loaded??tab.loaded,icon:({browser:'◎',terminal:'⌘',markdown:'▤',run:'☷','remote-run':'☷','remote-document':'▤',schedule:'◷',overview:'☷',standup:'☷'})[kind]||'▤',closable:!locked,parentId:tab.parentId||null,team};};
  const top=state.tabs.filter(tab=>!tab.parentId&&!['overview','omi','life','team','engine','home','standup'].includes(tab.type));
  const groups=[{id:'main',title:'',items:top.filter(tab=>!['run','remote-run'].includes(tab.type)).map(tab=>item(tab))}];
  for(const parent of top.filter(tab=>['run','remote-run'].includes(tab.type)))groups.push({id:parent.id,title:parent.label||'Chat',items:[item(parent,false,true),...state.tabs.filter(tab=>tab.parentId===parent.id).map(tab=>item(tab))]});
  const team=teamState();groups.push({id:'team',title:'Team Tools',items:[item({id:'team-overview',label:'Team Tools',type:'overview'},true,true),item({id:'team-standup',label:'Standup',type:'standup'},true,true),...team.tabs.map(tab=>item(tab,true))]});
  return groups.filter(group=>group.items.length&&(scope==='main'||group.id===scope));
}
function selectOverview(item){
  if(item.team){teamState().active=item.id==='team-overview'?'overview':item.id==='team-standup'?'standup':item.id;openFeatureTab('team');return;}
  if(item.parentId)selectedChildren.set(item.parentId,item.id);
  const tab=state.tabs.find(entry=>entry.id===item.id);if(!tab)return;state.tab=tab.id;if(tab.type==='browser')selectBrowserTab(tab.info);else render();
}
async function closeOverview(item){
  if(item.team){await closeTeamTabById(item.id);return;}
  const tab=state.tabs.find(entry=>entry.id===item.id);if(!tab)return;if(tab.parentId)await closeChildTab(tab);else await closeTopTab(tab.id);
}
initBrowserOverview({escape,toast,overviewGroups,selectOverview,closeOverview,restore:()=>render()});
initRemoteDesktops({state,escape,toast,showDialog,openTab,time,refresh,openMessageLink,renderChatSubtabs,syncContentTabs:()=>contentTabSync.all(),revokeHostContent,replaceChatContent,onDeleted:reconcileDeletedChat,rename:renameChat,rememberView:()=>rememberView($('#main'),$('#main').dataset.viewKey),restoreView:()=>restoreView($('#main'),$('#main').dataset.viewKey)});
initChatsIndex({state,api,escape,toast,time,showDialog,openLocal:runTab,openRemote:openRemoteChat,onDeleted:reconcileDeletedChat,rename:renameChat,onIndexChanged:()=>{const count=$('[data-page="attention"] .count');if(count&&state.data)count.textContent=attentionChats(state.data.runs).length;}});
initTeamTools({state,api,escape,toast,time,lines,showDialog,browserTarget,fillBrowserLogin,timezone:()=>state.data.settings.timezone,onChange:saveWorkspace,transferTeamTab:(tab,copy)=>transferTabDialog({id:tab.browserId,type:tab.browserId?'browser':tab.type,label:tab.title,customTitle:tab.customTitle,info:{url:tab.url,agentControlling:tab.agentControlling}},copy,tab),openTeamTerminal:(callback,guard)=>openTerminalDialog(null,callback,guard),renderTeamTerminal:renderTerminal,disposeTeamTerminal:disposeTerminalUi,openTeamMarkdown:(callback,guard)=>openMarkdownPicker('open',null,callback,guard),openTeamLink:async(source,cwd)=>{try{const kind=ProteusMarkdown.linkKind(source);if(kind==='web'){const info=await window.desktop.browser({action:'create',url:source,group:'team'});selectTeamBrowser(info);renderTeamTools();}else if(kind==='file'){const file=decodeURIComponent(new URL(source,'file://'+cwd.replace(/\/$/,'')+'/').pathname);if(file.endsWith('.md')){const markdown=await api('/api/markdown',{file});const tab={id:'markdown:'+file,type:'markdown',label:file.split('/').pop(),file,markdown};const current=teamState();const old=current.tabs.find(item=>item.id===tab.id);if(old)Object.assign(old,tab);else current.tabs.push(tab);current.active=tab.id;saveWorkspace();renderTeamTools();}else await window.desktop.openPath(file);}else if(kind==='mail'){await navigator.clipboard.writeText(source.slice(7));toast('Email address copied.');}}catch(error){toast(error.message);}}});
initEngineRoom({state,api,escape,toast,time,manageMcp,providers:renderProviders,connections:()=>renderRemote({api,escape,toast}),setup:renderSettings,resourceChanged:(action,id)=>{if(action==='close')state.tabs=state.tabs.filter(tab=>tab.id!==id);saveWorkspace();},openAccount:()=>window.desktop?.openExternal(new URL('/security',state.data.life?.websiteOrigin||'https://proteus.example').href)});
initTerminals({state,escape,toast,showDialog,openTab});
initFeatures({state,escape,api,toast,refresh,openTab,showDialog,lines,restoreBrowser:()=>requestAnimationFrame(browserBounds)});
initOmi({state,escape,api,toast,refresh,openSchedule:schedule,openRun:id=>{const run=state.data.runs.find(item=>item.id===id);if(run)runTab(run);}});
initLife({state,escape,api,toast,refresh,openTab,showDialog,openSettings:()=>{navigate('engine','setup');}});
initMarkdownPicker({api,escape,showDialog,openTab,toast,defaultWorkspaceId:()=>state.data.context.defaultWorkspaceId});
let rendererOverlayVisible=false;
new MutationObserver(()=>{const visible=!!document.querySelector('dialog[open],.proteus-context-menu,#chat-context-menu');if(visible===rendererOverlayVisible)return;rendererOverlayVisible=visible;void window.desktop?.browser({action:'overlay',token:'renderer-overlays',visible}).catch(error=>toast(error.message));if(!visible)requestAnimationFrame(browserBounds);}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});
void window.desktop?.browser({action:'selection-init',...browserSurfaceIdentity()}).catch(error=>toast(error.message));
refresh().then(restoreWorkspace).then(async()=>{await Promise.allSettled([refreshUsage(),loadChatsIndex()]);render();}).catch(e=>toast(e.message));
const usageInterval=setInterval(() => refreshUsage(), 60_000);
const refreshInterval=setInterval(()=>{if((!document.activeElement?.matches('input,textarea,select') || !!$('#conversation-host'))&&!$('#dialog').open)refresh().catch(()=>{});},1500);

window.desktop?.onRemote(() => navigate('engine','connections'));
let liveRefreshTimer;
const liveEvents = new EventSource('/api/events');
liveEvents.addEventListener('change', () => { if (liveRefreshTimer) return; liveRefreshTimer = setTimeout(() => { liveRefreshTimer = null; if ((!document.activeElement?.matches('input,textarea,select') || !!$('#conversation-host')) && !$('#dialog').open) refresh().catch(() => {}); }, 120); });

// Deliberate pinch-out at the app baseline; ordinary scrolling and text fields are untouched.
let overviewPinch=null;
document.addEventListener('wheel',event=>{
  if(!event.ctrlKey||event.deltaY<=0||event.target.closest('input,textarea,[contenteditable=true],.terminal-canvas,dialog')||isBrowserOverviewOpen()){overviewPinch=null;return;}
  const now=performance.now();if(!overviewPinch||now-overviewPinch.last>220){overviewPinch={started:now,last:now,total:0};}
  overviewPinch.last=now;overviewPinch.total+=event.deltaY;
  if(now-overviewPinch.started>=300&&overviewPinch.total>=120){event.preventDefault();overviewPinch=null;void showBrowserOverview(previousFeature==='team'?'team':selectedChatParent()?.id||'main');}
},{passive:false});

document.addEventListener('keydown',event=>{
 if(event.key!=='Enter'||event.shiftKey||event.isComposing||event.repeat||event.altKey)return;
 const id=event.target.id,buttons={answer:'#reply','peer-answer':'#peer-send-answer',followup:'#continue','chat-prompt':'#dialog-submit','peer-prompt':'#dialog-submit','peer-followup':'#peer-send','search-prompt':'#dialog button[data-search-provider]'};
 if(!buttons[id])return;event.preventDefault();const button=document.querySelector(buttons[id]);if(button&&!button.disabled)button.click();
});
