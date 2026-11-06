import {pendingQuestionHasCard} from './features/chats/user-questions.js';
import {enterSubmits} from './shared/ui/enter-submit.js';
import {viewResidency} from './models/view-residency.js';
import {retainDocument} from './features/workspaces/document-residency.js';
import {scheduleSourcesFields,scheduleSourcesSelection} from './features/settings/schedule-sources.js';
import {bindActiveTimePreference,bindAllowancePreference} from './features/chats/allowance-controls.js';
import {bindPermissionSidebar} from './shared/navigation/permission-sidebar.js';
import {showMoveMenu} from './shared/navigation/move-menu.js';
import {installLinkPreview} from './shared/ui/link-preview.js';
import {refreshMountedWorkspaceTabs} from './features/workspaces/workspace-tabs.js';
import {workingMessage} from './features/chats/chat-working.js';
import {mountQuestionAttachments} from './features/chats/question-attachments.js';
import {browserLabel} from './features/browser/browser-label.js';
import {fileDatesText} from './shared/ui/file-dates.js';
import {syncPalette} from './shared/ui/palette.js';
import {createChatSetupTabs} from './features/chats/chat-setup-tabs.js';
import {bindSharedDraftText} from './features/chats/shared-draft-text.js';
import {renderUpdateCard} from './features/settings/updates.js';
import {createWindowChrome} from './shared/navigation/preview-window-chrome.js';
import {createWindowChrome as createLinuxWindowChrome} from './shared/navigation/window-chrome.js';
import {createPreviewSidebarLayout} from './shared/navigation/preview-sidebar-layout.js';
import {remapPreviewProjectSession,remapPreviewBrowserPlacement} from './features/workspaces/preview-project-placement.js';
import {reorderWorkspaceTabSiblings} from './features/workspaces/workspace-tabs.js';
import {workspaceProjectsCatalog,setWorkspaceProjectsCatalog,initDesktopPreview,previewEnabled,projectIcon,previewTopId,reconcilePreviewChatPlacement,previewContentDescriptors,ensurePreviewProject,previewProjects,previewProjectForChat,previewResourceParent,capturePreviewSidebar,bindPreviewSidebar,resetPreviewProjectPaging,openPreviewChat,previewChatBreadcrumb,bindPreviewChatBreadcrumb,renderPreviewSources} from './shared/navigation/desktop-preview.js';
import {rememberTabSelection,restoreTabSelection} from './features/workspaces/workspace-selection.js';
import {createWindowRestore,step as restoreStep,failedChildInfo,mergeOpenedTabs} from './features/workspaces/window-restore.js';
import {previewRelativeAge,previewChatActivity} from './shared/navigation/preview-navigation.js';
import {previewApprovalChoices,previewPermissionNames} from './shared/navigation/preview-permissions.js';
import {downloadsChanged} from './features/browser/browser-downloads.js';
import {normalizeContentTabHistory,contentTabMetadata,acknowledgesBrowserNavigation,contentTabOrder,contentTabViews,documentSessionMetadata,documentAssociationMetadata} from './models/content-tab-descriptor.js';
import {chatLink,parseChatLink} from './features/chats/chat-links.js';
import {computerName} from './services/remote/computer-identity.js';
import {initWorkspaces,renderWorkspaces,renderWorkspace,openWorkspace,openWorkspaceChat,openRemoteProject,workspaceOwners,refreshWorkspaceOwners,loadWorkspaceOwnerTabs,recentWorkspaces,sendChatToWorkspace,moveChatToWorkspace,createWorkspace,deleteWorkspace} from './features/workspaces/desktop-workspaces.js';
import {workspaceIcon,workspaceCatalog} from './features/workspaces/workspace-ui.js';
import {isLoopbackPreview} from './features/chats/chat-previews.js';
import {initAttention,attentionItems,announceAttention,openAttentionItem,renderAttention} from './features/chats/attention.js';
import {initBrowserNotifications,recordBrowserIssue} from './features/browser/browser-notifications.js';
import { installTabSwipe } from './shared/navigation/tab-swipe.js';
import { installPageFind } from './shared/ui/page-find.js';
import {chatType} from './features/chats/chat-types.js';
import {mountChatComposer,mountNewChatComposer} from './features/chats/chat-composer.js';
import {renderRunDetails,approvalDetails,bindChatFolderTrust} from './features/chats/chat-details.js';
import {createToast} from './shared/ui/toast.js';
import {mountInternetSearch} from './features/settings/internet-search.js';
import {selectChatType} from './features/chats/chats-index.js';
import { mergeChatHistory } from './features/chats/chat-history.js';
import { renderAgentTerminal } from './features/tools/agent-terminal.js';
import {usageSidebar,usageDetails} from './features/settings/provider-usage-view.js';
import { bindDesktopBrowserRecents } from './features/browser/browser-recents.js';
import { mountHome } from './shared/ui/home.js';
import { createTabSynchronizer, syncableTabURL, shouldRemoveCapturedTab } from './models/content-tab-sync.js';
import { createProjectFollower, acceptsProjectPresentation, sharedScrollPosition, restoreSharedScroll } from './features/workspaces/project-follow.js';
import { browserTabIcon, browserAudioIcon } from './features/browser/browser-icons.js';
import { setMessageActionsContext, stopMessageSpeech } from './features/chats/message-actions.js';
import { tabOverviewIcon, chatIconPaths, addTabMenuEntries, addTabMenuItems, setBrowserProfiles, browserProfileMenu } from './shared/navigation/add-tab-menu.js';
import { loadPeers, openWorkspaceChatDialog, initRemoteDesktops, attachChatDestinations, mountMachineHistory, renderRemoteRun, renderRemoteDocument, remoteDocumentPositionVersion, restoreRemoteDocumentPosition, forgetRemoteDocument, forgetRemoteConversation, openRemoteChat, renameRemoteChat, mountRemoteSchedules } from './services/remote/remote-desktops.js';
import { initChatsIndex, renderChatsIndex, recentChats, runningChats, attentionChats, reconcileIndexedChat, openIndexedChat, loadChatsIndex } from './features/chats/chats-index.js';
import { initEngineRoom, engineSections, renderEngineRoom } from './features/settings/engine-room.js';
import { initTeamTools, renderTeamTools, canPreserveTeamBrowser, teamState, restoreTeamState, leaveTeamTools, ownsTeamBrowser, syncTeamBrowsers, teamBrowserBounds, selectTeamBrowser, forgetTeamBrowser, closeTeamTabById } from './features/tools/team-tools.js';
import {tabOverviewGroups} from './shared/navigation/tab-overview-model.js';
import {showBrowserCertificate} from './features/browser/browser-address-menu.js';
import { initBrowserOverview, showBrowserOverview, isBrowserOverviewOpen } from './features/browser/browser-overview.js';
import { browserTarget, renderBrowserHome } from './features/browser/browser-home.js';
import {openContentScopes} from './features/workspaces/content-scopes.js';
import {beginNewTabInput,withNewTabInput} from './features/browser/new-tab-input.js';
import {inferenceProviderChoices,modelsForInferenceChoice} from './features/chats/provider-choices.js';
import { browserAddress, updateAgentAccess, bindBrowserHistoryButton, browserSurfaceIdentity, browserSurfaceRevision, selectBrowserSurface } from './features/browser/browser-toolbar.js';
import { bindBrowserAddressMenu } from './features/browser/browser-address-menu.js';
import { bindTabEdges, bindTabReorder, reorderById, revealNewTabs, revealWholeTab, resetTabReveals, neighborAfterRemoval } from './shared/navigation/tab-interactions.js';
import { initializeViewPositions, rememberView, restoreView, restoreDocumentView, flushViewPositions } from './shared/navigation/view-position.js';
import { showContextMenu, copyContextText } from './features/workspaces/context-menu.js';
import { requestPresentation, mountStructured } from './features/chats/tool-presentation.js';
import { placeTabAfter,destinationSections } from './shared/navigation/tab-placement.js';
import { conversation, forgetConversation, captureConversationPosition, restoreConversationPosition } from './features/chats/conversation.js';
import { mountAttachmentPicker, restoreSentAttachments, selectedAttachments, clearAttachments, prepareLocalAttachments, readLocalAttachment } from './features/chats/chat-attachments.js';
import { renderProviderAuth } from './features/settings/provider-auth.js';
import {mountSharedInference} from './features/settings/shared-inference.js';
import { renderRemote } from './services/remote/remote.js';
import { initOmi, renderOmi } from './features/tools/omi.js';
import { initTerminals, renderTerminal, openTerminalDialog, openTerminalProfiles, disposeTerminalUi, captureTerminalScroll, applyTerminalScroll } from './features/tools/terminals.js';
import { initLife, renderLife, renderLifeSetup, selectLifeSection } from './features/tools/life.js';
import {mountFileBrowser} from './features/workspaces/file-browser.js';
import { initMarkdownPicker, openMarkdownPicker } from './shared/ui/markdown-picker.js';
import { initFeatures, renderContext, renderStandup, renderCredentials, fillBrowserLogin, contextPicker, contextSelection, bindContextPicker, modelPicker, modelControls, modelSelection, contextSize, refreshModels, sessionDetails, bindSessionDetails, bindPaths } from './shared/ui/features.js';
const browserFindRevisions=new Map();
const pageFindNative=()=>{
  const tab=state.tabs.find(tab=>tab.id===state.tab),team=teamState(),selected=document.querySelector('#browser-area')&&tab?.type==='browser'?{...tab.info,id:tab.id}:document.querySelector('#team-browser-area')?team.tabs.find(tab=>tab.id===team.active):null;
  const id=selected?.loaded!==false&&/^https?:\/\//i.test(selected?.url||'')?(selected.browserId||selected.id):null;
  return id&&window.desktop?{id,revision:browserFindRevisions.get(id)??0,find:(text,direction)=>window.desktop.browser({action:'find',id,text,direction}),stop:()=>window.desktop.browser({action:'find-stop',id}).catch(()=>{})}:null;
};
const pageFind=installPageFind({scope:()=>document.querySelector('#main'),native:pageFindNative,onLayout:visible=>{
  const area=document.querySelector('#browser-area,#team-browser-area'),panel=document.querySelector('.page-find');
  if(area){area.style.marginTop=visible?'52px':'';panel.style.top=(area.getBoundingClientRect().top-48)+'px';requestAnimationFrame(browserBounds);}else panel.style.top='84px';
}});
const pairedBubbles = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">${chatIconPaths}</svg>`;
const $ = selector => document.querySelector(selector);
const linuxWindowChrome=createLinuxWindowChrome(window.desktop,message=>toast(message));
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const desktopWindowId=window.desktop?.windowId||'main',windowScopeId=kind=>kind==='team'&&window.desktop?.windowPreview?'team':desktopWindowId==='main'?kind:'window:'+desktopWindowId;
const state = { data: null, page: 'home', engineSection:'resources', selected: null, tab: 'overview', tabs: [{ id: 'overview', label: 'Schedules', type: 'overview' }], draft: null, dirty: false, signature: '', markdown: null };
installLinkPreview({base:()=>{const tab=state.tabs.find(tab=>tab.id===state.tab),run=localHistories.get(tab?.runId||tab?.id);return {file:tab?.markdown?.file,cwd:run?.schedule?.workspace?.cwd};}});
const windowChrome=createWindowChrome({state,icon:tabOverviewIcon,overview:showBrowserOverview,layout:()=>browserBounds()});
const navigationIcon = markup => previewEnabled(state)?`<span class="preview-tab-icon">${markup}</span>`:markup;
const friendly = value => ({ awaiting_input:'Needs feedback', completed:'Turn complete', queued:'Queued', running:'Running', cancelled:'Cancelled', interrupted:'Interrupted', failed:'Failed' }[value] || value);
const runUsageNote=run=>run.usage?.observed?(run.schedule?.provider==='claude'&&run.usage.inputComplete!==true?'Partial input count: earlier cached input usage is unavailable.':'Observed provider usage.'):run.schedule?.provider==='rehearsal'?'No provider usage reported. Rehearsals make no model calls.':'This provider did not report turn usage. The turn may have failed before a model response.';
const badge = status => `<span class="badge ${escape(status)}">${escape(friendly(status))}</span>`;
const time = (value, timezone, seconds=false) => value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleString(undefined, { timeZone: timezone || state.data?.settings?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone, year:'numeric', month:'short', day:'numeric', hour:'numeric', minute:'2-digit', ...(seconds?{second:'2-digit'}:{}) }) : 'Time unavailable';
const chatSetupTabs=createChatSetupTabs({state,save:saveWorkspace,render,toast:message=>toast(message),dispose:clearAttachments,close:tab=>void closeTabSet([tab]).catch(error=>toast(error.message)),syncText:({input,tab,changed})=>{
 const scope=tabScope(tab);if(!['workspace','project'].includes(scope.scope))return;
 const identity={kind:'setup',id:tab.contentTabId||tab.id,scope:scope.scope,scopeId:scope.id,hostKey:scope.hostId||location.origin};
 return bindSharedDraftText({input,identity,changed,request:(action,args)=>scope.hostId?window.desktop.peers({action:'request',hostId:scope.hostId,method:'draft.text.'+action,args}):api('/api/shared-draft',{action,...args})});
}});
let usageValue = null, usageBusy = false, appearanceBusy = false;
let appearanceSaving=Promise.resolve(),previewAppearanceSaving=Promise.resolve(),appearanceSaveGeneration=0;
const previewFeatureLimits=new Map();
let previewAttentionChat=null;
let previousFeature='', tabScrollLeft=0, cleanupMainEdges, cleanupChatEdges, sidebarMinimized=localStorage.getItem('proteus.sidebar.minimized')==='true';
document.body.classList.toggle('sidebar-minimized',sidebarMinimized);
const previewSidebarLayout=createPreviewSidebarLayout({enabled:()=>previewEnabled(state),appearance:()=>state.data?.settings?.appearance,collapsed:()=>sidebarMinimized,save:savePreviewSidebarAppearance,overlay:visible=>window.desktop?.browser({action:'overlay',token:'preview-sidebar-overlay',visible}),layout:browserBounds,notify:message=>toast(message)});

