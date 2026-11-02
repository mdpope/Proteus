import {savedSiteIcon} from './browser-icons.js';
import {bindAddressCompletion} from './address-completion.js';
import { historyTimestamp, historyDevice, browserDefaultEngine, browserSearchEngines, searchTarget } from './browser-home.js';
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// A URL appears once, at its latest visit, with the device that made that visit.
export function recentBrowserVisits(items, limit = 20, query = '') {
  const time = item => Date.parse(item.visitedAt || item.createdAt || item.at) || 0;
  const seen = new Set(),term=String(query).trim().toLocaleLowerCase();
  return [...items].sort((a,b) => time(b)-time(a)).filter(item => {
    let url;try { url = new URL(item.url); } catch { return false; }
    if (!['http:','https:'].includes(url.protocol) || url.username || url.password || seen.has(url.href)) return false;
    seen.add(url.href);return true;
  }).filter(item=>!term||(String(item.title||'')+' '+item.url).toLocaleLowerCase().includes(term)).slice(0,limit);
}
export function bindBrowserRecents(input, {load, navigate, overlay, timeZone, inline=false, native,completion}) {
  if (!input) return;
  const controller = new AbortController(), signal = controller.signal;
  const panel = document.createElement('div');panel.className='browser-recents';panel.hidden=true;
  panel.id='browser-recents-'+crypto.randomUUID();panel.setAttribute('role','listbox');panel.setAttribute('aria-label','Recent sites');
  if(inline){panel.classList.add('browser-recents-inline');input.form.after(panel);}else document.body.append(panel);
  input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-controls',panel.id);input.setAttribute('aria-expanded','false');
  let generation=0,items=[],visits=[],selected=-1,opened=false,reloadTimer;
  const position=()=>{if(native){publish();return;}if(inline)return;const r=input.getBoundingClientRect();panel.style.left=Math.max(8,Math.min(r.left,innerWidth-328))+'px';panel.style.top=r.bottom+4+'px';panel.style.width=Math.min(Math.max(r.width,320),innerWidth-16)+'px';panel.style.maxHeight=Math.max(80,Math.min(360,innerHeight-r.bottom-16))+'px';};
  const publish=()=>{if(!native||!opened)return;const r=input.getBoundingClientRect();native({visible:true,items:items.map(item=>({...item,detail:item.search?'Web search':historyTimestamp(item.visitedAt||item.createdAt||item.at,timeZone)+' · '+historyDevice(item)})),selected,x:r.left,y:r.bottom+4,width:r.width});};
  const close=()=>{clearTimeout(reloadTimer);generation++;native?.({visible:false});panel.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');if(opened){opened=false;overlay?.(false);}};
  const choose=item=>{close();input.value=item.url;input.blur();navigate(item.url);};
  const paint=()=>{
    const query=input.value.trim(),defaultEngine=browserDefaultEngine();
    const choices=/\s/.test(query)&&!/^https?:\/\//i.test(query)?Object.keys(browserSearchEngines).sort((a,b)=>Number(b===defaultEngine)-Number(a===defaultEngine)).map(engine=>({url:searchTarget(query,engine),title:'Search with '+browserSearchEngines[engine]+(engine===defaultEngine?' · Default':''),search:true})):[];
    items=[...choices,...recentBrowserVisits(visits,20,query)];
    panel.innerHTML=items.map((item,i)=>`<button type="button" role="option" aria-selected="false" id="${panel.id}-${i}" data-recent-index="${i}">${savedSiteIcon(item,escape)}<div class="browser-recent-copy"><strong>${escape(item.title||item.url)}</strong><span>${escape(item.url)}</span><small>${item.search?'Web search':escape(historyTimestamp(item.visitedAt||item.createdAt||item.at,timeZone))+' · '+escape(historyDevice(item))}</small></div></button>`).join('')||(query?'<p>No matching recent sites. Press Enter to search.</p>':'<p>No recent sites yet.</p>');
    panel.querySelectorAll('button').forEach((button,i)=>{button.onpointerdown=event=>event.preventDefault();button.onclick=()=>choose(items[i]);});
    selected=-1;input.removeAttribute('aria-activedescendant');publish();
  };
  const refresh=async()=>{
    const version=++generation;
    try{const values=await load(input.value.trim());if(version!==generation||!opened||!input.isConnected)return;visits=values;paint();}
    catch{if(version===generation&&opened&&!items.length)panel.innerHTML='<p>Recent sites are unavailable. You can still enter a website or search.</p>';}
  };
  const open=async()=>{
    if(!input.isConnected||opened)return;opened=true;overlay?.(true);position();panel.hidden=!!native;input.setAttribute('aria-expanded','true');paint();await refresh();
  };
  if(completion)bindAddressCompletion(input,{load:completion,navigate:url=>choose({url}),disabled:()=>selected>=0});
  input.addEventListener('focus',()=>{input.select();void open();},{signal});
  input.addEventListener('click',()=>void open(),{signal});
  input.addEventListener('blur',()=>{setTimeout(()=>{if(document.activeElement!==input&&!panel.contains(document.activeElement))close();},0);},{signal});
  input.addEventListener('keydown',event=>{
    if(event.isComposing||event.keyCode===229)return;
    if(event.key==='Escape'){close();event.stopPropagation();event.preventDefault();return;}
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){
      event.preventDefault();if(!opened){void open();return;}if(!items.length)return;
      selected=selected<0?(event.key==='ArrowDown'?0:items.length-1):(selected+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;
      panel.querySelectorAll('[role=option]').forEach((node,i)=>node.setAttribute('aria-selected',String(i===selected)));
      const node=panel.querySelectorAll('[role=option]')[selected];if(node){input.setAttribute('aria-activedescendant',node.id);node.scrollIntoView({block:'nearest'});}publish();
    }else if(event.key==='Enter'){if(opened&&selected>=0){event.preventDefault();choose(items[selected]);}else close();}
  },{signal});
  input.addEventListener('input',()=>{if(!opened){void open();return;}generation++;paint();clearTimeout(reloadTimer);reloadTimer=setTimeout(()=>void refresh(),100);},{signal});
  document.addEventListener('pointerdown',event=>{if(event.target!==input&&!panel.contains(event.target))close();},{signal,capture:true});
  window.addEventListener('resize',position,{signal});
  window.addEventListener('blur',close,{signal});
  // Renderers replace entire toolbars. Release native-page suppression and listeners with them.
  const observer=new MutationObserver(()=>{if(!input.isConnected){close();controller.abort();observer.disconnect();panel.remove();}});
  observer.observe(document.body,{childList:true,subtree:true});
}
export function bindDesktopBrowserRecents(input, {api, navigate, toast, profileId='default'}) {
  const token='address-recents-'+crypto.randomUUID();
  const unsubscribe=window.desktop.onBrowserAction(value=>{if(value.type==='address-choice'&&value.token===token&&input.isConnected){input.value=value.url;input.blur();void Promise.resolve(navigate(value.url)).catch(error=>toast(error.message));}});
  const cleanup=new MutationObserver(()=>{if(!input.isConnected){unsubscribe();cleanup.disconnect();}});cleanup.observe(document.body,{childList:true,subtree:true});
  bindBrowserRecents(input,{
    completion:async query=>{const profile=typeof profileId==='function'?profileId():profileId;return (await api('/api/browser-history',{action:'suggest',query,profileId:profile,limit:100})).items||[];},
    load:async query=>{const profile=typeof profileId==='function'?profileId():profileId;const result=await api('/api/browser-history',{action:'query',query,profileId:profile,limit:100});return result.items||[];},
    navigate:url=>void Promise.resolve(navigate(url)).catch(error=>toast(error.message)),
    native:value=>void window.desktop.browser({action:'address-suggestions',token,...value}).catch(error=>toast(error.message))
  });
}
