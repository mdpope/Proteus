import {previewPermissionHelp,previewFolderDialog,previewRememberDialog,previewRememberEffect,previewPermissionChoiceLabel} from './preview-permissions.js';
// Rendering and binding are shared; every mutation is supplied by the executing
// owner. A remote folder path is never selected using this computer's picker.
export function bindPermissionSidebar(root,{run,request,reply,reload,dialog,pick,openWorkspace,notify}={}){
 const context=run.permissionContext;if(!context||!root)return;
 const $=selector=>root.querySelector(selector),global=selector=>document.querySelector(selector);
 const update=async values=>{
  root.querySelectorAll('[data-preview-chat-mode],[data-preview-read-only],[data-preview-read-only-inherit],[data-preview-revoke-rule]').forEach(control=>control.disabled=true);
  try{await request({...values,runId:run.id,expectedContextId:context.id,expectedChatRevision:context.chatRevision||null,...(run.pending?.type==='permission'?{expectedRequestId:run.pending.id}:{})});await reload();}
  catch(error){notify(error.message);await reload();}
 };
 $('[data-preview-permission-help]')?.addEventListener('click',()=>dialog(previewPermissionHelp(run.schedule.provider)));
 $('[data-preview-add-folder]')?.addEventListener('click',()=>{
  dialog(previewFolderDialog(),async()=>{
   const folder=global('#preview-folder-path').value.trim();if(!folder)throw Error('Choose a folder on the executing computer.');
   await request({action:'grant-chat-folder',runId:run.id,folder,access:global('#preview-folder-access').value,expectedContextId:context.id,expectedChatRevision:context.chatRevision||null});await reload();
  });
  const browse=global('[data-preview-pick-folder]');
  if(pick)browse.onclick=async()=>{try{const folders=await pick();if(folders?.[0])global('#preview-folder-path').value=folders[0];}catch(error){notify(error.message);}};
  else{browse.disabled=true;browse.textContent='Enter the folder path on the executing computer';}
  global('#preview-folder-path').focus();
 });
 root.querySelectorAll('[data-preview-chat-mode]').forEach(button=>button.onclick=()=>{if(button.getAttribute('aria-pressed')!=='true')void update({action:'set-chat-mode',mode:button.dataset.previewChatMode});});
 $('[data-preview-read-only]')?.addEventListener('change',event=>void update({action:'set-chat-read-only',enabled:event.target.checked}));
 $('[data-preview-read-only-inherit]')?.addEventListener('click',()=>void update({action:'set-chat-read-only',enabled:null}));
 root.querySelectorAll('[data-preview-revoke-rule]').forEach(button=>button.onclick=()=>void update({action:'revoke-chat-rule',ruleId:button.dataset.previewRevokeRule}));
 $('[data-preview-workspace-permissions]')?.addEventListener('click',()=>void openWorkspace?.());
 $('[data-preview-remember]')?.addEventListener('click',()=>{
  const pending=run.pending;if(pending?.type!=='permission')return;
  dialog(previewRememberDialog(pending),async()=>{await reply(global('[data-preview-remember-choice][aria-pressed=true]').dataset.previewRememberChoice,pending.id);await reload();});
  const explain=()=>{const answer=global('[data-preview-remember-choice][aria-pressed=true]').dataset.previewRememberChoice;global('[data-preview-remember-target]').textContent=previewPermissionChoiceLabel(pending.permissionChoices.find(choice=>choice.value===answer),pending);global('[data-preview-remember-effect]').textContent=previewRememberEffect(pending,answer);};
  document.querySelectorAll('[data-preview-remember-choice]').forEach(button=>button.onclick=()=>{document.querySelectorAll('[data-preview-remember-choice]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));explain();});explain();
 });
}
