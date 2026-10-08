import {mountAttachmentPicker,prepareLocalAttachments,clearAttachments} from './chat-attachments.js';
export const providerLabel=id=>({codex:'Codex',copilot:'Copilot',claude:'Claude'}[id]||id);
export function internetProviders(data){return Object.keys(data.providerStatuses||{}).filter(id=>id!=='rehearsal'&&id!=='local-process');}
export function searchDefaultsFields(id,catalog,value={},escape=String){
  const models=catalog?.models||[],model=models.find(m=>m.id===value.model),controls=model?.controls||{};
  const select=(key,label,choices,current)=>`<label>${label}<select data-search-option="${key}" data-provider="${escape(id)}">${choices.map(([v,t])=>`<option value="${escape(v)}" ${v===(current||'')?'selected':''}>${escape(t)}</option>`).join('')}</select></label>`;
  return select('model','Model',[['','Choose a model'],...models.map(m=>[m.id,m.name||m.id])],value.model)+select('reasoningEffort','Thinking effort',[['','Provider default'],...(controls.reasoningEfforts||[]).map(v=>[v,v])],value.reasoningEffort)+select('serviceTier','Speed',[['','Provider default'],...(controls.serviceTiers||[]).map(v=>[v.id,v.label||v.id])],value.serviceTier);
}
export function internetSearchDialog(ui){
  const {state,escape:e,showDialog,api,toast}=ui,data=state.data,context=data.context;
  const providers=internetProviders(data);let selected='',busy=false;
  showDialog(`<h2>Internet Search</h2><label>Workspace<select id="search-workspace">${context.workspaces.map(w=>`<option value="${e(w.id)}" ${w.id===context.defaultWorkspaceId?'selected':''}>${e(w.name)}</option>`).join('')}</select></label><section class="composer internet-search-composer"><textarea id="search-prompt" rows="4" placeholder="What would you like to search for?" aria-label="Search"></textarea><div class="composer-footer"><div id="search-attachments"></div><div class="composer-actions">${providers.map(id=>`<button class="primary" data-search-provider="${e(id)}">Search with ${e(providerLabel(id))}</button>`).join('')}</div></div><p id="search-status" class="note" role="status"></p></section><div class="actions"><button id="close-dialog">Cancel</button></div>`,()=>{});
  const dialog=document.querySelector('#dialog'),prompt=dialog.querySelector('#search-prompt');
  mountAttachmentPicker({key:'internet-search',host:dialog.querySelector('#search-attachments'),textarea:prompt,provider:()=> 'search',mediaTypes:{search:[...new Set(Object.values(data.attachmentMediaTypes||{}).flat())]},notify:toast});
  dialog.querySelectorAll('[data-search-provider]').forEach(button=>button.onclick=async()=>{
    if(busy)return;selected=button.dataset.searchProvider;
    if(!prompt.value.trim()){prompt.focus();return;}
    if(!data.settings.internetSearches?.[selected]?.model){dialog.querySelector('#search-status').textContent='Choose defaults for '+providerLabel(selected)+' in Engine Room → Internet Searches first.';return;}
    busy=true;dialog.querySelectorAll('[data-search-provider]').forEach(b=>b.disabled=true);
    try{
      const delivery=await prepareLocalAttachments({key:'internet-search',providerId:selected,destination:'This Mac · Internet Search',draftId:crypto.randomUUID(),messageId:crypto.randomUUID(),mediaTypes:data.attachmentMediaTypes||{},post:api});
      const run=await api('/api/chat',{chatType:'internet',provider:selected,workspaceId:dialog.querySelector('#search-workspace').value,prompt:prompt.value,...(delivery||{})});
      clearAttachments('internet-search');dialog.close();await ui.refresh();ui.open(run);
    }catch(error){toast(error.message);}finally{busy=false;dialog.querySelectorAll('[data-search-provider]').forEach(b=>b.disabled=false);}
  });prompt.focus();
}
export async function renderInternetDefaults(ui,container,active=()=>true){
  const settings=ui.state.data.settings,values=structuredClone(settings.internetSearches||{}),providers=internetProviders(ui.state.data),catalogs={};
  const draw=()=>{if(!active())return;container.innerHTML=`<section class="card"><h2>Internet Search defaults</h2><p>Each search starts with these provider settings and the selected workspace’s defaults. You can change models after starting a chat.</p>${providers.map(id=>`<fieldset data-search-provider="${ui.escape(id)}"><legend>${ui.escape(providerLabel(id))}</legend><div class="row">${searchDefaultsFields(id,catalogs[id],values[id],ui.escape)}</div>${catalogs[id]?.error?`<p class="note">${ui.escape(catalogs[id].error)}</p>`:''}</fieldset>`).join('')}<div class="actions"><button id="save-search-defaults" class="primary">Save defaults</button></div><p id="search-default-status" role="status"></p></section>`;
    container.querySelectorAll('[data-search-option]').forEach(select=>select.onchange=()=>{const id=select.dataset.provider,key=select.dataset.searchOption;values[id]??={};values[id][key]=select.value;if(key==='model'){values[id]={model:select.value};draw();}});
    container.querySelector('#save-search-defaults').onclick=async()=>{try{const latest=ui.state.data.settings;const saved=await ui.api('/api/settings',{settings:{...latest,internetSearches:Object.fromEntries(Object.entries(values).filter(([,v])=>v.model))},expectedRevision:latest.revision});ui.state.data.settings=saved;container.querySelector('#search-default-status').textContent='Saved.';}catch(error){ui.toast(error.message);}};
  };
  await Promise.all(providers.map(async id=>{catalogs[id]=await ui.api('/api/provider',{provider:id,force:true});}));draw();
}
