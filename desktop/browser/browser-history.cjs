// Deliberately omit Chromium pageState: it can contain forms, POST bodies and secrets.
const MAX_ENTRIES=50, MAX_URL=4096, MAX_TITLE=200, MAX_HISTORY_BYTES=32*1024;
function safeHistoryURL(value, appOrigin) {
  if(typeof value!=='string'||!value||value.length>MAX_URL)return null;
  try {
    const url=new URL(value);if(url.href.length>4096)return null;
    if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.origin===appOrigin)return null;
    // The operator explicitly retains full redirect URLs, including login/query/fragment
    // destinations. Engine pageState, POST bodies and URL userinfo remain excluded.
    return url.href;
  } catch {return null;}
}
// Login progress belongs to the live native view even though its URLs are retained.
function isAuthenticationURL(value){
  try{const url=new URL(value);return /(?:oauth|authorize|callback|sign[-_]?in|login|reset|token)(?:\/|$)/i.test(url.pathname)||[...url.searchParams.keys(),...new URLSearchParams(url.hash.slice(1)).keys()].some(key=>/^(?:access_token|id_token|refresh_token|token|password|passwd|secret|api[_-]?key|authorization|code|pair|pairing|session|signature|sig|cookie|signed[-_]?cookie)$/i.test(key));}catch{return false;}
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
    entries.push({url,title:typeof item.title==='string'?item.title.slice(0,MAX_TITLE):'',...(safeHistoryURL(item.requestedURL,appOrigin)?{requestedURL:safeHistoryURL(item.requestedURL,appOrigin)}:{})});
  }
  // Trim farthest entries first, retaining current page and both directions where possible.
  while(Buffer.byteLength(JSON.stringify({entries,index}))>MAX_HISTORY_BYTES&&entries.length>1){
    if(index>=(entries.length-1-index)){entries.shift();index--;}else entries.pop();
  }
  return {entries,index};
}
module.exports={normalizeHistory,safeHistoryURL,isAuthenticationURL,MAX_ENTRIES,MAX_HISTORY_BYTES};
