import {mountDownloadIndicator} from './browser-downloads.js';
import {tabOverviewIcon,moreMenuIcon} from './add-tab-menu.js';
export function mountBrowserExtensions(bar,info){
 if(!bar||!window.desktop?.browser)return;
 let control=bar.querySelector('[data-browser-extensions]');
 if(!control){control=document.createElement('button');control.type='button';control.dataset.browserExtensions='';control.innerHTML=moreMenuIcon;control.title='Page menu';control.setAttribute('aria-label','Page menu');control.setAttribute('aria-haspopup','menu');bar.querySelector('.browser-go')?.after(control);}
 control.onclick=async()=>{
  try{
   const rows=await window.desktop.browser({action:'extensions-list',profileId:info.profileId||'default'});
   if(!control.isConnected)return;
   let eligible=false;try{const url=new URL(info.url);eligible=url.origin==='https://chromewebstore.google.com'&&/^\/detail\/(?:[^/]+\/)?[a-p]{32}\/?$/.test(url.pathname);}catch{}
   const rect=control.getBoundingClientRect(),items=[{id:'clear-site',label:'Clear website data…',enabled:/^https?:/.test(info.url||'')},{id:'site-data',label:'Manage website data…',enabled:/^https?:/.test(info.url||'')},...['default','desktop','mobile'].map(mode=>({id:'mode:'+mode,label:(info.siteMode===mode?'✓ ':'')+({default:'Default site version',desktop:'Request desktop site',mobile:'Request mobile site'})[mode],enabled:/^https?:/.test(info.url||'')})),{id:'certificate',label:'View certificate information'},...rows.filter(row=>row.enabled).map(row=>({id:row.id,label:row.name})),...(eligible?[{id:'install',label:'Install extension from this page…'}]:[]),{id:'manage',label:'Manage extensions…'},{id:'devtools',label:'Developer tools'}];
   const selected=await window.desktop.browser({action:'popup-menu',items,x:rect.left,y:rect.bottom});
   // A state refresh may replace the toolbar while the native menu is open.
   // Its captured tab identity still owns the selected action; the host checks
   // that the tab exists instead of silently dropping a user's menu choice.
   if(['clear-site','site-data','certificate'].includes(selected))document.dispatchEvent(new CustomEvent('proteus-page-menu',{detail:{action:selected,info}}));
   else if(selected?.startsWith('mode:'))await window.desktop.browser({action:'site-mode',id:info.id,mode:selected.slice(5)});
   else if(selected==='devtools')await window.desktop.browser({action:'devtools',id:info.id});
   else if(selected==='manage')document.dispatchEvent(new CustomEvent('proteus-browser-preferences'));
   else if(selected==='install')await window.desktop.browser({action:'extensions-store-install',profileId:info.profileId,url:info.url});
   else if(rows.some(row=>row.id===selected))await window.desktop.browser({action:'extensions-open',profileId:info.profileId,extensionId:selected,x:rect.left,y:rect.bottom});
  }catch(error){document.dispatchEvent(new CustomEvent('proteus-notice',{detail:error.message}));}
 };
 if(!bar.querySelector('[id$="overview"],[data-browser-overview]')){const overview=document.createElement('button');overview.type='button';overview.dataset.browserOverview='';overview.innerHTML=tabOverviewIcon;overview.title='Tab overview';overview.setAttribute('aria-label','Tab overview');overview.onclick=()=>document.getElementById('all-tabs-overview')?.click();control.after(overview);}
 mountDownloadIndicator(bar);
}
