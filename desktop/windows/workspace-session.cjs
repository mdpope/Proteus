const {atomicRename}=require('../../src/shared/atomic-rename.cjs');
const fs = require('node:fs');
const {normalizeChatSetupDraft}=require('./chat-setup-draft.cjs');
const path = require('node:path');
const {normalizeHistory,safeHistoryURL,MAX_ENTRIES}=require('../browser/browser-history.cjs');
const {validPendingNavigation}=require('../browser/browser-navigation.cjs');
const MAX_SESSION_BYTES=16*1024*1024, MAX_TOTAL_HISTORY_BYTES=8*1024*1024, MAX_SESSION_TABS=1000;
const safeFavicon=value=>typeof value==='string'&&value.length<=96*1024&&/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(value)?value:undefined;
const text = (value, max = 4096) => typeof value === 'string' ? value.slice(0, max) : '';
const engineSections=['desktop-control','updates','resources','providers','connections','security','account','settings','setup','preferences','integrations','usage','notifications','logs','source-library'];
function unavailableDocument(item){
 const descriptor=item.unavailableDescriptor;
 if(descriptor?.type!=='document'||!/^document:[a-f0-9]{64}$/.test(descriptor.id||'')||descriptor.id!=='document:'+descriptor.documentId)return null;
 return {unavailableDescriptor:{id:descriptor.id,type:'document',documentId:descriptor.documentId,title:text(descriptor.title,200),mediaType:descriptor.mediaType==='text/html'?'text/html':'text/markdown',...(descriptor.chatId?{chatId:text(descriptor.chatId,128)}:{})},unavailableReason:text(item.unavailableReason,1000)};
}
function normalizeTeam(value,options={},historyBudget={bytes:0}){
  if(!value||typeof value!=='object')return undefined;
  const tabs=[],seen=new Set();
  for(const item of Array.isArray(value.tabs)?value.tabs.slice(0,50):[]){
    const id=text(item?.id,256),type=['browser','terminal','markdown','unavailable','remote-document','agent-terminal'].includes(item?.type)?item.type:'browser',url=item?.url?safeHistoryURL(item.url):'';
    if(!id||seen.has(id)||item?.url&&!url)continue;seen.add(id);
    const common={...(item.hidden===true?{hidden:true}:{}),...(text(item.contentTabId,256)?{contentTabId:text(item.contentTabId,256)}:{}),...(text(item.customTitle,200)?{customTitle:text(item.customTitle,200)}:{}),...(text(item.associationChatId,256)?{associationChatId:text(item.associationChatId,256)}:{})};for(const field of ['openedAt','lastTouchedAt','lastActivityAt'])if(Number.isFinite(Date.parse(item[field])))common[field]=new Date(item[field]).toISOString();
    if(type==='agent-terminal'){if(!/^[a-zA-Z0-9_-]{1,128}$/.test(item.runId||''))continue;tabs.push({id,type,...common,title:text(item.title||item.label,200),runId:item.runId});continue;}
    if(type==='remote-document'){if(!/^[a-f0-9-]{36}$/i.test(item.hostId||'')||!/^[a-f0-9]{64}$/i.test(item.documentId||''))continue;tabs.push({id,type,...common,title:text(item.title||item.label,200),hostId:item.hostId,runId:text(item.runId,128),workspaceId:text(item.workspaceId,128),projectId:text(item.projectId,128),documentId:item.documentId,mediaType:item.mediaType==='text/html'?'text/html':'text/markdown',preview:item.preview===true});continue;}
    if(type==='unavailable'){const unavailable=unavailableDocument(item);if(!unavailable)continue;tabs.push({id,type,...common,...unavailable,title:text(item.title||item.label,200)});continue;}
    if(type==='markdown') {const file=text(item.file||item.markdown?.file);if(!path.isAbsolute(file))continue;tabs.push({id,type,...common,file,label:text(item.label,200)||path.basename(file)});continue;}
    if(type==='terminal'){if(!item.terminal?.id)continue;tabs.push({id,type,...common,label:text(item.label,200)||'Terminal',terminal:Object.fromEntries(['id','profileId','rootId','directory','persistence','tmuxSessionId','tmuxSessionTag'].map(key=>[key,text(item.terminal[key])]))});continue;}
    const savedNavigation=savedBrowserNavigation(item,options,historyBudget);
    tabs.push({id,type,...common,...savedNavigation,persist:item.persist===true,audioMuted:item.audioMuted===true,...(Number.isFinite(Date.parse(item.openedAt))?{openedAt:new Date(item.openedAt).toISOString()}:{}),profileId:/^[a-f0-9-]{36}$/i.test(item.profileId||'')?item.profileId:'default',...(text(item.customTitle,200)?{customTitle:text(item.customTitle,200)}:{}),...(text(item.contentTabId,256)?{contentTabId:text(item.contentTabId,256)}:{}),...(safeFavicon(item.favicon)?{favicon:item.favicon}:{}),browserId:text(item.browserId,128),url,title:text(item.title,200),loaded:false,...(Number.isFinite(Date.parse(item.lastTouchedAt))?{lastTouchedAt:new Date(item.lastTouchedAt).toISOString()}:{})});
  }
  const orders={};
  for(const [id,item]of Object.entries(value.orders||{}).slice(0,32)){
    if(!/^[a-zA-Z0-9_-]{1,128}$/.test(id)||!item||!Array.isArray(item.order)||item.order.length>500||item.order.some(n=>typeof n!=='string'||n.length>200))continue;
    try{new Intl.DateTimeFormat('en',{timeZone:item.timezone}).format();}catch{continue;}
    orders[id]={date:text(item.date,10),revision:Number.isSafeInteger(item.revision)&&item.revision>=0?item.revision:text(item.revision,128),rosterKey:text(item.rosterKey,50000),order:item.order.map(n=>n.trim()),instructions:text(item.instructions,10000),timezone:item.timezone,listId:text(item.listId,128)};
  }
  return {active:['overview','standup',...tabs.map(t=>t.id)].includes(value.active)?value.active:'overview',listId:text(value.listId,128),accountId:text(value.accountId,64),dock:value.dock===true,tabs,orders};
}
function sessionHistory(value, {preview=false,projects=false}={}) {
  if((preview||projects)&&Array.isArray(value?.entries)&&value.entries.length===0&&value.index===-1&&Number.isSafeInteger(value.revision)&&value.revision>=0)return {entries:[],index:-1,currentEntryId:null,revision:value.revision};
  const history=normalizeHistory(value);
  if(!(preview||projects)||!history)return history;
  // Chromium restoration deliberately accepts URL/title only. The preview's
  // saved logical history additionally needs stable entry IDs and its revision.
  // Align the sanitized, size-trimmed entries around their original selection.
  const start=Math.max(0,Math.min(value.index-Math.floor(MAX_ENTRIES/2),value.entries.length-MAX_ENTRIES));
  const candidates=value.entries.slice(start,start+MAX_ENTRIES).map((entry,index)=>({entry,index:start+index})).filter(({entry})=>safeHistoryURL(entry?.url));
  const offset=candidates.findIndex(item=>item.index===value.index)-history.index;
  const selected=candidates.slice(offset,offset+history.entries.length).map(item=>item.entry);
  if(offset<0||selected.length!==history.entries.length||selected.some((entry,index)=>typeof entry.id!=='string'||!/^[-a-zA-Z0-9_.:]{1,128}$/.test(entry.id)||safeHistoryURL(entry.url)!==history.entries[index].url)||new Set(selected.map(entry=>entry.id)).size!==selected.length)return history;
  if(value.currentEntryId!==undefined&&value.currentEntryId!==selected[history.index].id)return history;
  return {...history,entries:history.entries.map((entry,index)=>({...entry,id:selected[index].id})),...(value.currentEntryId?{currentEntryId:value.currentEntryId}:{}),...(Number.isSafeInteger(value.revision)&&value.revision>=0?{revision:value.revision}:{})};
}
// A pending local stack has not yet reached the owner. Persist it whole, or
// reject the atomic save: a bounded legacy window would lose unsent visits.
function savedBrowserNavigation(item,options,budget){
  let history,pending=false;
  if(item.navigationPending===true&&validPendingNavigation(item.history)){
    const entries=[];let bytes=0;
    for(const source of item.history.entries){
      const url=safeHistoryURL(source.url);if(!url){entries.length=0;break;}
      const entry={id:source.id,url,title:text(source.title,200),...(safeHistoryURL(source.requestedURL)?{requestedURL:safeHistoryURL(source.requestedURL)}:{})};
      bytes+=Buffer.byteLength(JSON.stringify(entry))+1;if(bytes>MAX_TOTAL_HISTORY_BYTES)throw Error('Pending browser history exceeds the workspace limit. The original record was preserved.');entries.push(entry);
    }
    if(entries.length===item.history.entries.length){history={entries,index:item.history.index,currentEntryId:item.history.currentEntryId,...(item.history.revision===undefined?{}:{revision:item.history.revision})};pending=true;}
  }
  history??=sessionHistory(item.history,options);
  if(!history)return {};
  const bytes=Buffer.byteLength(JSON.stringify(history));
  if(budget.bytes+bytes>MAX_TOTAL_HISTORY_BYTES){if(pending)throw Error('Pending browser history exceeds the workspace limit. The original record was preserved.');return {};}
  budget.bytes+=bytes;return {history,...(pending?{navigationPending:true}:{})};
}
function normalizeSession(value, options={}) {
  if(Array.isArray(value?.tabs)&&value.tabs.length>MAX_SESSION_TABS)throw new Error('Workspace has too many saved tabs. The original record was preserved.');
  const tabs = [], seen = new Set(),historyBudget={bytes:0};
  for (const item of Array.isArray(value?.tabs) ? value.tabs : []) {
    if (!item || !['overview','schedule','run','markdown','unavailable','browser','standup','omi','life','terminal','agent-terminal','remote-run','remote-document','team','engine','home','workspace'].includes(item.type)) continue;
    const tab = {id:text(item.id,256),type:item.type,label:text(item.label,200)};
    if(/^[a-zA-Z0-9_:.\-]{1,256}$/.test(item.associationChatId||''))tab.associationChatId=item.associationChatId;
    for(const field of ['openedAt','lastTouchedAt','lastActivityAt'])if(Number.isFinite(Date.parse(item[field])))tab[field]=new Date(item[field]).toISOString();
    if(item.hidden===true)tab.hidden=true;
    if(item.navigationClosed===true)tab.navigationClosed=true;
    if(item.pendingOpen===true)tab.pendingOpen=true;
    if(item.type==='unavailable'){
      const unavailable=unavailableDocument(item);if(!unavailable)continue;Object.assign(tab,unavailable);
    }
    if(item.type==='browser'){tab.persist=item.persist===true;tab.audioMuted=item.audioMuted===true;}
    if(text(item.customTitle,200))tab.customTitle=text(item.customTitle,200);
    if(text(item.contentTabId,256))tab.contentTabId=text(item.contentTabId,256);
    if(['browser','markdown','unavailable','terminal','agent-terminal','remote-document','run','remote-run'].includes(tab.type)&&typeof item.parentId==='string')tab.parentId=text(item.parentId,256);
    if (!tab.id || seen.has(tab.id) || (tab.id==='overview') !== (tab.type==='overview')) continue;
    if (tab.type === 'workspace') {
      if(!/^[a-zA-Z0-9_-]{1,128}$/.test(item.workspaceId||''))continue;
      if(item.hostId&&!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(item.hostId))continue;
      tab.workspaceId=item.workspaceId;if(item.hostId)tab.hostId=item.hostId;if(item.hostName)tab.hostName=text(item.hostName,200);
      tab.workspacePage=['configuration','tabs','projects'].includes(item.workspacePage)?item.workspacePage:'chats';
      if(/^[a-zA-Z0-9_-]{1,128}$/.test(item.projectId||'')){
        tab.projectId=item.projectId;
        if(item.projectName)tab.projectName=text(item.projectName,200);
        if(item.workspaceName)tab.workspaceName=text(item.workspaceName,200);
      }
      if(item.hidden===true)tab.hidden=true;
    if(item.navigationClosed===true)tab.navigationClosed=true;
      if(Number.isFinite(Date.parse(item.lastTouchedAt)))tab.lastTouchedAt=new Date(item.lastTouchedAt).toISOString();
    }
    if (['run','agent-terminal'].includes(tab.type) && item.runId) { if(!/^[a-zA-Z0-9_-]{1,128}$/.test(item.runId))continue;tab.runId=item.runId; }
    if (tab.type === 'remote-run') { if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(item.hostId||'')||!/^[a-zA-Z0-9_-]{1,128}$/.test(item.runId||''))continue;tab.hostId=item.hostId;tab.runId=item.runId;if(!tab.parentId)tab.id='peer:'+tab.hostId+':'+tab.runId; }
    if (tab.type === 'remote-document') {
      if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(item.hostId||'')||(!/^[a-zA-Z0-9_-]{1,128}$/.test(item.runId||'')&&!/^[a-zA-Z0-9_-]{1,128}$/.test(item.workspaceId||''))||!/^[a-f0-9]{64}$/i.test(item.documentId||''))continue;
      tab.hostId=item.hostId;tab.runId=item.runId||'';if(item.workspaceId)tab.workspaceId=text(item.workspaceId,128);if(/^[a-zA-Z0-9_-]{1,128}$/.test(item.projectId||''))tab.projectId=item.projectId;tab.documentId=item.documentId.toLowerCase();tab.parentId=tab.parentId||'peer:'+tab.hostId+':'+tab.runId;tab.id='document:'+tab.hostId+':'+(tab.projectId||tab.runId||tab.workspaceId)+':'+tab.documentId;tab.mediaType=item.mediaType==='text/html'?'text/html':'text/markdown';
      if(item.preview===true){tab.preview=true;if(text(item.previewTabId,256))tab.previewTabId=text(item.previewTabId,256);}
    }
    if (tab.type === 'markdown') { tab.file=text(item.file); if (!path.isAbsolute(tab.file)) continue; }
    if (tab.type === 'browser') {
      if(item.pendingOpen===true)tab.pendingOpen=true;
      tab.profileId=/^[a-f0-9-]{36}$/i.test(item.profileId||'')?item.profileId:'default';
      if(item.remotePreviewURL&&safeHistoryURL(item.remotePreviewURL))tab.remotePreviewURL=safeHistoryURL(item.remotePreviewURL);
      if(safeFavicon(item.favicon))tab.favicon=item.favicon;
      const savedNavigation=savedBrowserNavigation(item,options,historyBudget),history=savedNavigation.history,url=history?.entries[history.index]?.url || safeHistoryURL(item.url);
      if(item.url&&!url)continue;
      tab.url=url||'';if(!tab.url&&item.newChatDraft)tab.newChatDraft=normalizeChatSetupDraft(item.newChatDraft);tab.group=item.group==='team'?'team':'main';tab.unloaded=item.unloaded===true||item.loaded===false;if(Number.isFinite(Date.parse(item.lastTouchedAt)))tab.lastTouchedAt=new Date(item.lastTouchedAt).toISOString();
      Object.assign(tab,savedNavigation);
    }
    if (tab.type === 'terminal') {
      if(item.hostId){if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(item.hostId))continue;tab.hostId=item.hostId;}
      if (!item.terminal?.id) continue;
      tab.terminal=Object.fromEntries(['id','profileId','rootId','directory','persistence','tmuxSessionId','tmuxSessionTag'].map(key=>[key,text(item.terminal[key])]));
    }
    if(seen.has(tab.id))continue;
    seen.add(tab.id); tabs.push(tab);
  }
  const overview=tabs.findIndex(tab=>tab.type==='overview');
  if(overview<0)tabs.unshift({id:'overview',type:'overview',label:'Schedules'});
  else if(overview>0)tabs.unshift(...tabs.splice(overview,1));
  const validTabs=tabs.filter(tab=>!tab.parentId||tabs.some(parent=>parent.id===tab.parentId&&['run','remote-run','workspace'].includes(parent.type)));
  // Project roots retain their top-level view identity but are organizational
  // children of the same owner/workspace for remembered selection.
  const selectedChildren=Object.fromEntries(Object.entries(value?.selectedChildren&&typeof value.selectedChildren==='object'&&!Array.isArray(value.selectedChildren)?value.selectedChildren:{}).slice(0,MAX_SESSION_TABS).filter(([parentId,childId])=>typeof parentId==='string'&&parentId.length<=256&&typeof childId==='string'&&childId.length<=256&&validTabs.some(parent=>parent.id===parentId&&['run','remote-run','workspace'].includes(parent.type)&&validTabs.some(child=>child.id===childId&&(child.parentId===parentId||parent.type==='workspace'&&!parent.projectId&&child.type==='workspace'&&child.projectId&&child.workspaceId===parent.workspaceId&&(child.hostId||'')===(parent.hostId||''))))));
  const pages=['schedules','runs','attention','context','credentials','providers','remote','settings','team','engine','home','workspaces'];
  const chatDrafts={};let draftBytes=0;for(const [key,draftValue]of Object.entries(value?.chatDrafts&&typeof value.chatDrafts==='object'&&!Array.isArray(value.chatDrafts)?value.chatDrafts:{}).slice(-200)){if(!/^[a-zA-Z0-9_:.\-]{1,256}$/.test(key)||typeof draftValue!=='string')continue;const draft=draftValue.slice(0,100000),bytes=Buffer.byteLength(draft);if(draftBytes+bytes>500000)continue;chatDrafts[key]=draft;draftBytes+=bytes;}
  const team=normalizeTeam(value?.team,options,historyBudget);
  return {schemaVersion:1,...(options.windowId?{windowId:options.windowId}:{}),...(options.sharedTeam?{sharedTeam:true}:{}),chatDrafts,tabs:validTabs,selectedChildren,active:validTabs.some(tab=>tab.id===value?.active&&!tab.hidden)?value.active:'overview',page:pages.includes(value?.page)?value.page:'home',...(team?{team}:{}),...([...engineSections,'windows','palette'].includes(value?.engineSection)?{engineSection:value.engineSection}:{})};
}
class WorkspaceSession {
  constructor(home,options={}) { this.options=options;this.file=options.windowId&&options.windowId!=='main'?path.join(home,'window-sessions',options.windowId+'.json'):path.join(home,'desktop-workspace.json'); this.last=''; }
  normalize(value) { return normalizeSession((this.options.projects||this.options.preview)&&this.options.remap?this.options.remap(value):value,this.options); }
  get() { try { if(fs.statSync(this.file).size>MAX_SESSION_BYTES)throw new Error('Workspace record exceeds size limit');return this.normalize(JSON.parse(fs.readFileSync(this.file,'utf8'))); } catch(error) { if(error.code==='ENOENT')return null; throw new Error('Saved desktop workspace could not be read. The original file was preserved.'); } }
  save(value) {
    const clean=this.normalize(value), json=JSON.stringify(clean,null,2)+'\n';
    if(Buffer.byteLength(json)>MAX_SESSION_BYTES)throw new Error('Workspace record exceeds size limit.');
    if(json===this.last)return clean;
    const temporary=this.file+'.tmp';fs.mkdirSync(path.dirname(this.file),{recursive:true});fs.writeFileSync(temporary,json,{mode:0o600});fs.chmodSync(temporary,0o600);atomicRename(temporary,this.file);this.last=json;return clean;
  }
}
module.exports={WorkspaceSession,normalizeSession};
