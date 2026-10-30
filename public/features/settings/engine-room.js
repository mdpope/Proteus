import {mountResources} from './resources.js';
import {renderPalette} from '../../shared/ui/palette.js';
import {mountBrowserIssueActions} from '../browser/browser-notifications.js';
import {renderUpdates} from './updates.js';
import {renderWindowLayouts} from '../../shared/navigation/window-layouts.js';
import {previewEnabled} from '../../shared/navigation/desktop-preview.js';
import {mountBrowserHistory} from '../browser/browser-history-panel.js';
import {mountLogPanel,pagedAccountLogs} from './log-panel.js';
import {computerName} from '../../services/remote/computer-identity.js';
import {mountWebsiteData} from '../browser/browser-site-data.js';
import {renderBrowserPreferences} from '../browser/browser-preferences.js';
import {renderIntegrations} from './integrations.js';
import {renderInternetDefaults} from './internet-search.js';
let ui;
const $ = selector => document.querySelector(selector);
const sections = [['palette','Colors'],['resources','Resources'],['providers','Providers'],['connections','Computer Connections'],['integrations','Accounts & Integrations'],['account','Proteus Account & Security'],['internet-searches','Internet Searches'],['updates','Updates'],['desktop-control','Desktop Control'],['preferences','Browser Preferences'],['website-data','Website data'],['history','Browser history'],['setup','App Setup'],['usage','Usage'],['notifications','Notifications'],['logs','Logs']];
export function initEngineRoom(options){ui=options;}
async function activity(kind){const local=await ui.api('/api/'+kind);if(!ui.state.data.life?.identity)return local;try{const account=await ui.api('/api/app'),merged=new Map((local.items||[]).map(item=>[item.id,{...item,localId:item.id}]));for(const item of account[kind]||[]){const key=item.eventId||item.id,previous=merged.get(key);merged.set(key,{...previous,...item,localId:previous?.localId,shared:true,identity:account.identity});}return {...local,items:[...merged.values()].sort((a,b)=>Date.parse(b.createdAt||b.at)-Date.parse(a.createdAt||a.at))};}catch{return {...local,sharedUnavailable:true};}}

