import {showSitePermissionRows} from './site-permission-rows.js';

const kinds=[['microphone','Microphone'],['camera','Camera'],['screen','Screen sharing']];
const descriptions={'not-determined':'Permission can be requested',denied:'Denied in macOS',restricted:'Restricted by macOS',granted:'Allowed in macOS','system-managed':'Managed by your system',unknown:'Status unavailable'};
const invoke=value=>window.desktop.browser(value);

export function mountSystemMedia(panel,notify){
 if(!window.desktop?.browser)return;
 const section=document.createElement('section');
 section.className='card';
 section.innerHTML='<h2>Microphone, camera and screen sharing</h2><p class="note">macOS grants hardware access to Proteus. Website access is managed below. Choose a screen or window each time you share.</p><div data-system-media></div>' +
   '<h2>Notification sound</h2><p class="note">The test posts a local system notification. Check the Proteus notification settings if you do not see or hear it.</p><div class="actions"><button data-test-notification>Send test notification</button><button data-notification-system>Open system notification settings</button></div>';
 panel.append(section);
 const area=section.querySelector('[data-system-media]'), rows=new Map();
 const refresh=async()=>{
  const value=await invoke({action:'conference-system-status'});
  if(!section.isConnected)return;
  for(const [kind,label] of kinds){
   const status=value.status[kind],row=rows.get(kind);
   row.status.textContent=descriptions[status]||status;
   row.request.hidden=value.platform!=='darwin'||status==='granted';
   row.request.textContent=['denied','restricted'].includes(status)?'Review access':'Request access';
   row.settings.hidden=value.platform!=='darwin';
   row.request.setAttribute('aria-label',row.request.textContent+' for '+label.toLowerCase());
  }
  section.querySelector('[data-notification-system]').hidden=value.platform!=='darwin';
  section.querySelector('[data-test-notification]').disabled=!value.notificationsSupported;
 };
 const perform=async (button,action,kind)=>{
  button.disabled=true;
  try{
   await invoke({action,kind});
   if(action==='conference-notification-test')notify('Test notification submitted to the system.');
   await refresh();
  }catch(error){notify(error.message);}finally{button.disabled=false;}
 };
 for(const [kind,label] of kinds){
  const element=document.createElement('div');
  element.className='resource-row';
  element.innerHTML='<div><strong>'+label+'</strong><p class="note" role="status"></p></div><div class="actions"><button data-request>Request access</button><button data-settings>Open System Settings</button></div>';
  const request=element.querySelector('[data-request]'),settings=element.querySelector('[data-settings]');
  rows.set(kind,{request,settings,status:element.querySelector('[role=status]')});
  request.onclick=()=>void perform(request,'conference-system-request',kind);
  settings.setAttribute('aria-label','Open system settings for '+label.toLowerCase());
  settings.onclick=()=>void perform(settings,'conference-system-settings',kind);
  area.append(element);
 }
 section.querySelector('[data-test-notification]').onclick=event=>void perform(event.currentTarget,'conference-notification-test');
 section.querySelector('[data-notification-system]').onclick=event=>void perform(event.currentTarget,'conference-system-settings','notifications');
 const onFocus=()=>{if(section.isConnected)void refresh().catch(error=>notify(error.message));else window.removeEventListener('focus',onFocus);};
 window.addEventListener('focus',onFocus);onFocus();
}

export function mountSiteMedia(target,profileId,notify){
 if(!window.desktop?.browser)return;
 const form=document.createElement('form'),saved=document.createElement('ul');
 form.className='site-permission-form';
 saved.className='site-permission-rows';
 form.innerHTML='<label>Website origin<input name="origin" type="url" required placeholder="https://app.zoom.us"></label>' +
   '<label>Device<select name="kind"><option value="microphone">Microphone</option><option value="camera">Camera</option></select></label>' +
   '<label>Access<select name="permission"><option value="ask">Ask</option><option value="allow">Allow</option><option value="block">Block</option></select></label>' +
   '<button>Save device permission</button>';
 const note=document.createElement('p');note.className='note';
 note.textContent='Pause agent access in the meeting tab before using the microphone or camera.';
 const {origin,kind,permission}=form.elements;
 let rows=[];
 function choice(){permission.value=rows.find(row=>row.origin===origin.value.trim()&&row.kind===kind.value)?.permission||'ask';}
 async function save(site,device,access){
  paint(await invoke({action:'conference-site-save',profileId,origin:site,kind:device,permission:access}));
  notify(access==='ask'?'Website device rule removed.':'Website device permission saved.');
 }
 function paint(value){
  rows=value;
  showSitePermissionRows(saved,rows.map(row=>({...row,label:row.kind==='camera'?'Camera':'Microphone'})),{
   edit:row=>{origin.value=row.origin;kind.value=row.kind;choice();origin.focus();},
   remove:async row=>{await save(row.origin,row.kind,'ask');choice();},
   notify,focus:()=>{if(saved.hidden)origin.focus();else saved.querySelector('button').focus();},
  });
 }
 origin.onchange=choice;kind.onchange=choice;
 form.onsubmit=async event=>{
  event.preventDefault();
  const button=form.querySelector('button');button.disabled=true;
  try{
   const site=new URL(origin.value.trim());
   await save(site.href,kind.value,permission.value);
   origin.value=site.origin;
   choice();
  }catch(error){notify(error.message);}finally{button.disabled=false;}
 };
 target.append(saved,form,note);
 const refresh=()=>{if(target.isConnected)void invoke({action:'conference-site-list',profileId}).then(paint).catch(error=>notify(error.message));else window.removeEventListener('focus',refresh);};
 window.addEventListener('focus',refresh);refresh();
}
