import { BrowserDestinationStore, BrowserRemoteClient } from './remote-client.js';
import { usagePanel } from './remote-usage.js';
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
export function recordBrowserVisit(url,title){
    const key='proteus.browser-device.'+account;let deviceId;
    try{deviceId=localStorage.getItem(key);if(!/^[a-f0-9-]{36}$/i.test(deviceId||'')){deviceId=crypto.randomUUID();localStorage.setItem(key,deviceId);}}catch{deviceId=crypto.randomUUID();}
    const platform=navigator.userAgentData?.platform||navigator.platform||'';
    const name=/iPhone|iPad|iPod/i.test(platform)?'iOS':/Mac/i.test(platform)?'macOS':/Win/i.test(platform)?'Windows':/Android/i.test(navigator.userAgent)?'Android':/Linux/i.test(platform)?'Linux':'this device';
    return appRequest('/history','POST',{eventId:crypto.randomUUID(),url,title:String(title||'').slice(0,160),source:'web',visitedAt:new Date().toISOString(),deviceId,deviceName:'Browser on '+name});
}
let usageClient, usageTimer, reconnectTimer, connectionGeneration=0, connectionAttempt=0, stopped=false;
let preferences;
let defaultState={status:'loading',message:'Loading saved Mac connections…',hostId:null,label:''};
const destinationStore=account?new BrowserDestinationStore(account):null;
export const defaultMacStatus=()=>({...defaultState});
function connectionState(status,message,host={}){
    defaultState={status,message,hostId:host.hostId||preferences?.defaultMacId||null,label:host.label||''};
    document.dispatchEvent(new CustomEvent('proteus:default-status',{detail:defaultMacStatus()}));
}
export async function defaultMacRequest(method,args={}){
    if(usageClient?.status!=='online')throw new Error(defaultState.message);
    await destinationStore.verifySession();return usageClient.request(method,args);
}
export async function updateDefaultMac(id){
    await appRequest('/preferences','PUT',{defaultMacId:id||null});
    preferences.defaultMacId=id||null;window.proteusPreferences=preferences;
    await connectDefaultMac();
}
function stopDefaultMac(){
    ++connectionGeneration;clearTimeout(reconnectTimer);clearInterval(usageTimer);reconnectTimer=null;
    const old=usageClient;usageClient=null;old?.close();
}
async function connectDefaultMac({retry=false}={}){
    stopDefaultMac();if(stopped||globalThis.proteusSigningOut)return;
    if(!retry)connectionAttempt=0;
    const generation=connectionGeneration,element=document.querySelector('#web-provider-usage');
    const unavailable=message=>{if(!element)return;element.hidden=false;element.replaceChildren();const heading=document.createElement('strong');heading.textContent='AI Allowance';const note=document.createElement('p');note.textContent=message;element.append(heading,note);};
    const report=(status,message,host)=>{connectionState(status,message,host);unavailable(message);};
    const selected=preferences?.defaultMacId;
    if(!selected){report('unselected','Choose a Default Mac in Engine Room.');return;}
    report('connecting','Connecting to the Default Mac…');
    const relevant=()=>generation===connectionGeneration&&!stopped&&!globalThis.proteusSigningOut;
    const retryLater=()=>{if(!relevant()||reconnectTimer||connectionAttempt>=5)return;const delay=Math.min(1000*2**connectionAttempt++,16000);reconnectTimer=setTimeout(()=>{reconnectTimer=null;void connectDefaultMac({retry:true});},delay);};
    try {
        const credential=await destinationStore.credential(selected);if(!relevant())return;
        const client=usageClient=new BrowserRemoteClient(credential);let rejected=false;
        const render=(value,error='')=>{
            if(!relevant()||!element)return;
            const mode=preferences.allowanceDisplay;element.hidden=false;
            element.innerHTML=mode==='collapsed'?'<header class="web-usage-heading"><span>AI Allowance</span><button type="button" data-usage-collapse aria-expanded="false" aria-label="Expand AI Allowance">⌄</button></header>':usagePanel(value,{compact:mode==='compact',destination:credential.label,error});
            element.querySelector('[data-usage-collapse]')?.addEventListener('click',async()=>{preferences.allowanceDisplay=mode==='collapsed'?'compact':mode==='compact'?'expanded':'collapsed';render(value);await appRequest('/preferences','PUT',{allowanceDisplay:preferences.allowanceDisplay}).catch(()=>{});});
            element.querySelector('[data-usage-refresh]')?.addEventListener('click',()=>void refresh(true));
            document.dispatchEvent(new CustomEvent('proteus:usage',{detail:{value,destination:credential.label}}));
        };
        const refresh=async(force=false)=>{
            try{await destinationStore.verifySession();if(!relevant())return;const value=await client.request('provider.usage',{force});if(!relevant())return;if(value.enabled===false)unavailable('Hidden by this Mac’s privacy setting.');else render(value);}
            catch(error){if(!relevant())return;if(error.sessionInvalid){stopDefaultMac();report('session','Sign in again before connecting.');}else if(client.status==='online')unavailable(credential.label+' · allowance unavailable.');}
        };
        client.addEventListener('change',event=>{
            if(!relevant()||event.detail?.event!=='state')return;
            const state=event.detail.data;
            if(typeof state.hostName==='string'&&state.hostName.trim()&&state.hostName.length<=80&&!/[\x00-\x1f\x7f]/.test(state.hostName)){
                const old={...credential};credential.label=state.hostName.trim();void destinationStore.rememberName(old,state.hostName).catch(()=>{});
                connectionState('connected',credential.label+' · Connected',credential);
            }
            if(state.appearance?.showProviderUsage===false)unavailable('Hidden by this Mac’s privacy setting.');else render(state.providerUsage||{providers:{}});
        });
        client.addEventListener('rejected',()=>{if(!relevant())return;rejected=true;report('rejected','Connection rejected. Saved pairing is retained; review access on the Mac.',credential);});
        client.addEventListener('revoked',event=>{if(!relevant()||event.detail?.authenticated!==true)return;rejected=true;report('revoked','The Mac revoked this connection. Pair again to restore access.',credential);});
        client.addEventListener('status',()=>{if(!relevant())return;if(client.status==='closed'&&!rejected){report('unavailable',credential.label+' · connection unavailable. Retrying…',credential);retryLater();}});
        await client.connect();if(!relevant()){client.close();return;}connectionAttempt=0;
        connectionState('connected',credential.label+' · Connected',credential);
        document.dispatchEvent(new CustomEvent('proteus:default-connected'));
        const result=await client.request('sync',{cursor:''});if(!relevant())return;
        if(result.state?.hostName){const old={...credential};await destinationStore.rememberName(old,result.state.hostName).catch(()=>{});credential.label=old.label;connectionState('connected',credential.label+' · Connected',credential);}
        await refresh();usageTimer=setInterval(()=>{if(!document.hidden)void refresh();},60_000);
    }catch(error){
        if(!relevant())return;
        if(['rejected','revoked'].includes(defaultState.status))return;
        if(error.sessionInvalid){stopDefaultMac();report('session','Sign in again before connecting.');}
        else if(error.status===404){report('unpaired','The Default Mac is not paired with this account or browser. Choose a paired Mac in Connections.');}
        else if(error.status===409){report('changed','The saved pairing changed. Reload Connections before retrying.');}
        else {report('unavailable','Default Mac connection unavailable. Check the Mac and relay, or retry in Connections.');retryLater();}
    }
}
export function retryDefaultMac(){return connectDefaultMac();}
async function initSharedShell(){
    if(!account)return;
    try{preferences=(await appRequest()).preferences;window.proteusPreferences=preferences;document.dispatchEvent(new CustomEvent('proteus:preferences',{detail:preferences}));}
    catch{connectionState('account','Account unavailable. Reload to retry.');return;}
    document.body.classList.toggle('rail-collapsed',preferences.sidebarCollapsed);
    const railToggle=document.querySelector('#shell-rail-toggle');
    const updateRail=()=>{if(railToggle){railToggle.textContent=preferences.sidebarCollapsed?'›':'‹';railToggle.setAttribute('aria-label',preferences.sidebarCollapsed?'Expand sidebar':'Collapse sidebar');}};updateRail();
    railToggle?.addEventListener('click',async()=>{preferences.sidebarCollapsed=!preferences.sidebarCollapsed;document.body.classList.toggle('rail-collapsed',preferences.sidebarCollapsed);updateRail();await appRequest('/preferences','PUT',{sidebarCollapsed:preferences.sidebarCollapsed}).catch(()=>{});});
    await connectDefaultMac();
}
// Ordinary external links always leave in an actual browser tab, preserving the app.
document.addEventListener('click',event=>{
    const link=event.target.closest?.('a[href]');if(!link)return;
    let url;try{url=new URL(link.href);}catch{return;}
    if(['http:','https:'].includes(url.protocol)&&url.origin!==location.origin){link.target='_blank';link.rel='noopener noreferrer';void recordBrowserVisit(url.href,link.textContent).catch(()=>{});}
});
window.addEventListener('pagehide',()=>{stopped=true;stopDefaultMac();destinationStore?.close();});
window.addEventListener('pageshow',event=>{if(event.persisted){stopped=false;void initSharedShell();}});
if(account){const channel=new BroadcastChannel('proteus-remote-account');channel.onmessage=event=>{if(event.data?.type==='logout'&&event.data.account===account){stopped=true;stopDefaultMac();connectionState('session','Signed out. Sign in again before connecting.');}};}
void initSharedShell();
