import {searchDefaultsFields,providerLabel} from './internet-search.js';
export async function mountUpdateCoordinatorDefaults(container,ui,active=()=>true){
 const root=document.createElement('section');root.className='card';container.append(root);
 let value=structuredClone(ui.state.data.settings?.updateCoordinator||{}),catalog={},loading=false,saving=false,generation=0;
 const draw=()=>{
  if(!active()||!root.isConnected)return;
  root.innerHTML=`<h2>Update coordinator defaults</h2><p>Every update starts a new chat named for its release. These defaults choose its provider and model. The chat stays tied to that upgrade through restart and verification; no existing chat is selected.</p><label>Provider<select data-update-provider ${saving?'disabled':''}><option value="">Choose provider</option>${['codex','copilot','claude'].map(id=>`<option value="${id}" ${value.provider===id?'selected':''}>${ui.escape(providerLabel(id))}</option>`).join('')}</select></label><div class="row">${searchDefaultsFields(value.provider||'',catalog,value,ui.escape)}</div><div class="actions"><button data-update-refresh ${value.provider&&!loading&&!saving?'':'disabled'}>Refresh model options</button><button data-update-defaults-save ${value.provider&&value.model&&!loading&&!saving?'':'disabled'}>Save update defaults</button></div><p role="status" data-update-defaults-status>${ui.escape(catalog.error||(loading?'Loading model options…':saving?'Saving…':'Configuration only. Saving does not start an update.'))}</p>`;
  root.querySelector('[data-update-provider]').onchange=event=>{value={provider:event.target.value};catalog={};draw();void load(true);};
  root.querySelectorAll('[data-search-option]').forEach(input=>input.onchange=()=>{const key=input.dataset.searchOption;value[key]=input.value;if(key==='model')value={provider:value.provider,model:input.value};draw();});
  root.querySelector('[data-update-refresh]').onclick=()=>void load(true);
  root.querySelector('[data-update-defaults-save]').onclick=async()=>{if(saving)return;const chosen=structuredClone(value);saving=true;draw();try{const settings=(await ui.api('/api/state?summaries=1')).settings;const saved=await ui.api('/api/settings',{settings:{...settings,updateCoordinator:chosen},expectedRevision:settings.revision});ui.state.data.settings=saved;ui.toast('Update coordinator defaults saved.');}catch(error){ui.toast(error.message);}finally{saving=false;draw();}};
 };
 const load=async(force=false)=>{const current=++generation,provider=value.provider;if(!provider){loading=false;draw();return;}loading=true;draw();try{const result=await ui.api('/api/provider',{provider,force});if(current===generation)catalog=result;}catch(error){if(current===generation)catalog={error:error.message};}finally{if(current===generation){loading=false;draw();}}};
 draw();void load();
}
