// Local settings only. Discovery uses existing paired connections; no raw model
// endpoints, credentials or pairing keys are delivered to the renderer.
export async function mountSharedInference(root,{api,escape:e,toast}){
 let state,available=[],busy=false;
 const act=async value=>{if(busy)return;busy=true;status('Saving...');try{state=await api('/api/shared-inference',{...value,expectedRevision:state.revision});draw();}catch(error){status(error.message);}finally{busy=false;}};
 const status=text=>{const el=root.querySelector('[data-shared-status]');if(el)el.textContent=text;};
 function draw(){
  root.innerHTML='<h2>Share local models</h2><p class="note">Share inference with selected paired computers over the encrypted relay. Their chats, tools, files and approvals stay on the computer using the model. Model-server credentials stay here.</p><button data-shared-refresh>Refresh sharing settings</button><div data-shared-hosts></div><h2>Models from other computers</h2><p class="note">Add a shared provider, then choose its adapter and computer in New Chat. Each choice identifies the computer running inference. This first version supports text and tools.</p><button data-shared-discover>Find shared providers</button><div data-shared-imports></div><p data-shared-status role="status"></p>';
  root.querySelector('[data-shared-refresh]').onclick=async()=>{if(busy)return;busy=true;try{state=await api('/api/shared-inference');draw();}catch(error){status(error.message);}finally{busy=false;}};
  const host=root.querySelector('[data-shared-hosts]');
  for(const provider of state.providers){const card=document.createElement('section');card.className='card';card.dataset.sharingProvider=provider.id;
   card.innerHTML='<h3>'+e(provider.label)+'</h3><label><input type="checkbox" data-sharing-enabled '+(provider.enabled?'checked':'')+'> Share with selected paired computers</label><div data-sharing-devices>'+state.devices.map(d=>'<label><input type="checkbox" data-sharing-device="'+e(d.id)+'" '+(provider.deviceIds.includes(d.id)?'checked':'')+'>'+e(d.name)+'</label>').join('')+'</div>'+(!state.devices.length?'<p class="note">Pair another computer in Connections first.</p>':'')+'<button data-sharing-save>Save sharing</button>';
   card.querySelector('[data-sharing-save]').onclick=()=>act({action:'share',providerId:provider.id,enabled:card.querySelector('[data-sharing-enabled]').checked,deviceIds:[...card.querySelectorAll('[data-sharing-device]:checked')].map(el=>el.dataset.sharingDevice)});host.append(card);
  }
  const imports=root.querySelector('[data-shared-imports]');
  const merged=new Map(state.imports.map(row=>[row.hostId+':'+row.providerId,{...row,imported:true}]));
  for(const row of available){if(!row.providerId){const p=document.createElement('p');p.className='note';p.textContent=row.hostLabel+': '+row.error;imports.append(p);continue;}const key=row.hostId+':'+row.providerId;merged.set(key,{...merged.get(key),...row});}
  for(const row of merged.values()){const card=document.createElement('section');card.className='card';card.innerHTML='<h3>'+e(row.providerId==='mtplx'?'MTPLX':'llama.cpp')+' / '+e(row.hostLabel)+'</h3><p class="note">'+e(row.models?.map(m=>m.name||m.id).join(', ')||row.error||'Availability is checked when refreshing models.')+'</p><button data-import-toggle>'+e(row.imported?'Remove provider':'Add provider')+'</button>';card.querySelector('button').disabled=!state.outgoingAllowed;card.querySelector('button').onclick=()=>act({action:'import',hostId:row.hostId,providerId:row.providerId,enabled:!row.imported});imports.append(card);}
  if(!merged.size&&!available.length)imports.innerHTML='<p class="note">No shared providers added. Enable sharing on another paired computer, then find providers.</p>';
  root.querySelector('[data-shared-discover]').disabled=!state.outgoingAllowed;
  root.querySelector('[data-shared-discover]').onclick=async()=>{if(busy)return;busy=true;status('Checking paired computers...');try{const result=await api('/api/shared-inference',{action:'discover'});state=result;available=result.available||[];draw();}catch(error){status(error.message);}finally{busy=false;}};
 }
 try{state=await api('/api/shared-inference');if(root.isConnected)draw();}catch(error){root.textContent='Shared model settings unavailable: '+error.message;toast?.(error.message);}
}
