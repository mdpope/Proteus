import { mount as mountMarkdown } from '../../../src/markdown-renderer.js';
import { PairingStore, AccountPairingStore, BrowserRemoteClient, parsePairing } from './remote-client.js';
import { usagePanel } from './remote-usage.js';
const root = document.querySelector('#remote-workspace');
const legacyStore = new PairingStore(root.dataset.account);
const accountStore = new AccountPairingStore(root.dataset.account,{sessionURL:root.dataset.sessionUrl});
let ended=false, suspended=false, reconnectTimer=null, reconnectAttempt=0, verifying=null, channel, sessionTimer, usageTimer;
const suppressed=new Set(),pendingPairs=new Set();
const hosts = new Map();
const sessions = new Map();
const sectionNames = ['chats', 'schedules', 'workspaces'];
const initialView = new URLSearchParams(location.search).get('view');
let active = '', view = sectionNames.includes(initialView) ? initialView : 'chats', switching = 0;
const preferenceKey = 'proteus-remote-ui:' + root.dataset.account;
const readPreferences = () => { try { return JSON.parse(localStorage.getItem(preferenceKey)) || {}; } catch { return {}; } };
const writePreferences = changes => { try { localStorage.setItem(preferenceKey, JSON.stringify({ ...readPreferences(), ...changes })); } catch {} };
function setView(value) {
    view = sectionNames.includes(value) ? value : 'chats';
    history.replaceState(null, '', location.pathname + '?view=' + view);
    document.dispatchEvent(new CustomEvent('proteus:section', { detail: { key: view } }));
}
const $ = id => document.getElementById(id);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const text = value => typeof value === 'string' ? value : JSON.stringify(value, null, 2);
const options = (list, selected, label = value => value.name || value.id) => list.map(item => `<option value="${escape(item.id)}" ${item.id === selected ? 'selected' : ''}>${escape(label(item))}</option>`).join('');
const field = (name, label, value = '', type = 'text') => `<label>${escape(label)}${type === 'textarea' ? `<textarea name="${escape(name)}" rows="4">${escape(value)}</textarea>` : `<input name="${escape(name)}" type="${type}" value="${escape(value)}">`}</label>`;
const notice = message => { $('remote-notice').textContent = message; $('remote-notice').hidden = !message; };
const session = () => sessions.get(active);
function destinationOptions() {
    $('remote-forget').textContent=hosts.get(active)?.source==='account'?'Forget from account':'Forget from this browser';
    $('remote-host').innerHTML = '<option value="">Choose a paired Mac</option>' + [...hosts.values()].map(host => `<option value="${escape(host.hostId)}" ${host.hostId === active ? 'selected' : ''}>${escape(host.label)}${host.source==='legacy'?' · browser only':''} · ${sessions.get(host.hostId)?.client?.status === 'online' ? 'Connected' : 'Offline'}</option>`).join('');
    $('remote-status').textContent = active ? `${hosts.get(active)?.label || 'Mac'} · ${session()?.client?.status === 'online' ? 'Connected' : 'Offline'}` : 'Choose a destination';
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
    if (target !== active) return; current.state = result.state; current.host.cursor = result.cursor; if(current.host.source==='legacy')await legacyStore.save(current.host); render();
}
function preserveDrafts() {
    const current = session(); if (!current) return;
    for (const form of root.querySelectorAll('form[data-draft]')) { const old = current.drafts.get(form.dataset.draft) || {}; current.drafts.set(form.dataset.draft, { ...old, values: { ...old.values, ...Object.fromEntries(new FormData(form)) } }); }
}
function currentDraft(key, initial) { const current = session(); if (!current.drafts.has(key)) current.drafts.set(key, { values: initial, id: crypto.randomUUID(), issuedAt: new Date().toISOString() }); return current.drafts.get(key); }
function bindDraft(formId, key, method, args, after) {
    const form = $(formId); if (!form) return;
    form.addEventListener('input', () => { const draft = session().drafts.get(key); draft.values = { ...draft.values, ...Object.fromEntries(new FormData(form)) }; delete draft.sentAt; draft.id = crypto.randomUUID(); draft.issuedAt = new Date().toISOString(); });
    form.addEventListener('submit', async event => {
        event.preventDefault(); const current = session(), draft = current.drafts.get(key); const button = form.querySelector('button[type="submit"]'); button.disabled = true; notice('');
        try { const result = await command(method, args(Object.fromEntries(new FormData(form)), draft), { id: draft.id, issuedAt: draft.sentAt ||= new Date().toISOString() }); current.drafts.delete(key); form.removeAttribute('data-draft'); await after?.(result); await refresh(); }
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
    preserveDrafts(); const generation = ++switching;const previous=session();if(previous?.client){const old=previous.client;previous.client=null;old.close();} active = hosts.has(hostId) ? hostId : ''; writePreferences({ selectedHost: active, autoConnect:true }); notice(''); destinationOptions();
    if (!active) { render(); return; }
    const metadata = hosts.get(hostId); if (!metadata) return;
    let current = sessions.get(hostId); if (!current) { current = { host:metadata, drafts: new Map(), selected: null, run: null, state: null }; sessions.set(hostId, current); }
    current.run = null; current.selected = null;current.state=null; render();
    try {
        await verifyWebsite();
        const host=metadata.source==='account'?await accountStore.credential(hostId):metadata;
        if(generation!==switching||ended||suspended)return;
        if(host.relay!==root.dataset.relay)throw new Error('This saved destination uses a different relay. Pair it again for this website.');
        if(current.host.deviceId!==host.deviceId){current.drafts.clear();current.images?.clear();host.cursor='';}else host.cursor=current.host.cursor||'';
        current.host=host;hosts.set(hostId,{...metadata,deviceId:host.deviceId,label:host.label,relay:host.relay,pairedAt:host.pairedAt});
        const client = current.client = new BrowserRemoteClient(host);
        const relevant=()=>active===hostId&&current.client===client&&generation===switching&&!ended&&!suspended;
        client.addEventListener('status', () => { if (relevant()) { destinationOptions(); if (client.status === 'closed') { preserveDrafts();current.state=null;current.run=null;render();reconnect(hostId); } } });
        client.addEventListener('failure', event => { if (relevant()) notice(event.detail); });
        // Routing packets are not authenticated revocation proofs. Keep account credentials intact.
        client.addEventListener('revoked', () => { if(!relevant())return;suppressed.add(hostId);stopReconnect();preserveDrafts();current.state=null;current.run=null;notice('This Mac rejected the connection. Retry or create a fresh pairing; the saved account destination was retained.'); });
        client.addEventListener('change', event => { if (!relevant()) return; const change = event.detail; current.host.cursor = change.cursor; if (change.event === 'state') current.state = change.data; if (change.event === 'run' && change.runId === current.selected) current.run = change.data; preserveDrafts(); render(); });
        await client.connect(); if (!relevant()) { client.close(); return; } await refresh();reconnectAttempt=0;void refreshUsage();
    } catch (error) { if(generation!==switching)return;if(error.sessionInvalid){await endAccount();return;}notice(error.message);render();if(![409,404].includes(error.status))reconnect(hostId); }
}
function renderUsage() {
    const element = $('web-provider-usage'); if (!element) return;
    const current = session();
    const visible = current?.client?.status === 'online' && current.state?.appearance?.showProviderUsage !== false;
    element.hidden = !visible;
    if (!visible) { element.innerHTML = ''; delete element.dataset.signature; return; }
    const collapsed = readPreferences().collapsed?.[active] ?? current.state?.appearance?.providerUsageCollapsed ?? false;
    const value = current.state?.providerUsage || { providers: {} };
    const markup = usagePanel(value, { collapsed, destination: current.host.label, error: current.usageError, loading: current.usageLoading });
    if (element.dataset.signature === markup) return;
    const opened = new Set([...element.querySelectorAll('details[open]')].map(details => details.dataset.provider));
    element.innerHTML = markup; element.dataset.signature = markup;
    for (const details of element.querySelectorAll('details')) details.open = opened.has(details.dataset.provider);
    element.querySelector('[data-usage-collapse]').onclick = () => { writePreferences({ collapsed: { ...readPreferences().collapsed, [active]: !collapsed } }); renderUsage(); };
    element.querySelector('[data-usage-refresh]')?.addEventListener('click', () => void refreshUsage(true));
}
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
    const current = session(), online = current?.client?.status === 'online'; destinationOptions(); renderUsage();
    root.querySelectorAll('[data-remote-view]').forEach(button => button.classList.toggle('active', button.dataset.remoteView === view));
    if (!current?.state || !online) { $('remote-content').innerHTML = `<section class="card"><h2>${active ? 'Connect ' + escape(hosts.get(active)?.label) : 'Choose a paired Mac'}</h2><p>${active ? 'Remote content is hidden while disconnected. The selected Mac reconnects automatically unless you disconnect it. Use Connect to retry now.' : 'Use a fresh pairing code from each Mac. Personal and Example Organization destinations keep separate keys, drafts and event cursors.'}</p></section>`; return; }
    if (view === 'chats') renderChats(current); else if (view === 'schedules') renderSchedules(current); else renderWorkspaces(current);
    if (focus) { const field = document.getElementById(focus.form)?.elements.namedItem(focus.name); if (field) { field.focus({ preventScroll: true }); if (typeof focus.start === 'number' && field.setSelectionRange) { try { field.setSelectionRange(focus.start, focus.end); } catch {} } } }
}
function bindCatalog(formId, key) {
    const form = $(formId);
    for (const select of form.querySelectorAll('select[name="provider"],select[name="model"]')) select.addEventListener('change', async () => { preserveDrafts(); const draft = session().drafts.get(key); if (select.name === 'provider') { draft.values.model = ''; draft.values.reasoningEffort = ''; draft.values.contextTier = ''; draft.values.serviceTier = ''; try { const status = await command('provider.status', { provider: select.value }); session().state.providerStatuses ||= {}; session().state.providerStatuses[select.value] = status; } catch (error) { notice(error.message); } } render(); });
}
async function openChat(id) { preserveDrafts(); const current = session(); current.selected = id;setView('chats'); current.run = await command('chat.get', { id }); render(); }
function renderChats(current) {
    const runs = current.state.runs || []; const run = current.run; const key = run ? 'reply:' + run.id : 'new-chat'; const draft = currentDraft(key, run ? { prompt: '', mode: 'queue' } : { ...current.state.defaults, name: '', prompt: '', workspaceId: current.state.context.defaultWorkspaceId, includeDefaults: 'true' }); const values = draft.values;
    const pending = run?.pending; const answerKey=pending?'answer:'+run.id+':'+pending.id:null;const answerDraft=pending&&pending.type!=='permission'?currentDraft(answerKey,{answer:''}):null; const waiting = pending ? `<section class="remote-pending"><h3>${pending.type === 'permission' ? 'Approval needed on ' + escape(current.host.label) : 'Input requested'}</h3><pre>${escape(pending.question || text(pending.details || pending))}</pre>${pending.type === 'permission' ? '<button data-answer="approve" type="button">Approve once</button><button data-answer="deny" type="button">Deny</button>' : `<form id="remote-answer" data-draft="${escape(answerKey)}"><label>Your answer<textarea name="answer" required rows="3">${escape(answerDraft?.values.answer||'')}</textarea></label><button type="submit">Send answer</button></form>`}</section>` : '';
    const history = run ? `<header class="remote-chat-title"><h2>${escape(run.title || run.schedule?.name || 'Chat')}</h2><span>${escape(run.status)}</span></header><div class="remote-messages">${run.earlier ? '<button id="remote-earlier" type="button">Load earlier messages</button>' : ''}${(run.events || []).map((event, eventIndex) => `<article class="remote-message ${escape(event.role || event.type)}"><div class="eyebrow">${escape(event.role || event.type)}</div><div data-markdown-event="${eventIndex}"></div>${event.data?.tool ? `<details><summary>${escape(event.data.tool.summary || event.data.tool.name || 'Tool details')}</summary><pre>${escape(text(event.data.tool))}</pre></details>` : ''}</article>`).join('')}${Object.values(run.liveMessages || {}).map(message => `<article class="remote-message assistant"><div class="eyebrow">Responding</div><pre>${escape(message)}</pre></article>`).join('')}</div>${waiting}${run.queuedMessages?.length ? `<section class="card"><h3>Queued messages</h3>${run.queuedMessages.map(message => `<p>${escape(message.prompt || message.text)} <button data-unqueue="${escape(message.id)}" type="button">Remove</button></p>`).join('')}</section>` : ''}` : '<h2>Start a conversation</h2>';
    $('remote-content').innerHTML = `<div class="remote-chat-layout"><aside class="card"><button id="remote-new" type="button">New chat</button><div class="remote-run-list">${runs.map(r => `<button type="button" data-run="${escape(r.id)}" ${r.id === current.selected ? 'class="active"' : ''}><strong>${escape(r.title || 'Chat')}</strong><small>${escape(r.status)}</small></button>`).join('') || '<p>No chats on this Mac yet.</p>'}</div>${runs.length < (current.state.runCount || 0) ? '<button id="remote-more-runs" type="button">More chats</button>' : ''}</aside><section class="card remote-chat-main">${history}<form id="remote-composer" data-draft="${escape(key)}">${run ? `<label>Send mode<select name="mode"><option value="queue" ${values.mode === 'queue' ? 'selected' : ''}>Queue next turn</option><option value="steer" ${values.mode === 'steer' ? 'selected' : ''}>Steer current turn</option></select></label>` : `<div class="remote-fields">${field('name', 'Chat title', values.name)}${contextFields(values)}${modelFields(values)}</div>`}${field('prompt', run ? 'Follow-up message' : 'Message', values.prompt, 'textarea')}<button type="submit" class="primary">${run ? 'Send to ' : 'Start on '}${escape(current.host.label)}</button>${run && ['running', 'awaiting_input', 'queued'].includes(run.status) ? '<button id="remote-cancel" type="button">Cancel run</button>' : ''}</form></section></div>`;
    bindDraft('remote-composer', key, run ? (['running', 'awaiting_input'].includes(run.status) ? 'chat.send' : 'chat.resume') : 'chat.start', (input, retained) => { if (!input.prompt?.trim()) throw new Error('Enter a message.'); if (run) return { id: run.id, prompt: input.prompt, mode: input.mode, messageId: retained.id }; return { ...input, selectedIds: retained.selectedIds || [], includeDefaults: input.includeDefaults !== 'false' }; }, async result => { if (result.runId) await openChat(result.runId); });
    if (!run) bindCatalog('remote-composer', key);
    for (const element of root.querySelectorAll('[data-markdown-event]')) { const event = run.events[Number(element.dataset.markdownEvent)]; current.images ||= new Map(); mountMarkdown(element, event?.text || '', { copy: value => navigator.clipboard.writeText(value), link: url => { if (/^https?:\/\//i.test(url)) window.open(url, '_blank', 'noopener,noreferrer'); else notice('Open local file links on the paired Mac.'); }, image: async source => { const key = run.id + ':' + source; if (!current.images.has(key)) current.images.set(key, command('chat.image', { id: run.id, source }).then(r => r.dataURL).catch(error => { current.images.delete(key); throw error; })); return current.images.get(key); } }); }
    $('remote-new').onclick = () => { preserveDrafts(); current.run = null; current.selected = null; render(); };
    root.querySelectorAll('[data-run]').forEach(button => button.onclick = () => openChat(button.dataset.run).catch(error => notice(error.message)));
    $('remote-more-runs')?.addEventListener('click', async () => { try { const older = await command('runs.list', { offset: runs.length }); current.state.runs.push(...older); preserveDrafts(); render(); } catch (error) { notice(error.message); } });
    $('remote-earlier')?.addEventListener('click', async () => { try { const older = await command('chat.get', { id: run.id, offset: run.eventCount - run.eventStart }); current.run = { ...run, events: [...older.events, ...run.events], eventStart: older.eventStart, earlier: older.earlier }; preserveDrafts(); render(); } catch (error) { notice(error.message); } });
    const answer = async value => { try { await command('chat.reply', { id: run.id, requestId: pending.id, answer: value });current.drafts.delete(answerKey);if(view==='chats'&&current.selected===run.id)await openChat(run.id);else await refresh(); } catch (error) { notice(error.message); } };
    root.querySelectorAll('[data-answer]').forEach(button => button.onclick = () => answer(button.dataset.answer));
    $('remote-answer')?.addEventListener('input',event=>{answerDraft.values.answer=new FormData(event.currentTarget).get('answer');});
    $('remote-answer')?.addEventListener('submit', event => { event.preventDefault(); answer(new FormData(event.target).get('answer')); });
    $('remote-cancel')?.addEventListener('click', async () => { try { await command('chat.cancel', { id: run.id }); await openChat(run.id); } catch (error) { notice(error.message); } });
    root.querySelectorAll('[data-unqueue]').forEach(button => button.onclick = async () => { try { await command('chat.remove-queued', { id: run.id, messageId: button.dataset.unqueue }); await openChat(run.id); } catch (error) { notice(error.message); } });
}
function renderSchedules(current) {
    const schedule = (current.state.schedules || []).find(s => s.id === current.scheduleId); const key = schedule ? 'schedule:' + schedule.id : null; const draft = schedule ? currentDraft(key, { ...schedule, enabled: String(schedule.enabled), expectedRevision: schedule.revision }) : null;
    $('remote-content').innerHTML = `<div class="remote-chat-layout"><aside class="card"><h2>Schedules</h2>${current.state.schedules.map(s => `<button class="remote-schedule-item" type="button" data-schedule="${escape(s.id)}"><strong>${escape(s.name)}</strong><small>${s.enabled ? 'Enabled' : 'Disabled'} · ${escape(s.cron)}</small></button>`).join('') || '<p>No schedules configured on this Mac.</p>'}</aside><section class="card">${schedule ? `<h2>${escape(schedule.name)}</h2>${schedule.source?.manifest || schedule.provider === 'local-process' ? '<p>This schedule is owned by its source repository. Update that source on the Mac.</p>' : `<form id="remote-schedule-form" data-draft="${escape(key)}"><div class="remote-fields">${field('name', 'Name', draft.values.name)}<label>Status<select name="enabled"><option value="false" ${draft.values.enabled === 'false' ? 'selected' : ''}>Disabled</option><option value="true" ${draft.values.enabled === 'true' ? 'selected' : ''}>Enabled</option></select></label>${field('cron', 'Cron expression', draft.values.cron)}${field('timezone', 'Time zone', draft.values.timezone)}${modelFields(draft.values)}</div>${field('prompt', 'Instructions', draft.values.prompt, 'textarea')}<button type="button" id="remote-preview">Preview timing</button><button class="primary" type="submit">Save schedule</button><pre id="remote-timing"></pre></form>`}<button id="remote-run-schedule" type="button">Run once on ${escape(current.host.label)}</button><p>${escape(schedule.nextRuns?.join('\n') || '')}</p>` : '<h2>Choose a schedule</h2><p>Edits use the current Mac revision. Repository-owned schedules remain controlled by their source.</p>'}</section></div>`;
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
    $('remote-context-chat').onclick = () => { current.run = null; current.selected = null; current.drafts.delete('new-chat'); const draft = currentDraft('new-chat', { ...current.state.defaults, workspaceId: current.workspaceId || workspaceId, selectedIds: [...(current.contextSelection || [])], includeDefaults: 'false', prompt: '', name: '' }); draft.selectedIds = [...(current.contextSelection || [])]; setView('chats'); render(); };
    root.querySelectorAll('[data-favorite]').forEach(button => button.onclick = async () => { try { await command('context.favorite', { id: button.dataset.favorite, enabled: !(context.favorites || []).includes(button.dataset.favorite), expectedRevision: context.revision }); await refresh(); } catch (error) { notice(error.message); } });
}
$('remote-host').onchange = event => connect(event.target.value);
$('remote-connect').onclick = () => connect($('remote-host').value);
$('remote-disconnect').onclick = () => { preserveDrafts(); ++switching;stopReconnect();suppressed.add(active);const current=session(),client=current?.client;if(current){current.client=null;current.state=null;current.run=null;}client?.close();writePreferences({ selectedHost:active,autoConnect:false });render(); };
$('remote-forget').onclick = async () => {
    const id=active,host=hosts.get(id);if(!host)return;
    const scope=host.source==='account'?'your account (all browsers)':'this browser only';
    if(!confirm(`Forget ${host.label} from ${scope}? This does not revoke its device key on the Mac.`))return;
    try {
        await verifyWebsite();if(host.source==='account')await accountStore.remove(host);else await legacyStore.remove(id);
        await legacyStore.remove(id).catch(()=>{});const wasActive=active===id;if(wasActive){++switching;stopReconnect();active='';writePreferences({selectedHost:'',autoConnect:false});}const forgotten=sessions.get(id);sessions.delete(id);hosts.delete(id);forgotten?.client?.close();destinationOptions();render();
    } catch(error){if(error.sessionInvalid)await endAccount();else notice(error.message);}
};
root.querySelectorAll('[data-remote-view]').forEach(button => button.onclick = () => { preserveDrafts(); setView(button.dataset.remoteView); render(); });
document.addEventListener('click', event => {
    const link = event.target.closest('a[href]'); if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === '_blank') return;
    const url = new URL(link.href); const requested = url.searchParams.get('view');
    if (url.origin === location.origin && url.pathname === location.pathname && sectionNames.includes(requested)) { event.preventDefault(); preserveDrafts(); setView(requested); render(); }
});
window.addEventListener('popstate', () => { const requested = new URLSearchParams(location.search).get('view'); preserveDrafts(); consumeFragment(); setView(requested); render(); });
$('remote-pair-form').onsubmit = async event => {
    event.preventDefault(); const code = $('remote-pair-code').value; $('remote-pair-code').value = ''; const button = event.target.querySelector('button'); button.disabled = true; notice('');
    try { const capsule = parsePairing(code); if (capsule.relay !== root.dataset.relay) throw new Error('This invitation uses a different relay. Configure the Mac for this website’s relay before pairing.');
        const host = { hostId: capsule.hostId, relay: capsule.relay, inviteKey: capsule.key, label: $('remote-label').value, cursor: '' };
        await verifyWebsite();let saved;
        const pair = new BrowserRemoteClient(host, { name: host.label + ' · website account', onCredential: async record => {saved=await accountStore.saveCredential(record);} });
        pendingPairs.add(pair);
        try { await pair.connect();if(ended||suspended)throw new Error('Sign in again before using the saved destination.');hosts.set(host.hostId,saved);await legacyStore.remove(host.hostId).catch(()=>{});const old=sessions.get(host.hostId);if(old){old.client?.close();sessions.delete(host.hostId);}} finally { pendingPairs.delete(pair);pair.close(); }
        $('remote-pair-panel').open = false; await connect(host.hostId);
    } catch (error) { notice(error.message); } finally { button.disabled = false; }
};
function consumeFragment() {
    const fragment = new URLSearchParams(location.hash.slice(1)).get('pair');
    if (location.hash) history.replaceState(null, '', location.pathname + '?view=' + view);
    if (fragment) { $('remote-pair-code').value = fragment; $('remote-pair-panel').open = true; }
}
consumeFragment(); setView(view); window.addEventListener('hashchange', consumeFragment);
async function endAccount() {
    if(ended)return;ended=true;++switching;stopReconnect();stopLifecycle();try{localStorage.removeItem(preferenceKey);}catch{}
    for(const pair of pendingPairs)pair.close();pendingPairs.clear();for(const current of sessions.values())current.client?.close();sessions.clear();hosts.clear();active='';
    await legacyStore.clear().catch(()=>{});legacyStore.close();render();destinationOptions();notice('Signed out. Sign in again to restore destinations saved to your account. Browser-only pairings were removed.');
}
function stopLifecycle(){clearInterval(sessionTimer);clearInterval(usageTimer);channel?.close();channel=null;}
function startLifecycle(){
    stopLifecycle();channel=new BroadcastChannel('proteus-remote-account');channel.onmessage=event=>{if(event.data?.type==='logout'&&event.data.account===root.dataset.account)void endAccount();};
    sessionTimer=setInterval(()=>{void verifyWebsite().catch(()=>{});},60_000);
    usageTimer=setInterval(()=>{if(!document.hidden)void refreshUsage();},60_000);
}
async function startup(){
    if(ended)return;suspended=false;startLifecycle();
    try {
        const account=await accountStore.list();if(ended||suspended)return;
        let legacy=[];try{legacy=await legacyStore.list();}catch{}
        if(ended||suspended)return;
        hosts.clear();for(const host of legacy)hosts.set(host.hostId,{...host,source:'legacy'});for(const host of account)hosts.set(host.hostId,host);
        destinationOptions();if(!hosts.size)$('remote-pair-panel').open=true;
        const prefs=readPreferences(),selected=hosts.has(prefs.selectedHost)?prefs.selectedHost:(account[0]?.hostId||hosts.keys().next().value);
        if(selected){active=selected;destinationOptions();if(prefs.autoConnect===false){suppressed.add(selected);render();}else await connect(selected,{automatic:true});}else render();
    }catch(error){if(error.sessionInvalid)await endAccount();else{pauseUnverified();notice(error.message+' Reload to try again.');}}
}
window.addEventListener('pagehide',()=>{suspended=true;++switching;stopReconnect();stopLifecycle();for(const pair of pendingPairs)pair.close();pendingPairs.clear();for(const current of sessions.values())current.client?.close();sessions.clear();hosts.clear();active='';legacyStore.close();render();});
window.addEventListener('pageshow',event=>{if(event.persisted&&!ended)void startup();});
await startup();
