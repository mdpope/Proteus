import {renderChatIndex} from './chats-index.js';
import {saveChatIndex,loadChatIndex,clearChatIndex,saveChatDrafts,loadChatDrafts,clearChatDrafts} from './remote-cache.js';
import {appRequest,dateTime} from './shared-app.js';
import { mount as mountMarkdown } from '../../../src/markdown-renderer.js';
import { PairingStore, AccountPairingStore, BrowserDestinationStore, BrowserRemoteClient, parsePairing } from './remote-client.js';
import { usagePanel } from './remote-usage.js';
import { mountMessageActions, setMessageActionsContext, stopMessageSpeech } from '../../../public/message-actions.js';
const root = document.querySelector('#remote-workspace');
const legacyStore = new PairingStore(root.dataset.account);
const accountStore = new AccountPairingStore(root.dataset.account,{sessionURL:root.dataset.sessionUrl});
const destinationStore=new BrowserDestinationStore(root.dataset.account,{accountStore,legacyStore});
let ended=false, suspended=false, reconnectTimer=null, reconnectAttempt=0, verifying=null, channel, sessionTimer, usageTimer;
const suppressed=new Set(),pendingPairs=new Set();
const hosts = new Map();
const sessions = new Map();
const chatTabs = new Map();
let appPreferences = {defaultMacId:null,timezone:'UTC'};
const sectionNames = ['chats', 'schedules', 'workspaces', 'connections'];
const initialQuery=new URLSearchParams(location.search);
const initialView = initialQuery.get('view');
let attentionOnly=initialQuery.get('attention')==='1',transcriptionOnly=initialQuery.get('transcription')==='1';
let chatMode=initialQuery.has('new')?'new':'index';
let active = '', view = sectionNames.includes(initialView) ? initialView : 'chats', switching = 0;
const chatTabKey='proteus.chat-tabs.v1.'+root.dataset.account;
const saveChatTabs=()=>{try{localStorage.setItem(chatTabKey,JSON.stringify([...chatTabs.values()].slice(-32).map(({hostId,id})=>({hostId,id}))));}catch{}};
const preferenceKey = 'proteus-remote-ui:' + root.dataset.account;
const readPreferences = () => { try { return JSON.parse(localStorage.getItem(preferenceKey)) || {}; } catch { return {}; } };
const writePreferences = changes => { try { localStorage.setItem(preferenceKey, JSON.stringify({ ...readPreferences(), ...changes })); } catch {} };
function setView(value) {
    view = sectionNames.includes(value) ? value : 'chats';
    history.replaceState(null, '', location.pathname + '?view=' + view+(attentionOnly&&view==='chats'?'&attention=1':'')+(transcriptionOnly&&view==='schedules'?'&transcription=1':''));
    document.dispatchEvent(new CustomEvent('proteus:section', { detail: { key: attentionOnly&&view==='chats'?'attention':transcriptionOnly&&view==='schedules'?'transcription':view==='connections'?'engine-room':view } }));
}
const $ = id => document.getElementById(id);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const text = value => typeof value === 'string' ? value : JSON.stringify(value, null, 2);
const options = (list, selected, label = value => value.name || value.id) => list.map(item => `<option value="${escape(item.id)}" ${item.id === selected ? 'selected' : ''}>${escape(label(item))}</option>`).join('');
const field = (name, label, value = '', type = 'text') => `<label>${escape(label)}${type === 'textarea' ? `<textarea name="${escape(name)}" rows="4">${escape(value)}</textarea>` : `<input name="${escape(name)}" type="${type}" value="${escape(value)}">`}</label>`;
const notice = message => { $('remote-notice').textContent = message; $('remote-notice').hidden = !message; };
const session = () => sessions.get(active);
function connectionLabel(hostId) {
    const current=sessions.get(hostId);
    if(current?.client?.status==='online')return 'Connected';
    if(current?.client?.status==='connecting'||current?.connecting)return 'Connecting';
    if(suppressed.has(hostId))return current?.rejected?'Connection rejected':'Disconnected';
    return current?.client?.status==='closed'?'Connection unavailable':'Paired · not connected';
}
function rememberHostName(current,state){
    const name=state?.hostName;if(typeof name!=='string'||!name.trim()||name.length>80||/[\x00-\x1f\x7f]/.test(name))return;
    const metadata=hosts.get(current.host.hostId);if(metadata)metadata.label=name.trim();
    void destinationStore.rememberName(current.host,name).catch(()=>{});
}
function destinationOptions() {
    $('remote-forget').textContent=hosts.get(active)?.source==='account'?'Forget from account':'Forget from this browser';
    $('remote-host').innerHTML = '<option value="">Choose a paired Mac</option>' + [...hosts.values()].map(host => `<option value="${escape(host.hostId)}" ${host.hostId === active ? 'selected' : ''}>${escape(host.label)}${host.source==='legacy'?' · browser only':''} · ${connectionLabel(host.hostId)}</option>`).join('');
    $('remote-status').textContent = active ? `${hosts.get(active)?.label || 'Mac'} · ${connectionLabel(active)}` : 'Choose a destination';
}
async function command(method, args, commandOptions) {
    const target = active, current = session(); if (!current?.client) throw new Error('Connect the selected Mac first.');
    await verifyWebsite();
    if(ended||suspended||active!==target||session()!==current)throw new Error('The website session or destination changed.');
    const client=current.client,result = await client.request(method, args, commandOptions);
    if (active !== target||session()!==current||current.client!==client||ended||suspended) throw new Error('The destination changed. Refresh that Mac to review the result.'); return result;
}
async function refresh() {
    const target = active, current = session(); const result = await command('sync', { cursor: current.host.cursor || '' });
    if (target !== active) return; current.state = result.state;rememberHostName(current,result.state);current.cachedRuns=result.state.runs||[];current.lastSyncAt=new Date().toISOString();void saveChatIndex(root.dataset.account,current.host,current.cachedRuns).catch(()=>{}); current.host.cursor = result.cursor; if(current.host.source==='legacy')await legacyStore.save(current.host); render();
}
function preserveDrafts() {
    const current = session();if(current?.selected){current.scroll ||= new Map();const pane=root.querySelector('.remote-messages');if(pane)current.scroll.set(current.selected,pane.scrollTop);} if (!current) return;
    for (const form of root.querySelectorAll('form[data-draft]')) { const old = current.drafts.get(form.dataset.draft) || {}; current.drafts.set(form.dataset.draft, { ...old, values: { ...old.values, ...Object.fromEntries(new FormData(form)) } }); }
}
function currentDraft(key, initial) { const current = session(); if (!current.drafts.has(key)) current.drafts.set(key, { values: initial, id: crypto.randomUUID(), issuedAt: new Date().toISOString() }); return current.drafts.get(key); }
function bindDraft(formId, key, method, args, after) {
    const form = $(formId); if (!form) return;
    form.addEventListener('input', () => { const draft = session().drafts.get(key); draft.values = { ...draft.values, ...Object.fromEntries(new FormData(form)) }; delete draft.sentAt; draft.id = crypto.randomUUID(); draft.issuedAt = new Date().toISOString(); });
    form.addEventListener('submit', async event => {
        event.preventDefault(); const current = session(), draft = current.drafts.get(key); const button = form.querySelector('button[type="submit"]'); button.disabled = true; notice('');
        try { const result = await command(method, args(Object.fromEntries(new FormData(form)), draft), { id: draft.id, issuedAt: draft.sentAt ||= new Date().toISOString() }); current.drafts.delete(key);await saveChatDrafts(root.dataset.account,current.host,current.drafts); form.removeAttribute('data-draft'); await after?.(result); await refresh(); }
        catch (error) { notice(error.message); } finally { if (button.isConnected) button.disabled = false; }
    });
}
function stopReconnect() { clearTimeout(reconnectTimer); reconnectTimer=null; }
async function verifyWebsite() {
    if(ended||suspended)throw new Error('Sign in and reload this page before reconnecting.');
    if(!verifying)verifying=accountStore.verifySession().catch(async error=>{if(error.sessionInvalid)await endAccount();else pauseUnverified();throw error;}).finally(()=>{verifying=null;});
    return verifying;
}
function pauseUnverified() {
    for(const pair of pendingPairs)pair.close();pendingPairs.clear();
    suspended=true;stopReconnect();++switching;for(const current of sessions.values()){const client=current.client;current.client=null;client?.close();current.state=null;current.run=null;current.images?.clear();if(current.host.source==='account')current.host.key=null;}
    render();notice('Website session could not be verified. Reload before reconnecting.');
}
function reconnect(hostId) {
    if(ended||suspended||active!==hostId||suppressed.has(hostId)||reconnectTimer||reconnectAttempt>=5)return;
    const attempt=++reconnectAttempt;
    reconnectTimer=setTimeout(()=>{reconnectTimer=null;if(active===hostId&&!suppressed.has(hostId))void connect(hostId,{automatic:true});},Math.min(1000*2**(attempt-1),16000));
}
async function connect(hostId,{automatic=false}={}) {
    if(ended||suspended)return;
    if(automatic&&suppressed.has(hostId))return;
    stopReconnect();if(!automatic){suppressed.delete(hostId);reconnectAttempt=0;}
    if(hostId!==active)stopMessageSpeech();
    preserveDrafts(); const generation = ++switching;const previous=session(); active = hosts.has(hostId) ? hostId : ''; writePreferences({ selectedHost: active, autoConnect:true }); notice(''); destinationOptions();
    if (!active) { render(); return; }
    const metadata = hosts.get(hostId); if (!metadata) return;
    let current = sessions.get(hostId); if (!current) { current = { host:metadata, drafts: new Map(), selected: null, run: null, state: null }; sessions.set(hostId, current); }
    if(current.client?.status==='online'){render();return;} current.state=null;current.rejected=false;current.connecting=true;render();
    try {
        await verifyWebsite();
        const host=metadata.source==='account'?await accountStore.credential(hostId):metadata;
        if(generation!==switching||ended||suspended)return;
        if(host.relay!==root.dataset.relay)throw new Error('This saved destination uses a different relay. Pair it again for this website.');
        if(current.host.deviceId!==host.deviceId){current.drafts.clear();current.images?.clear();host.cursor='';}else host.cursor=current.host.cursor||'';
        current.host=host;if(!current.drafts.size)current.drafts=await loadChatDrafts(root.dataset.account,host);const cached=await loadChatIndex(root.dataset.account,host);if(cached){current.cachedRuns=cached.items;current.lastSyncAt=cached.observedAt;}hosts.set(hostId,{...metadata,deviceId:host.deviceId,label:host.label,relay:host.relay,pairedAt:host.pairedAt});
        const client = current.client = new BrowserRemoteClient(host);current.connecting=false;
        bindRevocation(client,hostId,current);
        const relevant=()=>active===hostId&&current.client===client&&generation===switching&&!ended&&!suspended;
        client.addEventListener('status', () => { if (relevant()) { destinationOptions(); if (client.status === 'closed') { preserveDrafts();current.state=null;current.run=null;render();reconnect(hostId); } } });
        client.addEventListener('failure', event => { if (relevant()) notice(event.detail); });
        // Routing packets are not authenticated revocation proofs. Keep account credentials intact.
        client.addEventListener('rejected', () => { if(!relevant())return;suppressed.add(hostId);stopReconnect();preserveDrafts();current.state=null;current.run=null;notice('This Mac rejected the connection. Retry or create a fresh pairing; the saved account destination was retained.'); });
        client.addEventListener('change', event => { if(ended||suspended||current.client!==client)return; const change = event.detail; current.host.cursor = change.cursor; if (change.event === 'state'){current.state = change.data;rememberHostName(current,change.data);current.cachedRuns=change.data.runs||[];current.lastSyncAt=new Date().toISOString();void saveChatIndex(root.dataset.account,current.host,current.cachedRuns).catch(()=>{});} if (change.event === 'run' && change.runId === current.selected) current.run = change.data; if(active===hostId){preserveDrafts();render();} });
        await client.connect(); if (!relevant()) { client.close(); return; } await refresh();reconnectAttempt=0;void refreshUsage();
    } catch (error) { if(generation!==switching)return;if(error.sessionInvalid){await endAccount();return;}current.connecting=false;notice(error.message);render();if(![409,404].includes(error.status))reconnect(hostId); }
}
function renderUsage() { /* Shared shell owns Default Mac allowance across every feature. */ }
async function refreshUsage(force = false) {
    const current = session(), target = active;
    if (!current?.state || current.client?.status !== 'online' || current.usageLoading || current.state.appearance?.showProviderUsage === false) return;
    current.usageLoading = true; current.usageError = ''; renderUsage();
    try {
        const value = await command('provider.usage', { force });
        if (active !== target || session() !== current) return;
        current.state.appearance ||= {};
        current.state.appearance.showProviderUsage = value.enabled !== false;
        current.state.providerUsage = value;
    } catch { if (active === target) current.usageError = 'Usage is unavailable. Check or update Proteus on this Mac.'; }
    finally { current.usageLoading = false; if (active === target) renderUsage(); }
}
function modelFields(values, prefix = '') {
    const current = session(); const statuses = current.state?.providerStatuses || {};
    const providers = [...new Set([...Object.keys(statuses), current.state?.defaults?.provider || 'copilot', values.provider || 'copilot'])].filter(p => p !== 'local-process');
    const models = statuses[values.provider]?.models || (current.state?.providerStatus?.provider === values.provider ? current.state.providerStatus.models || [] : []);
    const selected = models.find(model => model.id === values.model); const controls = selected?.controls || {};
    const select = (name, label, choices, value) => `<label>${label}<select name="${prefix}${name}"><option value="">Default</option>${options(choices.map(item => typeof item === 'string' ? { id: item, name: item } : item), value)}</select></label>`;
    return `<label>Provider<select name="${prefix}provider">${options(providers.map(id => ({ id, name: id })), values.provider)}</select></label><label>Model<select name="${prefix}model"><option value="">Provider default</option>${options(models, values.model)}${values.model && !models.some(m => m.id === values.model) ? `<option selected value="${escape(values.model)}">${escape(values.model)} (refresh catalog)</option>` : ''}</select></label>${select('reasoningEffort', 'Reasoning', controls.reasoningEfforts || [], values.reasoningEffort)}${select('contextTier', 'Context', controls.contextTiers || [], values.contextTier)}${select('serviceTier', 'Speed', controls.serviceTiers || [], values.serviceTier)}`;
}
function contextFields(values) {
    const context = session().state.context || {}; const workspaces = context.workspaces || [];
    return `<label>Workspace<select name="workspaceId">${options(workspaces, values.workspaceId || context.defaultWorkspaceId, w => w.name || w.label || w.path || w.id)}</select></label><label>Agent<select name="agentId"><option value="">Default agent</option>${options((context.entries || []).filter(e => e.kind === 'agent' && e.userInvocable !== false && e.mode !== 'disabled'), values.agentId)}</select></label><label>Default context<select name="includeDefaults"><option value="true" ${values.includeDefaults !== 'false' ? 'selected' : ''}>Include workspace defaults</option><option value="false" ${values.includeDefaults === 'false' ? 'selected' : ''}>Only selected sources</option></select></label>`;
}
function render() {
    const focused = document.activeElement; const focus = focused?.name && focused.closest('form') ? { form: focused.closest('form').id, name: focused.name, start: focused.selectionStart, end: focused.selectionEnd } : null;
    const messageControl = focused?.closest('[data-message-key]');
    const actionFocus = messageControl ? { key: messageControl.dataset.messageKey, action: focused.dataset.messageAction, seek: focused.hasAttribute('data-message-seek') } : null;
    const current = session(), online = current?.client?.status === 'online';
    setMessageActionsContext(online&&current?.state&&view==='chats'&&chatMode==='chat'&&current.run ? JSON.stringify([root.dataset.account,active,current.run.id]) : '');
    destinationOptions(); renderUsage();renderChatTabs();renderRecentChats();
    const management=view==='connections';
    root.querySelector('.remote-heading').hidden=!management;
    root.querySelector('.remote-destinations').hidden=!(management||['schedules','workspaces'].includes(view));
    root.querySelectorAll('.remote-destinations button').forEach(button=>button.hidden=!management);
    $('remote-pair-panel').hidden=!management;root.querySelector('.remote-privacy').hidden=!management;
    if(management){$('remote-content').innerHTML='<p>Mac connection keys remain separate. <a href="/engine-room?tab=connections">Choose the Default Mac in Engine Room</a>.</p>';return;}
    root.querySelectorAll('[data-remote-view]').forEach(button => button.classList.toggle('active', button.dataset.remoteView === view));
    if(view==='chats'&&chatMode==='index'){renderChatIndex($('remote-content'),{rows:aggregateChats(),hosts:[...hosts.values()],escape,time:value=>dateTime(value,appPreferences.timezone),timezone:appPreferences.timezone,attention:attentionOnly,open:(id,hostId)=>void openChat(id,hostId).catch(error=>notice(error.message)),refresh:()=>void refreshAggregate(true).then(render).catch(error=>notice(error.message)),hasMore:[...sessions.values()].some(value=>value.client?.status==='online'&&(value.state?.runs?.length||0)<(value.state?.runCount||0)),loadMore:loadMoreChats});if(focused?.id?.startsWith('chat-index-')){const replacement=$(focused.id);replacement?.focus({preventScroll:true});if(typeof focused.selectionStart==='number')replacement?.setSelectionRange?.(focused.selectionStart,focused.selectionEnd);}return;}
    if (!current?.state || !online) { $('remote-content').innerHTML = `<section class="card"><h2>${active ? 'Connect ' + escape(hosts.get(active)?.label) : 'Choose a paired Mac'}</h2><p>${active ? 'Remote content is hidden while disconnected. The selected Mac reconnects automatically unless you disconnect it. Use Connect to retry now.' : 'Use a fresh pairing code from each Mac. Each authorized Mac keeps separate keys, drafts and event cursors.'}</p>${view==='chats'?`<h3>Last authorized chat index</h3>${aggregateChats().map(run=>`<p>${escape(run.title||'Chat')} · ${escape(run.hostLabel)} · ${run.cached?'cached '+escape(dateTime(run.lastSyncAt,appPreferences.timezone)):'online'}</p>`).join('')||'<p>No cached chat index.</p>'}`:''}</section>`; return; }
    if (view === 'chats') renderChats(current); else if (view === 'schedules') renderSchedules(current); else renderWorkspaces(current);
    if (actionFocus) {
        const toolbar = [...root.querySelectorAll('[data-message-key]')].find(element => element.dataset.messageKey === actionFocus.key);
        const control = actionFocus.seek ? toolbar?.querySelector('[data-message-seek]') : [...(toolbar?.querySelectorAll('[data-message-action]') || [])].find(element => element.dataset.messageAction === actionFocus.action);
        if (control && !control.disabled && !control.closest('[hidden]')) control.focus({ preventScroll: true });
    }
    if (focus) { const field = document.getElementById(focus.form)?.elements.namedItem(focus.name); if (field) { field.focus({ preventScroll: true }); if (typeof focus.start === 'number' && field.setSelectionRange) { try { field.setSelectionRange(focus.start, focus.end); } catch {} } } }
}
function bindCatalog(formId, key) {
    const form = $(formId);
    for (const select of form.querySelectorAll('select[name="provider"],select[name="model"]')) select.addEventListener('change', async () => { preserveDrafts(); const draft = session().drafts.get(key); if (select.name === 'provider') { draft.values.model = ''; draft.values.reasoningEffort = ''; draft.values.contextTier = ''; draft.values.serviceTier = ''; try { const status = await command('provider.status', { provider: select.value }); session().state.providerStatuses ||= {}; session().state.providerStatuses[select.value] = status; } catch (error) { notice(error.message); } } render(); });
}
async function openChat(id,hostId=active) { chatMode='chat'; if(hostId!==active||session()?.run?.id!==id||view!=='chats')stopMessageSpeech();preserveDrafts();if(hostId!==active||session()?.client?.status!=='online')await connect(hostId);const current=session();if(current?.client?.status!=='online')throw new Error('This chat’s Mac is not connected. Use Connect to retry.');current.selected=id;setView('chats');current.run=await command('chat.get',{id});chatTabs.set(hostId+':'+id,{hostId,id,title:current.run.title||current.run.schedule?.name||'Chat'});saveChatTabs();render(); }
function renderChats(current) {
    const previousScroll=root.querySelector('.remote-messages')?.scrollTop;
    const runs = aggregateChats().filter(run=>!attentionOnly||['awaiting_input','failed','interrupted'].includes(run.status)); const run = current.run; const key = run ? 'reply:' + run.id : 'new-chat'; const draft = currentDraft(key, run ? { prompt: '', mode: 'queue' } : { ...current.state.defaults, name: '', prompt: '', workspaceId: current.state.context.defaultWorkspaceId, includeDefaults: 'true' }); const values = draft.values;
    const pending = run?.pending; const answerKey=pending?'answer:'+run.id+':'+pending.id:null;const answerDraft=pending&&pending.type!=='permission'?currentDraft(answerKey,{answer:''}):null; const waiting = pending ? `<section class="remote-pending"><h3>${pending.type === 'permission' ? 'Approval needed on ' + escape(current.host.label) : 'Input requested'}</h3><pre>${escape(pending.question || text(pending.details || pending))}</pre>${pending.type === 'permission' ? '<button data-answer="approve" type="button">Approve once</button><button data-answer="deny" type="button">Deny</button>' : `<form id="remote-answer" data-draft="${escape(answerKey)}"><label>Your answer<textarea name="answer" required rows="3">${escape(answerDraft?.values.answer||'')}</textarea></label><button type="submit">Send answer</button></form>`}</section>` : '';
    const history = run ? `<header class="remote-chat-title"><h2>${escape(run.title || run.schedule?.name || 'Chat')}</h2><span>${escape(current.host.label)} · ${escape(run.status)}</span></header><div class="remote-messages">${run.earlier ? '<button id="remote-earlier" type="button">Load earlier messages</button>' : ''}${(run.events || []).map((event, eventIndex) => `<article class="remote-message ${escape(event.role || event.type)}"><div class="eyebrow">${escape(event.role || event.type)}<time>${escape(dateTime(event.at||event.timestamp||event.createdAt,appPreferences.timezone))}</time></div><div data-markdown-event="${eventIndex}"></div>${event.data?.tool ? `<details><summary>${escape(event.data.tool.summary || event.data.tool.name || 'Tool details')}</summary><pre>${escape(text(event.data.tool))}</pre></details>` : ''}</article>`).join('')}${Object.values(run.liveMessages || {}).map(message => `<article class="remote-message assistant"><div class="eyebrow">Responding</div><pre>${escape(message)}</pre></article>`).join('')}</div>${waiting}${run.queuedMessages?.length ? `<section class="card"><h3>Queued messages</h3>${run.queuedMessages.map(message => `<p>${escape(message.prompt || message.text)} <button data-unqueue="${escape(message.id)}" type="button">Remove</button></p>`).join('')}</section>` : ''}` : '<h2>Start a conversation</h2>';
    $('remote-content').innerHTML = `<div class="remote-chat-layout"><section class="card remote-chat-main">${history}<form id="remote-composer" data-draft="${escape(key)}">${run ? `<label>Send mode<select name="mode"><option value="queue" ${values.mode === 'queue' ? 'selected' : ''}>Queue next turn</option><option value="steer" ${values.mode === 'steer' ? 'selected' : ''}>Steer current turn</option></select></label>` : `<label>Mac<select id="remote-new-destination">${[...hosts.values()].map(host=>`<option value="${escape(host.hostId)}" ${host.hostId===active?'selected':''}>${escape(host.label)}</option>`).join('')}</select></label><div class="remote-fields">${field('name', 'Chat title', values.name)}${contextFields(values)}${modelFields(values)}</div>`}${field('prompt', run ? 'Follow-up message' : 'Message', values.prompt, 'textarea')}<button type="submit" class="primary">${run ? 'Send to ' : 'Start on '}${escape(current.host.label)}</button>${run && ['running', 'awaiting_input', 'queued'].includes(run.status) ? '<button id="remote-cancel" type="button">Cancel run</button>' : ''}</form></section></div>`;
    bindDraft('remote-composer', key, run ? (['running', 'awaiting_input'].includes(run.status) ? 'chat.send' : 'chat.resume') : 'chat.start', (input, retained) => { if (!input.prompt?.trim()) throw new Error('Enter a message.'); if (run) return { id: run.id, prompt: input.prompt, mode: input.mode, messageId: retained.id }; return { ...input, selectedIds: retained.selectedIds || [], includeDefaults: input.includeDefaults !== 'false' }; }, async result => { if (result.runId) await openChat(result.runId); });
    if (!run) {bindCatalog('remote-composer', key);$('remote-new-destination').onchange=async event=>{await connect(event.target.value);if(session()){session().run=null;session().selected=null;}render();};}
    if(run){const pane=root.querySelector('.remote-messages');if(pane)pane.scrollTop=current.scroll?.get(run.id)??previousScroll??0;}
    for (const element of root.querySelectorAll('[data-markdown-event]')) { const event = run.events[Number(element.dataset.markdownEvent)]; current.images ||= new Map(); mountMarkdown(element, event?.text || '', { copy: value => navigator.clipboard.writeText(value), link: url => { if (/^https?:\/\//i.test(url)) window.open(url, '_blank', 'noopener,noreferrer'); else notice('Open local file links on the paired Mac.'); }, image: async source => { const key = run.id + ':' + source; if (!current.images.has(key)) current.images.set(key, command('chat.image', { id: run.id, source }).then(r => r.dataURL).catch(error => { current.images.delete(key); throw error; })); return current.images.get(key); } }); }
    for (const element of root.querySelectorAll('[data-markdown-event]')) {
        const index=Number(element.dataset.markdownEvent), event=run.events[index];
        if ((event.role||event.type)!=='assistant'||['tool','reasoning','thinking'].includes(event.type)||event.streaming||event.data?.reasoning||event.data?.tool||typeof event.text!=='string'||!event.text.trim()) continue;
        const actions=document.createElement('div');element.after(actions);
        const identity=event.id ?? ((run.eventStart||0)+index);
        actions.dataset.messageKey=JSON.stringify([root.dataset.account,current.host.hostId,run.id,identity]);
        mountMessageActions(actions,{key:actions.dataset.messageKey,text:event.text,rendered:element,notify:notice});
    }
    root.querySelectorAll('[data-run]').forEach(button => button.onclick = () => openChat(button.dataset.run,button.dataset.runHost).catch(error => notice(error.message)));
    $('remote-more-runs')?.addEventListener('click', async () => { try { const older = await command('runs.list', { offset: (current.state.runs||[]).length }); current.state.runs.push(...older); preserveDrafts(); render(); } catch (error) { notice(error.message); } });
    $('remote-earlier')?.addEventListener('click', async () => { try { const older = await command('chat.get', { id: run.id, offset: run.eventCount - run.eventStart }); current.run = { ...run, events: [...older.events, ...run.events], eventStart: older.eventStart, earlier: older.earlier }; preserveDrafts(); render(); } catch (error) { notice(error.message); } });
    const answer = async value => { try { await command('chat.reply', { id: run.id, requestId: pending.id, answer: value });current.drafts.delete(answerKey);if(view==='chats'&&current.selected===run.id)await openChat(run.id);else await refresh(); } catch (error) { notice(error.message); } };
    root.querySelectorAll('[data-answer]').forEach(button => button.onclick = () => answer(button.dataset.answer));
    $('remote-answer')?.addEventListener('input',event=>{answerDraft.values.answer=new FormData(event.currentTarget).get('answer');});
    $('remote-answer')?.addEventListener('submit', event => { event.preventDefault(); answer(new FormData(event.target).get('answer')); });
    $('remote-cancel')?.addEventListener('click', async () => { try { await command('chat.cancel', { id: run.id }); await openChat(run.id); } catch (error) { notice(error.message); } });
    root.querySelectorAll('[data-unqueue]').forEach(button => button.onclick = async () => { try { await command('chat.remove-queued', { id: run.id, messageId: button.dataset.unqueue }); await openChat(run.id); } catch (error) { notice(error.message); } });
}
function renderSchedules(current) {
    const schedules=(current.state.schedules||[]).filter(item=>!transcriptionOnly||item.integration?.type==='omi'||item.provider==='local-process');
    const schedule = (current.state.schedules || []).find(s => s.id === current.scheduleId); const key = schedule ? 'schedule:' + schedule.id : null; const draft = schedule ? currentDraft(key, { ...schedule, enabled: String(schedule.enabled), expectedRevision: schedule.revision }) : null;
    $('remote-content').innerHTML = `<div class="remote-chat-layout"><aside class="card"><h2>${transcriptionOnly?'Transcription':'Schedules'}</h2>${schedules.map(s => `<button class="remote-schedule-item" type="button" data-schedule="${escape(s.id)}"><strong>${escape(s.name)}</strong><small>${s.enabled ? 'Enabled' : 'Disabled'} · ${escape(s.cron)}</small></button>`).join('') || '<p>No schedules configured on this Mac.</p>'}</aside><section class="card">${schedule ? `<h2>${escape(schedule.name)}</h2>${schedule.source?.manifest || schedule.provider === 'local-process' ? '<p>This schedule is owned by its source repository. Update that source on the Mac.</p>' : `<form id="remote-schedule-form" data-draft="${escape(key)}"><div class="remote-fields">${field('name', 'Name', draft.values.name)}<label>Status<select name="enabled"><option value="false" ${draft.values.enabled === 'false' ? 'selected' : ''}>Disabled</option><option value="true" ${draft.values.enabled === 'true' ? 'selected' : ''}>Enabled</option></select></label>${field('cron', 'Cron expression', draft.values.cron)}${field('timezone', 'Time zone', draft.values.timezone)}${modelFields(draft.values)}</div>${field('prompt', 'Instructions', draft.values.prompt, 'textarea')}<button type="button" id="remote-preview">Preview timing</button><button class="primary" type="submit">Save schedule</button><pre id="remote-timing"></pre></form>`}<button id="remote-run-schedule" type="button">Run once on ${escape(current.host.label)}</button><p>${escape(schedule.nextRuns?.join('\n') || '')}</p>` : '<h2>Choose a schedule</h2><p>Edits use the current Mac revision. Repository-owned schedules remain controlled by their source.</p>'}</section></div>`;
    root.querySelectorAll('[data-schedule]').forEach(button => button.onclick = () => { preserveDrafts(); current.scheduleId = button.dataset.schedule; render(); });
    if ($('remote-schedule-form')) { bindDraft('remote-schedule-form', key, 'schedule.save', input => ({ id: schedule.id, expectedRevision: draft.values.expectedRevision, changes: { ...input, enabled: input.enabled === 'true' } })); bindCatalog('remote-schedule-form', key); $('remote-preview').onclick = async () => { try { const input = Object.fromEntries(new FormData($('remote-schedule-form'))); $('remote-timing').textContent = text(await command('schedule.preview', { cron: input.cron, timezone: input.timezone })); } catch (error) { notice(error.message); } }; }
    $('remote-run-schedule')?.addEventListener('click', async () => { try { const result = await command('schedule.run', { id: schedule.id }); await openChat(result.runId); } catch (error) { notice(error.message); } });
}
function renderWorkspaces(current) {
    const context = current.state.context || {}; const workspaceId = current.workspaceId || context.defaultWorkspaceId; const selected = current.contextSelection || new Set(); const entries = context.entries || [];
    $('remote-content').innerHTML = `<section class="card"><h2>Workspaces & context</h2><p>These folders and sources belong to ${escape(current.host.label)}. Refreshing does not enable disabled sources.</p><label>Workspace<select id="remote-workspace-select">${options(context.workspaces || [], workspaceId, w => w.name || w.label || w.path || w.id)}</select></label><button id="remote-context-refresh" type="button">Refresh sources on Mac</button><button id="remote-context-preview" type="button">Preview selected context</button><div class="remote-context-list">${entries.map(entry => `<article><label><input type="checkbox" data-context="${escape(entry.id)}" ${selected.has(entry.id) ? 'checked' : ''} ${entry.mode === 'disabled' ? 'disabled' : ''}><strong>${escape(entry.name)}</strong> · ${escape(entry.kind)}</label><p>${escape(entry.description || entry.path || '')}</p><small>${escape(entry.mode || '')}${entry.error ? ' · ' + escape(entry.error) : ''}</small><button type="button" data-favorite="${escape(entry.id)}">${(context.favorites || []).includes(entry.id) ? 'Remove favorite' : 'Favorite'}</button></article>`).join('')}</div><button id="remote-context-chat" type="button">Use selection in a new chat</button><pre id="remote-context-result"></pre></section>`;
    $('remote-workspace-select').onchange = event => { current.workspaceId = event.target.value; };
    root.querySelectorAll('[data-context]').forEach(box => box.onchange = () => { current.contextSelection ||= new Set(); box.checked ? current.contextSelection.add(box.dataset.context) : current.contextSelection.delete(box.dataset.context); });
    $('remote-context-refresh').onclick = async () => { try { current.state.context = await command('context.refresh'); render(); } catch (error) { notice(error.message); } };
    $('remote-context-preview').onclick = async () => { try { $('remote-context-result').textContent = text(await command('context.preview', { workspaceId: current.workspaceId || workspaceId, selectedIds: [...(current.contextSelection || [])], includeDefaults: false })); } catch (error) { notice(error.message); } };
    $('remote-context-chat').onclick = () => { chatMode='new'; current.run = null; current.selected = null; current.drafts.delete('new-chat'); const draft = currentDraft('new-chat', { ...current.state.defaults, workspaceId: current.workspaceId || workspaceId, selectedIds: [...(current.contextSelection || [])], includeDefaults: 'false', prompt: '', name: '' }); draft.selectedIds = [...(current.contextSelection || [])]; setView('chats'); render(); };
    root.querySelectorAll('[data-favorite]').forEach(button => button.onclick = async () => { try { await command('context.favorite', { id: button.dataset.favorite, enabled: !(context.favorites || []).includes(button.dataset.favorite), expectedRevision: context.revision }); await refresh(); } catch (error) { notice(error.message); } });
}
$('remote-use-default')?.addEventListener('click',()=>{if(appPreferences.defaultMacId)void connect(appPreferences.defaultMacId);else notice('Choose a Default Mac in Engine Room first.');});
$('remote-host').onchange = event => connect(event.target.value);
$('remote-connect').onclick = () => connect($('remote-host').value);
$('remote-disconnect').onclick = () => { preserveDrafts(); ++switching;stopReconnect();suppressed.add(active);const current=session(),client=current?.client;if(current){current.client=null;current.state=null;current.run=null;}client?.close();writePreferences({ selectedHost:active,autoConnect:false });render(); };
$('remote-revoke').onclick=async()=>{const host=hosts.get(active),current=session();if(!host||current?.client?.status!=='online'){notice('Connect this Mac to revoke access. Offline revocation is not confirmed.');return;}if(!confirm('Revoke this website account’s device access on '+host.label+'? A fresh pairing will be required.'))return;const client=current.client;try{await verifyWebsite();await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{client.removeEventListener('revoked',done);reject(new Error('The Mac did not confirm revocation. Saved pairing was retained.'));},15000);const done=event=>{if(event.detail?.authenticated===true&&event.detail.deviceId===current.host.deviceId){clearTimeout(timeout);client.removeEventListener('revoked',done);resolve();}};client.addEventListener('revoked',done);client.request('connection.revoke',{deviceId:current.host.deviceId}).catch(()=>{});});if(host.source==='account')await accountStore.remove(host);else await legacyStore.remove(host.hostId);clearChatIndex(root.dataset.account,host.hostId);clearChatDrafts(root.dataset.account,host.hostId);hosts.delete(host.hostId);sessions.delete(host.hostId);active='';render();notice('The Mac confirmed revocation and its saved account destination was removed.');}catch(error){notice(error.message);}};
$('remote-forget').onclick = async () => {
    const id=active,host=hosts.get(id);if(!host)return;
    const scope=host.source==='account'?'your account (all browsers)':'this browser only';
    if(!confirm(`Forget ${host.label} from ${scope}? This does not revoke its device key on the Mac.`))return;
    try {
        await verifyWebsite();if(host.source==='account')await accountStore.remove(host);else await legacyStore.remove(id);
        await legacyStore.remove(id).catch(()=>{});const wasActive=active===id;if(wasActive){++switching;stopReconnect();active='';writePreferences({selectedHost:'',autoConnect:false});}const forgotten=sessions.get(id);clearChatIndex(root.dataset.account,id);clearChatDrafts(root.dataset.account,id);sessions.delete(id);hosts.delete(id);forgotten?.client?.close();destinationOptions();render();
    } catch(error){if(error.sessionInvalid)await endAccount();else notice(error.message);}
};
root.querySelectorAll('[data-remote-view]').forEach(button => button.onclick = () => { preserveDrafts();attentionOnly=false;transcriptionOnly=false; if(button.dataset.remoteView==='chats')chatMode='index';setView(button.dataset.remoteView); render(); });
document.addEventListener('click', event => {
    const link = event.target.closest('a[href]'); if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === '_blank') return;
    const url = new URL(link.href); const requested = url.searchParams.get('view');
    if (url.origin === location.origin && url.pathname === location.pathname && sectionNames.includes(requested)) { event.preventDefault(); preserveDrafts();if(requested==='chats'){if(url.searchParams.has('chat')){void openChat(url.searchParams.get('chat'),url.searchParams.get('host')).catch(error=>notice(error.message));return;}if(url.searchParams.has('new')){void newChat();return;}chatMode='index';}attentionOnly=url.searchParams.get('attention')==='1';transcriptionOnly=url.searchParams.get('transcription')==='1'; setView(requested); render(); }
});
window.addEventListener('popstate', () => { const requested = new URLSearchParams(location.search).get('view'); preserveDrafts();if(!consumeFragment())setView(requested);render(); });
$('remote-pair-form').onsubmit = async event => {
    event.preventDefault(); const code = $('remote-pair-code').value; $('remote-pair-code').value = ''; const button = event.target.querySelector('button'); button.disabled = true; notice('');
    try { const capsule = parsePairing(code); if (capsule.relay !== root.dataset.relay) throw new Error('This invitation uses a different relay. Configure the Mac for this website’s relay before pairing.');
        const host = { hostId: capsule.hostId, relay: capsule.relay, inviteKey: capsule.key, label: typeof capsule.label==='string'&&capsule.label.trim()&&capsule.label.length<=80&&!/[\x00-\x1f\x7f]/.test(capsule.label)?capsule.label.trim():'Mac '+capsule.hostId.slice(0,8), cursor: '' };
        await verifyWebsite();let saved;
        const pair = new BrowserRemoteClient(host, { name: 'Proteus website account', onCredential: async record => {saved=await accountStore.saveCredential(record);} });
        pendingPairs.add(pair);
        try { await pair.connect();if(ended||suspended)throw new Error('Sign in again before using the saved destination.');hosts.set(host.hostId,saved);await legacyStore.remove(host.hostId).catch(()=>{});const old=sessions.get(host.hostId);if(old){old.client?.close();sessions.delete(host.hostId);}} finally { pendingPairs.delete(pair);pair.close(); }
        $('remote-pair-panel').open = false;chatMode='index';setView('chats');await connect(host.hostId);
    } catch (error) { notice(error.message); } finally { button.disabled = false; }
};
function consumeFragment() {
    const fragment = new URLSearchParams(location.hash.slice(1)).get('pair');
    if (location.hash) history.replaceState(null, '', location.pathname + '?view=' + view+(attentionOnly&&view==='chats'?'&attention=1':'')+(transcriptionOnly&&view==='schedules'?'&transcription=1':''));
    if (fragment) { $('remote-pair-code').value = fragment; $('remote-pair-panel').open = true;setView('connections');render(); }
    return !!fragment;
}
consumeFragment(); setView(view); window.addEventListener('hashchange', consumeFragment);
async function endAccount() {
    if(ended)return;stopMessageSpeech();ended=true;globalThis.proteusSigningOut=true;clearChatIndex(root.dataset.account);clearChatDrafts(root.dataset.account);++switching;stopReconnect();stopLifecycle();try{localStorage.removeItem(preferenceKey);localStorage.removeItem(chatTabKey);}catch{}
    for(const pair of pendingPairs)pair.close();pendingPairs.clear();for(const current of sessions.values())current.client?.close();sessions.clear();hosts.clear();active='';
    await legacyStore.clear().catch(()=>{});legacyStore.close();render();destinationOptions();notice('Signed out. Sign in again to restore destinations saved to your account. Browser-only pairings were removed.');
}
function stopLifecycle(){clearInterval(sessionTimer);clearInterval(usageTimer);channel?.close();channel=null;}
function startLifecycle(){
    stopLifecycle();channel=new BroadcastChannel('proteus-remote-account');channel.onmessage=event=>{if(event.data?.type==='logout'&&event.data.account===root.dataset.account)void endAccount();};
    sessionTimer=setInterval(()=>{void verifyWebsite().catch(()=>{});},60_000);
    usageTimer=setInterval(()=>{if(!document.hidden)void refreshUsage();},60_000);
}

function bindRevocation(client,hostId,current){client.addEventListener('revoked',event=>{if(event.detail?.authenticated!==true||event.detail.deviceId!==current.host.deviceId)return;suppressed.add(hostId);clearChatIndex(root.dataset.account,hostId);clearChatDrafts(root.dataset.account,hostId);current.cachedRuns=[];current.state=null;current.run=null;if(active===hostId){stopReconnect();notice('This Mac confirmed that its device access was revoked. Pair again to reconnect.');render();}});client.addEventListener('rejected',()=>{suppressed.add(hostId);current.rejected=true;current.state=null;if(active===hostId){notice('Connection rejected. Saved pairing was retained; no authenticated revocation was received.');render();}});}
function aggregateChats(){return [...sessions.entries()].flatMap(([hostId,current])=>(current.state?.runs||current.cachedRuns||[]).map(run=>({...run,hostId,hostLabel:hosts.get(hostId)?.label||'Mac',cached:current.client?.status!=='online',lastSyncAt:current.lastSyncAt}))).sort((a,b)=>Date.parse(b.updatedAt||b.createdAt||0)-Date.parse(a.updatedAt||a.createdAt||0));}
function renderRecentChats(){const target=$('shell-recent-chats');if(!target)return;target.hidden=view!=='chats';target.innerHTML=aggregateChats().slice(0,5).map(run=>`<a href="/remote?view=chats&host=${encodeURIComponent(run.hostId)}&chat=${encodeURIComponent(run.id)}" data-recent-chat="${escape(run.id)}" data-recent-host="${escape(run.hostId)}" title="${escape(run.title||'Chat')} · ${escape(run.hostLabel)}">${run.status==='awaiting_input'?'! ':''}${escape(run.title||'Chat')}${run.cached?' · cached':''}</a>`).join('')+'<a href="/remote?view=chats">More</a>';target.querySelectorAll('[data-recent-chat]').forEach(link=>link.onclick=event=>{event.preventDefault();void openChat(link.dataset.recentChat,link.dataset.recentHost).catch(error=>notice(error.message));});}
function renderChatTabs(){
    for(const tab of chatTabs.values()){const latest=(sessions.get(tab.hostId)?.state?.runs||[]).find(r=>r.id===tab.id);if(latest?.title)tab.title=latest.title;}
    document.dispatchEvent(new CustomEvent('proteus:chat-tabs',{detail:{tabs:[...chatTabs.values()].map(tab=>({...tab,label:hosts.get(tab.hostId)?.label||'Mac'})),active:view==='chats'&&chatMode==='chat'?{hostId:active,id:session()?.selected}:null}}));
}
async function newChat(){
    preserveDrafts();if(!appPreferences.defaultMacId){notice('Choose a Default Mac in Engine Room before starting a new chat.');return;}
    chatMode='new';await connect(appPreferences.defaultMacId);if(session()){session().run=null;session().selected=null;}setView('chats');render();
}
document.addEventListener('proteus:chat-close',event=>{const {hostId,id}=event.detail||{};chatTabs.delete(hostId+':'+id);saveChatTabs();if(hostId===active&&session()?.selected===id){preserveDrafts();stopMessageSpeech();session().run=null;session().selected=null;chatMode='index';}render();});

async function loadMoreChats(){
    try{await verifyWebsite();await Promise.all([...sessions.values()].filter(current=>current.client?.status==='online'&&(current.state?.runs?.length||0)<(current.state?.runCount||0)).map(async current=>{
        const client=current.client,older=await client.request('runs.list',{offset:current.state.runs.length});
        if(ended||suspended||current.client!==client)return;
        current.state.runs=[...new Map([...current.state.runs,...older].map(run=>[run.id,run])).values()];current.cachedRuns=current.state.runs;
        await saveChatIndex(root.dataset.account,current.host,current.cachedRuns).catch(()=>{});
    }));render();}catch(error){notice(error.message);}
}
async function refreshAggregate(force=false){
    await Promise.allSettled([...hosts.values()].map(async metadata=>{
        if(readPreferences().autoConnect===false&&metadata.hostId===appPreferences.defaultMacId)return;let current=sessions.get(metadata.hostId);if(current?.client?.status==='online'){if(force){await verifyWebsite();const client=current.client,result=await client.request('sync',{cursor:''});if(ended||suspended||current.client!==client)return;current.state=result.state;rememberHostName(current,result.state);current.cachedRuns=result.state.runs||[];current.lastSyncAt=new Date().toISOString();}return;}
        const credential=metadata.source==='account'?await accountStore.credential(metadata.hostId):metadata;
        if(ended||suspended)return;
        const client=new BrowserRemoteClient(credential);current={host:credential,client,drafts:new Map(),selected:null,run:null,state:null};sessions.set(metadata.hostId,current);current.drafts=await loadChatDrafts(root.dataset.account,credential);const cached=await loadChatIndex(root.dataset.account,credential);if(cached){current.cachedRuns=cached.items;current.lastSyncAt=cached.observedAt;}bindRevocation(client,metadata.hostId,current);client.addEventListener('status',()=>{if(client.status==='closed'){current.state=null;if(active===metadata.hostId){render();reconnect(metadata.hostId);}}});
        client.addEventListener('change',event=>{if(ended||suspended||current.client!==client)return;if(event.detail.event==='state'){current.state=event.detail.data;rememberHostName(current,event.detail.data);current.cachedRuns=event.detail.data.runs||[];current.lastSyncAt=new Date().toISOString();void saveChatIndex(root.dataset.account,current.host,current.cachedRuns).catch(()=>{});renderRecentChats();if(active===metadata.hostId){preserveDrafts();render();}}if(event.detail.event==='run'&&event.detail.runId===current.selected){current.run=event.detail.data;if(active===metadata.hostId){preserveDrafts();render();}}});
        try{await client.connect();await verifyWebsite();const result=await client.request('sync',{cursor:''});current.state=result.state;rememberHostName(current,result.state);current.cachedRuns=result.state.runs||[];current.lastSyncAt=new Date().toISOString();await saveChatIndex(root.dataset.account,current.host,current.cachedRuns).catch(()=>{});current.host.cursor=result.cursor;}catch{client.close();current.client=null;current.state=null;}
    }));
}

let draftSave=Promise.resolve();
function persistCurrentDrafts(){preserveDrafts();const current=session();if(!current?.host?.key)return Promise.resolve();const snapshot=new Map(structuredClone([...current.drafts]));draftSave=draftSave.catch(()=>{}).then(()=>saveChatDrafts(root.dataset.account,current.host,snapshot));return draftSave;}
root.addEventListener('input',event=>{if(event.target.closest('form[data-draft]'))void persistCurrentDrafts().catch(error=>notice(error.message));});
document.addEventListener('click',event=>{const link=event.target.closest('a[href]');if(!link||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||link.target==='_blank')return;const url=new URL(link.href);if(url.origin===location.origin&&url.pathname!==location.pathname){event.preventDefault();void persistCurrentDrafts().then(()=>location.assign(url.href)).catch(error=>notice(error.message));}});
async function startup(){
    if(ended)return;suspended=false;startLifecycle();
    try {
        const account=await accountStore.list();if(ended||suspended)return;
        let legacy=[];try{legacy=await legacyStore.list();}catch{}
        if(ended||suspended)return;
        hosts.clear();for(const host of legacy)hosts.set(host.hostId,{...host,source:'legacy'});for(const host of account)hosts.set(host.hostId,host);
        try{const tabs=JSON.parse(localStorage.getItem(chatTabKey)||'[]');for(const tab of Array.isArray(tabs)?tabs.slice(0,32):[]){if(hosts.has(tab.hostId)&&typeof tab.id==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(tab.id))chatTabs.set(tab.hostId+':'+tab.id,{hostId:tab.hostId,id:tab.id,title:'Chat'});}}catch{}
        destinationOptions();if(!hosts.size)$('remote-pair-panel').open=true;
        try{appPreferences=(await appRequest()).preferences;}catch{notice('Account preferences unavailable. Explicitly choose a Mac to continue.');}
        await refreshAggregate();
        const prefs=readPreferences(),selected=hosts.has(appPreferences.defaultMacId)?appPreferences.defaultMacId:null;
        if(selected){active=selected;destinationOptions();if(prefs.autoConnect===false){suppressed.add(selected);render();}else await connect(selected,{automatic:true});}else render();
        if(initialQuery.has('new'))await newChat();
        const deep=initialQuery;if(deep.get('chat')&&hosts.has(deep.get('host')))await openChat(deep.get('chat'),deep.get('host'));
    }catch(error){if(error.sessionInvalid)await endAccount();else{pauseUnverified();notice(error.message+' Reload to try again.');}}
}
window.addEventListener('pagehide',()=>{suspended=true;++switching;stopReconnect();stopLifecycle();for(const pair of pendingPairs)pair.close();pendingPairs.clear();for(const current of sessions.values())current.client?.close();sessions.clear();hosts.clear();active='';legacyStore.close();render();});
window.addEventListener('pageshow',event=>{if(event.persisted&&!ended)void startup();});
await startup();
