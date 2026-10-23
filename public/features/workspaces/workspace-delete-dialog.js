const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function workspaceDeleteDialog({workspaceId,catalog,remove,create,onDeleted,notify=()=>{}}){
 const profile=catalog.workspaces.find(row=>row.id===workspaceId);if(!profile)throw new Error('Workspace no longer exists.');
 const dialog=document.createElement('dialog');dialog.className='remote-rename-dialog';
 dialog.innerHTML=`<form><h2>Delete ${esc(profile.name)}?</h2><p>All of its browser, terminal and viewer tabs, including hidden tabs, will close. Chats and their history, run options, approvals and provider sessions will be preserved. Ordinary terminal processes stop; persistent tmux sessions remain available.</p><label>Associated chats<select name="destination"><option value="">Keep chats unhoused</option>${catalog.workspaces.filter(row=>row.id!==workspaceId).map(row=>`<option value="${esc(row.id)}">Move to ${esc(row.name)}</option>`).join('')}${create?'<option value="new">Move to a new workspace…</option>':''}</select></label><label data-new-name hidden>New workspace name<input name="name" maxlength="200"></label>${catalog.workspaces.length===1?'<p class="note">A fresh default workspace will keep the app usable. It will not adopt these chats.</p>':''}<p class="note">Captured execution configuration remains available for existing chats and schedules. Project files and provider sessions are not deleted.</p><p data-error role="status"></p><div class="actions"><button type="button" data-close>Cancel</button><button class="danger" type="submit">Delete workspace</button></div></form>`;
 dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.onclose=()=>dialog.remove();
 const destination=dialog.querySelector('[name=destination]');destination.onchange=()=>dialog.querySelector('[data-new-name]').hidden=destination.value!=='new';
 dialog.querySelector('form').onsubmit=async event=>{event.preventDefault();const button=dialog.querySelector('[type=submit]');button.disabled=true;try{
  let moveToWorkspaceId=destination.value||null;
  if(moveToWorkspaceId==='new'){const name=dialog.querySelector('[name=name]').value.trim();if(!name)throw new Error('Enter a workspace name.');const result=await create(name,profile);catalog=result.catalog;moveToWorkspaceId=result.workspaceId;}
  const result=await remove({workspaceId,moveToWorkspaceId,expectedRevision:catalog.revision});dialog.close();await onDeleted?.(result);
 }catch(error){if(dialog.isConnected)dialog.querySelector('[data-error]').textContent=error.message;else notify(error.message);}finally{button.disabled=false;}};
 document.body.append(dialog);dialog.showModal();return dialog;
}
