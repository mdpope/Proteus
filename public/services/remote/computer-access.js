export function computerAccessFields(value,{id='computer-managed'}={}){
 return `<label class="checkbox-row"><input id="${id}" type="checkbox" ${value.managed?'checked':''}>Managed computer — incoming management only</label><p class="note">Other authorized computers can manage this computer. This computer cannot connect to other computers or browse their workspaces, projects, tabs or chats. Questions and results from remotely started tasks still return only to the initiating chat.</p><p class="note">Provider sign-in is separate from computer access. Enabling this mode keeps saved connections but blocks their use.</p>`;
}
export async function mountComputerAccess(container,{initial,api,escape,toast,onChange=()=>{}}){
 let value=initial||await api('/api/computer-access');if(!container.isConnected)return;
 container.classList.add('card');container.innerHTML=`<h2>Computer role</h2>${computerAccessFields(value,{escape})}<button data-save-computer-access>Save computer role</button><p data-computer-access-status class="note" role="status"></p>`;
 const button=container.querySelector('[data-save-computer-access]'),status=container.querySelector('[data-computer-access-status]');
 button.onclick=async()=>{button.disabled=true;try{
  value=await api('/api/computer-access',{managed:container.querySelector('#computer-managed').checked,expectedRevision:value.revision});
  status.textContent=value.managed?'Incoming management only. Outgoing computer access is blocked.':'Outgoing computer connections are allowed; each still needs its own pairing.';
  await onChange(value);toast('Computer role saved.');
 }catch(error){status.textContent=error.message;}finally{if(button.isConnected)button.disabled=false;}};
 return async next=>{if(!container.isConnected||next.revision===value.revision)return;value=next;container.querySelector('#computer-managed').checked=value.managed;await onChange(value);};
}
