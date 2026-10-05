import { AccountPairingStore, BrowserRemoteClient } from './remote-client.js';
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
let usageClient, usageTimer;
export async function defaultMacRequest(method,args={}){if(usageClient?.status!=='online')throw new Error('The Default Mac is offline. Choose another explicitly in Connections.');const store=new AccountPairingStore(account,{sessionURL:'/remote/session'});await store.verifySession();return usageClient.request(method,args);}
async function initSharedShell() {
    if (!account) return;
    const element = document.querySelector('#web-provider-usage');
    let preferences;
    try { preferences = (await appRequest()).preferences; window.proteusPreferences = preferences; document.dispatchEvent(new CustomEvent('proteus:preferences',{detail:preferences})); }
    catch { if (element) {element.hidden=false; element.textContent='AI Allowance · account unavailable';} return; }
    document.body.classList.toggle('rail-collapsed', preferences.sidebarCollapsed);const railToggle=document.querySelector('#shell-rail-toggle');if(railToggle){railToggle.textContent=preferences.sidebarCollapsed?'›':'‹';railToggle.setAttribute('aria-label',preferences.sidebarCollapsed?'Expand sidebar':'Collapse sidebar');}
    document.querySelector('#shell-rail-toggle')?.addEventListener('click', async()=> {
        preferences.sidebarCollapsed = !preferences.sidebarCollapsed;
        document.body.classList.toggle('rail-collapsed',preferences.sidebarCollapsed);if(railToggle){railToggle.textContent=preferences.sidebarCollapsed?'›':'‹';railToggle.setAttribute('aria-label',preferences.sidebarCollapsed?'Expand sidebar':'Collapse sidebar');}
        try {await appRequest('/preferences','PUT',{sidebarCollapsed:preferences.sidebarCollapsed});} catch { /* Local toggle remains usable while offline. */ }
    });
    if (!element) return;
    element.hidden=false;
    if (!preferences.defaultMacId) {element.innerHTML='<strong>AI Allowance</strong><p>Choose a Default Mac in Engine Room.</p>';return;}
    const store = new AccountPairingStore(account,{sessionURL:'/remote/session'});
    const unavailable = message => {element.replaceChildren();const heading=document.createElement('strong');heading.textContent='AI Allowance';const note=document.createElement('p');note.textContent=message;element.append(heading,note);};
    try {
        const credential = await store.credential(preferences.defaultMacId);
        const client = usageClient = new BrowserRemoteClient(credential);
        const render = (value, error='') => {
            const mode=preferences.allowanceDisplay;
            element.innerHTML=mode==='collapsed'?'<header class="web-usage-heading"><span>AI Allowance</span><button type="button" data-usage-collapse aria-expanded="false" aria-label="Expand AI Allowance">⌄</button></header>':usagePanel(value,{compact:mode==='compact',destination:credential.label,error});
            element.querySelector('[data-usage-collapse]')?.addEventListener('click',async()=>{preferences.allowanceDisplay=mode==='collapsed'?'compact':mode==='compact'?'expanded':'collapsed';render(value);await appRequest('/preferences','PUT',{allowanceDisplay:preferences.allowanceDisplay}).catch(()=>{});});
            element.querySelector('[data-usage-refresh]')?.addEventListener('click',()=>void refresh(true));
            document.dispatchEvent(new CustomEvent('proteus:usage',{detail:{value,destination:credential.label}}));
        };
        const refresh=async(force=false)=>{try {await store.verifySession();const value=await client.request('provider.usage',{force});if(value.enabled===false){unavailable('Hidden by this Mac’s privacy setting.');return;}render(value);}catch{unavailable(credential.label+' · offline or allowance unavailable.');}};
        client.addEventListener('change',event=>{if(event.detail?.event==='state'){const state=event.detail.data;if(state.appearance?.showProviderUsage===false)unavailable('Hidden by this Mac’s privacy setting.');else render(state.providerUsage||{providers:{}});}});
        client.addEventListener('status',()=>{if(client.status==='closed')unavailable(credential.label+' · offline.');});
        await client.connect();document.dispatchEvent(new CustomEvent('proteus:default-connected'));await refresh();usageTimer=setInterval(()=>{if(!document.hidden)void refresh();},60_000);
    } catch {unavailable('Default Mac offline or unavailable. Choose another explicitly in Engine Room.');}
}
// Ordinary external links always leave in an actual browser tab, preserving the app.
document.addEventListener('click',event=>{
    const link=event.target.closest?.('a[href]');if(!link)return;
    let url;try{url=new URL(link.href);}catch{return;}
    if(['http:','https:'].includes(url.protocol)&&url.origin!==location.origin){link.target='_blank';link.rel='noopener noreferrer';void appRequest('/history','POST',{url:url.href,title:link.textContent.slice(0,160),source:'web'}).catch(()=>{});}
});
window.addEventListener('pagehide',()=>{clearInterval(usageTimer);usageClient?.close();});
void initSharedShell();
