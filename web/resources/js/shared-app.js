import './palette.js';
import {observeRunningChats as updateRunningChats} from './running-chats.js';
import {createWorkspaceTree} from './workspace-tree.js';
const ownerStates=new Map(),ownerLabels=new Map();let globalWorkspaceTree;
function observeRunningChats(hostId,source,state,online=true){updateRunningChats(hostId,source,state,online);if(state)ownerStates.set(hostId,state);globalWorkspaceTree?.render();}

import {authenticatedComputerMetadata} from '../../../public/services/remote/computer-identity.js';
import { BrowserDestinationStore, BrowserRemoteClient } from './remote-client.js';
import { usageSidebar, usageDetails } from '../../../public/features/settings/provider-usage-view.js';
const account = document.body.dataset.browserAccount;
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function appRequest(path = '', method = 'GET', body) {
    const response = await fetch('/app-api' + path, {method, credentials:'same-origin',cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(15000), headers:{Accept:'application/json','Content-Type':'application/json','X-CSRF-TOKEN':document.querySelector('meta[name="csrf-token"]')?.content || '', 'X-Proteus-Account':account}, ...(body ? {body:JSON.stringify(body)} : {})});
    const value = await response.json().catch(()=>({}));
    if (!response.ok) throw new Error(value.message || 'Shared app data is unavailable.');
    return value;
}
export const dateTime = (value, timezone = window.proteusPreferences?.timezone || 'UTC') => {
    if (!value || !Number.isFinite(Date.parse(value))) return 'Time unavailable';
    try {return new Intl.DateTimeFormat(undefined,{timeZone:timezone,dateStyle:'medium',timeStyle:'short'}).format(new Date(value));} catch {return new Date(value).toISOString();}
};
export function externalLink(url, title) { return `<a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(title || url)} ↗</a>`; }
export function localDateTime(value){
    if(!value||!Number.isFinite(Date.parse(value)))return 'Time unavailable';
    return new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));
}
export function recordBrowserVisit(url,title,hostId){const event={eventId:crypto.randomUUID(),url,title:String(title||'').slice(0,160),profileId:'default',visitedAt:new Date().toISOString()};return hostId?browserHistoryRequest(hostId,'record',event):defaultMacRequest('browser.history.record',event);}
let usageClient, usageTimer, reconnectTimer, connectionGeneration=0, connectionAttempt=0, stopped=false;
let preferences;
let defaultState={status:'loading',message:'Loading saved computer connections…',hostId:null,label:''};
const destinationStore=account?new BrowserDestinationStore(account):null;
export const defaultMacStatus=()=>({...defaultState});
function connectionState(status,message,host={}){
    defaultState={status,message,hostId:host.hostId||preferences?.defaultMacId||null,label:host.label||'',...authenticatedComputerMetadata(host)};
    document.dispatchEvent(new CustomEvent('proteus:default-status',{detail:defaultMacStatus()}));
}
export async function defaultMacRequest(method,args={}){
    if(usageClient?.status!=='online')throw new Error(defaultState.message);
    await destinationStore.verifySession();return usageClient.request(method,args);
}
export async function browserHistoryRequest(hostId,method,args={}){return ownerRequest(hostId,'browser.history.'+method,args);}
export async function ownerRequest(hostId,method,args={}){
 await destinationStore.verifySession();const client=hostId===preferences?.defaultMacId?usageClient:badgeClients.get(hostId);if(client?.status==='online')return client.request(method,args);
 const credential=await destinationStore.credential(hostId),temporary=new BrowserRemoteClient(credential);try{await temporary.connect();await destinationStore.verifySession();return await temporary.request(method,args);}finally{temporary.close();}
}
export async function updateDefaultMac(id){
    await appRequest('/preferences','PUT',{defaultMacId:id||null});
    preferences.defaultMacId=id||null;window.proteusPreferences=preferences;
    await connectDefaultMac();void connectBadgeClients();
}
function stopDefaultMac(){
    ++connectionGeneration;clearTimeout(reconnectTimer);clearInterval(usageTimer);reconnectTimer=null;
    const old=usageClient;usageClient=null;if(old)observeRunningChats(old.host?.hostId||defaultState.hostId,'default',null,false);old?.close();
}
async function connectDefaultMac({retry=false}={}){
    stopDefaultMac();if(stopped||globalThis.proteusSigningOut)return;
    if(!retry)connectionAttempt=0;
    const generation=connectionGeneration,element=document.querySelector('#web-provider-usage');
    const unavailable=message=>{if(!element)return;element.hidden=false;element.replaceChildren();const heading=document.createElement('strong');heading.textContent='AI Allowance';const note=document.createElement('p');note.textContent=message;element.append(heading,note);};
    const report=(status,message,host)=>{connectionState(status,message,host);unavailable(message);};
    const selected=preferences?.defaultMacId;
    if(!selected){report('unselected','Choose a Default computer in Engine Room.');return;}
    report('connecting','Connecting to the Default computer…');
    const relevant=()=>generation===connectionGeneration&&!stopped&&!globalThis.proteusSigningOut;
    const retryLater=()=>{if(!relevant()||reconnectTimer||connectionAttempt>=5)return;const delay=Math.min(1000*2**connectionAttempt++,16000);reconnectTimer=setTimeout(()=>{reconnectTimer=null;void connectDefaultMac({retry:true});},delay);};
    try {
        const credential=await destinationStore.credential(selected);ownerLabels.set(selected,credential.label);if(!relevant())return;
        const client=usageClient=new BrowserRemoteClient(credential);let rejected=false;
        let latestUsage, usageBusy=false;
        const dialog=document.createElement('dialog');dialog.className='provider-usage-modal';dialog.setAttribute('aria-label','Account allowance');document.body.append(dialog);
        const removeDialog=()=>{dialog.close();dialog.remove();};
        client.addEventListener('status',()=>{if(client.status==='closed')removeDialog();});
        dialog.addEventListener('click',event=>{if(event.target===dialog){const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close();}});
        const showDetails=id=>{
            dialog.dataset.provider=id;
            dialog.innerHTML=usageDetails(latestUsage,id,{busy:usageBusy,settingsButton:'<a class="button" href="/engine-room?tab=setup">Provider settings</a>'});
            dialog.querySelector('#usage-close').onclick=()=>dialog.close();
            dialog.querySelector('#usage-refresh').onclick=()=>void refresh(true);
            if(!dialog.open)dialog.showModal();
        };
        const render=(value)=>{
            if(!relevant()||!element)return;
            latestUsage=value;const collapsed=preferences.allowanceDisplay==='collapsed';element.hidden=false;
            element.innerHTML=usageSidebar(value,{collapsed});
            element.querySelector('#toggle-usage').onclick=async()=>{preferences.allowanceDisplay=collapsed?'compact':'collapsed';render(value);await appRequest('/preferences','PUT',{allowanceDisplay:preferences.allowanceDisplay}).catch(()=>{});};
            element.querySelectorAll('[data-usage-provider]').forEach(button=>button.onclick=()=>showDetails(button.dataset.usageProvider));
            if(dialog.open)showDetails(dialog.dataset.provider);
            document.dispatchEvent(new CustomEvent('proteus:usage',{detail:{value,destination:credential.label}}));
        };
        const refresh=async(force=false)=>{
            if(usageBusy)return;usageBusy=true;if(dialog.open)showDetails(dialog.dataset.provider);
            try{await destinationStore.verifySession();if(!relevant())return;const value=await client.request('provider.usage',{force});if(!relevant())return;if(value.enabled===false){dialog.close();unavailable('Hidden by this computer’s privacy setting.');}else render(value);}
            catch(error){if(!relevant())return;if(error.sessionInvalid){stopDefaultMac();report('session','Sign in again before connecting.');}else if(client.status==='online'){latestUsage={providers:Object.fromEntries(['copilot','codex','claude'].map(id=>[id,{error:'Allowance unavailable. Refresh to retry.'}]))};render(latestUsage);}}
            finally{usageBusy=false;if(relevant()&&dialog.open)showDetails(dialog.dataset.provider);}
        };
        client.addEventListener('change',event=>{
            if(!relevant())return;globalWorkspaceTree?.invalidate(credential.hostId,event.detail);if(event.detail?.event!=='state')return;
            const state=event.detail.data;observeRunningChats(credential.hostId,'default',state);
            Object.assign(credential,authenticatedComputerMetadata(state));
            if(typeof state.hostName==='string'&&state.hostName.trim()&&state.hostName.length<=80&&!/[\x00-\x1f\x7f]/.test(state.hostName)){
                const old={...credential};credential.label=state.hostName.trim();void destinationStore.rememberName(old,state.hostName).catch(()=>{});
                connectionState('connected',credential.label+' · Connected',credential);
            }
            if(state.appearance?.showProviderUsage===false){dialog.close();unavailable('Hidden by this computer’s privacy setting.');}else render(state.providerUsage||{providers:{}});
        });
        client.addEventListener('rejected',()=>{if(!relevant())return;rejected=true;report('rejected','Connection rejected. Saved pairing is retained; review access on the computer.',credential);});
        client.addEventListener('revoked',event=>{if(!relevant()||event.detail?.authenticated!==true)return;rejected=true;report('revoked','The computer revoked this connection. Pair again to restore access.',credential);});
        client.addEventListener('status',()=>{if(!relevant())return;if(client.status!=='online')observeRunningChats(credential.hostId,'default',null,false);if(client.status==='closed'&&!rejected){report('unavailable',credential.label+' · connection unavailable. Retrying…',credential);retryLater();}});
        await client.connect();if(!relevant()){client.close();return;}connectionAttempt=0;
        connectionState('connected',credential.label+' · Connected',credential);
        document.dispatchEvent(new CustomEvent('proteus:default-connected'));
        const result=await client.request('sync',{cursor:''});if(!relevant())return;observeRunningChats(credential.hostId,'default',result.state);
        Object.assign(credential,authenticatedComputerMetadata(result.state));
        if(result.state?.hostName){const old={...credential};await destinationStore.rememberName(old,result.state.hostName).catch(()=>{});credential.label=old.label;}
        connectionState('connected',credential.label+' · Connected',credential);
        await refresh();usageTimer=setInterval(()=>{if(!document.hidden)void refresh();},60_000);
    }catch(error){
        if(!relevant())return;
        if(['rejected','revoked'].includes(defaultState.status))return;
        if(error.sessionInvalid){stopDefaultMac();report('session','Sign in again before connecting.');}
        else if(error.status===404){report('unpaired','The Default computer is not paired with this account or browser. Choose a paired computer in Connections.');}
        else if(error.status===409){report('changed','The saved pairing changed. Reload Connections before retrying.');}
        else {report('unavailable','Default computer connection unavailable. Check the computer and relay, or retry in Connections.');retryLater();}
    }
}
export function retryDefaultMac(){return connectDefaultMac();}
const badgeClients=new Map();let badgeTimer;
function stopBadgeClients(){clearTimeout(badgeTimer);for(const [id,client]of badgeClients){observeRunningChats(id,'shell',null,false);client.close();}badgeClients.clear();}
async function connectBadgeClients(){
 clearTimeout(badgeTimer);
 if(stopped||globalThis.proteusSigningOut||document.querySelector('#remote-workspace'))return;
 try{const hosts=await destinationStore.list();for(const host of hosts)ownerLabels.set(host.hostId,host.label);if(stopped)return;const ids=new Set(hosts.map(h=>h.hostId));for(const [id,client]of badgeClients)if(!ids.has(id)||id===preferences?.defaultMacId){client.close();badgeClients.delete(id);observeRunningChats(id,'shell',null,false);}
 await Promise.allSettled(hosts.filter(h=>h.hostId!==preferences?.defaultMacId).map(async host=>{
  if(badgeClients.get(host.hostId)?.status==='online')return;
  badgeClients.get(host.hostId)?.close();const credential=await destinationStore.credential(host.hostId);if(stopped)return;
  const client=new BrowserRemoteClient(credential);badgeClients.set(host.hostId,client);
  const current=()=>!stopped&&badgeClients.get(host.hostId)===client;
  client.addEventListener('change',event=>{if(current()){globalWorkspaceTree?.invalidate(host.hostId,event.detail);if(event.detail?.event==='state')observeRunningChats(host.hostId,'shell',event.detail.data);}});
  client.addEventListener('status',()=>{if(current()&&client.status!=='online')observeRunningChats(host.hostId,'shell',null,false);});
  try{await client.connect();await destinationStore.verifySession();if(!current()){client.close();return;}const result=await client.request('sync',{cursor:''});if(current())observeRunningChats(host.hostId,'shell',result.state);}catch{if(current())observeRunningChats(host.hostId,'shell',null,false);client.close();}
 }));}catch{}finally{if(!stopped)badgeTimer=setTimeout(()=>void connectBadgeClients(),30000);}
}
async function initSharedShell(){
    if(!account)return;
    try{preferences=(await appRequest('?view=bootstrap')).preferences;window.proteusPreferences=preferences;document.dispatchEvent(new CustomEvent('proteus:preferences',{detail:preferences}));}
    catch{connectionState('account','Account unavailable. Reload to retry.');return;}
    document.body.classList.toggle('rail-collapsed',preferences.sidebarCollapsed);
    const railToggle=document.querySelector('#shell-rail-toggle');
    const updateRail=()=>{if(railToggle){railToggle.textContent=preferences.sidebarCollapsed?'›':'‹';railToggle.setAttribute('aria-label',preferences.sidebarCollapsed?'Expand sidebar':'Collapse sidebar');}};updateRail();
    railToggle?.addEventListener('click',async()=>{preferences.sidebarCollapsed=!preferences.sidebarCollapsed;document.body.classList.toggle('rail-collapsed',preferences.sidebarCollapsed);updateRail();await appRequest('/preferences','PUT',{sidebarCollapsed:preferences.sidebarCollapsed}).catch(()=>{});});
    await connectDefaultMac();void connectBadgeClients();
}
// Ordinary external links always leave in an actual browser tab, preserving the app.
document.addEventListener('click',event=>{
    const link=event.target.closest?.('a[href]');if(!link)return;
    let url;try{url=new URL(link.href);}catch{return;}
    if(['http:','https:'].includes(url.protocol)&&url.origin!==location.origin){link.target='_blank';link.rel='noopener noreferrer';void recordBrowserVisit(url.href,link.textContent).catch(()=>{});}
});
window.addEventListener('pagehide',()=>{stopped=true;stopDefaultMac();stopBadgeClients();destinationStore?.close();});
window.addEventListener('pageshow',event=>{if(event.persisted){stopped=false;void initSharedShell();}});
if(account){const channel=new BroadcastChannel('proteus-remote-account');channel.onmessage=event=>{if(event.data?.type==='logout'&&event.data.account===account){stopped=true;stopDefaultMac();stopBadgeClients();connectionState('session','Signed out. Sign in again before connecting.');}};}
if(account&&!document.querySelector('#remote-workspace'))globalWorkspaceTree=createWorkspaceTree({account,primaryHost:()=>preferences?.defaultMacId,
 workspaces:()=>[...ownerStates].flatMap(([hostId,state])=>(state.context?.workspaces||[]).map(w=>({...w,hostId,hostName:state.hostName||ownerLabels.get(hostId)||'Computer'}))),
 status:hostId=>({online:(hostId===preferences?.defaultMacId?usageClient:badgeClients.get(hostId))?.status==='online',supported:ownerStates.get(hostId)?.capabilities?.includes('projects.v1')}),
 projects:hostId=>ownerStates.get(hostId)?.workspaceProjects?.projects||[],
 chats:(hostId,projectId)=>{const state=ownerStates.get(hostId);return (state?.runs||[]).filter(row=>(state.workspaceProjects?.memberships?.[row.id]?.projectId||row.projectId)===projectId);},
 request:ownerRequest,open:(row,item)=>{const url=new URL('/remote',location.origin);for(const [key,value]of Object.entries({view:'workspaces',host:row.hostId,workspace:row.id,project:row.projectId,page:row.projectId?'chats':'projects',...(item?.type==='chat'?{chat:item.chatId||item.id}:item?{tab:item.id,page:'tabs'}:{})}))if(value)url.searchParams.set(key,value);location.assign(url);},
});
void initSharedShell();
