import {installTabHints} from '../../../public/shared/navigation/tab-interactions.js';
installTabHints();
import { installPageFind } from '../../../public/shared/ui/page-find.js';
import {installLinkPreview} from '../../../public/shared/ui/link-preview.js';
installLinkPreview();
import '../../../public/page-find.css';
import {mountHome} from '../../../public/shared/ui/home.js';
import {mount as mountHomeMarkdown} from '../../../src/shared/markdown-renderer.js';
import './scratchpad.js';
import {appRequest,ownerRequest,escapeHTML} from './shared-app.js';
import {clearChatIndex,clearChatDrafts} from './remote-cache.js';
import './app-tools.js';
import './shell.js';
import './life-reminders.js';
import './life-home.js';
import './life-overview.js';
import './life-result.js';
import { Passkeys } from '@laravel/passkeys';
const status = document.querySelector('#client-status');
const notice = text => { if(status) { status.textContent=text; status.hidden=false; } };
for(const button of document.querySelectorAll('[data-passkey]')) {
 button.addEventListener('click',async()=> {
  button.disabled=true;
  try {
   if(button.dataset.passkey==='register') { await Passkeys.register({name:document.querySelector('#passkey-name').value||'My device'}); location.reload(); }
   else if(button.dataset.passkey==='confirm') { await Passkeys.verify({routes:{options:'/passkeys/confirm/options',submit:'/passkeys/confirm'}}); location.href='/home'; }
   else { const result=await Passkeys.verify(); location.href=result.redirect||'/home'; }
  } catch(e) { notice(e.message+' If confirmation is needed, confirm your password below and retry.'); }
  finally { button.disabled=false; }
 });
}
const kind=document.querySelector('#capture-kind');
function updateFields() { if(!kind) { return; } for(const group of document.querySelectorAll('[data-kinds]')) { const active=group.dataset.kinds.split(',').includes(kind.value); group.hidden=!active; for(const field of group.querySelectorAll('input,select,textarea')) { field.disabled=!active; } } }
kind?.addEventListener('change',updateFields); updateFields();
const setup=document.querySelector('#setup-token');
if(setup && location.hash) { setup.value=location.hash.slice(1); history.replaceState(null,'',location.pathname); }

const measurementList = document.querySelector('#oil-measurements');
if (measurementList) {
    let index = Math.max(-1, ...Array.from(measurementList.querySelectorAll('input[name]'), input => Number(input.name.match(/\[measurements\]\[(\d+)\]/)?.[1] ?? -1))) + 1;
    document.querySelector('#add-measurement').addEventListener('click', () => {
        const row = document.querySelector('#oil-measurement-template').content.cloneNode(true);
        row.querySelectorAll('[data-field]').forEach(input => {
            input.name = `data[measurements][${index}][${input.dataset.field}]`;
        });
        index++;
        measurementList.append(row);
    });
    measurementList.addEventListener('click', event => {
        if (event.target.matches('.remove-measurement')) event.target.closest('.oil-measurement').remove();
    });
}

// Explicit logout clears browser-only keys and local preferences. Account destinations remain on the server.
const logoutForm = document.querySelector('form[action$="/logout"]');
logoutForm?.addEventListener('submit', async event => {
    if (logoutForm.dataset.remoteCleared) return;
    event.preventDefault();globalThis.proteusSigningOut=true;
    const { PairingStore } = await import('./remote-client.js');
    const account = document.body.dataset.browserAccount;clearChatIndex(account);clearChatDrafts(account);
    const subscriptionId=localStorage.getItem('proteus.push.subscription.'+account);if(subscriptionId){await appRequest('/push-subscriptions/'+subscriptionId,'DELETE').catch(()=>{});localStorage.removeItem('proteus.push.subscription.'+account);try{const registration=await navigator.serviceWorker?.getRegistration();await (await registration?.pushManager?.getSubscription())?.unsubscribe();}catch{}}
    const channel = new BroadcastChannel('proteus-remote-account');
    channel.postMessage({ type: 'logout', account }); channel.close();
    try { const store = new PairingStore(account); await store.clear(); store.close(); } finally { logoutForm.dataset.remoteCleared = 'true'; logoutForm.requestSubmit(); }
});
if (document.querySelector('#remote-workspace')) import('./remote.js');
if(document.querySelector('#life-ask'))void(async()=>{
 const host=document.querySelector('#life-ask-history');let view,store,closed=false;
 const stop=()=>{closed=true;view?.close();store?.close();host.replaceChildren();};
 window.addEventListener('pagehide',stop);document.querySelector('form[action$="/logout"]')?.addEventListener('submit',stop);
 try{
  const [{mountLifeAsk},{BrowserDestinationStore},identity]=await Promise.all([import('./life-ask.js'),import('./remote-client.js'),appRequest('?view=bootstrap')]);
  if(closed)return;
  store=new BrowserDestinationStore(document.body.dataset.browserAccount);
  view=mountLifeAsk(host,{accountID:identity.accountId,destinations:()=>store.list(),request:ownerRequest,escape:escapeHTML,open:(hostID,chatID)=>{location.assign('/remote?'+new URLSearchParams({view:'chats',host:hostID,chat:chatID}));}});
  document.querySelector('#life-ask-refresh').onclick=()=>view.refresh();
 }catch{if(!closed)host.textContent='Could not load Life Ask. Sign in again or refresh.';}
})();

const home=document.querySelector('#proteus-home');
if(home){const value=JSON.parse(document.querySelector('#proteus-home-data').textContent);mountHome(home,value,{markdown:(target,source)=>mountHomeMarkdown(target,source,{allowExternalImages:false}),navigate:page=>{location.href=({chats:'/remote?view=chats',schedules:'/remote?view=schedules',team:'/team',life:'/garage'})[page];}});}

const pageFind=installPageFind();
document.querySelector('#shell-find')?.addEventListener('click',()=>pageFind.open());