export function engineSections(){const result=previewEnabled(ui?.state)?sections.map(([key,label])=>[key,key==='setup'?'App settings':label]):sections;return window.desktop?.windowPreview?[['windows','Windows'],...result]:result;}
export function renderEngineRoom(section='resources',force=false){
  const main=$('#main');
  if(!force&&main.querySelector('#engine-content')?.dataset.section===section)return;
  if(section==='providers')return ui.providers();
  if(section==='connections')return ui.connections();
  if(section==='setup')return ui.setup();
  const title=engineSections().find(([id])=>id===section)?.[1]||'Engine Room';
  main.innerHTML=`<div class="heading"><div><div class="eyebrow">Engine Room</div><h1>${title}</h1></div></div><div id="engine-content"><p class="note">Loading…</p></div>`;
  const mounted=$('#engine-content');mounted.dataset.section=section;
  const active=()=>ui.state.page==='engine'&&ui.state.engineSection===section&&$('#engine-content')===mounted;
  const render=async()=>{
    try{
      if(section==='palette'){renderPalette(mounted,ui);
      } else if(section==='windows'){await renderWindowLayouts(mounted,{...ui,active});
      } else if(section==='updates'){await renderUpdates(mounted,ui,active);
      } else if(section==='desktop-control'){await renderDesktopControl(mounted,active);
      } else if(section==='history'){const peers=await window.desktop?.peers({action:'list'})||[];const profiles=await ui.api('/api/browser-profiles');if(!active())return;await mountBrowserHistory(mounted,{hosts:[{hostId:ui.state.data.hostId,label:ui.state.data.hostName||'This computer'},...(Array.isArray(peers)?peers:peers.items||peers.peers||[]).filter(peer=>!peer.paused)],profiles:profiles.items,defaultHostId:ui.state.data.hostId,timezone:ui.state.data.settings.timezone,active,notify:ui.toast,request:(host,action,args)=>host===ui.state.data.hostId?ui.api('/api/browser-history',{...args,action}):window.desktop.peers({action:'request',hostId:host,method:'browser.history.'+action,args}),open:async(item)=>{const info=await window.desktop.browser({action:'create',url:item.url,profileId:item.profileId||'default'});ui.openBrowser?.(info);}});
      } else if(section==='internet-searches'){await renderInternetDefaults(ui,$('#engine-content'),active);
      } else if(section==='integrations'){
        const panel=document.createElement('div');$('#engine-content').replaceChildren(panel);await renderIntegrations(panel,{request:(action,args)=>action==='list'?ui.api('/api/integrations'):ui.api('/api/integrations',{action,...args}),notify:ui.toast,signIn:row=>{const run=ui.state.data.runs.find(r=>r.id===row.runId);if(run)ui.manageMcp(run);}});
        if(!active())return;const others=document.createElement('details');others.innerHTML='<summary>Other computers</summary><div data-computers></div>';mounted.append(others);let loaded=false;others.ontoggle=async()=>{if(!others.open||loaded)return;loaded=true;try{const result=await window.desktop?.peers({action:'list'})||[];for(const peer of (Array.isArray(result)?result:result.items||result.peers||[]).filter(peer=>!peer.paused)){const section=document.createElement('details'),summary=document.createElement('summary'),body=document.createElement('div');summary.textContent=peer.name||peer.label||peer.hostId;section.append(summary,body);others.querySelector('[data-computers]').append(section);let shown=false;section.ontoggle=()=>{if(!section.open||shown)return;shown=true;void renderIntegrations(body,{readOnly:true,notify:ui.toast,request:()=>window.desktop.peers({action:'request',hostId:peer.hostId,method:'integrations.list',args:{}})});};}}catch(error){ui.toast(error.message);loaded=false;}};
      } else if(section==='website-data'){
        await mountWebsiteData(mounted,{escape:ui.escape,toast:ui.toast,filter:ui.state.siteDataFilter});
      } else if(section==='preferences'){
        const name=await window.desktop?.defaultBrowser?.().catch(()=>null);if(!active())return;const settings=ui.state.data.settings;
        $('#engine-content').innerHTML=`<section class="card"><h2>Browser links</h2><label>Open clicked links in<select id="clicked-link-browser"><option value="in-app">In-app browser</option><option value="system">System browser${name?' ('+ui.escape(name)+')':''}</option></select></label><p class="note">Applies on this computer. In-app chat links stay with their chat. Agent browser tools retain their controllable in-app browser.</p><p id="preference-status" class="note" role="status"></p></section>`;
        $('#clicked-link-browser').value=settings.preferences?.clickedLinks||'in-app';$('#clicked-link-browser').onchange=async event=>{const select=event.target;select.disabled=true;try{const current=ui.state.data.settings;const saved=await ui.api('/api/settings',{settings:{...current,preferences:{...current.preferences,clickedLinks:select.value}},expectedRevision:current.revision});ui.state.data.settings=saved;$('#preference-status').textContent='Saved for this computer.';}catch(error){ui.toast(error.message);select.value=ui.state.data.settings.preferences?.clickedLinks||'in-app';}finally{select.disabled=false;}};
        const profiles=document.createElement('div');$('#engine-content').append(profiles);void renderBrowserPreferences(ui,profiles).catch(error=>ui.toast(error.message));
      } else if(section==='resources'){
        await mountResources(mounted,ui,active);
      } else if(section==='usage'){
        const value=await ui.api('/api/usage',{force:false});if(!active())return;
        $('#engine-content').innerHTML=Object.entries(value.providers||{}).map(([name,entry])=>`<section class="card"><h2>${ui.escape(name)}</h2><p class="note">${ui.escape(entry.checkedAt?ui.time(entry.checkedAt):'Not checked')} ${entry.stale?'· Stale':''}</p>${(entry.windows||[]).map(w=>`<div class="resource-row"><span>${ui.escape(w.label||w.id)}</span><strong>${Number.isFinite(w.remainingPercent)?ui.escape(w.remainingPercent.toFixed(1))+'% remaining':w.unlimited?'Unlimited':'Unavailable'}</strong></div>`).join('')||'<p class="note">No reported allowance.</p>'}</section>`).join('')||'<p class="empty">Allowance unavailable.</p>';
      } else if(section==='notifications'){
        const value=await activity('notifications');if(!active())return;
        const p=value.preferences||{};
        $('#engine-content').innerHTML=`<section class="card"><h2>Preferences</h2><label class="checkbox-row"><input id="notify-system" type="checkbox" ${p.systemEnabled?'checked':''}>Enable system notifications</label><label><input id="notify-schedule" type="checkbox" ${p['schedule.completed']!==false?'checked':''}> Notify when a schedule completes</label><p class="note">Chat completion and requests for review remain visible in notification history.</p></section><section class="card"><h2>History</h2>${value.sharedUnavailable?'<p class="note">Shared history unavailable. Showing this computer’s history; authorize shared features in App Setup.</p>':''}${(value.items||[]).map(n=>`<article class="resource-row" data-browser-notification="${ui.escape(n.localId||n.id)}"><div><strong>${ui.escape(n.title||n.event||'Notification')}</strong><p>${ui.escape(n.message||n.body||'')}</p><small>${ui.escape(ui.time(n.at||n.createdAt))}</small></div>${n.read||n.readAt?'':`<button data-notification-read="${ui.escape(n.id)}">Mark read</button>`}</article>`).join('')||'<p class="empty">No notifications yet.</p>'}</section>`;
        for(const item of value.items||[]){if(item.browserIssue){const card=mounted.querySelector('[data-browser-notification="'+CSS.escape(item.localId||item.id)+'"]');if(card)mountBrowserIssueActions(card,item);}}
        for(const [key,title]of [['quietMode','Quiet notifications (only actionable requests)'],['inAppEnabled','Show in-app notification banners']]){
          const label=document.createElement('label');label.className='checkbox-row';const input=document.createElement('input');input.type='checkbox';input.checked=p[key]!==false;input.dataset.notificationPreference=key;label.append(input,title);$('#notify-system').closest('section').append(label);
          input.onchange=async()=>{try{await ui.api('/api/notifications',{action:'preferences',preferences:{[key]:input.checked}});p[key]=input.checked;}catch(error){input.checked=!input.checked;ui.toast(error.message);}};
        }
        for(const [key,title,fallback]of [['website.notification','Show notifications received from permitted websites',true],['forwardWebsiteNotifications','Forward website notifications to my connected devices',false]]){
          const label=document.createElement('label');label.className='checkbox-row';const input=document.createElement('input');input.type='checkbox';input.checked=p[key]??fallback;label.append(input,title);$('#notify-system').closest('section').append(label);input.onchange=async()=>{try{await ui.api('/api/notifications',{action:'preferences',preferences:{[key]:input.checked}});p[key]=input.checked;}catch(error){input.checked=!input.checked;ui.toast(error.message);}};
        }
        const websiteNote=document.createElement('p');websiteNote.className='note';websiteNote.textContent='Website permission is required. Keep communication tabs Persisted to receive events while inactive. Background iPhone delivery also requires the shared account, registered push notifications and the server/mobile update. The website’s silent option is preserved.';$('#notify-system').closest('section').append(websiteNote);
        $('#notify-system').onchange=async event=>{try{await ui.api('/api/notifications',{action:'preferences',preferences:{systemEnabled:event.target.checked}});p.systemEnabled=event.target.checked;}catch(error){ui.toast(error.message);event.target.checked=!event.target.checked;}};
        $('#notify-schedule').onchange=async event=>{try{await ui.api('/api/notifications',{action:'preferences',preferences:{'schedule.completed':event.target.checked}});p['schedule.completed']=event.target.checked;}catch(error){ui.toast(error.message);event.target.checked=!event.target.checked;}};
        document.querySelectorAll('[data-notification-read]').forEach(button=>button.onclick=async()=>{try{const item=value.items.find(n=>n.id===button.dataset.notificationRead);if(item.shared)await ui.api('/api/app',{path:'/notifications/'+item.id,method:'PATCH',body:{read:true},identity:item.identity});if(item.localId||!item.shared)await ui.api('/api/notifications',{action:'read',id:item.localId||item.id});render();}catch(error){ui.toast(error.message);}});
      } else if(section==='logs'){
        const target=ui.state.logTarget,local=document.createElement('div');mounted.replaceChildren(local);
        await mountLogPanel(local,{list:query=>ui.api('/api/logs?'+new URLSearchParams(query)),detail:item=>ui.api('/api/logs?id='+encodeURIComponent(item.id)),escape:ui.escape,time:ui.time,active,target:!target?.hostId||target.hostId===ui.state.data.hostId?target?.id:undefined});
        if(ui.state.logTarget===target)delete ui.state.logTarget;
        if(active()&&ui.state.data.life?.identity){const accountHost=document.createElement('div');mounted.append(accountHost);try{const account=await ui.api('/api/app');if(!active())return;const localIDs=new Set((await ui.api('/api/logs?limit=100')).items.map(item=>item.id));const items=(account.logs||[]).filter(item=>!localIDs.has(item.eventId||item.id));await mountLogPanel(accountHost,{title:'Account events',note:'Shared event metadata. Full diagnostics remain on their owning computer.',list:query=>Promise.resolve(pagedAccountLogs(items,query)),detail:item=>Promise.resolve(item),escape:ui.escape,time:ui.time,active});}catch(error){if(active())accountHost.textContent='Account events unavailable: '+error.message;}}
      } else if(section==='account'){
        $('#engine-content').innerHTML='<section class="card"><h2>Account & Security</h2><p>Manage your profile, timezone, passkeys, authenticator and sessions in your secure website account.</p><button id="engine-account-open">Open account settings ↗</button></section>';
        $('#engine-account-open').onclick=()=>ui.openAccount();
      }
    }catch(error){if(active())$('#engine-content').innerHTML=`<p class="banner">${ui.escape(error.message)}</p>`;}
  };
  void render();
}

