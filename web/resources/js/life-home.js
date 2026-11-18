import {mountHome} from '../../../public/features/tools/life-home.js';
import {defaultMacRequest,defaultMacStatus,appRequest} from './shared-app.js';
const host=document.querySelector('#life-home');
if(host){
 let view,closed=false,dashboardVersion=0;
 const dashboard=document.querySelector('#life-home-dashboard');
 const request=async args=>{
  const identity=await appRequest('?view=bootstrap'),account=identity.accountId;
  if(args.accountId&&args.accountId!==account)throw Error('Life account changed. Reload Smart Home.');
  const result=await defaultMacRequest('life.home.'+args.action,{...args,accountId:account});const after=await appRequest('?view=bootstrap');
  if(account!==after.accountId||result.accountId&&result.accountId!==account)throw Error('The computer is signed in to a different Life account.');return result;
 };
 async function select(tab,url){
  const version=++dashboardVersion;host.hidden=tab!=='smart';dashboard.hidden=tab!=='assistant';
  for(const button of document.querySelectorAll('[data-home-tab]')){if(button.dataset.homeTab===tab)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');}
  const address=new URL(location.href);address.searchParams.set('tab',tab);history.replaceState(null,'',address);
  if(tab!=='assistant')return;
  // Retain a loaded frame while switching to native controls and back.
  if(dashboard.dataset.origin&&!url)return;
  dashboard.replaceChildren(document.createTextNode('Loading Home Assistant connection…'));
  try{
   if(!url)url=(await request({action:'view'})).origin;
   if(closed||version!==dashboardVersion)return;
   const parsed=new URL(url);if(!['http:','https:'].includes(parsed.protocol)||parsed.username||parsed.password)throw Error('Connect Home Assistant in Smart Home first.');
   dashboard.dataset.origin=parsed.origin;dashboard.replaceChildren();
   const heading=document.createElement('h1');heading.textContent='Home Assistant';
   const link=document.createElement('a');link.href=parsed.href;link.target='_blank';link.rel='noopener noreferrer';link.className='button';link.textContent='Open Home Assistant in a browser tab';
   const note=document.createElement('p');note.textContent=parsed.protocol==='http:'&&location.protocol==='https:'?'This HTTPS website cannot embed your HTTP Home Assistant address. Open its interface in a browser tab, or use the embedded tab in the Proteus desktop or iOS app.':'If Home Assistant does not allow embedding, open it in a browser tab. Its sign-in remains separate from the Proteus connection.';
   dashboard.append(heading,link,note);
   if(parsed.protocol==='https:'||location.protocol==='http:'){const frame=document.createElement('iframe');frame.title='Home Assistant';frame.src=parsed.href;frame.referrerPolicy='no-referrer';frame.style.cssText='width:100%;height:75vh;border:0';dashboard.append(frame);}
  }catch(error){if(!closed&&version===dashboardVersion){delete dashboard.dataset.origin;dashboard.textContent=error.message;}}
 }
 document.querySelectorAll('[data-home-tab]').forEach(button=>button.onclick=()=>void select(button.dataset.homeTab));
 const mount=()=>{if(closed||view||defaultMacStatus().status!=='online')return;view=mountHome(host,{request,openWebsite:url=>select('assistant',url)});if(new URLSearchParams(location.search).get('tab')==='assistant')void select('assistant');};
 document.addEventListener('proteus:default-status',mount);window.addEventListener('pagehide',()=>{closed=true;view?.destroy();document.removeEventListener('proteus:default-status',mount);});mount();
}