let workspaceReady=false, workspaceRestoring=false, workspaceClosing=false, lastWorkspace='',workspaceSaving=Promise.resolve();
const selectedChildren=new Map();
function reconcilePreviewProjects(){
  if(!previewEnabled(state))return;
  const catalog=workspaceProjectsCatalog(state),prior=new Map(state.tabs.map(tab=>[tab.id,tab]));
  const next=remapPreviewProjectSession({tabs:state.tabs,active:state.tab,selectedChildren:Object.fromEntries(selectedChildren)},catalog);
  // Retain live terminal/document/chat view objects and their mounted clients.
  state.tabs=next.tabs.map(tab=>{const existing=prior.get(tab.id);return existing?Object.assign(existing,tab):tab;});
  state.tab=next.active;selectedChildren.clear();for(const [parent,child] of Object.entries(next.selectedChildren||{}))selectedChildren.set(parent,child);
  for(const run of state.data.runs||[]){const member=catalog.memberships?.[run.id];if(member)Object.assign(run,member);}
}
async function reconcileRemoteProjectPlacement(hostId){
 const {catalog}=await window.desktop.workspaceSession({action:'reconcile-peer-projects',hostId});
 const prior=new Map(state.tabs.map(tab=>[tab.id,tab]));
 const next=remapPreviewProjectSession({tabs:state.tabs,active:state.tab,selectedChildren:Object.fromEntries(selectedChildren)},catalog,{hostId});
 state.tabs=next.tabs.map(tab=>{const existing=prior.get(tab.id);return existing?Object.assign(existing,tab):tab;});state.tab=next.active;
 selectedChildren.clear();for(const [parent,child]of Object.entries(next.selectedChildren||{}))selectedChildren.set(parent,child);
 await saveWorkspace();return catalog;
}
function reorderVisibleTabs(source,target,after,parentId=null){const visible=state.tabs.filter(tab=>parentId?tab.parentId===parentId:!tab.parentId&&!['overview','omi','life','team','engine','home','standup'].includes(tab.type));if(!visible.some(tab=>tab.id===source)||!visible.some(tab=>tab.id===target))return;const ordered=visible.slice();if(!reorderById(ordered,source,target,after))return;const positions=state.tabs.map((tab,index)=>visible.includes(tab)?index:-1).filter(index=>index>=0);positions.forEach((position,index)=>state.tabs[position]=ordered[index]);saveWorkspace();if(parentId)renderChatSubtabs();else renderTabs();}
const syncMessageContext=()=>setMessageActionsContext(JSON.stringify([state.data?.life?.identity?.accountId||'',state.data?.life?.identity?.workspaceId||'',state.data?.life?.identity?.origin||'',state.data?.life?.identity?.sessionId||'',state.tab,state.tabs.find(t=>t.id===state.tab)?.hostId||'local']));
const lifeVisible = () => state.data?.life?.enabled === true;
let applyingContentTabs=0, ownerTabActions=0, contentSyncTimer, browserActivitySaveTimer;
function saveWorkspace() {
  chatSetupTabs.capture();
  if(!workspaceReady || workspaceRestoring || workspaceClosing)return;
  clearTimeout(browserActivitySaveTimer);browserActivitySaveTimer=null;
  reconcilePreviewProjects();
  projectFollower.changed(true);
  const team=teamState();
  const session={schemaVersion:1,windowId:desktopWindowId,active:state.tab,page:state.page,engineSection:state.engineSection,chatDrafts:state.chatDrafts||{},selectedChildren:Object.fromEntries(selectedChildren),team:retainedTeamSession||{...team,tabs:team.tabs.map(tab=>({id:tab.id,type:tab.type||'browser',...(tab.type==='unavailable'?{unavailableDescriptor:tab.unavailableDescriptor,unavailableReason:tab.unavailableReason}:{}),contentTabId:tab.contentTabId,customTitle:tab.customTitle,pendingOpen:tab.pendingOpen===true,...contentTabMetadata(tab),...(tab.browserId?{browserId:tab.browserId,profileId:tab.profileId||'default',url:tab.url||'',history:tab.history,navigationPending:tab.navigationPending===true,title:tab.title||'',favicon:tab.favicon,lastTouchedAt:tab.lastTouchedAt,lastActivityAt:tab.lastActivityAt,openedAt:tab.openedAt,persist:tab.persist===true,audioMuted:tab.audioMuted===true}:{}),...(tab.type==='terminal'?{label:tab.label,terminal:tab.terminal}:{}),...(tab.type==='markdown'?{label:tab.label,...documentSessionMetadata(tab)}:{}),...(['agent-terminal','remote-document'].includes(tab.type)?{runId:tab.runId,hostId:tab.hostId,documentId:tab.documentId,workspaceId:tab.workspaceId,projectId:tab.projectId,mediaType:tab.mediaType,preview:tab.preview}:{})}))},tabs:state.tabs.map(tab=>({id:tab.id,type:tab.type,label:tab.label,contentTabId:tab.contentTabId,customTitle:tab.customTitle,hidden:tab.hidden,navigationClosed:tab.navigationClosed,openedAt:tab.openedAt,lastTouchedAt:tab.lastTouchedAt,lastActivityAt:tab.lastActivityAt,...(tab.parentId?{parentId:tab.parentId}:{}),...(tab.type==='browser'?{associationChatId:tab.info?.associationChatId||tab.associationChatId,remotePreviewURL:tab.remotePreviewURL,profileId:tab.info?.profileId||tab.profileId||'default',url:tab.info?.url||'',history:tab.info?.history,navigationPending:tab.info?.navigationPending===true,unloaded:tab.info?.loaded===false,favicon:tab.info?.favicon,lastTouchedAt:tab.info?.lastTouchedAt,lastActivityAt:tab.info?.lastActivityAt||tab.lastActivityAt,openedAt:tab.info?.openedAt,persist:tab.info?.persist===true,audioMuted:tab.info?.audioMuted===true,pendingOpen:tab.pendingOpen===true,newChatDraft:tab.newChatDraft}:{}),...(tab.type==='files'?{workspaceId:tab.workspaceId}:{}),...(tab.type==='markdown'?documentSessionMetadata(tab):{}),...(tab.type==='unavailable'?{unavailableDescriptor:tab.unavailableDescriptor,unavailableReason:tab.unavailableReason}:{}),...(tab.type==='terminal'?{terminal:tab.terminal,hostId:tab.hostId}:{}),...(['run','agent-terminal'].includes(tab.type)&&tab.runId?{runId:tab.runId}:{}),...(tab.type==='workspace'?{workspaceId:tab.workspaceId,hostId:tab.hostId,hostName:tab.hostName,workspacePage:tab.workspacePage,projectId:tab.projectId,workspaceName:tab.workspaceName,hidden:tab.hidden}:{}),...(['remote-run','remote-document'].includes(tab.type)?{hostId:tab.hostId,runId:tab.runId}:{}),...(tab.type==='remote-document'?{documentId:tab.documentId,workspaceId:tab.workspaceId,projectId:tab.projectId,mediaType:tab.mediaType,preview:tab.preview===true,previewTabId:tab.previewTabId}:{})}))};
  const json=JSON.stringify(session);
  if(json!==lastWorkspace){
    // Sidebar/state repaint can save the same snapshot after owner hydration.
    // Only new local state needs another descriptor pass; a no-op must neither
    // enqueue a read nor postpone the timer already carrying a real edit.
    if(!applyingContentTabs&&!ownerTabActions){clearTimeout(contentSyncTimer);contentSyncTimer=setTimeout(()=>void contentTabSync.all(),100);}
    lastWorkspace=json;
    if(window.desktop?.workspaceSession)workspaceSaving=window.desktop.workspaceSession({action:'save',session}).catch(error=>{lastWorkspace='';toast(error.message);return {failed:true,error:error.message};});
    else try{localStorage.setItem('proteus.workspace',json);}catch{}
  }
  // Send the saved history/pending marker before starting the local-only outbox
  // checkpoint. Window shutdown waits for both without waiting for a remote host.
  // An owner placement already committed the canonical descriptor. Avoid starting
  // a competing local synchronization while acknowledging its renderer placement.
  const checkpoint=ownerTabActions?null:checkpointDepartedContentScopes();
  if(checkpoint)workspaceSaving=Promise.all([workspaceSaving,checkpoint]).then(results=>results.find(result=>result?.failed)||results[0]);
  return workspaceSaving;
}
function openFeatureTab(type) { if(type==='life'&&!lifeVisible())return;state.page=type;state.tab='overview';render(); }
function restoreFeatureTabs() {
  if(!lifeVisible()){state.tabs=state.tabs.filter(tab=>tab.type!=='life');if(!state.tabs.some(t=>t.id===state.tab))state.tab='overview';}
}
// Children created by an earlier attempt, keyed by saved view ID. A retry must adopt
// them: the saved session still holds the old IDs, so it would otherwise duplicate.
const restoreCreated=new Map();
let retainedTeamSession=null;
function adoptRestoredBrowser(tab,info){
 const previous=tab.id;tab.info=info;delete tab.restoreFailed;delete tab.restoreRetrying;
 if(previous!==info.id){tab.id=info.id;if(state.tab===previous)state.tab=info.id;for(const [parent,child]of selectedChildren)if(child===previous)selectedChildren.set(parent,info.id);}
}
function createRestoredBrowser(tab){
 return window.desktop.browser({action:'create',restore:true,deferLoad:true,contentTabId:tab.contentTabId||tab.id,profileId:tab.profileId,parentId:tab.parentId,unloaded:true,hidden:!!tab.hidden,url:tab.remotePreviewURL?'about:blank':tab.url,history:tab.remotePreviewURL?undefined:tab.history,navigationPending:!tab.remotePreviewURL&&tab.navigationPending===true,title:tab.label,favicon:tab.favicon,lastTouchedAt:tab.lastTouchedAt,lastActivityAt:tab.lastActivityAt,associationChatId:tab.associationChatId,openedAt:tab.openedAt,persist:tab.persist===true,audioMuted:tab.audioMuted===true});
}
function retainFailedBrowser(tab,pending){
 tab.restoreFailed=true;tab.info=failedChildInfo(tab);
 // A step past its deadline can still finish. Keep that view when the tab still
 // needs it; otherwise release it so this window cannot accumulate a duplicate.
 pending?.then(info=>{if(tab.restoreFailed&&(!workspaceReady||state.tabs.includes(tab))){adoptRestoredBrowser(tab,info);restoreCreated.set(tab.savedId,info);if(workspaceReady){saveWorkspace();render();}}else void window.desktop.browser({action:'close',presentationOnly:true,id:info.id}).catch(()=>{});},()=>{});
}
async function restoreWorkspace() {
  await initializeViewPositions().catch(error=>toast(error.message));
  workspaceRestoring=true;
  let failedChildren=0;
  try {
    let saved=await restoreStep('session',()=>window.desktop?.workspaceSession?window.desktop.workspaceSession({action:'get'}):JSON.parse(localStorage.getItem('proteus.workspace')||'null'));
    if(!saved&&state.data.desktopPreview?.enabled){const profile=state.data.context.workspaces.find(w=>w.name==='Studio')||state.data.context.workspaces[0];saved={tabs:[state.tabs[0],{id:'workspace:local:'+profile.id,type:'workspace',workspaceId:profile.id,label:profile.name,workspacePage:'projects'}],active:'workspace:local:'+profile.id,page:'context'};}
    if(!saved){let legacy=[];try{legacy=JSON.parse(localStorage.getItem('proteus.feature-tabs')||'[]');}catch{}saved={tabs:[...state.tabs,...legacy.filter(type=>['omi','life'].includes(type)).map(type=>({id:'feature-'+type,type,label:type==='omi'?'Mnemosyne':'Life'}))],active:'overview',page:'home'};}
    const tabs=[], restoredBrowserIds=new Map(), existingBrowser=window.desktop?await restoreStep('inventory',()=>window.desktop.browser({action:'list'})):[];
    const claimedBrowsers=new Set(existingBrowser.filter(info=>saved.tabs?.some(tab=>tab.id===info.id)).map(info=>info.id));
    for(const entry of saved.tabs||[]) {
      const tab={...entry};
      if(tab.type==='standup'){tab.type='team';tab.id='feature-team';tab.label='Team Tools';if(saved.active===entry.id)saved.active=tab.id;if(!saved.team)saved.team={active:'standup'};}
      if(['omi','life','team','standup','engine','home'].includes(tab.type)){if(saved.active===entry.id){saved.page=tab.type==='standup'?'team':tab.type;saved.active='overview';}continue;}
      if(tab.type==='agent-terminal')tab.runId=agentTerminalRunId(tab);
      // Saved views survive incomplete summaries and unavailable owners. Opening
      // the view can report availability; restoration must not delete its children.
      if(tab.type==='schedule'&&!state.data.schedules.some(schedule=>schedule.id===tab.id))continue;
      if(tab.type==='markdown') {
        tab.markdown={file:tab.file};
      }
      if(tab.type==='browser') {
        if(!window.desktop)continue;
        // A renderer reload reuses the live view; an app restart creates a private tab.
        if(!tab.remotePreviewURL&&saved.tabs.some(parent=>parent.id===tab.parentId&&parent.type==='remote-run')&&isLoopbackPreview(tab.url))tab.remotePreviewURL=tab.url;const previous=tab.id;tab.contentTabId??=previous;tab.savedId=previous;let info=existingBrowser.find(info=>info.id===tab.id)||restoreCreated.get(previous)||existingBrowser.find(info=>!claimedBrowsers.has(info.id)&&info.restoreIdentity===tab.contentTabId&&(info.parentId||null)===(tab.parentId||null));if(info)claimedBrowsers.add(info.id);
        if(!info){
          // Every child starts unloaded, so one page, profile or network cannot hold
          // the rest of this window. The selected page loads after the window is ready.
          const pending=createRestoredBrowser(tab);
          try{info=await restoreStep('child',()=>pending);restoreCreated.set(previous,info);}
          catch(error){failedChildren++;retainFailedBrowser(tab,pending);tabs.push(tab);continue;}
        }
        tab.info=info;if(info.id!==previous){tab.id=info.id;restoredBrowserIds.set(previous,tab.id);if(saved.active===previous)saved.active=tab.id;}
      }
      if(!tabs.some(other=>other.id===tab.id))tabs.push(tab);
    }
    // Remembered selections use client-local view IDs, just like the active tab.
    // Remap them before saving; otherwise the workspace ownership filter drops them.
    const interim=state.tab!=='overview'?state.tab:null;
    state.chatDrafts={...saved.chatDrafts,...state.chatDrafts};selectedChildren.clear();for(const [parent,child] of Object.entries(saved.selectedChildren||{}))selectedChildren.set(parent,restoredBrowserIds.get(child)||child);
    const restored=tabs.length?tabs.filter(tab=>!tab.parentId||tabs.some(parent=>parent.id===tab.parentId&&['run','remote-run','workspace'].includes(parent.type))):state.tabs;
    state.tabs=mergeOpenedTabs(restored,state.tabs);state.page=interim?state.page:saved.page||'home';state.engineSection=saved.engineSection||'resources';
    try{restoreTeamState(saved.team,existingBrowser);retainedTeamSession=null;}catch(error){retainedTeamSession=saved.team||null;reportWindowRestore({outcome:'failed',stage:'team',attempts:1});toast('Team tools could not be restored. They are retained and unchanged.');}
    state.tab=interim&&state.tabs.some(tab=>tab.id===interim)?interim:state.tabs.some(tab=>tab.id===saved.active)?saved.active:'overview';
    if(!saved.rendererRecovery)for(const info of existingBrowser.filter(item=>item.loaded!==false&&!item.persist&&item.id!==state.tab))try{await window.desktop.browser({action:'unload',id:info.id});info.loaded=false;}catch{/* Protected audible, agent-owned or downloading views retain their work. */}
    state.recoveryGeneration=saved.recoveryGeneration||0;
  } finally {workspaceRestoring=false;}
  restoreCreated.clear();
  // Peers and later rendering cannot undo a completed restoration or block saving.
  await loadPeers().catch(error=>toast(error.message));if(state.tabs.find(tab=>tab.id===state.tab)?.connectionPaused)state.tab='overview';
  resetTabReveals();workspaceReady=true;render();requestAnimationFrame(revealSelectedTab);await saveWorkspace();await window.desktop?.workspaceSession({action:'ready',generation:state.recoveryGeneration||0});
  if(failedChildren)reportWindowRestore({outcome:'partial',stage:'child',failed:failedChildren,total:state.tabs.filter(tab=>tab.type==='browser').length});
  renderWindowRestoreNotice();
  void loadRestoredBrowsers();
}
// Page loads happen only after the session is restored, and each is independent.
async function loadRestoredBrowsers(){
 const selected=state.tabs.find(tab=>tab.id===state.tab);
 const load=(tab,request)=>request.then(info=>{if(!state.tabs.includes(tab))return;tab.info=info;tab.label=tab.customTitle||info.title||tab.label;saveWorkspace();if(state.tab===tab.id)renderBrowser();}).catch(error=>{if(state.tab===tab.id)toast(error.message);});
 if(selected?.type==='browser'&&!selected.restoreFailed&&selected.info?.loaded===false&&selected.info.url&&!selected.activating){selected.activating=true;void load(selected,window.desktop.browser({action:'activate',id:selected.id})).finally(()=>{selected.activating=false;});}
 for(const tab of state.tabs.slice())if(tab.type==='browser'&&!tab.restoreFailed&&tab!==selected&&tab.info?.persist&&tab.info.loaded===false)await load(tab,window.desktop.browser({action:'persist',id:tab.id,enabled:true}));
}
function reportWindowRestore(detail){void window.desktop?.workspaceSession?.({action:'restore-status',...detail})?.catch(()=>{});}
const failedRestoreTabs=()=>state.tabs.filter(tab=>tab.restoreFailed);
// Re-create only what failed: successfully restored children keep their identity.
async function retryFailedBrowsers(){
 for(const tab of failedRestoreTabs()){
  if(tab.restoreRetrying)continue;tab.restoreRetrying=true;
  try{adoptRestoredBrowser(tab,await restoreStep('child',()=>createRestoredBrowser(tab)));}
  catch(error){delete tab.restoreRetrying;}
 }
 saveWorkspace();render();renderWindowRestoreNotice();
 if(!failedRestoreTabs().length)reportWindowRestore({outcome:'recovered',attempts:1});
}
function windowRestoreNotice(){
 const {status}=windowRestore.status(),failed=failedRestoreTabs().length;
 if(status==='restored'&&!failed)return null;
 if(status==='restored')return {text:(failed===1?'One saved tab':failed+' saved tabs')+' could not be restored. They are retained and were not closed.',retry:retryFailedBrowsers};
 if(status==='failed')return {text:'This window’s saved tabs could not be restored. They are retained and unchanged, and this window is not showing them or saving changes yet.',retry:()=>windowRestore.retry()};
 return {text:status==='retrying'?'Still restoring this window’s saved tabs…':'Restoring this window’s saved tabs…'};
}
function renderWindowRestoreNotice(){
 const notice=windowRestoreNotice();let bar=$('#window-restore-notice');
 if(!notice){bar?.remove();return;}
 if(!bar){bar=document.createElement('div');bar.id='window-restore-notice';bar.setAttribute('role','status');$('#workspace').prepend(bar);}
 bar.innerHTML='<span></span>'+(notice.retry?'<button type="button" data-restore-retry>Try again</button><button type="button" data-restore-reload>Reload Window</button>':'');
 bar.firstChild.textContent=notice.text;
 const retry=bar.querySelector('[data-restore-retry]');if(retry)retry.onclick=()=>void notice.retry();
 const reload=bar.querySelector('[data-restore-reload]');if(reload)reload.onclick=()=>location.reload();
}
const windowRestore=createWindowRestore({
 // State is read again on each attempt: the first read can fail while the owner starts.
 attempt:async()=>{await restoreStep('state',()=>refresh(true));await restoreWorkspace();},
 onChange:()=>{if(state.data)render();renderWindowRestoreNotice();},
 report:reportWindowRestore
});
function saveAppearance(patch) {
  if(appearanceBusy)return;
  appearanceSaving=performAppearanceSave(patch);return appearanceSaving;
}
function savePreviewSidebarAppearance(patch){
  previewAppearanceSaving=previewAppearanceSaving.catch(()=>{}).then(async()=>{
    await appearanceSaving.catch(()=>{});
    return saveAppearance(patch);
  });
  return previewAppearanceSaving;
}
async function performAppearanceSave(patch) {
  appearanceSaveGeneration++;
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
    return saved;
  } finally {
    appearanceSaveGeneration++;
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
const toast=createToast($('#toast'));
async function api(url, data, options={}) {
  if(workspaceClosing)throw new Error('Proteus is closing.');
  if(data&&(/^\/api\/chat$/.test(url)||/^\/api\/runs\/[^/]+\/(send|reply|resume|answer-question)$/.test(url)))data={...data,inputOrigin:data.inputOrigin||{client:'desktop',windowId:desktopWindowId,viewId:state.tab}};
  const response = await fetch(url, data === undefined ? options : { ...options, method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(data) });
  const result = await response.json(); if (!response.ok) {const error=new Error(result.error || response.statusText);if(typeof result.code==='string')error.code=result.code;throw error;} return result;
}
const localHistories=new Map(), historyRequests=new Map(), historyGenerations=new Map(), localSendAttempts=new Map();
function releaseChatView(tab){
 if(!previewEnabled(state)||!['run','remote-run','agent-terminal'].includes(tab.type))return;
 const id=tab.type==='agent-terminal'?agentTerminalRunId(tab):tab.runId||tab.id,host=tab.hostId||'local';
 if([...state.tabs,...teamState().tabs].some(other=>(other.hostId||'local')===host&&(['run','remote-run'].includes(other.type)?(other.runId||other.id)===id:other.type==='agent-terminal'&&agentTerminalRunId(other)===id)))return;
 if(host!=='local'){forgetRemoteConversation(host,id);return;}
 viewResidency.drop('chat:'+id);historyGenerations.set(id,(historyGenerations.get(id)||0)+1);historyRequests.delete(id);localHistories.delete(id);forgetConversation(id);
}
let previewActivityRender;
function schedulePreviewActivityRender(){if(!previewEnabled(state))return;clearTimeout(previewActivityRender);previewActivityRender=setTimeout(()=>{if(!workspaceClosing)render({sidebarOnly:true,preserveTeamBrowser:true});},120);}
function recordPreviewActivity(tab,at=new Date().toISOString()){
 if(!previewEnabled(state)||!tab)return;
 tab.lastActivityAt=at;saveWorkspace();schedulePreviewActivityRender();
}
function recordChatActivity(id){
 if(!previewEnabled(state))return;
 const at=new Date().toISOString();for(const tab of state.tabs)if(tab.type==='run'&&(tab.runId||tab.id)===id)tab.lastActivityAt=at;
 const run=state.data.runs.find(run=>run.id===id);if(run)run.lastActivityAt=at;saveWorkspace();schedulePreviewActivityRender();
}
async function setTabVisibility(tab,hidden){
 if(tab.restoreFailed){tab.info={...tab.info,hidden};}
 else if(previewEnabled(state)&&tab.type==='browser'){
  const info=await window.desktop.browser({action:'visibility',id:tab.browserId||tab.id,hidden});
  if(tab.info)tab.info=info;else Object.assign(tab,info,{id:tab.id,browserId:tab.browserId});
 }
 tab.hidden=hidden;
 if(hidden&&state.tab===tab.id)state.tab=tab.parentId||'overview';
 if(hidden&&teamState().active===tab.id)teamState().active='overview';
 if(hidden&&selectedChildren.get(tab.parentId)===tab.id)selectedChildren.delete(tab.parentId);
}
function agentTerminalRunId(tab){return tab.runId||(tab.id?.startsWith('agent-terminal:')?tab.id.slice('agent-terminal:'.length):null)||state.tabs.find(parent=>parent.id===tab.parentId)?.runId||tab.parentId;}
async function loadRunView(id,before){
  if(before===undefined&&historyRequests.has(id))return historyRequests.get(id);
  const generation=historyGenerations.get(id)||0;
  const task=(async()=>{const prior=localHistories.get(id),query=new URLSearchParams({id});if(before!==undefined)query.set('beforeEvent',before);else if(prior?.historyCursor)query.set('cursor',prior.historyCursor);
    const incoming=await api('/api/chat-view?'+query),run=mergeChatHistory(localHistories.get(id),incoming);
    if((historyGenerations.get(id)||0)!==generation)return run;
    localHistories.delete(id);localHistories.set(id,run);viewResidency.retain('chat:'+id,'chat','history',{active:()=>{const tab=state.tabs.find(tab=>tab.id===state.tab);return tab?.type==='run'&&(tab.runId||tab.id)===id||tab?.type==='agent-terminal'&&agentTerminalRunId(tab)===id;},dispose:()=>{historyGenerations.set(id,(historyGenerations.get(id)||0)+1);historyRequests.delete(id);localHistories.delete(id);forgetConversation(id);}});return run;
  })();if(before===undefined)historyRequests.set(id,task);
  try{return await task;}finally{if(historyRequests.get(id)===task)historyRequests.delete(id);}
}
let refreshing=null,lastStateRefresh=0;
async function refresh(force=false){if(refreshing)return refreshing;const task=refreshing=refreshState(force);try{return await task;}finally{if(refreshing===task)refreshing=null;}}
async function refreshState(force = false) {
  if (!force && window.getSelection()?.isCollapsed === false) return;
  const settingsGeneration=appearanceSaveGeneration;
  const data = await api('/api/state?summaries=1');lastStateRefresh=Date.now();
  const selected=state.tabs.find(tab=>tab.id===state.tab);if(selected?.type==='run'||selected?.type==='agent-terminal')await loadRunView(selected.type==='run'?(selected.runId||selected.id):agentTerminalRunId(selected));
  if(previewEnabled(state)&&settingsGeneration!==appearanceSaveGeneration)data.settings=state.data.settings;
  const signature = JSON.stringify(data);
  const activityChanged=previewEnabled(state)&&JSON.stringify(state.data?.runs?.map(run=>[run.id,run.lastActivityAt]))!==JSON.stringify(data.runs?.map(run=>[run.id,run.lastActivityAt]));
  state.data = data;viewResidency.configure(data.settings.resources);syncPalette(data.settings);reconcilePreviewProjects();if(activityChanged)schedulePreviewActivityRender();previewSidebarLayout.sync();const runningBadge=$('[data-page="runs"] .count');if(runningBadge)runningBadge.textContent=runningChats(data.runs);announceAttention();syncMessageContext();if(workspaceReady)void contentTabSync.all();
  if (force || selected?.type==='run' || selected?.type==='agent-terminal' || signature !== state.signature || $('#main').dataset.deferredControls) {
    state.signature = signature;
    const tab=state.tabs.find(t=>t.id===state.tab);
    if(tab?.type==='run' && $('#main').dataset.runId===(tab.runId||tab.id) && $('#conversation-host')) {
      renderRun(tab.runId||tab.id);
      for(const [page,count] of [['runs',runningChats(data.runs)],['attention',attentionItems().length]]) {
        const node=$(`[data-page="${page}"] .count`);if(node)node.textContent=count;
      }
    } else if(tab?.type==='browser' && $('#browser-form')) {renderTabs();updateBrowserControls();requestAnimationFrame(browserBounds);}
    else if(tab?.type==='workspace'&&$('#workspace-page')){renderTabs();renderChatSubtabs();}
    else render({preserveTeamBrowser:!force});
  }
}
let tabInteractionEpoch=0;for(const event of ['pointerdown','keydown'])document.addEventListener(event,()=>tabInteractionEpoch++,true);
function openTab(tab, afterId=null) {
  if(tab.type==='run'&&!tab.parentId&&!tab.hostId){const run=state.data?.runs?.find(run=>run.id===(tab.runId||tab.id));if(run&&previewEnabled(state)&&openPreviewChat(run))return;if(run?.workspaceId&&!previewEnabled(state))return void sendChatToWorkspace({...run,local:true});}
  if(tab.parentId&&!state.tabs.some(parent=>parent.id===tab.parentId&&['run','remote-run','workspace'].includes(parent.type)))delete tab.parentId;
  if(tab.parentId){const parent=state.tabs.find(item=>item.id===tab.parentId);if(parent?.type==='workspace'){parent.hidden=false;parent.navigationClosed=false;}}
  if(tab.type==='markdown'){
    const file=tab.markdown?.file||tab.file;
    const same=file&&state.tabs.find(item=>item.type==='markdown'&&item.parentId===tab.parentId&&(!tab.contentTabId||item.contentTabId===tab.contentTabId)&&(item.markdown?.file||item.file)===file);
    if(same)tab.id=same.id;
    else if(state.tabs.some(item=>item.id===tab.id))tab.id='document-view:'+crypto.randomUUID();
  }
  const existing = state.tabs.find(item => item.id === tab.id);
  if(['run','remote-run','markdown'].includes(tab.type)){
    const interaction=tabInteractionEpoch;
    void descriptorFor(tab,state.tabs.find(item=>item.id===tab.parentId)||{type:'main'}).then(async descriptor=>{
      if(!descriptor||!await contentTabSync.reopen(tabScope(tab),descriptor)||interaction!==tabInteractionEpoch)return;
      const current=state.tabs.find(item=>(item.contentTabId===descriptor.id||descriptor.type==='chat'&&(item.runId||item.id)===descriptor.chatId)&&item.parentId===tab.parentId);
      if(current){state.tab=current.id;if(current.parentId)selectedChildren.set(current.parentId,current.id);saveWorkspace();render();}
    }).catch(error=>toast(error.message));
  }
  if (!existing) {tab.openedAt ||= new Date().toISOString();state.tabs.push(tab);}
  else if(tab.type==='workspace')Object.assign(existing,tab,{hidden:false,navigationClosed:false});
  else if (tab.type === 'markdown' || tab.parentId) Object.assign(existing, tab);
  // A native state broadcast may register a new view before create returns.
  // Keep the user's creation intent on that same view until its owner accepts it.
  if(tab.pendingOpen)(existing||tab).pendingOpen=true;
  if(!previewEnabled(state))(existing||tab).lastTouchedAt=new Date().toISOString();
  else if(!existing&&!['run','remote-run','workspace'].includes(tab.type))tab.lastActivityAt||=tab.info?.lastActivityAt||tab.openedAt;
  placeTabAfter(state.tabs,tab.id,afterId);
  state.tab=!tab.parentId&&['run','remote-run','workspace'].includes(tab.type)?restoreTabSelection(state.tabs,tab.id,selectedChildren,{projects:previewEnabled(state)}):tab.id;state.selected = state.tab; render();revealSelectedTab();
}
function revealSelectedTab(){
  const id=state.tab;requestAnimationFrame(()=>{if(state.tab!==id)return;const tab=state.tabs.find(t=>t.id===id),top=previewEnabled(state)?previewTopId(tab,state):tab?.parentId||id;for(const [list,node] of [[$('#tabs .tab-list'),document.querySelector('[data-tab-container="'+CSS.escape(top||id)+'"]')],[$('#chat-subtabs .chat-subtab-list'),document.querySelector('.chat-subtab-list [data-chat-subtab="'+CSS.escape(id)+'"]')]]){if(!list||!node)continue;revealWholeTab(list,node.closest('.tabitem,.chat-subtab')||node);}});
}
async function schedule(id) {
  try { state.data = await api('/api/state?summaries=1');viewResidency.configure(state.data.settings.resources); } catch (error) { toast(error.message); return; }
  const value = state.data.schedules.find(s => s.id === id); if (!value || value.error) return toast(value?.error || 'Schedule missing.');
  state.draft = structuredClone(value); state.dirty = false;
  openTab({ id, label:value.name, type:'schedule' });
}
function runTab(run) { state.page = 'runs'; openTab({ id:run.id, label:run.title, type:'run' }); }
function revokeHostContent(hostId){
  contentTabSync.forgetHost(hostId);
  const parents=new Set(state.tabs.filter(tab=>['remote-run','workspace'].includes(tab.type)&&tab.hostId===hostId).map(tab=>tab.id));
  const removed=state.tabs.filter(tab=>(['remote-run','workspace'].includes(tab.type)&&tab.hostId===hostId)||(tab.type==='remote-document'&&tab.hostId===hostId)||(tab.type==='browser'&&parents.has(tab.parentId)));
  for(const tab of state.tabs){if(parents.has(tab.parentId)&&!removed.includes(tab))delete tab.parentId;}
  state.tabs=state.tabs.filter(tab=>!removed.includes(tab));for(const parent of parents)selectedChildren.delete(parent);
  if(removed.some(tab=>tab.id===state.tab)){state.tab='overview';state.page='runs';}
  for(const tab of removed){if(tab.type==='remote-document')forgetRemoteDocument(tab.id);if(tab.type==='browser')void window.desktop.browser({action:'close',id:tab.id}).catch(()=>{});}
  saveWorkspace();render();
}
function reconcileDeletedChat(row){
  const chatId=row.chatId||row.runId||row.id,local=row.local||!row.hostId||row.hostId==='local';
  const sameHost=tab=>local?!tab.hostId:tab.hostId===row.hostId;
  const parent=local?chatId:'peer:'+row.hostId+':'+chatId;
  const removed=new Set([parent,...state.tabs.filter(tab=>sameHost(tab)&&(['run','remote-run'].includes(tab.type)&&(tab.runId||tab.id)===chatId||tab.type==='agent-terminal'&&agentTerminalRunId(tab)===chatId||tab.type==='remote-document'&&tab.runId===chatId)).map(tab=>tab.id)]);
  for(const tab of state.tabs){
    if(removed.has(tab.parentId)){
      if(['remote-document','agent-terminal'].includes(tab.type))removed.add(tab.id);
      else delete tab.parentId; // Keep independent browser, file and terminal work open.
    }
    if(removed.has(tab.id)&&tab.type==='remote-document')forgetRemoteDocument(tab.id);
  }
  for(const [owner,child] of selectedChildren)if(removed.has(owner)||removed.has(child))selectedChildren.delete(owner);
  state.tabs=state.tabs.filter(tab=>!removed.has(tab.id));
  if(local){state.data.runs=state.data.runs.filter(run=>run.id!==chatId);localHistories.delete(chatId);forgetConversation(chatId);}
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
function openEventLogs(value) {
  // Keep any draft fields intact while making the requested destination visible.
  document.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());
  state.logTarget={id:value.logId,hostId:value.hostId};
  const alreadyVisible=state.tab==='overview'&&state.page==='engine'&&state.engineSection==='logs';
  navigate('engine','logs');
  if(alreadyVisible)renderEngineRoom('logs',true);
}
const previewChatKey=row=>(row.local||!row.hostId||row.hostId==='local'?'local':row.hostId)+':'+(row.chatId||row.runId||row.id);
function previewFeatureRows(feature){
 const touches=new Map();
 for(const tab of state.tabs){if(!['run','remote-run'].includes(tab.type))continue;const key=previewChatKey(tab);touches.set(key,Math.max(touches.get(key)||0,Date.parse(tab.lastActivityAt)||0));}
 const rows=feature==='attention'?attentionItems().map(item=>({item,row:item.chat,title:item.title,at:item.at})):recentChats(state.data.runs).filter(row=>chatType(row)===(feature==='internet'?'internet':feature==='schedules'?'scheduled':'user')).map(row=>({row,title:row.title}));
 return rows.map(entry=>({...entry,at:entry.row?Math.max(touches.get(previewChatKey(entry.row))||0,previewChatActivity(entry.row)):(Date.parse(entry.at||0)||0)})).sort((a,b)=>b.at-a.at||String(a.title).localeCompare(String(b.title)));
}
function previewFeatureChildren(feature,selectedChat){
 const rows=previewFeatureRows(feature),limit=previewFeatureLimits.get(feature)||7;
 return rows.slice(0,limit).map(({row,item,title,at})=>{
  const selected=row&&selectedChat&&previewChatKey(row)===previewChatKey(selectedChat),label=title||'Chat',computer=row?.destinationName||computerName(state.data.hostName);
  return `<button class="navchild preview-tree-item ${selected?'active':''} ${row?.status==='running'?'chat-running':''}" ${item?`data-preview-attention-item="${escape(item.id)}"`:`data-preview-feature-chat="${escape(previewChatKey(row))}"`} title="${escape(label)}"><span class="preview-tree-icon" aria-hidden="true">${row?pairedBubbles:'!'}</span><span class="preview-tree-copy"><span class="preview-tree-title">${escape(label)}</span>${row?`<small class="preview-tree-computer">${escape(computer)}</small>`:''}</span><small class="preview-tree-age" title="${at?escape(new Date(at).toLocaleString()):'Last access unavailable'}">${escape(previewRelativeAge(at))}</small></button>`;
 }).join('')+(rows.length>limit?`<button class="navchild preview-tree-more" data-preview-feature-more="${feature}">More…</button>`:'');
}
function bindPreviewFeatures(){
 if(!previewEnabled(state))return;
 document.querySelectorAll('[data-preview-feature-chat]').forEach(button=>button.onclick=()=>{previewAttentionChat=null;const row=recentChats(state.data.runs).find(row=>previewChatKey(row)===button.dataset.previewFeatureChat);if(row)openIndexedChat(row);});
 document.querySelectorAll('[data-preview-attention-item]').forEach(button=>button.onclick=()=>{const item=attentionItems().find(item=>item.id===button.dataset.previewAttentionItem);previewAttentionChat=item?.chat?previewChatKey(item.chat):null;openAttentionItem(button.dataset.previewAttentionItem);});
 document.querySelectorAll('[data-preview-feature-more]').forEach(button=>button.onclick=()=>{const feature=button.dataset.previewFeatureMore;previewFeatureLimits.set(feature,(previewFeatureLimits.get(feature)||7)+4);render();(document.querySelector('[data-preview-feature-more="'+feature+'"]')||document.querySelector('[data-page="'+feature+'"]'))?.focus({preventScroll:true});});
}
function navigate(page, section) {
  if(previewEnabled(state))previewSidebarLayout.close();
  if(previewEnabled(state))previewAttentionChat=null;
  document.querySelectorAll('.tab-add-menu[open],.chat-tab-add[open],.team-tab-add[open]').forEach(menu=>menu.open=false);
  const previous=state.tabs.find(tab=>tab.id===state.tab);
  if(previous?.type==='team' && page!=='team')void leaveTeamTools().catch(error=>toast(error.message));
  if(['omi','life','team'].includes(page)) { openFeatureTab(page); return; }
  if(page==='engine')state.engineSection=section||'resources';
  if(page==='life-section') { openFeatureTab('life'); return; }
  state.page=page;state.tab='overview';render();
}
function render({preserveTeamBrowser=false,sidebarOnly=false}={}) {
  preserveTeamBrowser=preserveTeamBrowser&&(state.tabs.find(tab=>tab.id===state.tab)?.type==='team'||state.page==='team'&&state.tab==='overview')&&canPreserveTeamBrowser();
  const data = state.data; if (!data) return;
  reconcilePreviewProjects();
  reconcilePreviewChatPlacement();
  const outgoingBrowserRevision=browserSurfaceRevision();if(!preserveTeamBrowser&&!sidebarOnly)selectBrowserSurface();
  const main=$('#main');rememberView(main,main.dataset.viewKey);const nextViewKey=state.tab==='overview'?'page:'+state.page:'tab:'+state.tab;if(main.dataset.viewKey!==nextViewKey)pageFind.close();main.dataset.viewKey=nextViewKey;
  restoreFeatureTabs();syncMessageContext();
  const activeTab=state.tabs.find(tab=>tab.id===state.tab);rememberTabSelection(state.tabs,state.tab,selectedChildren,{projects:previewEnabled(state)});
  const parentTab=activeTab?.parentId?state.tabs.find(tab=>tab.id===activeTab.parentId):null;
  const chatTab=parentTab||activeTab,category=chatType(recentChats(data.runs).find(row=>(row.chatId||row.id)===(chatTab?.runId||chatTab?.id)&&(chatTab?.hostId?row.hostId===chatTab.hostId:row.local||row.hostId==='local'))||{}),chatPage=category==='internet'?'internet':category==='scheduled'?'schedules':'runs';
  const previewRoot=previewEnabled(state)?state.tabs.find(tab=>tab.id===previewTopId(activeTab,state)):null;
  const inferredPage=previewRoot?.type==='workspace'||activeTab?.type==='workspace'||parentTab?.type==='workspace'?'context':['omi','life','team'].includes(activeTab?.type)?activeTab.type:['run','remote-run'].includes(activeTab?.type)||parentTab?chatPage:activeTab?.type==='schedule'?'schedules':state.page;
  const activePage=previewEnabled(state)&&inferredPage!=='context'&&previewAttentionChat&&['run','remote-run'].includes(chatTab?.type)&&previewAttentionChat===previewChatKey(chatTab)?'attention':inferredPage;
  if(previewEnabled(state)&&previousFeature!==activePage){previewSidebarLayout.close();previewFeatureLimits.clear();}
  const waiting = attentionItems().length;
  const nav=[['home','<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z"/><path d="M9 21v-7h6v7"/></svg>','Home',''],['schedules','◷','Schedules',data.schedules.length],['runs',pairedBubbles,'Chats',runningChats(data.runs)],['internet', '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></svg>','Internet Searches',recentChats(data.runs).filter(r=>chatType(r)==='internet').length],['attention','!','Needs attention',waiting],['omi','<svg class="transcription-nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M2 10v4M6 7v10M10 3v18M14 8v8M18 5v14M22 10v4"/></svg>','Mnemosyne',''],...(lifeVisible()?[['life','♡','Life','']]:[]),['team','☷','Team Tools',''],['context','<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>','Workspaces',''],['engine','⚙','Engine Room','']];
  const children=id=>previewEnabled(state)&&['runs','internet','schedules','attention'].includes(id)?previewFeatureChildren(id,['run','remote-run'].includes(chatTab?.type)?chatTab:null):id==='context'?(previewEnabled(state)?[]:recentWorkspaces()).map((w,i)=>`<button class="navchild" data-recent-workspace="${i}" title="${escape(w.name)}"><span>${escape(w.name)}</span><small>${escape(w.hostName)}</small></button>`).join(''):id==='attention'?attentionItems().slice(0,7).map(item=>`<button class="navchild" data-attention-item="${escape(item.id)}"><span>${escape(item.title)}</span></button>`).join(''):['runs','internet','schedules'].includes(id)?recentChats(data.runs).filter(r=>chatType(r)===(id==='internet'?'internet':id==='schedules'?'scheduled':'user')).slice(0,7).map((row,i)=>`<button class="navchild ${row.status==='running'?'chat-running':''}" data-recent-chat="${i}" data-recent-type="${id==='internet'?'internet':id==='schedules'?'scheduled':'user'}" title="${escape(row.title||'Chat')}"><span>${escape(row.title||'Chat')}</span><small>${escape(row.destinationName||computerName(data.hostName))}</small></button>`).join(''):id==='life'?['Overview','Nutrition','Garage','Fuel & mileage','Capture inbox','New capture','Account & security','Connections'].map((name,i)=>`<button class="navchild" data-life-section="${['overview','nutrition','garage','fuel','inbox','capture','security','connections'][i]}">${escape(name)}</button>`).join(''):id==='engine'?(previewEnabled(state)?[['source-library','Source Library'],...engineSections()]:engineSections()).map(([key,label])=>`<button class="navchild ${state.engineSection===key?'active':''}" data-engine-section="${key}">${escape(label)}</button>`).join(''):id==='team'?'<button class="navchild" data-team-section="overview">Overview</button><button class="navchild" data-team-section="standup">Standup</button>':' ';
  previewSidebarLayout.beforeRender();
  capturePreviewSidebar();
  $('#sidebar').innerHTML = `<div class="brand"><span class="brandmark">⤨</span><span class="brand-text">Proteus</span><button id="sidebar-toggle" class="subtle" aria-label="Collapse sidebar" title="Collapse sidebar">‹</button></div><nav aria-label="Features">${nav.map(([id,icon,label,count])=>`${previewEnabled(state)&&activePage===id&&['runs','internet','schedules','attention','engine'].includes(id)?`<section class="preview-feature-group" data-preview-feature-group="${id}">`:''}<button class="navitem ${activePage===id?'active':''}" data-page="${id}"><span><span class="nav-icon">${icon}</span><span class="navlabel">${label}</span></span>${count!==''?`<span class="count${previewEnabled(state)&&id==='attention'&&Number(count)>0?' preview-attention-count':''}">${count}</span>`:''}</button>${activePage===id?`<div class="navchildren">${children(id)}</div>`:''}${previewEnabled(state)&&activePage===id&&['runs','internet','schedules','attention','engine'].includes(id)?'</section>':''}`).join('')}</nav><div class="sidebottom"><section id="provider-usage" aria-label="Provider allowance remaining"></section><div><span class="dot"></span>${escape(computerName(data.hostName))} · Connected</div><p>Prototype · v${data.version}<br>${data.scheduler.background ? (data.hostPlatform==='darwin'?'Keeps running in the menu bar.':'Keeps running in the system tray.') : 'Runs while the host is running.'}</p>${previewEnabled(state)?'':'<button class="subtle" id="data-folder">Open data folder ↗</button>'}</div>`;
  $('#sidebar').querySelectorAll('[data-attention-item]').forEach(button=>button.onclick=()=>openAttentionItem(button.dataset.attentionItem));
  $('#sidebar').querySelectorAll('[data-recent-workspace]').forEach(b=>b.onclick=()=>openWorkspace(recentWorkspaces()[Number(b.dataset.recentWorkspace)]));
  bindPreviewSidebar();
  previewSidebarLayout.bind();
  bindPreviewFeatures();
  renderUsage();
  renderTabs();
  saveWorkspace();
  if(previousFeature==='team'&&activePage!=='team')void leaveTeamTools(outgoingBrowserRevision).catch(error=>toast(error.message));
  previousFeature=activePage;
  const tab = state.tabs.find(t => t.id === state.tab);
  if(!sidebarOnly){
  if(tab?.type!=='files'||$('#main').dataset.fileBrowser!==tab.id){disposeFileBrowser?.();disposeFileBrowser=null;delete $('#main').dataset.fileBrowser;}
  chatSetupTabs.park();
  $('#main').classList.remove('browser-main', 'run-main', 'remote-run-main', 'team-main', 'terminal-main','new-chat-main');
  if(tab?.type!=='remote-document')void window.desktop?.artifactPreview?.({action:'hide'}).catch(()=>{});
  if (tab?.type === 'schedule') renderSchedule(tab.id);
  else if (tab?.type === 'run') renderRun(tab.runId||tab.id);
  else if(tab?.type==='workspace')void renderWorkspace(tab);
  else if (tab?.type === 'remote-run') void renderRemoteRun(tab);
  else if (tab?.type === 'remote-document') void renderRemoteDocument(tab);
  else if (tab?.type === 'browser') renderBrowser();
  else if (tab?.type === 'unavailable') {
    $('#main').innerHTML='<h1>'+escape(tab.label)+'</h1><p class="banner">This tab is unavailable</p><p>'+escape(tab.unavailableReason||'The source could not be resolved on its owner.')+'</p><button id="unavailable-retry">Retry</button> <button id="unavailable-close">Close tab</button>';
    $('#unavailable-close').onclick=()=>void closeCurrentTab().catch(error=>toast(error.message));
    $('#unavailable-retry').onclick=async()=>{try{
      const parent=state.tabs.find(item=>item.id===tab.parentId),scope=tabScope(tab),descriptor=tab.unavailableDescriptor;
      const document=await api('/api/content-tabs',{action:'document',...scope,documentId:descriptor.documentId,metadataOnly:true});
      Object.assign(tab,{type:'markdown',file:document.file,markdown:document});delete tab.unavailableDescriptor;delete tab.unavailableReason;saveWorkspace();render();
    }catch(error){tab.unavailableReason=error.message;render();}};
  }
  else if (tab?.type === 'files') renderFileBrowser(tab);
  else if (tab?.type === 'markdown') renderMarkdown();
  else if (tab?.type === 'standup') renderStandup();
  else if (tab?.type === 'omi') renderOmi();
  else if (tab?.type === 'life') renderLife();
  else if (tab?.type === 'team') renderTeamTools({preserveBrowser:preserveTeamBrowser});
  else if(tab?.type==='agent-terminal'){const runId=agentTerminalRunId(tab),run=localHistories.get(runId);if(run)renderAgentTerminal(main,run);else void loadRunView(runId).then(()=>{if(state.tab===tab.id)render();}).catch(error=>toast(error.message));}
  else if (tab?.type === 'terminal') { main.classList.add('terminal-main');renderTerminal(tab); }
  else if (state.page === 'context') void renderWorkspaces();
  else if (state.page === 'credentials') renderCredentials();
  else if (state.page === 'remote') renderRemote({ api, escape, toast });
  else if (state.page === 'settings') renderSettings();
  else if (state.page === 'providers') renderProviders();
  else if (state.page === 'engine') {if(previewEnabled(state)&&state.engineSection==='source-library')renderPreviewSources();else renderEngineRoom(state.engineSection);}
  else if(state.page==='attention')renderAttention();
  else if (state.page === 'runs' || state.page==='internet') renderChatsIndex(false);
  else if (state.page === 'home') void renderHome();
  else if (state.page === 'team') renderTeamTools({preserveBrowser:preserveTeamBrowser});
  else if (state.page === 'omi') renderOmi();
  else if (state.page === 'life') renderLife();
  else renderOverview();
  if(tab?.type!=='remote-run'&&tab?.type!=='browser')renderChatSubtabs();
  }
  document.querySelectorAll('[data-page]').forEach(button => button.onclick = () => {if(['runs','internet'].includes(button.dataset.page))selectChatType(button.dataset.page==='internet'?'internet':'user');navigate(button.dataset.page);});
  document.querySelectorAll('[data-engine-section]').forEach(button=>button.onclick=()=>navigate('engine',button.dataset.engineSection));
  document.querySelectorAll('[data-team-section]').forEach(button=>button.onclick=()=>{teamState().active=button.dataset.teamSection;openFeatureTab('team');});
  document.querySelectorAll('#sidebar [data-life-section]').forEach(button=>button.onclick=()=>{openFeatureTab('life');selectLifeSection(button.dataset.lifeSection);});
  document.querySelectorAll('[data-recent-chat]').forEach(button=>button.onclick=()=>openIndexedChat(recentChats(data.runs).filter(r=>chatType(r)===button.dataset.recentType)[Number(button.dataset.recentChat)]));
  $('#sidebar-toggle').textContent=sidebarMinimized?'›':'‹';$('#sidebar-toggle').setAttribute('aria-label',sidebarMinimized?'Expand sidebar':'Collapse sidebar');$('#sidebar-toggle').onclick=()=>{if(previewEnabled(state))previewSidebarLayout.close();sidebarMinimized=!sidebarMinimized;document.body.classList.toggle('sidebar-minimized',sidebarMinimized);localStorage.setItem('proteus.sidebar.minimized',String(sidebarMinimized));render();requestAnimationFrame(browserBounds);};
  windowChrome.schedule();
  $('#data-folder')?.addEventListener('click',() => window.desktop ? window.desktop.openPath(data.home) : toast(data.home));
  if (!sidebarOnly&&tab?.type!=='browser'&&activePage!=='team') window.desktop?.browser({action:'hide',...browserSurfaceIdentity()}).catch(e=>toast(e.message));
}
async function renderHome() {
  const main=$('#main');main.innerHTML='<p class="note">Loading Home…</p>';
  try {
    const value=await api('/api/home');if(state.page!=='home'||state.tab!=='overview')return;
    mountHome(main,value,{desktop:true,host:state.data,markdown:(target,source)=>ProteusMarkdown.mount(target,source,{allowExternalImages:false,link:source=>{if(ProteusMarkdown.linkKind(source)==='web')window.desktop?.openExternal(source).catch(error=>toast(error.message));},copy:text=>window.desktop?.copyText(text)}),navigate:page=>navigate(page==='chats'?'runs':page==='schedules'?'overview':page)});
    // Beside update status: point to guided setup when native desktop control is not ready.
    void api('/api/desktop-control').then(status=>{const row=main.querySelector('.home-update-row');const ready=status.backends?.find(item=>item.id===status.primary)?.installed&&!status.permissionIssue;if(!row||ready||state.page!=='home')return;const note=document.createElement('p');note.className='home-note';note.textContent='Desktop control needs setup. ';const button=document.createElement('button');button.type='button';button.textContent='Set up desktop control';button.onclick=()=>{state.engineSection='updates';openFeatureTab('engine');};note.append(button);row.after(note);}).catch(()=>{});
  } catch(error){if(state.page==='home'&&state.tab==='overview'){main.innerHTML=`<p class="banner">${escape(error.message)}</p>`;}}
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
  $('#main').innerHTML = `<div class="heading"><div><div class="eyebrow">Schedule / ${escape(s.id)}</div><h1>${escape(s.name)}</h1><div class="muted">${escape(s.provider === 'rehearsal' ? 'A no-cost rehearsal of scheduling, feedback, and continuation.' : 'A persistent conversation for every run.')}</div></div><div class="actions">${badge(s.enabled?'Enabled':'Paused')}<button class="primary" id="run-now">▶ Run now</button></div></div><section class="schedule-source"><div><strong>Ownership</strong><p>${s.source?.manifest ? `Owned by ${escape(s.source.system)} · Edit the source, then export/reconcile into Proteus.` : 'App-owned schedule'}</p></div>${s.source?.manifest ? `<div><strong>Source manifest</strong><div class="filepath">${escape(s.source.manifest)}</div></div><div class="actions"><button id="source-file">Open source manifest ↗</button></div>` : ''}<div><strong>Exported schedule file</strong><div class="filepath">${escape(original.file)}</div></div></section><div class="grid"><section class="card"><h2>Schedule settings</h2>${state.dirty && s.revision !== original.revision ? '<p class="banner" role="status">The file changed outside Proteus. Your unsaved edits are preserved. Reload file to use the current file; saving this older draft is blocked.</p>' : ''}<div class="field"><label for="name">Name</label><input id="name" value="${escape(s.name)}"></div><div class="row"><div><label for="cron">Cron expression</label><input id="cron" class="cron" value="${escape(s.cron)}"></div><div><label for="timezone">Time zone</label><input id="timezone" value="${escape(s.timezone)}"></div></div><div class="row"><div><label for="provider">Provider</label><select id="provider"><option value="rehearsal" ${s.provider==='rehearsal'?'selected':''}>Local rehearsal</option><option value="copilot" ${s.provider==='copilot'?'selected':''}>Copilot</option><option value="codex" ${s.provider==='codex'?'selected':''}>Codex</option><option value="claude" ${s.provider==='claude'?'selected':''}>Claude</option></select></div><div><label for="model">Model ID</label>${modelPicker('model',s.model,s.provider)}<button class="subtle" id="model-refresh">↻ Refresh models</button></div></div>${modelControls('model',s)}<div class="field"><label for="cwd">Workspace directory</label><input id="cwd" value="${escape(s.workspace.cwd)}"></div><div class="field"><label for="roots">Additional directories · one per line</label><textarea id="roots" rows="2">${escape(s.workspace.additionalDirectories.join('\n'))}</textarea></div><div class="field"><label for="prompt">Instructions</label><textarea id="prompt" rows="5">${escape(s.prompt)}</textarea></div><div class="row"><div><label for="misfire">After missed runs</label><select id="misfire"><option value="skip" ${s.misfire==='skip'?'selected':''}>Wait for the next scheduled time</option><option value="coalesce" ${s.misfire==='coalesce'?'selected':''}>Catch up once when available</option></select></div><div><label for="enabled">Execution</label><select id="enabled"><option value="false" ${!s.enabled?'selected':''}>Paused</option><option value="true" ${s.enabled?'selected':''}>Enabled</option></select></div></div><label class="checkbox-row"><input id="schedule-notify" type="checkbox" ${s.notifications?.onCompletion===true?'checked':''}>Notify when this schedule completes</label>${scheduleSourcesFields(s,state.data.context,escape)}${contextPicker(s.contextSelection?.selectedIds || [], 'schedule', s.contextSelection || {})}<div class="formfooter"><span class="note" id="save-state">${state.dirty?'Unsaved changes':'Saved as a plain JSON file'}</span><div class="actions"><button id="reload">Reload file</button><button class="primary" id="save">Save schedule</button></div></div></section><div class="stack"><section class="card"><div class="heading"><h2>Next five runs</h2><button class="subtle" id="preview">↻ Preview</button></div><ul id="next-runs" class="nextlist">${(s.nextRuns || []).map((date,i)=>`<li><span class="muted">${i===0?'Next':String(i+1).padStart(2,'0')}</span><span>${escape(time(date,s.timezone))}</span></li>`).join('')}</ul><p class="note">${escape(s.timezone)} · Paused schedules show projected times.</p></section><section class="card"><h2>Schedule JSON · current draft</h2><div class="filepath">${escape(original.file)}</div><div class="actions"><button class="subtle" id="open-file">Open file ↗</button></div><p class="note">Reopening or Reload file reads the latest JSON from disk. External edits refresh automatically while this editor has no unsaved changes. Existing chats keep their captured schedule.</p><pre id="json-preview">${escape(JSON.stringify(clean(s),null,2))}</pre></section></div></div>`;
  const update = () => {
    Object.assign(s,{name:$('#name').value,cron:$('#cron').value,timezone:$('#timezone').value,provider:$('#provider').value,model:$('#model').value,...modelSelection('model'),prompt:$('#prompt').value,misfire:$('#misfire').value,enabled:$('#enabled').value==='true',workspace:{cwd:$('#cwd').value,additionalDirectories:$('#roots').value.split('\n').map(x=>x.trim()).filter(Boolean)}});
    s.notifications={...s.notifications,onCompletion:$('#schedule-notify').checked};
    if ($('#schedule-context')) s.contextSelection = { ...s.contextSelection, ...contextSelection('schedule') };
    Object.assign(s,scheduleSourcesSelection($('#main'),s.executionPermissions));
    state.dirty=JSON.stringify(clean(s))!==JSON.stringify(clean(original)); $('#save-state').textContent=state.dirty?'Unsaved changes':'Saved as a plain JSON file'; $('#json-preview').textContent=JSON.stringify(clean(s),null,2);
  };
  document.querySelectorAll('#main input,#main textarea,#main select').forEach(el=>{ if (!el.closest('.context-picker')) el.addEventListener('input',()=>{update();$('#schedule-context').updatePreview();}); });
  bindContextPicker('schedule', { workspace: () => s.workspace, onChange: update });
  if (contextOpen) $('#schedule-context').open = true;
  $('#model-refresh').onclick=()=>refreshModels('model','provider',true);
  $('#provider').addEventListener('change',()=>refreshModels('model','provider'));
  void refreshModels('model','provider');
  $('#preview').onclick=async()=>{try{const data=await api('/api/preview',{cron:s.cron,timezone:s.timezone});$('#next-runs').innerHTML=data.nextRuns.map((d,i)=>`<li><span class="muted">${i+1}</span><span>${escape(time(d,s.timezone))}</span></li>`).join('');}catch(e){scheduleError(e);}};
  $('#save').onclick=async()=>{try{await saveScheduleDraft(s);toast('Schedule saved.');}catch(e){scheduleError(e);}};
  $('#reload').onclick=()=>schedule(id);
  $('#run-now').onclick=async()=>{try{if(state.dirty)throw new Error('Save your changes before running.');const run=await api('/api/run',{id});await refresh();runTab(run);}catch(e){scheduleError(e);}};
  $('#source-file')?.addEventListener('click',()=>window.desktop?window.desktop.openPath(s.source.manifest):toast(s.source.manifest));
  $('#open-file').onclick=()=>window.desktop?window.desktop.openPath(original.file):toast(original.file);
}
function scheduleError(error){
  if(!error.message?.startsWith('Instructions changed.'))return toast(error.message);
  toast({message:'A selected instruction source changed. Refresh sources, review the current draft, then save and run again.',actions:[{label:'Refresh sources',run:async()=>{const picker=$('#schedule-context');if(!picker)throw new Error('Open the schedule to refresh its sources.');picker.open=true;picker.querySelector('[data-refresh-picker]')?.click();picker.scrollIntoView({block:'nearest'});}}]});
}
async function saveScheduleDraft(draft){
  const submitted=clean(draft),saved=await api('/api/schedules',{schedule:submitted,expectedRevision:draft.revision});
  if(state.draft===draft){const edited=JSON.stringify(clean(draft))!==JSON.stringify(submitted);draft.revision=saved.revision;if(!edited)Object.assign(draft,saved);state.dirty=edited;}
  await refresh(true);
}
function clean(s) { const result=structuredClone(s); for(const key of ['file','revision','nextRuns','error'])delete result[key];return result; }
function renderManagedSchedule(original) {
  if (!state.draft || state.draft.id !== original.id || (!state.dirty && state.draft.revision !== original.revision)) state.draft=structuredClone(original);
  const s=state.draft;
  $('#main').innerHTML = `<div class="heading"><div><div class="eyebrow">Omi / Scheduled service</div><h1>${escape(s.name)}</h1><p class="muted">${escape(s.prompt)}</p></div>${badge(s.enabled ? 'Enabled' : 'Paused')}</div><div class="grid"><section class="card"><h2>Native processing</h2>${state.dirty && s.revision !== original.revision ? '<p class="banner">The schedule changed outside Proteus. Your draft is preserved; reload before saving.</p>' : ''}<p>Runs the installed Omi worker with its existing configuration and file locks. Execution also requires the Omi integration to be enabled after cutover.</p><div class="row"><label>Cron expression<input id="managed-cron" value="${escape(s.cron)}"></label><label>Time zone<input id="managed-timezone" value="${escape(s.timezone)}"></label></div><label>Schedule execution<select id="managed-enabled"><option value="false" ${!s.enabled?'selected':''}>Paused</option><option value="true" ${s.enabled?'selected':''}>Enabled after Omi cutover</option></select></label><label class="checkbox-row"><input id="managed-notify" type="checkbox" ${s.notifications?.onCompletion===true?'checked':''}>Notify when this schedule completes</label><div class="actions"><button class="primary" id="managed-save">Save schedule</button><button id="managed-reload">Reload file</button><button id="managed-settings">Omi settings & logs</button><button id="managed-run">Run now</button></div><p class="note" id="managed-save-state">${state.dirty?'Unsaved changes':'Fixed service commands are managed in Omi settings.'}</p></section><section class="card"><h2>Next projected runs</h2><ul class="nextlist">${(s.nextRuns || []).map(date => `<li>${escape(time(date,s.timezone))}</li>`).join('')}</ul><p class="note">Paused schedules show projected times.</p></section></div><section class="card"><h2>Schedule file</h2><p class="filepath">${escape(s.file)}</p><pre>${escape(JSON.stringify(clean(s),null,2))}</pre></section>`;
  const update=()=>{Object.assign(s,{cron:$('#managed-cron').value,timezone:$('#managed-timezone').value,enabled:$('#managed-enabled').value==='true',notifications:{...s.notifications,onCompletion:$('#managed-notify').checked}});state.dirty=true;$('#managed-save-state').textContent='Unsaved changes';};
  for(const selector of ['#managed-cron','#managed-timezone','#managed-enabled','#managed-notify'])$(selector).addEventListener('input',update);
  $('#managed-save').onclick=async()=>{try{await saveScheduleDraft(s);toast('Schedule saved. The Omi execution gate still applies.');}catch(error){toast(error.message);}};
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
  const selected=state.tabs.find(tab=>tab.id===state.tab&&tab.type==='run'&&(tab.runId||tab.id)===run.id);
  const originId=selected?.parentId||selected?.id||run.id;
  conversation($('#conversation-host'), run, {
    agentPage:(agentId,before)=>api('/api/subagents?id='+encodeURIComponent(run.id)+'&agentId='+encodeURIComponent(agentId)+(before===undefined?'':'&before='+before)),
    questionAttachments:{providerId:run.schedule.provider,mediaTypes:state.data.questionAttachmentMediaTypes||{},destination:computerName(state.data.hostName)+' · '+run.title,chatId:run.id,send:(action,args)=>api('/api/attachments',{action,...args})},
    clearQuestion:async question=>{await api(`/api/runs/${run.id}/clear-question`,{questionId:question.id});await loadRunView(run.id);renderRun(run.id);},
    answerQuestion:async(question,answer,messageId,delivery)=>{await api(`/api/runs/${run.id}/${question.blocking?'reply':'answer-question'}`,{answer,messageId,...delivery,...(question.blocking?{requestId:question.id}:{questionId:question.id})});await loadRunView(run.id);renderRun(run.id);},
    readAttachment:sha256=>readLocalAttachment(run.id,sha256),recover:async(action,expectedFailureEventAt)=>{const modelOptions=action==='continue'?state.chatModelDrafts[run.id]:null;await api(`/api/runs/${run.id}/recover`,{action,expectedFailureEventAt,...(modelOptions?{modelOptions}:{})});if(action==='continue')delete state.chatModelDrafts[run.id];await loadRunView(run.id);renderRun(run.id);},notify:toast,
    loadEarlier:async()=>{const current=localHistories.get(run.id);if(!current?.earlier)return;await loadRunView(run.id,current.eventStart);if(state.tabs.some(tab=>tab.id===state.tab&&tab.type==='run'&&(tab.runId||tab.id)===run.id))renderRun(run.id);},
    edit:entry=>{const input=$('#followup');if(!input)return;if((input.value.trim()&&input.value!==entry.text||selectedAttachments('run:'+run.id).length)&&!confirm('Replace the current unsent draft with this message?'))return;input.value=entry.text||'';input.dispatchEvent(new Event('input'));input.focus();const restored=restoreSentAttachments('run:'+run.id,entry.data?.delivery?.id);if((entry.data?.attachments?.length||0)>restored)toast('Text restored. Some files are no longer available here; reattach them before sending.');},
    time, activityTime:value=>time(value,undefined,true), copy: text => window.desktop ? window.desktop.copyText(text) : navigator.clipboard.writeText(text),
    link: source => openMessageLink(source, run.schedule.workspace.cwd, originId),
    image: async source => (await api('/api/chat-image', { id: run.id, source })).dataURL
  });
}
function renderNativeRun(run) {
  $('#main').classList.remove('run-main');
  replaceChatContent(`<div class="heading"><div><div class="eyebrow">Omi / Native processing</div><h1>${escape(run.title)}</h1><p class="muted">${escape(time(run.createdAt))}</p></div><div class="actions">${badge(run.status)}${['queued','running'].includes(run.status)?'<button class="danger" id="native-cancel">Stop process</button>':''}</div></div><section class="card"><h2>Processing activity</h2><p class="note">Process completion is separate from successful transcription or filing. The worker retains its own outcomes, claims and recovery state.</p>${run.events.map(event=>`<article class="message system"><span class="note">${escape(time(event.at))}</span><pre>${escape(event.text)}</pre></article>`).join('')}</section>`);
  $('#native-cancel')?.addEventListener('click',async()=>{try{await api(`/api/runs/${run.id}/cancel`,{});await refresh(true);}catch(error){toast(error.message);}});
}
function renderRun(id) {
  const loaded=localHistories.get(id);if(!loaded){$('#main').dataset.positionLoading=$('#main').dataset.viewKey;void loadRunView(id).then(()=>{if((state.tabs.find(t=>t.id===state.tab)?.runId||state.tab)===id)renderRun(id);}).catch(error=>toast(error.message));return;}delete $('#main').dataset.positionLoading;
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
  const pendingChanged=main.dataset.pendingId!==(run.pending?.id||'');
  const interacting=!pendingChanged&&main.contains(document.activeElement)&&document.activeElement.matches('input,select,textarea')&&document.activeElement.id!=='followup';
  if(main.dataset.runId===id && $('#conversation-host') && (main.dataset.controlSignature===controlSignature || interacting)) {
    if(main.dataset.controlSignature!==controlSignature)main.dataset.deferredControls='true';else delete main.dataset.deferredControls;
    updateConversation(run);renderUpdateCard(main,state.data.updates,run.id,escape,()=>{state.engineSection='updates';openFeatureTab('engine');});
    reviewLocalFailure(run);
    const input=$('[data-usage-input]'),output=$('[data-usage-output]'),approvals=$('[data-auto-approvals]');
    if(input)input.textContent=Number.isFinite(run.usage?.inputTokens)?run.usage.inputTokens.toLocaleString():'—';
    if(output)output.textContent=Number.isFinite(run.usage?.outputTokens)?run.usage.outputTokens.toLocaleString():'—';
    if(approvals)approvals.textContent=run.automaticApprovals || 0;
    const usage=$('[data-usage-note]');if(usage)usage.textContent=runUsageNote(run);
    return;
  }
  const expanded=new Set([...main.querySelectorAll('.chat-details details[open]')].map(d=>d.querySelector('summary')?.textContent));
  delete main.dataset.deferredControls;main.dataset.runId=id;main.dataset.controlSignature=controlSignature;main.dataset.pendingId=run.pending?.id||'';
  const pending=run.pending;
  const active=['queued','running','awaiting_input'].includes(run.status);
  const composerFocus=document.activeElement?.id==='followup';const cursor=$('#followup')?.selectionStart;
  state.chatDrafts ??= {};state.chatAnswerDrafts ??= {};state.chatModelDrafts ??= {};
  const answerKey = id + ":" + (pending?.id || "");
  const modelDraft = state.chatModelDrafts[id] || run.nextModelOptions || run.schedule;
  replaceChatContent(`<div class="heading"><div>${previewChatBreadcrumb(run)}<div class="eyebrow">${escape(run.schedule.provider)} / ${run.id.slice(0,8)}</div><div class="chat-title-line"><h1>${escape(run.title)}</h1><button id="chat-rename" class="chat-rename" type="button" aria-label="Rename chat" title="Rename chat">✎</button></div><div class="muted">${time(run.createdAt)} · ${escape(run.schedule.model || (run.schedule.provider==='rehearsal'?'Local rehearsal, no AI calls':'Provider default model'))}</div></div><div class="actions"><button id="toggle-chat-details">${state.showChatDetails?'Chat':'Details'}</button>${run.chatType==='internet'?'<button id="chat-promote" class="chat-secondary-action">Promote to User Chat</button>':''}<button id="chat-move" class="chat-secondary-action">Move</button><button id="chat-archive" class="chat-secondary-action">${run.archivedAt?'Unarchive':'Archive'}</button><button id="chat-delete" class="chat-secondary-action danger">Delete</button>${badge(run.status)}</div></div><div class="grid chat-grid"><section class="card chat-pane"><div id="conversation-host"></div>${pending?`<div class="pending" ${pendingQuestionHasCard(run)?'hidden':''}>${previewEnabled(state)&&pending.type==='permission'?'':`<div class="eyebrow">Your input is needed</div><p>${escape(pending.question)}</p>`}${pending.details&&!(previewEnabled(state)&&pending.type==='permission')?`<div id="request-summary"></div><details class="raw-details"><summary>Raw request</summary><pre>${escape(JSON.stringify(pending.details,null,2))}</pre></details>`:''}${pending.type==='permission'?(previewEnabled(state)?permissionChoices(pending,run):'<div class="actions"><button id="deny">Deny</button><button class="primary" id="approve">Approve once</button></div>'+permissionChoices(pending,run)):`<textarea id="answer" placeholder="Add your feedback…" rows="2">${escape(state.chatAnswerDrafts[answerKey]||'')}</textarea><div id="question-attachments"></div><div class="user-question-choices">${(pending.choices||[]).map((choice,index)=>`<button type="button" data-pending-choice="${index}">${escape(typeof choice==='string'?choice:choice.label)}</button>`).join('')}</div><div class="actions"><button class="primary" id="reply">Send feedback</button></div>`}</div>`:run.status==='running'?'<p class="note" role="status"><span class="spinner" aria-hidden="true"></span>'+escape(workingMessage(run))+'</p>':''}${run.status==='queued'?`<p class="note" role="status">${escape(run.queueReason||'Preparing this chat…')}</p>`:''}<div class="composer"><textarea id="followup" placeholder="${active?'Add an update while this runs…':'Continue this conversation…'}" rows="2">${escape(state.chatDrafts[id]||'')}</textarea><div class="composer-footer"><div id="run-attachments"></div><div class="composer-models" ${run.schedule.provider==='rehearsal'?'hidden':''}><input type="hidden" id="run-provider" value="${escape(run.schedule.provider)}">${modelPicker('run-model',modelDraft.model,run.schedule.provider)}${modelControls('run-model',modelDraft,true)}<button class="subtle" id="run-model-refresh" aria-label="Refresh model choices" title="Refresh model choices">↻</button></div><div class="composer-actions">${active&&state.data.providerSteering?.[run.schedule.provider]?`<button id="steer" data-steer-mode="${run.schedule.provider==='claude'?'interrupt-and-continue':'steer'}" title="Send into the running turn using its current model settings" ${run.status!=='running'?'disabled':''}>Steer</button>`:''}<button class="primary" id="continue" title="${active?'Send after the current turn finishes':'Send message'}">${active?'Queue':'Send ↑'}</button>${['running','awaiting_input'].includes(run.status)?'<button class="danger" id="cancel" title="Stop the running turn">Stop</button>':''}</div></div>${run.queuedMessages?.length?`<p class="note">${run.queuedMessages.length} message(s) ${['failed','interrupted'].includes(run.status)?'waiting for this chat to continue.':'queued for after this turn.'}</p>${run.queuedMessages.map(m=>`<div class="queued-message"><span>${escape(m.prompt.slice(0,120))}</span>${run.status==='running'&&state.data.providerSteering?.[run.schedule.provider]&&(!m.attachmentDispatch||(run.events.find(e=>e.data?.delivery?.id===m.id)?.data?.attachments||[]).length>0&&(run.events.find(e=>e.data?.delivery?.id===m.id)?.data?.attachments||[]).every(file=>state.data.providerSteeringMediaTypes?.[run.schedule.provider]?.includes(file.mediaType)))?`<button data-steer-queued="${escape(m.id)}" title="Send now using the current turn’s model">Steer now</button>`:''}<button data-edit-queued="${escape(m.id)}">Edit</button><button data-remove-message="${escape(m.id)}" aria-label="Remove queued message">×</button></div>`).join('')}`:''}</div></section><div class="stack chat-details">${renderRunDetails(run,{desktopPreview:previewEnabled(state),permissionHTML:permissionControls(run.permissionContext,{runId:run.id}),mcp:state.data.mcpStatusProviders?.includes(run.schedule.provider)})}</div></div>`);
  bindAllowancePreference(main,{run,command:payload=>api(`/api/runs/${run.id}/recover`,payload),reload:async()=>{await loadRunView(id);renderRun(id);},notify:toast});
  bindChatFolderTrust(main,{run,request:payload=>api('/api/permissions',payload),pick:()=>window.desktop.choosePaths({kind:'folder'}),refresh:async()=>{await loadRunView(id);renderRun(id);},notify:toast});
  renderChatSubtabs();
  updateConversation(run);renderUpdateCard(main,state.data.updates,run.id,escape,()=>{state.engineSection='updates';openFeatureTab('engine');});
  reviewLocalFailure(run);
  main.querySelectorAll('.chat-details details').forEach(d=>{if(expanded.has(d.querySelector('summary')?.textContent))d.open=true;});
  const details = $('.chat-details'); details.dataset.runId = id; details.scrollTop = state.detailScroll[id] || 0;
  details.addEventListener('scroll', () => state.detailScroll[id] = details.scrollTop, { passive: true });
  $('#toggle-chat-details').onclick=()=>{state.showChatDetails=!state.showChatDetails;renderRun(id);};
  bindPreviewChatBreadcrumb();
  $('#chat-rename').onclick=()=>renameChat({id:run.id,title:run.title,titleRevision:run.titleRevision,local:true});
  $('#chat-promote')?.addEventListener('click',async()=>{try{await api('/api/chat-lifecycle',{action:'promote',id,expectedUpdatedAt:run.updatedAt});await loadChatsIndex();await loadRunView(id);render();}catch(error){toast(error.message);}});
  $('#chat-move').onclick=()=>void moveChatToWorkspace({...run,local:true}).catch(error=>toast(error.message));
  $('#chat-archive').onclick=async()=>{try{await api('/api/chat-lifecycle',{action:run.archivedAt?'unarchive':'archive',id,expectedUpdatedAt:run.updatedAt,expectedArchivedAt:run.archivedAt||null});await loadChatsIndex();await refresh(true);}catch(error){toast(error.message);}};
  $('#chat-delete').onclick=()=>showDialog(`<h2>Delete ${escape(run.title)}?</h2><p>This removes only the Proteus chat record. Generated files and the provider's original session remain untouched. Independent browser and terminal tabs stay open. Running or queued work must finish or be stopped first.</p><button id="close-dialog">Cancel</button><button id="dialog-submit" class="danger">Delete chat</button>`,async()=>{await api('/api/chat-lifecycle',{action:'delete',id,expectedUpdatedAt:run.updatedAt,expectedArchivedAt:run.archivedAt||null});reconcileDeletedChat({chatId:id,local:true});await loadChatsIndex();await refresh(true);});
  bindSessionDetails(run);
  bindActiveTimePreference(main,{run,command:values=>api(`/api/runs/${run.id}/recover`,values),reload:()=>refresh(true),notify:toast});

  $('#mcp-connections')?.addEventListener('click',()=>manageMcp(run));
  if($('#request-summary'))mountStructured($('#request-summary'),requestPresentation(pending.details));
  main.querySelectorAll('[data-pending-choice]').forEach(button=>button.onclick=()=>{const choice=pending.choices[Number(button.dataset.pendingChoice)],input=$('#answer');input.value=typeof choice==='string'?choice:choice.label;input.dispatchEvent(new Event('input'));});
  const updateButtons=()=>{if(!$('#followup')||!$('#continue'))return;const empty=!$('#followup').value.trim()&&!selectedAttachments('run:'+id).length; $('#continue').disabled=empty; if($('#steer'))$('#steer').disabled=empty || run.status!=='running'; };
  $('#followup').oninput=()=>{state.chatDrafts[id]=$('#followup').value;clearTimeout(state.draftSaveTimer);state.draftSaveTimer=setTimeout(saveWorkspace,300);updateButtons();}; updateButtons();
  bindSharedDraftText({input:$('#followup'),identity:{kind:'reply',id,hostKey:location.origin},request:(action,args)=>api('/api/shared-draft',{action,...args}),changed:text=>{state.chatDrafts[id]=text;updateButtons();saveWorkspace();}});
  const attachmentPicker=mountAttachmentPicker({key:'run:'+id,host:$('#run-attachments'),textarea:$('#followup'),provider:()=>run.schedule.provider,mediaTypes:state.data.attachmentMediaTypes||{},notify:toast,onChange:updateButtons});
  refreshModels('run-model','run-provider');
  $('.composer-models').addEventListener('change',()=>{state.chatModelDrafts[id]={model:$('#run-model').value,...modelSelection('run-model')};});
  $('#run-model-refresh').onclick=()=>refreshModels('run-model','run-provider',true);
  if(composerFocus){$('#followup').focus();$('#followup').setSelectionRange(cursor,cursor);}
  const questionAttachments=mountQuestionAttachments({key:'question:'+answerKey,host:$('#question-attachments'),textarea:$('#answer'),providerId:run.schedule.provider,mediaTypes:state.data.questionAttachmentMediaTypes||{},destination:computerName(state.data.hostName)+' · '+run.title,chatId:id,requestId:pending?.id,send:(action,args)=>api('/api/attachments',{action,...args}),notify:toast});
  const submit=async(action,data)=>{const form=action==='reply'?$('#main .pending'):null;if(form?.dataset.sending)return;if(form){form.dataset.sending='true';form.querySelectorAll('button').forEach(b=>b.disabled=true);}try{await api(`/api/runs/${id}/${action}`,data);if(action==='reply'){if(pending?.type!=='permission')recordChatActivity(id);delete state.chatAnswerDrafts[answerKey];questionAttachments.clear();}if(form?.isConnected)form.remove();await refresh(true);}catch(e){toast(e.message);}finally{if(form?.isConnected){delete form.dataset.sending;form.querySelectorAll('button').forEach(b=>b.disabled=false);}}};
  $('#cancel')?.addEventListener('click',()=>submit('cancel',{}));
  if($('#answer'))$('#answer').oninput=event=>{state.chatAnswerDrafts[answerKey]=event.target.value;};
  $('#reply')?.addEventListener('click',async()=>{const answer=$('#answer').value;try{const delivery=await questionAttachments.payload(answer);await submit('reply',{answer,requestId:pending.id,...delivery});}catch(error){toast(error.message);}});
  $('#approve')?.addEventListener('click',()=>submit('reply',{answer:'approve',requestId:pending.id}));
  $('#deny')?.addEventListener('click',()=>submit('reply',{answer:'deny',requestId:pending.id}));
  document.querySelectorAll('[data-permission-answer]').forEach(button=>button.onclick=()=>submit('reply',{answer:button.dataset.permissionAnswer,requestId:pending.id}));
  bindPermissionControls();
  if(previewEnabled(state))bindPreviewPermissionSidebar(run);
  const sendMessage=async mode=>{
    const text=$('#followup').value,modelOptions={model:$('#run-model').value,...modelSelection('run-model')};
    const selection=JSON.stringify([text,mode,modelOptions,selectedAttachments('run:'+id).map(item=>[item.file.name,item.file.size,item.file.lastModified,item.file.type])]);
    let attempt=localSendAttempts.get(id);
    if(attempt?.busy)return;
    try{
      if(attempt&&attempt.selection!==selection)throw Error('The previous send is unconfirmed. Retry its unchanged message before sending different content.');
      if(mode==='steer'&&selectedAttachments('run:'+id).some(item=>!state.data.providerSteeringMediaTypes?.[run.schedule.provider]?.includes(item.file.type)))throw Error('This provider cannot steer with these attachment types. Queue this message instead.');
      if(!attempt){attempt={selection,messageId:crypto.randomUUID()};localSendAttempts.set(id,attempt);}attempt.busy=true;
      if(!attempt.payload){
        const delivery=await prepareLocalAttachments({key:'run:'+id,providerId:run.schedule.provider,destination:computerName(state.data.hostName)+' · '+run.title,chatId:id,messageId:attempt.messageId,mediaTypes:state.data.attachmentMediaTypes||{},post:api});
        attempt.payload={prompt:text,mode,messageId:attempt.messageId,...(delivery||{}),...(mode==='queue'&&run.schedule.provider!=='rehearsal'?{modelOptions}:{})};
      }
      const accepted=await api(`/api/runs/${id}/send`,attempt.payload);localSendAttempts.delete(id);
      historyGenerations.set(id,(historyGenerations.get(id)||0)+1);historyRequests.delete(id);
      localHistories.set(id,mergeChatHistory(localHistories.get(id),{...accepted,eventStart:0,eventCount:accepted.events.length,historyCursor:undefined}));
      recordChatActivity(id);clearAttachments('run:'+id);if(state.chatDrafts[id]===text)state.chatDrafts[id]='';if($('#main').dataset.runId===id&&$('#followup')?.value===text)$('#followup').value='';updateButtons();
      if(mode==='queue')delete state.chatModelDrafts[id];if($('#main').dataset.runId===id)renderRun(id);
      void refresh(true).catch(()=>toast('Message accepted. The owner overview will refresh when available.'));
    }catch(e){if(attempt&&(!attempt.payload||e.code==='SEND_REJECTED'))localSendAttempts.delete(id);if(e.message!=='Attachment send cancelled.')toast(e.message);}
    finally{if(attempt)attempt.busy=false;}
  };
  $('#continue').onclick=()=>sendMessage('queue');
  $('#steer')?.addEventListener('click',()=>sendMessage('steer'));
  document.querySelectorAll('[data-steer-queued]').forEach(button=>button.onclick=()=>submit('steer-queued',{messageId:button.dataset.steerQueued}));
  document.querySelectorAll('[data-edit-queued]').forEach(button=>button.onclick=()=>{const message=run.queuedMessages.find(m=>m.id===button.dataset.editQueued);showDialog(`<h2>Edit queued message</h2><p>Changes apply only if this message is still waiting.</p><textarea id="queued-edit" rows="5">${escape(message.prompt)}</textarea><div class="actions"><button id="close-dialog">Cancel</button><button id="dialog-submit" class="primary">Save queued message</button></div>`,()=>api(`/api/runs/${id}/edit-queued`,{messageId:message.id,prompt:$('#queued-edit').value,expectedPrompt:message.prompt}));});
  document.querySelectorAll('[data-remove-message]').forEach(button=>button.onclick=()=>submit('remove-queued',{messageId:button.dataset.removeMessage}));
  mountChatComposer($('#followup').closest('.composer'),{active});
}
function quotaCards(quota) {
  return Object.entries(quota?.quotaSnapshots || {}).filter(([,q])=>q).map(([name,q])=>{
    const remaining=Number.isFinite(q.remainingPercentage)?Math.max(0,Math.min(100,q.remainingPercentage)):null;
    return `<div class="quota"><div class="heading"><span>${escape(name.replaceAll('_',' '))}</span><strong>${q.isUnlimitedEntitlement?'Unlimited':remaining===null?'Unavailable':remaining.toFixed(1)+'% remaining'}</strong></div>${!q.isUnlimitedEntitlement&&remaining!==null?`<progress max="100" value="${remaining}" aria-label="${escape(name)} quota remaining"></progress>`:''}<div class="note">${q.resetDate?'Resets '+escape(time(q.resetDate)):''}</div></div>`;
  }).join('');
}
function renderProviders() {
  const sharedSettings=document.querySelector('[data-shared-inference]');
  const statuses=state.data.providerStatuses || {copilot:state.data.providerStatus};
  const mounted=new Map([...document.querySelectorAll('[data-provider-auth]')].map(node=>[node.dataset.providerAuth,node]));
  $('#main').innerHTML=`<div class="heading"><div><div class="eyebrow">Bring your own engine</div><h1>Providers</h1><div class="muted">Separate sign-ins and live capabilities for each provider.</div></div></div><div class="grid">${[['copilot','Copilot'],['codex','Codex'],['claude','Claude'],['llama-cpp','llama.cpp'],['shared-llm','Shared models'],...(statuses.mtplx?[['mtplx','MTPLX · local preview']]:[])].map(([id,name])=>{
    const p=statuses[id];return `<section class="card"><div class="heading"><h2>${name}</h2>${badge(p?.available?'Connected':p?'Unavailable':'Not checked')}</div><p class="note">${id==='shared-llm'?'Uses enabled models on paired computers over the encrypted relay. '+escape(p?.capabilities?.context||'Add a shared provider below.') : id==='llama-cpp'?'Uses your configured llama.cpp server. HTTPS, API keys and a private server CA are supported. '+escape(p?.capabilities?.context||'Start the server, then refresh models.') : id==='mtplx'?'Uses the running MTPLX server on this Mac. '+escape(p?.capabilities?.context||'Local reasoning, tools and media capabilities are reported by this computer.') : id==='copilot'?'Uses the official Copilot SDK and your Copilot account. '+escape(p?.fusion?.note||''):id==='codex'?'Uses the installed Codex CLI and its existing sign-in. Run codex login on this computer if needed.':'Uses the installed Claude Code CLI and its sign-in. Claude desktop and CLI authentication may be separate.'}</p><div class="actions"><button data-refresh-provider="${id}">Refresh connection & models</button>${p?.authenticationCommand&&!p?.available?`<button data-copy-provider-login="${id}">Copy sign-in command</button>`:''}</div><div data-provider-auth="${id}"></div>${p?.error?`<p class="banner">${escape(p.error)}</p>`:''}<p class="note">${p?.checkedAt?'Checked '+escape(time(p.checkedAt)):'Not checked'} · refreshes at launch and every five minutes</p><p class="note">${['mtplx','llama-cpp','shared-llm'].includes(id)?'Local inference; subscription allowance is not reported. Actual token usage appears in chat Details.':'View allowance and reset details in Engine Room → Usage.'}</p><ul class="nextlist">${(p?.models || []).map(m=>`<li><span>${escape(m.name||m.id)}</span><div><code>${escape(m.id)}</code><div class="note">Effort: ${escape(m.controls?.reasoningEfforts?.join(', ') || 'Not reported')}<br>${(m.controls?.contextTiers || []).map(t=>escape(contextSize(t))).join('<br>')}<br>Speed: ${escape((m.controls?.serviceTiers || []).map(t=>t.name||t.id).join(', ') || 'Provider default')}</div></div></li>`).join('')}</ul>${id==='codex'?'<p class="note">Selected instructions and skills are supplied as context. Agent prompts work when they do not declare editor-specific tool filters. Codex grants MCP access per selected server; each provider has separate workspace approvals. Chats remain with their original provider.</p>':''}</section>`;
  }).join('')}</div>`;
  for(const container of document.querySelectorAll('[data-provider-auth]')){const id=container.dataset.providerAuth,old=mounted.get(id);if(['mtplx','llama-cpp','shared-llm'].includes(id))continue;if(old){container.replaceWith(old);continue;}renderProviderAuth(container,id,{api,openExternal:url=>window.desktop.openExternal(url),onConnected:async providerId=>{await api('/api/provider',{provider:providerId,force:true});await refresh(true);}});}
  const sharedRoot=sharedSettings||document.createElement('section');sharedRoot.dataset.sharedInference='';sharedRoot.classList.add('card');$('#main').append(sharedRoot);if(!sharedSettings)void mountSharedInference(sharedRoot,{api,escape,toast});
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
  showDialog(`<h2>MCP connections</h2>${canLogin?'':'<p class="note">Connection status only. Complete sign-in in the provider on this computer, then refresh here.</p>'}<p class="note" id="mcp-status" role="status">Checking connections…</p><div id="mcp-list"></div><div class="actions"><button id="close-dialog">Close</button><button id="dialog-submit">Refresh connections</button></div>`,()=>{});
  const dialog=$('#dialog'),list=$('#mcp-list'),status=$('#mcp-status');
  const alive=()=>dialog.open && $('#mcp-list')===list;
  let busy=false,checking=false,checkPromise=null,version=0,timer,waiting=null,listSignature='',end=Date.now()+600_000;
  const connect=async button=>{
    if(busy)return; busy=true;version++;end=Date.now()+600_000;button.disabled=true;button.textContent='Opening sign-in…';
    status.textContent='Starting '+button.dataset.connectMcp+' sign-in. Watch for a browser or system credential prompt.';
    try {
      if(checkPromise){
        button.textContent='Waiting for check…';status.textContent='Waiting for the current connection check before sign-in…';let waitTimer;
        const ready=await Promise.race([checkPromise.then(()=>true,()=>true),new Promise(resolve=>{waitTimer=setTimeout(()=>resolve(false),3000);})]);clearTimeout(waitTimer);
        if(!alive())return;
        if(!ready)throw new Error('A connection check is still running. Wait for it to finish, then retry sign-in.');
      }
      if(!alive())return;
      button.textContent='Opening sign-in…';
      status.textContent='Starting '+button.dataset.connectMcp+' sign-in. Watch for a browser or system credential prompt.';
      const result=await api('/api/mcp',{runId:run.id,action:'login',server:button.dataset.connectMcp,openOnMac:!!window.desktop});
      if(!alive())return;
      if(result.authorizationUrl)window.open(result.authorizationUrl,'_blank','noopener,noreferrer');
      waiting=result.status==='connected'?null:button.dataset.connectMcp;
      status.textContent=waiting?'Finish sign-in in the browser on this computer. Checking automatically for the connection…':'Connected. Continue or steer the chat to retry its work.';
    }catch(e){if(alive())status.textContent='Sign-in failed: '+e.message;}
    finally{busy=false;if(alive()){button.disabled=false;button.textContent=waiting?'Restart sign-in':'Connect / sign in';await load();clearTimeout(timer);timer=setTimeout(poll,5000);}}
  };
  const load=async()=>{
    if(busy || checking || !alive())return;checking=true;const current=version;let check;
    try {
      check=checkPromise=api('/api/mcp',{runId:run.id,action:'status'});const value=await check;if(!alive() || current!==version)return;
      const signature=JSON.stringify([value.servers.map(({observedAt,...server})=>server),waiting]);
      if(signature!==listSignature){listSignature=signature;list.innerHTML=value.servers.map(s=>`<section class="card"><strong>${escape(s.name)}</strong> ${badge(s.status)}<p class="note">Runtime connection only · ${escape(s.scope||'runtime')} · <span data-mcp-observed="${escape(s.name)}">${escape(s.observedAt?time(s.observedAt):'Check time unavailable')}</span>. Account identity and resource access are not verified.</p>${s.error?`<p class="note">${escape(s.error)}</p>`:''}${canLogin&&s.remote&&s.status!=='connected'?`<button data-connect-mcp="${escape(s.name)}">${waiting===s.name?'Restart sign-in':'Connect / sign in'}</button>`:''}</section>`).join('') || '<p>No selected MCP servers.</p>';
      list.querySelectorAll('[data-connect-mcp]').forEach(button=>button.onclick=()=>connect(button));}
      list.querySelectorAll('[data-mcp-observed]').forEach(node=>{const server=value.servers.find(s=>s.name===node.dataset.mcpObserved);node.textContent=server?.observedAt?time(server.observedAt):'Check time unavailable';});
      if(waiting&&value.servers.some(s=>s.name===waiting&&s.status==='connected')){status.textContent='Connected to '+waiting+'. Continue or steer the chat to retry its work.';waiting=null;}
      else if(status.textContent==='Checking connections…')status.textContent=canLogin?'Connections update automatically while this window is open. Supported sign-in opens on this computer.':'Selected connection status updates while this window is open. Sign in through the provider on this computer if needed.';
    }catch(e){if(alive() && current===version)status.textContent='Could not check connections: '+e.message;}
    finally{checking=false;if(checkPromise===check)checkPromise=null;}
  };
  const poll=async()=>{if(!alive())return;await load();if(!alive())return;if(Date.now()<end)timer=setTimeout(poll,5000);else if(waiting)status.textContent='Still not connected. The sign-in may have timed out; use Restart sign-in or Refresh connections.';};
  dialog.addEventListener('close',()=>clearTimeout(timer),{once:true});
  $('#dialog-submit').onclick=load;await load();timer=setTimeout(poll,5000);
}
function showDialog(html, submit) {
  void window.desktop?.browser({action:'overlay',token:'renderer-overlays',visible:true});
  const dialog=$('#dialog');dialog.innerHTML=html;dialog.showModal();$('#close-dialog').onclick=()=>dialog.close();
  const button=$('#dialog-submit');let busy=false;
  const commit=async event=>{event?.preventDefault();if(busy||button?.disabled)return;busy=true;if(button)button.disabled=true;try{await submit();dialog.close();await refresh(true);}catch(e){toast(e.message);}finally{busy=false;if(button?.isConnected)button.disabled=false;}};
  const form=dialog.querySelector('form[data-dialog-submit]');if(form){form.onsubmit=commit;if(button){button.type='submit';button.onclick=null;}}else if(button)button.onclick=commit;
  return dialog;
}
function renameChat(row){
  showDialog(`<h2>Rename chat</h2><div class="field"><label for="rename-chat-title">Chat name</label><input id="rename-chat-title" maxlength="200" value="${escape(row.title||'')}"></div><div class="actions"><button id="close-dialog">Cancel</button><button class="primary" id="dialog-submit">Save name</button></div>`,async()=>{
    const title=$('#rename-chat-title').value.trim();if(!title)throw new Error('Enter a chat name.');
    const result=row.local||!row.hostId||row.hostId==='local'?await api('/api/chat-title',{id:row.chatId||row.id,title,expectedTitleRevision:row.titleRevision}):await renameRemoteChat(row.hostId,row.chatId||row.id,title,row.titleRevision);
    const id=row.local||!row.hostId||row.hostId==='local'?row.chatId||row.id:'peer:'+row.hostId+':'+(row.chatId||row.id);
    const cached=localHistories.get(id);if(cached)Object.assign(cached,result);const summary=state.data.runs.find(item=>item.id===id);if(summary)Object.assign(summary,result);
    for(const tab of state.tabs.filter(t=>['run','remote-run'].includes(t.type)&&(t.runId||t.id)===(row.chatId||row.id)&&(row.local||!row.hostId||row.hostId==='local'?!t.hostId:t.hostId===row.hostId))){tab.label=tab.type==='remote-run'&&!tab.parentId?result.title+' · '+(tab.hostLabel||'Paired computer'):result.title;tab.titleRevision=result.titleRevision;}renderChatSubtabs();
    await loadChatsIndex();saveWorkspace();renderTabs();
  });
  $('#rename-chat-title').focus();$('#rename-chat-title').select();
}
function sharedSetupArgs(tab){const scope=tabScope(tab);return ['workspace','project'].includes(scope.scope)?{setupId:tab.contentTabId||tab.id,setupScope:scope.scope,setupScopeId:scope.id}:{};}
async function beginChatSetup(blank,draft={}){
 const parent=state.tabs.find(tab=>tab.id===(draft.parentId||blank?.parentId));
 if(parent?.type==='workspace'&&!parent.projectId){const catalog=parent.hostId?await window.desktop.peers({action:'request',hostId:parent.hostId,method:'projects.get',args:{}}):workspaceProjectsCatalog(state),project=catalog?.projects?.find(row=>row.id===(draft.projectId||catalog.defaultProjectIds?.[parent.workspaceId]));if(project){const target=parent.hostId?openRemoteProject(parent.hostId,project):ensurePreviewProject(project,{reveal:true});if(target){if(blank){await closeTabSet([blank]);blank=null;}draft={...draft,parentId:target.id,projectId:project.id,workspaceId:project.workspaceId};}}}
 if(!blank){const info=await window.desktop.browser({action:'create',parentId:draft.parentId});blank=state.tabs.find(tab=>tab.id===info.id)||{id:info.id,type:'browser',label:'New chat',info,...(draft.parentId?{parentId:draft.parentId}:{})};}
 blank.pendingOpen=true;blank.newChatDraft={schemaVersion:1,...draft};blank.customTitle=draft.chatType==='internet'?'Internet Search':'New chat';blank.label=blank.customTitle;openTab(blank);
}
async function finishChatSetup(blank,created){
 const active=state.tab===blank.id,index=state.tabs.indexOf(blank),parentId=blank.parentId,runId=created.runId||created.id;
 const scope=tabScope(blank),siblings=state.tabs.filter(tab=>tab.parentId===parentId),slot=siblings.indexOf(blank),before=siblings.slice(0,slot),after=siblings.slice(slot+1),interaction=tabInteractionEpoch;
 contentTabSync.close(scope,blank.contentTabId||blank.id);
 const existing=state.tabs.find(tab=>tab!==blank&&tab.parentId===parentId&&['run','remote-run'].includes(tab.type)&&(tab.runId||tab.id)===runId),next=existing||{...created,pendingOpen:true,...(parentId?{parentId}:{})};
 state.tabs=state.tabs.filter(tab=>tab!==blank&&tab!==existing);state.tabs.splice(index<0?state.tabs.length:Math.min(index,state.tabs.length),0,next);void window.desktop.browser({action:'close',id:blank.id}).catch(error=>toast(error.message));
 if(active){state.tab=next.id;if(parentId)selectedChildren.set(parentId,next.id);render();}else{renderTabs();renderChatSubtabs();saveWorkspace();}
 // Chat creation can register its descriptor before this local replacement.
 // Settle that membership first, then publish this explicit placement against
 // the complete baseline. Never restore over a newer navigation interaction.
 await refresh();await contentTabSync.sync(scope);
 if(interaction!==tabInteractionEpoch||!state.tabs.includes(next))return;
 const following=after.find(tab=>state.tabs.includes(tab)),preceding=before.findLast(tab=>state.tabs.includes(tab));
 state.tabs=state.tabs.filter(tab=>tab!==next);
 const at=following?state.tabs.indexOf(following):preceding?state.tabs.indexOf(preceding)+1:Math.min(index,state.tabs.length);
 state.tabs.splice(at,0,next);await saveWorkspace();await contentTabSync.sync(scope);renderTabs();renderChatSubtabs();
}
async function chatDialog(onCreated=null,guard=()=>{},draft={},surface=null) {
  if(window.desktop&&!surface)return beginChatSetup(null,draft);
  let root;const prefix=surface?.prefix||'chat',attachmentKey=surface?.attachmentKey||'new-chat';
  const $=selector=>selector==='#dialog'?root:root?.querySelector(surface?selector.replaceAll('#chat-','#'+prefix+'-').replaceAll('#dialog-submit','#'+prefix+'-submit').replaceAll('#close-dialog','#'+prefix+'-cancel'):selector);
  const mount=surface?.mount||showDialog;
  try{state.data.context=await api('/api/context?workspaceId='+encodeURIComponent(draft.form?.workspace||draft.workspaceId||state.data.context.defaultWorkspaceId));}catch(error){toast(error.message);return;}
  let context=state.data.context;const profile=context.workspaces.find(w=>w.id===(draft.form?.workspace||draft.workspaceId||context.defaultWorkspaceId))||context.workspaces[0];
  let added=(draft.form?.roots||'').split('\n').filter(path=>path&&![profile.cwd,...profile.additionalDirectories].includes(path)),catalogGeneration=0,catalogReady=false;
  root=mount(`<h2>Start a new chat</h2><div class="new-chat-grid"><label>Workspace<select id="chat-workspace">${context.workspaces.map(w=>`<option value="${escape(w.id)}" ${w.id===profile.id?'selected':''}>${escape(w.name)}</option>`).join('')}</select></label></div><div class="new-chat-grid"><label>Starting folder<select id="chat-cwd"></select></label><label>Chat name (optional)<input id="chat-title" maxlength="200" placeholder="A name can be chosen automatically"></label></div><details class="new-chat-folders"><summary>Workspace folders</summary><ul id="chat-folder-list"></ul><button type="button" id="chat-add-folder" aria-label="Add folders for this chat">＋ Add folders for this chat</button><p class="note" id="chat-folder-status">Added folders apply only to this chat.</p><textarea id="chat-roots" hidden></textarea></details>${contextPicker(draft.selection?.selectedIds||[],prefix,{...profile.defaults,...draft.selection,workspaceId:profile.id,catalog:()=>context})}<section class="composer new-chat-composer"><label class="sr-only" for="chat-prompt">Message</label><textarea id="chat-prompt" rows="4" placeholder="What would you like to work on?"></textarea><div class="new-chat-toolbar"><div id="chat-attachments"></div><label>Provider<select id="chat-provider"><option value="">Select provider first</option><option value="copilot">Copilot</option><option value="codex">Codex</option><option value="claude">Claude</option><option value="llama-cpp">llama.cpp</option><option value="shared-llm">Shared models</option>${state.data.providerStatuses?.mtplx?'<option value="mtplx">MTPLX</option>':''}<option value="rehearsal">Local rehearsal</option></select></label><label id="chat-model-label" hidden>Model${modelPicker(prefix+'-model','','')}</label>${modelControls(prefix+'-model',{})}</div><p id="chat-catalog-status" class="note" role="status"></p><div class="new-chat-submit"><button class="primary" id="dialog-submit" disabled>Start chat</button></div></section><div class="actions"><button id="close-dialog">Cancel</button></div>`,async()=>{
    await guard();if(!catalogReady||!$('#chat-provider').value||(!$('#chat-prompt').value.trim()&&!selectedAttachments(attachmentKey).length))throw new Error('Choose a provider and available model, then enter a message.');
    const providerId=$('#chat-provider').value,model=$('#chat-model').value;if(providerId!=='rehearsal'&&!state.data.providerStatuses?.[providerId]?.models?.some(m=>m.id===model))throw new Error('Choose an available model.');
    const messageId=crypto.randomUUID(),draftId=crypto.randomUUID();const delivery=await prepareLocalAttachments({key:attachmentKey,providerId,destination:computerName(state.data.hostName)+' · new chat',draftId,messageId,mediaTypes:state.data.attachmentMediaTypes||{},post:api});
    const run=await api('/api/chat',{...(surface?.tab?sharedSetupArgs(surface.tab):{}),workspaceId:$('#chat-workspace').value,...(previewEnabled(state)?{projectId:$('#chat-project')?.value||draft.projectId||workspaceProjectsCatalog(state).defaultProjectIds?.[$('#chat-workspace').value]}:{}),workspace:{cwd:$('#chat-cwd').value,additionalDirectories:lines($('#chat-roots').value)},provider:providerId,model,name:$('#chat-title').value.trim(),...modelSelection(prefix+'-model'),prompt:$('#chat-prompt').value,...contextSelection(prefix),...(delivery||{})});clearAttachments(attachmentKey);if(onCreated)await onCreated({id:run.id,type:'run',label:run.title});await refresh();if(!onCreated&&(!previewEnabled(state)||!openPreviewChat(run)))runTab(run);
  });
  $('#chat-prompt').value=draft.prompt||'';$('#chat-title').value=draft.title||'';
  const dialog=$('#dialog');dialog.classList.add('new-chat-dialog');dialog.addEventListener('close',()=>dialog.classList.remove('new-chat-dialog'),{once:true});
  const alive=()=>dialog.open&&dialog.isConnected&&!!$('#chat-provider');
  const fields=dialog.querySelector('[data-model-picker="'+prefix+'-model"]');fields.hidden=true;
  const validate=()=>{if(!alive())return;const p=$('#chat-provider').value;$('#dialog-submit').disabled=!catalogReady||!p||(p!=='rehearsal'&&!$('#chat-model').value)||(!$('#chat-prompt').value.trim()&&!selectedAttachments(attachmentKey).length);};
  const workspace=()=>context.workspaces.find(w=>w.id===$('#chat-workspace').value);
  const folders=()=>{const w=workspace();return [...new Set([w.cwd,...w.additionalDirectories,...added])];};
  const updateRoots=()=>{$('#chat-roots').value=folders().filter(p=>p!==$('#chat-cwd').value).join('\n');$('#chat-context')?.updatePreview?.();};
  const drawFolders=()=>{const w=workspace(),paths=folders(),selected=$('#chat-cwd').value;$('#chat-cwd').innerHTML=paths.map(p=>`<option value="${escape(p)}">${escape(p)}</option>`).join('');$('#chat-cwd').value=paths.includes(selected)?selected:w.cwd;$('#chat-folder-list').innerHTML=paths.map(p=>`<li><span>${escape(p)} <small>${added.includes(p)?'Added for this chat':'Workspace folder'}</small></span>${added.includes(p)?`<button data-remove-chat-folder="${escape(p)}" aria-label="Remove added folder">Remove</button>`:''}</li>`).join('');dialog.querySelectorAll('[data-remove-chat-folder]').forEach(button=>button.onclick=()=>{const p=button.dataset.removeChatFolder;if($('#chat-cwd').value===p)$('#chat-folder-status').textContent='Starting folder reset to the workspace default.';added=added.filter(x=>x!==p);drawFolders();});updateRoots();};
  $('#chat-add-folder').onclick=async()=>{try{if(!window.desktop?.choosePaths)throw new Error('Open the desktop app to choose additional folders.');const paths=await window.desktop.choosePaths({kind:'folder',multiple:true});if(!alive())return;added=[...new Set([...added,...paths.filter(p=>!folders().includes(p))])];drawFolders();}catch(error){toast(error.message);}};
  if(previewEnabled(state)){const label=document.createElement('label');label.innerHTML='Project<select id="'+prefix+'-project"></select>';$('#chat-workspace').closest('.new-chat-grid').append(label);const fill=()=>{const selected=draft.projectId||workspaceProjectsCatalog(state).defaultProjectIds?.[$('#chat-workspace').value];$('#chat-project').innerHTML=(workspaceProjectsCatalog(state).projects||[]).filter(p=>p.workspaceId===$('#chat-workspace').value).map(p=>`<option value="${escape(p.id)}" ${p.id===selected?'selected':''}>${escape(p.name)}</option>`).join('');$('#chat-project').disabled=!!draft.projectId;};fill();$('#chat-workspace').addEventListener('change',fill);}
  $('#chat-workspace').onchange=async()=>{try{const id=$('#chat-workspace').value;context=state.data.context=await api('/api/context?workspaceId='+encodeURIComponent(id));if(!alive()||$('#chat-workspace').value!==id)return;const defaults=state.data.context.workspaces.find(w=>w.id===id)?.defaults||{};$('#chat-context').outerHTML=contextPicker(defaults.selectedIds||[],prefix,{...defaults,workspaceId:id,catalog:()=>context});bindContextPicker(prefix,{catalog:()=>context,setCatalog:value=>context=value,workspace:()=>({id:$('#chat-workspace').value,cwd:$('#chat-cwd').value,additionalDirectories:lines($('#chat-roots').value)})});$('#chat-cwd').value='';added=[];drawFolders();}catch(e){toast(e.message);}};$('#chat-cwd').onchange=updateRoots;
  bindContextPicker(prefix,{catalog:()=>context,setCatalog:value=>context=value,workspace:()=>({id:$('#chat-workspace').value,cwd:$('#chat-cwd').value,additionalDirectories:lines($('#chat-roots').value)})});drawFolders();
  $('.new-chat-toolbar').append($('#dialog-submit'));$('.new-chat-submit')?.remove();
  const picker=mountAttachmentPicker({key:attachmentKey,host:$('#chat-attachments'),textarea:$('#chat-prompt'),provider:()=>$('#chat-provider').value,mediaTypes:state.data.attachmentMediaTypes||{},notify:toast,onChange:validate});
  mountNewChatComposer(dialog.querySelector(".new-chat-composer"));
  // Restore the model before populating its live controls, then restore saved
  // mode/effort values against those populated options. Empty pre-catalog selects
  // cannot accept the saved values, and must not erase them during restoration.
  $('#chat-provider').onchange=async()=>{const version=++catalogGeneration,p=$('#chat-provider').value;catalogReady=false;$('#chat-model-label').hidden=!p;fields.hidden=!p;$('#chat-catalog-status').textContent=p?'Loading models…':'';$('#chat-model').value='';validate();picker.refresh();if(!p)return;await refreshModels(prefix+'-model',prefix+'-provider',true);if(!alive()||version!==catalogGeneration)return;const data=state.data.providerStatuses?.[p],offered=modelsForInferenceChoice(data?.models||[],$('#chat-model').dataset);if(surface&&draft.form?.provider===p){surface.restore({modelsOnly:true});$('#chat-model').onchange?.();surface.restore({modelsOnly:true});$('#chat-model').onchange?.();}catalogReady=p==='rehearsal'||(data?.available!==false&&!data?.error&&offered.length>0&&$('#chat-model').dataset.sourceUnavailable!=='true');if(previewEnabled(state)&&catalogReady&&p!=='rehearsal'&&!draft.form?.model&&!$('#chat-model').value){const model=offered.find(m=>m.id===data.defaultModel||m.isDefault)||offered[0];$('#chat-model').value=model.id;$('#chat-model').dispatchEvent(new Event('change',{bubbles:true}));}$('#chat-catalog-status').textContent=catalogReady?(p==='mtplx'?'Local model · reasoning controls · selected MCPs and approved tools · images/text · SVG previews.':''):data?.error||'No model catalog is available. Select the provider again to retry.';validate();surface?.capture();};
  $('#chat-model').addEventListener('change',validate);$('#chat-prompt').addEventListener('input',validate);
  // Project navigation is shared with production; only the actual isolated
  // preview restricts execution to its staged Codex authentication.
  if(state.data?.desktopPreview?.enabled){for(const option of [...$('#chat-provider').options])if(option.value!=='codex'&&option.value!=='mtplx'&&option.value!=='rehearsal')option.remove();$('#chat-provider').value=draft.form?.provider||'codex';}

  const providerInput=$('#chat-provider'),routeInput=document.createElement('select');
  routeInput.id=prefix+'-provider-route';routeInput.setAttribute('aria-label','Provider');
  const routeChoices=inferenceProviderChoices(state.data.providerStatuses||{}, {ownerLabel:computerName(state.data.hostName),ownerId:state.data.hostId||state.data.remote?.hostId||'',selected:draft.form?.['provider-route']||draft.form?.provider||''}).filter(choice=>[...providerInput.options].some(option=>option.value===choice.provider));
  routeInput.innerHTML='<option value="">Select provider first</option>'+routeChoices.map(choice=>`<option value="${escape(choice.id)}">${escape(choice.label)}${choice.available?'':' · unavailable'}</option>`).join('');
  const providerField=providerInput.closest('.model-field,label');providerInput.hidden=true;providerInput.after(routeInput);dialog.append(providerInput);if(providerField)providerField.hidden=false;
  const applyRoute=()=>{const choice=routeChoices.find(choice=>choice.id===routeInput.value),modelInput=$('#chat-model');modelInput.dataset.sourceHost=choice?.sourceHost||'';modelInput.dataset.sourceProvider=choice?.sourceProvider||'';modelInput.dataset.sourceUnavailable=String(choice?.available===false);providerInput.value=choice?.provider||'';return choice;};
  routeInput.onchange=()=>{applyRoute();providerInput.dispatchEvent(new Event('change',{bubbles:true}));};
  const savedSource=state.data.providerStatuses?.[draft.form?.provider]?.models?.find(model=>model.id===draft.form?.model)?.sharedSource;
  const savedRoute=draft.form?.['provider-route']||routeChoices.find(choice=>choice.provider===(draft.form?.provider||providerInput.value)&&(!savedSource||choice.sourceHost===savedSource.hostId&&choice.sourceProvider===savedSource.providerId))?.id||'';routeInput.value=savedRoute;applyRoute();
  surface?.restore();applyRoute();if(surface){surface.ready();surface.resume(()=>validate());if($('#chat-provider').value)void $('#chat-provider').onchange();}
  $('#chat-prompt').dataset.chatSetupPrompt='';
  if(draft.lockWorkspace)$('#chat-workspace').disabled=true;
  else void attachChatDestinations(draft=>chatDialog(onCreated,guard,draft,surface),'',{root:dialog,surface,beforeStart:guard,...(onCreated?{onCreated:(id,title,hostId)=>onCreated({id:'peer:'+hostId+':'+id,type:'remote-run',hostId,runId:id,label:title||'Chat'})}:{})}).then(()=>{if(alive()&&dialog.querySelector('.peer-destination')){dialog.querySelector('.new-chat-grid').prepend(dialog.querySelector('.peer-destination'));}});
}

function newSchedule() {
  showDialog('<h2>New schedule</h2><div class="field"><label>Name</label><input id="new-name" placeholder="Weekly workspace review"></div><div class="actions"><button id="close-dialog">Cancel</button><button class="primary" id="dialog-submit">Create paused schedule</button></div>',async()=>{
    const name=$('#new-name').value.trim();if(!name)throw new Error('Enter a name.');const defaults=state.data.settings;
    const id=name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)+'-'+Date.now().toString(36);
    await api('/api/schedules',{schedule:{schemaVersion:1,id,name,enabled:false,cron:'0 9 * * 1-5',timezone:defaults.timezone,provider:defaults.provider,model:defaults.model,reasoningEffort:defaults.reasoningEffort,contextTier:defaults.contextTier,workspace:defaults.workspace,skillDirectories:defaults.skillDirectories,mcpServers:defaults.mcpServers,misfire:'skip',prompt:'Review this workspace and ask for feedback.'}});await refresh();schedule(id);
  });
}
function importDialog() { showDialog('<h2>Import schedules</h2><p class="note">Paste a JSON schedule or array. Imports are always paused.</p><textarea id="import-json" rows="10" placeholder="[{ … }]"></textarea><div class="actions"><button id="close-dialog">Cancel</button><button class="primary" id="dialog-submit">Import</button></div>',async()=>{const value=JSON.parse($('#import-json').value);await api('/api/import',{schedules:Array.isArray(value)?value:[value]});}); }
let disposeFileBrowser;
function fileBrowserTab(parent=null){
 const workspaceId=parent?.workspaceId||state.data.context.defaultWorkspaceId;
 if(parent?.hostId)throw Error('Open workspace files on their owning computer.');
 return {id:'files:'+workspaceId,type:'files',workspaceId,label:'Files · '+(state.data.context.workspaces.find(w=>w.id===workspaceId)?.name||'Workspace')};
}
function openFileBrowser(parent=null){openTab(fileBrowserTab(parent));}
function renderFileBrowser(tab){
 if($('#main').dataset.fileBrowser===tab.id&&disposeFileBrowser)return;
 $('#main').dataset.fileBrowser=tab.id;
 disposeFileBrowser=mountFileBrowser($('#main'),{workspaceId:tab.workspaceId,escape,request:(action,args,options)=>api('/api/workspace-explorer/'+action,args,options),state:tab.fileBrowserState||=({}),open:markdown=>openTab({id:'markdown:'+markdown.file,type:'markdown',label:markdown.file.split('/').pop(),markdown})});
}
function markdownDialog(parentId=null) { openMarkdownPicker('open',parentId); }
async function renderMarkdown() {
  const tab=state.tabs.find(t=>t.id===state.tab);let markdown=tab?.markdown||state.markdown;
  if(tab&&markdown?.content===undefined&&!markdown?.error){$('#main').dataset.positionLoading=$('#main').dataset.viewKey;$('#main').innerHTML='<p class="note">Loading document…</p>';try{tab.markdown=await api('/api/markdown',{file:markdown?.file||tab.file});}catch(error){tab.markdown={file:markdown?.file||tab.file,error:error.message};}if(!state.tabs.includes(tab))return;retainDocument(tab,()=>state.tab===tab.id);if(state.tab!==tab.id)return;markdown=tab.markdown;}delete $('#main').dataset.positionLoading;
  if(tab)retainDocument(tab,()=>state.tab===tab.id);
  if(markdown?.error){$('#main').innerHTML=`<div class="heading"><h1>${escape(markdown.file?.split('/').pop())}</h1></div><p class="banner">${escape(markdown.error)}</p><p class="note">This file must still be inside a currently authorized workspace.</p><button id="markdown-retry">Retry file</button>`;$('#markdown-retry').onclick=async()=>{try{const value=await api('/api/markdown',{file:markdown.file});Object.assign(markdown,value,{error:null});renderMarkdown();}catch(error){toast(error.message);}};return;}
  if(markdown?.mediaType?.startsWith('image/')){$('#main').innerHTML='<div class="heading"><h1>'+escape(markdown.file.split('/').pop())+'</h1></div><img class="file-image-preview" alt="'+escape(markdown.file.split('/').pop())+'" src="'+escape(markdown.dataURL)+'">';return;}
  $('#main').innerHTML=`<div class="heading"><div><div class="eyebrow">Markdown preview</div><h1>${escape(markdown?.file.split('/').pop())}</h1><div class="filepath">${escape(markdown?.file)}</div><p class="note file-dates">${escape(fileDatesText(markdown))}</p></div></div><article class="card markdown-preview"></article><details><summary>Markdown source</summary><pre class="markdown">${escape(markdown?.content||'')}</pre></details>`;
  ProteusMarkdown.mount($('.markdown-preview'), markdown?.content || '', {
    copy: text => window.desktop ? window.desktop.copyText(text) : navigator.clipboard.writeText(text),
    link: source => openMessageLink(source, markdown.file.slice(0, markdown.file.lastIndexOf('/'))),
    image: async source => (await api('/api/markdown', { file: markdown.file, image: source })).dataURL
  });
  restoreDocumentView($('#main'),$('#main').dataset.viewKey);
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
      if (/\.(md|png|jpe?g|gif|webp)$/i.test(file)) { const markdown = await api('/api/markdown', { file }); const parent=origin;openTab({ id: 'markdown:' + file, type: 'markdown', label: file.split('/').pop(), markdown,...(parent?{parentId:parent.id}:{}) }); }
      else if (window.desktop) await window.desktop.openPath(file);
      else toast(file);
    } else if (kind === 'mail') { await navigator.clipboard.writeText(source.slice(7)); toast('Email address copied.'); }
  } catch (error) { toast(error.message); }
}

