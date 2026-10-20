const {randomUUID}=require('node:crypto');
const {safeHistoryURL}=require('./browser-history.cjs');
// Portable logical navigation is independent of Chromium's reconstructed page stack.
function restoreNavigation(value,appOrigin){
  if(Array.isArray(value?.entries)&&value.entries.length===0&&value.index===-1&&Number.isSafeInteger(value.revision)&&value.revision>=0)return {entries:[],index:-1,currentEntryId:null,revision:value.revision};
  if(!Array.isArray(value?.entries)||!Number.isInteger(value.index)||!value.entries[value.index])return null;
  const entries=value.entries.map(item=>({id:item.id||randomUUID(),url:safeHistoryURL(item.url,appOrigin),title:String(item.title||'').slice(0,200),...(safeHistoryURL(item.requestedURL,appOrigin)?{requestedURL:safeHistoryURL(item.requestedURL,appOrigin)}:{})}));
  if(entries.some(item=>!item.url))return null;
  return {entries,index:value.index,currentEntryId:entries[value.index].id,...(Number.isSafeInteger(value.revision)?{revision:value.revision}:{})};
}
function commitNavigation(tab,url,title,{redirect=false,force=false}={}){
  url=safeHistoryURL(url);if(!url)return null;
  const prior=tab.logicalHistory,current=prior?.entries[prior.index];
  if(tab.applyingShared&&(!redirect||current?.url===url)){if(current?.url===url)current.title=String(title||current.title).slice(0,200);return null;}

  if(current?.url===url&&!force){current.title=String(title||current.title).slice(0,200);return null;}
  const entry={id:tab.pendingEntryId||randomUUID(),url,title:String(title||'').slice(0,200)};tab.pendingEntryId=null;tab.navigationPending=true;
  const entries=[...(prior?.entries.slice(0,prior.index+1)||[]),entry];
  tab.logicalHistory={entries,index:entries.length-1,currentEntryId:entry.id,...(Number.isSafeInteger(prior?.revision)?{revision:prior.revision}:{})};return entry;
}
function traverseNavigation(tab,index){const history=tab.logicalHistory;if(!history?.entries[index])return null;tab.navigationPending=true;history.index=index;history.currentEntryId=history.entries[index].id;return history.entries[index];}
module.exports={restoreNavigation,commitNavigation,traverseNavigation};
