import {appRequest,escapeHTML as e,externalLink,dateTime,defaultMacRequest} from './shared-app.js';
import {AccountPairingStore,BrowserRemoteClient} from './remote-client.js';
import {usagePanel} from './remote-usage.js';
let state,teamTab='overview',engineTab=new URLSearchParams(location.search).get('tab')||'resources',selectedList='',usage;
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
    const host=document.querySelector('#team-content');if(!host)return;
    const list=state.teamLists.find(x=>x.id===selectedList)||state.teamLists[0];selectedList=list?.id||'';
    const overview=`<section class="card"><h2>Lists</h2>${state.teamLists.map(x=>`<button data-select-list="${e(x.id)}">${e(x.name)} · ${x.members.length}</button>`).join('')}<button id="team-new">New list</button></section><section class="card"><h2>${list?'Edit list':'Create a list'}</h2><form id="team-form"><label>Name<input name="name" required maxlength="100" value="${e(list?.name||'')}"></label><label>Instructions<textarea name="instructions" maxlength="4000">${e(list?.instructions||'')}</textarea></label><label>Time zone<input name="timezone" value="${e(list?.timezone||state.preferences.timezone)}" required></label><label>Standup links, one Title | URL per line<textarea name="links" rows="3">${e(list?.links?.map(link=>link.title+' | '+link.url).join('\n')||'')}</textarea></label><label>People, one per line; prefix fixed positions with !<textarea name="members" rows="8">${e(list?.members.map(x=>(x.mode==='fixed'?'! ':'')+x.name).join('\n')||'')}</textarea></label><button class="primary">Save shared list</button>${list?'<button id="team-delete" type="button">Delete list</button>':''}</form></section><section class="card"><h2>Shared links</h2>${listLinks(state.links)}<a href="/browser-home" target="_blank" rel="noopener">Manage links and browse ↗</a></section>`;
    const standup=list?`<section class="card standup-panel"><header><h2>${e(list.name)}</h2><button id="standup-dock">Dock left</button><button id="standup-popout">Pop out ↗</button></header><p>${e(list.instructions||'')}</p><ol>${dailyOrder(list).map(m=>`<li><label><input type="checkbox"> ${e(m.name)}${m.mode==='fixed'?' · fixed':''}</label></li>`).join('')}</ol>${(list.links||[]).map(link=>externalLink(link.url,link.title)).join(' ')}</section><section class="card"><h2>Team browser</h2><p>Open tools in actual browser tabs.</p>${listLinks(state.links)}<a href="/browser-home" target="_blank" rel="noopener">New browser ↗</a></section>`:'<p>Create a list in Overview first.</p>';
    host.innerHTML=teamTab==='overview'?overview:standup;
    host.querySelectorAll('[data-select-list]').forEach(b=>b.onclick=()=>{selectedList=b.dataset.selectList;renderTeam();});
    host.querySelector('#team-new')?.addEventListener('click',()=>{selectedList='new';const prior=state.teamLists;state.teamLists=[];renderTeam();state.teamLists=prior;});
    host.querySelector('#team-form')?.addEventListener('submit',action(async event=>{
        const values=Object.fromEntries(new FormData(event.target));const current=state.teamLists.find(x=>x.id===selectedList);
        const members=values.members.split('\n').map(v=>v.trim()).filter(Boolean).map((text,index)=>{const mode=text.startsWith('!')?'fixed':'random',name=text.replace(/^!\s*/,'');return {id:current?.members.find(m=>m.name===name)?.id||crypto.randomUUID(),name,mode};});
        const saved=await appRequest('/team-lists'+(current?'/'+current.id:''),current?'PUT':'POST',{name:values.name,instructions:values.instructions,timezone:values.timezone,members,links:values.links.split('\n').map(x=>x.trim()).filter(Boolean).map(line=>{const [title,...url]=line.split('|');return{id:crypto.randomUUID(),title:title.trim(),url:url.join('|').trim()};}),...(current?{expectedRevision:current.revision}:{})});selectedList=saved.id;await reload();
    }));
    host.querySelector('#team-delete')?.addEventListener('click',action(async()=>{await appRequest('/team-lists/'+list.id,'DELETE');selectedList='';await reload();}));
    host.querySelector('#standup-dock')?.addEventListener('click',()=>host.classList.toggle('standup-docked'));
    host.querySelector('#standup-popout')?.addEventListener('click',()=>window.open('/team?standup=1','_blank','noopener,noreferrer'));
    bindDeleteLinks(host);
}
function bindDeleteLinks(host){host.querySelectorAll('[data-delete-link]').forEach(button=>button.onclick=action(async()=>{await appRequest('/links/'+button.dataset.deleteLink,'DELETE');await reload();}));}
function renderBrowser(){
    if(!document.querySelector('#browser-home'))return;
    document.querySelector('#browser-open [name=engine]').value=state.preferences.searchEngine;
    document.querySelector('#browser-links').innerHTML=listLinks(state.links);bindDeleteLinks(document.querySelector('#browser-links'));
    const search=document.querySelector('#history-search').value.toLowerCase();document.querySelector('#browser-history').innerHTML=state.history.filter(item=>(item.title+' '+item.url).toLowerCase().includes(search)).map(item=>`<p>${externalLink(item.url,item.title)} <small>${e(item.source)} · ${e(dateTime(item.updatedAt))}</small></p>`).join('')||'<p>No matching history.</p>';
}
async function renderEngine(){
    document.querySelectorAll('[data-engine-tab]').forEach(button=>button.classList.toggle('selected',button.dataset.engineTab===engineTab));
    const host=document.querySelector('#engine-content');if(!host)return;
    const pref=state.preferences;
    if(engineTab==='setup')host.innerHTML=`<section class="card"><h2>App Setup</h2><form id="preferences-form"><label>Time zone<input name="timezone" value="${e(pref.timezone)}" required></label><label>AI Allowance<select name="allowanceDisplay">${['compact','expanded','collapsed'].map(v=>`<option ${v===pref.allowanceDisplay?'selected':''}>${v}</option>`).join('')}</select></label><label><input type="checkbox" name="scheduleCompletionNotifications" ${pref.scheduleCompletionNotifications?'checked':''}> Schedule completion notifications</label><button>Save preferences</button></form><p>Configure providers and credentials on the destination Mac.</p></section>`;
    else if(engineTab==='connections'){
        host.innerHTML='<p>Loading verified account destinations…</p>';
        try {const store=new AccountPairingStore(document.body.dataset.browserAccount,{sessionURL:'/remote/session'});const hosts=await store.list();if(engineTab!=='connections')return;host.innerHTML=`<section class="card"><h2>Connections</h2><p>New website work and AI Allowance use the Default Mac. There is no automatic fallback.</p><form id="default-mac-form"><label>Default Mac<select name="defaultMacId"><option value="">Choose explicitly</option>${hosts.map(h=>`<option value="${e(h.hostId)}" ${h.hostId===pref.defaultMacId?'selected':''}>${e(h.label)} · ${e(h.hostId)}</option>`).join('')}</select></label><button>Save Default Mac</button></form><a href="/remote">Manage and pair Macs</a></section>`;host.querySelector('form').onsubmit=action(async event=>{const id=new FormData(event.target).get('defaultMacId');await appRequest('/preferences','PUT',{defaultMacId:id||null});await reload();});}catch(error){notice(error.message);}return;
    } else if(engineTab==='notifications')host.innerHTML=`<section class="card"><h2>Notifications</h2><button id="enable-push">Enable browser notifications</button><p>${state.push.web?'Web Push configured; browser permission and delivery worker required.':'Web Push service is not configured. History remains available.'} APNs: ${state.push.apns?'configured; device entitlement and delivery acceptance unverified':'not configured'}.</p>${state.notifications.map(n=>`<article><strong>${n.read?'':'! '}${e(n.title)}</strong><small> ${e(dateTime(n.createdAt))}</small>${n.downtimeSeconds!=null?`<p>Estimated downtime: ${e(n.downtimeSeconds)} seconds</p>`:''}${n.chatId?`<a href="/remote?view=chats&host=${encodeURIComponent(n.hostId||'')}&chat=${encodeURIComponent(n.chatId)}">Open chat</a>`:''}<button data-read-notification="${e(n.id)}">Mark read</button></article>`).join('')||'<p>No notifications yet.</p>'}</section>`;
    else if(engineTab==='logs')host.innerHTML=`<section class="card"><h2>Logs</h2><p>Bounded account history with generic event codes; prompts and credentials are excluded.</p>${state.logs.map(l=>`<p>${e(dateTime(l.createdAt))} · ${e(l.level)} · ${e(l.event||l.code)}</p>`).join('')||'<p>No log events yet.</p>'}</section>`;
    else if(engineTab==='usage')host.innerHTML=`<section class="card"><h2>Usage</h2><div id="usage-details">${usage?usagePanel(usage.value,{destination:usage.destination}):'Connect the Default Mac to inspect provider allowance. No usage is inferred.'}</div></section>`;
    else {host.innerHTML='<section class="card"><h2>Resources</h2><p>Website CPU and whole-browser RAM are unavailable. Other tabs may share a browser process. The following observations come from your Default Mac.</p><button id="resources-refresh">Refresh Mac resources</button><div id="resource-data">Connecting to Default Mac…</div></section>';const refresh=async()=>{const target=host.querySelector('#resource-data');if(!target)return;try{const data=await defaultMacRequest('resources.list');if(!data.supported){target.textContent='Resource metrics are unavailable on this Mac.';return;}target.innerHTML=`<p>Observed ${e(dateTime(data.observedAt))}</p>${data.processes.map(p=>`<p>${e(p.name||p.type)} · CPU ${Number(p.cpuPercent).toFixed(1)}% · RAM ${(Number(p.memoryBytes)/1048576).toFixed(1)} MB${p.tabIds?.length>1?' · shared process':''}</p>`).join('')}<h3>Open tabs on Default Mac</h3>${data.tabs.map(t=>`<p>${e(t.title||t.id)} · ${t.loaded?'loaded':'unloaded'}${t.sharedProcess?' · shared process':''} <button data-resource-id="${e(t.id)}" data-resource-action="unload">Unload</button> <button data-resource-id="${e(t.id)}" data-resource-action="close">Close</button></p>`).join('')}`;target.querySelectorAll('[data-resource-action]').forEach(button=>button.onclick=action(async()=>{await defaultMacRequest('resources.action',{tabId:button.dataset.resourceId,action:button.dataset.resourceAction});await refresh();}));}catch(error){target.textContent=error.message;}};host.querySelector('#resources-refresh').onclick=()=>void refresh();void refresh();}
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
    if(new URLSearchParams(location.search).has('standup'))teamTab='standup';
    document.querySelectorAll('[data-team-tab]').forEach(b=>b.onclick=()=>{teamTab=b.dataset.teamTab;renderTeam();});
    document.querySelectorAll('[data-engine-tab]').forEach(b=>b.onclick=()=>{engineTab=b.dataset.engineTab;void renderEngine();});
    document.querySelector('#history-search')?.addEventListener('input',renderBrowser);
    document.querySelector('#browser-open')?.addEventListener('submit',event=>{
        event.preventDefault();const values=Object.fromEntries(new FormData(event.target)),q=values.query.trim();let url;
        try{url=new URL(/^https?:\/\//i.test(q)?q:/^[\w.-]+\.[a-z]{2,}(?:[/:]|$)/i.test(q)?'https://'+q:({'google':'https://www.google.com/search?q=','duckduckgo':'https://duckduckgo.com/?q=','bing':'https://www.bing.com/search?q='}[values.engine]+encodeURIComponent(q)));}catch{notice('Enter a valid URL or search.');return;}
        if(!['http:','https:'].includes(url.protocol)){notice('Only http and https addresses are supported.');return;}
        window.open(url.href,'_blank','noopener,noreferrer');void appRequest('/history','POST',{url:url.href,title:url.hostname,source:'web'}).then(reload).catch(error=>notice(error.message));void appRequest('/preferences','PUT',{searchEngine:values.engine}).catch(()=>{});
    });
    document.querySelector('#browser-save-link')?.addEventListener('submit',action(async event=>{await appRequest('/links','POST',Object.fromEntries(new FormData(event.target)));event.target.reset();await reload();}));
    document.addEventListener('proteus:default-connected',()=>{if(engineTab==='resources')void renderEngine();});
    document.addEventListener('proteus:usage',event=>{usage=event.detail;if(engineTab==='usage')void renderEngine();});
    void reload().catch(error=>notice(error.message));
}
