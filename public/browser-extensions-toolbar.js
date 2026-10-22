import {mountDownloadIndicator} from './browser-downloads.js';
import {appendMenuLabel} from './menu-icons.js';
import {tabOverviewIcon,moreMenuIcon} from './add-tab-menu.js';
const extensionLists=new Map();
const toolbarInfo=new WeakMap();
function extensionList(profileId){if(!extensionLists.has(profileId)){if(extensionLists.size>=32)extensionLists.delete(extensionLists.keys().next().value);const request=window.desktop.browser({action:'extensions-list',profileId}).catch(error=>{if(extensionLists.get(profileId)===request)extensionLists.delete(profileId);throw error;});extensionLists.set(profileId,request);}return extensionLists.get(profileId);}
document.addEventListener('proteus-extensions-changed',event=>{extensionLists.delete(event.detail.profileId||'default');for(const bar of document.querySelectorAll('.browserbar')){const info=toolbarInfo.get(bar);if(info)mountBrowserExtensions(bar,info.info);}});
export function mountBrowserExtensions(bar,info){
 if(!bar||!window.desktop?.browser)return;const stamp={info};toolbarInfo.set(bar,stamp);
 let control=bar.querySelector('[data-browser-extensions]');
 if(!control){control=document.createElement('button');control.type='button';control.dataset.browserExtensions='';control.innerHTML=moreMenuIcon;control.title='Page menu';control.setAttribute('aria-label','Page menu');control.setAttribute('aria-haspopup','menu');bar.querySelector('.browser-go')?.after(control);}
 control.onclick=async()=>{
  try{
   const [rows,media]=await Promise.all([extensionList(info.profileId||'default'),window.desktop.browser({action:'media-settings'})]);
   if(!control.isConnected)return;
   let eligible=false;try{const url=new URL(info.url);eligible=url.origin==='https://chromewebstore.google.com'&&/^\/detail\/(?:[^/]+\/)?[a-p]{32}\/?$/.test(url.pathname);}catch{}
   const rect=control.getBoundingClientRect(),items=[{id:'autoplay',label:(media.blockVideoAutoplay?'✓ ':'')+'Block video autoplay in all tabs'},{id:'clear-site',label:'Clear website data…',enabled:/^https?:/.test(info.url||'')},{id:'site-data',label:'Manage website data…',enabled:/^https?:/.test(info.url||'')},...['default','desktop','mobile'].map(mode=>({id:'mode:'+mode,label:(info.siteMode===mode?'✓ ':'')+({default:'Default site version',desktop:'Request desktop site',mobile:'Request mobile site'})[mode],enabled:/^https?:/.test(info.url||'')})),{id:'certificate',label:'View certificate information'},...rows.filter(row=>row.enabled).map(row=>({id:row.id,label:row.name,icon:row.icon})),...(eligible?[{id:'install',label:'Install extension from this page…'}]:[]),{id:'manage',label:'Manage extensions…'},{id:'devtools',label:'Developer tools'}];
   const style=getComputedStyle(document.documentElement),colors={background:style.getPropertyValue('--panel').trim(),text:style.getPropertyValue('--ink').trim(),border:style.getPropertyValue('--line').trim(),hover:style.getPropertyValue('--bg').trim(),accent:style.getPropertyValue('--accent').trim()};
   const selected=await window.desktop.browser({action:'page-menu',id:info.id,items,x:rect.right,y:rect.bottom,colors});
   // A state refresh may replace the toolbar while the page menu is open.
   // Its captured tab identity still owns the selected action; the host checks
   // that the tab exists instead of silently dropping a user's menu choice.
   if(['clear-site','site-data','certificate'].includes(selected))document.dispatchEvent(new CustomEvent('proteus-page-menu',{detail:{action:selected,info}}));
   else if(selected?.startsWith('mode:'))await window.desktop.browser({action:'site-mode',id:info.id,mode:selected.slice(5)});
   else if(selected==='autoplay')await window.desktop.browser({action:'media-settings',blockVideoAutoplay:!media.blockVideoAutoplay});
   else if(selected==='devtools')await window.desktop.browser({action:'devtools',id:info.id});
   else if(selected==='manage')document.dispatchEvent(new CustomEvent('proteus-browser-preferences'));
   else if(selected==='install')await window.desktop.browser({action:'extensions-store-install',profileId:info.profileId,url:info.url});
   else if(rows.some(row=>row.id===selected))await window.desktop.browser({action:'extensions-open',profileId:info.profileId,extensionId:selected,x:rect.left,y:rect.bottom});
  }catch(error){document.dispatchEvent(new CustomEvent('proteus-notice',{detail:error.message}));}
 };
 if(!bar.querySelector('[id$="overview"],[data-browser-overview]')){const overview=document.createElement('button');overview.type='button';overview.dataset.browserOverview='';overview.innerHTML=tabOverviewIcon;overview.title='Tab overview';overview.setAttribute('aria-label','Tab overview');overview.onclick=()=>document.getElementById('all-tabs-overview')?.click();control.after(overview);}
 mountDownloadIndicator(bar);
 const downloads=bar.querySelector('[data-browser-downloads]');if(downloads)downloads.after(control);
 let pins=bar.querySelector('[data-browser-extension-pins]');if(!pins){pins=document.createElement('span');pins.dataset.browserExtensionPins='';pins.className='browser-extension-pins';bar.querySelector('.browser-go')?.after(pins);}
 const profileId=info.profileId||'default';if(pins.dataset.profile!==profileId){pins.replaceChildren();pins.dataset.profile=profileId;delete pins.dataset.signature;}
 if(info.profileLocked){pins.replaceChildren();delete pins.dataset.signature;return;}
 void extensionList(profileId).then(rows=>{
  if(!bar.isConnected||toolbarInfo.get(bar)!==stamp)return;
  const pinned=rows.filter(row=>row.enabled&&row.toolbar),signature=JSON.stringify(pinned.map(row=>[row.id,row.icon,row.name]));if(pins.dataset.signature===signature)return;pins.dataset.signature=signature;pins.replaceChildren();
  for(const row of pinned){const button=document.createElement('button');button.type='button';button.dataset.extensionId=row.id;button.title=row.name;button.setAttribute('aria-label',row.name);button.setAttribute('aria-haspopup','dialog');appendMenuLabel(button,{id:row.id,label:'',icon:row.icon});button.onclick=()=>{const rect=button.getBoundingClientRect();void window.desktop.browser({action:'extensions-open',profileId,extensionId:row.id,x:rect.left,y:rect.bottom}).catch(error=>document.dispatchEvent(new CustomEvent('proteus-notice',{detail:error.message})));};pins.append(button);}
 }).catch(()=>{});
}
