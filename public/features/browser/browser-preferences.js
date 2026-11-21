import {mountSystemMedia,mountSiteMedia} from './conference-preferences.js';
import {showSitePermissionRows} from './site-permission-rows.js';
import {mountApplePasswords,mountBitwardenBiometrics} from './password-autofill.js';
import {mountLinkRoutingPreferences} from './link-routing-preferences.js';
import {browserSearchEngines,browserDefaultEngine,setBrowserDefaultEngine} from './browser-home.js';

function mountBrowserDNS(ui, container, settings) {
 const section = document.createElement('section');
 section.className = 'card';
 section.innerHTML = `<h2>Browser DNS</h2>
 <form>
   <label>Resolver<select name="mode"><option value="system">Use machine settings</option><option value="secure">Use encrypted DNS</option></select></label>
   <label data-dns-endpoint>DNS-over-HTTPS endpoint<input name="endpoint" type="url" placeholder="https://resolver.example/dns-query" maxlength="2048"></label>
   <p class="note">Applies after restarting Proteus to all desktop browser profiles on this computer, including Incognito. Machine settings use your system resolver and its VPN or encryption settings. Encrypted DNS uses the specified HTTPS endpoint without falling back to the system resolver for browser queries.</p>
   <button type="submit">Save DNS settings</button>
 </form>`;
 const form = section.querySelector('form');
 const { mode, endpoint } = form.elements;
 const button = section.querySelector('button');
 mode.value = settings.browser?.dns?.mode === 'secure' ? 'secure' : 'system';
 endpoint.value = settings.browser?.dns?.endpoint ?? '';
 const updateEndpoint = () => {
  const encrypted = mode.value === 'secure';
  endpoint.closest('label').hidden = !encrypted;
  endpoint.disabled = !encrypted;
  endpoint.required = encrypted;
 };
 mode.addEventListener('change', updateEndpoint);
 updateEndpoint();
 form.onsubmit = async event => {
  event.preventDefault();
  const dns = mode.value === 'secure'
   ? { mode: mode.value, endpoint: endpoint.value.trim() }
   : { mode: mode.value };
  button.disabled = true;
  try {
   const fresh = (await ui.api('/api/state?summaries=1')).settings;
   await ui.api('/api/settings', { settings: { ...fresh, browser: { ...fresh.browser, dns } }, expectedRevision: fresh.revision });
   ui.toast('Browser DNS settings saved. Restart Proteus to apply.');
  } catch (error) {
   ui.toast(error.message);
  } finally {
   button.disabled = false;
  }
 };
 container.append(section);
}

function mountNotificationPreferences(target, profile, api, notify) {
 const form = document.createElement('form');
 form.className='site-permission-form';
 form.innerHTML = `<label>Website origin<input name="origin" type="url" required placeholder="https://workspace.example"></label>
 <label>Notifications<select name="permission"><option value="ask">Ask</option><option value="allow">Allow</option><option value="block">Block</option></select></label>
 <button type="submit">Save notification permission</button>`;
 const { origin, permission } = form.elements;
 const list=document.createElement('ul');
 list.className='site-permission-rows';
 const note=document.createElement('p');
 note.className='note';
 note.textContent='Removing a rule restores Ask. Reload the site if it still shows the old setting.';
 let saved=new Map();
 const save=async (site,choice)=>{
  const state=await api('/api/browser-profiles',{action:'notification-permission',id:profile.id,origin:site,permission:choice});
  paint(state.items.find(item=>item.id===profile.id));
  notify(choice==='ask'?'Notification rule removed.':'Notification permission saved.');
 };
 function paint(value){
  saved=new Map((value?.settings?.notifications||[]).filter(item=>item.permission!=='ask').map(item=>[item.origin,item.permission]));
  showSitePermissionRows(list,[...saved].map(([origin,permission])=>({origin,permission,label:'Notification'})),{
   edit:row=>{origin.value=row.origin;permission.value=row.permission;origin.focus();},
   remove:row=>save(row.origin,'ask'),notify,focus:()=>{if(list.hidden)origin.focus();else list.querySelector('button').focus();},
  });
  origin.onchange();
 }
 origin.onchange = () => { permission.value = saved.get(origin.value.trim()) || 'ask'; };
 form.onsubmit = async event => {
  event.preventDefault();
  const button = form.querySelector('button');
  button.disabled = true;
  try {
   const site=new URL(origin.value.trim());
   await save(site.href,permission.value);
   origin.value=site.origin;
   origin.onchange();
  } catch (error) {
   notify(error.message);
  } finally {
   button.disabled = false;
  }
 };
 target.append(list,form,note);
 paint(profile);
 return paint;
}

