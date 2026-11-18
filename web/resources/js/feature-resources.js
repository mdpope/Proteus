import {mountFileBrowser,mountFileDocument} from '../../../public/features/workspaces/file-browser.js';
import {ownerRequest,defaultMacStatus,escapeHTML} from './shared-app.js';
import {tabSelectionHTML} from '../../../public/shared/navigation/add-tab-menu.js';
import {createScratchpadView} from '../../../public/features/scratchpad/scratchpad.js';
import {mountReminderWorkbench} from '../../../public/features/tools/life-reminders.js';
import {mount as markdown} from '../../../src/shared/markdown-renderer.js';
import {browserTarget} from '../../../public/features/browser/browser-home.js';
import {featurePreviews} from './feature-previews.js';

// Reuse the remote file viewer and its per-read grants. Embedded web pages keep
// normal browser cookies; private sessions/terminals need the native application.
export function featureResources(host,feature,{owner=()=>defaultMacStatus().hostId}={}){
 const key='proteus.web-feature-tabs.'+document.body.dataset.browserAccount+':'+feature,views=new Map(),previews=featurePreviews();let rows=[],selected=null,listener,navigationVersion=0;
 const capture=()=>previews.capture(selected||'master',selected?views.get(selected)?.host:host);
 const clearPreviews=()=>previews.clear();window.addEventListener('pagehide',clearPreviews);
 document.querySelector('form[action$="/logout"]')?.addEventListener('submit',clearPreviews);
 try{rows=JSON.parse(localStorage.getItem(key)||'[]').filter(row=>['browser','files','document','scratch','reminder'].includes(row.type)).slice(0,100);}catch{}
 const area=document.createElement('section');area.className='web-feature-resource';area.hidden=true;host.after(area);
 const save=()=>{localStorage.setItem(key,JSON.stringify(rows));if(selected)localStorage.setItem(key+':selected',selected);else localStorage.removeItem(key+':selected');};
 const error=message=>{const status=document.createElement('p');status.setAttribute('role','alert');status.textContent=message;area.prepend(status);};
 function releaseFiles(){for(const [id,view]of views)if(rows.find(row=>row.id===id)?.type==='files'||rows.find(row=>row.id===id)?.type==='document'){previews.forget(id);view.dispose?.();view.host.remove();views.delete(id);}}
 function master(visible){const scratch=host.querySelector('.scratchpad-content');if(scratch)scratch.hidden=!visible;else for(const child of host.children)if(child.tagName!=='NAV')child.hidden=!visible;area.hidden=visible;}
 async function select(id){const row=rows.find(row=>row.id===id);if(!row)return;const version=++navigationVersion;await capture();if(version!==navigationVersion)return;releaseFiles();selected=id;save();master(false);for(const view of views.values())view.host.hidden=true;
  let view=views.get(id);if(!view){view={host:document.createElement('section')};views.set(id,view);area.append(view.host);try{await render(row,view);}catch(cause){view.host.textContent=cause.message;}}if(selected===id)view.host.hidden=false;listener?.();
 }
 async function render(row,view){
  if(row.type==='reminder'){
   let identity;
   const call=async(path,body)=>{
    const response=await fetch('/life/api/'+path,{method:'POST',headers:{'Accept':'application/json','Content-Type':'application/json','X-CSRF-TOKEN':document.querySelector('meta[name="csrf-token"]').content},body:JSON.stringify(body)});
    const value=await response.json();if(!response.ok)throw Object.assign(Error(value.message||'Life is unavailable.'),{status:response.status});
    if(identity&&(identity.accountId!==value.accountId||identity.workspaceId!==value.workspaceId))throw Error('Life account changed. Reload this page.');
    identity??={accountId:value.accountId,workspaceId:value.workspaceId};return value;
   };
   view.host.className='reminder-tab-workbench';
   const panel=mountReminderWorkbench(view.host,{storageKey:key+':draft:'+row.id,selectedId:row.reminderId,initialListId:row.listId,read:query=>call('data',{section:'reminders',query}),write:(action,input,idempotencyKey)=>call('action',{action:'reminders.'+action,input,idempotencyKey,expectedAccountId:identity.accountId,expectedWorkspaceId:identity.workspaceId}),onSelected:value=>{row.reminderId=value.id;row.title=value.title;save();listener?.();}});
   view.canClose=panel.canClose;view.dispose=panel.destroy;return;
  }
  if(row.type==='scratch'){
   if(!row.hostId)throw Error('Connect the Scratchpad owner first.');
   const request=args=>ownerRequest(row.hostId,'scratchpad.command',args);
   const [catalog,context]=await Promise.all([ownerRequest(row.hostId,'projects.get'),ownerRequest(row.hostId,'context.get')]);
   if(!row.scratchId){row.operationId??=crypto.randomUUID();save();const record=await request({action:'create',title:'Untitled',body:'',operationId:row.operationId});row.scratchId=record.id;save();}
   const panel=createScratchpadView({single:true,initialId:row.scratchId,request,projects:()=>catalog.projects||[],workspaces:()=>context.workspaces||[],storageKey:key+':'+row.id,onSelect:value=>{if(value.id)row.scratchId=value.id;row.title=value.title;save();listener?.();},markdown:(target,text,options)=>markdown(target,text,{...options,allowExternalImages:false,link:source=>{if(/^https?:/i.test(source))window.open(source,'_blank','noopener,noreferrer');else void options.link?.(source);}}),notify:error});
   await panel.mount(view.host);view.leave=()=>panel.leave();view.dispose=()=>panel.destroy();return;
  }
  if(row.type==='browser'){
   if(!row.url){const heading=document.createElement('h1');heading.textContent='New Tab';const actions=document.createElement('div');actions.innerHTML=tabSelectionHTML(choices);view.host.append(heading,actions);actions.querySelectorAll('[data-new-tab-action]').forEach(button=>button.onclick=()=>{const entry=choices[Number(button.dataset.newTabAction)];if(entry.id==='browser')view.host.querySelector('input')?.focus();else void create(entry,row.id).catch(cause=>error(cause.message));});}
   const form=document.createElement('form');form.className='actions';const address=document.createElement('input');address.type='url';address.placeholder='Website address';address.setAttribute('aria-label','Website address');address.value=row.url||'';const go=document.createElement('button');go.textContent='Go';form.append(address,go);view.host.append(form);
   const destination=document.createElement('div');view.host.append(destination);
   const navigate=()=>{const url=new URL(browserTarget(address.value));if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw Error('Choose an HTTP or HTTPS address.');row.url=url.href;row.title=url.hostname;save();listener?.();destination.replaceChildren();
    const link=document.createElement('a');link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Open '+url.hostname+' in a browser tab';destination.append(link);
    const note=document.createElement('p');note.textContent='Some websites block embedding. Use Open in a browser tab if the page does not load.';destination.append(note);
    if(url.origin!==location.origin&&(url.protocol==='https:'||location.protocol==='http:')){const frame=document.createElement('iframe');frame.title=row.title;frame.src=url.href;frame.referrerPolicy='no-referrer';frame.setAttribute('sandbox','allow-scripts allow-forms allow-popups allow-same-origin');destination.append(frame);}
   };form.onsubmit=event=>{event.preventDefault();try{navigate();}catch(cause){error(cause.message);}};if(row.url)navigate();return;
  }
  const hostID=row.hostId;if(!hostID)throw Error('Connect the computer that owns this file first.');
  const request=(action,args)=>ownerRequest(hostID,'files.'+action,args);
  if(row.type==='files'){
   const catalog=await ownerRequest(hostID,'context.get',{}),select=document.createElement('select'),files=document.createElement('div');select.setAttribute('aria-label','Workspace files');for(const workspace of catalog.workspaces||[])select.append(new Option(workspace.name,workspace.id));select.value=row.workspaceId||catalog.defaultWorkspaceId;view.host.append(select,files);
   const mount=()=>{view.dispose?.();row.workspaceId=select.value;save();view.dispose=mountFileBrowser(files,{workspaceId:row.workspaceId,escape:escapeHTML,remote:true,request,open:value=>void openFile({...row,type:'document',rootId:value.rootId,file:value.relativePath,title:value.title||value.relativePath.split('/').pop()})});};select.onchange=mount;mount();
  }else{
   const binding={workspaceId:row.workspaceId,rootId:row.rootId},value=await request('preview',{...binding,file:row.file});if(!view.host.isConnected)return;
   const viewer=mountFileDocument(view.host,{value,request:(action,args)=>request(action,{...binding,...args}),open:entry=>void openFile({...row,file:entry.path,title:entry.name}),onError:cause=>error(cause.message)});view.dispose=()=>viewer.dispose();
  }
 }
 async function openFile(value){const prior=rows.find(row=>row.type==='document'&&row.hostId===value.hostId&&row.workspaceId===value.workspaceId&&row.rootId===value.rootId&&row.file===value.file);if(prior)return select(prior.id);const row={...value,id:crypto.randomUUID()};rows.push(row);save();await select(row.id);}
 const choices=[{id:'reminder',label:'Reminders',icon:'reminder'},{id:'scratch',label:'Scratch',icon:'markdown'},{id:'browser',label:'Browser',icon:'browser'},{id:'incognito',label:'Incognito · native app',icon:'incognito',disabled:true,reason:'Independent private sessions require the desktop or iOS app.'},{id:'files',label:'Workspace files',icon:'markdown'},{id:'markdown',label:'Markdown or other file',icon:'markdown'},{id:'terminal',label:'Terminal · desktop app',icon:'terminal',disabled:true,reason:'Terminal sessions are available in the desktop app.'}];
 async function create(entry,replaceID){
  const row={id:replaceID||crypto.randomUUID(),...(entry.listId?{listId:entry.listId}:{}),...(entry.recordID?entry.id==='reminder'?{reminderId:entry.recordID}:{scratchId:entry.recordID}:{}),type:entry.id==='browser'?'browser':entry.id==='reminder'?'reminder':entry.id==='scratch'?'scratch':'files',title:entry.id==='browser'?'New Tab':entry.id==='reminder'?'Reminders':entry.id==='scratch'?'Scratch':'Files',hostId:owner()};
  if(replaceID){views.get(replaceID)?.dispose?.();views.get(replaceID)?.host.remove();views.delete(replaceID);rows.splice(rows.findIndex(item=>item.id===replaceID),1,row);}
  else rows.push(row);
  save();await select(row.id);
 }
 let disposed=false;const retained=localStorage.getItem(key+':selected');const observer=new MutationObserver(()=>{if(selected)master(false);});observer.observe(host,{childList:true,subtree:true});
 requestAnimationFrame(()=>{if(!disposed&&!navigationVersion&&!selected&&retained&&rows.some(row=>row.id===retained))void select(retained);});
 async function openRecord(type,id,listId){const prior=id&&rows.find(row=>row.type===type&&(type==='reminder'?row.reminderId:row.scratchId)===id&&(type==='reminder'||row.hostId===owner()));if(prior)return select(prior.id);return create({id:type,recordID:id,listId});}
 return {openRecord,choices,capturePreview:capture,preview:id=>previews.get(id),items:()=>rows.map(row=>({...row,icon:row.type==='browser'?'browser':row.type==='reminder'?'reminder':'markdown',resource:true,closable:true})),selected:()=>selected,select,
  activateMaster(){navigationVersion++;releaseFiles();selected=null;save();master(true);listener?.();},subscribe:fn=>listener=fn,error,
  create,
  async close(id){if(views.get(id)?.canClose&&!views.get(id).canClose())return;previews.forget(id);await views.get(id)?.dispose?.();views.get(id)?.host.remove();views.delete(id);rows=rows.filter(row=>row.id!==id);save();if(selected===id){selected=null;master(true);}save();listener?.();},destroy(){disposed=true;observer.disconnect();window.removeEventListener('pagehide',clearPreviews);document.querySelector('form[action$="/logout"]')?.removeEventListener('submit',clearPreviews);previews.clear();for(const view of views.values())view.dispose?.();area.remove();}
 };
}
