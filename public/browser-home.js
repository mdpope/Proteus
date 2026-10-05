const engines={google:'https://www.google.com/search?q=',duckduckgo:'https://duckduckgo.com/?q=',bing:'https://www.bing.com/search?q='};
const HISTORY_PAGE_SIZE=25;
const SHARED_HISTORY_PAGE_SIZE=25;
export function browserTarget(raw,engine='google'){
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
export function searchTarget(query,engine='google'){if(!engines[engine])throw new Error('Unknown search engine.');const value=String(query||'').trim();if(!value)throw new Error('Enter a search.');return engines[engine]+encodeURIComponent(value);}
export async function renderBrowserHome(area,options){
  const escape=options.escape;
  let identity,shared=[],sharedHistory=[],sharedCount=SHARED_HISTORY_PAGE_SIZE;
  let localPage=0,query='',generation=0,loadingMore=false;
  let shownHistoryIds=new Set();
  const act=fn=>async event=>{event?.preventDefault();try{await fn(event);}catch(error){options.toast(error.message);}};
  area.classList.add('browser-home');
  area.innerHTML=`<div class="browser-home-inner"><h1>New browser tab</h1><form id="browser-home-search"><input id="browser-home-query" type="search" placeholder="Search the web" aria-label="Search the web"><div class="actions"><button data-engine="google" class="primary">Google</button><button data-engine="duckduckgo">DuckDuckGo</button><button data-engine="bing">Bing</button></div></form><form id="browser-home-address"><label>Website address<input id="browser-home-url" placeholder="https://example.com" aria-label="Website address"></label><button>Open website</button></form><section><h2>Shared links</h2><div id="browser-shared-links">Loading shared links…</div><form id="browser-link-form"><div class="row"><label>Name<input id="browser-link-title" required maxlength="100"></label><label>URL<input id="browser-link-url" type="url" required></label></div><button>Add shared link</button></form><h3>Recent shared visits</h3><div id="browser-shared-history"></div><button id="browser-shared-more" type="button" aria-label="More shared visits" hidden>More</button></section><div class="heading"><h2>Proteus history</h2><input id="browser-history-filter" type="search" placeholder="Filter saved history" aria-label="Filter Proteus history"></div><p class="note">Visits from this Mac’s Proteus browser. System browser history is never imported.</p><div class="history-toolbar"><label><input id="history-enabled" type="checkbox" checked> Retain history</label><select id="history-retention" aria-label="History retention"><option value="7">7 days</option><option value="30">30 days</option><option value="90" selected>90 days</option><option value="365">365 days</option></select><button id="history-clear">Clear history</button></div><div id="browser-home-history"></div><p id="browser-history-error" class="note" role="alert" hidden></p><button id="browser-history-more" type="button" aria-label="More Proteus history" hidden>More</button></div>`;
  const root=area.firstElementChild;
  const active=()=>area.isConnected&&area.firstElementChild===root;
  const find=selector=>area.querySelector(selector);
  find('#browser-home-search').onsubmit=act(event=>options.navigate(searchTarget(find('#browser-home-query').value,event.submitter?.dataset.engine||'google')));
  find('#browser-home-address').onsubmit=act(()=>options.navigate(browserTarget(find('#browser-home-url').value)));
  const renderSharedHistory=()=>{
    find('#browser-shared-history').innerHTML=sharedHistory.slice(0,sharedCount).map(item=>`<button class="browser-history-row" data-shared-history-url="${escape(item.url)}"><strong>${escape(item.title||item.url)}</strong><span>${escape(item.url)} · ${escape(item.source||'Shared')}</span><time>${escape(options.time(item.updatedAt||item.createdAt))}</time></button>`).join('')||'<p class="note">No shared visits yet.</p>';
    find('#browser-shared-more').hidden=sharedCount>=sharedHistory.length;
    find('#browser-shared-history').querySelectorAll('[data-shared-history-url]').forEach(button=>button.onclick=act(()=>options.navigate(browserTarget(button.dataset.sharedHistoryUrl))));
  };
  find('#browser-shared-more').onclick=()=>{sharedCount+=SHARED_HISTORY_PAGE_SIZE;renderSharedHistory();};
  const links=async()=>{try{const value=await options.api('/api/app');if(!active())return;identity=value.identity;shared=value.links||[];sharedHistory=value.history||[];sharedCount=SHARED_HISTORY_PAGE_SIZE;renderSharedHistory();find('#browser-shared-links').innerHTML=shared.map((link,i)=>`<div class="browser-shared-link"><button data-link-open="${i}">${escape(link.title||link.url)}</button><button data-link-remove="${i}" aria-label="Remove ${escape(link.title||'link')}">×</button></div>`).join('')||'<p class="note">No shared links yet.</p>';find('#browser-link-form').hidden=false;area.querySelectorAll('[data-link-open]').forEach(button=>button.onclick=act(()=>options.navigate(browserTarget(shared[Number(button.dataset.linkOpen)].url))));area.querySelectorAll('[data-link-remove]').forEach(button=>button.onclick=act(async()=>{const link=shared[Number(button.dataset.linkRemove)];await options.api('/api/app',{path:'/links/'+link.id,method:'DELETE',body:{expectedRevision:link.revision},identity});await links();}));}catch(error){if(active()){find('#browser-shared-links').textContent=error.message+' Connect your Proteus account in App Setup.';find('#browser-link-form').hidden=true;}}};
  find('#browser-link-form').onsubmit=act(async()=>{await options.api('/api/app',{path:'/links',method:'POST',body:{title:find('#browser-link-title').value,url:browserTarget(find('#browser-link-url').value)},identity});find('#browser-link-form').reset();await links();});
  const load=async(reset=false)=>{
    if(reset){generation++;localPage=0;loadingMore=false;find('#browser-history-more').hidden=true;}
    else if(loadingMore||!localPage)return;
    const version=generation,requestedPage=localPage+1,requestedQuery=query;
    const more=find('#browser-history-more'),errorNode=find('#browser-history-error');
    if(!reset){loadingMore=true;more.disabled=true;}
    errorNode.hidden=true;
    try{
      const value=await options.browser({action:'history',query:requestedQuery,page:requestedPage,pageSize:HISTORY_PAGE_SIZE});
      if(!active()||version!==generation)return;
      const rows=value.items||[],host=find('#browser-home-history');
      if(reset){host.innerHTML='';shownHistoryIds=new Set();}
      const fresh=rows.filter(item=>{const key=String(item.id);if(shownHistoryIds.has(key))return false;shownHistoryIds.add(key);return true;});
      host.insertAdjacentHTML('beforeend',fresh.map(item=>`<div class="browser-shared-link"><button class="browser-history-row" data-history-url="${escape(item.url)}"><strong>${escape(item.title||item.url)}</strong><span>${escape(item.url)}</span><time>${escape(options.time(item.visitedAt||item.at))}</time></button><button data-history-delete="${escape(item.id)}" aria-label="Delete history entry">×</button></div>`).join(''));
      if(reset&&!rows.length)host.innerHTML='<p class="note">No retained visits match this filter.</p>';
      host.querySelectorAll('[data-history-url]').forEach(button=>button.onclick=act(()=>options.navigate(button.dataset.historyUrl)));
      host.querySelectorAll('[data-history-delete]').forEach(button=>button.onclick=act(async()=>{await options.browser({action:'history-delete',id:button.dataset.historyDelete});await load(true);}));
      find('#history-enabled').checked=value.enabled;
      find('#history-retention').value=value.retentionDays;
      localPage=requestedPage;
      more.hidden=requestedPage*(value.pageSize||50)>=(value.total||0);
    }catch(error){
      if(!active()||version!==generation)return;
      if(reset)find('#browser-home-history').textContent=error.message;
      else{errorNode.textContent=error.message;errorNode.hidden=false;}
    }finally{
      if(version===generation){loadingMore=false;more.disabled=false;}
    }
  };
  find('#browser-history-filter').oninput=event=>{query=event.target.value;void load(true);};
  find('#browser-history-more').onclick=()=>{void load();};
  const saveHistory=act(async()=>{await options.browser({action:'history-settings',enabled:find('#history-enabled').checked,retentionDays:Number(find('#history-retention').value)});await load(true);});find('#history-enabled').onchange=saveHistory;find('#history-retention').onchange=saveHistory;
  find('#history-clear').onclick=()=>{if(options.showDialog){options.showDialog('<h2>Clear Proteus history?</h2><p>This deletes retained visits on this Mac.</p><button id="close-dialog">Cancel</button><button id="dialog-submit">Clear history</button>',async()=>{await options.browser({action:'history-clear'});await load(true);});}else if(window.confirm('Clear retained Proteus history on this Mac?'))void options.browser({action:'history-clear'}).then(()=>load(true));};
  await Promise.allSettled([load(true),links()]);
}
