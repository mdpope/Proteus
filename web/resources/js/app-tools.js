import { bindBrowserRecents } from '../../../public/browser-recents.js';
import { standupLinksMarkup, bindStandupOrder } from '../../../public/standup-links.js';
import {appRequest,escapeHTML as e,externalLink,dateTime,localDateTime,recordBrowserVisit,defaultMacRequest,defaultMacStatus,updateDefaultMac,retryDefaultMac} from './shared-app.js';
import {BrowserDestinationStore} from './remote-client.js';
import {usagePanel} from './remote-usage.js';
const engineTabs=['resources','connections','setup','usage','notifications','logs'];
const engineTabFromURL=()=>{const tab=new URLSearchParams(location.search).get('tab');return engineTabs.includes(tab)?tab:'resources';};
const teamStorageKey='proteus.team-child-tabs.v1.'+document.body.dataset.browserAccount;
let savedTeam={};try{savedTeam=JSON.parse(localStorage.getItem(teamStorageKey)||'{}');}catch{}
let state,teamTab=['overview','standup','browser'].includes(savedTeam.active)?savedTeam.active:'overview',teamBrowserOpen=savedTeam.browser===true,engineTab=engineTabFromURL(),engineRenderVersion=0,selectedList='',usage;
if(teamTab==='browser'&&!teamBrowserOpen)teamTab='overview';
const saveTeamTabs=()=>{try{localStorage.setItem(teamStorageKey,JSON.stringify({tabs:['overview','standup',...(teamBrowserOpen?['browser']:[])],active:teamTab,browser:teamBrowserOpen}));}catch{}};
const notice=message=>{const n=document.querySelector('#shared-notice');if(n)n.textContent=message;};
const action=callback=>async event=>{event?.preventDefault();try{await callback(event);notice('');}catch(error){notice(error.message);}};
async function reload(){state=await appRequest();window.proteusPreferences=state.preferences;render();}
function listLinks(links){return links.map(link=>`<p>${externalLink(link.url,link.title)} <button data-delete-link="${e(link.id)}" aria-label="Remove ${e(link.title)}">×</button></p>`).join('')||'<p>No shared links yet.</p>';}
function dailyOrder(list){
    const day=new Intl.DateTimeFormat('en-CA',{timeZone:list.timezone||state.preferences.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    let seed=2166136261;for(const c of list.id+day)seed=Math.imul(seed^c.charCodeAt(0),16777619)>>>0;
    const random=list.members.filter(m=>m.mode==='random');for(let i=random.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[random[i],random[j]]=[random[j],random[i]];}
    let index=0;return list.members.map(member=>member.mode==='fixed'?member:random[index++]);
}
function renderTeam(){
    document.querySelectorAll('[data-team-tab]').forEach(button=>button.classList.toggle('selected',button.dataset.teamTab===teamTab));
    const browserTab=document.querySelector('[data-team-tab="browser"]');if(browserTab)browserTab.hidden=!teamBrowserOpen;
    const host=document.querySelector('#team-content');if(!host)return;
    const list=state.teamLists.find(x=>x.id===selectedList)||state.teamLists[0];selectedList=list?.id||'';
    const overview=`<section class="card"><h2>Lists</h2>${state.teamLists.map(x=>`<button data-select-list="${e(x.id)}">${e(x.name)} · ${x.members.length}</button>`).join('')}<button id="team-new">New list</button></section><section class="card"><h2>${list?'Edit list':'Create a list'}</h2><form id="team-form"><label>Name<input name="name" required maxlength="100" value="${e(list?.name||'')}"></label><label>Instructions<textarea name="instructions" maxlength="4000">${e(list?.instructions||'')}</textarea></label><label>Time zone<input name="timezone" value="${e(list?.timezone||state.preferences.timezone)}" required></label><label>People, one per line; prefix fixed positions with !<textarea name="members" rows="8">${e(list?.members.map(x=>(x.mode==='fixed'?'! ':'')+x.name).join('\n')||'')}</textarea></label><button class="primary">Save shared list</button>${list?'<button id="team-delete" type="button">Delete list</button>':''}</form></section>${standupLinksCard(list)}`;
    const standup=list?`<section class="card standup-panel"><header><h2>${e(list.name)}</h2><button id="standup-dock">Dock left</button><button id="standup-popout">Pop out ↗</button></header><p>${e(list.instructions||'')}</p><ol>${dailyOrder(list).map(m=>`<li><label><input type="checkbox"> ${e(m.name)}${m.mode==='fixed'?' · fixed':''}</label></li>`).join('')}</ol></section>${standupLinksCard(list)}`:'<p>Create a list in Overview first.</p>';
    const browser=`<section class="card"><h2>Team browser</h2><p>Sites open in browser-managed tabs. Use the browser’s own Back, Forward, and Reload controls for those pages.</p><form id="team-browser-open"><label>URL or search<input name="query" required autocomplete="off" placeholder="Search or enter a URL"></label><label>Search engine<select name="engine"><option value="google">Google</option><option value="duckduckgo">DuckDuckGo</option><option value="bing">Bing</option></select></label><button class="primary">Open browser tab ↗</button></form><h3>Shared links</h3>${listLinks(state.links)}</section>`;
    host.innerHTML=teamTab==='overview'?overview:teamTab==='standup'?standup:browser;
    const browserForm=host.querySelector('#team-browser-open');if(browserForm){browserForm.elements.engine.value=state.preferences.searchEngine;browserForm.onsubmit=openWebBrowser;bindWebRecents(browserForm.elements.query);browserForm.elements.query.focus({preventScroll:true});}
    host.querySelectorAll('[data-select-list]').forEach(b=>b.onclick=()=>{selectedList=b.dataset.selectList;renderTeam();});
    host.querySelector('#team-new')?.addEventListener('click',()=>{selectedList='new';const prior=state.teamLists;state.teamLists=[];renderTeam();state.teamLists=prior;});
    host.querySelector('#team-form')?.addEventListener('submit',action(async event=>{
        const values=Object.fromEntries(new FormData(event.target));const current=state.teamLists.find(x=>x.id===selectedList);
        const members=values.members.split('\n').map(v=>v.trim()).filter(Boolean).map((text,index)=>{const mode=text.startsWith('!')?'fixed':'random',name=text.replace(/^!\s*/,'');return {id:current?.members.find(m=>m.name===name)?.id||crypto.randomUUID(),name,mode};});
        const saved=await appRequest('/team-lists'+(current?'/'+current.id:''),current?'PUT':'POST',{name:values.name,instructions:values.instructions,timezone:values.timezone,members,links:current?.links||[],...(current?{expectedRevision:current.revision}:{})});selectedList=saved.id;await reload();
    }));
    host.querySelector('#team-delete')?.addEventListener('click',action(async()=>{await appRequest('/team-lists/'+list.id,'DELETE');selectedList='';await reload();}));
    host.querySelector('#standup-dock')?.addEventListener('click',()=>host.classList.toggle('standup-docked'));
    host.querySelector('#standup-popout')?.addEventListener('click',()=>window.open('/team?standup=1','_blank','noopener,noreferrer'));
    bindStandupLinks(host,list);
    bindDeleteLinks(host);
}
function standupLinksCard(list){
    if(!list)return '';
    return `<section class="card"><h2>Standup links</h2><p class="note">${e(list.name)}</p>${standupLinksMarkup(list.links,e)}<form id="standup-link-form" class="standup-link-form"><label>Link name<input name="title" required maxlength="100" placeholder="Board"></label><label>Website URL<input name="url" type="url" required maxlength="2048" placeholder="https://example.com/board"></label><button>Add link</button></form></section>`;
}
function bindStandupLinks(host,list){
    if(!list)return;
    const save=async links=>{await appRequest('/team-lists/'+list.id,'PUT',{name:list.name,members:list.members,instructions:list.instructions,timezone:list.timezone,links,expectedRevision:list.revision});await reload();};
    bindStandupOrder(host,list.links||[],save,error=>window.alert(error.message));
    host.querySelector('#standup-link-form')?.addEventListener('submit',action(async event=>{const v=Object.fromEntries(new FormData(event.target));await save([...(list.links||[]),{id:crypto.randomUUID(),title:v.title.trim(),url:v.url.trim()}]);}));
    host.querySelectorAll('[data-standup-remove]').forEach(button=>button.onclick=action(()=>save(list.links.filter(link=>link.id!==button.dataset.standupRemove))));
    host.querySelectorAll('[data-standup-edit]').forEach(button=>button.onclick=()=>{
        const link=list.links.find(link=>link.id===button.dataset.standupEdit);if(!link)return;
        const dialog=document.createElement('dialog');dialog.setAttribute('aria-label','Edit standup link');
        dialog.innerHTML=`<form><h2>Edit standup link</h2><label>Link name<input name="title" value="${e(link.title)}" required maxlength="100"></label><label>Website URL<input name="url" type="url" value="${e(link.url)}" required maxlength="2048"></label><p role="alert"></p><div class="actions"><button type="button">Cancel</button><button type="submit">Save link</button></div></form>`;
        document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove());dialog.querySelector('[type=button]').onclick=()=>dialog.close();
        dialog.querySelector('form').onsubmit=async event=>{event.preventDefault();const v=Object.fromEntries(new FormData(event.target));try{await save(list.links.map(item=>item.id===link.id?{...item,title:v.title.trim(),url:v.url.trim()}:item));dialog.close();}catch(error){dialog.querySelector('[role=alert]').textContent=error.message;}};dialog.showModal();
    });
}
function bindDeleteLinks(host){host.querySelectorAll('[data-delete-link]').forEach(button=>button.onclick=action(async()=>{await appRequest('/links/'+button.dataset.deleteLink,'DELETE');await reload();}));}
function bindWebRecents(input){bindBrowserRecents(input,{inline:true,load:async()=>(await appRequest()).history||[],navigate:url=>{input.value=url;input.form.requestSubmit();}});}
function renderBrowser(){
    if(!document.querySelector('#browser-home'))return;
    document.querySelector('#browser-open [name=engine]').value=state.preferences.searchEngine;
    document.querySelector('#browser-links').innerHTML=listLinks(state.links);bindDeleteLinks(document.querySelector('#browser-links'));
    const search=document.querySelector('#history-search').value.toLowerCase();document.querySelector('#browser-history').innerHTML=state.history.slice().sort((a,b)=>Date.parse(b.visitedAt||b.createdAt)-Date.parse(a.visitedAt||a.createdAt)).filter(item=>(item.title+' '+item.url).toLowerCase().includes(search)).map(item=>`<p>${externalLink(item.url,item.title)} <small>${e(item.deviceName||'Unknown device')} · ${e(item.source)} · ${e(localDateTime(item.visitedAt||item.createdAt))}</small></p>`).join('')||'<p>No matching history.</p>';
}
function openWebBrowser(event){
    event.preventDefault();const values=Object.fromEntries(new FormData(event.target)),q=values.query.trim();let url;
    try{url=new URL(/^https?:\/\//i.test(q)?q:/^[\w.-]+\.[a-z]{2,}(?:[/:]|$)/i.test(q)?'https://'+q:({'google':'https://www.google.com/search?q=','duckduckgo':'https://duckduckgo.com/?q=','bing':'https://www.bing.com/search?q='}[values.engine]+encodeURIComponent(q)));}catch{notice('Enter a valid URL or search.');return;}
    if(!['http:','https:'].includes(url.protocol)){notice('Only http and https addresses are supported.');return;}
    window.open(url.href,'_blank','noopener,noreferrer');void recordBrowserVisit(url.href,url.hostname).then(reload).catch(error=>notice(error.message));void appRequest('/preferences','PUT',{searchEngine:values.engine}).catch(()=>{});
}
async function renderEngine(){
    document.querySelectorAll('[data-engine-tab]').forEach(button=>{const selected=button.dataset.engineTab===engineTab;button.classList.toggle('active',selected);if(selected)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
    const heading=document.querySelector('#engine-title');if(heading)heading.textContent=({resources:'Resources',connections:'Connections',setup:'App Setup',usage:'Usage',notifications:'Notifications',logs:'Logs'})[engineTab];
    const host=document.querySelector('#engine-content');if(!host)return;
    const version=++engineRenderVersion;
    if(!state){host.innerHTML='<p>Loading Engine Room…</p>';return;}
    const pref=state.preferences;
    if(engineTab==='setup')host.innerHTML=`<section class="card"><h2>App Setup</h2><form id="preferences-form"><label>Time zone<input name="timezone" value="${e(pref.timezone)}" required></label><label>AI Allowance<select name="allowanceDisplay">${['compact','expanded','collapsed'].map(v=>`<option ${v===pref.allowanceDisplay?'selected':''}>${v}</option>`).join('')}</select></label><label><input type="checkbox" name="scheduleCompletionNotifications" ${pref.scheduleCompletionNotifications?'checked':''}> Schedule completion notifications</label><button>Save preferences</button></form><p>Configure providers and credentials on the destination Mac.</p></section>`;
    else if(engineTab==='connections'){
        host.innerHTML='<p>Loading verified account destinations…</p>';
        const store=new BrowserDestinationStore(document.body.dataset.browserAccount,{sessionURL:'/remote/session'});
        try {const hosts=await store.list();if(engineTab!=='connections'||version!==engineRenderVersion)return;host.innerHTML=`<section class="card"><h2>Connections</h2><p>New website work and AI Allowance use the Default Mac. There is no automatic fallback.</p><form id="default-mac-form"><label>Default Mac<select name="defaultMacId"><option value="">Choose explicitly</option>${hosts.map(h=>`<option value="${e(h.hostId)}" ${h.hostId===pref.defaultMacId?'selected':''}>${e(h.label)}${h.source==='legacy'?' · this browser only':''} · ${e(h.hostId)}</option>`).join('')}</select></label><button>Save Default Mac</button></form><p id="default-mac-status" role="status">${e(defaultMacStatus().message)}</p><button id="default-mac-retry" type="button">Retry connection</button><p>Browser-only pairings stay on this browser. Choosing one as the account default does not copy its key; other browsers need their own authorized pairing.</p><a class="button" href="/remote?view=connections">Pair or manage Macs →</a><p>1. Pair a Mac. 2. Save your Default Mac here. 3. Connect the Mac you want to use. Connecting a different Mac does not change the default.</p></section>`;host.querySelector('form').onsubmit=action(async event=>{const id=new FormData(event.target).get('defaultMacId');await updateDefaultMac(id);await reload();});host.querySelector('#default-mac-retry').onclick=()=>void retryDefaultMac();}catch(error){if(version===engineRenderVersion)notice(error.message);}finally{store.close();}return;
    } else if(engineTab==='notifications')host.innerHTML=`<section class="card"><h2>Preferences</h2><button id="enable-push">Enable browser notifications</button><p class="note">${state.push.web?'Browser notifications are available when permission is granted.':'Browser notifications are not configured. History remains available.'}</p></section><section class="card"><h2>History</h2>${state.notifications.map(n=>`<article class="resource-row"><div><strong>${e(n.title)}</strong><p>${e(n.message||n.body||(n.downtimeSeconds!=null?'Connected to the relay after approximately '+n.downtimeSeconds+' seconds offline.':'Open the chat to view the details.'))}</p><small>${e(dateTime(n.createdAt))}</small></div><div class="resource-actions">${n.chatId?`<a class="button" href="/remote?view=chats&host=${encodeURIComponent(n.hostId||'')}&chat=${encodeURIComponent(n.chatId)}">Open chat</a>`:''}${n.read?'':`<button data-read-notification="${e(n.id)}">Mark read</button>`}</div></article>`).join('')||'<p>No notifications yet.</p>'}</section>`;
    else if(engineTab==='logs')host.innerHTML=`<section class="card engine-logs"><h2>Logs</h2><p>Bounded account history with generic event codes; prompts and credentials are excluded.</p>${state.logs.map(l=>`<p class="engine-log-entry">${e(dateTime(l.createdAt))} · ${e(l.level)} · ${e(l.event||l.code)}</p>`).join('')||'<p>No log events yet.</p>'}</section>`;
    else if(engineTab==='usage')host.innerHTML=`<section class="card"><h2>Usage</h2><div id="usage-details">${usage?usagePanel(usage.value,{destination:usage.destination}):'Connect the Default Mac to inspect provider allowance. No usage is inferred.'}</div></section>`;
    else {host.innerHTML='<section class="card"><h2>Resources</h2><p>Reports the Proteus Electron app processes on your Default Mac, including main, renderer, GPU, and utility processes when Electron exposes them. Several tabs can share one process, so process RAM is not a per-tab measurement. This website cannot read its browser’s whole-process RAM or manage external browser tabs.</p><button id="resources-refresh">Refresh Mac resources</button><div id="resource-data">Connecting to Default Mac…</div></section>';const refresh=async()=>{const target=host.querySelector('#resource-data');if(!target)return;try{const data=await defaultMacRequest('resources.list');if(!data.supported){target.textContent='Resource metrics are unavailable on this Mac.';return;}target.innerHTML=`<div class="resource-stats">${[['Memory',Number.isFinite(data.totals?.memoryBytes)?(data.totals.memoryBytes/1048576).toFixed(1)+' MB':'Unavailable'],['CPU estimate',Number.isFinite(data.totals?.cpuPercent)?data.totals.cpuPercent.toFixed(1)+'%':'Unavailable'],['Processes',data.totals?.processCount??data.processes.length]].map(([label,value])=>`<div><span class="eyebrow">${label}</span><strong>${e(value)}</strong></div>`).join('')}</div><p class="note">Observed ${e(dateTime(data.observedAt))}. Tabs may share a process.</p><h3>Open tabs and tools</h3>${data.tabs.map(t=>`<div class="resource-row resource-tab-row"><div><strong>${e(t.title||t.id)}</strong><p>${e(t.group||'Tab')} · ${t.loaded?'Loaded':'Unloaded'}${t.sharedProcess?' · Shared app process':''}</p></div><div class="resource-actions">${t.group==='browser'?`<button data-resource-id="${e(t.id)}" data-resource-action="unload" ${!t.loaded||t.sharedProcess?'disabled':''}>Unload</button>`:''}${!['terminal','overview'].includes(t.group)?`<button data-resource-id="${e(t.id)}" data-resource-action="close">Close</button>`:''}</div></div>`).join('')||'<p>No open tabs.</p>'}<h3 class="resource-process-heading">Processes</h3><table class="resource-process-table"><thead><tr><th>Process</th><th>CPU</th><th>Memory</th></tr></thead><tbody>${data.processes.map(p=>`<tr><td>${e(p.label||p.name||p.type)}${p.tabIds?.length>1?' · shared process':''}</td><td>${Number.isFinite(p.cpuPercent)?p.cpuPercent.toFixed(1)+'%':'Unavailable'}</td><td>${Number.isFinite(p.memoryBytes)?(p.memoryBytes/1048576).toFixed(1)+' MB':'Unavailable'}</td></tr>`).join('')}</tbody></table>`;target.querySelectorAll('[data-resource-action]').forEach(button=>button.onclick=action(async()=>{await defaultMacRequest('resources.action',{tabId:button.dataset.resourceId,action:button.dataset.resourceAction});await refresh();}));}catch(error){target.textContent=error.message;}};host.querySelector('#resources-refresh').onclick=()=>void refresh();void refresh();}
    host.querySelector('#preferences-form')?.addEventListener('submit',action(async event=>{const v=Object.fromEntries(new FormData(event.target));await appRequest('/preferences','PUT',{...v,scheduleCompletionNotifications:!!v.scheduleCompletionNotifications});await reload();}));
    host.querySelectorAll('[data-read-notification]').forEach(b=>b.onclick=action(async()=>{await appRequest('/notifications/'+b.dataset.readNotification,'PATCH',{read:true});await reload();}));
    host.querySelector('#enable-push')?.addEventListener('click',action(async()=>{
        if(!state.push.web||!state.push.publicKey)throw new Error('Configure Web Push on the server first.');
        if(!('serviceWorker'in navigator)||!('PushManager'in window))throw new Error('This browser does not support background push.');
        if(await Notification.requestPermission()!=='granted')throw new Error('Notification permission was not granted.');
        const registration=await navigator.serviceWorker.register('/proteus-push-sw.js');await navigator.serviceWorker.ready;
        const bytes=Uint8Array.from(atob(state.push.publicKey.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
        const subscription=await registration.pushManager.getSubscription()||await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});
        let deviceId=localStorage.getItem('proteus.push.device');if(!deviceId){deviceId=crypto.randomUUID();localStorage.setItem('proteus.push.device',deviceId);}
        const saved=await appRequest('/push-subscriptions','POST',{platform:'web',deviceId,...subscription.toJSON()});localStorage.setItem('proteus.push.subscription.'+document.body.dataset.browserAccount,saved.id);notice('Browser subscribed. Actual delivery requires the configured worker.');
    }));
}
function render(){renderTeam();renderBrowser();void renderEngine();}
if(document.querySelector('#team-tools,#browser-home,#engine-room')){
    const teamStrip=document.querySelector('.team-tabs');const updateTeamFade=()=>{if(!teamStrip)return;teamStrip.classList.toggle('fade-left',teamStrip.scrollLeft>2);teamStrip.classList.toggle('fade-right',teamStrip.scrollLeft+teamStrip.clientWidth<teamStrip.scrollWidth-2);};teamStrip?.addEventListener('scroll',updateTeamFade,{passive:true});window.addEventListener('resize',updateTeamFade);requestAnimationFrame(updateTeamFade);
    const requestedTeamTab=new URLSearchParams(location.search).get('tab');
    if(['overview','standup','browser'].includes(requestedTeamTab))teamTab=requestedTeamTab==='browser'&&teamBrowserOpen?'browser':requestedTeamTab==='browser'?'overview':requestedTeamTab;
    else if(new URLSearchParams(location.search).has('standup'))teamTab='standup';
    document.querySelectorAll('[data-team-tab]').forEach(b=>b.onclick=()=>{teamTab=b.dataset.teamTab;saveTeamTabs();renderTeam();requestAnimationFrame(updateTeamFade);});
    document.querySelector('#team-add-menu')?.addEventListener('click',event=>{const action=event.target.closest('[data-team-create]')?.dataset.teamCreate;if(!action)return;event.currentTarget.open=false;if(action==='browser'){teamBrowserOpen=true;teamTab='browser';saveTeamTabs();renderTeam();requestAnimationFrame(updateTeamFade);}if(action==='markdown')document.dispatchEvent(new CustomEvent('proteus:choose-file'));});
    document.querySelectorAll('[data-engine-tab]').forEach(b=>b.onclick=event=>{
        if(!document.querySelector('#engine-room'))return;event.preventDefault();
        if(!engineTabs.includes(b.dataset.engineTab))return;
        engineTab=b.dataset.engineTab;
        const url=new URL(location.href);url.searchParams.set('tab',engineTab);
        if(url.href!==location.href)history.pushState(null,'',url);
        void renderEngine();
    });
    window.addEventListener('popstate',()=>{if(document.querySelector('#engine-room')){engineTab=engineTabFromURL();void renderEngine();}});
    document.querySelector('#history-search')?.addEventListener('input',renderBrowser);
    document.querySelector('#browser-open')?.addEventListener('submit',openWebBrowser);
    const address=document.querySelector('#browser-open [name=query]');if(address){bindWebRecents(address);address.focus({preventScroll:true});}
    document.querySelector('#browser-save-link')?.addEventListener('submit',action(async event=>{await appRequest('/links','POST',Object.fromEntries(new FormData(event.target)));event.target.reset();await reload();}));
    document.addEventListener('proteus:default-status',event=>{const target=document.querySelector('#default-mac-status');if(target)target.textContent=event.detail.message;if(engineTab==='resources'&&event.detail.status!=='connected'){const resource=document.querySelector('#resource-data');if(resource)resource.textContent=event.detail.message;}});
    document.addEventListener('proteus:default-connected',()=>{if(engineTab==='resources')void renderEngine();});
    document.addEventListener('proteus:usage',event=>{usage=event.detail;if(engineTab==='usage')void renderEngine();});
    void reload().catch(error=>notice(error.message));
}
