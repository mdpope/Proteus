import {resourcePreferences,viewResidency} from '../../models/view-residency.js';
export function resourceRows({tabs=[],processes=[]}={}){
 const rows=[],byPid=new Map(processes.map(p=>[p.pid,p]));
 const shared=p=>tabs.filter(t=>t.loaded&&t.pid===p.pid).length!==1||tabs.some(t=>t.loaded&&t.pid===p.pid&&t.sharedProcess);
 for(const process of processes)if(shared(process))rows.push({...process,key:'process:'+process.pid,kind:'system',title:process.label||process.name||process.type||'Process',detail:'PID '+process.pid,canUnload:false,canClose:false});
 for(const tab of tabs){
  const process=tab.loaded&&byPid.get(tab.pid),isShared=process&&shared(process);
  rows.push({...tab,key:'tab:'+tab.id,kind:tab.loaded?'loaded':'unloaded',title:tab.title||tab.label||tab.id,detail:[tab.group||tab.type||'Tab',tab.persist?'Persisted':'',isShared?'Shared process '+tab.pid:''].filter(Boolean).join(' · '),cpuPercent:process&&!isShared?process.cpuPercent:null,memoryBytes:process&&!isShared?process.memoryBytes:null,sharedMetric:!!isShared,canUnload:tab.canUnload??(tab.loaded&&!tab.sharedProcess&&!tab.persist),canClose:tab.canClose??(tab.id!=='overview'&&tab.manageable!==false)});
 }
 const order={system:0,loaded:1,unloaded:2};return rows.sort((a,b)=>order[a.kind]-order[b.kind]||a.title.localeCompare(b.title));
}
export function filterResourceRows(rows,{query='',system=true,loaded=true,unloaded=true}={}){const selected={system,loaded,unloaded},text=query.trim().toLocaleLowerCase();return rows.filter(row=>selected[row.kind]&&row.title.toLocaleLowerCase().includes(text));}
export async function mountResources(container,ui,active=()=>container.isConnected){
 const e=ui.escape,filter={query:'',system:true,loaded:true,unloaded:true};let data,version=0;
 container.innerHTML=`<section class="card"><h2>Proteus resources</h2><div data-resource-totals class="stats"></div><div class="actions resource-filters" role="group" aria-label="Resource visibility">${['system','loaded','unloaded'].map(kind=>`<button type="button" data-resource-kind="${kind}" aria-pressed="true">${kind[0].toUpperCase()+kind.slice(1)}</button>`).join('')}<label>Filter by name<input type="search" data-resource-filter placeholder="Process or tab name"></label><button type="button" data-resource-refresh>Refresh usage</button></div><p class="note" data-resource-observed role="status"></p><p class="note">Shared process usage appears once in its system row. Tab attribution is unavailable for shared processes. CPU combines sampled Electron usage and child lifetime averages. Filtering does not load or unload tabs.</p><table class="resource-process-table"><thead><tr><th>Name</th><th>Status / type</th><th>CPU</th><th>Memory</th><th>Controls</th></tr></thead><tbody data-resource-rows></tbody></table></section>`;
 const find=selector=>container.querySelector(selector),metric=(value,unit,scale=1)=>Number.isFinite(value)?e((value/scale).toFixed(1))+unit:'Not reported';
 const preferences=resourcePreferences(ui.state.data.settings.resources),panel=document.createElement('section');panel.className='card';
 panel.innerHTML=`<h2>Tab memory</h2><p class="note">Chat transcripts and document content load when opened. Limits apply to this window across all workspaces and computers. Selected views stay loaded; inactive views release their content and reload at your saved reading position. Drafts and terminal sessions are preserved. Browser limits are in Browser Preferences.</p><div class="row"><label>Chat views kept in memory<input data-memory-chat type="number" min="1" max="32" value="${preferences.chatViewLimit}"></label><label>Documents kept in memory<input data-memory-document type="number" min="1" max="32" value="${preferences.documentViewLimit}"></label><label>Release inactive content after (minutes)<input data-memory-idle type="number" min="1" max="120" value="${preferences.inactiveMinutes}"></label></div><button data-memory-save>Save memory settings</button><p data-memory-status class="note" role="status"></p>`;
 container.prepend(panel);
 find('[data-memory-save]').onclick=async()=>{
  const button=find('[data-memory-save]');button.disabled=true;
  try{const resources={chatViewLimit:Number(find('[data-memory-chat]').value),documentViewLimit:Number(find('[data-memory-document]').value),inactiveMinutes:Number(find('[data-memory-idle]').value)};const current=ui.state.data.settings,saved=await ui.api('/api/settings',{settings:{...current,resources},expectedRevision:current.revision});ui.state.data.settings=saved;viewResidency.configure(saved.resources);find('[data-memory-status]').textContent='Saved for this computer. Inactive content now follows these limits.';}
  catch(error){ui.toast(error.message);}finally{if(button.isConnected)button.disabled=false;}
 };
 const draw=()=>{
  if(!active()||!data)return;
  find('[data-resource-totals]').innerHTML=`<div class="stat"><span class="eyebrow">Memory</span><strong>${metric(data.totals?.memoryBytes,' MB',1048576)}</strong></div><div class="stat"><span class="eyebrow">CPU estimate</span><strong>${metric(data.totals?.cpuPercent,'%')}</strong></div><div class="stat"><span class="eyebrow">Processes</span><strong>${e(data.totals?.processCount??data.processes?.length??0)}</strong></div>`;
  const rows=filterResourceRows(resourceRows(data),filter);
  find('[data-resource-observed]').textContent='Observed '+ui.time(data.observedAt)+' · '+rows.length+' matching items';
  find('[data-resource-rows]').innerHTML=rows.map(row=>`<tr data-resource-row="${e(row.key)}" data-resource-state="${row.kind}"><td><strong>${e(row.title)}</strong><div class="note">${e(row.detail)}</div></td><td>${e(row.kind==='system'?'App/system process':row.kind==='loaded'?'Loaded':'Unloaded')}</td><td>${row.sharedMetric?'Shared':metric(row.cpuPercent,'%')}</td><td>${row.sharedMetric?'Shared':metric(row.memoryBytes,' MB',1048576)}</td><td><div class="actions">${row.kind!=='system'?`${row.canUnload?`<button data-resource-unload="${e(row.id)}">Unload</button>`:''}<button data-resource-close="${e(row.id)}" ${row.canClose?'':'disabled'}>Close</button>`:''}</div></td></tr>`).join('')||'<tr><td colspan="5">No matching resources.</td></tr>';
  for(const action of ['unload','close'])for(const button of container.querySelectorAll('[data-resource-'+action+']'))button.onclick=async()=>{button.disabled=true;const id=button.dataset['resource'+action[0].toUpperCase()+action.slice(1)];try{await ui.api('/api/resources',{action,tabId:id});ui.resourceChanged(action,id);await refresh();}catch(error){ui.toast(error.message);if(button.isConnected)button.disabled=false;}};
 };
 const refresh=async()=>{const request=++version,button=find('[data-resource-refresh]');button.disabled=true;try{const current=await ui.api('/api/resources');if(active()&&request===version){data=current;draw();}}catch(error){if(active())ui.toast(error.message);}finally{if(active()&&request===version)button.disabled=false;}};
 for(const button of container.querySelectorAll('[data-resource-kind]'))button.onclick=()=>{const key=button.dataset.resourceKind;filter[key]=!filter[key];button.setAttribute('aria-pressed',String(filter[key]));draw();};
 find('[data-resource-filter]').oninput=event=>{filter.query=event.target.value;draw();};find('[data-resource-refresh]').onclick=refresh;
 await refresh();
}
