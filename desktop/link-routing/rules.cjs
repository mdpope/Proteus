// Adapted from SafariSelector/Core/Config.swift (SafariSelector contributors,
// GPL-3.0-or-later): host/subdomain, glob, and host/path routing semantics.
const {webURL}=require('../external-urls.cjs');

/** Bounded shell glob matching without regex backtracking. Plain text is a substring. */
function glob(pattern,subject){
  const p=pattern.toLowerCase(),s=subject.toLowerCase();
  if(!/[*?]/.test(p))return s.includes(p);
  let i=0,j=0,star=-1,mark=0;
  while(j<s.length){
    if(p[i]==='?'||p[i]===s[j]){i++;j++;}
    else if(p[i]==='*'){star=i++;mark=j;}
    else if(star>=0){i=star+1;j=++mark;}
    else return false;
  }
  while(p[i]==='*')i++;
  return i===p.length;
}
function matches(pattern,address){
  const safe=webURL(address);if(!safe||typeof pattern!=='string'||pattern.length>2048)return false;
  let p=pattern.trim().toLowerCase().replace(/^https?:\/\//,'');if(!p)return false;
  const url=new URL(safe),host=url.hostname.toLowerCase();
  if(p.includes('/')){
    const subject=host+url.pathname.toLowerCase(),prefix=p.replace(/\/$/,'');
    return subject===prefix||subject.startsWith(prefix+'/')||(/[*?]/.test(p)&&glob(p,subject));
  }
  if(p.startsWith('*.'))return host===p.slice(2)||host.endsWith('.'+p.slice(2));
  return /[*?]/.test(p)?glob(p,host):host===p||host.endsWith('.'+p);
}
const targetKey=target=>JSON.stringify([target.hostId||'local',target.workspaceId,target.projectId]);
function routeRule(rules,url,targets){
  const rule=rules.find(rule=>rule.enabled!==false&&matches(rule.pattern,url));
  if(!rule)return {};
  // A stale first match must prompt rather than falling through to another rule.
  const target=targets.find(target=>targetKey(target)===targetKey(rule.destination));
  return {rule,target,unavailable:!target};
}
function selectWindow(contexts,target){
  const live=[...contexts].filter(ctx=>!ctx.closing&&!ctx.window.isDestroyed());
  const ordered=live.toSorted((a,b)=>Number(b.window.isFocused?.()===true)-Number(a.window.isFocused?.()===true));
  const host=target.hostId||'local',sameHost=tab=>(tab.hostId||'local')===host;
  const showing=(ctx,project)=>ctx.session?.get()?.tabs?.some(tab=>tab.type==='workspace'&&!tab.hidden&&!tab.navigationClosed&&sameHost(tab)&&tab.workspaceId===target.workspaceId&&(project?tab.projectId===target.projectId:!tab.projectId));
  return ordered.find(ctx=>showing(ctx,true))||ordered.find(ctx=>showing(ctx,false))||live.find(ctx=>ctx.id==='main')||live[0];
}
module.exports={glob,matches,targetKey,routeRule,selectWindow};