function mountExtensionLibrary(container,profileId,refresh,notify) {
 if(!window.desktop?.browser)return;
 const details=document.createElement('details');
 details.innerHTML='<summary>Local extension library</summary><p class="note">Reuse a package with a stable identity from another profile. Each profile reviews permissions and sets up its own accounts and desktop-helper access.</p><div data-library-results role="status"></div>';
 const area=details.querySelector('[data-library-results]');
 const command=args=>window.desktop.browser({profileId,...args});
 const display=async()=>{
  area.textContent='Checking installed packages…';
  try{
   const rows=await command({action:'extensions-library'});
   if(!details.isConnected)return;
   area.replaceChildren();
   if(!rows.length){area.textContent='No reusable packages in other profiles.';return;}
   for(const row of rows){
    const line=document.createElement('div');line.className='resource-row';
    const name=document.createElement('span');name.textContent=`${row.name} · ${row.version} · ${row.sourceName}`;
    const button=document.createElement('button');button.type='button';
    button.textContent=row.installed?'Installed here':'Install here…';button.disabled=row.installed;
    button.onclick=async()=>{
     button.disabled=true;
     try{await command({action:'extensions-library-install',extensionId:row.id,digest:row.digest});await refresh();await display();}
     catch(error){notify(error.message);button.disabled=false;}
    };
    line.append(name,button);area.append(line);
   }
  }catch(error){area.textContent=error.message;}
 };
 details.addEventListener('toggle',()=>{if(details.open)void display();});
 container.append(details);
}

function preferenceTabs(container){
 const sections=[['general','General'],['profiles','Profiles & Extensions'],['links','Link Picker'],['permissions','Site Permissions'],['security','Security & DNS'],['filtering','Content Filtering']];
 const active=container.dataset.browserPreferenceTab||'general',bar=document.createElement('div'),panels={},tabs=[];
 bar.className='browser-preference-tabs';bar.setAttribute('role','tablist');bar.setAttribute('aria-label','Browser Preferences');
 const choose=(id,focus=false)=>{
  container.dataset.browserPreferenceTab=id;
  for(const [key,tab] of tabs){
   const selected=key===id;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;
   panels[key].hidden=!selected;
   if(selected&&focus)tab.focus();
  }
 };
 container.replaceChildren(bar);
 for(const [id,label] of sections){
  const tab=document.createElement('button'),panel=document.createElement('section');
  tab.type='button';tab.textContent=label;tab.id='browser-preferences-tab-'+id;tab.setAttribute('role','tab');
  tab.setAttribute('aria-controls','browser-preferences-panel-'+id);tab.onclick=()=>choose(id);
  panel.id='browser-preferences-panel-'+id;panel.className='engine-card-stack browser-preference-panel';
  panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',tab.id);panels[id]=panel;
  tabs.push([id,tab]);bar.append(tab);container.append(panel);
 }
 bar.onkeydown=event=>{
  const index=tabs.findIndex(([,tab])=>tab===event.target);
  if(index<0)return;
  const move={ArrowLeft:(index+tabs.length-1)%tabs.length,ArrowRight:(index+1)%tabs.length,Home:0,End:tabs.length-1}[event.key];
  if(move===undefined)return;
  event.preventDefault();choose(tabs[move][0],true);
 };
 choose(panels[active]?active:'general');
 return panels;
}

