const {randomUUID}=require('node:crypto');
const {safeHistoryURL}=require('./browser-history.cjs');
function validPendingNavigation(history){
  return Array.isArray(history?.entries)&&history.entries.length>0&&Number.isSafeInteger(history.index)&&history.index>=0&&history.index<history.entries.length&&history.currentEntryId===history.entries[history.index]?.id&&(history.revision===undefined||Number.isSafeInteger(history.revision)&&history.revision>=0)&&history.entries.every(entry=>typeof entry?.id==='string'&&/^[-a-zA-Z0-9_.:]{1,128}$/.test(entry.id))&&new Set(history.entries.map(entry=>entry.id)).size===history.entries.length;
}
function acknowledgesNavigation(pending,history){
  if(!validPendingNavigation(pending)||!history||history.currentEntryId!==pending.currentEntryId)return false;
  const positions=new Map(history.entries.map((entry,index)=>[entry.id,{entry,index}]));let prior=-1;
  for(const entry of pending.entries){const found=positions.get(entry.id);if(!found||found.index<=prior||found.entry.url!==entry.url)return false;prior=found.index;}
  return true;
}
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
module.exports={restoreNavigation,commitNavigation,traverseNavigation,validPendingNavigation,acknowledgesNavigation};
