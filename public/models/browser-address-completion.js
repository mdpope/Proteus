// Completion only offers retained website origins, never paths, queries or titles.
export function addressCompletionPrefix(raw) {
  const text=String(raw||'');if(!text||text.length>1024||text.trim()!==text||/[\s@\\?#]/u.test(text))return null;
  const scheme=text.match(/^(https?:\/\/)/i)?.[0]||'',host=text.slice(scheme.length);
  if(!host||/[\/]/.test(host)||(!scheme&&/^[a-z][a-z0-9+.-]*:/i.test(host)&&!/^[-\w.]+:\d*$/.test(host)))return null;
  return {text,scheme:scheme.toLowerCase(),host:host.toLowerCase(),www:/^www\./i.test(host)};
}
export function websiteBaseURL(raw) {
  try{const url=new URL(raw);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)return null;return url.origin+'/';}catch{return null;}
}
export function browserAddressCompletion(raw,sites=[]) {
  const prefix=addressCompletionPrefix(raw);if(!prefix)return null;
  for(const site of sites){
    const base=websiteBaseURL(site.url);if(!base)continue;const url=new URL(base);
    if(prefix.scheme&&url.protocol+'//'!==prefix.scheme)continue;
    const hosts=[url.host,...(site.displayHost?[site.displayHost]:[])];
    for(const host of hosts){const displayHost=prefix.www?host:host.replace(/^www\./i,'');const display=(prefix.scheme?url.protocol+'//':'')+displayHost+'/';
      if(display.toLowerCase().startsWith(prefix.text.toLowerCase())&&display.length>prefix.text.length)return {url:base,value:base,suffix:display.slice(prefix.text.length)};
    }
  }
  return null;
}
