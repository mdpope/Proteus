import {mountDownloadIndicator} from './browser-downloads.js';
export function mountBrowserExtensions(bar,info){
 if(!bar||!window.desktop?.browser)return;
 let control=bar.querySelector('[data-browser-extensions]');
 if(!control){control=document.createElement('button');control.type='button';control.dataset.browserExtensions='';control.textContent='▧';control.title='Extensions';control.setAttribute('aria-label','Extensions');control.setAttribute('aria-haspopup','menu');bar.querySelector('.browser-go')?.after(control);}
 control.onclick=async()=>{
  try{
   const rows=await window.desktop.browser({action:'extensions-list',profileId:info.profileId||'default'});
   if(!control.isConnected)return;
   let eligible=false;try{const url=new URL(info.url);eligible=url.origin==='https://chromewebstore.google.com'&&/^\/detail\/(?:[^/]+\/)?[a-p]{32}\/?$/.test(url.pathname);}catch{}
   const rect=control.getBoundingClientRect(),items=[...rows.filter(row=>row.enabled).map(row=>({id:row.id,label:row.name})),...(eligible?[{id:'install',label:'Install extension from this page…'}]:[]),{id:'manage',label:'Manage extensions…'},{id:'devtools',label:'Developer tools'},{id:'developer-access',label:info.developerShared?'Disable agent developer mode':'Enable agent developer mode'}];
   const selected=await window.desktop.browser({action:'popup-menu',items,x:rect.left,y:rect.bottom});
   if(!control.isConnected)return;
   if(selected==='devtools')await window.desktop.browser({action:'devtools',id:info.id});
   else if(selected==='developer-access')await window.desktop.browser({action:'developer-access',id:info.id,enabled:!info.developerShared});
   else if(selected==='manage')document.dispatchEvent(new CustomEvent('proteus-browser-preferences'));
   else if(selected==='install')await window.desktop.browser({action:'extensions-store-install',profileId:info.profileId,url:info.url});
   else if(rows.some(row=>row.id===selected))await window.desktop.browser({action:'extensions-open',profileId:info.profileId,extensionId:selected,x:rect.left,y:rect.bottom});
  }catch(error){document.dispatchEvent(new CustomEvent('proteus-notice',{detail:error.message}));}
 };
 if(!bar.querySelector('[id$="overview"],[data-browser-overview]')){const overview=document.createElement('button');overview.type='button';overview.dataset.browserOverview='';overview.textContent='▦';overview.title='Tab overview';overview.setAttribute('aria-label','Tab overview');overview.onclick=()=>document.getElementById('all-tabs-overview')?.click();control.after(overview);}
 mountDownloadIndicator(bar);
}
