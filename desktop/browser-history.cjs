// Deliberately omit Chromium pageState: it can contain forms, POST bodies and secrets.
const MAX_ENTRIES=50, MAX_URL=4096, MAX_TITLE=200, MAX_HISTORY_BYTES=32*1024;
function safeHistoryURL(value, appOrigin) {
  if(typeof value!=='string'||!value||value.length>MAX_URL)return null;
  try {
    const url=new URL(value);
    if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.origin===appOrigin)return null;
    // Authentication callbacks must be revisited through the site's normal login flow.
    const sensitive=/^(?:access_token|id_token|refresh_token|token|password|passwd|secret|api[_-]?key|authorization|code)$/i;
    if([...url.searchParams.keys()].some(key=>sensitive.test(key)))return null;
    const fragment=url.hash.slice(1);if(fragment.includes('=')&&[...new URLSearchParams(fragment).keys()].some(key=>sensitive.test(key)))return null;
    return url.href;
  } catch {return null;}
}
function normalizeHistory(value,appOrigin) {
  if(!Array.isArray(value?.entries)||!Number.isInteger(value.index)||value.index<0||value.index>=value.entries.length)return undefined;
  const start=Math.max(0,Math.min(value.index-Math.floor(MAX_ENTRIES/2),value.entries.length-MAX_ENTRIES));
  const selected=value.entries[value.index],activeURL=safeHistoryURL(selected?.url,appOrigin);
  if(!activeURL)return undefined;
  const entries=[];let index=-1;
  for(let i=start;i<Math.min(value.entries.length,start+MAX_ENTRIES);i++) {
    const item=value.entries[i],url=safeHistoryURL(item?.url,appOrigin);if(!url)continue;
    if(i===value.index)index=entries.length;
    entries.push({url,title:typeof item.title==='string'?item.title.slice(0,MAX_TITLE):''});
  }
  // Trim farthest entries first, retaining current page and both directions where possible.
  while(Buffer.byteLength(JSON.stringify({entries,index}))>MAX_HISTORY_BYTES&&entries.length>1){
    if(index>=(entries.length-1-index)){entries.shift();index--;}else entries.pop();
  }
  return {entries,index};
}
module.exports={normalizeHistory,safeHistoryURL,MAX_ENTRIES,MAX_HISTORY_BYTES};
