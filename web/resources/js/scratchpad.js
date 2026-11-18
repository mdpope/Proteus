import {createScratchpadView} from '../../../public/features/scratchpad/scratchpad.js';
import {ownerRequest,defaultMacStatus,scratchpadComputers} from './shared-app.js';
import {mount as markdown} from '../../../src/shared/markdown-renderer.js';
import {featureResources} from './feature-resources.js';
const host=document.querySelector('#scratchpad');
if(host){
 let view,owner,resources,closed=false,starting=false,requestedHost,computers=[];const url=new URL(location.href),explicitHost=url.searchParams.get('host');let projectId=url.searchParams.get('project')||undefined;
 const choose=async id=>{requestedHost=id;projectId=undefined;const next=new URL(location.href);next.searchParams.set('host',id);next.searchParams.delete('project');history.replaceState(null,'',next);await mount();};
 // The main tab already carries the computer picker; the sidebar lists recents from every computer.
 function sidebar(){document.querySelector('[data-feature=scratchpad] [data-scratch-computers]')?.remove();}
 async function mount(){
  const selected=requestedHost||explicitHost||defaultMacStatus().hostId;if(closed||starting||!selected)return;
  if(view&&owner===selected)return;
  starting=true;
  try{
   computers=await scratchpadComputers();sidebar();await view?.leave();const [catalog,context]=await Promise.all([ownerRequest(selected,'projects.get'),ownerRequest(selected,'context.get')]);if(closed)return;
   await view?.destroy();
   resources?.destroy();resources=featureResources(host,'scratchpad:'+selected,{owner:()=>selected});
   owner=selected;sidebar();view=createScratchpadView({contentTabs:resources,onOpenRecord:id=>resources.openRecord('scratch',id),request:args=>ownerRequest(selected,'scratchpad.command',args),projectId,projects:()=>catalog.projects,workspaces:()=>context.workspaces||[],owners:()=>computers,ownerId:selected,onOwner:choose,
    storageKey:'proteus.scratchpad.'+document.body.dataset.browserAccount+':'+selected+':'+(projectId||'all'),
    markdown:(target,text,options={})=>markdown(target,text,{...options,allowExternalImages:false,copy:text=>navigator.clipboard.writeText(text),link:link=>{if(/^https?:\/\//i.test(link))window.open(link,'_blank','noopener,noreferrer');else void options.link?.(link);}}),notify:message=>{host.setAttribute('aria-description',message);}});
   await view.mount(host);
  }catch(error){if(!closed)host.textContent=error.message;}finally{starting=false;}
 }
 document.addEventListener('proteus:default-status',mount);
 window.addEventListener('pagehide',()=>{closed=true;view?.persist();void view?.leave();document.removeEventListener('proteus:default-status',mount);});
 void mount();
}