export async function renderBrowserPreferences(ui,container){
 container.classList.add('engine-card-stack');
 const state=await ui.api('/api/browser-profiles');if(!container.isConnected)return;
 const perform=async value=>{await ui.api('/api/browser-profiles',value);await renderBrowserPreferences(ui,container);window.dispatchEvent(new Event('proteus:profiles-changed'));};
 const panels=preferenceTabs(container),e=ui.escape;panels.profiles.innerHTML=`<section class="card"><h2>Browser profiles</h2><p>Default keeps this device’s existing browsing data. Additional profiles sync their names and settings through your Proteus account. Each device signs in to websites independently.</p><label class="checkbox-row"><input data-profile-sync type="checkbox" ${state.enabled?'checked':''} ${state.authenticated?'':'disabled'}>Enable additional profiles and sync settings</label><p class="note" data-profile-account-status>${state.authenticated?'Proteus account connected. Enable profiles to sync their names and settings.':'Connect or refresh your Proteus account in App settings. A saved session can be refreshed without signing out.'}</p><button data-profile-account>Review Proteus account</button><button data-profile-refresh>Refresh profiles</button>${state.cached?'<p class="note" role="status">Showing cached profiles for this account. Refresh before changing shared definitions.</p>':''}${state.error?'<p class="banner">'+e(state.error)+'</p>':''}<div>${state.items.map(profile=>`<div class="resource-row"><strong>${e(profile.name)}</strong>${profile.id==='default'?'':`<div class="actions"><button data-profile-rename="${e(profile.id)}">Rename</button><button data-profile-delete="${e(profile.id)}">Remove definition</button></div>`}</div>`).join('')}</div>${state.available?'<label>New profile name<input data-profile-name maxlength="80"></label><button data-profile-add>Add profile</button>':''}<p class="note">Removing a definition does not erase this device’s stored website data.</p></section>`;
 const search=document.createElement('section');search.className='card';search.innerHTML='<h2>Web search</h2><label>Default search engine<select data-search-engine>'+Object.entries(browserSearchEngines).map(([id,name])=>`<option value="${id}" ${id===browserDefaultEngine()?'selected':''}>${name}</option>`).join('')+'</select></label><p class="note">Used when you press Enter in a browser address field on this device. Choosing another search suggestion does not change this default.</p>';panels.general.append(search);search.querySelector('select').onchange=event=>{try{setBrowserDefaultEngine(event.target.value);ui.toast('Default search engine saved.');}catch(error){ui.toast(error.message);}};
 if(container.browserLinks)panels.links.append(container.browserLinks);
 void mountLinkRoutingPreferences(ui,panels.links).catch(error=>ui.toast(error.message));
 mountSystemMedia(panels.permissions,ui.toast);
 if(window.desktop){
  const current=(await ui.api('/api/state?summaries=1')).settings;
  if(!container.isConnected)return;
  mountBrowserDNS(ui, panels.security, current);
  const retention=document.createElement('section');retention.className='card';
  retention.innerHTML=`<h2>Loaded browser tabs</h2><label>Ordinary tabs kept loaded<input data-loaded-tab-limit type="number" min="1" max="256" step="1" value="${e(current.browser?.loadedTabLimit??6)}"></label><p class="note">This computer only. Higher values use more RAM. The default is 6. Recently used, active, audible, downloading, agent-controlled, and Persisted tabs remain protected; this is an automatic-unload budget, not a hard memory ceiling. Increasing it does not load unopened tabs.</p><button data-save-loaded-tab-limit>Save loaded-tab limit</button>`;
  panels.general.append(retention);retention.querySelector('button').onclick=async event=>{const input=retention.querySelector('input');if(!input.reportValidity())return;event.target.disabled=true;try{const fresh=(await ui.api('/api/state?summaries=1')).settings;await ui.api('/api/settings',{settings:{...fresh,browser:{...fresh.browser,loadedTabLimit:Number(input.value)}},expectedRevision:fresh.revision});ui.toast('Loaded-tab limit saved for this computer.');}catch(error){ui.toast(error.message);}finally{event.target.disabled=false;}};
 }
 if(window.desktop?.browser){const downloads=await window.desktop.browser({action:'downloads-list'}),section=document.createElement('section');section.className='card';section.innerHTML=`<h2>Downloads</h2><p class="note">Files download on this computer. Save as lets you choose a location for one file.</p><div class="filepath">${e(downloads.settings.directory)}</div><div class="actions"><button data-download-folder>Open Downloads folder</button><button data-download-configure>Choose download folder…</button><button data-download-default>Use default Downloads</button></div>`;panels.general.append(section);section.querySelector('[data-download-folder]').onclick=()=>void window.desktop.browser({action:'downloads-folder'}).catch(error=>ui.toast(error.message));section.querySelector('[data-download-configure]').onclick=async()=>{try{const folders=await window.desktop.choosePaths({kind:'folder'});if(folders[0]){await window.desktop.browser({action:'downloads-settings',directory:folders[0]});await renderBrowserPreferences(ui,container);}}catch(error){ui.toast(error.message);}};section.querySelector('[data-download-default]').onclick=async()=>{try{await window.desktop.browser({action:'downloads-settings',directory:downloads.settings.defaultDirectory});await renderBrowserPreferences(ui,container);}catch(error){ui.toast(error.message);}};}
 for(const profile of state.items){
 const filtering=document.createElement('section');filtering.className='card';
 filtering.innerHTML=`<h2>${e(profile.name)}</h2><label class="checkbox-row"><input data-blocking type="checkbox" ${profile.settings?.blockingEnabled!==false?'checked':''}>Block ads and trackers with Ghostery</label><label>Paused website origins · one per line<textarea data-exceptions>${e((profile.settings?.exceptions||[]).join('\n'))}</textarea></label><button data-save-privacy>Save filtering settings</button>`;
 panels.filtering.append(filtering);
 filtering.querySelector('[data-save-privacy]').onclick=()=>void (async()=>{
  const latest=(await ui.api('/api/browser-profiles')).items.find(item=>item.id===profile.id);
  if(!latest)throw Error('This browser profile is unavailable.');
  await perform({action:'settings',id:profile.id,settings:{...latest.settings,blockingEnabled:filtering.querySelector('[data-blocking]').checked,exceptions:filtering.querySelector('[data-exceptions]').value.split('\n').map(s=>s.trim()).filter(Boolean)}});
 })().catch(error=>ui.toast(error.message));
 const permission=document.createElement('section');permission.className='card site-permission-card';
 permission.innerHTML=`<h2>${e(profile.name)} website permissions</h2><section class="site-permission-group" data-sites><h3>Website notifications</h3></section><section class="site-permission-group" data-media><h3>Microphone and camera</h3></section>`;
 panels.permissions.append(permission);
 mountNotificationPreferences(permission.querySelector('[data-sites]'),profile,ui.api,ui.toast);
 mountSiteMedia(permission.querySelector('[data-media]'),profile.id,ui.toast);
 const section=document.createElement('section');section.className='card';section.innerHTML=`<h2>${e(profile.name)} extensions</h2><p class="note">Choose a password manager extension for each profile. Bitwarden and Apple Passwords use their own unlock and approval prompts.</p><div data-bitwarden-panel></div><div data-apple-passwords-panel></div><div data-extensions></div><div class="actions"><button data-open-store>Open Chrome Web Store</button><button data-install-store>Install from Chrome Web Store…</button><button data-install-extension>Install unpacked extension…</button></div><p class="note" data-extension-status role="status">On a store detail page, use Extensions → Install extension beside Go.</p>`;panels.profiles.append(section);
 const extensions=section.querySelector('[data-extensions]');const load=async()=>{const rows=await window.desktop?.browser({action:'extensions-list',profileId:profile.id});if(!extensions.isConnected)return;extensions.replaceChildren();for(const row of rows||[]){const article=document.createElement('div');article.className='resource-row';const name=document.createElement('span');name.textContent=row.name+' · '+row.version+(row.error?' · '+row.error:'');article.append(name);if(row.icon){const icon=document.createElement('img');icon.src=row.icon;icon.alt='';icon.className='extension-preference-icon';name.before(icon);}
 const pin=document.createElement('label');pin.className='checkbox-row';const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=row.toolbar;checkbox.setAttribute('aria-label','Show '+row.name+' in toolbar');pin.append(checkbox,document.createTextNode('Show in toolbar'));checkbox.onchange=async()=>{checkbox.disabled=true;try{await window.desktop.browser({action:'extensions-toolbar',profileId:profile.id,extensionId:row.id,pinned:checkbox.checked});await load();}catch(error){checkbox.checked=row.toolbar;ui.toast(error.message);}finally{checkbox.disabled=false;}};article.append(pin);
 for(const [offset,label] of [[-1,'Move left'],[1,'Move right']]){const button=document.createElement('button');button.textContent=offset<0?'←':'→';button.title=label;button.setAttribute('aria-label',label+' · '+row.name);const index=rows.indexOf(row);button.disabled=index+offset<0||index+offset>=rows.length;button.onclick=async()=>{const ids=rows.map(item=>item.id);[ids[index],ids[index+offset]]=[ids[index+offset],ids[index]];button.disabled=true;try{await window.desktop.browser({action:'extensions-order',profileId:profile.id,ids});await load();}catch(error){ui.toast(error.message);await load();}};article.append(button);}
 for(const [action,label] of [['enable',row.enabled?'Disable':'Enable'],['options','Options'],[row.store?'store-update':'update',row.store?'Update from store':'Update from folder…'],['remove','Remove']]){const button=document.createElement('button');button.textContent=label;button.onclick=async()=>{try{await window.desktop.browser({action:'extensions-'+action,profileId:profile.id,extensionId:row.id,enabled:!row.enabled});await load();}catch(error){ui.toast(error.message);}};article.append(button);}extensions.append(article);}};void load().catch(error=>extensions.textContent=error.message);mountExtensionLibrary(section,profile.id,load,ui.toast);void mountBitwardenBiometrics(section.querySelector('[data-bitwarden-panel]'),{profileId:profile.id,refresh:load,notify:ui.toast});void mountApplePasswords(section.querySelector('[data-apple-passwords-panel]'),{profileId:profile.id,refresh:load,notify:ui.toast});section.querySelector('[data-open-store]').onclick=()=>void window.desktop?.browser({action:'extensions-store-browse',profileId:profile.id}).catch(error=>ui.toast(error.message));section.querySelector('[data-install-store]').onclick=async()=>{const url=window.prompt('Paste the Chrome Web Store extension link');if(!url)return;const status=section.querySelector('[data-extension-status]'),button=section.querySelector('[data-install-store]');button.disabled=true;status.textContent='Downloading extension and preparing permission review…';try{await window.desktop.browser({action:'extensions-store-install',profileId:profile.id,url});await load();status.textContent='Store request finished. Installed extensions appear above.';}catch(error){status.textContent=error.message;ui.toast(error.message);}finally{button.disabled=false;}};section.querySelector('[data-install-extension]').onclick=()=>void window.desktop?.browser({action:'extensions-install',profileId:profile.id}).then(load).catch(error=>ui.toast(error.message));
 }
 if(window.desktop){const filters=document.createElement('section');filters.className='card';filters.innerHTML='<h2>Filter lists</h2><p>Ghostery ads and tracking protection</p><p data-filter-status role="status"></p><button data-filter-update>Download / update filters</button>';panels.filtering.prepend(filters);const status=filters.querySelector('[data-filter-status]'),button=filters.querySelector('button');const update=async action=>{button.disabled=action==='filters-update';if(button.disabled)status.textContent='Updating Ghostery filters…';try{const value=await window.desktop.browser({action});if(filters.isConnected)status.textContent=(value.updating?'Updating… ':value.ready?'Active filters · Last updated '+new Date(value.updatedAt).toLocaleString():'Filters have not been downloaded.')+(value.error?' Last update failed: '+value.error:'');}catch(error){status.textContent='Update failed: '+error.message+' Previous downloaded filters remain active. Retry when connected.';throw error;}finally{button.disabled=false;}};void update('filters-status').catch(error=>ui.toast(error.message));button.onclick=()=>void update('filters-update').catch(error=>ui.toast(error.message));}
 container.querySelector('[data-profile-account]').onclick=()=>document.dispatchEvent(new CustomEvent('proteus-account-setup'));
 const checkAccount=async()=>{if(!panels.profiles.isConnected){window.removeEventListener('focus',checkAccount);return;}try{const next=await ui.api('/api/browser-profiles');if(!container.isConnected)return;const checkbox=container.querySelector('[data-profile-sync]');checkbox.disabled=!next.authenticated;checkbox.checked=next.enabled;container.querySelector('[data-profile-account-status]').textContent=next.authenticated?'Proteus account connected. Enable profiles to sync their names and settings.':'Connect or refresh your Proteus account in App settings. A saved session can be refreshed without signing out.';}catch(error){ui.toast(error.message);}};window.addEventListener('focus',checkAccount);
 container.querySelector('[data-profile-sync]').onchange=event=>void perform({action:'enable',enabled:event.target.checked}).catch(error=>ui.toast(error.message));
 container.querySelector('[data-profile-refresh]').onclick=()=>void perform({action:'refresh'}).catch(error=>ui.toast(error.message));
 container.querySelector('[data-profile-add]')?.addEventListener('click',()=>void perform({action:'save',name:container.querySelector('[data-profile-name]').value.trim()}).catch(error=>ui.toast(error.message)));
 for(const action of ['rename','delete'])container.querySelectorAll('[data-profile-'+action+']').forEach(button=>button.onclick=async()=>{const profile=state.items.find(item=>item.id===button.getAttribute('data-profile-'+action));if(action==='rename'){const name=window.prompt('Profile name',profile.name);if(!name)return;try{await perform({action:'save',id:profile.id,name,settings:profile.settings,expectedRevision:profile.revision});}catch(error){ui.toast(error.message);}}else if(window.confirm('Remove this profile definition from your account? Stored website data remains on each device.'))try{await perform({action:'delete',id:profile.id,expectedRevision:profile.revision});}catch(error){ui.toast(error.message);}});
}
