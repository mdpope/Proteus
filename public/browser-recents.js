import { historyTimestamp, historyDevice } from './browser-home.js';
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// A URL appears once, at its latest visit, with the device that made that visit.
export function recentBrowserVisits(items, limit = 20) {
  const time = item => Date.parse(item.visitedAt || item.createdAt || item.at) || 0;
  const seen = new Set();
  return [...items].sort((a,b) => time(b)-time(a)).filter(item => {
    let url;try { url = new URL(item.url); } catch { return false; }
    if (!['http:','https:'].includes(url.protocol) || url.username || url.password || seen.has(url.href)) return false;
    seen.add(url.href);return true;
  }).slice(0,limit);
}
export function bindBrowserRecents(input, {load, navigate, overlay, timeZone, inline=false}) {
  if (!input) return;
  const controller = new AbortController(), signal = controller.signal;
  const panel = document.createElement('div');panel.className='browser-recents';panel.hidden=true;
  panel.id='browser-recents-'+crypto.randomUUID();panel.setAttribute('role','listbox');panel.setAttribute('aria-label','Recent sites');
  if(inline){panel.classList.add('browser-recents-inline');input.form.after(panel);}else document.body.append(panel);
  input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-controls',panel.id);input.setAttribute('aria-expanded','false');
  let generation=0,items=[],selected=-1,opened=false;
  const position=()=>{if(inline)return;const r=input.getBoundingClientRect();panel.style.left=Math.max(8,Math.min(r.left,innerWidth-328))+'px';panel.style.top=r.bottom+4+'px';panel.style.width=Math.min(Math.max(r.width,320),innerWidth-16)+'px';panel.style.maxHeight=Math.max(80,Math.min(360,innerHeight-r.bottom-16))+'px';};
  const close=()=>{generation++;panel.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');if(opened){opened=false;overlay?.(false);}};
  const choose=item=>{close();input.value=item.url;input.blur();navigate(item.url);};
  const paint=()=>{
    panel.innerHTML=items.map((item,i)=>`<button type="button" role="option" aria-selected="false" id="${panel.id}-${i}" data-recent-index="${i}"><strong>${escape(item.title||item.url)}</strong><span>${escape(item.url)}</span><small>${escape(historyTimestamp(item.visitedAt||item.createdAt||item.at,timeZone))} · ${escape(historyDevice(item))}</small></button>`).join('')||'<p>No recent sites yet.</p>';
    panel.querySelectorAll('button').forEach((button,i)=>{button.onpointerdown=event=>event.preventDefault();button.onclick=()=>choose(items[i]);});
    selected=-1;input.removeAttribute('aria-activedescendant');
  };
  const open=async()=>{
    if(!input.isConnected||opened)return;const version=++generation;opened=true;overlay?.(true);position();panel.hidden=false;input.setAttribute('aria-expanded','true');panel.innerHTML='<p>Loading recent sites…</p>';
    try{const values=await load();if(version!==generation||!input.isConnected)return;items=recentBrowserVisits(values);paint();}
    catch{if(version===generation)panel.innerHTML='<p>Recent sites are unavailable.</p>';}
  };
  input.addEventListener('focus',()=>{input.select();void open();},{signal});
  input.addEventListener('click',()=>void open(),{signal});
  input.addEventListener('blur',()=>{setTimeout(()=>{if(document.activeElement!==input&&!panel.contains(document.activeElement))close();},0);},{signal});
  input.addEventListener('keydown',event=>{
    if(event.key==='Escape'){close();event.stopPropagation();event.preventDefault();return;}
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){
      event.preventDefault();if(!opened){void open();return;}if(!items.length)return;
      selected=selected<0?(event.key==='ArrowDown'?0:items.length-1):(selected+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;
      panel.querySelectorAll('[role=option]').forEach((node,i)=>node.setAttribute('aria-selected',String(i===selected)));
      const node=panel.querySelectorAll('[role=option]')[selected];if(node){input.setAttribute('aria-activedescendant',node.id);node.scrollIntoView({block:'nearest'});}
    }else if(event.key==='Enter'){if(opened&&selected>=0){event.preventDefault();choose(items[selected]);}else close();}
  },{signal});
  input.addEventListener('input',()=>{selected=-1;input.removeAttribute('aria-activedescendant');panel.querySelectorAll('[role=option]').forEach(node=>node.setAttribute('aria-selected','false'));},{signal});
  document.addEventListener('pointerdown',event=>{if(event.target!==input&&!panel.contains(event.target))close();},{signal,capture:true});
  window.addEventListener('resize',position,{signal});
  // Renderers replace entire toolbars. Release native-page suppression and listeners with them.
  const observer=new MutationObserver(()=>{if(!input.isConnected){close();controller.abort();observer.disconnect();panel.remove();}});
  observer.observe(document.body,{childList:true,subtree:true});
}
export function bindDesktopBrowserRecents(input, {api, navigate, toast}) {
  const token='address-recents-'+crypto.randomUUID();
  bindBrowserRecents(input,{
    load:async()=>{const results=await Promise.allSettled([api('/api/app'),window.desktop.browser({action:'history',page:1,pageSize:100})]);
      if(results.every(result=>result.status==='rejected'))throw new Error('History unavailable');
      return results.flatMap((result,i)=>result.status==='fulfilled'?(i===0?result.value.history||[]:result.value.items||[]):[]);},
    navigate:url=>void Promise.resolve(navigate(url)).catch(error=>toast(error.message)),
    overlay:visible=>void window.desktop.browser({action:'overlay',token,visible}).catch(error=>toast(error.message))
  });
}
