import {addTabIcons} from '../../shared/navigation/add-tab-menu.js';
import {focusNewTabAddress} from './new-tab-input.js';
const engines={google:'https://www.google.com/search?q=',duckduckgo:'https://duckduckgo.com/?q=',bing:'https://www.bing.com/search?q='};
export const browserSearchEngines={google:'Google',duckduckgo:'DuckDuckGo',bing:'Bing'};
export function browserDefaultEngine(){try{const value=globalThis.localStorage?.getItem('proteus-browser-search-engine');return engines[value]?value:'google';}catch{return 'google';}}
export function setBrowserDefaultEngine(value){if(!engines[value])throw new Error('Unknown search engine.');globalThis.localStorage?.setItem('proteus-browser-search-engine',value);}
const HISTORY_PAGE_SIZE=25;
export function browserTarget(raw,engine=browserDefaultEngine()){
  const value=String(raw||'').trim();if(!value)throw new Error('Enter a website or search.');
  if(/\s/.test(value)&&!value.includes('://'))return engines[engine]+encodeURIComponent(value);
  if(/^(file|javascript|data|blob|about|chrome|devtools|proteus):/i.test(value)||/[@\\]/.test(value)||value.startsWith('/')||value.startsWith('.'))throw new Error('Only HTTP and HTTPS websites can open here.');
  const candidate=/^https?:\/\//i.test(value)?value:'https://'+value;
  let parsed;try{parsed=new URL(candidate);}catch{if(/^[^\s./:]+$/.test(value))return engines[engine]+encodeURIComponent(value);throw new Error('Enter a valid website or search.');}
  if(!['http:','https:'].includes(parsed.protocol)||parsed.username||parsed.password||!parsed.hostname)throw new Error('Enter an HTTP or HTTPS website without credentials.');
  const host=parsed.hostname;
  if(!host.includes('.')&&host!=='localhost'&&!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)&&!host.startsWith('[')){
    if(!/[/:?#]/.test(value))return engines[engine]+encodeURIComponent(value);
    throw new Error('Enter a valid hostname.');
  }
  if(/(?:token|code|secret|key|auth|invite|pair)/i.test(parsed.searchParams.toString())&&!/^https?:\/\//i.test(value))throw new Error('Paste the full trusted website URL to open a link with credentials.');
  return parsed.href;
}
export function searchTarget(query,engine=browserDefaultEngine()){if(!engines[engine])throw new Error('Unknown search engine.');const value=String(query||'').trim();if(!value)throw new Error('Enter a search.');return engines[engine]+encodeURIComponent(value);}
export function historyTimestamp(value,timeZone){
  const date=new Date(value);if(!value||!Number.isFinite(date.getTime()))return 'Unknown time';
  return new Intl.DateTimeFormat(undefined,{year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short',...(timeZone?{timeZone}:{})}).format(date);
}
export function historyDevice(item){return String(item.deviceName||'').trim()||'Unknown device';}
export async function renderBrowserHome(area,options){
  const escape=options.escape;
  let identity,shared=[];
  let localCursor=null,localLoaded=false,query='',generation=0,loadingMore=false;
  let shownHistoryIds=new Set();
  const act=fn=>async event=>{event?.preventDefault();try{await fn(event);}catch(error){options.toast(error.message);}};
  area.classList.add('browser-home');
  area.innerHTML=`<div class="browser-home-inner"><h1>New tab</h1><div class="new-tab-actions">${(options.actions||[]).map((action,index)=>`<button type="button" data-new-tab-action="${index}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">${addTabIcons[action.icon]||addTabIcons.browser}</svg><span>${escape(action.label)}</span></button>`).join('')}</div><form id="browser-home-search"><input id="browser-home-query" type="search" placeholder="Search the web" aria-label="Search the web"><div class="actions"><button data-engine="google" class="primary">Google</button><button data-engine="duckduckgo">DuckDuckGo</button><button data-engine="bing">Bing</button></div></form><form id="browser-home-address"><label>Website address<input id="browser-home-url" placeholder="https://example.com" aria-label="Website address"></label><button aria-label="Open address" title="Open address">↵</button></form><section><h2>Shared links</h2><div id="browser-shared-links">Loading shared links…</div><form id="browser-link-form"><div class="row"><label>Name<input id="browser-link-title" required maxlength="100"></label><label>URL<input id="browser-link-url" type="url" required></label></div><button>Add shared link</button></form></section><div class="heading"><h2>Proteus history</h2></div><p class="note">Proteus visits retained on this computer, including visits received through configured synchronization. System browser history is never imported.</p><div class="history-toolbar"><label><input id="history-enabled" type="checkbox" checked> Retain history</label><select id="history-retention" aria-label="History retention"><option value="0">Keep all history</option><option value="7">7 days</option><option value="30">30 days</option><option value="90" selected>90 days</option><option value="365">365 days</option></select><button id="history-clear">Clear history</button></div><div id="browser-home-history"></div><p id="browser-history-error" class="note" role="alert" hidden></p><button id="browser-history-more" type="button" aria-label="More Proteus history" hidden>More</button></div>`;
  const root=area.firstElementChild;
  const active=()=>area.isConnected&&area.firstElementChild===root;
  const find=selector=>area.querySelector(selector);
  area.querySelectorAll('[data-new-tab-action]').forEach(button=>button.onclick=act(()=>options.actions[Number(button.dataset.newTabAction)].run()));
  find('#browser-home-search').onsubmit=act(event=>options.navigate(searchTarget(find('#browser-home-query').value,event.submitter?.dataset.engine||browserDefaultEngine())));
  find('#browser-home-address').onsubmit=act(()=>options.navigate(browserTarget(find('#browser-home-url').value)));
  const links=async()=>{try{const value=await options.api('/api/app');if(!active())return;identity=value.identity;shared=value.links||[];find('#browser-shared-links').innerHTML=shared.map((link,i)=>`<div class="browser-shared-link"><button data-link-open="${i}">${escape(link.title||link.url)}</button><button data-link-remove="${i}" aria-label="Remove ${escape(link.title||'link')}">×</button></div>`).join('')||'<p class="note">No shared links yet.</p>';find('#browser-link-form').hidden=false;area.querySelectorAll('[data-link-open]').forEach(button=>button.onclick=act(()=>options.navigate(browserTarget(shared[Number(button.dataset.linkOpen)].url))));area.querySelectorAll('[data-link-remove]').forEach(button=>button.onclick=act(async()=>{const link=shared[Number(button.dataset.linkRemove)];await options.api('/api/app',{path:'/links/'+link.id,method:'DELETE',body:{expectedRevision:link.revision},identity});await links();}));}catch(error){if(active()){find('#browser-shared-links').textContent=error.message+' Connect your Proteus account in App Setup.';find('#browser-link-form').hidden=true;}}};
  find('#browser-link-form').onsubmit=act(async()=>{await options.api('/api/app',{path:'/links',method:'POST',body:{title:find('#browser-link-title').value,url:browserTarget(find('#browser-link-url').value)},identity});find('#browser-link-form').reset();await links();});
  const load=async(reset=false)=>{
    if(reset){generation++;localCursor=null;localLoaded=false;loadingMore=false;find('#browser-history-more').hidden=true;}
    else if(loadingMore||!localLoaded)return;
    const version=generation,requestedQuery=query;
    const more=find('#browser-history-more'),errorNode=find('#browser-history-error');
    if(!reset){loadingMore=true;more.disabled=true;}
    errorNode.hidden=true;
    try{
      const value=await options.api('/api/browser-history',{action:'query',query:requestedQuery,profileId:options.profileId||'default',limit:HISTORY_PAGE_SIZE,...(!reset&&localCursor?{cursor:localCursor}:{})});
      if(!active()||version!==generation)return;
      const rows=value.items||[],host=find('#browser-home-history');
      if(reset){host.innerHTML='';shownHistoryIds=new Set();}
      const fresh=rows.filter(item=>{const key=String(item.eventId||item.id);if(shownHistoryIds.has(key))return false;shownHistoryIds.add(key);return true;});
      host.insertAdjacentHTML('beforeend',fresh.map(item=>`<div class="browser-shared-link"><button class="browser-history-row" data-history-url="${escape(item.url)}"><strong>${escape(item.title||item.url)}</strong><span>${escape(item.url)}</span><time>${escape(historyTimestamp(item.visitedAt||item.at))}</time></button><button data-history-delete="${escape(item.eventId||item.id)}" aria-label="Delete history entry">×</button></div>`).join(''));
      if(reset&&!rows.length)host.innerHTML='<p class="note">No retained visits match this filter.</p>';
      host.querySelectorAll('[data-history-url]').forEach(button=>button.onclick=act(()=>options.navigate(button.dataset.historyUrl)));
      host.querySelectorAll('[data-history-delete]').forEach(button=>button.onclick=act(async()=>{await options.api('/api/browser-history',{action:'delete',eventIds:[button.dataset.historyDelete]});await load(true);}));
      find('#history-enabled').checked=value.enabled;
      find('#history-retention').value=value.retentionDays;
      localLoaded=true;localCursor=value.nextCursor;
      more.hidden=!value.hasMore;
    }catch(error){
      if(!active()||version!==generation)return;
      if(reset)find('#browser-home-history').textContent=error.message;
      else{errorNode.textContent=error.message;errorNode.hidden=false;}
    }finally{
      if(version===generation){loadingMore=false;more.disabled=false;}
    }
  };
  let filterTimer;find('#browser-home-url').oninput=event=>{query=event.target.value;clearTimeout(filterTimer);filterTimer=setTimeout(()=>{if(active())void load(true);},150);};
  find('#browser-history-more').onclick=()=>{void load();};
  const saveHistory=act(async()=>{await options.api('/api/browser-history',{action:'settings',enabled:find('#history-enabled').checked,retentionDays:Number(find('#history-retention').value)});await load(true);});find('#history-enabled').onchange=saveHistory;find('#history-retention').onchange=saveHistory;
  find('#history-clear').onclick=()=>{if(options.showDialog){options.showDialog('<h2>Clear this profile’s history?</h2><p>This deletes retained visits for this profile and propagates removal to configured peers.</p><button id="close-dialog">Cancel</button><button id="dialog-submit">Clear history</button>',async()=>{await options.api('/api/browser-history',{action:'delete',all:true,profileId:options.profileId||'default'});await load(true);});}else if(window.confirm('Clear retained Proteus history on this computer?'))void options.api('/api/browser-history',{action:'delete',all:true,profileId:options.profileId||'default'}).then(()=>load(true));};
  focusNewTabAddress(find('#browser-home-url'),options.tabId);
  await Promise.allSettled([load(true),links()]);
}
