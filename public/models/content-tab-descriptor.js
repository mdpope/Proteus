// Portable descriptor semantics shared by the renderer and host. Runtime state is local.
// Several window-local view IDs can represent one owner descriptor. Count that
// identity once when comparing order with a deduplicated synchronization snapshot.
export const contentTabOrder=ids=>[...new Set(ids.filter(Boolean))];
// Saved renderer checkpoints must retain the document's original chat binding,
// including after its presentation moves into a project or Team surface.
export function documentSessionMetadata(tab){
 return {file:tab.markdown?.file||tab.file,...(tab.associationChatId?{associationChatId:tab.associationChatId}:{})};
}
export function windowContentTabId(tab){
 if(['run','remote-run'].includes(tab.type))return 'chat:'+(tab.runId||tab.chatId||(tab.contentTabId?.startsWith('chat:')?tab.contentTabId.slice(5):tab.id.replace(/^chat:/,'')));
 if(tab.type==='terminal')return 'terminal:'+tab.terminal?.id;
 return tab.contentTabId||tab.id;
}
// Retain historical aliases in saved state, but expose one shared tab per
// logical identity. Its selected native view remains local to this window.
export function contentTabViews(tabs,active){
 const views=new Map();
 for(const tab of tabs){const id=windowContentTabId(tab);if(!views.has(id)||tab.id===active)views.set(id,tab);}
 return [...views.values()];
}
export const contentTabTitle=value=>typeof value==='string'?value.replace(/[\x00-\x1f\x7f]/g,'').slice(0,200):'';
export function safeContentTabURL(value,appOrigin){
  if(typeof value!=='string'||!value||value.length>4096)return null;
  try{
    const url=new URL(value);if(url.href.length>4096)return null;
    if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.origin===appOrigin)return null;
    return url.href;
  }catch{return null;}
}
export function normalizeContentTabHistory(value){
  if(Array.isArray(value?.entries)&&value.entries.length===0&&value.index===-1&&Number.isSafeInteger(value.revision)&&value.revision>=0)return {entries:[],index:-1,currentEntryId:null,revision:value.revision};
  if(!Array.isArray(value?.entries)||!Number.isInteger(value.index)||value.index<0||value.index>=value.entries.length)return undefined;
  const start=0;
  if(!safeContentTabURL(value.entries[value.index]?.url))return undefined;
  const entries=[];let index=-1;
  for(let i=start;i<value.entries.length;i++){
    const item=value.entries[i],url=safeContentTabURL(item?.url);if(!url)continue;
    if(i===value.index)index=entries.length;
    entries.push({...(typeof item.id==='string'&&/^[a-zA-Z0-9_:.-]{1,256}$/.test(item.id)?{id:item.id}:{}),url,title:typeof item.title==='string'?item.title.slice(0,200):'',...(safeContentTabURL(item.requestedURL)?{requestedURL:safeContentTabURL(item.requestedURL)}:{})});
  }
  if(index<0)return undefined;
  return {entries,index,...(Number.isSafeInteger(value.revision)?{revision:value.revision}:{}),...(entries[index]?.id?{currentEntryId:entries[index].id}:{})};
}
// Validation remains at the host boundary. Keep invalid URL values distinct so a
// newly invalid edit still reaches that boundary instead of disappearing as a no-op.
export function normalizeContentTabDescriptor(value){
  if(!value)return value;
  const tab={id:value.id,type:value.type,title:contentTabTitle(value.title)||'New tab'};
  Object.assign(tab,contentTabMetadata(value));
  const customTitle=contentTabTitle(value.customTitle);if(customTitle)tab.customTitle=customTitle;
  if(tab.type==='browser'){
    if(value.setup?.kind==='chat'||value.setup?.kind==='internet')tab.setup={kind:value.setup.kind};
    if(value.profileId&&value.profileId!=='default')tab.profileId=value.profileId;
    tab.url=value.url?(safeContentTabURL(value.url)??value.url):'';
    const history=normalizeContentTabHistory(value.history);
    if(history&&(!history.entries.length||history.entries[history.index]?.url===tab.url))tab.history=history;
  }else if(tab.type==='chat'){tab.chatId=value.chatId;tab.id='chat:'+value.chatId;}
  else if(tab.type==='terminal'){tab.terminalId=value.terminalId;tab.id='terminal:'+value.terminalId;}
  else if(tab.type==='document'){
    tab.documentId=value.documentId;tab.id='document:'+value.documentId;
    if(/^[a-zA-Z0-9_:.\-]{1,256}$/.test(value.chatId||''))tab.chatId=value.chatId;
    tab.mediaType=value.mediaType==='text/html'?'text/html':'text/markdown';
  }
  return tab;
}
export function contentTabMetadata(value){
 const metadata={};
 if(/^[a-zA-Z0-9_:.\-]{1,256}$/.test(value?.associationChatId||''))metadata.associationChatId=value.associationChatId;
 for(const field of ['openedAt','lastTouchedAt','lastActivityAt'])if(typeof value?.[field]==='string'&&Number.isFinite(Date.parse(value[field])))metadata[field]=new Date(value[field]).toISOString();
 if(value?.hidden===true)metadata.hidden=true;
 if(value?.type==='browser'&&value.persist===true)metadata.persist=true;
 if(typeof value?.favicon==='string'&&value.favicon.length<=16384&&/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(value.favicon))metadata.favicon=value.favicon;
 return metadata;
}
export const sameContentTab=(left,right)=>JSON.stringify(normalizeContentTabDescriptor(left))===JSON.stringify(normalizeContentTabDescriptor(right));
export const sameContentTabs=(left,right)=>left.length===right.length&&left.every((tab,index)=>sameContentTab(tab,right[index]));