async function renderDesktopControl(container,active){
 const status=await ui.api('/api/desktop-control');if(!active())return;
 container.innerHTML=`<section class="card"><h2>Desktop Control</h2><p>Cua Driver is primary. Peekaboo is an on-demand Mac backup. Your current chat remains the planner; tools start when requested and Proteus-owned connections stop after two idle minutes.</p>${status.backends.map(backend=>`<div class="resource-row"><div><strong>${ui.escape(backend.id==='cua'?'Cua Driver':'Peekaboo')}</strong><p>${backend.installed?'Installed':'Not installed'} · ${backend.running?'Connected':'Idle'}</p><a href="${ui.escape(backend.setup)}" data-desktop-setup="${backend.id}">Installation and OS permission instructions ↗</a></div></div>`).join('')}<p class="note">macOS requires Accessibility and Screen Recording for the signed driver. Linux requires its supported graphical session/accessibility service. A backend permission refusal cannot be bypassed by choosing the backup.</p><p>${status.lease?'Active target: '+ui.escape(status.lease.owner)+' · process '+ui.escape(status.lease.pid||'discovery')+' · window '+ui.escape(status.lease.windowId||'pending')+(status.lease.uncertain?' · Observe before retrying input.':''):'No active desktop control.'}</p><div class="actions"><button data-desktop-test>Test discovery</button><button data-desktop-stop>Stop / revoke control</button><button data-desktop-refresh>Refresh</button></div><pre data-desktop-result role="status"></pre></section>`;
 container.querySelector('[data-desktop-refresh]').onclick=()=>void renderDesktopControl(container,active).catch(error=>ui.toast(error.message));
 container.querySelector('[data-desktop-stop]').onclick=async()=>{await ui.api('/api/desktop-control',{action:'stop'});await renderDesktopControl(container,active);};
 container.querySelector('[data-desktop-test]').onclick=async event=>{const output=container.querySelector('[data-desktop-result]');event.target.disabled=true;try{const value=await ui.api('/api/desktop-control',{action:'test'});output.textContent='Cua Driver catalog: '+value.tools+' tools. Permission report: '+JSON.stringify(value.permissionResult)+'. Desktop input and provider image delivery still need a real task check.';}catch(error){output.textContent=error.message;}finally{event.target.disabled=false;}};
 container.querySelectorAll('[data-desktop-setup]').forEach(link=>link.onclick=event=>{if(window.desktop){event.preventDefault();void window.desktop.openExternal(link.href).catch(error=>ui.toast(error.message));}});
}
