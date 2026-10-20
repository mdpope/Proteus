import {previewPermissionHelp,previewFolderDialog} from '../../../public/preview-permissions.js';
const pendingChanges=new Set();
export function bindWebChatPermissions(root,{run,request,refresh,workspace,notify}){
 if(!root||!run.permissionContext)return;
 const permission=run.permissionContext;
 const key=permission.id+':'+run.id,controls=()=>root.querySelectorAll('[data-preview-chat-mode],[data-preview-read-only],[data-preview-read-only-inherit],[data-preview-revoke-rule]');
 if(pendingChanges.has(key))controls().forEach(node=>node.disabled=true);
 const change=async value=>{if(pendingChanges.has(key))return;pendingChanges.add(key);controls().forEach(node=>node.disabled=true);try{const updated=await request('chat.permissions',{id:run.id,scope:'chat',expectedContextId:permission.id,expectedChatRevision:permission.chatRevision||null,...(run.pending?.type==='permission'?{expectedRequestId:run.pending.id}:{}),...value});pendingChanges.delete(key);await refresh(updated);}catch(error){pendingChanges.delete(key);notify(error.message);await refresh();}};
 root.querySelectorAll('[data-preview-chat-mode]').forEach(button=>button.onclick=()=>void change({mode:button.dataset.previewChatMode}));
 root.querySelector('[data-preview-read-only]')?.addEventListener('change',event=>void change({action:'set-chat-read-only',enabled:event.target.checked}));
 root.querySelector('[data-preview-read-only-inherit]')?.addEventListener('click',()=>void change({action:'set-chat-read-only',enabled:null}));
 root.querySelectorAll('[data-preview-revoke-rule]').forEach(button=>button.onclick=()=>void change({action:'revoke-chat-rule',ruleId:button.dataset.previewRevokeRule}));
 root.querySelector('[data-preview-workspace-permissions]')?.addEventListener('click',workspace);
 const dialog=html=>{const node=document.createElement('dialog');node.className='remote-rename-dialog';node.innerHTML=html;document.body.append(node);node.querySelector('#close-dialog').onclick=()=>node.close();node.onclose=()=>node.remove();node.showModal();return node;};
 root.querySelector('[data-preview-permission-help]')?.addEventListener('click',()=>dialog(previewPermissionHelp(run.provider||run.schedule?.provider)));
 root.querySelector('[data-preview-add-folder]')?.addEventListener('click',()=>{const node=dialog(previewFolderDialog());node.querySelector('[data-preview-pick-folder]').remove();node.querySelector('#preview-folder-path').placeholder='Absolute folder on the owning computer';node.querySelector('#dialog-submit').onclick=async()=>{const folder=node.querySelector('#preview-folder-path').value.trim(),access=node.querySelector('#preview-folder-access').value;if(!folder)return;try{await request('chat.permissions',{id:run.id,action:'grant-chat-folder',folder,access,expectedContextId:permission.id,expectedChatRevision:permission.chatRevision||null});node.close();await refresh();}catch(error){notify(error.message);}};});
}