// Accept only proof of the exact pending selection and its complete ordered
// branch. Title/activity updates during I/O must not hide that acknowledgement.
export function acknowledgesBrowserNavigation(local,remote){
 if(local?.type!=='browser'||remote?.type!=='browser'||!local.navigationPending||local.url!==remote.url||(local.profileId||'default')!==(remote.profileId||'default'))return false;
 const pending=normalizeContentTabHistory(local.history),saved=normalizeContentTabHistory(remote.history);
 if(!pending?.entries.length||!saved||pending.currentEntryId!==saved.currentEntryId||!Number.isSafeInteger(saved.revision)||(pending.revision??0)>saved.revision)return false;
 const positions=new Map(saved.entries.map((entry,index)=>[entry.id,{entry,index}]));let prior=-1;
 return pending.entries.every(entry=>{const found=positions.get(entry.id);if(!entry.id||!found||found.index<=prior||found.entry.url!==entry.url)return false;prior=found.index;return true;});
}

// Observing a mirrored view is not a new interaction. Older cached timestamps and
// absent icon fields must not undo metadata received from another client. Recency is
// shown at minute granularity: publishing every scroll tick wrote to the owner and made
// every client read the tab list again while a person was only reading a page.
const activityPublishMs=60_000;
export function mergeContentTabMetadata(previous,incoming){
 if(!previous)return incoming;
 const tab={...incoming};
 if(previous.openedAt)tab.openedAt=previous.openedAt;
 if(previous.lastTouchedAt&&!(Date.parse(incoming.lastTouchedAt)>=Date.parse(previous.lastTouchedAt)+activityPublishMs))tab.lastTouchedAt=previous.lastTouchedAt;
 if(previous.lastActivityAt&&!(Date.parse(incoming.lastActivityAt)>=Date.parse(previous.lastActivityAt)+activityPublishMs))tab.lastActivityAt=previous.lastActivityAt;
 if(previous.favicon&&!incoming.favicon)tab.favicon=previous.favicon;
 return tab;
}
