import {searchDefaultsFields,providerLabel} from './internet-search.js';
export async function mountUpdateCoordinatorDefaults(container,ui,active=()=>true){
 const root=document.createElement('section');root.className='card';container.append(root);
 let value=structuredClone(ui.state.data.settings.updateCoordinator||{}),catalog={},loading=false;
 const draw=()=>{
  if(!active()||!root.isConnected)return;
  root.innerHTML=`<h2>Update coordinator defaults</h2><p>New update chats use these settings automatically, including dispatch to connected computers. The target validates the chosen provider/model. Each update chat starts without a workspace or project and coordinates local tests, migrations, installation and post-restart validation.</p><label>Provider<select data-update-provider><option value="">Choose provider</option>${['codex','copilot','claude'].map(id=>`<option value="${id}" ${value.provider===id?'selected':''}>${ui.escape(providerLabel(id))}</option>`).join('')}</select></label><div class="row">${searchDefaultsFields(value.provider||'',catalog,value,ui.escape)}</div><div class="actions"><button data-update-refresh ${value.provider&&!loading?'':'disabled'}>Refresh model options</button><button data-update-defaults-save ${value.provider&&value.model&&!loading?'':'disabled'}>Save update defaults</button></div><p role="status" data-update-defaults-status>${ui.escape(catalog.error||'Configuration only. Saving does not start an update.')}</p>`;
  root.querySelector('[data-update-provider]').onchange=event=>{value={provider:event.target.value};catalog={};draw();void load(true);};
  root.querySelectorAll('[data-search-option]').forEach(input=>input.onchange=()=>{const key=input.dataset.searchOption;value[key]=input.value;if(key==='model')value={provider:value.provider,model:input.value};draw();});
  root.querySelector('[data-update-refresh]').onclick=()=>void load(true);
  root.querySelector('[data-update-defaults-save]').onclick=async()=>{try{const settings=(await ui.api('/api/state?summaries=1')).settings;const saved=await ui.api('/api/settings',{settings:{...settings,updateCoordinator:value},expectedRevision:settings.revision});ui.state.data.settings=saved;ui.toast('Update coordinator defaults saved.');}catch(error){ui.toast(error.message);}};
 };
 const load=async(force=false)=>{if(!value.provider||loading)return;loading=true;const provider=value.provider;draw();try{const result=await ui.api('/api/provider',{provider,force});if(provider===value.provider)catalog=result;}catch(error){if(provider===value.provider)catalog={error:error.message};}finally{loading=false;draw();}};
 draw();await load();
}
