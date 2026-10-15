// Portable descriptor semantics shared by the renderer and host. Runtime state is local.
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
    if(value.profileId&&value.profileId!=='default')tab.profileId=value.profileId;
    tab.url=value.url?(safeContentTabURL(value.url)??value.url):'';
    const history=normalizeContentTabHistory(value.history);
    if(history&&history.entries[history.index].url===tab.url)tab.history=history;
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
 for(const field of ['openedAt','lastTouchedAt'])if(typeof value?.[field]==='string'&&Number.isFinite(Date.parse(value[field])))metadata[field]=new Date(value[field]).toISOString();
 if(value?.hidden===true)metadata.hidden=true;
 if(value?.type==='browser'&&value.persist===true)metadata.persist=true;
 if(typeof value?.favicon==='string'&&value.favicon.length<=16384&&/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(value.favicon))metadata.favicon=value.favicon;
 return metadata;
}
export const sameContentTab=(left,right)=>JSON.stringify(normalizeContentTabDescriptor(left))===JSON.stringify(normalizeContentTabDescriptor(right));
export const sameContentTabs=(left,right)=>left.length===right.length&&left.every((tab,index)=>sameContentTab(tab,right[index]));
