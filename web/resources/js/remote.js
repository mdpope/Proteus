import {moveMenuMarkup,projectMoveGroups} from '../../../public/shared/navigation/move-menu.js';
import {modelControlVisible,optionsForModelChange} from '../../../public/features/chats/model-choices.js';
import {mountQuestionAttachments} from '../../../public/features/chats/question-attachments.js';
import {openStoredAttachment,readRemoteAttachment} from '../../../public/features/chats/chat-attachments.js';
import {chatQuestions,mountQuestionCard,mountQuestionQueue} from '../../../public/features/chats/user-questions.js';
import {recentItemMarkup} from './navigation-icons.js';
import {bindWebChatPermissions} from './chat-permissions.js';
import {chatLink} from '../../../public/features/chats/chat-links.js';
import {mountChatRecovery} from '../../../public/features/chats/chat-recovery-controls.js';
import {recoverRemoteChat} from '../../../public/services/remote/remote-chat-recovery.js';
import {bindAllowancePreference} from '../../../public/features/chats/allowance-controls.js';
import {mountProviderActivity} from '../../../public/features/chats/provider-activity-view.js';
import {activityNote} from '../../../public/features/chats/activity-notes.js';
import {authenticatedComputerMetadata,computerDescription} from '../../../public/services/remote/computer-identity.js';
import {observeRunningChats} from './running-chats.js';
import {createWebWorkspaces} from './workspaces.js';
import {refreshChatPreviews,isLoopbackPreview,verifyPreview} from '../../../public/features/chats/chat-previews.js';
import {createToast} from '../../../public/shared/ui/toast.js';
import {mountLiveBrowser} from '../../../public/features/browser/live-browser.js';
import '../../../public/live-browser.css';
import {bindRuntimeTimer,formatDuration,turnDuration,runtimeTotal,toolDuration,groupDuration} from '../../../public/features/chats/runtime.js';
import { mergeChatHistory, chatHistoryWindowStart } from '../../../public/features/chats/chat-history.js';
import { toolPresentation, normalizedTool, activitySummary, isActivityEvent, permissionToolCallId, toolEventTime } from '../../../public/features/chats/tool-presentation.js';
import {chatType} from '../../../public/features/chats/chat-types.js';
import {internetProviders,providerLabel} from '../../../public/features/settings/internet-search.js';
import {renderChatIndex,chatIndexShowsArchived,selectChatType,selectedChatType} from './chats-index.js';
import {saveChatIndex,loadChatIndex,clearChatIndex,saveChatDrafts,loadChatDrafts,clearChatDrafts} from './remote-cache.js';
import {appRequest,dateTime,recordBrowserVisit} from './shared-app.js';
import { mount as mountMarkdown } from '../../../src/shared/markdown-renderer.js';
import { PairingStore, AccountPairingStore, BrowserDestinationStore, BrowserRemoteClient, parsePairing } from './remote-client.js';
import { usagePanel } from './remote-usage.js';
import { mountMessageActions, setMessageActionsContext, stopMessageSpeech } from '../../../public/features/chats/message-actions.js';
import { openContextMenu } from './context-menu.js';
const root = document.querySelector('#remote-workspace');
const updateSubtabFade=strip=>{if(!strip)return;strip.classList.toggle('fade-left',strip.scrollLeft>2);strip.classList.toggle('fade-right',strip.scrollLeft+strip.clientWidth<strip.scrollWidth-2);};
window.addEventListener('resize',()=>updateSubtabFade(root.querySelector('.remote-inner-scroll')));
const legacyStore = new PairingStore(root.dataset.account);
const accountStore = new AccountPairingStore(root.dataset.account,{sessionURL:root.dataset.sessionUrl});
const destinationStore=new BrowserDestinationStore(root.dataset.account,{accountStore,legacyStore});
let ended=false, suspended=false, reconnectTimer=null, reconnectAttempt=0, verifying=null, channel, sessionTimer, usageTimer;
const suppressed=new Set(),pendingPairs=new Set();
const hosts = new Map();
const sessions = new Map();
const chatTabs = new Map();
const reviewedChats=new Map();
function currentChatStatus(hostId,run){const key=hostId+':'+run.id,reviewed=reviewedChats.get(key);if(!reviewed)return run;if(run.failureEventAt&&reviewed.failureEventAt&&run.failureEventAt!==reviewed.failureEventAt&&Date.parse(run.failureEventAt)>Date.parse(reviewed.failureEventAt)){reviewedChats.delete(key);return run;}return ['failed','interrupted'].includes(run.status)&&(Date.parse(run.updatedAt||0)<=Date.parse(reviewed.updatedAt||0)||(run.failureEventAt&&run.failureEventAt===reviewed.failureEventAt))?{...run,attentionRequired:reviewed.attentionRequired,failureReviewedAt:reviewed.failureReviewedAt}:run;}
let appPreferences = {defaultMacId:null,timezone:'UTC'};
const sectionNames = ['chats', 'schedules', 'workspaces', 'connections'];
const initialQuery=new URLSearchParams(location.search);
const initialView = initialQuery.get('view');
let attentionPanel='chats';
let attentionOnly=initialQuery.get('attention')==='1',transcriptionOnly=initialQuery.get('transcription')==='1';
let chatMode=initialQuery.has('new')?'new':'index';
let newInternet=initialQuery.get('type')==='internet';
selectChatType(newInternet?'internet':'user');
let active = '', view = sectionNames.includes(initialView) ? initialView : 'chats', switching = 0;
const chatTabKey='proteus.chat-tabs.v1.'+root.dataset.account;
const childTabKey='proteus.chat-child-tabs.v1.'+root.dataset.account;
const chatTabTitle=value=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,' ').replace(/\s+/g,' ').trim().slice(0,120)||'Chat':'Chat';
let savedChildTabs={};try{savedChildTabs=JSON.parse(localStorage.getItem(childTabKey)||'{}');}catch{}
function saveChildTabs(current,chatId){
    const key=current.host.hostId+':'+chatId,tabs=current.childOrder?.get(chatId)||[];
    savedChildTabs[key]={tabs:tabs.map(item=>item.type==='browser'?{type:'browser'}:{type:'document',documentId:item.documentId,title:String(item.title||'Document').slice(0,120),version:String(item.version||''),mediaType:item.mediaType==='text/html'?'text/html':'text/markdown',source:['local','preview'].includes(item.source)?item.source:'remote',...(item.parentDocumentId&&item.relativePath?{parentDocumentId:item.parentDocumentId,relativePath:item.relativePath}:{})}),active:current.activeChatPanel||'conversation'};
    try{localStorage.setItem(childTabKey,JSON.stringify(savedChildTabs));}catch{}
}
function restoreChildTabs(current,chatId){
    if(current.restoredChildChats?.has(chatId))return;current.restoredChildChats ||= new Set();current.restoredChildChats.add(chatId);
    const saved=savedChildTabs[current.host.hostId+':'+chatId],tabs=Array.isArray(saved?.tabs)?saved.tabs.slice(0,24):[];
    current.childOrder ||= new Map();current.childOrder.set(chatId,tabs.filter(item=>item?.type==='browser'||item?.type==='document'&&/^[a-zA-Z0-9_-]{1,120}$/.test(item.documentId||'')).map(item=>item.type==='browser'?{type:'browser'}:{type:'document',documentId:item.documentId,title:String(item.title||'Document').slice(0,120),version:String(item.version||''),mediaType:item.mediaType==='text/html'?'text/html':'text/markdown',source:['local','preview'].includes(item.source)?item.source:'remote',...(/^[a-f0-9]{64}$/.test(item.parentDocumentId||'')&&typeof item.relativePath==='string'&&item.relativePath.length<=4096?{parentDocumentId:item.parentDocumentId,relativePath:item.relativePath}:{})}));
    current.documents ||= new Map();for(const item of current.childOrder.get(chatId))if(item.type==='document')current.documents.set(chatId+':'+item.documentId,{...item,chatId,content:null,readAt:null});
    const activePanel=saved?.active;current.activeChatPanel=activePanel==='browser'&&current.childOrder.get(chatId).some(item=>item.type==='browser')||activePanel==='conversation'||current.childOrder.get(chatId).some(item=>item.type==='document'&&item.documentId===activePanel)?activePanel:'conversation';
}
const saveChatTabs=()=>{try{localStorage.setItem(chatTabKey,JSON.stringify([...chatTabs.values()].slice(-32).map(({hostId,id,title})=>({hostId,id,title:chatTabTitle(title)}))));}catch{}};
const preferenceKey = 'proteus-remote-ui:' + root.dataset.account;
const readPreferences = () => { try { return JSON.parse(localStorage.getItem(preferenceKey)) || {}; } catch { return {}; } };
const writePreferences = changes => { try { localStorage.setItem(preferenceKey, JSON.stringify({ ...readPreferences(), ...changes })); } catch {} };
function setView(value) {
    view = sectionNames.includes(value) ? value : 'chats';
    if(view!=='chats')session()?.previewApprovals?.clear();
    const route=workspaces.route,query=new URLSearchParams({view});if(attentionOnly&&view==='chats')query.set('attention','1');if(transcriptionOnly&&view==='schedules')query.set('transcription','1');if(route&&['workspaces','chats'].includes(view)){query.set('host',route.hostId);query.set('workspace',route.id);if(route.projectId)query.set('project',route.projectId);if(route.page)query.set('page',route.page);if(route.tab?.startsWith('chat:'))query.set('chat',route.tab.slice(5));else if(route.tab&&route.tab!=='new')query.set('tab',route.tab);}history.replaceState(null,'',location.pathname+'?'+query);
    document.dispatchEvent(new CustomEvent('proteus:section', { detail: { key: attentionOnly&&view==='chats'?'attention':transcriptionOnly&&view==='schedules'?'transcription':view==='connections'?'engine-room':view } }));
}
const $ = id => document.getElementById(id);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const text = value => typeof value === 'string' ? value : JSON.stringify(value, null, 2);
const options = (list, selected, label = value => value.name || value.id) => list.map(item => `<option value="${escape(item.id)}" ${item.id === selected ? 'selected' : ''}>${escape(label(item))}</option>`).join('');
const field = (name, label, value = '', type = 'text') => `<label>${escape(label)}${type === 'textarea' ? `<textarea name="${escape(name)}" rows="4">${escape(value)}</textarea>` : `<input name="${escape(name)}" type="${type}" value="${escape(value)}">`}</label>`;
const showNotice=createToast($('remote-notice'));const notice=message=>{if(!message)return;$('remote-notice').hidden=false;showNotice(message);};
const attachmentTypes=new Set(['image/png','image/jpeg','image/gif','image/webp','application/pdf','text/plain']);
const maxAttachmentFiles=256,maxAttachmentBytes=8*1024*1024,maxAttachmentBatchBytes=32*1024*1024;
const providerName=id=>({copilot:'Copilot',codex:'Codex',claude:'Claude',rehearsal:'Local rehearsal'}[id]||String(id||'provider'));
const attachmentType=file=>attachmentTypes.has(file.type)?file.type:/\.txt$/i.test(file.name)?'text/plain':file.type;
function attachmentItems(current,key){current.attachmentDrafts ||= new Map();return current.attachmentDrafts.get(key)||[];}
function clearAttachmentItems(current,key){for(const item of attachmentItems(current,key))if(item.previewURL)URL.revokeObjectURL(item.previewURL);current.attachmentDrafts?.delete(key);}
function confirmAttachmentSend({items,providerId,hostName,chatName}){
    return new Promise(resolve=>{const dialog=document.createElement('dialog');dialog.className='remote-attachment-confirm';dialog.innerHTML=`<h2>Confirm Send</h2><p>Send these files to <strong>${escape(providerName(providerId))}</strong> in <strong>${escape(chatName)}</strong> on <strong>${escape(hostName)}</strong>?</p><ul>${items.map(item=>`<li>${escape(item.file.name)} · ${escape(item.mediaType)} · ${escape(Math.ceil(item.file.size/1024))} KB</li>`).join('')}</ul><p>Proteus sends these exact files to the named provider only after you confirm.</p><div><button type="button" data-attachment-cancel>Cancel</button><button type="button" class="primary" data-attachment-confirm>Confirm Send</button></div>`;
        let approved=false;const focus=document.activeElement;dialog.querySelector('[data-attachment-cancel]').onclick=()=>dialog.close();dialog.querySelector('[data-attachment-confirm]').onclick=()=>{approved=true;dialog.close();};dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});dialog.addEventListener('close',()=>{dialog.remove();focus?.focus?.();resolve(approved);},{once:true});document.body.append(dialog);dialog.showModal();dialog.querySelector('[data-attachment-confirm]').focus();});
}
function assertAttachmentDestination(current,run){if(session()!==current||current.client?.status!=='online'||(run&&current.run?.id!==run.id))throw new Error('The destination changed. Review the files and chat again before sending.');}
async function uploadAttachment(item,{current,run,draftId,messageId,providerId}){
    assertAttachmentDestination(current,run);
    const scope=run?.id||draftId;
    if(item.uploaded?.scope===scope&&item.uploaded.messageId===messageId&&item.uploaded.providerId===providerId&&Date.now()-item.uploaded.at<10*60_000)return item.uploaded.metadata;
    const bytes=new Uint8Array(await item.file.arrayBuffer()),digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(byte=>byte.toString(16).padStart(2,'0')).join('');
    const begin=await command('chat.attachments.begin',{...(run?{id:run.id}:{draftId}),providerId,messageId,name:item.file.name,mediaType:item.mediaType,size:bytes.byteLength,sha256:digest});
    const chunkSize=Math.min(256*1024,Number(begin.chunkSize)||256*1024);
    for(let index=0,offset=0;offset<bytes.length;index++,offset+=chunkSize){assertAttachmentDestination(current,run);const chunk=bytes.subarray(offset,offset+chunkSize);let binary='';for(let inner=0;inner<chunk.length;inner+=32768)binary+=String.fromCharCode(...chunk.subarray(inner,inner+32768));await command('chat.attachments.chunk',{uploadId:begin.uploadId,index,dataBase64:btoa(binary)});}
    assertAttachmentDestination(current,run);
    const metadata=await command('chat.attachments.finish',{uploadId:begin.uploadId});
    if(metadata.sha256!==digest||metadata.mediaType!==item.mediaType||metadata.size!==bytes.byteLength)throw new Error('The computer returned different attachment metadata. Nothing was sent.');
    item.uploaded={scope,messageId,providerId,metadata,at:Date.now()};return metadata;
}
async function prepareAttachmentSend(current,run,key,retained,input,base){
    const items=attachmentItems(current,key);if(!items.length)return {method:run?'chat.send':'chat.start',args:base};
    if(!current.state?.capabilities?.includes('chat.attachments.v1'))throw new Error('Update Proteus on this computer to send attachments.');
    if(items.length>maxAttachmentFiles||items.some(item=>!item.file.size||item.file.size>maxAttachmentBytes)||items.reduce((total,item)=>total+item.file.size,0)>maxAttachmentBatchBytes)throw new Error('The selected files exceed the attachment limits. Remove files before sending.');
    const providerId=run?.schedule?.provider||input.provider,allowed=current.state.attachmentMediaTypes?.[providerId]||[];
    if(items.some(item=>!allowed.includes(item.mediaType)))throw new Error(`${providerName(providerId)} cannot receive one of these file types. Remove it or choose a supported provider.`);
    const steering=!!run&&input.mode==='steer',turnId=run?.turns?.at(-1)?.id;
    const verifySteering=async()=>{
        assertAttachmentDestination(current,run);
        if(!steering)return;
        const fresh=await commandForHost(current,'chat.get',{id:run.id});
        assertAttachmentDestination(current,run);
        if(fresh.status!=='running'||fresh.schedule?.provider!==providerId||fresh.turns?.at(-1)?.id!==turnId||!fresh.chatControls?.steering||items.some(item=>!fresh.chatControls.steeringMediaTypes?.includes(item.mediaType)))throw new Error('The active turn or supported attachment types changed. Review the message again.');
    };
    await verifySteering();
    if(!await confirmAttachmentSend({items,providerId,hostName:current.host.label,chatName:run?.title||input.name||'New chat'})){const error=new Error('Send cancelled.');error.cancelled=true;throw error;}
    await verifySteering();
    retained.draftId ||= crypto.randomUUID();const messageId=retained.id,metadata=[];
    for(const item of items)metadata.push(await uploadAttachment(item,{current,run,draftId:retained.draftId,messageId,providerId}));
    assertAttachmentDestination(current,run);
    const authorization=await command('chat.attachments.authorize',{...(run?{id:run.id}:{draftId:retained.draftId}),providerId,messageId,attachments:metadata});
    await verifySteering();
    return {method:run?'chat.send':'chat.start',args:{...base,...(run?{}:{draftId:retained.draftId}),providerId,messageId,mode:steering?'steer':'queue',attachments:metadata.map(item=>item.attachmentId),consentId:authorization.consentId}};
}
const session = () => sessions.get(active);
function connectionLabel(hostId) {
    const current=sessions.get(hostId);
    if(current?.client?.status==='online')return 'Connected';
    if(current?.client?.status==='connecting'||current?.connecting)return 'Connecting';
    if(suppressed.has(hostId))return current?.rejected?'Connection rejected':'Disconnected';
    return current?.client?.status==='closed'?'Connection unavailable':'Paired · not connected';
}
function rememberHostName(current,state){
    const platform=authenticatedComputerMetadata(state);Object.assign(current.host,platform);const metadata=hosts.get(current.host.hostId);if(metadata)Object.assign(metadata,platform);
    const name=state?.hostName;if(typeof name!=='string'||!name.trim()||name.length>80||/[\x00-\x1f\x7f]/.test(name))return;
    const previousHost={...current.host};current.host.label=name.trim();if(metadata)metadata.label=name.trim();
    void destinationStore.rememberName(previousHost,name).catch(()=>{});
}
function destinationOptions() {
    $('remote-forget').textContent=hosts.get(active)?.source==='account'?'Forget from account':'Forget from this browser';
    $('remote-host').innerHTML = '<option value="">Choose a paired computer</option>' + [...hosts.values()].map(host => `<option value="${escape(host.hostId)}" ${host.hostId === active ? 'selected' : ''}>${escape(computerDescription(host))}${host.source==='legacy'?' · browser only':''} · ${connectionLabel(host.hostId)}</option>`).join('');
    $('remote-status').textContent = active ? `${hosts.get(active)?.label || 'computer'} · ${connectionLabel(active)}` : 'Choose a destination';
    $('remote-status').title=active?computerDescription(hosts.get(active)):'';
}
async function command(method, args, commandOptions) {
    const target = active, current = session(); if (!current?.client) throw new Error('Connect the selected computer first.');
    await verifyWebsite();
    if(ended||suspended||active!==target||session()!==current)throw new Error('The website session or destination changed.');
    const client=current.client,result = await client.request(method, args, commandOptions);
    if (active !== target||session()!==current||current.client!==client||ended||suspended) throw new Error('The destination changed. Refresh that computer to review the result.'); return result;
}
async function commandForHost(current,method,args){
    if(!current?.client||current.client.status!=='online')throw new Error('Connect this computer first.');
    const client=current.client;await verifyWebsite();
    if(ended||suspended||current.client!==client||client.status!=='online')throw new Error('The destination changed. Refresh that computer to review the result.');
    const result=await client.request(method,args);
    if(ended||suspended||current.client!==client)throw new Error('The destination changed. Refresh that computer to review the result.');
    return result;
}
async function refresh() {
    const target = active, current = session(); const result = await command('sync', { cursor: current.host.cursor || '' });
    if (target !== active) return; current.state = result.state;rememberHostName(current,result.state);current.cachedRuns=result.state.runs||[];if(!chatIndexShowsArchived())current.archivedRuns=null;current.lastSyncAt=new Date().toISOString();void saveChatIndex(root.dataset.account,current.host,current.cachedRuns).catch(()=>{}); current.host.cursor = result.cursor; if(current.host.source==='legacy')await legacyStore.save(current.host); if(chatIndexShowsArchived())await loadArchivedChats(true);else render();
}
function preserveDrafts() {
    const current = session();if(current?.selected){current.scroll ||= new Map();const pane=root.querySelector('.remote-messages');if(pane)current.scroll.set(current.selected,pane.scrollTop);} if (!current) return;rememberActivityDisclosures(current);
    for (const form of root.querySelectorAll('form[data-draft]')) { const old = current.drafts.get(form.dataset.draft) || {}; current.drafts.set(form.dataset.draft, { ...old, ...(form.querySelector('[data-setup-disclosure]') ? {setupOpen:form.querySelector('[data-setup-disclosure]').open} : {}), values: { ...old.values, ...Object.fromEntries(new FormData(form)) } }); }
}
function currentDraft(key, initial) { const current = session(); if (!current.drafts.has(key)) current.drafts.set(key, { values: initial, id: crypto.randomUUID(), issuedAt: new Date().toISOString() }); return current.drafts.get(key); }
function bindDraft(formId, key, method, args, after) {
    const form = $(formId); if (!form) return;
    form.oninput = () => { const draft = session().drafts.get(key); draft.values = { ...draft.values, ...Object.fromEntries(new FormData(form)) }; delete draft.sentAt; draft.id = crypto.randomUUID(); draft.issuedAt = new Date().toISOString(); };
    form.onsubmit = async event => {
        event.preventDefault(); const current = session(), draft = current.drafts.get(key); const button = form.querySelector('button[type="submit"]'); button.disabled = true; notice('');
        try { const prepared=await args(Object.fromEntries(new FormData(form)),draft);assertAttachmentDestinationForSubmit(current,formId);const result = await command(prepared?.method||method, prepared?.args||prepared, { id: draft.id, issuedAt: draft.sentAt ||= new Date().toISOString() }); if(formId==='remote-composer')clearAttachmentItems(current,key);current.drafts.delete(key);await saveChatDrafts(root.dataset.account,current.host,current.drafts); form.removeAttribute('data-draft'); await after?.(result); await refresh(); }
        catch (error) { if(!error.cancelled)notice(error.message); } finally { if (button.isConnected) button.disabled = false; }
    };
}
function assertAttachmentDestinationForSubmit(current,formId){if(formId==='remote-composer'&&session()!==current)throw new Error('The destination changed. Review the message and files before sending.');}
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
const pendingConnections=new Map();
async function connect(hostId,options={}) {
    if(pendingConnections.has(hostId))return pendingConnections.get(hostId);
    const pending=connectNow(hostId,options);pendingConnections.set(hostId,pending);
    try{return await pending;}finally{if(pendingConnections.get(hostId)===pending)pendingConnections.delete(hostId);}
}
async function connectNow(hostId,{automatic=false}={}) {
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
        client.addEventListener('status', () => { if(client.status!=='online')observeRunningChats(hostId,'remote',null,false);if (relevant()) { destinationOptions(); if (client.status === 'closed') { preserveDrafts();current.state=null;current.run=null;render();reconnect(hostId); } } });
        client.addEventListener('failure', event => { if (relevant()) notice(event.detail); });
        // Routing packets are not authenticated revocation proofs. Keep account credentials intact.
        client.addEventListener('rejected', () => { if(!relevant())return;suppressed.add(hostId);stopReconnect();preserveDrafts();current.state=null;current.run=null;notice('This computer rejected the connection. Retry or create a fresh pairing; the saved account destination was retained.'); });
        client.addEventListener('change', event => { if(ended||suspended||current.client!==client)return; const change = event.detail;void workspaces.changed(hostId,change).catch(error=>notice(error.message)); current.host.cursor = change.cursor; if(change.event==='chat.lifecycle'){applyChatLifecycle(current,hostId,change.data);if(chatIndexShowsArchived())void loadArchivedChats(true).catch(error=>notice(error.message));} if (change.event === 'state'){current.state = change.data;rememberHostName(current,change.data);current.cachedRuns=change.data.runs||[];if(!chatIndexShowsArchived())current.archivedRuns=null;current.lastSyncAt=new Date().toISOString();void saveChatIndex(root.dataset.account,current.host,current.cachedRuns).catch(()=>{});if(chatIndexShowsArchived())void loadArchivedChats(true).catch(error=>notice(error.message));} if (change.event === 'run' && change.runId === current.selected) current.run = mergeChatHistory(current.run, change.data); if(active===hostId){preserveDrafts();render();}else renderRecentChats(); });
        await client.connect(); if (!relevant()) { client.close(); return; } await refresh();reconnectAttempt=0;void refreshUsage();
    } catch (error) { if(generation!==switching)return;if(error.sessionInvalid){await endAccount();return;}current.connecting=false;notice(error.message);render();if(![409,404].includes(error.status))reconnect(hostId); }
}
function renderUsage() { /* Shared shell owns Default computer allowance across every feature. */ }
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
    } catch { if (active === target) current.usageError = 'Usage is unavailable. Check or update Proteus on this computer.'; }
    finally { current.usageLoading = false; if (active === target) renderUsage(); }
}
function modelFieldParts(values, prefix = '', includeProvider = true) {
    const current = session(); const statuses = current.state?.providerStatuses || {};
    const providers = [...new Set([...Object.keys(statuses), current.state?.defaults?.provider || 'copilot', values.provider || 'copilot'])].filter(p => p !== 'local-process');
    const models = statuses[values.provider]?.models || (values.provider && current.state?.providerStatus?.provider === values.provider ? current.state.providerStatus?.models || [] : []);
    const selected = models.find(model => model.id === values.model); const controls = selected?.controls || {};
    const select = (name, label, choices, value) => `<label ${modelControlVisible(controls,name,value)?'':'hidden'}>${label}<select name="${prefix}${name}"><option value="">Default</option>${options(choices.map(item => typeof item === 'string' ? { id: item, name: item } : item), value)}</select></label>`;
    return {provider:includeProvider?`<label>Provider<select name="${prefix}provider">${options(providers.map(id => ({ id, name: id })), values.provider)}</select></label>`:'',model:`<label>Model<select name="${prefix}model"><option value="">Provider default</option>${options(models, values.model)}${values.model && !models.some(m => m.id === values.model) ? `<option selected value="${escape(values.model)}">${escape(values.model)} (refresh catalog)</option>` : ''}</select></label>`,advanced:`${select('reasoningEffort', 'Reasoning', controls.reasoningEfforts || [], values.reasoningEffort)}${select('contextTier', 'Context', controls.contextTiers || [], values.contextTier)}${select('serviceTier', 'Speed', controls.serviceTiers || [], values.serviceTier)}`};
}
function modelFields(values,prefix='',includeProvider=true){const parts=modelFieldParts(values,prefix,includeProvider);return parts.provider+parts.model+parts.advanced;}
function contextFields(values) {
    const context = session().state.context || {}; const workspaces = context.workspaces || [];
    return `<label>Workspace<select name="workspaceId">${options(workspaces, values.workspaceId || context.defaultWorkspaceId, w => w.name || w.label || w.path || w.id)}</select></label><label>Agent<select name="agentId"><option value="">Default agent</option>${options((context.entries || []).filter(e => e.kind === 'agent' && e.userInvocable !== false && e.mode !== 'disabled'), values.agentId)}</select></label><label>Default context<select name="includeDefaults"><option value="true" ${values.includeDefaults !== 'false' ? 'selected' : ''}>Include workspace defaults</option><option value="false" ${values.includeDefaults === 'false' ? 'selected' : ''}>Only selected sources</option></select></label>`;
}
function render() {
    if($('remote-default-label'))$('remote-default-label').textContent='Account Default computer: '+(hosts.get(appPreferences.defaultMacId)?.label|| (appPreferences.defaultMacId?'Unavailable paired computer':'Not selected'))+'. Connected computer: '+(session()?.client?.status==='online'?(hosts.get(active)?.label||'computer'):'None')+'.';
    const focused = document.activeElement; const focus = focused?.name && focused.closest('form') ? { form: focused.closest('form').id, name: focused.name, start: focused.selectionStart, end: focused.selectionEnd } : null;
    const priorDetails=root.querySelector('.remote-chat-details');
    const priorMessages=root.querySelector('.remote-messages');
    const priorVisible=priorMessages&&[...priorMessages.querySelectorAll('[data-event-anchor]')].find(node=>node.getBoundingClientRect().bottom>priorMessages.getBoundingClientRect().top);
    const readingAnchor=priorVisible?{runId:priorMessages.dataset.runId,key:priorVisible.dataset.eventAnchor,offset:priorVisible.getBoundingClientRect().top-priorMessages.getBoundingClientRect().top,following:priorMessages.scrollHeight-priorMessages.clientHeight-priorMessages.scrollTop<70}:null;
    const expanded=[...root.querySelectorAll('.remote-messages [data-event-anchor] details[open]')].map(item=>{const parent=item.closest('[data-event-anchor]');return {key:parent?.dataset.eventAnchor,index:[...parent.querySelectorAll('details')].indexOf(item)};});
    const viewPosition={page:window.scrollY,details:priorDetails?.scrollTop||0,detailsOpen:priorDetails?.open,hadDetails:!!priorDetails,children:root.querySelector('.remote-inner-scroll')?.scrollLeft||0};
    const messageControl = focused?.closest('[data-message-key]');
    const actionFocus = messageControl ? { key: messageControl.dataset.messageKey, action: focused.dataset.messageAction, seek: focused.hasAttribute('data-message-seek') } : null;
    const current = session(), online = current?.client?.status === 'online';
    document.body.classList.toggle('web-chat-active',view==='chats'&&chatMode==='chat'&&!!current?.run);
    setMessageActionsContext(online&&current?.state&&view==='chats'&&chatMode==='chat'&&current.run ? JSON.stringify([root.dataset.account,active,current.run.id]) : '');
    destinationOptions(); renderUsage();renderChatTabs();renderRecentChats();
    const management=view==='connections';
    root.querySelector('.remote-heading').hidden=!management;root.querySelector('.remote-connection-guide').hidden=!management;
    root.querySelector('.remote-destinations').hidden=!(management||view==='schedules');
    root.querySelectorAll('.remote-destinations button').forEach(button=>button.hidden=!management);
    $('remote-pair-panel').hidden=!management;root.querySelector('.remote-privacy').hidden=!management;
    if(management){$('remote-content').innerHTML='<p>computer connection keys remain separate. <a href="/engine-room?tab=connections">Choose the Default computer in Engine Room</a>.</p>';return;}
    root.querySelectorAll('[data-remote-view]').forEach(button => button.classList.toggle('active', button.dataset.remoteView === view));
    if(view==='chats'&&chatMode==='index'&&attentionOnly&&attentionPanel==='notifications'){renderAttentionNotifications();return;}
    if(view==='chats'&&chatMode==='index'){renderChatIndex($('remote-content'),{rows:aggregateChats(),hosts:[...hosts.values()],escape,time:value=>dateTime(value,appPreferences.timezone),timezone:appPreferences.timezone,attention:attentionOnly,sendWorkspace:row=>workspaces.sendChat(row),open:(id,hostId)=>void openChat(id,hostId,null,null).catch(error=>notice(error.message)),refresh:()=>void refreshAggregate(true).then(()=>chatIndexShowsArchived()?loadArchivedChats(true):null).then(render).catch(error=>notice(error.message)),hasMore:[...sessions.values()].some(value=>value.client?.status==='online'&&(chatIndexShowsArchived()&&value.state?.capabilities?.includes('chat.lifecycle.v1')?(value.archivedRuns?.length||0)<(value.state?.runCountIncludingArchived||0):(value.state?.runs?.length||0)<(value.state?.runCount||0))),loadMore:loadMoreChats,move:row=>moveWebsiteChat(sessions.get(row.hostId),row),archive:(row,archived)=>lifecycleChat(row,'chat.archive',{archived}),remove:row=>lifecycleChat(row,'chat.delete'),rename:row=>renameWebsiteChat(sessions.get(row.hostId),row),onShowArchived:shown=>shown?loadArchivedChats(true):render(),onError:error=>notice(error.message)});if(attentionOnly)attentionTabs($('remote-content'));if(focused?.id?.startsWith('chat-index-')){const replacement=$(focused.id);replacement?.focus({preventScroll:true});if(typeof focused.selectionStart==='number')replacement?.setSelectionRange?.(focused.selectionStart,focused.selectionEnd);}return;}
    if(view==='workspaces'&&(!workspaces.active||online)){workspaces.render($('remote-content'));return;}
    if (!current?.state || !online) {current?.previewApprovals?.clear(); const loaded=!ended&&!suspended&&view==='chats'&&current?.documents?.get(current.selected+':'+current.activeChatPanel);if(loaded?.content){$('remote-content').innerHTML=`<section class="card remote-chat-document"><h2>${escape(loaded.title||'Document')}</h2><p>Offline copy from ${escape(current.host.label)} · Last read ${escape(dateTime(loaded.readAt,appPreferences.timezone))}. Reconnect for a fresh authorized read.</p><div id="remote-offline-document"></div></section>`;mountMarkdown($('remote-offline-document'),loaded.content,{copy:value=>navigator.clipboard.writeText(value)});return;}
        $('remote-content').innerHTML = `<section class="card"><h2>${active ? 'Connect ' + escape(hosts.get(active)?.label) : 'Choose a paired computer'}</h2><p>${active ? 'Remote content is hidden while disconnected. The selected computer reconnects automatically unless you disconnect it. Use Connect to retry now.' : 'Use a fresh pairing code from each computer. Each authorized computer keeps separate keys, drafts and event cursors.'}</p>${view==='chats'?`<h3>Last authorized chat index</h3>${aggregateChats().map(run=>`<p>${escape(run.title||'Chat')} · ${escape(run.hostLabel)} · ${run.cached?'cached '+escape(dateTime(run.lastSyncAt,appPreferences.timezone)):'online'}</p>`).join('')||'<p>No cached chat index.</p>'}`:''}</section>`; return; }
    if (view === 'chats') renderChats(current); else if (view === 'schedules') renderSchedules(current); else renderWorkspaces(current);
    if(view==='chats'){const details=root.querySelector('.remote-chat-details'),children=root.querySelector('.remote-inner-scroll');if(details){if(viewPosition.hadDetails)details.open=viewPosition.detailsOpen;details.scrollTop=viewPosition.details;}if(children)children.scrollLeft=viewPosition.children;for(const item of expanded){const parent=[...root.querySelectorAll('[data-event-anchor]')].find(element=>element.dataset.eventAnchor===item.key);parent?.querySelectorAll('details')?.[item.index]&&(parent.querySelectorAll('details')[item.index].open=true);}window.scrollTo({top:viewPosition.page,behavior:'instant'});}
    // Restore after disclosure/layout state; restoring before it can clamp the pane's scroll.
    if(readingAnchor){const pane=root.querySelector('.remote-messages');if(pane?.dataset.runId===readingAnchor.runId){const node=[...pane.querySelectorAll('[data-event-anchor]')].find(item=>item.dataset.eventAnchor===readingAnchor.key);if(readingAnchor.following)pane.scrollTop=pane.scrollHeight;else if(node)pane.scrollTop+=node.getBoundingClientRect().top-pane.getBoundingClientRect().top-readingAnchor.offset;}}
    if (actionFocus) {
        const toolbar = [...root.querySelectorAll('[data-message-key]')].find(element => element.dataset.messageKey === actionFocus.key);
        const control = actionFocus.seek ? toolbar?.querySelector('[data-message-seek]') : [...(toolbar?.querySelectorAll('[data-message-action]') || [])].find(element => element.dataset.messageAction === actionFocus.action);
        if (control && !control.disabled && !control.closest('[hidden]')) control.focus({ preventScroll: true });
    }
    if (focus) { const field = document.getElementById(focus.form)?.elements.namedItem(focus.name); if (field) { field.focus({ preventScroll: true }); if (typeof focus.start === 'number' && field.setSelectionRange) { try { field.setSelectionRange(focus.start, focus.end); } catch {} } } }
}
function bindCatalog(formId, key) {
    const form = $(formId);
    if(!form)return;
    for (const select of form.querySelectorAll('select[name="provider"],select[name="model"]')) select.onchange = async () => { preserveDrafts(); const draft = session().drafts.get(key); if (select.name === 'provider') { draft.values.model = ''; draft.values.reasoningEffort = ''; draft.values.contextTier = ''; draft.values.serviceTier = ''; try { const status = await command('provider.status', { provider: select.value }); session().state.providerStatuses ||= {}; session().state.providerStatuses[select.value] = status; } catch (error) { notice(error.message); } } else {const model=session().state.providerStatuses?.[draft.values.provider]?.models?.find(model=>model.id===select.value);if(model)Object.assign(draft.values,optionsForModelChange(model.controls,draft.values));} render(); };
}
async function openChat(id,hostId=active,panel=null,scope=workspaces.active) { if(scope){workspaces.restore(scope);workspaces.selectChat(id);}else workspaces.leave(); chatMode='chat'; if(hostId!==active||session()?.run?.id!==id||view!=='chats')stopMessageSpeech();preserveDrafts();if(hostId!==active||session()?.client?.status!=='online')await connect(hostId);const current=session();if(current?.client?.status!=='online')throw new Error('This chat’s computer is not connected. Use Connect to retry.');const changed=current.selected!==id;if(changed){current.earlierError=false;if(current.selected)saveChildTabs(current,current.selected);current.previewApprovals?.clear();current.activeChatPanel='conversation';}current.selected=id;setView('chats');const fresh=await command('chat.get',{id});if(scope?!workspaces.isChatCurrent(scope,id):!!workspaces.active||current.selected!==id)return;current.run=mergeChatHistory(current.run,fresh);if(current.state?.capabilities?.includes('chat.paths.v1'))current.run.storage=await command('chat.paths',{id});if(scope?!workspaces.isChatCurrent(scope,id):!!workspaces.active||current.selected!==id)return;restoreChildTabs(current,id);if(changed){const remembered=savedChildTabs[hostId+':'+id]?.active||'conversation',children=current.childOrder?.get(id)||[];current.activeChatPanel=remembered==='conversation'||remembered==='browser'&&children.some(item=>item.type==='browser')||children.some(item=>item.documentId===remembered)?remembered:'conversation';}if(panel){const children=current.childOrder?.get(id)||[];if(panel==='conversation'||panel==='browser'&&children.some(item=>item.type==='browser')||children.some(item=>item.documentId===panel)){current.activeChatPanel=panel;saveChildTabs(current,id);}}if(scope){if(current.run.workspaceId!==scope.id&&current.run.context?.workspaceId!==scope.id&&current.run.schedule?.context?.workspaceId!==scope.id)throw new Error('This chat belongs to another workspace.');await workspaces.adoptChat(current.run);setView('chats');}else{chatTabs.set(hostId+':'+id,{hostId,id,title:chatTabTitle(current.run.title||current.run.schedule?.name||chatTabs.get(hostId+':'+id)?.title)});saveChatTabs();}render();
    // A failed chat is only acknowledged after its detail has been delivered and rendered.
    if(['failed','interrupted'].includes(current.run.status)&&current.run.attentionRequired===true){
        try{const reviewed=await command('chat.review',{id,expectedFailureEventAt:current.run.failureEventAt});if(session()!==current)return;current.run={...current.run,...reviewed};reviewedChats.set(active+':'+id,{...current.run});const row=current.state?.runs?.find(item=>item.id===id);if(row)Object.assign(row,reviewed);render();}catch(error){notice('Could not mark this failure reviewed: '+error.message);}
    }
}
async function openSchedule(id,hostId=active){
    preserveDrafts();if(hostId!==active||session()?.client?.status!=='online')await connect(hostId);
    const current=session();if(current?.client?.status!=='online')throw new Error('This schedule’s computer is not connected. Use Connect to retry.');
    const schedule=current.state?.schedules?.find(item=>item.id===id);if(!schedule)throw new Error('This schedule is no longer available on the selected computer.');
    attentionOnly=false;transcriptionOnly=false;current.scheduleId=id;setView('schedules');
    history.replaceState(null,'',location.pathname+'?view=schedules&host='+encodeURIComponent(hostId)+'&schedule='+encodeURIComponent(id));
    render();document.dispatchEvent(new CustomEvent('proteus:schedule-open',{detail:{hostId,id,title:schedule.name||'Schedule'}}));
}
function renderToolEvent(event){
    const tool=normalizedTool(event.data?.tool||{name:'Tool output',summary:'Tool output',status:'output',output:event.text||''});
    const presentation={...toolPresentation(tool),...tool.presentation,error:toolPresentation(tool).error||tool.presentation?.error},output=presentation.output,failed=tool.status==='failed'||tool.status==='error'||Boolean(presentation.error);
    const facts=presentation.facts?.length?`<dl class="remote-tool-facts">${presentation.facts.map(fact=>`<dt>${escape(fact.label)}</dt><dd>${escape(fact.value)}</dd>`).join('')}</dl>`:'';
    const outputView=output?.kind==='facts'?`<dl class="remote-tool-facts">${(output.facts||[]).map(fact=>`<dt>${escape(fact.label)}</dt><dd>${escape(fact.value)}</dd>`).join('')}</dl>`:output?.kind==='table'?`<div class="remote-tool-table"><table><thead><tr>${(output.columns||[]).map(column=>`<th>${escape(column)}</th>`).join('')}</tr></thead><tbody>${(output.rows||[]).map(row=>`<tr>${row.map(cell=>`<td>${escape(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:output?.text?`<pre>${escape(output.text)}</pre>`:'';
    const detail=[presentation.command&&`<pre>${escape(presentation.command)}</pre>`,facts,presentation.progress&&`<p>${escape(presentation.progress)}</p>`,outputView].filter(Boolean).join('');
    return `<div class="remote-activity-item ${failed?'failed':tool.status==='running'?'running':'completed'}"><strong><span data-runtime-tool="${escape(JSON.stringify({startedAt:tool.startedAt,finishedAt:tool.finishedAt,status:tool.status,durationMs:tool.durationMs}))}"></span><span class="remote-tool-icon ${tool.status==='running'?'spinner':''}" aria-hidden="true">${tool.status==='running'?'':failed?'!':'✓'}</span>${escape(tool.summary||tool.name||'Tool')}</strong><div class="note">${tool.status==='running'?'Working…':failed?'Failed':tool.status==='completed'?'Completed':escape(tool.status||'Completed')}${toolEventTime(tool,event)?' · '+escape(activityTime(toolEventTime(tool,event))):' · Completion time unavailable'}</div>${tool.callId?`<div class="note tool-call-reference">Tool call ${escape(tool.callId)}</div>`:''}${(presentation.facts||[]).filter(f=>f.label==='Pattern').map(f=>`<div class="tool-search-pattern">Pattern: ${escape(f.value)}</div>`).join('')}${presentation.error?`<p class="remote-activity-error">${escape(presentation.error)}</p>`:''}${presentation.targets?.length?`<div class="note">${escape(presentation.targets.join(' · '))}</div>`:''}${presentation.approval?`<div class="note">${escape(presentation.approval)}</div>`:''}${detail?`<details><summary>Details</summary>${detail}</details>`:''}</div>`;
}
function eventAnchor(event,index,eventStart=0){
    if(event.id||event.eventId)return String(event.id||event.eventId);
    const content=String(event.text||event.data?.tool?.summary||''),role=event.role||event.type||'',at=event.at||event.timestamp||event.createdAt||'';
    let hash=2166136261;for(const character of content)hash=Math.imul(hash^character.charCodeAt(0),16777619)>>>0;
    return `${at}:${role}:${content?hash.toString(36):eventStart+index}`;
}
function renderChatEvent(event,index,provider,eventStart=0){
    if(event.data?.activity)return `<div class="remote-activity-item" data-provider-activity-index="${eventStart+index}"></div>`;
    if((event.role||event.type)==='assistant'&&!String(event.text||'').trim())return '';
    const role=event.role||event.type,label=role==='assistant'?providerName(provider):role;
    const files=role==='user'&&Array.isArray(event.data?.attachments)?`<div class="remote-sent-attachments">${event.data.attachments.map(item=>`<span>▤ ${escape(item.name||'File')} · ${escape(item.mediaType||'file')}${/^[a-f0-9]{64}$/.test(item.sha256||'')&&session()?.state?.capabilities?.includes('chat.attachments.view.v1')?` <button type="button" class="subtle" data-remote-attachment="${escape(item.sha256)}" data-remote-attachment-name="${escape(item.name||'File')}">Open</button>`:''}</span>`).join('')}</div>`:'';
    return `<article class="remote-message ${escape(role)}" data-event-key="${eventStart+index}" data-event-anchor="${escape(eventAnchor(event,index,eventStart))}"><div class="eyebrow">${escape(label)}${role==='assistant'?`<span data-runtime-turn="${escape(event.data?.turnId||'')}"></span>`:''}<time>${escape(dateTime(event.at||event.timestamp||event.createdAt,appPreferences.timezone))}</time></div><div data-markdown-event="${eventStart+index}"></div>${files}</article>`;
}
function renderAutomaticApproval(event){
    const permission=event.data.permission;
    const detail=[permission.reason||event.text,permissionToolCallId(permission)&&`Tool call ${permissionToolCallId(permission)}`,permission.resolvedTarget&&`Target: ${permission.resolvedTarget}`,permission.matchedRoot&&`Trusted root: ${permission.matchedRoot}`].filter(Boolean);
    return `<div class="remote-activity-item remote-permission-detail"><strong>${permission.automatic?'✓ Automatic approval':'Permission '+escape(permission.decision||'decision')}${permission.intention?' · '+escape(permission.intention):permission.kind?' · '+escape(permission.kind):''}</strong><time>${escape(dateTime(event.at||event.timestamp||event.createdAt,appPreferences.timezone))}</time>${detail.length?`<p>${detail.map(escape).join(' · ')}</p>`:''}<details><summary>Original approval request</summary><pre>${escape(permission.request||'Original request was not recorded by this version.')}</pre></details></div>`;
}
function renderChatTimeline(events,provider,eventStart=0){
    const classify=event=>isActivityEvent(event)||!!activityNote(event,{schedule:{provider}});
    const output=[];for(let index=0;index<events.length;){
        if(!classify(events[index])){output.push(renderChatEvent(events[index],index,provider,eventStart));index++;continue;}
        const groupStart=index;
        const items=[],toolStates=[];let failed=false,running=false,tools=0,approvals=0,decisions=0,systems=0;while(index<events.length&&classify(events[index])){const event=events[index],tool=event.data?.tool;if(tool||(event.role||event.type)==='tool'){if(tool){tools++;toolStates.push(normalizedTool(tool));}failed ||= ['failed','error'].includes(normalizedTool(tool||{}).status)||Boolean(tool?.presentation?.error);running ||= tool?.status==='running';}if(event.data?.permission){if(event.data.permission.automatic)approvals++;else decisions++;}else if(!tool&&(event.role||event.type)!=='tool')systems++;index++;}
        const summary=activitySummary(toolStates,approvals,decisions,systems);
        output.push(`<article class="remote-message remote-activity ${failed?'failed':''} ${running?'running':''}" data-event-key="${eventStart+groupStart}" data-event-anchor="${escape(eventAnchor(events[groupStart],groupStart,eventStart))}"><details data-activity-start="${eventStart+groupStart}" data-activity-end="${eventStart+index}"><summary><span>${escape(summary)}</span>${toolStates.length?`<span data-runtime-group="${escape(JSON.stringify(toolStates.map(t=>({startedAt:t.startedAt,finishedAt:t.finishedAt,status:t.status}))))}"></span>`:''}</summary><div class="remote-activity-items"></div></details></article>`);
    }return output.join('');
}
function renderAttachmentStrip(current,key,providerId){
    const allowed=key.startsWith('new-chat')&&newInternet?[...new Set(Object.values(current.state?.attachmentMediaTypes||{}).flat())]:current.state?.attachmentMediaTypes?.[providerId]||[];
    return attachmentItems(current,key).map((item,index)=>`<div class="remote-attachment-tag ${allowed.includes(item.mediaType)?'':'unsupported'}"><button type="button" ${item.previewURL?`data-attachment-preview="${index}" aria-label="Preview ${escape(item.file.name)}"`:'disabled'}>${item.previewURL?`<img src="${escape(item.previewURL)}" alt="">`:'▤'} <span title="${escape(item.file.name)}">${escape(item.file.name)}<small>${item.file.size>=1024*1024?(item.file.size/1024/1024).toFixed(1)+' MB':Math.ceil(item.file.size/1024)+' KB'}</small></span></button>${allowed.includes(item.mediaType)?'':`<small>Unsupported by ${escape(providerName(providerId))}</small>`}<button type="button" data-attachment-remove="${index}" aria-label="Remove ${escape(item.file.name)}">×</button></div>`).join('');
}
function bindAttachmentControls(form,current,key,run){
    const picker=$('remote-attachment-picker'),strip=$('remote-attachment-strip'),button=$('remote-attach');if(!picker||!strip||!button)return;
    const provider=()=>run?.schedule?.provider||form.elements.namedItem('provider')?.value;
    const update=()=>{const providerId=provider(),allowed=!run&&newInternet?[...new Set(Object.values(current.state?.attachmentMediaTypes||{}).flat())]:current.state?.attachmentMediaTypes?.[providerId]||[];strip.innerHTML=renderAttachmentStrip(current,key,providerId);button.disabled=allowed.length===0;button.title=allowed.length?'Add images or files. Sending requires a separate confirmation.':`${providerName(providerId)} does not support attachments in Proteus.`;};
    const add=files=>{const items=attachmentItems(current,key);let totalBytes=items.reduce((total,item)=>total+item.file.size,0);for(const file of files){if(items.length>=maxAttachmentFiles){notice('Remove a file before adding more to this message.');break;}if(!file.size||file.size>maxAttachmentBytes){notice('Each file must be between 1 byte and 8 MB.');continue;}if(totalBytes+file.size>maxAttachmentBatchBytes){notice('The selected files exceed the total attachment size. Remove files before adding more.');continue;}const mediaType=attachmentType(file);items.push({file,mediaType,previewURL:attachmentTypes.has(mediaType)&&mediaType.startsWith('image/')?URL.createObjectURL(file):null});totalBytes+=file.size;}current.attachmentDrafts.set(key,items);update();};
    picker.onchange=event=>{add([...event.target.files]);event.target.value='';};button.onclick=()=>picker.click();
    form.onpaste=event=>{if(event.target?.name!=='prompt')return;const files=[...(event.clipboardData?.files||[])];if(files.length){event.preventDefault();add(files);}};
    strip.onclick=event=>{const remove=event.target.closest('[data-attachment-remove]'),preview=event.target.closest('[data-attachment-preview]');if(remove){const index=Number(remove.dataset.attachmentRemove),items=attachmentItems(current,key),[item]=items.splice(index,1);if(item?.previewURL)URL.revokeObjectURL(item.previewURL);update();return;}if(preview){const item=attachmentItems(current,key)[Number(preview.dataset.attachmentPreview)];if(!item?.previewURL)return;const dialog=document.createElement('dialog');dialog.className='remote-attachment-preview';dialog.innerHTML=`<button type="button" aria-label="Close preview">×</button><img src="${escape(item.previewURL)}" alt="${escape(item.file.name)}"><p>${escape(item.file.name)}</p>`;dialog.querySelector('button').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const bounds=dialog.getBoundingClientRect();if(e.clientX<bounds.left||e.clientX>bounds.right||e.clientY<bounds.top||e.clientY>bounds.bottom)dialog.close();});dialog.addEventListener('close',()=>{dialog.remove();preview.focus();},{once:true});document.body.append(dialog);dialog.showModal();dialog.querySelector('button').focus();}};
    form.onchange=event=>{if(event.target.name==='provider')update();};update();
}
function renderChatDetails(run){
 if(!run)return '';
 return '<details class="card remote-chat-details" '+(window.matchMedia('(min-width: 1100px)').matches?'open':'')+'><summary>Run details</summary>'+renderRunDetails(run,{remote:true,permissionHTML:approvalDetails(run.permissionContext,{remote:true,prefix:'remote',desktopPreview:session()?.state?.capabilities?.includes('projects.v1')}),mcp:(session()?.state?.mcpStatusProviders||[]).includes(run.schedule?.provider),mcpID:'remote-mcp-connections',contextID:'remote-refresh-context'})+'</details>';
}

function editQueuedMessage(current,run,message){
    const dialog=document.createElement('dialog');dialog.className='remote-rename-dialog';dialog.innerHTML=`<form><h2>Edit queued message</h2><label>Message<textarea name="prompt" rows="5" required>${escape(message.prompt)}</textarea></label><p data-error role="status"></p><menu><button type="button" data-close>Cancel</button><button class="primary">Save queued message</button></menu></form>`;
    dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.onclose=()=>dialog.remove();
    dialog.querySelector('form').onsubmit=async event=>{event.preventDefault();const button=dialog.querySelector('.primary');if(button.disabled)return;button.disabled=true;try{await commandForHost(current,'chat.edit-queued',{id:run.id,messageId:message.id,expectedPrompt:message.prompt,prompt:dialog.querySelector('textarea').value});dialog.close();if(session()===current&&current.selected===run.id)await openChat(run.id);}catch(error){dialog.querySelector('[data-error]').textContent=error.message;}finally{button.disabled=false;}};
    document.body.append(dialog);dialog.showModal();dialog.querySelector('textarea').focus();
}
function renameWebsiteChat(current,run){
    if(!current?.state?.capabilities?.includes('chat.rename.v1')){notice('Update Proteus on this computer to rename chats.');return;}
    const dialog=document.createElement('dialog');dialog.className='remote-rename-dialog';
    dialog.innerHTML=`<form method="dialog"><h2>Rename chat</h2><label>Chat name<input name="title" type="text" maxlength="200" required value="${escape(run.title||'')}"></label><menu><button value="cancel">Cancel</button><button value="save" class="primary">Save</button></menu></form>`;
    const field=dialog.querySelector('input');dialog.addEventListener('close',async()=>{const save=dialog.returnValue==='save',title=field.value.trim();dialog.remove();if(!save)return;if(!title){notice('Enter a chat name.');return;}try{const result=await commandForHost(current,'chat.rename',{id:run.id,title,expectedTitleRevision:run.titleRevision});if(current.run?.id===run.id)current.run={...current.run,...result};for(const row of current.state?.runs||[])if(row.id===run.id)Object.assign(row,result);for(const row of current.cachedRuns||[])if(row.id===run.id)Object.assign(row,result);for(const row of current.archivedRuns||[])if(row.id===run.id)Object.assign(row,result);const tab=chatTabs.get(current.host.hostId+':'+run.id);if(tab)tab.title=chatTabTitle(result.title);saveChatTabs();render();}catch(error){notice(error.message);}} ,{once:true});
    document.body.append(dialog);dialog.showModal();field.focus();field.select();
}
function composerModeStatus(current){
    const chatMode=current.activeChatPanel==='live'?'live':'conversation';
    return `<span class="chat-composer-status"><span data-composer-connection>${escape(connectionLabel(current.host.hostId))}</span>${current.state.capabilities?.includes('browser.live.v1')?`<span class="chat-mode-links" role="group" aria-label="Chat mode"><button type="button" data-chat-panel="conversation" aria-pressed="${chatMode==='conversation'}">Chat</button><span aria-hidden="true">|</span><button type="button" data-chat-panel="live" aria-pressed="${chatMode==='live'}">Live browser</button></span>`:''}</span>`;
}
function documentTabs(current,run){
    const selected=current.activeChatPanel||'conversation';
    const children=(current.childOrder?.get(run.id)||[]).map(item=>item.type==='browser'?`<button type="button" data-chat-panel="browser" class="${selected==='browser'?'selected':''}">Browser <span data-close-browser role="button" tabindex="0" aria-label="Close browser tab">×</span></button>`:`<button type="button" data-chat-document="${escape(item.documentId)}" class="${selected===item.documentId?'selected':''}">${escape(item.title||'Document')} <span data-close-document="${escape(item.documentId)}" role="button" tabindex="0" aria-label="Close ${escape(item.title||'Document')}">×</span></button>`).join('');
    if(workspaces.active)return workspaces.nav().replace('<div class="remote-inner-scroll">','<div class="remote-inner-scroll">'+children).replace('<button data-workspace-new="browser">Browser</button>','<button data-workspace-new="browser">Browser</button><button data-chat-create="markdown">Markdown file</button>');
    return `<nav class="remote-inner-tabs" aria-label="Chat content"><button type="button" data-chat-panel="conversation" class="${selected==='conversation'?'selected':''}"><span class="tab-create-icon chat" aria-hidden="true"></span>Chat</button><div class="remote-inner-scroll">${children}</div><details class="shell-add-menu remote-inner-add"><summary aria-label="Add chat tab">+</summary><div class="shell-add-options"><button type="button" data-chat-create="browser"><span class="tab-create-icon browser" aria-hidden="true"></span><span>Browser</span></button><button type="button" data-chat-create="markdown"><span class="tab-create-icon markdown" aria-hidden="true"></span><span>Markdown file</span></button><button type="button" disabled title="Terminals run in the computer app"><span class="tab-create-icon terminal" aria-hidden="true"></span><span>Terminal · computer app</span></button></div></details></nav>`;
}
function moveChildTab(current,run,from,to){
    const tabs=current.childOrder?.get(run.id)||[];
    if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=tabs.length||to>=tabs.length||from===to)return;
    const [item]=tabs.splice(from,1);tabs.splice(to,0,item);current.childOrder.set(run.id,tabs);saveChildTabs(current,run.id);render();
}
function closeChildTabs(current,run,indices){
    const tabs=current.childOrder?.get(run.id)||[],closing=indices.map(index=>tabs[index]).filter(Boolean);
    for(const item of closing)if(item.type==='document'){releaseDocumentAssets(current.documents?.get(run.id+':'+item.documentId));current.documents?.delete(run.id+':'+item.documentId);}
    current.childOrder?.set(run.id,tabs.filter((_,index)=>!indices.includes(index)));
    if(closing.some(item=>item.type==='browser'?current.activeChatPanel==='browser':current.activeChatPanel===item.documentId))current.activeChatPanel='conversation';
    saveChildTabs(current,run.id);render();
}
function stopDocumentPreview(current,run){const item=current.documents?.get(run.id+':'+current.activeChatPanel);if(item)current.previewApprovals?.delete(run.id+':'+item.documentId+':'+item.version);}
function releaseDocumentAssets(item){for(const url of item?.assetURLs?.values()||[])URL.revokeObjectURL(url);item?.assetURLs?.clear();item?.assetRequests?.clear();}
async function documentAsset(current,run,item,source,{inline=false}={}){
    const asset=item.assets?.find(value=>value.source===source);
    if(!asset||!item.approvedRequestId||!/^image\/(?:png|jpeg|gif|webp)$/.test(asset.mediaType||''))throw new Error('This image is not in the approved document.');
    const key=run.id+':'+item.documentId;if(current.documents?.get(key)!==item)throw new Error('The document tab changed.');
    item.assetRequests ||= new Map();let pending=item.assetRequests.get(asset.assetId);
    if(!pending){pending=(async()=>{
        const value=await command('chat.documents.asset',{requestId:item.approvedRequestId,assetId:asset.assetId});
        if(current.documents?.get(key)!==item||value.requestId!==item.approvedRequestId||value.assetId!==asset.assetId||value.documentId!==item.documentId||value.version!==item.version||value.source!==asset.source||value.mediaType!==asset.mediaType||value.size!==asset.size||value.sha256!==asset.version||value.size>512*1024)throw new Error('The approved image changed. Request the document again.');
        const binary=atob(value.dataBase64||''),bytes=Uint8Array.from(binary,char=>char.charCodeAt(0));if(bytes.length!==asset.size)throw new Error('Image size mismatch.');
        const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(byte=>byte.toString(16).padStart(2,'0')).join('');if(digest!==asset.version)throw new Error('Image digest mismatch.');
        return {bytes,dataURL:`data:${asset.mediaType};base64,${value.dataBase64}`};
    })();item.assetRequests.set(asset.assetId,pending);pending.catch(()=>item.assetRequests?.delete(asset.assetId));}
    const verified=await pending;if(inline)return verified.dataURL;
    item.assetURLs ||= new Map();let url=item.assetURLs.get(asset.assetId);if(!url){url=URL.createObjectURL(new Blob([verified.bytes],{type:asset.mediaType}));item.assetURLs.set(asset.assetId,url);}return url;
}
async function materializeDocumentHTML(current,run,item,html){
    const parsed=new DOMParser().parseFromString(html,'text/html');
    for(const element of parsed.querySelectorAll('[srcset]'))element.removeAttribute('srcset');
    for(const image of parsed.querySelectorAll('img[src]')){const source=image.getAttribute('src');if(!(item.preview&&/^data:image\//.test(source)))image.removeAttribute('src');if(item.assets?.some(asset=>asset.source===source))image.setAttribute('src',await documentAsset(current,run,item,source,{inline:true}));}
    return '<!doctype html>'+parsed.documentElement.outerHTML;
}
async function openChatDocument(current,run,sourceOrId,depth=0){
    if(depth>8)throw new Error('Document links are nested too deeply. Open the original chat link again.');
    if(!current.state?.capabilities?.includes('chat.documents.v1'))throw new Error('Update Proteus on this computer to view chat documents here.');
    const source=typeof sourceOrId==='string'?sourceOrId:null;
    const relative=sourceOrId&&typeof sourceOrId==='object'&&sourceOrId.relativePath?sourceOrId:null;
    let parentDocumentId=relative?.parentDocumentId||null,parentRequestId=relative?.fromRequestId||null;
    if(relative&&!parentRequestId){
        const parent=current.documents?.get(run.id+':'+parentDocumentId);
        if(!parent)throw new Error('Open the parent document link from the chat before reopening this linked document.');
        if(!parent.approvedRequestId){await openChatDocument(current,run,{documentId:parentDocumentId,...(parent.parentDocumentId&&parent.relativePath?{parentDocumentId:parent.parentDocumentId,relativePath:parent.relativePath}:{})},depth+1);}
        parentRequestId=current.documents?.get(run.id+':'+parentDocumentId)?.approvedRequestId;
        if(!parentRequestId)throw new Error('Approve the parent document on the computer, then open this link again.');
    }
    if(source){
        const existing=[...(current.documents?.values()||[])].find(item=>item.chatId===run.id&&item.source==='remote'&&item.linkSource===source&&item.content!=null);
        if(existing){current.activeChatPanel=existing.documentId;saveChildTabs(current,run.id);render();return;}
    }
    const request=await command('chat.documents.request',{id:run.id,...(source?{source}:relative?{fromRequestId:parentRequestId,relativePath:relative.relativePath}:{documentId:sourceOrId.documentId})});
    if(session()!==current||current.run?.id!==run.id)return;
    const documentId=request.documentId,requestId=request.requestId;
    if(!/^[a-f0-9]{64}$/.test(documentId||'')||!requestId)throw new Error('The computer returned an invalid document request.');
    current.documents ||= new Map();const key=run.id+':'+documentId,previous=current.documents.get(key);
    if(previous?.version!==request.version)releaseDocumentAssets(previous);
    current.documents.set(key,{...previous,chatId:run.id,documentId,title:request.title,version:request.version,mediaType:request.mediaType,source:'remote',linkSource:source||previous?.linkSource,parentDocumentId:parentDocumentId||previous?.parentDocumentId,relativePath:relative?.relativePath||previous?.relativePath,assets:request.assets,links:request.links,content:previous?.version===request.version?previous.content:null,approvalStatus:request.status,requestId,approvedRequestId:null,readAt:previous?.version===request.version?previous.readAt:null});
    current.childOrder ||= new Map();const tabs=current.childOrder.get(run.id)||[];const descriptor=tabs.find(item=>item.type==='document'&&item.documentId===documentId);
    if(descriptor)Object.assign(descriptor,{title:request.title,version:request.version,mediaType:request.mediaType,source:'remote',parentDocumentId,relativePath:relative?.relativePath});
    else tabs.push({type:'document',documentId,title:request.title,version:request.version,mediaType:request.mediaType,source:'remote',parentDocumentId,relativePath:relative?.relativePath});
    current.childOrder.set(run.id,tabs);current.activeChatPanel=documentId;saveChildTabs(current,run.id);preserveDrafts();render();
    notice('Approve this exact document version on '+current.host.label+' to open it.');
    try{
        let status=request.status;
        while(status==='pending'&&Date.now()<Date.parse(request.expiresAt)){
            await new Promise(resolve=>setTimeout(resolve,4000));
            if(session()!==current||current.run?.id!==run.id||current.client?.status!=='online'||current.documents?.get(key)?.requestId!==requestId)return;
            status=(await command('chat.documents.status',{requestId})).status;
        }
        if(status!=='approved')throw new Error(status==='pending'?'The document approval expired. Open the link again to retry.':'The document request was not approved.');
        const result=await command('chat.documents.read',{requestId});
        if(session()!==current||current.run?.id!==run.id||current.documents?.get(key)?.requestId!==requestId)return;
        if(result.documentId!==documentId||result.version!==request.version)throw new Error('The document changed; request the latest version again.');
        current.documents.set(key,{...current.documents.get(key),...result,source:'remote',chatId:run.id,approvalStatus:'approved',requestId:null,approvedRequestId:requestId});if(current.activeChatPanel===documentId)render();notice('');
    }catch(error){notice(error.message);}
}
function renderChatPanel(current,run,conversation){
    const selected=current.activeChatPanel||'conversation';
    if(selected==='conversation')return conversation;
    if(selected==='live')return '<section class="live-browser" id="remote-live-browser"></section>';
    if(selected==='browser')return `<section class="card remote-chat-main"><h2>Browser</h2><p>Website pages open in browser-managed tabs. Use your browser’s Back, Forward, and Reload controls there.</p><form id="remote-chat-browser"><label>URL or search<input name="query" required placeholder="Search or enter a URL"></label><button class="primary">Open browser tab ↗</button></form></section>`;
    const item=current.documents?.get(run.id+':'+selected);if(!item)return conversation;
    const standaloneHTML=item.mediaType==='text/html'||/\.html?$/i.test(item.title||'');
    const html=standaloneHTML?item.content:item.content?.match(/^\s*```html\s*\n([\s\S]*?)\n```/im)?.[1];
    const preview=html?`<${standaloneHTML?'div':'details'} class="remote-html-preview">${standaloneHTML?'':'<summary>HTML preview</summary>'}<p>Scripts are off. This preview cannot use Proteus credentials, files, app actions, or network access.</p><div class="remote-preview-controls"><button id="remote-preview-enable" type="button">Enable interactive preview</button><button id="remote-preview-stop" type="button" hidden>Stop scripts</button></div><iframe id="remote-html-frame" title="HTML document preview" sandbox="" referrerpolicy="no-referrer"></iframe></${standaloneHTML?'div':'details'}>`:'';
    return `<section class="card remote-chat-document"><header><div><h2>${escape(item.title||'Document')}</h2><small>${escape(current.host.label)} · ${item.readAt?'Read '+escape(dateTime(item.readAt,appPreferences.timezone)):item.approvalStatus==='pending'?'Awaiting computer approval':'Contents unloaded'} · Version ${escape(item.version)}</small><p class="note">Created: ${escape(item.fileCreatedAt?dateTime(item.fileCreatedAt,appPreferences.timezone):'Unknown')} · Modified: ${escape(item.fileModifiedAt?dateTime(item.fileModifiedAt,appPreferences.timezone):'Unknown')}</p></div>${item.source==='remote'?` <button id="remote-document-refresh" type="button">${item.content==null?'Request latest':'Check latest'}</button>`:''}</header>${item.content==null?`<p>${item.approvalStatus==='pending'?'Approve the request in Proteus on the owning computer.':item.source==='local'?'Choose the file again to reopen this tab.':'Request the current version from the owning computer; approval is required for each version.'}</p>${item.source==='local'?'<button id="remote-document-reselect" type="button">Choose file</button>':''}`:standaloneHTML?`${preview}<details><summary>View source</summary><pre>${escape(item.content)}</pre></details>`:`<div id="remote-document-markdown"></div>${preview}`}</section>`;
}
function renderChats(current) {
    if(current.activeChatPanel==='live'&&root.querySelector('#remote-live-browser')?.dataset.chat===current.run?.id){const status=root.querySelector('[data-composer-connection]');if(status)status.textContent=connectionLabel(current.host.hostId);return;}
    current.stopLive?.();current.stopLive=null;
    queueMicrotask(()=>bindWebRuntime(current,current.run));
    const previousPane=root.querySelector('.remote-messages'),previousScroll=previousPane?.scrollTop;
    const followingLatest=previousPane&&previousPane.dataset.runId===current.run?.id?previousPane.scrollHeight-previousPane.clientHeight-previousPane.scrollTop<70:false;
    const firstVisible=previousPane&&previousPane.dataset.runId===current.run?.id&&[...previousPane.querySelectorAll('[data-event-anchor]')].find(item=>item.getBoundingClientRect().bottom>previousPane.getBoundingClientRect().top);
    const anchor=firstVisible?{key:firstVisible.dataset.eventAnchor,offset:firstVisible.getBoundingClientRect().top-previousPane.getBoundingClientRect().top}:null;
    const run = current.run; const key = run ? 'reply:' + run.id : workspaces.active?'new-chat:workspace:'+workspaces.active.id+':'+(workspaces.active.projectId||'default'):'new-chat'; const draft = currentDraft(key, run ? { prompt: '', mode: 'queue', provider:run.provider||run.schedule?.provider||current.state.defaults.provider,model:run.nextModelOptions?.model||run.schedule?.model||'',reasoningEffort:run.nextModelOptions?.reasoningEffort||run.schedule?.reasoningEffort||'',contextTier:run.nextModelOptions?.contextTier||run.schedule?.contextTier||'',serviceTier:run.nextModelOptions?.serviceTier||run.schedule?.serviceTier||'' } : { ...current.state.defaults,...(workspaces.profile?.defaults||{}), name: '', prompt: '', workspaceId: workspaces.active?.id||current.state.context.defaultWorkspaceId, includeDefaults: String(workspaces.profile?.defaults?.includeDefaults!==false) }); const values = draft.values;
    const openDocument=run&&current.documents?.get(run.id+':'+current.activeChatPanel),existingDocument=root.querySelector('.remote-chat-document[data-document-id]');
    if(openDocument?.content&&existingDocument?.dataset.documentId===openDocument.documentId&&existingDocument.dataset.version===String(openDocument.version)&&existingDocument._documentContent===openDocument.content)return;
    const pending = run?.pending; const answerKey=pending?'answer:'+run.id+':'+pending.id:null;const answerDraft=pending&&pending.type!=='permission'?currentDraft(answerKey,{answer:''}):null; const waiting = pending ? `<section class="remote-pending"><h3>${pending.type === 'permission' ? 'Approval needed on ' + escape(current.host.label) : 'Input requested'}</h3><pre>${escape(pending.question || text(pending.details || pending))}</pre>${pending.type === 'permission' ? `<p>Approve once applies only to this request on the selected computer.</p><button data-answer="approve" type="button">Approve once</button><button data-answer="deny" type="button">Deny</button>${run.permissionContext&&current.state.capabilities?.includes('chat.permissions.pending.v1')?`<button id="remote-pending-autoapprove" type="button" ${run.permissionContext.chatMode==='autopilot'?'disabled':''}>Auto-approve this chat and future continuations</button><p>This chat only, using existing granted resources. Workspace settings stay unchanged. Mandatory approvals still require a decision.</p>`:''}<div class="permission-options">${(pending.permissionChoices||[]).map(choice=>`<button type="button" data-answer="${escape(choice.value)}">${escape(choice.label)}</button>`).join('')}</div><p>Saved workspace approvals also apply to other chats and schedules with the same configuration, until revoked.</p><p>${escape(pending.permissionReason||'')}</p>` : `<form id="remote-answer" data-draft="${escape(answerKey)}"><label>Your answer<textarea name="answer" rows="3">${escape(answerDraft?.values.answer||'')}</textarea></label><div id="remote-question-attachments"></div><button type="submit">Send answer</button></form>`}</section>` : '';
    const lifecycleAllowed=current.state.capabilities?.includes('chat.lifecycle.v1')&&current.client?.status==='online',lifecycleBusy=['queued','running','awaiting_input'].includes(run?.status)||Number(run?.queuedMessageCount||run?.queuedMessages?.length||0)>0;
    const lifecycleControls=run&&lifecycleAllowed?`<div class="remote-chat-lifecycle">${run.chatType==='internet'?'<button id="remote-chat-promote" type="button">Promote to User Chat</button>':''}<button id="remote-chat-move" type="button">Move</button><button id="remote-chat-archive" type="button" ${lifecycleBusy?'disabled title="Finish or cancel this chat first"':''}>${run.archivedAt||run.archived?'Unarchive':'Archive'}</button><button id="remote-chat-delete" type="button" ${lifecycleBusy?'disabled title="Finish or cancel this chat first"':''}>Delete…</button></div>`:'';
    current.historyWindows ||= new Map();
    const eventStart=run?.eventStart||0;
    const renderStart=run?Math.max(eventStart,current.historyWindows.get(run.id)??eventStart+chatHistoryWindowStart(run.events||[])):0;
    const earlier=run&&renderStart>0;
    const chatHeader=run?`<header class="remote-chat-title"><div class="remote-chat-heading-copy">${workspaces.active?`<button class="remote-project-breadcrumb" data-open-current-project>${escape(workspaces.profile?.name||'Workspace')} › ${escape(workspaces.project?.name||'General')} · Open in project</button>`:''}<div class="eyebrow">${escape(run.provider||run.schedule?.provider||'')} / ${escape(run.id.slice(0,8))}</div><div class="remote-chat-title-line"><h1>${escape(run.title||run.schedule?.name||'Chat')}</h1>${current.state.capabilities?.includes('chat.rename.v1')?'<button id="remote-chat-rename" class="remote-title-edit" type="button" aria-label="Rename chat" title="Rename chat">✎</button>':''}</div><p class="muted">${escape(dateTime(run.createdAt,appPreferences.timezone))} · ${escape(run.nextModelOptions?.model||run.schedule?.model||((run.provider||run.schedule?.provider)==='rehearsal'?'Local rehearsal, no AI calls':'Provider default model'))} · ${escape(current.host.label)}</p></div><div class="remote-chat-heading-actions">${lifecycleControls}<span class="remote-chat-status">${escape(run.status)}${run.archivedAt||run.archived?' · Archived':''}</span></div></header>`:'';
    const history = run ? `${run.status==='queued'?`<p role="status">${escape(run.queueReason||'Preparing this chat…')}</p>`:''}<div class="remote-messages" data-run-id="${escape(run.id)}" data-window-start="${renderStart}" data-event-start="${eventStart}" data-event-count="${run.events?.length||0}">${earlier ? '<div id="remote-earlier-status" role="status">Earlier messages load as you scroll up</div>' : ''}${renderChatTimeline((run.events||[]).slice(renderStart-eventStart),run.provider||run.schedule?.provider,renderStart)}${Object.entries(run.liveMessages || {}).map(([id,message]) => `<article class="remote-message assistant" data-event-key="stream:${escape(id)}"><div class="eyebrow">Responding</div><pre>${escape(message)}</pre></article>`).join('')}</div>${waiting}${run.queuedMessages?.length ? `<section class="card"><h3>Queued messages</h3>${run.queuedMessages.map(message => `<p>${escape(message.prompt || message.text)} ${run.status==='running'&&run.chatControls?.steering&&!message.hasAttachments?`<button data-steer-queued="${escape(message.id)}" type="button">Steer now</button>`:''}${current.state.capabilities?.includes('chat.queue-edit.v1')?`<button data-edit-queued="${escape(message.id)}" type="button">Edit</button>`:''}<button data-unqueue="${escape(message.id)}" type="button">Remove</button></p>`).join('')}</section>` : ''}` : '';
    const composerSetup=run?'':workspaces.active?`<p>Workspace: ${escape(workspaces.profile?.name||workspaces.active.title)} · ${escape(current.host.label)}</p><input type="hidden" name="workspaceId" value="${escape(workspaces.active.id)}">${workspaces.active.projectId?`<input type="hidden" name="projectId" value="${escape(workspaces.active.projectId)}">`:''}<input type="hidden" name="includeDefaults" value="${escape(values.includeDefaults)}"><input type="hidden" name="agentId" value="${escape(workspaces.profile?.defaults?.agentId||'')}">${newInternet?`<input type="hidden" name="provider" value="${escape(values.provider)}">`:''}`:newInternet?`<label>Workspace<select name="workspaceId">${options(current.state.context.workspaces,values.workspaceId)}</select></label><input type="hidden" name="provider" value="${escape(values.provider)}">`:`<details class="remote-composer-setup" data-setup-disclosure ${draft.setupOpen!==false?'open':''}><summary>Chat setup · ${escape(current.host.label)}</summary><div class="remote-fields"><label>Run on<select id="remote-new-destination">${[...hosts.values()].map(host=>`<option value="${escape(host.hostId)}" ${host.hostId===active?'selected' : ''}>${escape(host.label)}</option>`).join('')}</select></label>${contextFields(values)}</div></details>`;
    const modeControl=run?`<input type="hidden" name="mode" value="queue">`:'';
    const attachmentsAvailable=current.state.capabilities?.includes('chat.attachments.v1');
    const attachmentStrip=attachmentsAvailable?`<div id="remote-attachment-strip" class="remote-attachment-strip">${renderAttachmentStrip(current,key,run?.schedule?.provider||values.provider)}</div><input id="remote-attachment-picker" type="file" multiple hidden>`:'';
    const attachmentButton=attachmentsAvailable?'<button id="remote-attach" type="button" class="remote-attach-button" aria-label="Add attachment" title="Add attachment">＋</button>':'';
    const nameField=run||newInternet?'':`<label class="remote-chat-name">Chat name (optional)<input name="name" type="text" maxlength="200" value="${escape(values.name||'')}" placeholder="Name this chat or leave blank for an automatic name"></label>`;
    const composerModels=!run&&newInternet?{model:'',provider:'',advanced:''}:modelFieldParts(values,'',!run);
    const submitControls=!run&&newInternet?internetProviders(current.state).map(id=>`<button type="submit" class="primary" data-search-provider="${escape(id)}">Search with ${escape(providerLabel(id))}</button>`).join(''):`<button type="submit" class="primary" data-submit-mode="queue">${run?(['running','awaiting_input','queued'].includes(run.status)?'Queue':'Send ↑'):'Start chat'}</button>`;
    const chatMode=current.activeChatPanel==='live'?'live':'conversation';
    const composerPrompt=run?`<div class="chat-prompt-label">${composerModeStatus(current)}<textarea name="prompt" aria-label="Follow-up message">${escape(values.prompt||'')}</textarea></div>`:field('prompt','Message',values.prompt,'textarea');
    const chatContent=history;
    const conversationCard=`<section class="card remote-chat-main ${run?'':'remote-new-chat'}">${run?'':`<h2>${newInternet?'Start an Internet Search':'Start a new chat'}</h2>`}${chatContent}<form id="remote-composer" data-draft="${escape(key)}">${composerSetup}${nameField}${!run&&!newInternet?'<section class="composer new-chat-composer">':''}${composerPrompt}${attachmentStrip}<div class="remote-composer-bottom"><div class="remote-composer-primary">${attachmentButton}${composerModels.provider}${composerModels.model}${composerModels.advanced}${modeControl}<div class="remote-composer-actions">${run?.status==='running'&&run.chatControls?.steering?'<button type="button" id="remote-steer">Steer</button>':''}${submitControls}${run&&['running','awaiting_input'].includes(run.status)?'<button id="remote-cancel" class="danger" type="button" title="Stop the active turn">Stop</button>':''}</div></div></div>${!run&&!newInternet?'</section>':''}</form></section>`;
    const conversation=run?`<div class="remote-chat-view">${chatHeader}<div class="remote-chat-body">${conversationCard}${renderChatDetails(run)}</div></div>`:conversationCard;
    replaceChatMarkup($('remote-content'),`<div class="remote-chat-layout">${run?documentTabs(current,run):workspaces.active?workspaces.nav():''}${run?renderChatPanel(current,run,conversation):conversation}</div>`,JSON.stringify([root.dataset.account,current.host.hostId,key,current.activeChatPanel||'conversation']));
    const formBindings=$('remote-composer');if(formBindings){formBindings.renderBindings?.abort();formBindings.renderBindings=new AbortController();}
    if(workspaces.active)workspaces.bindNav($('remote-content'));
    root.querySelector('[data-open-current-project]')?.addEventListener('click',()=>workspaces.selectWorkspace('chats'));
    if(!run)$('remote-composer')?.querySelector('[name=prompt]')?.setAttribute('placeholder','What would you like to work on?');
    const setup=$('remote-composer')?.querySelector('[data-setup-disclosure]');
    if(setup)setup.addEventListener('toggle',()=>{if(setup.isConnected&&session()===current){draft.setupOpen=setup.open;void persistCurrentDrafts();}},{signal:formBindings.renderBindings.signal});
    $('remote-chat-promote')?.addEventListener('click',async()=>{try{await command('chat.promote',{id:run.id,expectedUpdatedAt:run.updatedAt});await openChat(run.id);}catch(error){notice(error.message);}});
    $('remote-chat-move')?.addEventListener('click',()=>void moveWebsiteChat(current,run).catch(error=>notice(error.message)));
    $('remote-chat-archive')?.addEventListener('click',()=>{void lifecycleChat({hostId:current.host.hostId,id:run.id,status:run.status,queuedMessageCount:run.queuedMessages?.length||0,updatedAt:run.updatedAt,archivedAt:run.archivedAt,title:run.title},'chat.archive',{archived:!(run.archivedAt||run.archived)}).catch(error=>notice(error.message));});
    $('remote-chat-delete')?.addEventListener('click',()=>{if(!confirm(`Delete “${run.title||'Chat'}” from ${current.host.label}? This permanently removes the Proteus chat record on that computer. Generated files and provider originals are not deleted. This cannot be undone.`))return;void lifecycleChat({hostId:current.host.hostId,id:run.id,status:run.status,queuedMessageCount:run.queuedMessages?.length||0,updatedAt:run.updatedAt,archivedAt:run.archivedAt,title:run.title},'chat.delete').catch(error=>notice(error.message));});
    $('remote-chat-rename')?.addEventListener('click',()=>renameWebsiteChat(current,run));
    for(const [id,mode] of [['remote-chat-autoapprove','autopilot'],['remote-chat-inherit','inherit'],['remote-pending-autoapprove','autopilot']])$(''+id)?.addEventListener('click',async()=>{try{const permission=run.permissionContext;if(!permission||!current.state.capabilities?.includes('chat.permissions.chat.v1'))throw new Error('Update Proteus on this computer to change chat-only approval.');const updated=await command('chat.permissions',{id:run.id,scope:'chat',mode,expectedContextId:permission.id,expectedChatRevision:permission.chatRevision,...(pending?.type==='permission'?{expectedRequestId:pending.id}:{})});current.run=updated;render();}catch(error){notice(error.message);}});
    const documentView=root.querySelector('.remote-chat-document');if(documentView&&openDocument){documentView.dataset.documentId=openDocument.documentId;documentView.dataset.version=String(openDocument.version);documentView._documentContent=openDocument.content;}
    root.querySelectorAll('[data-search-provider]').forEach(button=>button.onclick=event=>{const id=button.dataset.searchProvider;if(!current.state.defaults.internetSearches?.[id]?.model){event.preventDefault();notice('Configure '+providerLabel(id)+' Internet Search defaults in Engine Room on '+current.host.label+' first.');return;}$('remote-composer').elements.namedItem('provider').value=id;draft.values.provider=id;});
    bindDraft('remote-composer', key, run ? 'chat.send' : 'chat.start', async (input, retained) => { if (!input.prompt?.trim()) throw new Error('Enter a message.'); const base=run?{ id: run.id, prompt: input.prompt, mode: input.mode, messageId: retained.id,...(retained.modelOptionsChanged&&input.mode!=='steer'?{modelOptions:{model:input.model||'',reasoningEffort:input.reasoningEffort||'',contextTier:input.contextTier||'',serviceTier:input.serviceTier||''}}:{}) }:newInternet?{chatType:'internet',provider:input.provider,workspaceId:input.workspaceId,projectId:input.projectId,prompt:input.prompt}:{ ...input, selectedIds: retained.selectedIds || workspaces.profile?.defaults?.selectedIds || [], includeDefaults: input.includeDefaults !== 'false' };return prepareAttachmentSend(current,run,key,retained,input,base); }, async result => { if (result.runId) await openChat(result.runId); });
    $('remote-steer')?.addEventListener('click',()=>{const form=$('remote-composer'),mode=form.elements.namedItem('mode');mode.value='steer';form.requestSubmit();mode.value='queue';},{signal:formBindings.renderBindings.signal});
    bindRemotePaths(root.querySelector('.remote-chat-details')||root,{notify:notice});
    if(run&&current.state?.capabilities?.includes('projects.v1'))bindWebChatPermissions(root.querySelector('.remote-chat-details'),{run,request:(method,args)=>commandForHost(current,method,args),refresh:updated=>{if(current.selected!==run.id)return;if(updated){current.run=mergeChatHistory(current.run,updated);preserveDrafts();render();}else return openChat(run.id);},workspace:()=>void workspaces.enter({hostId:current.host.hostId,id:run.permissionContext.workspaceId||run.schedule?.context?.workspaceId},'configuration').catch(error=>notice(error.message)),notify:notice});
    if(run&&current.state?.capabilities?.includes('chat.paths.v1'))bindRemoteDetails(root.querySelector('.remote-chat-details'),{run,request:(method,args)=>commandForHost(current,method,args),mutate:(method,args)=>commandForHost(current,method,args),refresh:()=>openChat(run.id),notify:notice,context:current.state.context});
    if(run)bindAllowancePreference(root,{run,command:values=>commandForHost(current,'chat.recover',{id:run.id,...values}),reload:()=>openChat(run.id),notify:notice});
    bindAttachmentControls($('remote-composer'),current,key,run);
    const chatComposer=$('remote-composer'),modelFooter=chatComposer?.querySelector('.remote-composer-primary');
    if(modelFooter){const models=modelFooter.querySelector('.composer-models')||document.createElement('div');models.className='composer-models';const controls=[...modelFooter.children].filter(node=>node.matches('label'));if(controls.length){controls[0].before(models);for(const node of controls)models.append(node);}mountChatComposer(chatComposer.querySelector('.new-chat-composer')||chatComposer,{pane:root.querySelector('.remote-new-chat')||undefined,textarea:chatComposer.querySelector('[name=prompt]'),models,actions:chatComposer.querySelector('.remote-composer-actions'),active:!!run&&['running','awaiting_input','queued'].includes(run.status)});}
    if(run){$('remote-composer')?.addEventListener('change',event=>{if(['model','reasoningEffort','contextTier','serviceTier'].includes(event.target.name))draft.modelOptionsChanged=true;},{signal:formBindings.renderBindings.signal});bindCatalog('remote-composer',key);}
    else if(!newInternet&&!workspaces.active){bindCatalog('remote-composer', key);$('remote-new-destination').onchange=async event=>{await connect(event.target.value);if(session()){session().run=null;session().selected=null;}render();};}
    if(run){const pane=root.querySelector('.remote-messages');if(pane){pane.scrollTop=current.scroll?.get(run.id)??previousScroll??pane.scrollHeight;const sameAnchor=anchor&&[...pane.querySelectorAll('[data-event-anchor]')].find(item=>item.dataset.eventAnchor===anchor.key);if(sameAnchor&&!followingLatest)pane.scrollTop+=sameAnchor.getBoundingClientRect().top-pane.getBoundingClientRect().top-anchor.offset;else if(followingLatest)pane.scrollTop=pane.scrollHeight;const reading=event=>{if(event.type==='wheel'&&event.deltaY>=0)return;if(event.type==='keydown'&&!['ArrowUp','PageUp','Home'].includes(event.key))return;const now=Date.now();if(now-(current.lastHistoryGesture||0)>100){current.historyGestureAvailable=true;current.lastHistoryGesture=now;}if(current.historyGestureAvailable&&earlier&&!current.earlierError&&pane.scrollTop<Math.max(240,pane.clientHeight*.65)){current.historyGestureAvailable=false;void loadEarlier();}};pane.addEventListener('wheel',reading,{passive:true});pane.addEventListener('touchstart',reading,{passive:true});pane.addEventListener('keydown',reading);pane.addEventListener('scroll',()=>{current.scroll ||= new Map();current.scroll.set(run.id,pane.scrollTop);if(pane.scrollTop<Math.max(240,pane.clientHeight*.65)&&earlier&&!current.earlierError&&current.historyGestureAvailable){current.historyGestureAvailable=false;void loadEarlier();}},{passive:true});}}
    const liveRoot=$('remote-live-browser');
    if(liveRoot){liveRoot.dataset.chat=run.id;const liveDraft=currentDraft('live:'+run.id,{text:''});current.stopLive=mountLiveBrowser(liveRoot,{chatId:run.id,pending:()=>current.run?.pending,draft:liveDraft.values,saveDraft:()=>void persistCurrentDrafts(),request:(method,args)=>{if(session()!==current||current.run?.id!==run.id)throw new Error('The selected chat changed.');return command(method,args);}});}
    if(liveRoot){const form=liveRoot.querySelector('form');form.id='remote-live-composer';const status=document.createElement('div');status.innerHTML=composerModeStatus(current);form.prepend(status.firstElementChild);}
    root.querySelectorAll('[data-chat-panel]').forEach(button=>button.onclick=event=>{if(event.target.closest('[data-close-browser]')){current.childOrder?.set(run.id,(current.childOrder.get(run.id)||[]).filter(item=>item.type!=='browser'));if(current.activeChatPanel==='browser')current.activeChatPanel='conversation';saveChildTabs(current,run.id);render();return;}preserveDrafts();stopDocumentPreview(current,run);current.activeChatPanel=button.dataset.chatPanel;saveChildTabs(current,run.id);render();});
    root.querySelectorAll('[data-chat-document]').forEach(button=>button.onclick=event=>{if(event.target.closest('[data-close-document]')){const id=button.dataset.chatDocument;if(current.documents?.get(run.id+':'+id)?.preview){current.dismissedPreviews ||= new Set();current.dismissedPreviews.add(run.id+':'+id);}stopDocumentPreview(current,run);releaseDocumentAssets(current.documents?.get(run.id+':'+id));current.documents?.delete(run.id+':'+id);current.childOrder?.set(run.id,(current.childOrder.get(run.id)||[]).filter(item=>item.documentId!==id));if(current.activeChatPanel===id)current.activeChatPanel='conversation';saveChildTabs(current,run.id);render();return;}preserveDrafts();stopDocumentPreview(current,run);current.activeChatPanel=button.dataset.chatDocument;saveChildTabs(current,run.id);render();});
    const childStrip=root.querySelector('.remote-inner-scroll');if(childStrip){let dragging=null;const children=()=>[...childStrip.querySelectorAll(':scope>button[data-chat-document],:scope>button[data-chat-panel=browser]')];children().forEach((button,index)=>{button.draggable=true;button.dataset.childIndex=index;});childStrip.addEventListener('scroll',()=>updateSubtabFade(childStrip),{passive:true});requestAnimationFrame(()=>updateSubtabFade(childStrip));childStrip.addEventListener('dragstart',event=>{const button=event.target.closest('[data-child-index]');if(!button)return;dragging=Number(button.dataset.childIndex);event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain','proteus-child-tab');button.classList.add('dragging');});childStrip.addEventListener('dragover',event=>{const button=event.target.closest('[data-child-index]');if(dragging===null||!button)return;event.preventDefault();button.classList.add('drop-target');if(event.clientX<childStrip.getBoundingClientRect().left+24)childStrip.scrollLeft-=18;else if(event.clientX>childStrip.getBoundingClientRect().right-24)childStrip.scrollLeft+=18;});childStrip.addEventListener('dragleave',event=>event.target.closest('[data-child-index]')?.classList.remove('drop-target'));childStrip.addEventListener('drop',event=>{const button=event.target.closest('[data-child-index]');event.preventDefault();if(button&&dragging!==null)moveChildTab(current,run,dragging,Number(button.dataset.childIndex));dragging=null;});childStrip.addEventListener('dragend',()=>{dragging=null;childStrip.querySelectorAll('.dragging,.drop-target').forEach(item=>item.classList.remove('dragging','drop-target'));});childStrip.addEventListener('keydown',event=>{const button=event.target.closest('[data-child-index]');if(!button||!event.ctrlKey||!event.shiftKey||!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();moveChildTab(current,run,Number(button.dataset.childIndex),Number(button.dataset.childIndex)+(event.key==='ArrowLeft'?-1:1));});}
    root.querySelectorAll('[data-close-document],[data-close-browser]').forEach(button=>button.onkeydown=event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();button.click();}});
    root.querySelector('.remote-inner-add')?.addEventListener('click',event=>{const action=event.target.closest('[data-chat-create]')?.dataset.chatCreate;if(!action)return;event.currentTarget.open=false;if(action==='browser'){preserveDrafts();stopDocumentPreview(current,run);current.childOrder ||= new Map();const tabs=current.childOrder.get(run.id)||[];if(!tabs.some(item=>item.type==='browser'))tabs.push({type:'browser'});current.childOrder.set(run.id,tabs);current.activeChatPanel='browser';saveChildTabs(current,run.id);render();}if(action==='markdown')document.dispatchEvent(new CustomEvent('proteus:choose-file'));});
    $('remote-chat-browser')?.addEventListener('submit',event=>{event.preventDefault();const query=new FormData(event.target).get('query').trim();let url;try{url=new URL(/^https?:\/\//i.test(query)?query:/^[\w.-]+\.[a-z]{2,}(?:[/:]|$)/i.test(query)?'https://'+query:'https://www.google.com/search?q='+encodeURIComponent(query));}catch{notice('Enter a valid URL or search.');return;}if(!['http:','https:'].includes(url.protocol)){notice('Only http and https addresses are supported.');return;}window.open(url.href,'_blank','noopener,noreferrer');void recordBrowserVisit(url.href,url.hostname,current.host.hostId).catch(error=>notice(error.message));});
    if(run&&current.activeChatPanel&&current.activeChatPanel!=='conversation'&&current.activeChatPanel!=='browser'){
        const item=current.documents?.get(run.id+':'+current.activeChatPanel),target=$('remote-document-markdown');
        if(item&&target)mountMarkdown(target,item.content,{allowExternalImages:false,copy:value=>navigator.clipboard.writeText(value),link:url=>{
            if(/^https?:\/\//i.test(url)){if(isLoopbackPreview(url))void openSharedPreview(current,run,url).catch(error=>notice(error.message));else window.open(url,'_blank','noopener,noreferrer');return;}
            const linked=item.links?.find(link=>link.source===url);
            if(!linked||!item.approvedRequestId){notice('This document link needs a separate authorized read on the computer.');return;}
            const existing=current.documents?.get(run.id+':'+linked.documentId);
            if(existing?.content&&existing.version){current.activeChatPanel=linked.documentId;saveChildTabs(current,run.id);render();return;}
            void openChatDocument(current,run,{parentDocumentId:item.documentId,fromRequestId:item.approvedRequestId,relativePath:url}).catch(error=>notice(error.message));
        },image:source=>documentAsset(current,run,item,source)});
        const frame=$('remote-html-frame');if(item&&frame){
            const html=item.mediaType==='text/html'||/\.html?$/i.test(item.title||'')?item.content:item.content.match(/^\s*```html\s*\n([\s\S]*?)\n```/im)?.[1]||'';
            const approvalKey=run.id+':'+item.documentId+':'+item.version;
            const updatePreview=()=>{const enabled=current.previewApprovals?.has(approvalKey)===true;
                const revision=crypto.randomUUID();frame.dataset.previewRevision=revision;
                // A separate, trusted shell has its own CSP. Its frame-src 'none' blocks
                // artifact-initiated navigation without weakening the main app CSP.
                frame.setAttribute('sandbox','allow-scripts');
                frame.onload=()=>{void materializeDocumentHTML(current,run,item,html).then(materialized=>{if(frame.isConnected&&frame.dataset.previewRevision===revision&&current.documents?.get(run.id+':'+item.documentId)===item)frame.contentWindow?.postMessage({type:'proteus:preview',html:materialized,enabled},'*');}).catch(error=>notice(error.message));};
                frame.src='/remote/preview-shell?revision='+crypto.randomUUID();
                $('remote-preview-enable').hidden=enabled;$('remote-preview-stop').hidden=!enabled;};
            $('remote-preview-enable').onclick=()=>{current.previewApprovals ||= new Set();current.previewApprovals.add(approvalKey);updatePreview();};
            $('remote-preview-stop').onclick=()=>{current.previewApprovals?.delete(approvalKey);updatePreview();};
            updatePreview();
        }
    }
    $('remote-document-reselect')?.addEventListener('click',()=>{const item=current.documents?.get(run.id+':'+current.activeChatPanel);if(!item)return;if(item.source==='local'){current.reselectDocumentId=item.documentId;document.dispatchEvent(new CustomEvent('proteus:choose-file'));}else notice('This document needs an approved read from its owning computer.');});
    $('remote-document-refresh')?.addEventListener('click',()=>{const item=current.documents?.get(run.id+':'+current.activeChatPanel);if(item?.source==='remote')void openChatDocument(current,run,{documentId:item.documentId,...(item.parentDocumentId&&item.relativePath?{parentDocumentId:item.parentDocumentId,relativePath:item.relativePath}:{})}).catch(error=>notice(error.message));});
    current.activityOpen ||= new Set();current.activityDisclosures ||= new Set();
    root.querySelectorAll('[data-activity-start]').forEach(details=>{
        const key=run.id+':'+details.dataset.activityStart,body=details.querySelector('.remote-activity-items');
        const populate=()=>{const first=Number(details.dataset.activityStart)-(run.eventStart||0),end=Number(details.dataset.activityEnd)-(run.eventStart||0),signature=JSON.stringify(run.events.slice(first,end));if(body.childElementCount&&body.activitySignature===signature)return;rememberActivityDisclosures(current,body);body.activitySignature=signature;body.innerHTML=run.events.slice(first,end).map((event,index)=>event.data?.permission?renderAutomaticApproval(event):event.data?.tool||(event.role||event.type)==='tool'?renderToolEvent(event):renderChatEvent(event,first+index,run.provider||run.schedule?.provider,run.eventStart||0)).join('');[...body.children].forEach((row,index)=>row.querySelectorAll('details').forEach((child,detailIndex)=>{child.dataset.activityDisclosure=run.id+':'+((run.eventStart||0)+first+index)+':'+detailIndex;child.open=current.activityDisclosures.has(child.dataset.activityDisclosure);}));bindWebRuntime(current,run);mountEventMarkdown(body,current,run);};
        details.open=current.activityOpen.has(key);if(details.open)populate();
        details.ontoggle=()=>{if(details.open){current.activityOpen.add(key);populate();}else{current.activityOpen.delete(key);rememberActivityDisclosures(current,body);body.replaceChildren();}};
    });
    mountEventMarkdown(root,current,run);
    for (const element of root.querySelectorAll('[data-markdown-event]')) {
        const index=Number(element.dataset.markdownEvent), event=run.events[index-(run.eventStart||0)];
        if ((event.role||event.type)!=='assistant'||['tool','reasoning','thinking'].includes(event.type)||event.streaming||event.data?.reasoning||event.data?.tool||typeof event.text!=='string'||!event.text.trim()) continue;
        const actions=element.parentElement.querySelector(':scope > .message-actions')||document.createElement('div');if(!actions.parentElement)element.after(actions);
        const identity=event.id ?? index;
        actions.dataset.messageKey=JSON.stringify([root.dataset.account,current.host.hostId,run.id,identity]);
        mountMessageActions(actions,{key:actions.dataset.messageKey,text:event.text,rendered:element,notify:notice});
    }
    root.querySelectorAll('[data-run]').forEach(button => button.onclick = () => openChat(button.dataset.run,button.dataset.runHost).catch(error => notice(error.message)));
    $('remote-more-runs')?.addEventListener('click', async () => { try { const older = await command('runs.list', { offset: (current.state.runs||[]).length }); current.state.runs.push(...older); preserveDrafts(); render(); } catch (error) { notice(error.message); } });
    function prefetchHistory(force=false){
        if(!run||!eventStart||!force&&current.historyPrefetchFailedAt===eventStart)return null;
        const key=run.id+':'+eventStart;
        if(current.historyPrefetch?.key!==key){current.historyPrefetch={key,promise:command('chat.get',{id:run.id,offset:run.eventCount-eventStart,beforeEvent:eventStart})};current.historyPrefetch.promise.catch(()=>{current.historyPrefetchFailedAt=eventStart;if(current.historyPrefetch?.key===key)current.historyPrefetch=null;});}
        return current.historyPrefetch.promise;
    }
    const historyPane=root.querySelector('.remote-messages');
    historyPane?.addEventListener('scroll',()=>{if(earlier&&renderStart-eventStart<40&&historyPane.scrollTop<historyPane.clientHeight*2)prefetchHistory();},{passive:true});
    async function loadEarlier(){
        if(current.loadingEarlier||!earlier||current.run?.id!==run.id)return;
        const pane=root.querySelector('.remote-messages'),status=$('remote-earlier-status');if(!pane)return;
        const oldHeight=pane.scrollHeight,oldTop=pane.scrollTop;current.loadingEarlier=true;current.earlierError=false;if(status)status.textContent='Loading earlier messages…';
        try{if(renderStart>eventStart){current.historyWindows.set(run.id,eventStart+chatHistoryWindowStart(run.events||[],renderStart-eventStart));}else{const older=await prefetchHistory(true);current.historyPrefetch=null;current.historyPrefetchFailedAt=null;if(current.run?.id!==run.id)return;current.historyWindows.set(run.id,(older.eventStart||0)+chatHistoryWindowStart(older.events||[]));current.run=mergeChatHistory(current.run,older);}render();const next=root.querySelector('.remote-messages');if(next){next.scrollTop=oldTop+next.scrollHeight-oldHeight;current.scroll ||= new Map();current.scroll.set(run.id,next.scrollTop);}
        }catch(error){current.earlierError=true;if(status){status.innerHTML='<button id="remote-earlier-retry" type="button">Retry loading earlier messages</button>';$('remote-earlier-retry').onclick=()=>void loadEarlier();}notice(error.message);}finally{current.loadingEarlier=false;}
    }
    requestAnimationFrame(()=>{const pane=root.querySelector('.remote-messages');if(pane&&run&&current.run?.id===run.id&&!current.earlierError&&pane.scrollHeight<=pane.clientHeight+80)void loadEarlier();});
    if(run&&historyPane){
        const answerQuestion=async(question,answer,messageId)=>{await command(question.blocking?'chat.reply':'chat.answer-question',{id:run.id,answer,messageId,...(question.blocking?{requestId:question.id}:{questionId:question.id})});await openChat(run.id);};
        // The transcript owns this queue's bounds. Reusing the pending-input grid
        // row would overlap the existing answer/permission form in docked chats.
        let queue=historyPane.querySelector(':scope>.user-question-queue');if(!queue){queue=document.createElement('div');queue.className='user-question-queue';historyPane.prepend(queue);}
        mountQuestionQueue(queue,run,{answer:answerQuestion,notify:notice,jump:async question=>{
            const card=[...root.querySelectorAll('[data-question-id]')].find(node=>node.dataset.questionId===question.id);
            if(card){card.scrollIntoView({block:'center'});card.querySelector('textarea')?.focus({preventScroll:true});return;}
            const before=current.historyWindows?.get(run.id)??renderStart;await loadEarlier();
            const after=current.historyWindows?.get(run.id)??renderStart;
            if(after<before){await root.querySelector('.user-question-queue')?.questionActions.jump(question);}else notice('Load earlier messages to view this question.');
        }});
        const questions=chatQuestions(run),ids=new Set(questions.map(question=>question.id));
        for(const card of root.querySelectorAll('.user-question-card'))if(!ids.has(card.dataset.questionId))card.remove();
        for(const question of questions){
            const row=root.querySelector(`[data-event-key="${question.eventIndex}"]`);if(!row)continue;
            let card=[...row.querySelectorAll(':scope>.user-question-card')].find(node=>node.dataset.questionId===question.id);if(!card){card=document.createElement('div');row.append(card);}mountQuestionCard(card,question,{key:current.host.hostId+':'+run.id+':'+question.id,answer:answerQuestion,notify:notice});
        }
    }
    const questionAttachments=mountQuestionAttachments({key:current.host.hostId+':'+answerKey,host:$('remote-question-attachments'),textarea:$('remote-answer')?.querySelector('textarea'),providerId:run?.schedule?.provider,mediaTypes:current.state.questionAttachmentMediaTypes||{},destination:current.host.label+' · '+run?.title,chatId:run?.id,requestId:pending?.id,send:(action,args)=>command('chat.attachments.'+action,args),notify:notice});
    let answering=false;const answer = async value => { if(answering)return;answering=true;try { const delivery=pending.type==='permission'?{}:await questionAttachments.payload(value);await command('chat.reply', { id: run.id, requestId: pending.id, answer: value,...delivery });questionAttachments.clear();current.drafts.delete(answerKey);if(view==='chats'&&current.selected===run.id)await openChat(run.id);else await refresh(); } catch (error) { notice(error.message); } finally {answering=false;} };
    root.querySelectorAll('[data-answer]').forEach(button => button.onclick = () => answer(button.dataset.answer));
    $('remote-answer')?.addEventListener('input',event=>{answerDraft.values.answer=new FormData(event.currentTarget).get('answer');});
    $('remote-answer')?.addEventListener('submit', event => { event.preventDefault(); answer(new FormData(event.target).get('answer')); });
    $('remote-cancel')?.addEventListener('click', async () => { try { await command('chat.cancel', { id: run.id }); await openChat(run.id); } catch (error) { notice(error.message); } },{signal:formBindings.renderBindings.signal});
    root.querySelectorAll('[data-steer-queued]').forEach(button=>button.onclick=async()=>{try{await command('chat.steer-queued',{id:run.id,messageId:button.dataset.steerQueued});await openChat(run.id);}catch(error){notice(error.message);}});
    root.querySelectorAll('[data-edit-queued]').forEach(button=>button.onclick=()=>editQueuedMessage(current,run,run.queuedMessages.find(m=>m.id===button.dataset.editQueued)));
    root.querySelectorAll('[data-unqueue]').forEach(button => button.onclick = async () => { try { await command('chat.remove-queued', { id: run.id, messageId: button.dataset.unqueue }); await openChat(run.id); } catch (error) { notice(error.message); } });
}
function renderSchedules(current) {
    const schedules=(current.state.schedules||[]).filter(item=>!transcriptionOnly||item.integration?.type==='omi'||item.provider==='local-process');
    const schedule = (current.state.schedules || []).find(s => s.id === current.scheduleId); const key = schedule ? 'schedule:' + schedule.id : null; const draft = schedule ? currentDraft(key, { ...schedule, enabled: String(schedule.enabled), expectedRevision: schedule.revision }) : null;
    $('remote-content').innerHTML = `<div class="remote-chat-layout"><aside class="card"><h2>${transcriptionOnly?'Transcription':'Schedules'}</h2>${schedules.map(s => `<button class="remote-schedule-item" type="button" data-schedule="${escape(s.id)}"><strong>${escape(s.name)}</strong><small>${s.enabled ? 'Enabled' : 'Disabled'} · ${escape(s.cron)}</small></button>`).join('') || '<p>No schedules configured on this computer.</p>'}</aside><section class="card">${schedule ? `<h2>${escape(schedule.name)}</h2>${schedule.source?.manifest || schedule.provider === 'local-process' ? '<p>This schedule is owned by its source repository. Update that source on the computer.</p>' : `<form id="remote-schedule-form" data-draft="${escape(key)}"><div class="remote-fields">${field('name', 'Name', draft.values.name)}<label>Status<select name="enabled"><option value="false" ${draft.values.enabled === 'false' ? 'selected' : ''}>Disabled</option><option value="true" ${draft.values.enabled === 'true' ? 'selected' : ''}>Enabled</option></select></label>${field('cron', 'Cron expression', draft.values.cron)}${field('timezone', 'Time zone', draft.values.timezone)}${modelFields(draft.values)}</div>${field('prompt', 'Instructions', draft.values.prompt, 'textarea')}<button type="button" id="remote-preview">Preview timing</button><button class="primary" type="submit">Save schedule</button><pre id="remote-timing"></pre></form>`}<button id="remote-run-schedule" type="button">Run once on ${escape(current.host.label)}</button><p>${escape(schedule.nextRuns?.join('\n') || '')}</p>` : '<h2>Choose a schedule</h2><p>Edits use the current computer revision. Repository-owned schedules remain controlled by their source.</p>'}</section></div>`;
    root.querySelectorAll('[data-schedule]').forEach(button => button.onclick = () => { void openSchedule(button.dataset.schedule).catch(error=>notice(error.message)); });
    if ($('remote-schedule-form')) { bindDraft('remote-schedule-form', key, 'schedule.save', input => ({ id: schedule.id, expectedRevision: draft.values.expectedRevision, changes: { ...input, enabled: input.enabled === 'true' } })); bindCatalog('remote-schedule-form', key); $('remote-preview').onclick = async () => { try { const input = Object.fromEntries(new FormData($('remote-schedule-form'))); $('remote-timing').textContent = text(await command('schedule.preview', { cron: input.cron, timezone: input.timezone })); } catch (error) { notice(error.message); } }; }
    $('remote-run-schedule')?.addEventListener('click', async () => { try { const result = await command('schedule.run', { id: schedule.id }); await openChat(result.runId); } catch (error) { notice(error.message); } });
}
function renderWorkspaces(){workspaces.render($('remote-content'));}
$('remote-use-default')?.addEventListener('click',()=>{if(appPreferences.defaultMacId)void connect(appPreferences.defaultMacId);else notice('Choose a Default computer in Engine Room first.');});
$('remote-host').onchange = event => connect(event.target.value);
$('remote-connect').onclick = () => connect($('remote-host').value);
$('remote-disconnect').onclick = () => { preserveDrafts(); ++switching;stopReconnect();suppressed.add(active);const current=session(),client=current?.client;if(current){current.client=null;current.state=null;current.run=null;}client?.close();writePreferences({ selectedHost:active,autoConnect:false });render(); };
$('remote-revoke').onclick=async()=>{const host=hosts.get(active),current=session();if(!host||current?.client?.status!=='online'){notice('Connect this computer to revoke access. Offline revocation is not confirmed.');return;}if(!confirm('Revoke this website account’s device access on '+host.label+'? A fresh pairing will be required.'))return;const client=current.client;try{await verifyWebsite();await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{client.removeEventListener('revoked',done);reject(new Error('The computer did not confirm revocation. Saved pairing was retained.'));},15000);const done=event=>{if(event.detail?.authenticated===true&&event.detail.deviceId===current.host.deviceId){clearTimeout(timeout);client.removeEventListener('revoked',done);resolve();}};client.addEventListener('revoked',done);client.request('connection.revoke',{deviceId:current.host.deviceId}).catch(()=>{});});if(host.source==='account')await accountStore.remove(host);else await legacyStore.remove(host.hostId);clearChatIndex(root.dataset.account,host.hostId);clearChatDrafts(root.dataset.account,host.hostId);hosts.delete(host.hostId);sessions.delete(host.hostId);active='';render();notice('The computer confirmed revocation and its saved account destination was removed.');}catch(error){notice(error.message);}};
$('remote-forget').onclick = async () => {
    const id=active,host=hosts.get(id);if(!host)return;
    const scope=host.source==='account'?'your account (all browsers)':'this browser only';
    if(!confirm(`Forget ${host.label} from ${scope}? This does not revoke its device key on the computer.`))return;
    try {
        await verifyWebsite();if(host.source==='account')await accountStore.remove(host);else await legacyStore.remove(id);
        await legacyStore.remove(id).catch(()=>{});const wasActive=active===id;if(wasActive){++switching;stopReconnect();active='';writePreferences({selectedHost:'',autoConnect:false});}const forgotten=sessions.get(id);clearChatIndex(root.dataset.account,id);clearChatDrafts(root.dataset.account,id);sessions.delete(id);hosts.delete(id);forgotten?.client?.close();destinationOptions();render();
    } catch(error){if(error.sessionInvalid)await endAccount();else notice(error.message);}
};
root.querySelectorAll('[data-remote-view]').forEach(button => button.onclick = () => { preserveDrafts();attentionOnly=false;transcriptionOnly=false; if(button.dataset.remoteView==='chats')chatMode='index';setView(button.dataset.remoteView); render(); });
document.addEventListener('click', event => {
    const link = event.target.closest('a[href]'); if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === '_blank') return;
    const url = new URL(link.href); const requested = url.searchParams.get('view');
    if (url.origin === location.origin && url.pathname === location.pathname && sectionNames.includes(requested)) { event.preventDefault(); preserveDrafts();if(requested==='workspaces'&&url.searchParams.has('workspace')){void workspaces.enter({hostId:url.searchParams.get('host'),id:url.searchParams.get('workspace')}).catch(error=>notice(error.message));return;}workspaces.leave();if(requested==='chats'){if(url.searchParams.has('chat')){void openChat(url.searchParams.get('chat'),url.searchParams.get('host'),url.searchParams.get('panel')).catch(error=>notice(error.message));return;}if(url.searchParams.has('new')){newInternet=url.searchParams.get('type')==='internet';void newChat();return;}selectChatType(url.searchParams.get('type')==='internet'?'internet':'user');chatMode='index';}if(requested==='schedules'&&url.searchParams.has('schedule')){void openSchedule(url.searchParams.get('schedule'),url.searchParams.get('host')).catch(error=>notice(error.message));return;}attentionOnly=url.searchParams.get('attention')==='1';transcriptionOnly=url.searchParams.get('transcription')==='1'; setView(requested); render(); }
});
window.addEventListener('popstate', () => { const requested = new URLSearchParams(location.search).get('view'); preserveDrafts();if(!consumeFragment())setView(requested);render(); });
$('remote-pair-form').onsubmit = async event => {
    event.preventDefault(); const code = $('remote-pair-code').value; const button = event.target.querySelector('button'); button.disabled = true; notice('');
    try { const capsule = parsePairing(code); if (capsule.relay !== root.dataset.relay) throw new Error('This invitation uses a different relay. Configure the computer for this website’s relay before pairing.');
        const host = { hostId: capsule.hostId, relay: capsule.relay, inviteKey: capsule.key, expiresAt:capsule.expiresAt, label: typeof capsule.label==='string'&&capsule.label.trim()&&capsule.label.length<=80&&!/[\x00-\x1f\x7f]/.test(capsule.label)?capsule.label.trim():'computer '+capsule.hostId.slice(0,8), cursor: '' };
        await verifyWebsite();let saved;
        const pair = new BrowserRemoteClient(host, { name: 'Proteus website account', onCredential: async record => {saved=await accountStore.saveCredential(record);} });
        pair.addEventListener('stage',event=>notice(event.detail.message));pendingPairs.add(pair);
        try { await pair.connect();if(ended||suspended)throw new Error('Sign in again before using the saved destination.');hosts.set(host.hostId,saved);await legacyStore.remove(host.hostId).catch(()=>{});const old=sessions.get(host.hostId);if(old){old.client?.close();sessions.delete(host.hostId);}} finally { pendingPairs.delete(pair);pair.close(); }
        $('remote-pair-code').value='';$('remote-pair-panel').open = false;chatMode='index';setView('chats');await connect(host.hostId);
    } catch (error) { notice(error.message); } finally { button.disabled = false; }
};
function consumeFragment() {
    const fragment = new URLSearchParams(location.hash.slice(1)).get('pair');
    if (location.hash) history.replaceState(null, '', location.pathname + '?view=' + view+(attentionOnly&&view==='chats'?'&attention=1':'')+(transcriptionOnly&&view==='schedules'?'&transcription=1':''));
    if (fragment) { $('remote-pair-code').value = fragment; $('remote-pair-panel').open = true;setView('connections');render(); }
    return !!fragment;
}
const workspaces=createWebWorkspaces({account:root.dataset.account,hosts,sessions,escape,notify:notice,request:commandForHost,connect,preserve:preserveDrafts,setView,render,openChat,newChat:async(internet,scope)=>{newInternet=internet;await newChat(scope);},defaultHost:()=>appPreferences.defaultMacId,rows:aggregateChats,renderIndex:(container,scope)=>renderChatIndex(container,{rows:scope.rows||aggregateChats(),hosts:[...hosts.values()],escape,time:value=>dateTime(value,appPreferences.timezone),timezone:appPreferences.timezone,workspaceScope:scope,open:scope.open,refresh:()=>void refreshAggregate(true).then(render),loadMore:loadMoreChats,hasMore:[...sessions.values()].some(s=>(s.state?.runs?.length||0)<(s.state?.runCount||0)),move:row=>moveWebsiteChat(sessions.get(row.hostId),row),archive:(row,archived)=>lifecycleChat(row,'chat.archive',{archived}),remove:row=>lifecycleChat(row,'chat.delete'),rename:row=>renameWebsiteChat(sessions.get(row.hostId),row),onShowArchived:shown=>shown?loadArchivedChats(true):render(),onError:error=>notice(error.message)})});
document.addEventListener('proteus:chat-send-workspace',event=>{event.detail.handled=true;void(async()=>{let row=aggregateChats().find(r=>r.id===event.detail.id&&r.hostId===event.detail.hostId);if(!row?.workspaceId){await connect(event.detail.hostId);const run=await commandForHost(sessions.get(event.detail.hostId),'chat.get',{id:event.detail.id});row={...run,hostId:event.detail.hostId,workspaceId:run.workspaceId||run.context?.workspaceId||run.schedule?.context?.workspaceId,workspaceName:run.workspaceName||run.context?.workspaceName||run.schedule?.context?.workspaceName};}if(!row.workspaceId)throw Error('This chat has no workspace.');await workspaces.sendChat(row);})().catch(error=>notice(error.message));});
consumeFragment(); setView(view); window.addEventListener('hashchange', consumeFragment);
async function endAccount() {
    workspaces.clear();
    if(ended)return;stopMessageSpeech();ended=true;globalThis.proteusSigningOut=true;clearChatIndex(root.dataset.account);clearChatDrafts(root.dataset.account);++switching;stopReconnect();stopLifecycle();try{localStorage.removeItem(preferenceKey);localStorage.removeItem(chatTabKey);localStorage.removeItem(childTabKey);}catch{}
    for(const pair of pendingPairs)pair.close();pendingPairs.clear();for(const current of sessions.values())current.client?.close();sessions.clear();hosts.clear();active='';
    await legacyStore.clear().catch(()=>{});legacyStore.close();render();destinationOptions();notice('Signed out. Sign in again to restore destinations saved to your account. Browser-only pairings were removed.');
}
function stopLifecycle(){clearInterval(sessionTimer);clearInterval(usageTimer);channel?.close();channel=null;}
function startLifecycle(){
    stopLifecycle();channel=new BroadcastChannel('proteus-remote-account');channel.onmessage=event=>{if(event.data?.type==='logout'&&event.data.account===root.dataset.account)void endAccount();};
    sessionTimer=setInterval(()=>{void verifyWebsite().catch(()=>{});},60_000);
    usageTimer=setInterval(()=>{if(!document.hidden)void refreshUsage();},60_000);
}

function bindRevocation(client,hostId,current){client.addEventListener('revoked',event=>{if(event.detail?.authenticated!==true||event.detail.deviceId!==current.host.deviceId)return;suppressed.add(hostId);clearChatIndex(root.dataset.account,hostId);clearChatDrafts(root.dataset.account,hostId);current.cachedRuns=[];current.state=null;current.run=null;if(active===hostId){stopReconnect();notice('This computer confirmed that its device access was revoked. Pair again to reconnect.');render();}});client.addEventListener('rejected',()=>{suppressed.add(hostId);current.rejected=true;current.state=null;if(active===hostId){notice('Connection rejected. Saved pairing was retained; no authenticated revocation was received.');render();}});}
function aggregateChats(){return [...sessions.entries()].flatMap(([hostId,current])=>(chatIndexShowsArchived()&&current.archivedRuns||current.state?.runs||current.cachedRuns||[]).map(run=>({...currentChatStatus(hostId,run),...(current.state?.workspaceProjects?.memberships?.[run.id]||{}),hostId,hostLabel:hosts.get(hostId)?.label||'computer',cached:current.client?.status!=='online',lastSyncAt:current.lastSyncAt,lifecycleSupported:current.client?.status==='online'&&current.state?.capabilities?.includes('chat.lifecycle.v1'),renameSupported:current.client?.status==='online'&&current.state?.capabilities?.includes('chat.rename.v1')}))).sort((a,b)=>Date.parse(b.updatedAt||b.createdAt||0)-Date.parse(a.updatedAt||a.createdAt||0));}
async function loadArchivedChats(reset=false){
    await verifyWebsite();await Promise.all([...sessions.values()].filter(current=>current.client?.status==='online'&&current.state?.capabilities?.includes('chat.lifecycle.v1')).map(async current=>{
        if(current.archivedRuns&&!reset)return;
        const client=current.client,generation=(current.archiveFetchGeneration||0)+1;current.archiveFetchGeneration=generation;
        const rows=await client.request('runs.list',{offset:0,limit:100,includeArchived:true});
        if(ended||suspended||current.client!==client||current.archiveFetchGeneration!==generation)return;current.archivedRuns=rows;
    }));render();
}
function applyChatLifecycle(current,hostId,change){
    if(!change?.id)return;
    if(current.archivedRuns)current.archivedRuns=change.deleted?current.archivedRuns.filter(row=>row.id!==change.id):current.archivedRuns.map(row=>row.id===change.id?{...row,...change}:row);
    if(!change.deleted){if(current.run?.id===change.id)Object.assign(current.run,change);return;}
    if(current.state?.runs)current.state.runs=current.state.runs.filter(row=>row.id!==change.id);
    if(current.cachedRuns)current.cachedRuns=current.cachedRuns.filter(row=>row.id!==change.id);
    chatTabs.delete(hostId+':'+change.id);saveChatTabs();delete savedChildTabs[hostId+':'+change.id];try{localStorage.setItem(childTabKey,JSON.stringify(savedChildTabs));}catch{}
    for(const item of current.documents?.values()||[])if(item.chatId===change.id)releaseDocumentAssets(item);
    current.documents&&[...current.documents.keys()].filter(key=>key.startsWith(change.id+':')).forEach(key=>current.documents.delete(key));
    current.childOrder?.delete(change.id);current.drafts?.delete('reply:'+change.id);current.scroll?.delete(change.id);
    if(current.selected===change.id){current.run=null;current.selected=null;current.activeChatPanel='conversation';if(active===hostId)chatMode='index';}
}
async function lifecycleChat(row,method,extra={}){
    const current=sessions.get(row.hostId),client=current?.client;
    if(client?.status!=='online'||!current.state?.capabilities?.includes('chat.lifecycle.v1'))throw new Error('Connect and update this chat’s computer before managing it.');
    if(['queued','running','awaiting_input'].includes(row.status)||Number(row.queuedMessageCount||0)>0)throw new Error('Finish or cancel this chat before managing it.');
    await verifyWebsite();if(ended||suspended||current.client!==client)throw new Error('The destination changed.');
    const mutation=await client.request(method,{id:row.id,...extra,...(row.updatedAt?{expectedUpdatedAt:row.updatedAt}:{}),...(row.archivedAt?{expectedArchivedAt:row.archivedAt}:{})});
    if(ended||suspended||current.client!==client)throw new Error('The destination changed. Refresh to review the result.');
    applyChatLifecycle(current,row.hostId,mutation);
    const result=await client.request('sync',{cursor:''});if(ended||suspended||current.client!==client)return;
    current.state=result.state;current.cachedRuns=result.state.runs||[];if(!chatIndexShowsArchived())current.archivedRuns=null;current.lastSyncAt=new Date().toISOString();void saveChatIndex(root.dataset.account,current.host,current.cachedRuns).catch(()=>{});
    if(chatIndexShowsArchived())await loadArchivedChats(true);else render();
}
function renderRecentChats(){
 for(const [id,current] of sessions)observeRunningChats(id,'remote',current.state,current.client?.status==='online');
 const feature=workspaces.active?'workspaces':attentionOnly&&view==='chats'?'attention':transcriptionOnly&&view==='schedules'?'transcription':view==='chats'&&selectedChatType()==='internet'?'internet':view==='connections'?'engine-room':view;document.body.dataset.activeFeature=feature;
 document.querySelectorAll('[data-shell-nav]').forEach(link=>{const selected=link.dataset.shellNav===feature;link.classList.toggle('active',selected);if(selected)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
 workspaces.renderRecents();
 const attention=$('shell-recent-attention');if(attention){attention.hidden=!attentionOnly||view!=='chats';const items=[...attentionRows(),...aggregateChats().filter(row=>row.attentionRequired).map(row=>({id:'chat:'+row.id,kind:'chat',title:row.title,hostId:row.hostId,chatId:row.id,at:row.updatedAt}))].sort((a,b)=>String(b.at||'').localeCompare(String(a.at||''))).slice(0,7);attention.replaceChildren();for(const item of items){const link=document.createElement('a');link.href='/remote?view=chats&attention=1';link.className='web-tree-item';link.innerHTML=recentItemMarkup({...item,type:'chat',lastActivityAt:item.at});link.onclick=event=>{event.preventDefault();if(item.kind==='chat')void openChat(item.chatId,item.hostId).catch(error=>notice(error.message));else{attentionPanel='notifications';chatMode='index';render();}};attention.append(link);}}

 for(const [kind,id] of [['user','shell-recent-chats'],['internet','shell-recent-internet'],['scheduled','shell-recent-schedules']]){
  const target=$(id);if(!target)continue;const activeType=chatMode==='chat'&&session()?.run?chatType(session().run):selectedChatType();target.hidden=attentionOnly||workspaces.active|| (kind==='scheduled'?!(view==='schedules'||view==='chats'&&activeType==='scheduled'):view!=='chats'||activeType!==kind);
  const rows=aggregateChats().filter(run=>!(run.archivedAt||run.archived)&&chatType(run)===kind).slice(0,7);
  target.innerHTML=rows.map(run=>`<a class="web-tree-item ${run.status==='running'?'chat-running':''} ${view==='chats'&&chatMode==='chat'&&active===run.hostId&&session()?.selected===run.id?'active':''}" href="/remote?view=chats&host=${encodeURIComponent(run.hostId)}&chat=${encodeURIComponent(run.id)}" data-recent-chat="${escape(run.id)}" data-recent-host="${escape(run.hostId)}">${recentItemMarkup({...run,type:'chat'})}</a>`).join('');
  target.querySelectorAll('[data-recent-chat]').forEach(link=>link.onclick=event=>{event.preventDefault();void openChat(link.dataset.recentChat,link.dataset.recentHost,null,null).catch(error=>notice(error.message));});
 }
}
function renderChatTabs(){
    let changed=false;for(const tab of chatTabs.values()){const latest=(sessions.get(tab.hostId)?.state?.runs||[]).find(r=>r.id===tab.id);if(latest?.title){const title=chatTabTitle(latest.title);if(tab.title!==title){tab.title=title;changed=true;}}}if(changed)saveChatTabs();
    document.dispatchEvent(new CustomEvent('proteus:chat-tabs',{detail:{tabs:[...chatTabs.values()].map(tab=>({...tab,label:hosts.get(tab.hostId)?.label||'computer'})),active:!workspaces.active&&view==='chats'&&chatMode==='chat'?{hostId:active,id:session()?.selected}:null}}));
}
async function newChat(scope=null){
    if(scope)workspaces.restore(scope);else workspaces.leave();preserveDrafts();if(!scope&&!appPreferences.defaultMacId){notice('Choose a Default computer in Engine Room before starting a new chat.');return;}
    chatMode='new';if(scope&&sessions.get(scope.hostId)){sessions.get(scope.hostId).run=null;sessions.get(scope.hostId).selected=null;}await connect(scope?.hostId||appPreferences.defaultMacId);if(session()){session().run=null;session().selected=null;}setView('chats');if(scope)workspaces.restore(scope);render();
}
document.addEventListener('proteus:chat-close',event=>{const {hostId,id}=event.detail||{};chatTabs.delete(hostId+':'+id);saveChatTabs();if(!workspaces.active&&hostId===active&&session()?.selected===id){preserveDrafts();stopMessageSpeech();session().run=null;session().selected=null;chatMode='index';}render();});
document.addEventListener('proteus:open-local-file',event=>{
    const current=session(),run=current?.run,file=event.detail?.file;if(view!=='chats'||chatMode!=='chat'||!run||!file)return;
    preserveDrafts();stopDocumentPreview(current,run);const documentId=current.reselectDocumentId||'local-'+crypto.randomUUID();current.reselectDocumentId=null;const version=String(file.lastModified)+'-'+String(file.size);current.documents ||= new Map();current.documents.set(run.id+':'+documentId,{chatId:run.id,documentId,title:file.name,version,content:event.detail.text,readAt:new Date().toISOString(),source:'local',mediaType:/\.html?$/i.test(file.name)?'text/html':'text/markdown'});current.childOrder ||= new Map();const tabs=current.childOrder.get(run.id)||[];const descriptor=tabs.find(item=>item.type==='document'&&item.documentId===documentId);if(descriptor)Object.assign(descriptor,{title:file.name,version,source:'local'});else tabs.push({type:'document',documentId,title:file.name,version,source:'local'});current.childOrder.set(run.id,tabs);current.activeChatPanel=documentId;saveChildTabs(current,run.id);event.detail.handled=true;render();
});

async function loadMoreChats(){
    try{await verifyWebsite();const archived=chatIndexShowsArchived();await Promise.all([...sessions.values()].filter(current=>current.client?.status==='online'&&(archived&&current.state?.capabilities?.includes('chat.lifecycle.v1')?(current.archivedRuns?.length||0)<(current.state?.runCountIncludingArchived||0):(current.state?.runs?.length||0)<(current.state?.runCount||0))).map(async current=>{
        const client=current.client,includeArchived=archived&&current.state?.capabilities?.includes('chat.lifecycle.v1'),existing=includeArchived?current.archivedRuns||[]:current.state.runs||[],older=await client.request('runs.list',{offset:existing.length,...(includeArchived?{includeArchived:true}:{})});
        if(ended||suspended||current.client!==client)return;
        if(includeArchived)current.archivedRuns=[...new Map([...existing,...older].map(run=>[run.id,run])).values()];else{current.state.runs=[...new Map([...existing,...older].map(run=>[run.id,run])).values()];current.cachedRuns=current.state.runs;await saveChatIndex(root.dataset.account,current.host,current.cachedRuns).catch(()=>{});}
    }));render();}catch(error){notice(error.message);}
}
async function refreshAggregate(force=false){
    await Promise.allSettled([...hosts.values()].map(async metadata=>{
        if(readPreferences().autoConnect===false&&metadata.hostId===appPreferences.defaultMacId)return;let current=sessions.get(metadata.hostId);if(current?.client?.status==='online'){if(force){await verifyWebsite();const client=current.client,result=await client.request('sync',{cursor:''});if(ended||suspended||current.client!==client)return;current.state=result.state;rememberHostName(current,result.state);current.cachedRuns=result.state.runs||[];if(!chatIndexShowsArchived())current.archivedRuns=null;current.lastSyncAt=new Date().toISOString();}return;}
        const credential=metadata.source==='account'?await accountStore.credential(metadata.hostId):metadata;
        if(ended||suspended)return;
        const client=new BrowserRemoteClient(credential);current={host:credential,client,drafts:new Map(),selected:null,run:null,state:null};sessions.set(metadata.hostId,current);current.drafts=await loadChatDrafts(root.dataset.account,credential);const cached=await loadChatIndex(root.dataset.account,credential);if(cached){current.cachedRuns=cached.items;current.lastSyncAt=cached.observedAt;}bindRevocation(client,metadata.hostId,current);client.addEventListener('status',()=>{if(client.status!=='online')observeRunningChats(metadata.hostId,'remote',null,false);if(client.status==='closed'){current.state=null;renderRecentChats();if(active===metadata.hostId){render();reconnect(metadata.hostId);}}});
        client.addEventListener('change',event=>{if(ended||suspended||current.client!==client)return;void workspaces.changed(metadata.hostId,event.detail).catch(error=>notice(error.message));if(event.detail.event==='chat.lifecycle'){applyChatLifecycle(current,metadata.hostId,event.detail.data);if(chatIndexShowsArchived())void loadArchivedChats(true).catch(error=>notice(error.message));}if(event.detail.event==='state'){current.state=event.detail.data;rememberHostName(current,event.detail.data);current.cachedRuns=event.detail.data.runs||[];if(!chatIndexShowsArchived())current.archivedRuns=null;current.lastSyncAt=new Date().toISOString();void saveChatIndex(root.dataset.account,current.host,current.cachedRuns).catch(()=>{});renderRecentChats();if(chatIndexShowsArchived())void loadArchivedChats(true).catch(error=>notice(error.message));if(active===metadata.hostId){preserveDrafts();render();}}if(event.detail.event==='run'&&event.detail.runId===current.selected){current.run=event.detail.data;if(active===metadata.hostId){preserveDrafts();render();}}});
        try{await client.connect();await verifyWebsite();const result=await client.request('sync',{cursor:''});current.state=result.state;rememberHostName(current,result.state);current.cachedRuns=result.state.runs||[];current.lastSyncAt=new Date().toISOString();await saveChatIndex(root.dataset.account,current.host,current.cachedRuns).catch(()=>{});current.host.cursor=result.cursor;}catch{client.close();current.client=null;current.state=null;}
    }));
}

let draftSave=Promise.resolve();
function persistCurrentDrafts(){preserveDrafts();const current=session();if(!current?.host?.key)return Promise.resolve();const snapshot=new Map(structuredClone([...current.drafts]));draftSave=draftSave.catch(()=>{}).then(()=>saveChatDrafts(root.dataset.account,current.host,snapshot));return draftSave;}
root.addEventListener('input',event=>{if(event.target.closest('form[data-draft]'))void persistCurrentDrafts().catch(error=>notice(error.message));});
document.addEventListener('proteus:chat-rename',event=>{const request=event.detail;if(!request?.hostId||!request.id)return;request.handled=true;void openChat(request.id,request.hostId).then(()=>renameWebsiteChat(session(),session().run)).catch(error=>notice(error.message));});
root.addEventListener('contextmenu',event=>{
    if(event.target.closest('input,textarea,select,a,img,#chat-index-rows'))return;
    const current=session(),run=current?.run,selected=window.getSelection()?.toString()||'';
    const message=event.target.closest('.remote-message'),code=event.target.closest('pre code,code'),tab=event.target.closest('.remote-inner-tabs button[data-chat-panel],.remote-inner-tabs button[data-chat-document]'),title=event.target.closest('.remote-chat-title h2'),value=event.target.closest('pre,dd,dt,.remote-chat-document,.remote-tool-table');
    if(!message&&!code&&!tab&&!title&&!value)return;
    const items=[];if(selected)items.push({id:'selection',label:'Copy selection'});
    if(message){items.push({id:'message',label:'Copy message'},{id:'markdown',label:'Copy as Markdown'});if(message.querySelector('[data-message-action="speak"]'))items.push({id:'read-aloud',label:'Read aloud'});}
    if(code)items.push({id:'code',label:'Copy code'});
    if(value&&!selected)items.push({id:'value',label:'Copy value or entry'});
    if(title&&run)items.push({id:'copy-chat-link',label:'Copy chat link'});
    if(title&&run&&current.state?.capabilities?.includes('chat.rename.v1'))items.push({id:'rename',label:'Rename chat…'});
    const childIndex=tab?.dataset.childIndex==null?-1:Number(tab.dataset.childIndex),childCount=current?.childOrder?.get(run?.id)?.length||0;
    if(childIndex>=0){items.push({id:'close',label:'Close tab'},{id:'close-others',label:'Close other child tabs',enabled:childCount>1},{id:'close-right',label:'Close child tabs to the right',enabled:childIndex<childCount-1},{id:'move-left',label:'Move tab left',enabled:childIndex>0},{id:'move-right',label:'Move tab right',enabled:childIndex<childCount-1});}
    if(!items.length)return;
    void openContextMenu(event,items).then(async choice=>{if(!choice)return;if(choice==='copy-chat-link'){try{await navigator.clipboard.writeText(chatLink({id:run.id,hostId:current.host.hostId},{origin:location.origin}));notice('Chat link copied.');}catch(error){notice(error.message);}return;}if(choice==='rename'){renameWebsiteChat(current,run);return;}if(choice==='read-aloud'){message.querySelector('[data-message-action="speak"]')?.click();return;}if(choice==='move-left'||choice==='move-right'){moveChildTab(current,run,childIndex,childIndex+(choice==='move-left'?-1:1));return;}if(choice==='close'||choice==='close-others'||choice==='close-right'){const indices=choice==='close'?[childIndex]:choice==='close-others'?Array.from({length:childCount},(_,i)=>i).filter(i=>i!==childIndex):Array.from({length:childCount},(_,i)=>i).filter(i=>i>childIndex);closeChildTabs(current,run,indices);return;}const body=message?.querySelector('[data-markdown-event]'),eventIndex=body?Number(body.dataset.markdownEvent):-1;let output=choice==='selection'?selected:choice==='code'?code?.textContent:choice==='value'?value?.textContent:body?.innerText||message?.innerText;if(choice==='markdown')output=run?.events?.[eventIndex-(run?.eventStart||0)]?.text||body?.textContent||message?.innerText;try{await navigator.clipboard.writeText(String(output||''));notice('Copied.');}catch{notice('Clipboard access is unavailable. Use your browser’s Copy command.');}});
});
document.addEventListener('click',event=>{const link=event.target.closest('a[href]');if(!link||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||link.target==='_blank')return;const url=new URL(link.href);if(url.origin===location.origin&&url.pathname!==location.pathname){event.preventDefault();void persistCurrentDrafts().then(()=>location.assign(url.href)).catch(error=>notice(error.message));}});
async function startup(){
    if(ended)return;suspended=false;startLifecycle();
    try {
        const account=await accountStore.list();if(ended||suspended)return;
        let legacy=[];try{legacy=await legacyStore.list();}catch{}
        if(ended||suspended)return;
        hosts.clear();for(const host of legacy)hosts.set(host.hostId,{...host,source:'legacy'});for(const host of account)hosts.set(host.hostId,host);
        try{const tabs=JSON.parse(localStorage.getItem(chatTabKey)||'[]'),order=JSON.parse(localStorage.getItem('proteus.content-tabs.v1.'+root.dataset.account)||'[]');for(const tab of Array.isArray(tabs)?tabs.slice(0,32):[]){if(!hosts.has(tab.hostId)||typeof tab.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(tab.id))continue;const fallback=(Array.isArray(order)?order:[]).find(item=>item?.type==='chat'&&item.hostId===tab.hostId&&item.id===tab.id);const title=chatTabTitle(tab.title);chatTabs.set(tab.hostId+':'+tab.id,{hostId:tab.hostId,id:tab.id,title:title==='Chat'?chatTabTitle(fallback?.title):title});}}catch{}
        destinationOptions();if(!hosts.size)$('remote-pair-panel').open=true;
        try{appPreferences=(await appRequest()).preferences;}catch{notice('Account preferences unavailable. Explicitly choose a computer to continue.');}
        await refreshAggregate();
        const prefs=readPreferences(),selected=hosts.has(appPreferences.defaultMacId)?appPreferences.defaultMacId:null;
        if(selected){active=selected;destinationOptions();if(prefs.autoConnect===false){suppressed.add(selected);render();}else await connect(selected,{automatic:true});}else render();
        if(initialQuery.has('new'))await newChat();
        const deep=initialQuery;if(deep.get('workspace')&&hosts.has(deep.get('host'))){await workspaces.enter({hostId:deep.get('host'),id:deep.get('workspace'),projectId:deep.get('project')},['projects','chats','tabs','configuration'].includes(deep.get('page'))?deep.get('page'):undefined);if(deep.get('chat'))await workspaces.openChat(deep.get('chat'));else if(deep.get('tab'))await workspaces.openResource(deep.get('tab'));}else if(deep.get('chat')&&hosts.has(deep.get('host'))){await openChat(deep.get('chat'),deep.get('host'),deep.get('panel'));if(deep.get('rename')==='1')renameWebsiteChat(session(),session().run);if(deep.get('sendWorkspace')==='1'){const run=session().run;await workspaces.sendChat({...run,hostId:active,workspaceId:run.workspaceId||run.context?.workspaceId||run.schedule?.context?.workspaceId,workspaceName:run.workspaceName||run.context?.workspaceName||run.schedule?.context?.workspaceName});}}else if(deep.get('schedule')&&hosts.has(deep.get('host')))await openSchedule(deep.get('schedule'),deep.get('host'));else if(deep.get('chat'))notice('Pair and connect this chat’s owning computer before opening its link.');
    }catch(error){if(error.sessionInvalid)await endAccount();else{pauseUnverified();notice(error.message+' Reload to try again.');}}
}
window.addEventListener('pagehide',()=>{suspended=true;++switching;stopReconnect();stopLifecycle();for(const pair of pendingPairs)pair.close();pendingPairs.clear();for(const current of sessions.values())current.client?.close();sessions.clear();hosts.clear();active='';legacyStore.close();render();});
window.addEventListener('pageshow',event=>{if(event.persisted&&!ended)void startup();});
await startup();

function activityTime(value){if(!value||!Number.isFinite(Date.parse(value)))return 'Time unavailable';try{return new Intl.DateTimeFormat(undefined,{timeZone:appPreferences.timezone||'UTC',dateStyle:'medium',timeStyle:'medium'}).format(new Date(value));}catch{return new Date(value).toISOString();}}
function rememberActivityDisclosures(current,scope=root){
 current.activityDisclosures ||= new Set();scope.querySelectorAll('[data-activity-disclosure]').forEach(details=>{if(details.open)current.activityDisclosures.add(details.dataset.activityDisclosure);else current.activityDisclosures.delete(details.dataset.activityDisclosure);});
}
function mountEventMarkdown(scope,current,run){
 scope.dataset.linkCwd=run?.workspace?.cwd||run?.schedule?.workspace?.cwd||run?.schedule?.context?.cwd||'';
 for(const element of scope.querySelectorAll('[data-provider-activity-index]')){
  const index=Number(element.dataset.providerActivityIndex),entry=run.events[index-(run.eventStart||0)];
  if(!entry?.data?.activity)continue;
  current.activityDisclosures ||= new Set();
  mountProviderActivity(element,{...entry,key:String(index)},run,{time:activityTime,verified:current.client?.status==='online',now:()=>Date.now(),disclosures:current.activityDisclosures,renderMarkdown:mountMarkdown});
 }
 for(const element of scope.querySelectorAll('[data-markdown-event]')){
  const entry=run.events[Number(element.dataset.markdownEvent)-(run.eventStart||0)];
  if(!entry)continue;
  mountChatRecovery(element.parentElement,entry,run,{notify:notice,recover:run.chatControls?.recovery?async(action,expectedFailureEventAt)=>{
   if(session()!==current||current.run?.id!==run.id)throw new Error('The selected chat changed. Review it before continuing.');
   await recoverRemoteChat({run,action,expectedFailureEventAt,request:(method,args)=>commandForHost(current,method,args),mutate:(method,args)=>commandForHost(current,method,args)});
   const fresh=await commandForHost(current,'chat.get',{id:run.id});
   if(session()===current&&current.run?.id===run.id){preserveDrafts();current.run=mergeChatHistory(current.run,fresh);render();}
  }:null});
 }
 for(const element of scope.querySelectorAll('[data-markdown-event]')) { const event = run.events[Number(element.dataset.markdownEvent)-(run.eventStart||0)]; current.images ||= new Map(); mountMarkdown(element, event?.text || '', { copy: value => navigator.clipboard.writeText(value), link: url => { if (/^https?:\/\//i.test(url)) {if(isLoopbackPreview(url))void openSharedPreview(current,run,url).catch(error=>notice(error.message));else window.open(url, '_blank', 'noopener,noreferrer');} else if((event?.role||event?.type)==='assistant')void openChatDocument(current,run,url).catch(error=>notice(error.message));else notice('Open file links from assistant messages on the owning computer.'); }, image: async source => { const key = run.id + ':' + source; if (!current.images.has(key)) current.images.set(key, command('chat.image', { id: run.id, source }).then(r => r.dataURL).catch(error => { current.images.delete(key); throw error; })); return current.images.get(key); } }); }
}
function bindWebRuntime(current,run){
 if(!run)return;const receipt=Date.now(),observed=Date.parse(run.observedAt),now=()=>Number.isFinite(observed)?observed+Date.now()-receipt:Date.now(),verified=()=>current.client?.status==='online';const label=value=>formatDuration(value)+(verified()?'':' · offline, unverified');
 bindRuntimeTimer(root.querySelector('[data-runtime-total]'),()=>label(runtimeTotal(run.turns,now(),verified()))+((run.timingPartial||run.turns?.some(t=>t.incomplete))?' · partial':''),!!run.turns?.some(t=>t.activeSince));
 const seen=new Set(),turns=new Map((run.turns||[]).map(turn=>[turn.id,turn]));root.querySelectorAll('[data-runtime-turn]').forEach(node=>{const id=node.dataset.runtimeTurn;if(id&&seen.has(id)){node.hidden=true;return;}node.hidden=false;seen.add(id);const turn=turns.get(id);bindRuntimeTimer(node,()=>label(turnDuration(turn,now(),verified())),!!turn?.activeSince);});
 root.querySelectorAll('[data-runtime-tool]').forEach(node=>{const tool=JSON.parse(node.dataset.runtimeTool);bindRuntimeTimer(node,()=>label(toolDuration(tool,now(),verified(),run.turns)),tool.status==='running'&&!tool.finishedAt&&!Number.isFinite(tool.durationMs));});
 root.querySelectorAll('[data-runtime-group]').forEach(node=>{const tools=JSON.parse(node.dataset.runtimeGroup);bindRuntimeTimer(node,()=>label(groupDuration(tools,now(),verified(),run.turns)),tools.some(tool=>tool.status==='running'&&!tool.finishedAt));});
}

root.addEventListener('keydown',event=>{if(event.key!=='Enter'||event.shiftKey||event.isComposing||event.repeat||event.altKey||event.target.name!=='prompt'||event.target.form?.id!=='remote-composer')return;event.preventDefault();const form=event.target.form,button=form.querySelector('button[type=submit]');if(button&&!button.disabled)button.click();});

function attentionRows(){return [...sessions.values()].flatMap(current=>(current.state?.attention||[]).map(item=>({...item,hostId:current.host.hostId,hostLabel:current.host.label}))).sort((a,b)=>String(b.at||'').localeCompare(String(a.at||'')));}
function attentionTabs(target){const tabs=document.createElement('div');tabs.className='actions attention-tabs';for(const name of ['chats','notifications']){const button=document.createElement('button');button.textContent=name==='chats'?'Chats':'Notifications · '+attentionRows().length;button.className=attentionPanel===name?'primary':'';button.onclick=()=>{attentionPanel=name;render();};tabs.append(button);}target.prepend(tabs);}
function renderAttentionNotifications(){const target=$('remote-content');target.innerHTML='<h2>Needs attention</h2>';attentionTabs(target);for(const item of attentionRows()){const card=document.createElement('section');card.className='card';const heading=document.createElement('h3');heading.textContent=item.title;const body=document.createElement('p');body.textContent=item.hostLabel+(item.body?' · '+item.body:'');card.append(heading,body);const actions=document.createElement('div');actions.className='actions';if(item.kind==='connection'){const link=document.createElement('a');link.href='/engine-room?tab=integrations';link.className='button';link.textContent='Open connections';actions.append(link);}if(item.chatId){const button=document.createElement('button');button.textContent='Open chat';button.onclick=()=>void openChat(item.chatId,item.hostId).catch(error=>notice(error.message));actions.append(button);}if(item.notificationId){const button=document.createElement('button');button.textContent='Mark read';button.onclick=async()=>{try{await commandForHost(sessions.get(item.hostId),'notifications.read',{id:item.notificationId});await refreshAggregate(true);render();}catch(error){notice(error.message);}};actions.append(button);}card.append(actions);target.append(card);}if(!attentionRows().length)target.insertAdjacentHTML('beforeend','<p>No notifications need action.</p>');}
import {replaceChatMarkup} from '../../../public/features/chats/chat-dom.js';
import {mountChatComposer} from '../../../public/features/chats/chat-composer.js';
import {renderRunDetails,approvalDetails,bindRemotePaths,bindRemoteDetails} from '../../../public/features/chats/chat-details.js';

let previewsBusy=false;
setInterval(async()=>{
 const current=session(),run=current?.run;if(view!=='chats'||!run||previewsBusy||!current.state?.capabilities?.includes('chat.previews.v1'))return;
 previewsBusy=true;try{await refreshChatPreviews({chatId:run.id,versionFor:id=>{const item=current.documents?.get(run.id+":"+id);return item?.content!=null?item:null;},request:(method,args)=>commandForHost(current,method,args),current:()=>session()===current&&current.run?.id===run.id,onPreview:preview=>{
  current.documents ||= new Map();current.childOrder ||= new Map();const key=run.id+':'+preview.documentId,old=current.documents.get(key);
  if(current.dismissedPreviews?.has(key)||old?.content!=null&&old.version===preview.version&&old.stale===preview.stale)return;
  current.documents.set(key,{...preview,chatId:run.id,source:'preview'});const tabs=current.childOrder.get(run.id)||[];
  if(!tabs.some(tab=>tab.documentId===preview.documentId))tabs.push({type:'document',documentId:preview.documentId,title:preview.title,mediaType:'text/html',source:'preview'});
  current.childOrder.set(run.id,tabs);current.previewApprovals ||= new Set();for(const key of current.previewApprovals)if(key.startsWith(run.id+':'+preview.documentId+':'))current.previewApprovals.delete(key);
  saveChildTabs(current,run.id);render();
 },onRemove:seen=>{const tabs=current.childOrder?.get(run.id)||[];const next=tabs.filter(tab=>tab.source!=='preview'||seen.has(tab.documentId));if(next.length!==tabs.length){current.childOrder.set(run.id,next);saveChildTabs(current,run.id);render();}}});}catch{/* Remote grant or connection unavailable; retain the prior snapshot. */}finally{previewsBusy=false;}
},2500);

async function openSharedPreview(current,run,source){
 const result=await commandForHost(current,"chat.previews.list",{id:run.id});const metadata=(result.previews||[]).find(item=>new URL(item.source).href===new URL(source.split("#")[0]).href);if(!metadata)throw Error("This local preview is unavailable on the owning computer.");
 const preview=await verifyPreview(await commandForHost(current,"chat.previews.read",{id:run.id,documentId:metadata.documentId}));if(session()!==current||current.run?.id!==run.id)return;
 current.documents ||= new Map();current.childOrder ||= new Map();const key=run.id+":"+preview.documentId;current.dismissedPreviews?.delete(key);current.documents.set(key,{...preview,preview:true,chatId:run.id,source:"preview"});const tabs=current.childOrder.get(run.id)||[];if(!tabs.some(tab=>tab.documentId===preview.documentId))tabs.push({type:"document",documentId:preview.documentId,title:preview.title,mediaType:"text/html",source:"preview"});current.childOrder.set(run.id,tabs);current.activeChatPanel=preview.documentId;saveChildTabs(current,run.id);render();
}

async function moveWebsiteChat(current,run){
 const supportsProjects=current.state?.capabilities?.includes('projects.v1');
 const [catalog,projectCatalog,fresh]=await Promise.all([commandForHost(current,'context.get',{}),supportsProjects?commandForHost(current,'projects.get',{}):null,commandForHost(current,'chat.get',{id:run.id})]);
 const dialog=document.createElement('dialog');dialog.className='remote-rename-dialog';
 const groups=projectMoveGroups(catalog.workspaces,projectCatalog?.projects||[],{workspaceOnly:!supportsProjects});
 dialog.innerHTML=`<form><h2>Move tab</h2>${moveMenuMarkup({groups,current:supportsProjects?fresh.projectId:fresh.workspaceId,escape,application:false})}<p>Choose where this tab belongs. Its session and history are preserved.</p><p data-error></p><button type="button">Cancel</button><button>Move tab</button></form>`;
 const select=dialog.querySelector('[data-move-destination]');
 dialog.querySelector('[type=button]').onclick=()=>dialog.close();dialog.onclose=()=>dialog.remove();dialog.querySelector('form').onsubmit=async event=>{event.preventDefault();try{const projectId=supportsProjects?select.value:undefined,workspaceId=supportsProjects?projectCatalog.projects.find(project=>project.id===projectId)?.workspaceId:select.value;if((supportsProjects?projectId===fresh.projectId:workspaceId===fresh.workspaceId)){dialog.close();return;}await commandForHost(current,'chat.move',{id:run.id,workspaceId,...(supportsProjects?{projectId,expectedUpdatedAt:fresh.updatedAt,expectedRevision:projectCatalog.revision}:{})});await refreshAggregate(true);dialog.close();await workspaces.enter({hostId:current.host.hostId,id:workspaceId,projectId});await workspaces.openChat(run.id,run.title);render();}catch(error){dialog.querySelector('[data-error]').textContent=error.message;}};document.body.append(dialog);dialog.showModal();
}

// Files kept with a chat on its owner open through bounded read-only chunks.
document.addEventListener('click',event=>{const button=event.target.closest?.('[data-remote-attachment]');const run=session()?.run;if(!button||!run?.id)return;event.preventDefault();const chatId=run.id,sha256=button.dataset.remoteAttachment;void openStoredAttachment(button.dataset.remoteAttachmentName||'Attachment',()=>readRemoteAttachment((method,args)=>command(method,args),chatId,sha256));});