function renameContentTab(tab){showDialog(`<h2>Rename tab</h2><label>Tab name<input id="content-tab-title" maxlength="200" value="${escape(tab.label||'')}"></label><button id="close-dialog">Cancel</button><button id="dialog-submit">Save name</button>`,async()=>{const title=$('#content-tab-title').value.trim();if(!title)throw new Error('Enter a tab name.');tab.customTitle=title;tab.label=title;saveWorkspace();renderChatSubtabs();});}
function scopeParent(scope){
 if(scope.scope==='team')return {id:null,type:'team'};
 if(scope.scope==='main')return {id:undefined,type:'main'};
 const matches=state.tabs.filter(tab=>scope.scope==='project'?tab.type==='workspace'&&tab.projectId===scope.id&&(tab.hostId||'')===(scope.hostId||''):scope.scope==='workspace'?tab.type==='workspace'&&!tab.projectId&&tab.workspaceId===scope.id&&(tab.hostId||'')===(scope.hostId||''):scope.hostId?tab.type==='remote-run'&&tab.hostId===scope.hostId&&tab.runId===scope.id:tab.type==='run'&&(tab.runId||tab.id)===scope.id);
 const visible=new Set();let current=state.tabs.find(tab=>tab.id===state.tab);while(current&&!visible.has(current.id)){visible.add(current.id);current=state.tabs.find(tab=>tab.id===current.parentId);}
 return matches.find(tab=>tab.id===scope.parentId)||matches.find(tab=>visible.has(tab.id))||matches.find(tab=>!tab.parentId)||matches[0];
}
function sharedBrowserDescriptor(tab){
  const info=tab.info||tab,title=tab.customTitle||tab.label||tab.title||'New tab',browserURL=tab.remotePreviewURL||info.sharedURL||info.url||tab.url||'',entry=info.history?.entries?.[info.history.index];
  const privateLocal=info.privateLocal||syncableTabURL(browserURL)===null;
  const url=privateLocal?(syncableTabURL(entry?.url||'')||tab.lastSharedURL||''):browserURL;
  const sharedTitle=privateLocal?(tab.customTitle||entry?.title||tab.lastSharedTitle||'New tab'):title;
  if(!privateLocal){tab.lastSharedURL=url;tab.lastSharedTitle=sharedTitle;}
  return {id:tab.contentTabId||tab.id,type:'browser',...(tab.newChatDraft?{setup:{kind:tab.newChatDraft.chatType==='internet'?'internet':'chat'}}:{}),...contentTabMetadata({...tab,...info,hidden:tab.hidden}),navigationPending:info.navigationPending===true||tab.pendingOpen===true,title:sharedTitle,...(tab.customTitle?{customTitle:tab.customTitle}:{}),profileId:info.profileId||tab.profileId||'default',url,...(info.history?{history:info.history}:{})};
}
async function descriptorFor(tab,parent){
  if(tab.type==='unavailable')return {...tab.unavailableDescriptor,...contentTabMetadata(tab),title:tab.customTitle||tab.label||tab.unavailableDescriptor.title};
  if(tab.preview)return null;
  const title=tab.customTitle||tab.label||tab.title||'New tab',named={...contentTabMetadata(tab),...(tab.customTitle?{customTitle:tab.customTitle}:{})};
  if(tab.type==='browser'||tab.browserId)return sharedBrowserDescriptor(tab);
  if(['workspace','main'].includes(parent?.type)&&['run','remote-run'].includes(tab.type)&&(!tab.hostId||tab.hostId===parent?.hostId))return {id:'chat:'+(tab.runId||tab.id),type:'chat',chatId:tab.runId||tab.id,title,navigationPending:tab.pendingOpen===true,...named};
  if(tab.type==='terminal'&&tab.terminal?.id)return {id:'terminal:'+tab.terminal.id,type:'terminal',terminalId:tab.terminal.id,title,...named};
  if(tab.type==='remote-document'){if(tab.hostId&&parent?.hostId!==tab.hostId)return null;return {id:'document:'+tab.documentId,type:'document',title,...named,documentId:tab.documentId,...(tab.runId?{chatId:tab.runId}:{}),mediaType:tab.mediaType||'text/markdown'};}
  if(tab.type==='markdown'&&['run','workspace','main','team'].includes(parent?.type)){const file=tab.markdown?.file||tab.file;if(!file)return null;const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode((parent.type==='workspace'?(parent.projectId?'project:'+parent.projectId:'workspace:'+parent.workspaceId):parent.type==='main'?'main':parent.type==='team'?'team':parent.runId||parent.id)+'\0'+file));const documentId=tab.contentTabId?.startsWith('document:')?tab.contentTabId.slice(9):[...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');tab.contentTabId='document:'+documentId;return {id:'document:'+documentId,type:'document',title,...named,documentId,...(tab.associationChatId?{chatId:tab.associationChatId}:{}),mediaType:/\.html?$/i.test(file)?'text/html':'text/markdown'};}
  return null;
}
const contentTabSync=createTabSynchronizer({navigation:true,explicitCloseOnly:true,pendingStorage:desktopWindowId==='main'?localStorage:{getItem:key=>localStorage.getItem('window:'+desktopWindowId+':'+key),setItem:(key,value)=>localStorage.setItem('window:'+desktopWindowId+':'+key,value),removeItem:key=>localStorage.removeItem('window:'+desktopWindowId+':'+key)},
  // A legacy saved project can contain never-registered browsers/history as
  // well as chats. Keep their evidence until explicit Windows recovery. Once
  // observed in the owner registry, ordinary shared Close still wins.
  preserveUntracked:(scope,tab)=>tab.type==='chat'||['workspace','project','chat'].includes(scope.scope),
  scopes:()=>synchronizedContentScopes(),
  readLocal:async scope=>{if(scope.scope==='team')return (await Promise.all(teamState().tabs.map(tab=>descriptorFor(tab,{type:'team',id:null})))).filter(Boolean);const parent=scopeParent(scope);if(!parent)return [];
    // Historical chat aliases share one child registry. Reading only the
    // visible alias mistakes another alias's saved children for user closes.
    const parents=scope.scope==='chat'?state.tabs.filter(tab=>!tab.connectionPaused&&(scope.hostId?tab.type==='remote-run'&&tab.hostId===scope.hostId&&tab.runId===scope.id:tab.type==='run'&&!tab.hostId&&(tab.runId||tab.id)===scope.id)):[parent];
    return (await Promise.all(parents.flatMap(owner=>state.tabs.filter(tab=>tab.parentId===owner.id).map(tab=>descriptorFor(tab,owner))))).filter(Boolean);},
  request:async(scope,action,args={},options)=>{
    if(!scope.hostId)return api('/api/content-tabs',{action,scope:scope.scope,id:scope.id,...args});
    if(action==='get'&&scope.scope==='workspace'&&state.tabs.some(tab=>tab.type==='remote-run'&&tab.parentId===scopeParent(scope)?.id)){
      // The peer may have upgraded while this renderer remained open. Reparent
      // saved aliases before its new project registry can close their old scope.
      const snapshot=await window.desktop.peers({action:'request',hostId:scope.hostId,method:'sync',args:{}});
      const catalog=snapshot.state?.workspaceProjects;
      if(snapshot.state?.capabilities?.includes('projects.v1')&&state.tabs.some(tab=>tab.type==='remote-run'&&tab.parentId===scopeParent(scope)?.id&&catalog?.projects?.some(project=>project.id===catalog.memberships?.[tab.runId]?.projectId&&project.workspaceId===scope.id)))await reconcileRemoteProjectPlacement(scope.hostId);
    }
    return window.desktop.peers({action:'request',hostId:scope.hostId,method:action==='get'?'tabs.get':action==='history'?'tabs.history':'tabs.mutate',args:{scope:scope.scope,id:scope.id,...args},options});
  },
  acknowledge:async(scope,descriptors)=>{
    const parent=scopeParent(scope);if(scope.scope!=='team'&&(!parent||parent.connectionPaused))return;
    const list=scope.scope==='team'?teamState().tabs:state.tabs.filter(tab=>!tab.connectionPaused&&tab.parentId===parent.id);
    for(const tab of list){
      if(tab.type!=='browser'||tab.remotePreviewURL||tab.restoreFailed)continue;
      const current=await descriptorFor(tab,scope.scope==='team'?{type:'team',id:null}:parent),descriptor=descriptors.find(item=>item.id===current?.id);
      if(!acknowledgesBrowserNavigation(current,descriptor))continue;
      const info=await window.desktop.browser({action:'apply-history',id:tab.browserId||tab.id,url:descriptor.url,history:descriptor.history,title:descriptor.history.entries[descriptor.history.index]?.title||descriptor.title,expectedURL:current.url,expectedEntryId:current.history.currentEntryId});
      if(tab.info)tab.info=info;else Object.assign(tab,{url:info.url,history:info.history,nativeTitle:info.title,navigationPending:info.navigationPending});
    }
  },
  apply:async(scope,descriptors,captured,{discardPendingNavigation=false,preservedIds=[],membershipOnly=false,removedIds=[],preservedNavigationIds=[]}={})=>{
    descriptors=previewContentDescriptors(scope,descriptors);
    const parent=scopeParent(scope);if(scope.scope!=='team'&&(!parent||parent.connectionPaused))return;
    applyingContentTabs++;let changed=false;
    try{
      const list=scope.scope==='team'?teamState().tabs:state.tabs.filter(tab=>!tab.connectionPaused&&tab.parentId===parent.id);
      const ids=new Set(descriptors.map(tab=>tab.id));
      const descriptorId=async tab=>scope.scope==='team'?(tab.contentTabId||tab.id):(await descriptorFor(tab,parent))?.id;
      const preserved=new Set(preservedIds),order=ids=>contentTabOrder(ids.filter(id=>!preserved.has(id)));
      const currentIds=[];for(const tab of list)currentIds.push(await descriptorId(tab));
      const currentOrder=order(currentIds),orderChangedDuringRequest=currentOrder.join('\0')!==order(captured.map(tab=>tab.id)).join('\0');
      const capturedIds=new Set(captured.map(item=>item.id));
      for(const tab of list.slice()){const id=await descriptorId(tab);if(!shouldRemoveCapturedTab(id,ids,capturedIds,{membershipOnly,removedIds,preservedIds,pendingOpen:tab.pendingOpen===true}))continue;const currentDescriptor=await descriptorFor(tab,parent);if(scope.scope!=='team'&&tab.parentId!==parent.id)continue;if(['run','remote-run'].includes(tab.type))await releaseChatChildViews(tab);if((tab.type==='browser'||tab.browserId)&&!tab.restoreFailed)await window.desktop.browser({action:'close',presentationOnly:true,id:tab.browserId||tab.id});if(tab.type==='remote-document')forgetRemoteDocument(tab.id);if(scope.scope==='team'){teamState().tabs=teamState().tabs.filter(item=>item!==tab);if(teamState().active===tab.id)teamState().active='overview';}else{state.tabs=state.tabs.filter(item=>item!==tab);if(state.tab===tab.id)state.tab=parent.id||'overview';}changed=true;}
      if(!membershipOnly)for(const descriptor of descriptors){let tab;for(const candidate of list){if(await descriptorId(candidate)===descriptor.id){tab=candidate;break;}}
        // A tab closed/moved after the request snapshot must not be recreated
        // from that older owner response. Its close is published on the next pass.
        if(!tab&&captured.some(item=>item.id===descriptor.id))continue;
        if(!tab){if(descriptor.type==='browser'){const info=await window.desktop.browser({action:'create',contentTabId:descriptor.id,group:scope.scope==='team'?'team':'main',restore:true,mirror:true,unloaded:true,hidden:!!descriptor.hidden,parentId:parent?.id,profileId:descriptor.profileId||'default',url:scope.hostId&&isLoopbackPreview(descriptor.url)?'':descriptor.url,history:scope.hostId&&isLoopbackPreview(descriptor.url)?undefined:descriptor.history,title:descriptor.title,associationChatId:descriptor.associationChatId,persist:descriptor.persist,openedAt:descriptor.openedAt,lastTouchedAt:descriptor.lastTouchedAt,lastActivityAt:descriptor.lastActivityAt});if(!['team','main'].includes(scope.scope)&&!state.tabs.includes(parent)){await window.desktop.browser({action:'close',presentationOnly:true,id:info.id});return;}tab=scope.scope==='team'?{id:'team:'+crypto.randomUUID(),type:'browser',browserId:info.id,profileId:info.profileId||descriptor.profileId||'default',url:info.url,history:info.history,nativeTitle:info.title,title:descriptor.title,loaded:false}:{id:info.id,type:'browser',label:descriptor.title,parentId:parent.id,info};}
          else if(descriptor.type==='chat'&&['workspace','project','main'].includes(scope.scope))tab={id:parent.id?parent.id+':chat:'+descriptor.chatId:descriptor.chatId,type:scope.hostId?'remote-run':'run',...(scope.hostId?{hostId:scope.hostId}:{}),runId:descriptor.chatId,parentId:parent.id,label:descriptor.title};
          else if(descriptor.type==='terminal')tab={id:(parent.id||'main')+':terminal:'+descriptor.terminalId,type:'terminal',...(scope.hostId?{hostId:scope.hostId}:{}),parentId:parent.id,label:descriptor.title,terminal:{id:descriptor.terminalId}};
          else if(scope.hostId)tab={id:'document:'+scope.hostId+':'+scope.id+':'+descriptor.documentId,type:'remote-document',parentId:parent.id,hostId:scope.hostId,runId:['workspace','project'].includes(scope.scope)?descriptor.chatId||'':scope.id,workspaceId:scope.scope==='workspace'?scope.id:scope.scope==='project'?parent.workspaceId:undefined,projectId:scope.scope==='project'?scope.id:undefined,documentId:descriptor.documentId,mediaType:descriptor.mediaType,label:descriptor.title};
          else{try{
            const document=await api('/api/content-tabs',{action:'document',scope:scope.scope,id:scope.id,documentId:descriptor.documentId,metadataOnly:true});
            if(!['main','team'].includes(scope.scope)&&!state.tabs.includes(parent))return;
            tab={id:'document-view:'+(parent.id||scope.scope+':'+scope.id)+':'+descriptor.documentId,type:'markdown',parentId:parent.id,markdown:document,label:descriptor.title};
          }catch(error){
            // An unavailable source is still an owner tab, never a failed scope.
            tab={id:'unavailable:'+descriptor.id,type:'unavailable',parentId:parent.id,label:descriptor.title,unavailableDescriptor:descriptor,unavailableReason:error.message};
          }}
          if(scope.hostId&&descriptor.type==='browser'&&isLoopbackPreview(descriptor.url))tab.remotePreviewURL=descriptor.url;
          tab.contentTabId=descriptor.id;tab.customTitle=descriptor.customTitle;if(scope.scope==='team'){const existing=teamState().tabs.find(item=>(item.contentTabId||item.id)===descriptor.id||item.browserId&&item.browserId===tab.browserId);if(existing){if(tab.browserId&&tab.browserId!==existing.browserId)await window.desktop.browser({action:'close',presentationOnly:true,id:tab.browserId});tab=existing;}else teamState().tabs.push(tab);}else{const existing=state.tabs.find(item=>item.id===tab.id);if(existing){Object.assign(existing,tab);tab=existing;}else state.tabs.push(tab);}changed=true;
        }
        if(descriptor.setup&&!tab.newChatDraft&&!descriptor.url){tab.newChatDraft={schemaVersion:1,chatType:descriptor.setup.kind==='internet'?'internet':'user',parentId:parent.id,workspaceId:parent.workspaceId,projectId:parent.projectId,...(scope.hostId?{hostId:scope.hostId}:{})};changed=true;}
        // A retained child has no native view yet. Its saved descriptor is unchanged.
        if(tab.restoreFailed)continue;
        // Preserve edits made while the request was in flight; they are sent next.
        if(tab.pendingOpen){delete tab.pendingOpen;changed=true;}
        const current=await descriptorFor(tab,parent);
        const initial=captured.find(item=>item.id===descriptor.id);
        if(initial&&JSON.stringify(current)!==JSON.stringify(initial))continue;
        if(descriptor.type==='browser'){
          const info=tab.info||tab;
          if(Date.parse(descriptor.lastActivityAt)>Date.parse(info.lastActivityAt||'1970-01-01')||!info.openedAt&&descriptor.openedAt||Date.parse(descriptor.lastTouchedAt)>Date.parse(info.lastTouchedAt||'1970-01-01')||descriptor.favicon&&descriptor.favicon!==info.favicon){
            const updated=await window.desktop.browser({action:'sync-metadata',id:tab.browserId||tab.id,openedAt:descriptor.openedAt,lastTouchedAt:descriptor.lastTouchedAt,lastActivityAt:descriptor.lastActivityAt,favicon:descriptor.favicon});
            if(tab.info)tab.info=updated;else Object.assign(tab,{openedAt:updated.openedAt,lastTouchedAt:updated.lastTouchedAt,lastActivityAt:updated.lastActivityAt,favicon:updated.favicon});
          }
        }
        if(descriptor.type==='document'){
          // Hydrate every retained local alias, including a newly materialized view.
          // Missing window metadata must not be published back as loss of origin.
          const binding=documentAssociationMetadata(descriptor);
          for(const view of new Set([tab,...list.filter(view=>view.contentTabId===descriptor.id)]))if(view.type==='markdown'&&!view.associationChatId&&binding.associationChatId){Object.assign(view,binding);changed=true;}
        }
        if(tab.hidden!==!!descriptor.hidden){await setTabVisibility(tab,!!descriptor.hidden);changed=true;}
        for(const field of ['openedAt','lastTouchedAt','lastActivityAt'])if(descriptor[field]&&tab[field]!==descriptor[field]){tab[field]=descriptor[field];changed=true;}
        if(descriptor.type==='browser'&&!!(tab.info?.persist||tab.persist)!==!!descriptor.persist){const info=await window.desktop.browser({action:'persist',id:tab.browserId||tab.id,enabled:!!descriptor.persist,passive:true});if(tab.info)tab.info=info;else tab.persist=!!descriptor.persist;changed=true;}
        if((tab.customTitle||tab.label||tab.title)!==descriptor.title||tab.customTitle!==descriptor.customTitle){tab.customTitle=descriptor.customTitle;if(scope.scope==='team')tab.title=descriptor.title;else tab.label=descriptor.title;changed=true;}
        if(descriptor.type==='browser'&&!preservedNavigationIds.includes(descriptor.id)&&!tab.remotePreviewURL&&(JSON.stringify(normalizeContentTabHistory(tab.info?.history||tab.history))!==JSON.stringify(normalizeContentTabHistory(descriptor.history))||(tab.info?.sharedURL||tab.sharedURL||tab.info?.url||tab.url||'')!==descriptor.url||((tab.info?.loaded===false||tab.loaded===false)&&(tab.info?.title||tab.nativeTitle||tab.title)!==(descriptor.history?.entries[descriptor.history.index]?.title||descriptor.title)))){
          const localURL=tab.info?.url||tab.url||'';
          if((tab.info?.privateLocal||tab.privateLocal||localURL&&syncableTabURL(localURL)===null)&&!discardPendingNavigation)continue;
          const info=await window.desktop.browser({action:'apply-history',id:tab.browserId||tab.id,url:descriptor.url,title:descriptor.history?.entries[descriptor.history.index]?.title||descriptor.title,history:descriptor.history,expectedURL:localURL,expectedEntryId:(tab.info?.history||tab.history)?.currentEntryId||null,discardPending:discardPendingNavigation});
          if(tab.info)tab.info=info;else Object.assign(tab,{url:info.url,history:info.history,nativeTitle:info.title});changed=true;
        }
      }
      const full=scope.scope==='team'?teamState().tabs:state.tabs;
      const relevant=[];for(const tab of full)if(scope.scope==='team'||tab.parentId===parent.id){const id=await descriptorId(tab);if(ids.has(id))relevant.push({tab,id});}
      // Older sessions can contain distinct local views for one shared descriptor.
      // Keep every view in stable local order; one descriptor must not erase an alias.
      const ordered=descriptors.flatMap(item=>relevant.filter(entry=>entry.id===item.id).map(entry=>entry.tab));const positions=full.map((tab,index)=>relevant.some(entry=>entry.tab===tab)?index:-1).filter(index=>index>=0);
      // Native commands above yield to clicks, drags and other scope updates. Check
      // again immediately before replacement so a late user reorder cannot be undone.
      const latestOrder=[];for(const tab of full)if(scope.scope==='team'||tab.parentId===parent.id){const id=await descriptorId(tab);if(id)latestOrder.push(id);}
      const orderChangedDuringApply=order(latestOrder).join('\0')!==order(currentOrder.filter(id=>ids.has(id)).concat(descriptors.filter(item=>!currentOrder.includes(item.id)).map(item=>item.id))).join('\0');
      if(!orderChangedDuringRequest&&!orderChangedDuringApply&&positions.some((position,index)=>full[position]!==ordered[index])){positions.forEach((position,index)=>full[position]=ordered[index]);changed=true;}
      if(changed){saveWorkspace();renderTabs();renderChatSubtabs();void refreshMountedWorkspaceTabs().catch(error=>console.debug('Tab list refresh:',error.message));if(state.page==='team'&&state.tab==='overview')renderTeamTools({preserveBrowser:true});}
    }finally{applyingContentTabs--;}
  },
  onError:(error,scope,initialized,pending=[])=>{
    if(error.code==='NAVIGATION_CONFLICT'||error.code==='NAVIGATION_OPERATION_CONFLICT'||error.code==='NAVIGATION_TAB_CLOSED'||/Navigation changed on the owning computer|Navigation operation ID was already used|This browser tab is no longer open/i.test(error.message)){
      void recordBrowserIssue({kind:'history-conflict',scope,title:(scopeParent(scope)?.label||scope.scope)+' · Browser history needs attention',body:'A pending browser action conflicts with the saved history. Automatic retries are paused. Review Notifications to keep the saved history or preserve the pending page in a new tab.'}).catch(()=>{});
      return;
    }
    if((initialized||error.code==='JOURNAL_BUSY'||/Remote command history is busy/i.test(error.message))&&!/offline|closed|not paired|unavailable|not connected|reconnecting|connect the selected computer|disconnected|authentication in Connections/i.test(error.message))toast(error.message);
  }
});
let savedContentScopes=[];
function checkpointDepartedContentScopes(){
 const current=visibleContentScopes(),key=scope=>JSON.stringify([scope.hostId||'',scope.scope,scope.id]),active=new Set(current.map(key));
 const departed=savedContentScopes.filter(scope=>!active.has(key(scope))&&scopeParent(scope));savedContentScopes=current;
 if(!departed.length)return null;
 return Promise.all(departed.map(scope=>contentTabSync.checkpoint(scope))).catch(error=>{toast(error.message);return {failed:true,error:error.message};});
}
function visibleContentScopes(){
 if(!window.desktop||document.hidden)return [];
 const scopes=[],seen=new Set();let tab=state.tabs.find(tab=>tab.id===state.tab);
 while(tab&&!seen.has(tab.id)){seen.add(tab.id);if(tab.connectionPaused)break;if(tab.type==='workspace')scopes.push({scope:tab.projectId?'project':'workspace',id:tab.projectId||tab.workspaceId,...(tab.hostId?{hostId:tab.hostId}:{})});else if(['run','remote-run'].includes(tab.type))scopes.push({scope:'chat',id:tab.runId||tab.id,...(tab.hostId?{hostId:tab.hostId}:{})});tab=state.tabs.find(item=>item.id===tab.parentId);}
 if(!scopes.length)scopes.push(state.page==='team'?{scope:'team',id:windowScopeId('team')}:{scope:'main',id:windowScopeId('main')});
 return scopes;
}
function synchronizedContentScopes(){
 if(!window.desktop||!workspaceReady||workspaceRestoring||workspaceClosing)return [];
 return openContentScopes(state.tabs,visibleContentScopes());
}
function visibleFollowScope(){
 if(!window.desktop||!workspaceReady||document.hidden)return null;
 let tab=state.tabs.find(tab=>tab.id===state.tab);const seen=new Set();
 while(tab&&!seen.has(tab.id)){seen.add(tab.id);if(tab.type==='workspace'&&!tab.connectionPaused)return {scope:tab.projectId?'project':'workspace',id:tab.projectId||tab.workspaceId,...(tab.hostId?{hostId:tab.hostId}:{})};tab=state.tabs.find(item=>item.id===tab.parentId);}
 return null;
}
const followPositions=new Map(),followBrowserPositions=new Map(),followConversationPositions=new Map(),followDocumentPositions=new Map();let followScrollSuppressedUntil=0,followHumanUntil=0,stopFollowRestoration;
function followPresentation(tab){
 for(const map of [followPositions,followBrowserPositions,followConversationPositions,followDocumentPositions])for(const id of map.keys())if(!state.tabs.some(item=>item.id===id))map.delete(id);
 if(['run','remote-run'].includes(tab.type)){const position=followConversationPositions.get(tab.id);return position?{conversation:position}:{};}
 if(tab.type==='remote-document'&&followDocumentPositions.has(tab.id)){const saved=followDocumentPositions.get(tab.id),version=remoteDocumentPositionVersion(tab.id);if(!version||version===saved.documentVersion)return {...(followPositions.has(tab.id)?{positions:followPositions.get(tab.id)}:{}),...saved};followDocumentPositions.delete(tab.id);}
 if(tab.type!=='browser')return followPositions.has(tab.id)?{positions:followPositions.get(tab.id)}:{};
 const observation=followBrowserPositions.get(tab.id),entryId=tab.info?.history?.currentEntryId||'';
 if(observation?.browser.url===tab.info?.url&&observation.browser.entryId===entryId)return observation;
 followBrowserPositions.delete(tab.id);const url=syncableTabURL(tab.info?.url||'');return url?{browser:{url,entryId}}:{};
}
const followClientId=crypto.randomUUID();
const projectFollower=createProjectFollower({
 clientId:followClientId,
 // Local windows share content, but each keeps its own selection/reading state.
 // Paired computers retain their explicit same-scope follow behavior.
 acceptPresentation:acceptsProjectPresentation,
 current:visibleFollowScope,
 request:(scope,value)=>scope.hostId?window.desktop.peers({action:'request',hostId:scope.hostId,method:'tabs.follow',args:value}):api('/api/project-follow',value),
 sync:async scope=>{const current=()=>JSON.stringify(visibleFollowScope())===JSON.stringify(scope);if(!current())return;for(const child of visibleContentScopes())if(child.scope==='chat'){if(!current())return;await contentTabSync.sync(child);}if(current())await contentTabSync.sync(scope);},
 read:async scope=>{const parent=scopeParent(scope),selected=state.tabs.find(tab=>tab.id===state.tab);if(!parent||!selected)return {tabId:null};const direct=selected.parentId===parent.id?selected:state.tabs.find(tab=>tab.id===selected.parentId);const descriptor=selected===parent?null:await descriptorFor(direct,parent);const child=direct&&direct!==selected?await descriptorFor(selected,direct):null;return {tabId:descriptor?.id||null,...(child?{childTabId:child.id}:{}),page:parent.workspacePage,...followPresentation(selected),...(selected.type==='terminal'&&captureTerminalScroll(selected.id)?{terminal:captureTerminalScroll(selected.id)}:{})};},
 apply:async(scope,value,{current})=>{
   stopFollowRestoration?.();stopFollowRestoration=null;
   const parent=scopeParent(scope);if(!parent)return;let selected=parent;
   if(value.tabId){for(const tab of state.tabs.filter(tab=>tab.parentId===parent.id))if((await descriptorFor(tab,parent))?.id===value.tabId){selected=tab;break;}if(selected===parent)return;}
   if(value.childTabId&&['run','remote-run'].includes(selected.type)){
     const chat=selected;
     const findChild=async()=>{for(const tab of state.tabs.filter(tab=>tab.parentId===chat.id))if((await descriptorFor(tab,chat))?.id===value.childTabId)return tab;};
     let child=await findChild();
     if(!current())return;
     if(!child){await contentTabSync.sync({scope:'chat',id:chat.runId||chat.id,parentId:chat.id,...(scope.hostId?{hostId:scope.hostId}:{})});child=await findChild();}
     if(!child)return;selected=child;
   }
   if(!current()||JSON.stringify(visibleFollowScope())!==JSON.stringify(scope))return;
   followScrollSuppressedUntil=Date.now()+700;
   const pageChanged=value.page&&parent.workspacePage!==value.page;if(value.page)parent.workspacePage=value.page;
   if(state.tab!==selected.id||pageChanged&&selected===parent){state.tab=selected.id;state.selected=selected.id;if(selected.parentId)selectedChildren.set(selected.parentId,selected.id);if(selected.type==='browser')selectBrowserTab(selected.info);else render();revealSelectedTab();}
   if(value.positions){if(selected.type==='browser'){if(value.browser?.url===selected.info?.url&&value.browser.entryId===(selected.info?.history?.currentEntryId||'')){followBrowserPositions.set(selected.id,{browser:value.browser,positions:value.positions});await window.desktop.browser({action:'follow-scroll',id:selected.id,url:value.browser.url,positions:value.positions});}}else{followPositions.set(selected.id,value.positions);stopFollowRestoration=restoreSharedScroll($('#main'),value.positions,()=>current()&&state.tab===selected.id);}}
   if(value.documentPositions&&value.documentVersion&&selected.type==='remote-document'){followDocumentPositions.set(selected.id,{documentVersion:value.documentVersion,documentPositions:value.documentPositions});const stopView=stopFollowRestoration,stopDocument=restoreRemoteDocumentPosition(selected.id,value.documentVersion,value.documentPositions,()=>current()&&state.tab===selected.id);stopFollowRestoration=()=>{stopView?.();stopDocument();};}
   if(!current())return;
   if(value.terminal&&selected.type==='terminal')applyTerminalScroll(selected.id,value.terminal);
   if(value.conversation&&['run','remote-run'].includes(selected.type)){followConversationPositions.set(selected.id,value.conversation);stopFollowRestoration=restoreConversationPosition($('#main'),value.conversation,{current:()=>current()&&state.tab===selected.id});}
 },
 onError:error=>{if(!/Unsupported|Unknown|reconnecting|offline|not paired|closed/i.test(error.message))console.debug('Project follow:',error.message);}
});
for(const type of ['pointerdown','wheel','touchstart','keydown'])document.addEventListener(type,event=>{if(event.isTrusted){stopFollowRestoration?.();stopFollowRestoration=null;followHumanUntil=Date.now()+2000;followScrollSuppressedUntil=0;projectFollower.human();}},{capture:true,passive:true});
document.addEventListener('scroll',event=>{if(!visibleFollowScope()||stopFollowRestoration||projectFollower.applying||Date.now()<followScrollSuppressedUntil||Date.now()>followHumanUntil)return;if(event.target.matches?.('.conversation')){const position=captureConversationPosition($('#main'));if(position){followConversationPositions.set(state.tab,position);projectFollower.changed();}return;}const position=sharedScrollPosition($('#main'),event.target);if(!position)return;const prior=followPositions.get(state.tab)||[];followPositions.set(state.tab,[...prior.filter(row=>row.path!==position.path),position].slice(-24));projectFollower.changed();},{capture:true,passive:true});
document.addEventListener('proteus:terminal-scroll',event=>{if(event.detail?.tabId===state.tab&&visibleFollowScope()&&!projectFollower.applying&&Date.now()>=followScrollSuppressedUntil&&Date.now()<=followHumanUntil)projectFollower.changed();});
window.desktop?.onBrowserScroll(value=>{const selected=state.tabs.find(tab=>tab.id===state.tab);if(value.id!==state.tab||value.url!==selected?.info?.url||!syncableTabURL(value.url)||!visibleFollowScope())return;stopFollowRestoration?.();stopFollowRestoration=null;followBrowserPositions.set(value.id,{browser:{url:value.url,entryId:selected.info?.history?.currentEntryId||''},positions:value.positions});projectFollower.human();projectFollower.changed();});
window.desktop?.onArtifactScroll?.(value=>{if(value.tabId!==state.tab||!visibleFollowScope())return;const documentVersion=remoteDocumentPositionVersion(value.tabId,value.version);if(!documentVersion)return;stopFollowRestoration?.();stopFollowRestoration=null;followDocumentPositions.set(value.tabId,{documentVersion,documentPositions:value.positions});projectFollower.human();projectFollower.changed();});
window.desktop?.onPeer(event=>{if(event.event==='project-follow')void projectFollower.receive({...event.data,hostId:event.hostId},event.data);if(event.event==='tabs'){const scope={scope:event.data.scope,id:event.data.id,hostId:event.hostId};if(synchronizedContentScopes().some(value=>value.scope===scope.scope&&value.id===scope.id&&value.hostId===scope.hostId))void contentTabSync.sync(scope);}if(event.recovered)projectFollower.reconnect(event.hostId);});
document.addEventListener('visibilitychange',()=>{saveWorkspace();projectFollower.changed();if(!document.hidden)void refresh();});
window.addEventListener('pagehide',()=>{stopFollowRestoration?.();projectFollower.dispose();});
function selectedChatParent(){
 const selected=state.tabs.find(tab=>tab.id===state.tab),parent=state.tabs.find(tab=>tab.id===selected?.parentId);
 if(previewEnabled(state)&&selected?.type==='run'&&!selected.parentId){const canonical=previewResourceParent(state.data.runs.find(r=>r.id===(selected.runId||selected.id))||{});if(canonical)return canonical;}
 if(parent?.type==='workspace')return parent;
 if(['run','remote-run','workspace'].includes(selected?.type))return selected;
 return parent&&['run','remote-run','workspace'].includes(parent.type)?parent:null;
}
async function newWorkspaceChat(parent,internet=false,prompt=''){
 return beginChatSetup(null,{parentId:parent.id,workspaceId:parent.workspaceId,projectId:parent.projectId||workspaceProjectsCatalog(state)?.defaultProjectIds?.[parent.workspaceId],hostId:parent.hostId,lockWorkspace:true,prompt,...(internet?{chatType:'internet'}:{})});
}

function tabToLeft(tab, tabs=state.tabs) {
  const siblings=tabs.filter(item=>tab.parentId?item.parentId===tab.parentId:!item.parentId&&!['overview','omi','life','team','engine','home','standup'].includes(item.type));
  const index=siblings.findIndex(item=>item.id===tab.id);
  return siblings[index-1]?.id || tab.parentId || 'overview';
}
function tabScope(tab){
  const parent=state.tabs.find(item=>item.id===tab.parentId);
  return parent?.type==='workspace'?{scope:parent.projectId?'project':'workspace',id:parent.projectId||parent.workspaceId,...(parent.hostId?{hostId:parent.hostId}:{})}:parent&&['run','remote-run'].includes(parent.type)?{scope:'chat',id:parent.runId||parent.id,...(parent.hostId?{hostId:parent.hostId}:{})}:{scope:'main',id:windowScopeId('main')};
}
async function releaseChatChildViews(parent){
  const children=state.tabs.filter(tab=>tab.parentId===parent.id);
  for(const child of children){
    if(child.type==='browser'&&!child.restoreFailed)await window.desktop.browser({action:'close',id:child.id,presentationOnly:true});
    if(child.type==='terminal')disposeTerminalUi(child.id);
    if(child.type==='remote-document')forgetRemoteDocument(child.id);
  }
  const ids=new Set(children.map(child=>child.id));state.tabs=state.tabs.filter(tab=>!ids.has(tab.id));
}
async function closeChildTab(tab){
  const closingScope=tabScope(tab),closingDescriptor=await descriptorFor(tab,state.tabs.find(item=>item.id===tab.parentId));
  if(['run','remote-run'].includes(tab.type)){
    const children={scope:'chat',id:tab.runId||tab.id,...(tab.hostId?{hostId:tab.hostId}:{})};
    await contentTabSync.sync(children);contentTabSync.forget(children);
  }
  // Native close emits browser-state before the IPC promise resolves. Move selection first.
  const previous=state.tab, previousChild=selectedChildren.get(tab.parentId), replacement=tabToLeft(tab);
  if(state.tab===tab.id)state.tab=replacement;
  if(selectedChildren.get(tab.parentId)===tab.id)selectedChildren.set(tab.parentId,replacement);
  try {
  if(tab.type==='browser'&&!tab.restoreFailed)await window.desktop.browser({action:'close',id:tab.id});
  if(tab.type==='terminal'){const current=await window.desktop.terminal({action:'state'});if(current.sessions.some(session=>session.id===tab.terminal.id))await window.desktop.terminal({action:'close',id:tab.terminal.id});disposeTerminalUi(tab.id);}
  if(tab.type==='remote-document')forgetRemoteDocument(tab.id);
  if(['run','remote-run'].includes(tab.type))await releaseChatChildViews(tab);
  if(closingDescriptor)contentTabSync.close(closingScope,closingDescriptor.id);
  state.tabs=state.tabs.filter(item=>item.id!==tab.id);releaseChatView(tab);
  saveWorkspace();render();
  } catch(error) { if(state.tabs.some(item=>item.id===previous))state.tab=previous;if(previousChild&&state.tabs.some(item=>item.id===previousChild))selectedChildren.set(tab.parentId,previousChild);render();throw error; }
}
function replaceChatContent(html){$('#main').innerHTML=html;}
function renderChatSubtabs(){
  const parent=selectedChatParent();if(!parent){cleanupChatEdges?.();$('#chat-subtabs')?.remove();return;}
  const previews=state.tabs.filter(tab=>tab.preview&&tab.parentId===parent.id);
  const children=contentTabViews(state.tabs.filter(tab=>!tab.hidden&&!tab.connectionPaused&&tab.parentId===parent.id&&!previews.some(preview=>preview.previewTabId&&(tab.contentTabId||tab.id)===preview.previewTabId)),state.tab);
  const signature=JSON.stringify([parent.id,parent.label,parent.workspacePage,parent.projectId,state.tab,children.map(tab=>[tab.id,browserLabel(tab),tab.type,tab.info?.favicon,tab.info?.agentControlling,tab.info?.audioPlaying,tab.info?.audioMuted])]);
  if($('#chat-subtabs')?.dataset.signature===signature)return;
  cleanupChatEdges?.();const previousScroll=$('#chat-subtabs .chat-subtab-list')?.scrollLeft||0;$('#chat-subtabs')?.remove();
  const bar=document.createElement('nav');bar.id='chat-subtabs';bar.dataset.signature=signature;bar.setAttribute('aria-label','Chat tabs');
  const previewWorkspace=previewEnabled(state)&&parent.type==='workspace';
  const fixed=previewWorkspace&&!parent.projectId?`<div class="preview-fixed-tabs">${['projects','chats','tabs','configuration'].map(page=>`<button class="${state.tab===parent.id&&(parent.workspacePage||'projects')===page?'selected':''}" data-preview-page="${page}"><span class="preview-fixed-tab-icon" data-preview-tab-icon="${page}" aria-hidden="true">${page==='projects'?projectIcon:page==='chats'?pairedBubbles:page==='tabs'?'▦':'⚙'}</span><span>${page[0].toUpperCase()+page.slice(1)}</span></button>`).join('')}</div>`:`<button class="${state.tab===parent.id?'selected':''} ${parent.projectId?'preview-project-root':''}" data-chat-subtab="${escape(parent.id)}" title="${escape(parent.label)}">${navigationIcon(parent.projectId?projectIcon:parent.type==='workspace'?workspaceIcon:pairedBubbles)}<span>${parent.projectId?escape(parent.label):parent.type==='workspace'?'Workspace':'Chat'}</span></button>`;
  bar.innerHTML=`${fixed}<div class="chat-subtab-list">${children.map(tab=>`<div class="chat-subtab ${state.tab===tab.id?'selected':''}"><button data-chat-subtab="${escape(tab.id)}" title="${escape(browserLabel(tab))}">${navigationIcon(['run','remote-run'].includes(tab.type)?pairedBubbles:tab.type==='browser'?browserTabIcon(tab.info,escape):tab.type==='terminal'?'⌘':'▤')}<span>${escape(browserLabel(tab))}</span></button>${tab.type==='browser'?browserAudioIcon(tab.info):''}<button data-chat-child-close="${escape(tab.id)}" aria-label="Close ${escape(browserLabel(tab))}">×</button></div>`).join('')}</div><details class="chat-tab-add"><summary aria-label="${parent.type==='workspace'?'Add tab to workspace':'Add tab to chat'}" title="Add tab">＋</summary><div class="chat-tab-add-options">${addTabMenuItems(parent.type==='workspace'?'workspace':'chat')}</div></details>`;
  // Navigation belongs to the workspace, independent of each content view's padding/scroll.
  $('#main').before(bar);
  bar.querySelectorAll('[data-preview-page]').forEach(button=>button.onclick=()=>{parent.workspacePage=button.dataset.previewPage;state.tab=parent.id;selectedChildren.set(parent.id,parent.id);render();});
  bar.querySelectorAll('[data-chat-subtab]').forEach(button=>button.onclick=()=>{const selected=state.tabs.find(tab=>tab.id===button.dataset.chatSubtab);if(!selected)return;state.tab=selected.id;if(!previewEnabled(state))selected.lastTouchedAt=new Date().toISOString();selectedChildren.set(parent.id,selected.id);if(selected.type==='browser')selectBrowserTab(selected.info);else render();});
  const childList=bar.querySelector('.chat-subtab-list');childList.scrollLeft=previousScroll;revealNewTabs(childList,'children:'+parent.id,'.chat-subtab',node=>node.querySelector('[data-chat-subtab]')?.dataset.chatSubtab);cleanupChatEdges=bindTabEdges(childList);bindTabReorder(childList,'.chat-subtab',node=>node.querySelector('[data-chat-subtab]')?.dataset.chatSubtab,(source,target,after)=>reorderVisibleTabs(source,target,after,parent.id));
  bar.querySelectorAll('[data-chat-child-close]').forEach(button=>button.onclick=event=>{event.stopPropagation();const tab=state.tabs.find(item=>item.id===button.dataset.chatChildClose);if(tab)void closeChildTab(tab).catch(error=>toast(error.message));});
  bar.querySelector('.chat-tab-add summary').onclick=event=>{event.preventDefault();bar.querySelector('[data-chat-add="browser"]')?.click();};
  bar.querySelectorAll('[data-chat-add]').forEach(button=>button.onclick=async()=>{bar.querySelector('details').open=false;try{if(button.dataset.chatAdd==='files')return openFileBrowser(parent);if(button.dataset.chatAdd==='new-chat'||button.dataset.chatAdd==='internet')return newWorkspaceChat(parent,button.dataset.chatAdd==='internet');if(button.dataset.chatAdd.startsWith('profile:'))return;else if(button.dataset.chatAdd==='agent-terminal'){if(parent.type!=='run')throw new Error('Agent command output is available on the executing computer; remote chat activity remains in its conversation.');openTab({id:'agent-terminal:'+(parent.runId||parent.id),type:'agent-terminal',runId:parent.runId||parent.id,label:'Agent terminal output',parentId:parent.id});}else if(button.dataset.chatAdd==='browser'){try{await withNewTabInput(async capture=>{const info=await window.desktop.browser({action:'create',parentId:parent.id});capture.bind(info.id);openTab({id:info.id,type:'browser',label:info.title||'New tab',parentId:parent.id,info});});}catch(error){render();throw error;}}else if(button.dataset.chatAdd==='terminal')void openTerminalDialog(parent.id);else{if(parent.hostId)throw Error('Choose local files on the owning computer.');markdownDialog(parent.id);};}catch(error){toast(error.message);}});
}

async function closeTopTab(id){
  const closing=state.tabs.find(item=>item.id===id);if(!closing)return;
  const closingDescriptor=closing.type==='workspace'?null:await descriptorFor(closing,{type:'main'});
  if(closing.type==='workspace'){closing.hidden=true;closing.navigationClosed=true;const selected=state.tabs.find(t=>t.id===state.tab);if(state.tab===id||selected?.parentId===id||previewEnabled(state)&&previewTopId(selected,state)===id)state.tab='overview';saveWorkspace();render();return;}
  if(state.tab===id||state.tabs.find(item=>item.id===state.tab)?.parentId===id){state.tab=tabToLeft(closing);const remembered=selectedChildren.get(state.tab);if(state.tabs.some(item=>item.id===remembered&&item.parentId===state.tab))state.tab=remembered;}
  if(['run','remote-run'].includes(closing.type)){const scope={scope:'chat',id:closing.runId||closing.id,...(closing.hostId?{hostId:closing.hostId}:{})};await contentTabSync.sync(scope);contentTabSync.forget(scope);}
  const children=state.tabs.filter(tab=>tab.parentId===id);
  await releaseChatChildViews(closing);
  const tab=state.tabs.find(item=>item.id===id);if(!tab)return;
  if(tab.type==='browser'&&!tab.restoreFailed)await window.desktop.browser({action:'close',id});
  if(tab.type==='terminal'){const current=await window.desktop.terminal({action:'state'});if(current.sessions.some(session=>session.id===tab.terminal.id))await window.desktop.terminal({action:'close',id:tab.terminal.id});disposeTerminalUi(tab.id);}
  if(closingDescriptor)contentTabSync.close(tabScope(closing),closingDescriptor.id);
  selectedChildren.delete(id);state.tabs=state.tabs.filter(item=>item.id!==id&&item.parentId!==id);if(previewEnabled(state)){for(const view of [closing,...children])releaseChatView(view);}else{localHistories.delete(id);forgetConversation(id);}
  if(state.tab===id||children.some(child=>child.id===state.tab))state.tab='overview';saveWorkspace();render();
}
async function closeCurrentTab(){
  const tab=state.tabs.find(item=>item.id===state.tab);if(!tab)return;
  if(tab.parentId)await closeChildTab(tab);else if(!['overview','omi','life','team','engine','home','standup'].includes(tab.type))await closeTopTab(tab.id);
}
// Closing a tab does not cancel its chat. Keep only bounded presentation descriptors
// for forward swipe; never restore browser control grants or copy page credentials.
const swipeClosedTabs=[];
let tabSwipeBusy=false,tabSwipeInput;
const swipeSelection=()=>previousFeature==='team'?'team:'+teamState().active:state.tab;
async function swipeTab(direction,browserId=null){
  if(tabSwipeBusy||document.querySelector('dialog[open]'))return;
  const team=browserId&&ownsTeamBrowser(browserId)?teamState().tabs.find(tab=>tab.browserId===browserId):null;
  const tab=team||state.tabs.find(tab=>tab.id===(browserId||state.tab));
  if(browserId&&!team&&state.tab!==browserId)return;
  tabSwipeBusy=true;tabSwipeInput?.suppress();
  try {
    const browserInfo=tab?.type==='browser'||team?(await window.desktop.browser({action:'list'})).find(info=>info.id===(team?.browserId||tab.id)):null;
    if(direction==='forward'){
      if(browserInfo?.canGoForward){await window.desktop.browser({action:'forward',id:browserInfo.id});return;}
      const saved=swipeClosedTabs.at(-1);if(!saved)return;
      if(saved.type==='browser'){
        if(saved.parentId&&!state.tabs.some(tab=>tab.id===saved.parentId))throw new Error('Reopen the parent chat before restoring this browser tab.');
        const info=await window.desktop.browser({action:'create',restore:true,profileId:saved.profileId,url:saved.url,history:saved.history,title:saved.label,parentId:saved.parentId,group:saved.group});
        if(saved.group==='team'){selectTeamBrowser(info);navigate('team');}
        else openTab({id:info.id,type:'browser',label:saved.label,parentId:saved.parentId,info});
      }else if(saved.type==='remote-run')openRemoteChat(saved.hostId,saved.runId,saved.label);
      else openTab(saved);
      swipeClosedTabs.pop();
    }else if(tab&&(['run','remote-run','browser'].includes(tab.type)||team)){
      const info=browserInfo;
      if(info?.canGoBack){await window.desktop.browser({action:'back',id:info.id});return;}
      const saved=info?{type:'browser',profileId:info.profileId,label:tab.label||tab.title,url:info.url,history:info.history,parentId:tab.parentId,group:team?'team':'main'}:{...tab};
      if(team)await closeTeamTabById(team.id);else if(tab.parentId)await closeChildTab(tab);else await closeTopTab(tab.id);
      swipeClosedTabs.push(saved);if(swipeClosedTabs.length>12)swipeClosedTabs.shift();
    }
  }catch(error){toast(error.message);}
  finally{tabSwipeBusy=false;void window.desktop?.browser({action:'swipe-reopen',enabled:swipeClosedTabs.length>0}).catch(()=>{});}
}
if(window.desktop)tabSwipeInput=installTabSwipe({selection:swipeSelection,available:direction=>!tabSwipeBusy&&(direction==='forward'?(swipeClosedTabs.length>0||state.tabs.find(tab=>tab.id===state.tab)?.info?.canGoForward):['run','remote-run','browser'].includes(state.tabs.find(tab=>tab.id===state.tab)?.type)),navigate:swipeTab});
function renderTabs() {
  if(!state.data)return; // Early profile/browser callbacks wait for the first owner state.
  const signature=JSON.stringify([browserProfileMenu(),state.tab,state.tabs.filter(tab=>!tab.hidden&&!tab.navigationClosed&&!tab.connectionPaused&&!tab.parentId&&!(previewEnabled(state)&&tab.projectId)&&!['overview','omi','life','team','engine','home','standup'].includes(tab.type)).map(tab=>[tab.id,tab.type,browserLabel(tab),tab.info?.url,browserTabIcon(tab.info,escape),tab.info?.audioPlaying,tab.info?.audioMuted]),state.tabs.find(tab=>tab.id===state.tab)?.parentId]);
  if($('#tabs').dataset.signature===signature)return;
  $('#tabs').dataset.signature=signature;
  const menuWasOpen=$('#tab-add-menu')?.open===true;
  cleanupMainEdges?.();tabScrollLeft=$('#tabs .tab-list')?.scrollLeft??tabScrollLeft;
  const brand=window.desktop?.windowPreview?'<div id="topbar-home" class="window-brand"><span class="brandmark" aria-hidden="true">⤨</span><strong>Proteus</strong></div>':'<button id="topbar-home" aria-label="Proteus Home" title="Proteus Home"><span class="brandmark" aria-hidden="true">⤨</span><strong>Proteus</strong></button>';
  $('#tabs').innerHTML=brand+'<div class="tab-list">'+state.tabs.filter(tab=>!tab.hidden&&!tab.navigationClosed&&!tab.connectionPaused&&!tab.parentId&&!(previewEnabled(state)&&tab.projectId)&&!['overview','omi','life','team','engine','home','standup'].includes(tab.type)).map(tab=>`<div data-tab-container="${escape(tab.id)}" class="tabitem ${state.tab===tab.id||(previewEnabled(state)?previewTopId(state.tabs.find(active=>active.id===state.tab),state):state.tabs.find(active=>active.id===state.tab)?.parentId)===tab.id?'selected':''}"><button data-tab="${escape(tab.id)}" title="${escape(tab.info?.url || tab.label)}">${navigationIcon(tab.type==='workspace'?workspaceIcon:tab.type==='browser' ? browserTabIcon(tab.info,escape) : (['run','remote-run'].includes(tab.type)||(tab.type==='overview'&&state.page==='runs'))?pairedBubbles:tab.type==='team'?'☷':tab.type==='engine'||(tab.type==='overview'&&state.page==='engine')?'⚙':tab.type==='markdown'?'▤':tab.type==='life'?'♡':tab.type==='terminal'?'⌘':'◷')} &nbsp;${escape(browserLabel(tab))}</button>${tab.type==='browser'?browserAudioIcon(tab.info):''}${`<button class="tabclose" aria-label="Close ${escape(tab.label || 'tab')}" data-close="${escape(tab.id)}">×</button>`}</div>`).join('')+'</div><div class="tab-actions"><button id="all-tabs-overview" class="tab-create" aria-label="App tab overview" title="App tab overview">'+tabOverviewIcon+'</button><details id="tab-add-menu" class="tab-add-menu"><summary class="tab-create" aria-label="Add tab" title="Add tab">＋</summary><div class="tab-add-options">'+addTabMenuItems('main')+'</div></details></div>';
  if(linuxWindowChrome.html){$('#tabs').insertAdjacentHTML('afterbegin',linuxWindowChrome.html);linuxWindowChrome.mount($('#tabs'));}
  if(state.data.desktopPreview?.enabled)$('#topbar-home strong').textContent='Proteus Preview';
  if(!window.desktop?.windowPreview)$('#topbar-home').onclick=()=>navigate('home');$('#all-tabs-overview').onclick=()=>void showBrowserOverview('main');
  const list=$('#tabs .tab-list');if(list){list.scrollLeft=tabScrollLeft;revealNewTabs(list,'main','.tabitem',node=>node.dataset.tabContainer);list.onscroll=()=>{tabScrollLeft=list.scrollLeft;};cleanupMainEdges=bindTabEdges(list);bindTabReorder(list,'.tabitem',node=>node.dataset.tabContainer,(source,target,after)=>reorderVisibleTabs(source,target,after));}

  document.querySelectorAll('[data-tab-container]').forEach(item=>item.onclick=event=>{if(event.target.closest('[data-close]'))return;state.tab=restoreTabSelection(state.tabs,item.dataset.tabContainer,selectedChildren,{projects:previewEnabled(state)});const tab=state.tabs.find(t=>t.id===state.tab);if(!tab)return;if(!previewEnabled(state))tab.lastTouchedAt=new Date().toISOString();if(tab.type==='schedule')schedule(tab.id);else if(tab.type==='browser')selectBrowserTab(tab.info);else render();});
  $('#tabs').querySelectorAll('[data-close]').forEach(button=>button.onclick=event=>{event.stopPropagation();void closeTopTab(button.dataset.close).catch(error=>toast(error.message));});

  const mainMenu=$('#tab-add-menu');mainMenu.open=menuWasOpen;mainMenu.querySelector('summary').onclick=event=>{event.preventDefault();$('#browser')?.click();};
  $('#internet-search').onclick=()=>{ $('#tab-add-menu').open=false;void beginChatSetup(null,{chatType:'internet'}); };
  $('#files').onclick=()=>{$('#tab-add-menu').open=false;openFileBrowser();};
  $('#new-chat').onclick=()=>{ $('#tab-add-menu').open=false;chatDialog(); };$('#markdown').onclick=()=>{ $('#tab-add-menu').open=false;markdownDialog(); };
  $('#terminal').onclick=()=>{ $('#tab-add-menu').open=false;openTerminalDialog(); };
  $('#browser').onclick=async()=>{ $('#tab-add-menu').open=false;try{if(!window.desktop)throw new Error('Open the desktop app to use browser tabs.');await withNewTabInput(async capture=>{const info=await window.desktop.browser({action:'create'});capture.bind(info.id);openTab({id:info.id,type:'browser',label:info.title||'New tab',info,pendingOpen:true});});}catch(error){render();toast(error.message);}};
}

let observedBrowserArea;
const browserAreaResize=new ResizeObserver(()=>requestAnimationFrame(browserBounds));
function observeBrowserArea(area){
  if(area===observedBrowserArea)return;
  browserAreaResize.disconnect();observedBrowserArea=area;if(area)browserAreaResize.observe(area);
}
function browserBounds() {
  if(isBrowserOverviewOpen())return;
  if($('#dialog').open){window.desktop?.browser({action:'hide',...browserSurfaceIdentity()}).catch(e=>toast(e.message));return;}
  const area=$('#browser-area'),tab=state.tabs.find(t=>t.id===state.tab);observeBrowserArea(area);
  if(area&&tab?.type==='browser'){
    if(!tab.info?.url||tab.info?.loaded===false)return;
    const r=area.getBoundingClientRect();selectBrowserSurface();window.desktop?.browser({action:'show',id:tab.id,bounds:{x:r.x,y:r.y,width:r.width,height:r.height},...browserSurfaceIdentity()}).catch(e=>toast(e.message));
    return;
  }
  if(previousFeature==='team')teamBrowserBounds();
}
const browserAddressDrafts=new Map();
function updateBrowserControls() {
  const tab=state.tabs.find(t=>t.id===state.tab);if(tab?.type!=='browser'||!$('#browser-url'))return;
  const info=tab.info||{};
  const draft=browserAddressDrafts.get(tab.id);
  if(draft!==undefined)$('#browser-url').value=draft;
  else if(document.activeElement!==$('#browser-url'))$('#browser-url').value=info.url||'';
  $('#browser-back').disabled=!info.canGoBack;$('#browser-forward').disabled=!info.canGoForward;
  $('#browser-reload').textContent=info.loading?'×':'↻';$('#browser-reload').title=info.loading?'Stop loading':'Reload';
  updateAgentAccess($('#browser-share'), info);
}
function newTabAction(blank,action){
  const parent=state.tabs.find(tab=>tab.id===blank.parentId);
  const guard=()=>{if(!state.tabs.includes(blank)||blank.info?.url||parent&&!state.tabs.includes(parent))throw Error('The new tab changed. Open this action again.');};
  const replace=(tab,{topLevel=false}={})=>{guard();state.tabs=state.tabs.filter(item=>item!==blank);void window.desktop.browser({action:'close',id:blank.id}).catch(error=>toast(error.message));openTab({...tab,...(parent&&!topLevel?{parentId:parent.id}:{})});};
  if(action.id==='browser'){$('#browser-home-url')?.focus();return;}
  if(action.id.startsWith('profile:'))return window.desktop.browser({action:'create',parentId:parent?.id,profileId:action.id.slice(8)}).then(info=>replace({id:info.id,type:'browser',label:info.title||'New tab',info}));
  if(action.id==='files')return replace(fileBrowserTab(parent),{topLevel:true});
  if(action.id==='markdown'){if(parent?.hostId)throw Error('Choose local files on the owning computer.');return openMarkdownPicker('open',parent?.id,replace,guard);}
  if(action.id==='terminal')return openTerminalDialog(parent?.id,replace,guard);
  if(action.id==='agent-terminal'){guard();if(parent?.type!=='run')throw Error('Agent output is available on the executing computer.');return replace({id:'agent-terminal:'+(parent.runId||parent.id),type:'agent-terminal',runId:parent.runId||parent.id,label:'Agent terminal output'});}
  if(action.id==='new-chat'){
    return beginChatSetup(blank,parent?{workspaceId:parent.workspaceId,projectId:parent.projectId,hostId:parent.hostId,lockWorkspace:true}:{});
  }
  if(['internet','internet-search'].includes(action.id)){
    return beginChatSetup(blank,{chatType:'internet',...(parent?{workspaceId:parent.workspaceId,projectId:parent.projectId,hostId:parent.hostId,lockWorkspace:true}:{})});
  }
}
function renderBrowser() {
  const tab=state.tabs.find(t=>t.id===state.tab);
  if(tab.restoreFailed){selectBrowserSurface();void window.desktop.browser({action:'hide',...browserSurfaceIdentity()});$('#main').classList.remove('browser-main');$('#main').innerHTML='<div class="heading"><h2></h2></div><p class="banner"></p><button type="button" id="restore-tab-retry">Try again</button>';$('#main h2').textContent=browserLabel(tab);$('#main .banner').textContent='This saved tab could not be restored. It is retained and was not closed. Its address is '+(tab.info?.url||'not available')+'.';$('#restore-tab-retry').onclick=()=>void retryFailedBrowsers();return;}
  if(tab.newChatDraft){selectBrowserSurface();void window.desktop.browser({action:'hide',...browserSurfaceIdentity()});chatSetupTabs.show(tab,surface=>{const guard=async()=>{if(!state.tabs.includes(tab))throw Error('This chat setup tab was closed.');await contentTabSync.sync(tabScope(tab));if(!state.tabs.includes(tab))throw Error('This chat setup tab was closed.');};if(surface.initial.hostId)return openWorkspaceChatDialog(surface.initial.hostId,surface.initial.workspaceId,(id,title,hostId)=>finishChatSetup(tab,{id:'peer:'+hostId+':'+id,type:'remote-run',hostId,runId:id,label:title||'Chat'}),{...surface.initial,surface,beforeStart:guard});if(surface.initial.chatType==='internet')return mountInternetSearch({state,api,escape,toast,refresh,sharedSetupArgs,...surface.initial,beforeStart:guard,surface,open:run=>finishChatSetup(tab,{id:run.id,type:'run',label:run.title})});return chatDialog(created=>finishChatSetup(tab,created),guard,surface.initial,surface);});renderChatSubtabs();return;}
  // render() resets feature classes even when this tab's toolbar stays mounted.
  // Restore the surface layout independently of creating its DOM; otherwise a
  // same-tab redraw publishes the generic padded 60vh bounds to the native view.
  $('#main').classList.add('browser-main');
  const reuseToolbar=$('#browser-form')?.dataset.tabId===tab.id;
  const command=async(action,extra={})=>{try{return await window.desktop.browser({action,id:tab.id,...extra});}catch(error){toast(error.message);}};
  // Loading/history hydration can refresh the same surface while input arrives.
  // Keep the actual address node/listeners mounted so queued input cannot land
  // on a detached field and lose its window-private draft.
  const navigateBrowser=async raw=>{const pendingDraft=browserAddressDrafts.get(tab.id),finish=projectFollower.beginHuman();try{const info=await window.desktop.browser({action:'navigate',id:tab.id,url:browserTarget(raw)});if(browserAddressDrafts.get(tab.id)===pendingDraft)browserAddressDrafts.delete(tab.id);if(state.tabs.includes(tab)){tab.info=info;if(state.tab===tab.id)renderBrowser();}}catch(error){toast(error.message);}finally{finish();}};
  if(!reuseToolbar){
  selectBrowserSurface();
  $('#main').innerHTML='<form class="browserbar" id="browser-form"><button type="button" id="browser-back" aria-label="Back">←</button><button type="button" id="browser-forward" aria-label="Forward">→</button><button type="button" id="browser-reload" aria-label="Reload or stop">↻</button>'+browserAddress('browser','Browser address')+'<button class="browser-go" type="submit" id="browser-go" aria-label="Load address" title="Load address">↵</button><button type="button" id="browser-fill-login" title="Fill login" aria-label="Fill login">⚿</button></form><div id="browser-area" class="browserarea"></div>';
  $('#browser-form').dataset.tabId=tab.id;

  $('#browser-fill-login').onclick=()=>fillBrowserLogin(state.tab);
  $('#browser-fill-login').insertAdjacentHTML('afterend','<button type="button" id="browser-overview" aria-label="Show all browser tabs" title="Tab overview · Ctrl/Cmd+Shift+\\">'+tabOverviewIcon+'</button>');
  $('#browser-overview').onclick=()=>void showBrowserOverview(selectedChatParent()?.id||'main');
  bindBrowserAddressMenu($('#browser-url'),state.tab,{showDialog,toast});
  $('#browser-url').addEventListener('input',event=>{browserAddressDrafts.set(tab.id,event.target.value);});
  $('#browser-url').addEventListener('keydown',event=>{if(event.key==='Escape'){browserAddressDrafts.delete(tab.id);event.target.value=tab.info?.url||'';}});

  $('#browser-form').onsubmit=event=>{event.preventDefault();void navigateBrowser($('#browser-url').value);$('#browser-url').blur();};
  bindDesktopBrowserRecents($('#browser-url'),{api,navigate:navigateBrowser,toast,profileId:tab.info?.profileId||tab.profileId||'default'});
  for (const direction of ['back', 'forward']) {
    const button = $('#browser-' + direction), tabId = state.tab;
    bindBrowserHistoryButton(button, {direction, tabId, group:'main', selectionRevision:browserSurfaceRevision,
      isCurrent:()=>state.tab===tabId,
      command:(action,extra)=>window.desktop.browser({action,id:tabId,...extra}),
      onError:error=>toast(error.message)});
  }
  $('#browser-reload').onclick=()=>command(state.tabs.find(t=>t.id===state.tab)?.info?.loading?'stop':'reload');

  }
  observeBrowserArea($('#browser-area'));
  updateBrowserControls();
  const current=state.tabs.find(t=>t.id===state.tab);
  if(current?.info?.profileLocked){void window.desktop?.browser({action:'hide',...browserSurfaceIdentity()});$('#browser-area').innerHTML='<div class="empty"><p>This browser profile is unavailable. Sign in and refresh profiles in Browser Preferences to resume it.</p></div>';}else if(!current?.info?.url){void window.desktop?.browser({action:'hide',...browserSurfaceIdentity()});void renderBrowserHome($('#browser-area'),{escape,toast,time,api,showDialog,tabId:current.id,profileId:current.info?.profileId||current.profileId||'default',browser:window.desktop.browser,navigate:navigateBrowser,actions:addTabMenuEntries(selectedChatParent()?.type==='workspace'?'workspace':selectedChatParent()?'chat':'main').map(action=>({...action,run:()=>newTabAction(current,action)}))});}
  else if(current.info.loaded===false){void window.desktop?.browser({action:'hide',...browserSurfaceIdentity()});$('#browser-area').innerHTML='<div class="empty browser-unloaded"><p>This tab is unloaded.</p><button id="browser-load">Load tab</button></div>';$('#browser-load').onclick=async()=>{await command('activate');current.info.loaded=true;renderBrowser();};}
  else{$('#browser-area').replaceChildren();requestAnimationFrame(browserBounds);}
  renderChatSubtabs();

}
const lines=value=>value.split('\n').map(s=>s.trim()).filter(Boolean);
const permissionModeNames={ask:'Ask each time',custom:'Saved rules only',trusted:'Trusted workspace',autopilot:'Auto-approve tools'};
const permissionDrafts=new Map();
const displayedMode=context=>context.mode==='trusted'&&!context.readOnlyTools?'custom':context.mode;
function permissionChoices(pending,run) {
  if(previewEnabled(state))return previewApprovalChoices(pending,run);
  const choices=pending.permissionChoices || [];
  return `${run?.trigger==='chat'&&run.permissionContext?`<div class="actions"><button id="pending-chat-autoapprove" ${run.permissionContext.chatMode==='autopilot'?'disabled':''}>Auto-approve this chat and future continuations</button></div><p class="note">This chat only, using existing granted resources. Workspace settings stay unchanged. Mandatory approvals still require a decision.</p>`:''}<p class="note">Approve once applies only to this request. Saved workspace choices remain on this computer until revoked and also affect other chats and schedules with the same configuration.</p><p class="note">${escape(pending.permissionReason || '')}</p>${choices.length?`<div class="permission-options">${choices.map(choice=>`<button data-permission-answer="${escape(choice.value)}" title="${escape(choice.label)}">${escape(choice.value==='always-tool'&&pending.details?.kind==='shell'?'Always allow this exact command':choice.label)}</button>`).join('')}</div><p class="note">Saved approvals apply to this workspace across chats and schedules. Auto-approve tools includes terminal commands and configured tools; terminal commands are not confined to folders. Enterprise-required approvals and questions still pause.</p>`:''}`;
}
function permissionControls(context, ref) {
  if(!context)return '';
  if(ref.runId)return approvalDetails({...context,workspaceMode:permissionDrafts.get(context.id)||context.workspaceMode},{desktopPreview:previewEnabled(state),workspaceName:(localHistories.get(ref.runId)||state.data.runs.find(run=>run.id===ref.runId))?.schedule?.context?.workspaceName}).replace('data-context-id=',`data-permission-ref="${escape(JSON.stringify(ref))}" data-context-id=`);
  return `<div class="permission-control" data-context-id="${escape(context.id)}" data-permission-ref="${escape(JSON.stringify(ref))}"><label>Workspace tool approvals</label><p class="note">Saved on this computer for this and future chats and scheduled runs with the same provider and workspace configuration, until changed or revoked. Chat-only approval survives restart and applies only to this chat and its future continuations.</p><div class="actions"><select aria-label="Tool approval mode" data-permission-mode>${Object.entries(permissionModeNames).map(([mode,name])=>`<option value="${mode}" ${(permissionDrafts.get(context.id)||context.workspaceMode||displayedMode(context))===mode?'selected':''}>${name}</option>`).join('')}</select><button data-save-permissions>Apply permissions</button></div><p class="note">Effective: <strong>${escape(permissionModeNames[displayedMode(context)])}</strong> from ${context.source==='chat'?'this chat':'the workspace'}. Workspace setting: ${escape(permissionModeNames[context.workspaceMode||displayedMode(context)])}. Changing the workspace setting also affects other chats and schedules with this context.</p><p class="note">Trusted workspace allows file reads/writes in its folders, read-only MCP calls, and browser reading/navigation. Other operations use saved rules or ask. Auto-approve tools also allows terminal commands and configured tools; commands can access beyond these folders. Questions and enterprise-required approvals still pause.</p><details><summary>Authorized folders and saved rules</summary><ul>${context.folders.map(folder=>`<li><code>${escape(folder.path)}</code> · ${escape(folder.access)}</li>`).join('') || '<li>No folders trusted yet.</li>'}</ul><pre>${escape(JSON.stringify(context.rules,null,2))}</pre></details>${ref.runId?`<div class="chat-permission-scope"><h3>This chat only</h3><p class="note">${context.chatMode==='autopilot'?'Auto-approve this chat and future continuations is on. It lasts through continuation and restart until revoked or this chat’s permission context changes.':'This chat inherits its workspace setting.'} Auto-approval stays within existing granted resources; it does not grant new filesystem access. Mandatory approvals and sandbox rules still apply.</p><div class="actions"><button data-chat-autoapprove ${context.chatMode==='autopilot'?'disabled':''}>Auto-approve this chat and future continuations</button><button data-chat-inherit ${context.chatMode==='autopilot'?'':'disabled'}>Use workspace setting</button></div></div>`:''}</div>`;
}
function bindPreviewPermissionSidebar(run){
 bindPermissionSidebar(document.querySelector('#main'),{run,request:payload=>api('/api/permissions',payload),reply:(answer,requestId)=>api(`/api/runs/${run.id}/reply`,{answer,requestId}),reload:async()=>{await loadRunView(run.id);await refresh(true);},dialog:showDialog,pick:()=>window.desktop.choosePaths({kind:'folder'}),notify:toast,openWorkspace:async()=>{
  const context=run.permissionContext,workspaceId=run.schedule.context?.workspaceId||context.workspaceId,workspace=state.data.context.workspaces.find(item=>item.id===workspaceId);
  if(!workspace||workspace.deletedAt){toast('The original workspace is unavailable. This chat keeps its saved settings.');return;}
  openWorkspace({...workspace,hostId:'local'},'configuration');
  for(let attempt=0;attempt<40;attempt++){const section=$('[data-config-section="approvals"]');if(section){section.open=true;section.scrollIntoView({block:'nearest'});break;}await new Promise(resolve=>setTimeout(resolve,50));}
 }});
}

function permissionSettings() {
  const saved=state.data.permissions;
  return `<section class="card permissions-settings"><h2>Workspace permissions</h2><p class="note">Authorize once for chats and schedules with the same provider, roots, skills, and MCP configuration. Changes take effect on the next request, including requests waiting now. Adding a root or changing integrations needs a new authorization.</p><div class="filepath">${escape(saved.file)}</div>${state.data.permissionWorkspaces.map(context=>`<div class="permission-workspace"><h3>${escape(context.label)} <span class="pill">${escape(context.provider)}</span></h3><div class="filepath">${context.roots.map(escape).join('<br>')}</div>${permissionControls(context,context.ref)}</div>`).join('')}<h3>Saved authorizations</h3>${saved.workspaces.length?saved.workspaces.map(profile=>`<div class="permission-saved"><span>${escape(profile.label)} · ${escape(permissionModeNames[displayedMode(profile)])}<br><code>${escape(profile.cwd)}</code></span><button class="danger" data-revoke-permissions="${escape(profile.id)}">${previewEnabled(state)?'Reset to workspace defaults':'Revoke'}</button></div>`).join(''):'<p class="note">No saved authorizations.</p>'}</section>`;
}
function bindPermissionControls() {
  const pendingButton=$('#pending-chat-autoapprove');
  if(pendingButton){const run=localHistories.get(state.tabs.find(t=>t.id===state.tab)?.runId||state.tab),pending=run?.pending,context=run?.permissionContext;pendingButton.onclick=async()=>{if(!pending||!context)return;pendingButton.disabled=true;try{await api('/api/permissions',{action:'set-chat-mode',runId:run.id,mode:'autopilot',expectedContextId:context.id,expectedChatRevision:context.chatRevision,expectedRequestId:pending.id});await refresh(true);}catch(error){toast(error.message);}finally{if(pendingButton.isConnected)pendingButton.disabled=false;}};}

  document.querySelectorAll('[data-permission-mode]').forEach(select=>select.onchange=()=>permissionDrafts.set(select.closest('.permission-control').dataset.contextId,select.value));
  document.querySelectorAll('[data-save-permissions]').forEach(button=>button.onclick=async()=>{
    const control=button.closest('.permission-control');
    try {await api('/api/permissions',{action:'set-mode',...JSON.parse(control.dataset.permissionRef),mode:control.querySelector('[data-permission-mode]').value,expectedContextId:control.dataset.contextId,expectedRevision:state.data.permissions.revision});permissionDrafts.delete(control.dataset.contextId);await refresh(true);toast('Permissions saved.');}catch(error){toast(error.message);}
  });
  document.querySelectorAll('[data-chat-autoapprove],[data-chat-inherit]').forEach(button=>button.onclick=async()=>{const control=button.closest('.permission-control'),ref=JSON.parse(control.dataset.permissionRef),run=state.data.runs.find(item=>item.id===ref.runId);if(!run)return;try{await api('/api/permissions',{action:'set-chat-mode',runId:run.id,mode:button.hasAttribute('data-chat-autoapprove')?'autopilot':'inherit',expectedContextId:control.dataset.contextId,expectedChatRevision:run.permissionContext.chatRevision,...(run.pending?.type==='permission'?{expectedRequestId:run.pending.id}:{})});await refresh(true);toast(button.hasAttribute('data-chat-autoapprove')?'Chat-only auto-approval saved.':'Chat now uses its workspace setting.');}catch(error){toast(error.message);}});
  document.querySelectorAll('[data-revoke-permissions]').forEach(button=>button.onclick=async()=>{
    try {await api('/api/permissions',{action:'revoke',id:button.dataset.revokePermissions,expectedRevision:state.data.permissions.revision});await refresh(true);toast(previewEnabled(state)?'Saved override removed. Workspace defaults now apply.':'Authorization revoked. Future tool requests will ask.');}catch(error){toast(error.message);}
  });
}
function renderSettings() {
  const settings=state.data.settings;
  $('#main').innerHTML=`<div class="heading"><div><div class="eyebrow">Configuration</div><h1>${previewEnabled(state)?'App settings':'App Setup'}</h1><p class="muted">Plain JSON settings for new chats and schedules. Existing runs keep their captured configuration.</p></div><button class="primary" id="save-settings">Save settings</button></div><div class="grid"><section class="card"><h2>Workspace</h2><div class="field"><label>Default working directory</label><input id="settings-cwd" value="${escape(settings.workspace.cwd)}"></div><div class="field"><label>Additional repositories / directories · one per line</label><textarea id="settings-roots" rows="5">${escape(settings.workspace.additionalDirectories.join('\n'))}</textarea></div><div class="row"><div><label>Default provider</label><select id="settings-provider"><option value="copilot" ${settings.provider==='copilot'?'selected':''}>Copilot</option><option value="codex" ${settings.provider==='codex'?'selected':''}>Codex</option><option value="claude" ${settings.provider==='claude'?'selected':''}>Claude</option><option value="rehearsal" ${settings.provider==='rehearsal'?'selected':''}>Local rehearsal</option></select></div><div><label>Default model</label>${modelPicker('settings-model',settings.model,settings.provider)}<button class="subtle" id="settings-model-refresh">↻ Refresh models</button></div></div>${modelControls('settings-model',settings)}<div class="field"><label>Time zone</label><input id="settings-timezone" value="${escape(settings.timezone)}"></div><div class="field"><label>Skill directories · one per line</label><textarea id="settings-skills" rows="3">${escape(settings.skillDirectories.join('\n'))}</textarea></div><details><summary>Default MCP servers · JSON</summary><p class="note">Use command arguments and environment references. Keep secrets in provider authentication or the system keychain.</p><textarea id="settings-mcp" rows="10">${escape(JSON.stringify(settings.mcpServers,null,2))}</textarea></details></section><section class="card"><h2>Where your files live</h2><p class="note">New app schedules:</p><div class="filepath">${escape(state.data.home)}/schedules/</div><p class="note">Run history:</p><div class="filepath">${escape(state.data.home)}/runs/</div><p class="note">Settings:</p><div class="filepath">${escape(settings.file)}</div><button id="open-settings">Open settings file ↗</button>${previewEnabled(state)?'<button id="settings-data-folder">Open data folder ↗</button>':''}<hr class="divider"><h3>Repository-owned schedules</h3><p class="note">An imported organization workflows schedule remains owned by its organization workflows automation manifest. Change that source with AI, export it, then refresh the local copy. The schedule editor shows both locations.</p><h3>Workspace context</h3><p class="note">Copilot receives all listed roots and can read their instructions and files. The VS Code companion also sends the active file, selection location, and open file paths. VS Code’s code index, extension tools, and existing chat history are not copied.</p><h3>Copilot session storage</h3><p class="note">Choose an existing folder for new Copilot sessions. Existing sessions keep their original location. This also holds Copilot configuration; changing it can require sign-in.</p><input id="settings-copilot-home" placeholder="Provider default (~/.copilot)" value="${escape(settings.copilotDataDirectory || '')}"><h3>Data directory</h3><p class="note">Set PROTEUS_HOME before launching to use another data directory. Moving live run history is not performed by this settings screen.</p></section></div>`;
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
  $('#settings-data-folder')?.addEventListener('click',()=>window.desktop?window.desktop.openPath(state.data.home).catch(error=>toast(error.message)):toast(state.data.home));
  $('#open-settings').onclick=()=>window.desktop?window.desktop.openPath(settings.file).catch(e=>toast(e.message)):toast(settings.file);
  $('#main').insertAdjacentHTML('beforeend',permissionSettings());
  bindPermissionControls();
}
async function copyChatLink(row){await copyContextText(chatLink({...row,hostId:row.hostId&&row.hostId!=='local'?row.hostId:state.data?.hostId}));toast('Chat link copied.');}
let pendingChatLink=null,chatLinksReady=false;
async function openChatLink(value){
 const target=typeof value==='string'?parseChatLink(value):parseChatLink(value?.url||'');if(!target)throw Error('This chat link is invalid.');
 if(!chatLinksReady){pendingChatLink=target;return;}
 if(target.hostId===state.data.hostId){const run=await api('/api/chat-view?id='+encodeURIComponent(target.id));runTab(run);}
 else{const peers=await loadPeers();if(!peers.some(peer=>peer.hostId===target.hostId&&!peer.paused))throw Error('Pair and connect this chat’s owning computer before opening its link.');openRemoteChat(target.hostId,target.id);}
}
window.desktop?.onOpenChatLink?.(value=>void openChatLink(value).catch(error=>toast(error.message)));
document.addEventListener('proteus:open-chat-link',event=>void openChatLink(event.detail).catch(error=>toast(error.message)));
async function closeTabSet(tabs){for(const tab of tabs){if(!state.tabs.some(item=>item.id===tab.id))continue;if(tab.parentId)await closeChildTab(tab);else await closeTopTab(tab.id);}}
function insertionAnchor(tab){return state.tabs.includes(tab)&&(!tab.parentId||state.tabs.some(t=>t.id===tab.parentId));}
async function addAdjacent(tab,after,event){
 const parentId=tab.parentId||null;
 await withNewTabInput(async capture=>{const info=await window.desktop.browser({action:'create',parentId,profileId:tab.info?.profileId||tab.profileId||'default'});capture.bind(info.id);if(!insertionAnchor(tab)){await window.desktop.browser({action:'close',id:info.id});throw Error('The insertion tab was closed.');}state.tabs=state.tabs.filter(item=>item.id!==info.id);const index=state.tabs.indexOf(tab),created={id:info.id,type:'browser',pendingOpen:true,label:'New tab',info,...(parentId?{parentId}:{})};state.tabs.splice(index+(after?1:0),0,created);openTab(created);});
}
async function findManagedTab(match,filter={}){
  let offset=0;
  for(;;){
    const page=await api('/api/tabs/manage',{action:'list',...filter,offset,limit:200});
    const tab=page.tabs.find(match);if(tab)return tab;
    if(page.nextOffset===null)return null;
    if(!Number.isSafeInteger(page.nextOffset)||page.nextOffset<=offset)throw Error('Tab inventory changed. Refresh and retry.');
    offset=page.nextOffset;
  }
}
let transferringTab=false;
async function duplicateBrowserTab(tab){
 if(transferringTab)throw Error('Wait for the current tab operation.');transferringTab=true;
 try{const info=await window.desktop.browser({action:'duplicate',id:tab.id});
 if(!state.tabs.includes(tab)){await window.desktop.browser({action:'close',id:info.id});throw Error('The source tab was closed.');}
 const copy={id:info.id,type:'browser',info,label:tab.label,customTitle:tab.customTitle,parentId:tab.parentId,openedAt:new Date().toISOString()};
 state.tabs.splice(state.tabs.indexOf(tab)+1,0,copy);saveWorkspace();
 if(info.loaded)selectBrowserTab(info);else{render();toast('Tab duplicated with its history. Select it to load.');}
 }finally{transferringTab=false;}
}
// Sending a tab elsewhere keeps the user where they are; users often move several
// tabs in a row. Only an active tab is replaced, by its neighbour in this scope.
function stayAfterMove(tab){
  const active=state.tabs.find(item=>item.id===state.tab);if(!active||(active!==tab&&active.parentId!==tab.id))return;
  const next=neighborAfterRemoval(state.tabs,tab);state.tab=next;
  if(tab.parentId){if(next!==tab.parentId)selectedChildren.set(tab.parentId,next);else selectedChildren.delete(tab.parentId);}
}
function transferTabDialog(tab,copy=false,teamSource=null){
  if(state.data.desktopPreview?.enabled&&!state.data.workspaceProjects&&!copy&&!['run','remote-run'].includes(tab.type)&&state.tabs.find(parent=>parent.id===tab.parentId)?.projectId){toast('Moving project resources between locations is not available in this desktop preview. Their existing sessions and access stay in place.');return;}
  if(!copy&&['run','remote-run'].includes(tab.type))return void moveChatToWorkspace({...tab,chatId:tab.runId||tab.id,local:tab.type==='run'}).catch(error=>toast(error.message));
  if(copy&&tab.type!=='browser')throw new Error('Only browser tabs can be copied. Move a terminal or viewer to preserve its existing session.');
  const groups=destinationSections(state.data.workspaceProjects?state.tabs:previewEnabled(state)?state.tabs.filter(item=>!item.projectId):state.tabs,{runs:state.data.runs,catalog:workspaceProjectsCatalog(state),workspaces:state.data.context.workspaces}),destinations=groups.flatMap(group=>group.tabs);
  showMoveMenu({showDialog,escape,groups,current:copy?null:teamSource?'team':tab.parentId||'main',title:copy?'Copy tab':'Move tab',button:copy?'Copy tab':'Move tab',note:copy?'The copy is an independent unloaded browser page.':'Choose a destination. The existing session, history and access stay with this tab.',submit:async target=>{
    if(teamSource?!teamState().tabs.includes(teamSource):!state.tabs.includes(tab))throw new Error('The source tab was closed.');let parent=destinations.find(t=>t.id===target);
    if(parent?.projectId&&!parent.hostId&&!state.tabs.includes(parent)){const fresh=await api('/api/workspace-projects'),project=fresh.projects.find(project=>project.id===parent.projectId);if(!project)throw Error('The destination project changed. Refresh before moving.');parent=ensurePreviewProject(project);}
    if(!['main','team'].includes(target)&&(!parent||!state.tabs.includes(parent)))throw new Error('The destination chat was closed.');
    if(tab.type!=='browser'||!copy){if(['run','remote-run'].includes(tab.type)){if(parent?.type!=='workspace')throw new Error('Choose a workspace for a chat.');await moveChatToWorkspace({...tab,chatId:tab.runId||tab.id,local:tab.type==='run'});return;}const actual=teamSource||tab;
      if(tab.type==='remote-document'||tab.type==='agent-terminal'){const source=await findManagedTab(row=>row.runtimeId===actual.id&&(!row.windowId||row.windowId===desktopWindowId),{scope:'shell'});if(!source)throw new Error('Refresh this tab’s inventory before moving it.');const destination=['main','team'].includes(target)?{scope:target,id:target,expectedRevision:0}:{scope:'shell',id:parent.id,expectedRevision:source.revision};await api('/api/tabs/manage',{action:'move',scope:'shell',id:'shell',tabId:source.id,expectedRevision:source.revision,destination});stayAfterMove(tab);saveWorkspace();render();return;}if(tab.hostId||parent?.hostId)throw new Error('Move this host-owned resource using its owning computer’s Tabs page.');
      await saveWorkspace();await contentTabSync.all();
      const descriptor=await descriptorFor(actual,teamSource?{type:'team'}:state.tabs.find(item=>item.id===tab.parentId)||{type:'main'}),source=await findManagedTab(item=>item.id===descriptor?.id);
      if(!source)throw new Error('The tab has not synchronized yet. Refresh and retry.');
      const destination=target==='team'?{scope:'team',id:windowScopeId('team')}:target==='main'?{scope:'main',id:windowScopeId('main')}:parent.type==='workspace'?{scope:parent.projectId?'project':'workspace',id:parent.projectId||parent.workspaceId}:{scope:'chat',id:parent.runId||parent.id};
      const snapshot=await api('/api/content-tabs',{action:'get',...destination});
      await api('/api/tabs/manage',{action:'move',scope:source.scope,id:source.scopeId,tabId:source.id,expectedRevision:source.revision,destination:{...destination,expectedRevision:snapshot.revision}});if(!teamSource){stayAfterMove(tab);saveWorkspace();render();}return;}

    if(tab.info?.agentControlling)throw new Error('Wait for the agent’s browser operation to finish before transferring this tab.');
    const originalIndex=state.tabs.indexOf(tab);let info;if(!copy&&!teamSource)stayAfterMove(tab);
    transferringTab=true;
    try{
      if(copy)info=await window.desktop.browser({action:'create',profileId:tab.info?.profileId,restore:true,unloaded:true,url:tab.info?.url||'',history:tab.info?.history,title:tab.customTitle||tab.label,group:target==='team'?'team':'main',parentId:parent?.id});
      else info=await window.desktop.browser({action:'transfer',id:tab.id,group:target==='team'?'team':'main',parentId:parent?.id});
      if(parent&&!state.tabs.includes(parent)){if(copy)await window.desktop.browser({action:'close',id:info.id});else await window.desktop.browser({action:'transfer',id:info.id,group:teamSource?'team':'main',parentId:tab.parentId||null});throw new Error('The destination chat was closed. The source tab was kept.');}
      if(parent?.type==='workspace'){parent.hidden=false;parent.navigationClosed=false;}
      const next={...tab,id:info.id,contentTabId:copy?info.id:tab.contentTabId,info};delete next.parentId;if(parent)next.parentId=parent.id;
      if(!copy){if(teamSource)forgetTeamBrowser(tab.id);else state.tabs=state.tabs.filter(item=>item!==tab);if(tab.parentId)selectedChildren.delete(tab.parentId);}
      if(target==='team')selectTeamBrowser(info);else state.tabs.push(next);
      saveWorkspace();render();
    }finally{transferringTab=false;}
  }});
}
async function moveManagedWorkspaceTab(tab,target,parent){
 if(!state.tabs.includes(tab))throw Error('The source tab was closed.');
 if(parent?.projectId&&!parent.hostId&&!state.tabs.includes(parent)){
  const catalog=await api('/api/workspace-projects'),project=catalog.projects.find(item=>item.id===parent.projectId&&item.workspaceId===parent.workspaceId);
  if(!project)throw Error('The destination project changed. Refresh before moving.');parent=ensurePreviewProject(project);
 }
 if(!['main','team'].includes(target)&&(!parent||!state.tabs.includes(parent)))throw Error('The destination was closed.');
 if(['run','remote-run'].includes(tab.type)){
  if(tab.hostId)throw Error('Move this chat from its owning computer’s Tabs page.');
  if(parent?.type!=='workspace')throw Error('Choose a project or workspace for chats.');
  const catalog=await api('/api/workspace-projects'),run=await api('/api/chat-view?id='+encodeURIComponent(tab.runId||tab.id));
  await api('/api/tabs/manage',{action:'move-chat',chatId:run.id,workspaceId:parent.workspaceId,projectId:parent.projectId||catalog.defaultProjectIds?.[parent.workspaceId],expectedProjectRevision:catalog.revision,expectedUpdatedAt:run.updatedAt});return;
 }
 if(tab.type==='remote-document'||tab.type==='agent-terminal'){
  const source=await findManagedTab(row=>row.runtimeId===tab.id&&(!row.windowId||row.windowId===desktopWindowId),{scope:'shell'});if(!source)throw Error('Refresh the tab inventory before moving.');
  const destination=['main','team'].includes(target)?{scope:target,id:target,expectedRevision:0}:{scope:'shell',id:parent.id,expectedRevision:source.revision};
  await api('/api/tabs/manage',{action:'move',scope:'shell',id:'shell',tabId:source.id,expectedRevision:source.revision,destination});return;
 }
 if(tab.hostId||parent?.hostId)throw Error('Move this resource from its owning computer’s Tabs page.');
 await saveWorkspace();await syncTabScope(tab);
 const descriptor=await descriptorFor(tab,state.tabs.find(item=>item.id===tab.parentId)||{type:'main'}),source=await findManagedTab(item=>item.id===descriptor?.id);
 if(!source)throw Error('The tab has not synchronized yet. Refresh and retry.');
 const destination=target==='team'?{scope:'team',id:windowScopeId('team')}:target==='main'?{scope:'main',id:windowScopeId('main')}:parent.type==='workspace'?{scope:parent.projectId?'project':'workspace',id:parent.projectId||parent.workspaceId}:{scope:'chat',id:parent.runId||parent.id};
 const snapshot=await api('/api/content-tabs',{action:'get',...destination});
 await api('/api/tabs/manage',{action:'move',scope:source.scope,id:source.scopeId,tabId:source.id,expectedRevision:source.revision,destination:{...destination,expectedRevision:snapshot.revision}});
}
async function manageWorkspaceTabs(action,rows){
 const ids=[...new Set(rows.map(row=>row.id))];
 if(action==='close'&&ids.some(id=>state.tabs.find(tab=>tab.id===id)?.type==='terminal')&&!window.confirm('Close the selected tabs? Persistent tmux work remains available; ordinary shell processes stop.'))return {cancelled:true};
 const perform=async(target,parent)=>{
  const completed=[],failures=[];
  for(const id of ids){
   try{
    const tab=state.tabs.find(item=>item.id===id);if(!tab)throw Error('The tab was closed or moved. Refresh the inventory.');
    if(action==='move')await moveManagedWorkspaceTab(tab,target,parent);
    else if(action==='close'){if(tab.parentId)await closeChildTab(tab);else await closeTopTab(id);}
    else await manageWorkspaceTab(action,id);
    completed.push(id);
   }catch(error){failures.push({id,error:error.message});}
  }
  await refresh(true);return {completed,failures};
 };
 if(action!=='move')return perform();
 const groups=destinationSections(state.tabs,{runs:state.data.runs,catalog:workspaceProjectsCatalog(state),workspaces:state.data.context.workspaces}),destinations=groups.flatMap(group=>group.tabs);
 return new Promise(resolve=>{
  let settled=false;const finish=result=>{if(!settled){settled=true;resolve(result);}};
  const sourceParents=[...new Set(ids.map(id=>state.tabs.find(tab=>tab.id===id)?.parentId||'main'))];
  showMoveMenu({showDialog,escape,groups,current:sourceParents.length===1?sourceParents[0]:null,id:'bulk-tab-destination',title:'Move '+ids.length+' tabs',button:'Move tabs',submit:async target=>{
   const button=$('#dialog-submit');button.disabled=true;
   try{finish(await perform(target,destinations.find(tab=>tab.id===target)));}finally{button.disabled=false;}
  }});
  $('#dialog').addEventListener('close',()=>finish({cancelled:true}),{once:true});
 });
}
async function syncTabScope(tab){
 const parent=state.tabs.find(item=>item.id===tab.parentId),team=teamState().tabs.includes(tab);
 const scope=team?{scope:'team',id:windowScopeId('team')}:parent?.projectId?{scope:'project',id:parent.projectId}:parent?.type==='workspace'?{scope:'workspace',id:parent.workspaceId}:parent?{scope:'chat',id:parent.runId||parent.id}:{scope:'main',id:windowScopeId('main')};
 if(parent?.hostId)scope.hostId=parent.hostId;await contentTabSync.sync(scope);
}
async function manageWorkspaceTab(action,id,placement){const tab=state.tabs.find(tab=>tab.id===id);if(!tab)throw new Error('Tab is no longer open.');if(action==='open'){if(tab.hidden||tab.info?.hidden)await setTabVisibility(tab,false);if(tab.type==='browser')return selectBrowserTab(tab.info);return openTab({...tab,hidden:false});}if(action==='reorder'){
 if(!previewEnabled(state))throw new Error('Drag reordering is unavailable for this host.');
 if(!workspaceReady||workspaceRestoring||workspaceClosing)throw new Error('The desktop session is not ready to save tab order. Try again shortly.');
 state.tabs=reorderWorkspaceTabSiblings(state.tabs,{id,...placement});
 const saved=await saveWorkspace();if(saved?.failed)throw new Error('Could not save tab order: '+saved.error);
 renderTabs();renderChatSubtabs();return;
}if(action==='move')return transferTabDialog(tab);if(action==='close'){if(tab.type==='terminal'&&!window.confirm('Close this terminal tab? Persistent tmux work remains available; ordinary shell processes stop.'))return;return closeChildTab(tab);}if(['hide','restore'].includes(action)){
 if(!tab.hostId&&!['remote-document','agent-terminal'].includes(tab.type)){
  await saveWorkspace();await syncTabScope(tab);const descriptor=await descriptorFor(tab,state.tabs.find(item=>item.id===tab.parentId)||{type:'main'}),source=await findManagedTab(row=>row.id===descriptor?.id);if(!source)throw Error('Refresh this tab’s owner inventory before changing visibility.');
  await api('/api/tabs/manage',{action,scope:source.scope,id:source.scopeId,tabId:source.id,expectedRevision:source.revision});
 }else await setTabVisibility(tab,action==='hide');
}else if(['up','down'].includes(action)){const siblings=state.tabs.filter(item=>item.parentId===tab.parentId),index=siblings.indexOf(tab),other=siblings[index+(action==='up'?-1:1)];if(other){const a=state.tabs.indexOf(tab),b=state.tabs.indexOf(other);[state.tabs[a],state.tabs[b]]=[state.tabs[b],state.tabs[a]];}}saveWorkspace();renderTabs();renderChatSubtabs();}
function selectedText(){return window.getSelection()?.toString()||'';}
function selectContents(node){const range=document.createRange();range.selectNodeContents(node);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);}
async function openContextLink(href,external=false,origin={}){if(parseChatLink(href))return openChatLink(href);const url=new URL(href,location.href);if(!['https:','http:'].includes(url.protocol))throw new Error('Only HTTP and HTTPS links can open as browser tabs.');if(external){await window.desktop.openLink(url.href);return;}const {parentId,afterId,group,profileId}=origin;const info=await window.desktop.browser({action:'create',url:url.href,parentId,group,profileId});if(group==='team'){selectTeamBrowser(info,afterId);openFeatureTab('team');}else openTab({id:info.id,type:'browser',label:info.title||url.host,info,...(parentId?{parentId}:{})},afterId);}
document.addEventListener('dblclick',event=>{
 const strip=event.target.closest('#tabs .tab-list,#chat-subtabs .chat-subtab-list');
 if(event.button!==0||!strip||event.target!==strip)return;event.preventDefault();event.stopPropagation();
 (strip.closest('#chat-subtabs')?.querySelector('[data-chat-add="browser"]')||document.querySelector('#tab-add-menu #browser'))?.click();
});
document.addEventListener('contextmenu',event=>{
  if(event.defaultPrevented||event.target.closest('#chat-context-menu,.proteus-context-menu'))return;
  const target=event.target,selection=selectedText();
  const tabNode=target.closest('[data-tab-container],.chat-subtab');
  if(tabNode){const id=tabNode.dataset.tabContainer||tabNode.querySelector('[data-chat-subtab]')?.dataset.chatSubtab,tab=state.tabs.find(item=>item.id===id);if(!tab)return;const siblings=tab.parentId?state.tabs.filter(item=>item.parentId===tab.parentId):state.tabs.filter(item=>!item.parentId&&!['overview','omi','life','team','engine','home','standup'].includes(item.type));const index=siblings.findIndex(item=>item.id===id);const items=[{id:'add-left',label:'Add tab to left'},{id:'add-right',label:'Add tab to right'},{id:'move-tab',label:['run','remote-run'].includes(tab.type)?'Move chat to workspace…':'Send tab to workspace / chat / Team Tools…',enabled:['run','remote-run','browser','terminal','markdown','remote-document','agent-terminal'].includes(tab.type)},{id:'copy-tab',label:'Send a tab copy to workspace / chat / Team Tools…',enabled:tab.type==='browser'},...(tab.parentId?[{id:'rename-tab',label:'Rename tab…'}]:[]),{id:'close',label:'Close tab'},{id:'close-others',label:'Close other tabs',enabled:siblings.length>1},{id:'close-right',label:'Close tabs to the right',enabled:index<siblings.length-1}];if(['run','remote-run'].includes(tab.type))items.unshift({id:'copy-chat-link',label:'Copy chat link'},{id:'rename',label:'Rename chat…'},...(!tab.parentId?[{id:'send-workspace',label:'Show in assigned workspace'}]:[]));if(tab.type==='browser')items.unshift({id:'duplicate',label:'Duplicate tab'},{id:'mute',label:tab.info?.audioMuted?'Unmute tab':'Mute tab'});if(tab.type==='browser')items.push({id:'copy-tab-id',label:'Copy tab ID'},{id:'persist',label:tab.info?.persist?'Do not persist tab':'Persist tab'},{id:'unload',label:'Unload browser tab'},{id:'hide',label:'Hide browser tab'});
    void showContextMenu(event,items,toast).then(async choice=>{if(choice==='copy-tab-id'){await copyContextText(id);toast('Browser tab ID copied.');}else if(choice==='mute'){tab.info=await window.desktop.browser({action:'mute',id,muted:!tab.info?.audioMuted});saveWorkspace();}else if(choice==='duplicate')await duplicateBrowserTab(tab);else if(choice==='copy-chat-link')await copyChatLink(tab);else if(choice==='send-workspace')await sendChatToWorkspace({...tab,chatId:tab.runId||tab.id,local:tab.type==='run'});else if(choice==='add-left'||choice==='add-right')await addAdjacent(tab,choice==='add-right',event);else if(choice==='move-tab'||choice==='copy-tab')transferTabDialog(tab,choice==='copy-tab');else if(choice==='rename')renameChat({id:tab.id,chatId:tab.runId||tab.id,title:tab.chatTitle||tab.label,titleRevision:tab.titleRevision||state.data.runs.find(run=>run.id===(tab.runId||tab.id))?.titleRevision,hostId:tab.hostId,local:tab.type==='run'});else if(choice==='rename-tab')renameContentTab(tab);else if(choice==='close')await closeTabSet([tab]);else if(choice==='close-others')await closeTabSet(siblings.filter(item=>item.id!==id));else if(choice==='close-right')await closeTabSet(siblings.slice(index+1));else if(choice==='persist'){tab.info=await window.desktop.browser({action:'persist',id,enabled:!tab.info?.persist});saveWorkspace();}else if(choice==='hide'){await manageWorkspaceTab('hide',tab.id);render();}else if(choice==='unload'){await window.desktop.browser({action:'unload',id});tab.info.loaded=false;if(state.tab===id)renderBrowser();}}).catch(error=>toast(error.message));return;
  }
  if(target.closest('[data-chat-index],.terminal-canvas,#browser-url,#team-browser-url'))return;
  if(target.closest('#chat-rename,#peer-chat-rename,#peer-run-title,.chat-title-line h1')){const tab=state.tabs.find(item=>item.id===state.tab);if(tab&&['run','remote-run'].includes(tab.type)){void showContextMenu(event,[{id:'rename',label:'Rename chat…'}],toast).then(choice=>{if(choice==='rename')renameChat({id:tab.id,chatId:tab.runId||tab.id,title:tab.chatTitle||tab.label,titleRevision:tab.titleRevision||state.data.runs.find(run=>run.id===(tab.runId||tab.id))?.titleRevision,hostId:tab.hostId,local:tab.type==='run'});});return;}}
  const editable=target.closest('input,textarea,[contenteditable=true]');if(editable){const start=editable.selectionStart,end=editable.selectionEnd,value=editable.value||'',picked=Number.isInteger(start)?value.slice(start,end):selection;const items=[{id:'undo',label:'Undo'},{id:'redo',label:'Redo'},{id:'cut',label:'Cut',enabled:!!picked},{id:'copy',label:'Copy',enabled:!!picked},{id:'paste',label:'Paste'},{id:'select-all',label:'Select All'}];void showContextMenu(event,items,toast).then(async choice=>{if(!choice)return;editable.focus({preventScroll:true});if(Number.isInteger(start))editable.setSelectionRange(start,end);if(choice==='copy')await copyContextText(picked);else if(choice==='cut'){await copyContextText(picked);editable.setRangeText('',start,end,'start');editable.dispatchEvent(new Event('input',{bubbles:true}));}else if(choice==='paste'){const text=await navigator.clipboard.readText();if(Number.isInteger(start))editable.setRangeText(text,start,end,'end');else document.execCommand('insertText',false,text);editable.dispatchEvent(new Event('input',{bubbles:true}));}else if(choice==='select-all')editable.select?.();else document.execCommand(choice);}).catch(error=>toast(error.message));return;}
  const link=target.closest('a[href]');if(link){
    event.preventDefault();
    const href=link.dataset.link||link.href,team=target.closest('#team-content')?teamState():null,source=team?team.tabs.find(tab=>tab.id===team.active):state.tabs.find(tab=>tab.id===state.tab),origin={parentId:team?null:selectedChatParent()?.id||null,afterId:team?team.active:state.tab,group:team?'team':'main',profileId:source?.info?.profileId||source?.profileId};
    void (async()=>{
      const profiles=window.desktop?.browser?(await api('/api/browser-profiles')).items||[]:[];
      // Match the native page menu: one + entry per profile, Default first.
      const ordered=profiles.length?[...profiles.filter(profile=>profile.id==='default'),...profiles.filter(profile=>profile.id!=='default')]:[{id:'default',name:'Default'}];
      const items=[...ordered.map((profile,index)=>({id:'add-profile-'+index,label:'Open Link in New '+(profile.name||'Default')+' Browser Tab'})),{id:'open-unloaded',label:'Open Link in Unloaded Tab'},{id:'open-external',label:'Open Link in Default Browser'},{id:'copy-link',label:'Copy Link'}];
      if(selection)items.unshift({id:'copy-selection',label:'Copy Selection'});
      const choice=await showContextMenu(event,items,toast);
      if(choice==='copy-selection')await copyContextText(selection);
      else if(choice==='copy-link')await copyContextText(href);
      else if(choice?.startsWith('add-profile-')){const profile=ordered[Number(choice.slice('add-profile-'.length))];if(profile)await openContextLink(href,false,{...origin,profileId:profile.id});}
      else if(choice==='open-unloaded'){await window.desktop.browser({action:'create-unloaded-link',url:href,title:(link.textContent||link.getAttribute('title')||'').trim().slice(0,200),...origin});toast('Link added as a hidden, unloaded tab.');}
      else if(choice==='open-external')await openContextLink(href,true,origin);
    })().catch(error=>toast(error.message));return;
  }
  const message=target.closest('.message');if(message){const markdown=message.messageMarkdown||message.querySelector('.text')?.textContent||'',code=target.closest('pre code,pre')?.textContent;const items=selection?[{id:'copy-selection',label:'Copy selection'}]:[{id:'copy-message',label:'Copy message'},{id:'copy-markdown',label:'Copy as Markdown'}];if(code)items.push({id:'copy-code',label:'Copy code'});if(message.querySelector('[data-message-action="speak"]'))items.push({id:'read-aloud',label:'Read Aloud'});void showContextMenu(event,items,toast).then(async choice=>{if(choice==='copy-selection')await copyContextText(selection);else if(choice==='copy-message')await copyContextText(message.querySelector('.text')?.innerText||markdown);else if(choice==='copy-markdown')await copyContextText(markdown);else if(choice==='copy-code')await copyContextText(code);else if(choice==='read-aloud')message.querySelector('[data-message-action="speak"]')?.dispatchEvent(new CustomEvent('click',{detail:{selectedText:selection}}));}).catch(error=>toast(error.message));return;}
  const area=target.closest('.markdown-preview,.home-document,.detail-facts,.tool-content,pre,.resource-row,.chat-details,#team-content');if(area){const items=[selection?{id:'copy-selection',label:'Copy selection'}:{id:'copy-value',label:'Copy value or entry'},{id:'select-all',label:'Select All in this area'}];void showContextMenu(event,items,toast).then(async choice=>{if(choice==='copy-selection')await copyContextText(selection);else if(choice==='copy-value')await copyContextText(target.closest('dd,pre,.resource-row')?.textContent||area.textContent);else if(choice==='select-all')selectContents(area);}).catch(error=>toast(error.message));}
},true);
let interactionSave;
for(const type of ['pointerdown','keydown','wheel'])document.addEventListener(type,event=>{
 if(previewEnabled(state)||!event.isTrusted||!document.querySelector('#main')?.contains(event.target))return;
 const tab=document.querySelector('#team-content')?teamState().tabs.find(tab=>tab.id===teamState().active):state.tabs.find(tab=>tab.id===state.tab);
 if(!tab||tab.type==='browser'||Date.now()-(Date.parse(tab.lastTouchedAt)||0)<1000)return;
 tab.lastTouchedAt=new Date().toISOString();const parent=state.tabs.find(item=>item.id===tab.parentId);if(parent)parent.lastTouchedAt=tab.lastTouchedAt;
 clearTimeout(interactionSave);interactionSave=setTimeout(saveWorkspace,250);
},{capture:true,passive:true});
window.desktop?.onShutdown?.(()=>{stopMessageSpeech();workspaceClosing=true;liveEvents.close();clearInterval(refreshInterval);clearInterval(usageInterval);clearInterval(attentionInterval);clearTimeout(liveRefreshTimer);clearTimeout(browserActivitySaveTimer);clearTimeout(contentSyncTimer);});
window.desktop?.onDocumentOpened?.(async value=>{
 const run=state.data.runs.find(r=>r.id===value.runId);if(!run)return;
 const originalPlacement=value.placement||{scope:'chat',id:run.id,parentId:run.id};
 const placement=previewEnabled(state)?remapPreviewBrowserPlacement(originalPlacement,workspaceProjectsCatalog(state)):originalPlacement;
 let parent=state.tabs.find(tab=>tab.id===placement.parentId);
 if(!parent&&previewEnabled(state)&&placement.projectId)parent=ensurePreviewProject(previewProjects().find(project=>project.id===placement.projectId));
 if(!parent){parent=placement.scope==='workspace'?{id:placement.parentId,type:'workspace',workspaceId:placement.id,label:state.data.context.workspaces.find(item=>item.id===placement.id)?.name||'Workspace'}:{id:placement.parentId,type:'run',runId:run.id,label:run.title};state.tabs.push(parent);}
 const existing=state.tabs.find(tab=>tab.contentTabId==='document:'+value.documentId);
 openTab({...(existing||{}),id:existing?.id||'document-view:'+value.documentId,contentTabId:'document:'+value.documentId,type:'markdown',parentId:parent.id,associationChatId:run.id,label:existing?.customTitle||value.document.file.split('/').pop(),markdown:value.document},placement.afterId||null);
});
let browserContentSignature='';
window.desktop?.onBrowserActivity?.(items=>{
  if(workspaceRestoring||workspaceClosing)return;
  for(const info of items){const tab=state.tabs.find(tab=>tab.id===info.id);if(tab?.type==='browser'){Object.assign(tab.info||={}, {lastTouchedAt:info.lastTouchedAt,lastActivityAt:info.lastActivityAt});tab.lastTouchedAt=info.lastTouchedAt;tab.lastActivityAt=info.lastActivityAt;}const team=teamState().tabs.find(tab=>tab.browserId===info.id);if(team){team.lastTouchedAt=info.lastTouchedAt;team.lastActivityAt=info.lastActivityAt;}}
  if(!browserActivitySaveTimer)browserActivitySaveTimer=setTimeout(()=>{browserActivitySaveTimer=null;saveWorkspace();},15000);
});
window.desktop?.onBrowserState(infos=>{
  if(workspaceRestoring||workspaceClosing||transferringTab)return;
  // Activity timestamps remain fresh locally, but do not rewrite full saved
  // histories and remote descriptors every second of reading or scrolling.
  const signature=JSON.stringify(infos.map(info=>[info.id,info.parentId,info.destination,info.group,info.hidden,info.profileId,info.persist,info.audioMuted,info.url,info.title,info.favicon,info.associationChatId,info.loaded,info.privateLocal,info.history?.revision??info.history,info.history?.currentEntryId]));
  const contentChanged=signature!==browserContentSignature;browserContentSignature=signature;
  // Native link/history navigation occurs outside this document's input
  // listeners. A changed pending local entry is explicit navigation, whereas
  // restored/shared history and title/activity refreshes confer no authority.
  const selectedBefore=state.tabs.find(tab=>tab.id===state.tab&&tab.type==='browser');
  const selectedInfo=selectedBefore&&infos.find(info=>info.id===selectedBefore.id);
  if(selectedInfo?.navigationPending===true&&(selectedInfo.url!==selectedBefore.info?.url||selectedInfo.history?.currentEntryId!==selectedBefore.info?.history?.currentEntryId))projectFollower.human();
  const previousFind=pageFindNative();
  browserFindRevisions.clear();for(const info of infos)browserFindRevisions.set(info.id,info.findRevision??0);
  const currentBrowser=state.tabs.find(tab=>tab.id===state.tab&&tab.type==='browser');
  const previousSurface=currentBrowser?`${!!currentBrowser.info?.url}:${currentBrowser.info?.loaded!==false}`:null;
  if(previewEnabled(state)&&infos.some(info=>state.tabs.find(tab=>tab.id===info.id)?.info?.lastActivityAt!==info.lastActivityAt))schedulePreviewActivityRender();
  const ids=new Set(infos.map(info=>info.id));for(const id of browserAddressDrafts.keys())if(!ids.has(id))browserAddressDrafts.delete(id);
  if(currentBrowser&&!currentBrowser.restoreFailed&&!ids.has(currentBrowser.id)){state.tab=tabToLeft(currentBrowser);if(currentBrowser.parentId)selectedChildren.set(currentBrowser.parentId,state.tab);}
  state.tabs=state.tabs.filter(tab=>tab.type!=='browser'||tab.restoreFailed||ids.has(tab.id));
  syncTeamBrowsers(infos,{persist:false});
  for(const info of infos.filter(info=>info.group!=='team'&&!ownsTeamBrowser(info.id))){const parent=ensureBrowserParent(info),tab=state.tabs.find(t=>t.id===info.id);if(tab){tab.info=info;if(Object.hasOwn(info,'hidden'))tab.hidden=info.hidden===true;tab.label=tab.customTitle||info.title||'New tab';if(parent)tab.parentId=parent.id;else if(info.destination?.type==='application')delete tab.parentId;}else state.tabs.push({id:info.id,type:'browser',label:info.title||'New tab',hidden:info.hidden===true,info,...(parent?{parentId:parent.id}:previewEnabled(state)&&info.parentId?.startsWith('project:local:')?{parentId:info.parentId}:{})});}
  if(!state.tabs.some(tab=>tab.id===state.tab)){state.tab='overview';render();}else if(currentBrowser&&!ids.has(currentBrowser.id)){render();}else{renderTabs();renderChatSubtabs();updateBrowserControls();if(currentBrowser&&previousSurface!==`${!!currentBrowser.info?.url}:${currentBrowser.info?.loaded!==false}`)renderBrowser();}
  if(contentChanged)saveWorkspace();else if(!browserActivitySaveTimer)browserActivitySaveTimer=setTimeout(()=>{browserActivitySaveTimer=null;saveWorkspace();},15000);
  const nextFind=pageFindNative();
  if(nextFind&&(nextFind.id!==previousFind?.id||nextFind.revision!==previousFind.revision))pageFind.refresh();
});
window.desktop?.onCloseCurrentTab?.(()=>void closeCurrentTab().catch(error=>toast(error.message)));
window.desktop?.onCloseTool?.((id)=>{state.tabs=state.tabs.filter(t=>t.id!==id);if(state.tab===id)state.tab='overview';render();});
window.desktop?.onTabManagement?.(async value=>{
 let acknowledged=false;const ownerPlacement=value.action!=='window-checkpoint';if(ownerPlacement){ownerTabActions++;clearTimeout(contentSyncTimer);}
 try {
 if(value.navigationCatalog)setWorkspaceProjectsCatalog(state,{...workspaceProjectsCatalog(state),...value.navigationCatalog});
 if(value.action==='window-checkpoint'){try{rememberView($('#main'),$('#main').dataset.viewKey);await flushViewPositions();const saved=await saveWorkspace();if(saved?.failed)throw Error(saved.error);await window.desktop.tabActionResult({requestId:value.requestId,result:{saved:true}});}catch(error){await window.desktop.tabActionResult({requestId:value.requestId,error:error.message});}return;}
 if(value.action==='project-catalog'){
  try{
   setWorkspaceProjectsCatalog(state,value.catalog);reconcilePreviewProjects();
   const saved=await saveWorkspace();if(saved?.failed)throw new Error(saved.error);
   render();await window.desktop.tabActionResult({requestId:value.requestId,result:{completed:true}});
  }catch(error){await window.desktop.tabActionResult({requestId:value.requestId,error:error.message});}
  return;
 }
 if(value.action==='shell-action'){try{const tab=[...state.tabs,...teamState().tabs].find(tab=>tab.id===value.tab.runtimeId);if(!tab)throw new Error('Tab was closed.');if(value.operation==='close'&&teamState().tabs.includes(tab)){teamState().tabs=teamState().tabs.filter(item=>item!==tab);if(teamState().active===tab.id)teamState().active='overview';if(tab.type==='remote-document')forgetRemoteDocument(tab.id);}else if(value.operation==='close'){if(tab.type==='workspace')tab.navigationClosed=true;if(tab.parentId)await closeChildTab(tab);else await closeTopTab(tab.id);}else if(['hide','restore'].includes(value.operation)){await setTabVisibility(tab,value.operation==='hide');}else if(value.operation==='move'){if(tab.type==='agent-terminal')tab.runId||=agentTerminalRunId(tab);tab.contentTabId=value.tab.id;const target=value.destination;if(teamState().tabs.includes(tab)&&target.scope!=='team'){teamState().tabs=teamState().tabs.filter(item=>item!==tab);tab.label||=tab.title;state.tabs.push(tab);if(teamState().active===tab.id)teamState().active='overview';}if(target.scope==='main')delete tab.parentId;else if(target.scope==='team'){state.tabs=state.tabs.filter(item=>item!==tab);if(teamState().tabs.includes(tab)){const saved=await saveWorkspace();render();await window.desktop.tabActionResult({requestId:value.requestId,...(saved?.failed?{error:saved.error}:{result:{completed:true}})});return;}if(tab.type==='browser')selectTeamBrowser({...tab.info,id:tab.id,contentTabId:tab.contentTabId});else teamState().tabs.push({...tab,title:tab.label,file:tab.markdown?.file||tab.file,parentId:undefined});}else{const parentId=target.scope==='project'?'project:local:'+target.id:target.scope==='workspace'?'workspace:local:'+target.id:target.id;let parent=state.tabs.find(item=>item.id===parentId);if(!parent&&target.scope==='project'){const project=target.project||previewProjects().find(item=>item.id===target.id);if(!project)throw new Error('Choose an existing project.');parent=ensurePreviewProject(project,{workspaceRecord:target.workspace});}if(!parent){parent={id:parentId,type:target.scope==='workspace'?'workspace':'run',workspaceId:target.scope==='workspace'?target.id:undefined,label:target.scope==='workspace'?state.data.context.workspaces.find(row=>row.id===target.id)?.name||'Workspace':state.data.runs.find(row=>row.id===target.id)?.title||'Chat'};state.tabs.push(parent);}tab.parentId=parent.id;}}else if(value.operation==='reorder'){const current=state.tabs.filter(tab=>!tab.parentId&&!tab.navigationClosed),ids=value.ids||[];if(ids.length!==current.length||new Set(ids).size!==current.length||ids.some(id=>!current.some(tab=>tab.id===id)))throw new Error('Reorder must include each root view exactly once.');const positions=state.tabs.map((tab,index)=>current.includes(tab)?index:-1).filter(index=>index>=0);positions.forEach((position,index)=>state.tabs[position]=current.find(tab=>tab.id===ids[index]));}const saved=await saveWorkspace();if(saved?.failed)throw new Error(saved.error);render();await window.desktop.tabActionResult({requestId:value.requestId,result:{completed:true,operation:value.operation}});}catch(error){await window.desktop.tabActionResult({requestId:value.requestId,error:error.message});}return;}

 if(value.action==='chat-moved'){
  const views=state.tabs.filter(tab=>tab.type==='run'&&(tab.runId||tab.id)===value.chatId);
  if(views.length){let parent=value.workspaceId?state.tabs.find(tab=>tab.type==='workspace'&&!tab.hostId&&tab.workspaceId===value.workspaceId):null;
   if(value.workspaceId&&!parent){parent={id:'workspace:local:'+value.workspaceId,type:'workspace',workspaceId:value.workspaceId,label:value.workspaceName};state.tabs.push(parent);}
   for(const child of state.tabs.filter(tab=>views.some(view=>view.id===tab.parentId)))child.parentId=parent?.id||value.chatId;
   state.tabs=state.tabs.filter(tab=>!views.includes(tab));const id=parent?parent.id+':chat:'+value.chatId:value.chatId;
   state.tabs.push({...views[0],id,runId:value.chatId,parentId:parent?.id,label:value.title});if(views.some(view=>state.tab===view.id))state.tab=id;
  }
  const run=state.data.runs.find(run=>run.id===value.chatId);if(run){run.workspaceId=value.workspaceId;run.workspaceName=value.workspaceName;}
  reconcileIndexedChat({...run,...value,hostId:'local',chatId:value.chatId,local:true});
  await saveWorkspace();render();revealSelectedTab();return;
 }
 if(value.action==='workspace-deleted'){const parentIds=state.tabs.filter(tab=>tab.type==='workspace'&&!tab.hostId&&tab.workspaceId===value.workspaceId).map(tab=>tab.id);state.tabs=state.tabs.filter(tab=>!parentIds.includes(tab.id)&&!parentIds.includes(tab.parentId));if(!state.tabs.some(tab=>tab.id===state.tab))state.tab='overview';saveWorkspace();void refresh(true);return;}
 const tab=[...state.tabs,...teamState().tabs].find(tab=>tab.id===value.runtimeId||(tab.contentTabId||tab.id)===value.tab?.id||value.tab?.terminalId&&tab.terminal?.id===value.tab.terminalId);if(!tab){if(value.requestId)await window.desktop.tabActionResult({requestId:value.requestId,result:{completed:true,unopened:true}});return;}
 const fromTeam=teamState().tabs.includes(tab);
 if(value.action==='close'&&['run','remote-run'].includes(tab.type)){if(tab.parentId)await closeChildTab(tab);else await closeTopTab(tab.id);}
 else if(value.action==='close'){teamState().tabs=teamState().tabs.filter(item=>item!==tab);state.tabs=state.tabs.filter(item=>item!==tab);if(state.tab===tab.id)state.tab=tab.parentId||'overview';}
 else if(['hide','restore'].includes(value.action)){tab.hidden=value.action==='hide';if(tab.hidden&&state.tab===tab.id)state.tab=tab.parentId||'overview';}
 else if(value.action==='move'){
  tab.contentTabId=value.tab.id;
  const {scope,id}=value.destination;
  if(fromTeam&&scope!=='team'){teamState().tabs=teamState().tabs.filter(item=>item!==tab);if(teamState().active===tab.id)teamState().active='overview';if(tab.browserId){tab.id=tab.browserId;tab.info=await window.desktop.browser({action:'activate',id:tab.browserId});delete tab.browserId;}tab.label=tab.label||tab.title;state.tabs.push(tab);}
  if(scope==='project'){const parent=ensurePreviewProject(value.destination.project||previewProjects().find(project=>project.id===id),{workspaceRecord:value.destination.workspace});if(!parent)throw Error('Project is unavailable.');tab.parentId=parent.id;}
  else if(scope==='workspace'){let parent=state.tabs.find(item=>item.type==='workspace'&&!item.projectId&&!item.hostId&&item.workspaceId===id);if(!parent){const profile=state.data.context.workspaces.find(item=>item.id===id);parent={id:'workspace:local:'+id,type:'workspace',workspaceId:id,label:profile?.name||'Workspace'};state.tabs.push(parent);}tab.parentId=parent.id;}
  else if(scope==='chat'){if(!state.tabs.some(item=>item.id===id)){const run=state.data.runs.find(item=>item.id===id);state.tabs.push({id,type:'run',label:run?.title||'Chat'});}tab.parentId=id;}
  else if(scope==='main')delete tab.parentId;
  else if(scope==='team'&&!fromTeam){if(tab.type==='browser')selectTeamBrowser({...tab.info,id:tab.id,contentTabId:value.tab.id});else teamState().tabs.push({...tab,title:tab.label,file:tab.markdown?.file||tab.file,parentId:undefined});state.tabs=state.tabs.filter(item=>item!==tab);}
 }
 const saved=await saveWorkspace();if(saved?.failed)throw Error(saved.error);if(value.requestId){await window.desktop.tabActionResult({requestId:value.requestId,result:{completed:true}});acknowledged=true;}render();
 }catch(error){if(value.requestId&&!acknowledged)await window.desktop.tabActionResult({requestId:value.requestId,error:error.message});else toast(error.message);}
 finally{if(ownerPlacement)ownerTabActions--;}
});
window.desktop?.onNotification?.(()=>{if(state.page==='engine'&&state.engineSection==='notifications')renderEngineRoom('notifications',true);});
window.desktop?.onAddressFocus(()=>$('#browser-url')?.focus());
function ensureBrowserParent(info){
  if(previewEnabled(state))Object.assign(info,remapPreviewBrowserPlacement(info,workspaceProjectsCatalog(state)));
  const destination=info.destination?.type?info.destination:info.destination?.destination;
  const parentId=destination?.type==='application'?null:info.parentId||info.owner;
  if(!parentId)return null;
  let parent=state.tabs.find(tab=>tab.id===parentId&&['run','remote-run','workspace'].includes(tab.type));
  if(!parent&&previewEnabled(state)){
    const projectId=destination?.type==='project'?destination.id:parentId.startsWith('project:local:')?parentId.slice('project:local:'.length):null;
    if(projectId)parent=ensurePreviewProject(previewProjects().find(project=>project.id===projectId&&(!destination?.workspaceId||project.workspaceId===destination.workspaceId)));
  }
  if(!parent&&destination?.type==='workspace'){const workspaceId=destination.id;parent={id:parentId,type:'workspace',workspaceId,label:info.workspaceName||state.data.context?.workspaces?.find(w=>w.id===workspaceId)?.name||'Workspace',workspacePage:'chats'};state.tabs.push(parent);}
  if(!parent&&info.externalProject&&destination?.type==='project'){
    const target=info.externalProject,hostId=target.hostId||'local',workspaceId=`workspace:${hostId}:${target.workspaceId}`;
    let workspace=state.tabs.find(tab=>tab.id===workspaceId);if(!workspace){workspace={id:workspaceId,type:'workspace',workspaceId:target.workspaceId,label:target.workspaceName,workspacePage:'projects',...(hostId==='local'?{}:{hostId,hostName:target.hostName})};state.tabs.push(workspace);}
    workspace.navigationClosed=false;workspace.hidden=false;
    parent={id:parentId,type:'workspace',workspaceId:target.workspaceId,projectId:target.projectId,label:target.projectName,workspaceName:target.workspaceName,workspacePage:'tabs',...(hostId==='local'?{}:{hostId,hostName:target.hostName})};state.tabs.push(parent);
  }
  if(!parent&&info.owner&&(!destination||destination.type==='chat')){const run=state.data.runs.find(r=>r.id===info.owner);parent={id:info.owner,type:'run',label:run?.title||'Chat'};state.tabs.push(parent);}
  return parent;
}
function addBackgroundBrowserTab(info,afterId=null,{created=false}={}){
 if(info.group==='team'){selectTeamBrowser(info,afterId,{select:false,created});return;}
 const parent=ensureBrowserParent(info);let tab=state.tabs.find(tab=>tab.id===info.id);
 if(tab){tab.info=info;tab.label=tab.customTitle||info.title||'New tab';if(parent)tab.parentId=parent.id;}
 else{tab={id:info.id,type:'browser',label:info.title||'New tab',info,...(parent?{parentId:parent.id}:{})};state.tabs.push(tab);}
 if(created)tab.pendingOpen=true;
 placeTabAfter(state.tabs,tab.id,afterId);saveWorkspace();renderTabs();renderChatSubtabs();
}
function selectBrowserTab(info, afterId=null,{created=false}={}) {
  const parent=ensureBrowserParent(info);
  if(info.group==='team'){selectTeamBrowser(info,afterId,{created});openFeatureTab('team');}
  else {
    openTab({id:info.id,type:'browser',label:info.title||'New tab',info,...(created?{pendingOpen:true}:{}),...(parent?{parentId:parent.id}:previewEnabled(state)&&info.parentId?.startsWith('project:local:')?{parentId:info.parentId}:{})},afterId);
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
window.desktop?.onNewTab?.(()=>{
 projectFollower.human();
 const parent=selectedChatParent(),team=previousFeature==='team';
 const button=team?document.querySelector('[data-team-add="browser"]'):parent?document.querySelector('[data-chat-add="browser"]'):document.querySelector('#browser');
 const target=button||document.querySelector('#browser');if(!target)return;
 beginNewTabInput({replace:true});target.click();
});
async function refreshCurrentTab(){
 const selected=state.tabs.find(tab=>tab.id===state.tab),team=teamState(),tab=state.tab==='team'?team.tabs.find(tab=>tab.id===team.active):selected;
 if(!tab||tab.newChatDraft||['terminal','agent-terminal'].includes(tab.type))return;
 if(tab.type==='browser'||tab.browserId){await window.desktop.browser({action:'reload',id:tab.browserId||tab.id});return;}
 if(tab.type==='markdown'){const data=await api('/api/markdown',{file:tab.markdown?.file||tab.file});tab.markdown=data;if(state.tab===tab.id)renderMarkdown();else if(state.tab==='team'&&team.active===tab.id)renderTeamTools();return;}
 if(tab.type==='remote-document'){forgetRemoteDocument(tab.id);if(state.tab===tab.id)await renderRemoteDocument(tab);return;}
 if(tab.type==='remote-run'){await renderRemoteRun(tab);return;}
 if(tab.type==='run'||tab.type==='workspace')await refresh(true);
}
window.desktop?.onBrowserAction?.(value=>{
  if(['select-tab','tab-swipe'].includes(value.type))projectFollower.human();
  if(value.type==='refresh-current-tab'){void refreshCurrentTab().catch(error=>toast(error.message));return;}
  if(value.type==='downloads'){downloadsChanged();return;}
  if(value.type==='extensions-changed'){document.dispatchEvent(new CustomEvent('proteus-extensions-changed',{detail:value}));return;}
  if(value.type==='tab-swipe')void swipeTab(value.direction,value.id);
  else if(value.type==='find')pageFind.open();
  else if(value.type==='overview')void showBrowserOverview(value.parentId||value.group);
  else if(value.type==='unloaded-tab'){saveWorkspace();renderTabs();renderChatSubtabs();toast('Link added as a hidden, unloaded tab.');}
  else if(value.type==='background-tab')addBackgroundBrowserTab(value.info,value.afterId,{created:value.created===true});
  else if(value.type==='select-tab')selectBrowserTab(value.info,value.afterId,{created:value.created===true});
  else if(value.type==='chat-link'){const parent=selectedChatParent();if(parent?.type==='workspace')void newWorkspaceChat(parent,false,value.url);else void chatDialog(null,()=>{},{prompt:value.url});}
  else if(value.type==='site-notification'){void refresh(true);}
  else if(value.type==='site-permission'){if(state.data){state.data.attention=[...(state.data.attention||[]).filter(item=>item.id!==value.item.id),value.item];announceAttention();}}
  else if(value.type==='load-error')void recordBrowserIssue({kind:'load-error',tabId:value.id,...(value.logId?{logId:value.logId}:{}),title:'Browser page could not load',body:value.message}).catch(()=>{});
  else if((value.type==='error'||value.type==='notice'))toast(value.message);
});
window.desktop?.onBrowserResize(()=>requestAnimationFrame(browserBounds));
window.addEventListener('resize',()=>requestAnimationFrame(browserBounds));
new ResizeObserver(()=>requestAnimationFrame(browserBounds)).observe($('#workspace'));
window.addEventListener('keydown',event=>{if(event.key==='F5'){event.preventDefault();void refreshCurrentTab().catch(error=>toast(error.message));return;}if((event.metaKey||event.ctrlKey)&&event.key==='l'&&$('#browser-url')){event.preventDefault();$('#browser-url').focus();}});
window.addEventListener('keydown',event=>{if((event.metaKey||event.ctrlKey)&&event.shiftKey&&event.code==='Backslash'){event.preventDefault();void showBrowserOverview(previousFeature==='team'?'team':selectedChatParent()?.id||'main');}});
function overviewGroups(browserTabs,scope='main'){
  const previews=new Map(browserTabs.map(tab=>[tab.id,tab]));
  const item=(tab,team=false,locked=false)=>{const preview=previews.get(team?tab.browserId:tab.id),kind=tab.type||'browser';return {id:tab.id,selected:team?(state.page==='team'&&state.tab==='overview'&&(teamState().active===tab.id||tab.id==='team-'+teamState().active)):state.tab===tab.id,title:kind==='browser'?browserLabel({...tab,type:kind}):tab.label||tab.title||preview?.title||'New tab',kind,url:tab.info?.url||tab.url||preview?.url||'',thumbnail:preview?.thumbnail,loaded:preview?.loaded??tab.loaded,icon:({browser:'◎',terminal:'⌘',markdown:'▤',run:'☷','remote-run':'☷','remote-document':'▤',schedule:'◷',workspace:'□',overview:'☷',standup:'☷'})[kind]||'▤',closable:!locked,parentId:tab.parentId||null,team};};
  const selected=state.tabs.find(tab=>tab.id===state.tab),owner=state.tabs.find(tab=>tab.id===scope)?.hostId,groups=tabOverviewGroups({tabs:state.tabs,catalog:owner?workspaceOwners().find(row=>row.hostId===owner)?.workspaceProjects:workspaceProjectsCatalog(state),scope,selectedId:state.tab,topId:previewTopId(selected,state),team:teamState()});
  const home=group=>group.home?[{...item(group.home,false,true),selected:group.selectedId===group.home.id,title:group.home.label||group.title,url:'Project home',kind:'workspace',home:true,parentId:null,working:false}]:[];
  return groups.map(group=>({...group,items:[...home(group),...group.tabs.map(tab=>{const value=item(tab,group.team);value.selected=group.selectedId===tab.id;const run=state.data?.runs?.find(run=>run.id===(tab.runId||tab.id));return {...value,parentId:tab.parentId||null,kind:tab.type||'browser',working:['running','starting'].includes(run?.status)};})]}));
}
const chatThumbnailKey=tab=>'chat:'+(tab.hostId||state.data?.hostId||'local')+':'+(tab.runId||tab.id);
let chatCapturePending,chatCaptureBusy=false,lastChatCapture=0;
async function captureChatThumbnail(){
  if(!window.desktop?.thumbnails||chatCaptureBusy||workspaceClosing||isBrowserOverviewOpen()||$('#dialog').open||document.hidden)return;
  const tab=state.tabs.find(tab=>tab.id===state.tab);if(!['run','remote-run'].includes(tab?.type))return;
  const surface=$('#main .conversation'),key=chatThumbnailKey(tab);if(!surface)return;
  const rect=surface.getBoundingClientRect(),bounds={x:Math.max(0,rect.x),y:Math.max(0,rect.y),width:Math.min(rect.width,innerWidth-Math.max(0,rect.x)),height:Math.min(rect.height,innerHeight-Math.max(0,rect.y))};if(bounds.width<24||bounds.height<24)return;
  chatCaptureBusy=true;lastChatCapture=Date.now();
  try{const result=await window.desktop.thumbnails({action:'capture',key,bounds});if(result?.token&&state.tab===tab.id&&surface.isConnected&&!isBrowserOverviewOpen()&&!$('#dialog').open)await window.desktop.thumbnails({action:'commit',token:result.token});}catch{/* The last good thumbnail remains available. */}finally{chatCaptureBusy=false;}
}
function scheduleChatThumbnail(){if(!chatCapturePending)chatCapturePending=setTimeout(()=>{chatCapturePending=null;void captureChatThumbnail();},Math.max(700,5000-(Date.now()-lastChatCapture)));}
new MutationObserver(scheduleChatThumbnail).observe($('#main'),{subtree:true,childList:true,characterData:true});
for(const event of ['pointerdown','wheel','keydown'])$('#main').addEventListener(event,scheduleChatThumbnail,{passive:true,capture:true});
const chatCaptureInterval=setInterval(()=>void captureChatThumbnail(),20000);
window.desktop?.onShutdown?.(()=>{clearInterval(chatCaptureInterval);clearTimeout(chatCapturePending);});
function selectOverview(item){
  if(item.team){teamState().active=item.id==='team-overview'?'overview':item.id==='team-standup'?'standup':item.id;openFeatureTab('team');return;}
  if(item.parentId)selectedChildren.set(item.parentId,item.id);
  const tab=state.tabs.find(entry=>entry.id===item.id);if(!tab)return;state.tab=tab.id;if(tab.type==='browser')selectBrowserTab(tab.info);else render();
}
async function closeOverview(item){
  if(item.team){await closeTeamTabById(item.id);return;}
  const tab=state.tabs.find(entry=>entry.id===item.id);if(!tab)return;if(tab.parentId)await closeChildTab(tab);else await closeTopTab(tab.id);
}
initBrowserOverview({escape,toast,overviewGroups,selectOverview,closeOverview,loadCached:async scope=>{if(!window.desktop?.thumbnails)return [];const rows=overviewGroups([],scope).flatMap(group=>group.items).filter(item=>['run','remote-run'].includes(item.kind)).map(item=>({id:item.id,key:chatThumbnailKey(state.tabs.find(tab=>tab.id===item.id)||item)}));const cached=await window.desktop.thumbnails({action:'get',keys:rows.map(row=>row.key)});return rows.map(row=>({id:row.id,...cached.find(item=>item.key===row.key)}));},reorder:(source,target,after)=>{if(source.team||target.team){if(!source.team||!target.team)throw Error('Reorder tabs within the same section.');const tabs=teamState().tabs;if(reorderById(tabs,source.id,target.id,after))saveWorkspace();return;}if(source.parentId!==target.parentId)throw Error('Reorder tabs within their current owner.');reorderVisibleTabs(source.id,target.id,after,source.parentId);},restore:()=>render()});
initRemoteDesktops({sharedSetupArgs,openWorkspace,openAssociatedChat:sendChatToWorkspace,moveChat:moveChatToWorkspace,selectedChatParent:()=>selectedChatParent()?.id,saveWorkspace,state,escape,toast,showDialog,openTab,time,refresh,openMessageLink,renderChatSubtabs,syncContentTabs:()=>contentTabSync.all(),revokeHostContent,replaceChatContent,onDeleted:reconcileDeletedChat,rename:renameChat,rememberView:()=>rememberView($('#main'),$('#main').dataset.viewKey),restoreView:()=>restoreView($('#main'),$('#main').dataset.viewKey)});
initBrowserNotifications({api,refresh,review:item=>{if(item.readAt)navigate('engine','notifications');else openAttentionItem('notification:'+item.id);},logs:id=>openEventLogs({logId:id}),resolve:async(scope,preserve)=>{
 if(!contentTabSync.hasConflict(scope)){await contentTabSync.sync(scope);if(!contentTabSync.hasConflict(scope))throw Error('This scope has no active history conflict. Its pending data was preserved; reopen the original tab to refresh its status.');}
 await contentTabSync.resolve(scope,{...(preserve?{preserve:async tabs=>{for(const tab of tabs){if(!tab.url)continue;const info=await window.desktop.browser({action:'create',url:tab.url,profileId:tab.profileId||'default',group:'main'});openTab({id:info.id,type:'browser',label:info.title||tab.title||'Browser',info});}}}:{})});
},browser:async(id,action)=>{const tab=[...state.tabs,...teamState().tabs].find(tab=>tab.id===id||tab.browserId===id||tab.contentTabId===id);if(!tab)throw Error('This browser tab is no longer open in its original window.');const native=tab.browserId||tab.id;if(action==='reload'){await window.desktop.browser({action:'reload',id:native});return;}selectOverview({id:tab.id,team:teamState().tabs.includes(tab)});}});
initAttention({state,api,toast,refresh,loadChats:loadChatsIndex,openBrowser:info=>openTab({id:info.id,type:'browser',label:info.title||'Browser',parentId:info.parentId,info}),chats:()=>attentionChats(state.data?.runs||[]),openChat:openIndexedChat,renderChats:container=>renderChatsIndex(true,true,{container}),connections:section=>navigate('engine',section),openPage:()=>navigate('attention')});
initChatsIndex({moveChat:moveChatToWorkspace,copyLink:copyChatLink,sendToWorkspace:sendChatToWorkspace,state,api,escape,toast,time,showDialog,openLocal:runTab,openRemote:openRemoteChat,onDeleted:reconcileDeletedChat,rename:renameChat,onIndexChanged:()=>{const running=$('[data-page="runs"] .count');if(running&&state.data)running.textContent=runningChats(state.data.runs);const count=$('[data-page="attention"] .count');if(count&&state.data)count.textContent=attentionItems().length;}});
initTeamTools({closeTeamMembership:async tab=>{const descriptor=await descriptorFor(tab,{type:'team',id:null});if(descriptor)contentTabSync.close({scope:'team',id:windowScopeId('team')},descriptor.id);},retryTeamUnavailable:async tab=>{const document=await api('/api/content-tabs',{action:'document',scope:'team',id:windowScopeId('team'),documentId:tab.unavailableDescriptor.documentId,metadataOnly:true});Object.assign(tab,{type:'markdown',file:document.file,markdown:document,label:tab.title});delete tab.unavailableDescriptor;delete tab.unavailableReason;saveWorkspace();renderTeamTools();},hideTeamBrowser:async tab=>{await setTabVisibility(tab,true);await saveWorkspace();},state,api,escape,toast,time,lines,showDialog,browserTarget,fillBrowserLogin,timezone:()=>state.data.settings.timezone,onChange:saveWorkspace,transferTeamTab:(tab,copy)=>transferTabDialog({...tab,id:tab.browserId||tab.id,type:tab.browserId?'browser':tab.type,label:tab.title,customTitle:tab.customTitle,info:{url:tab.url,agentControlling:tab.agentControlling}},copy,tab),openTeamTerminal:(callback,guard)=>openTerminalDialog(null,callback,guard),renderTeamRemoteDocument:(tab,container)=>renderRemoteDocument(tab,{container,active:()=>container.isConnected&&teamState().active===tab.id}),renderTeamAgentTerminal:async(tab,container)=>{await loadRunView(tab.runId);if(container.isConnected&&teamState().active===tab.id)renderAgentTerminal(container,localHistories.get(tab.runId));},renderTeamTerminal:renderTerminal,disposeTeamTerminal:disposeTerminalUi,openTeamMarkdown:(callback,guard)=>openMarkdownPicker('open',null,callback,guard),openTeamLink:async(source,cwd)=>{try{const kind=ProteusMarkdown.linkKind(source);if(kind==='web'){const info=await window.desktop.browser({action:'create',url:source,group:'team'});selectTeamBrowser(info);renderTeamTools();}else if(kind==='file'){const file=decodeURIComponent(new URL(source,'file://'+cwd.replace(/\/$/,'')+'/').pathname);if(file.endsWith('.md')){const markdown=await api('/api/markdown',{file});const tab={id:'markdown:'+file,type:'markdown',label:file.split('/').pop(),file,markdown};const current=teamState();const old=current.tabs.find(item=>item.id===tab.id);if(old)Object.assign(old,tab);else current.tabs.push(tab);current.active=tab.id;saveWorkspace();renderTeamTools();}else await window.desktop.openPath(file);}else if(kind==='mail'){await navigator.clipboard.writeText(source.slice(7));toast('Email address copied.');}}catch(error){toast(error.message);}}});
initEngineRoom({showDialog,openUpdateChat:async run=>{await refresh();const current=state.data.runs.find(item=>item.id===run.id)||run;if(!previewEnabled(state)||!openPreviewChat(current))runTab(current);},openBrowser:info=>openTab({id:info.id,type:'browser',label:info.title||'Browser',info}),state,api,escape,toast,time,manageMcp,providers:renderProviders,connections:()=>renderRemote({api,escape,toast}),setup:renderSettings,resourceChanged:(action,id)=>{if(action==='close')state.tabs=state.tabs.filter(tab=>tab.id!==id);saveWorkspace();},openAccount:()=>window.desktop?.openExternal(new URL('/security',state.data.life?.websiteOrigin||'https://proteus.example').href)});
initTerminals({state,escape,toast,showDialog,openTab,onInput:tab=>recordPreviewActivity(tab)});
initDesktopPreview({windowRestoreNotice,workspaceOwners,refreshWorkspaceOwners,loadWorkspaceOwnerTabs,openRemoteProject,openWorkspaceChat,syncContentTabs:scope=>contentTabSync.sync(scope),state,api,escape,toast,refresh,openTab,render,showDialog,openWorkspace,renderChats:renderChatsIndex,newChat:newWorkspaceChat,createWorkspace,deleteWorkspace,manageWorkspaceTab,manageWorkspaceTabs});
initWorkspaces({windowRestoreNotice,syncContentTabs:scope=>contentTabSync.sync(scope),reconcileRemoteProjectPlacement,revealSelectedTab,manageWorkspaceTab,manageWorkspaceTabs, state,api,escape,toast,loadPeers,openTab,render,renderTabs,showDialog,renderChats:renderChatsIndex,newChat:newWorkspaceChat});
initFeatures({renderWorkspaces,state,escape,api,toast,refresh,openTab,showDialog,lines,restoreBrowser:()=>requestAnimationFrame(browserBounds)});
initOmi({state,escape,api,toast,refresh,openSchedule:schedule,openRun:id=>{const run=state.data.runs.find(item=>item.id===id);if(run)runTab(run);}});
initLife({state,escape,api,toast,refresh,openTab,showDialog,openSettings:()=>{navigate('engine','setup');}});
initMarkdownPicker({api,escape,showDialog,openTab,toast,defaultWorkspaceId:()=>state.data.context.defaultWorkspaceId});
let rendererOverlayVisible=false;
new MutationObserver(()=>{const visible=!!document.querySelector('dialog[open],.proteus-context-menu,#chat-context-menu');if(visible===rendererOverlayVisible)return;rendererOverlayVisible=visible;void window.desktop?.browser({action:'overlay',token:'renderer-overlays',visible}).catch(error=>toast(error.message));if(!visible)requestAnimationFrame(browserBounds);}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});
void window.desktop?.browser({action:'selection-init',...browserSurfaceIdentity()}).catch(error=>toast(error.message));
windowRestore.start().then(async()=>{await Promise.allSettled([refreshUsage(),loadChatsIndex()]);if(state.data)render();chatLinksReady=true;if(pendingChatLink&&windowRestore.ready()){const target=pendingChatLink;pendingChatLink=null;await openChatLink(chatLink(target));}}).catch(e=>toast(e.message));
let attentionPolling=false;const attentionInterval=setInterval(async()=>{if(!state.data||attentionPolling||document.hidden||liveEvents.readyState===EventSource.OPEN&&Date.now()-lastStateRefresh<15000)return;attentionPolling=true;try{const result=await api('/api/attention');state.data.attention=result.items;announceAttention();}catch{}finally{attentionPolling=false;}},2000);
const usageInterval=setInterval(() => {if(!document.hidden)void refreshUsage();}, 60_000);
const refreshInterval=setInterval(()=>{if(document.hidden||liveEvents.readyState===EventSource.OPEN&&Date.now()-lastStateRefresh<15000)return;if((!document.activeElement?.matches('input,textarea,select') || !!$('#conversation-host'))&&!$('#dialog').open)refresh().catch(()=>{});},1500);

window.desktop?.onRemote(() => navigate('engine','connections'));
let liveRefreshTimer;
async function refreshBrowserProfiles(){try{const value=await api('/api/browser-profiles');setBrowserProfiles(value.items);renderTabs();const bar=$('#chat-subtabs');if(bar)delete bar.dataset.signature;renderChatSubtabs();}catch(error){toast(error.message);}}
window.addEventListener('proteus:profiles-changed',()=>void refreshBrowserProfiles());
document.addEventListener('click',event=>{const button=event.target.closest('[data-browser-profile]');if(!button)return;event.preventDefault();event.stopPropagation();button.closest('details')?.removeAttribute('open');const scope=button.dataset.profileScope,parent=scope==='chat'?selectedChatParent():null;void window.desktop.browser({action:'create',profileId:button.dataset.browserProfile,group:scope==='team'?'team':'main',parentId:parent?.id}).then(info=>{if(scope==='team'){selectTeamBrowser(info);renderTeamTools();}else openTab({id:info.id,type:'browser',label:info.title||'New tab',parentId:parent?.id,info});}).catch(error=>toast(error.message));},true);
void refreshBrowserProfiles();
const liveEvents = new EventSource('/api/events');
// Tab-list convergence is passive and must continue while another window owns
// focus or this window has an unfinished address/composer draft.
liveEvents.addEventListener('content-tabs',event=>{if(!workspaceReady||workspaceRestoring||workspaceClosing)return;try{const value=JSON.parse(event.data),scope=synchronizedContentScopes().find(scope=>!scope.hostId&&scope.scope===value.scope&&scope.id===value.id);if(scope)void contentTabSync.sync(scope);}catch{}});
liveEvents.addEventListener('project-follow',event=>{try{const value=JSON.parse(event.data);void projectFollower.receive({scope:value.scope,id:value.id},value);}catch{}});
// Owner change events are coalesced and name affected chats. A streaming-only burst
// refreshes just the visible conversation (if it is one of them) instead of every
// window re-fetching and re-rendering full owner state for each token batch.
let liveRefreshStreamOnly=true,liveRefreshRuns=new Set();
async function refreshVisibleRun(id){const tab=state.tabs.find(t=>t.id===state.tab);if(tab?.type!=='run'||(tab.runId||tab.id)!==id)return;await loadRunView(id);if(state.tabs.find(t=>t.id===state.tab)===tab&&$('#main').dataset.runId===id&&$('#conversation-host'))renderRun(id);}
liveEvents.addEventListener('change', event => {
 if (document.hidden) return;
 let value={};try{value=JSON.parse(event.data||'{}')||{};}catch{}
 for(const id of Array.isArray(value.runs)?value.runs:[])liveRefreshRuns.add(id);
 liveRefreshStreamOnly&&=value.stream===true;
 if(liveRefreshTimer)return;
 liveRefreshTimer = setTimeout(() => {
  liveRefreshTimer = null;const streamOnly=liveRefreshStreamOnly,runs=liveRefreshRuns;liveRefreshStreamOnly=true;liveRefreshRuns=new Set();
  if (document.hidden||(document.activeElement?.matches('input,textarea,select') && !$('#conversation-host')) || $('#dialog').open) return;
  // Transcript deltas never need a full catalog reload. The existing push-loss/
  // fifteen-second fallback and nonstream mutations still refresh owner state.
  if(streamOnly){const tab=state.tabs.find(t=>t.id===state.tab),id=tab?.type==='run'?(tab.runId||tab.id):null;if(id&&runs.has(id))void refreshVisibleRun(id).catch(()=>{});return;}
  refresh().catch(() => {});
 }, 120);
});

// A pinch that ever visits visual zoom above baseline cannot open overview.
let overviewPinch=null,overviewPinchCooldown=0;
window.visualViewport?.addEventListener('resize',()=>{if(window.visualViewport.scale>1.001){const now=performance.now();overviewPinch??={started:now,last:now,total:0,blocked:true};overviewPinch.blocked=true;overviewPinch.last=now;}});
document.addEventListener('wheel',event=>{
 if(!event.ctrlKey)return;
 const now=performance.now();if(!overviewPinch||now-overviewPinch.last>240)overviewPinch={started:now,last:now,total:0,blocked:(window.visualViewport?.scale||1)>1.001};
 overviewPinch.last=now;
 if(event.deltaY<=0||(window.visualViewport?.scale||1)>1.001||event.target.closest('input,textarea,[contenteditable=true],.terminal-canvas,dialog')||isBrowserOverviewOpen())overviewPinch.blocked=true;
 if(overviewPinch.blocked||now<overviewPinchCooldown)return;
 overviewPinch.total+=event.deltaY;
 if(now-overviewPinch.started>=35&&overviewPinch.total>=12){event.preventDefault();overviewPinch.blocked=true;overviewPinchCooldown=now+900;void showBrowserOverview(previousFeature==='team'?'team':selectedChatParent()?.id||'main');}
},{passive:false});

document.addEventListener('keydown',event=>{
 if(!enterSubmits(event,{allowCommand:true})||event.repeat)return;
 if(event.target.matches('[data-chat-setup-prompt]')){event.preventDefault();const button=event.target.closest('.new-chat-tab-panel')?.querySelector('[data-chat-setup-submit]');if(button&&!button.disabled)button.click();return;}
 const id=event.target.id,buttons={answer:'#reply','peer-answer':'#peer-send-answer',followup:'#continue','chat-prompt':'#dialog-submit','peer-prompt':'#dialog-submit','peer-followup':'#peer-send','search-prompt':'#dialog button[data-search-provider]'};
 if(!buttons[id])return;event.preventDefault();const button=document.querySelector(buttons[id]);if(button&&!button.disabled)button.click();
});

document.addEventListener('proteus-browser-preferences',()=>{navigate('engine','preferences');});
document.addEventListener('proteus-notice',event=>toast(event.detail));

document.addEventListener('click',event=>{const link=event.target.closest('a[href]');if(!link||!parseChatLink(link.href))return;event.preventDefault();event.stopImmediatePropagation();void openChatLink(link.href).catch(error=>toast(error.message));},true);

document.addEventListener('proteus-page-menu',async event=>{
 const {action,info}=event.detail;
 try{
  if(action==='certificate'){await showBrowserCertificate(info.id,{showDialog});return;}
  const origin=new URL(info.url).origin,profileId=info.profileId||'default';
  if(action==='clear-site'){
   if(!window.confirm('Clear website data for '+origin+'? Shared domain cookies may also sign you out of sibling sites. Chats, tabs and browsing history are kept.'))return;
   const data=await window.desktop.browser({action:'site-data-inspect',profileId,origin});
   await window.desktop.browser({action:'site-data-remove',profileId,origin,snapshot:data.snapshot,allSite:true});toast('Website data cleared. Reload the page when ready.');
  }else{state.siteDataFilter={profileId,origin};navigate('engine','website-data');}
 }catch(error){toast(error.message);}
});

document.addEventListener('proteus-account-setup',()=>{navigate('engine','setup');requestAnimationFrame(()=>{document.querySelector('#life-setup-card')?.scrollIntoView({block:'start'});document.querySelector('#life-account-refresh,#life-account-login')?.focus({preventScroll:true});});});
