/** Host-local OS integration. Remote/web pages never receive registration authority. */
export async function mountLinkRoutingPreferences(ui,container){
  if(window.desktop?.platform!=='darwin'||!window.desktop.linkRouting)return;
  const e=ui.escape,root=document.createElement('section');root.className='card';container.prepend(root);
  let state=await window.desktop.linkRouting({action:'get'});if(!root.isConnected)return;
  const perform=async value=>{try{state=await window.desktop.linkRouting(value);draw();}catch(error){ui.toast(error.message);}};
  function draw(){
    if(!root.isConnected)return;
    const {configuration,registration,targets}=state;
    const targetLabel=target=>{const live=targets.find(row=>row.hostId===(target.hostId||'local')&&row.workspaceId===target.workspaceId&&row.projectId===target.projectId);return live?live.workspaceName+' / '+live.projectName:'Unavailable project';};
    root.innerHTML=`<h2>Links from other applications</h2><p>Choose a project when opening an operating-system website link. Matching rules open directly in their project. Proteus uses the project's window, its workspace's window, or the main window.</p><p data-registration-status role="status">${registration.isDefault?'Proteus is the default browser for HTTP and HTTPS.':`Current HTTP browser: ${e(registration.schemes.http.name||'Unknown')} · HTTPS: ${e(registration.schemes.https.name||'Unknown')}`}</p><div class="actions"><button data-default ${registration.available?'':'disabled'}>Make Proteus the default browser…</button><button data-register ${registration.available?'':'disabled'}>Register / repair this installed copy</button><button data-refresh>Refresh status</button></div><p class="note">macOS may omit registered apps from its Default Web Browser menu. Use Make Default and answer the system confirmation. Repair registers only this app; it does not reset LaunchServices or change the default. Development/preview copies cannot change registration.</p><h3>Automatic routing rules</h3><p class="note">First enabled match wins. Use a host, *.example.com, a host glob, or host/path. A missing destination opens the picker. Rules are saved on this Mac.</p><div data-rules></div><label>URL pattern<input data-pattern maxlength="2048" placeholder="*.example.com or example.com/team"></label><label>Destination project<select data-destination aria-label="Link rule destination">${targets.map((target,index)=>`<option value="${index}">${e(target.workspaceName+' / '+target.projectName+(target.hostId==='local'?'':' · '+target.hostName))}</option>`).join('')}</select></label><button data-add ${targets.length?'':'disabled'}>Add routing rule</button>${(state.warnings||[]).map(w=>`<p class="note">${e(w)}</p>`).join('')}`;
    const save=rules=>perform({action:'save',rules,expectedRevision:configuration.revision});
    const rules=root.querySelector('[data-rules]');configuration.rules.forEach((rule,index)=>{
      const row=document.createElement('div');row.className='resource-row';row.innerHTML=`<label class="checkbox-row"><input data-enabled type="checkbox" ${rule.enabled?'checked':''}>${e(rule.pattern)}</label><span>${e(targetLabel(rule.destination))}</span><div class="actions"><button data-up aria-label="Move rule up" ${index?'':'disabled'}>↑</button><button data-down aria-label="Move rule down" ${index<configuration.rules.length-1?'':'disabled'}>↓</button><button data-remove>Remove</button></div>`;rules.append(row);
      row.querySelector('[data-enabled]').onchange=event=>save(configuration.rules.map(item=>item.id===rule.id?{...item,enabled:event.target.checked}:item));
      row.querySelector('[data-remove]').onclick=()=>save(configuration.rules.filter(item=>item.id!==rule.id));
      for(const [selector,offset]of [['[data-up]',-1],['[data-down]',1]])row.querySelector(selector).onclick=()=>{const next=configuration.rules.slice();[next[index],next[index+offset]]=[next[index+offset],next[index]];void save(next);};
    });
    root.querySelector('[data-add]').onclick=()=>{const pattern=root.querySelector('[data-pattern]').value.trim(),target=targets[Number(root.querySelector('[data-destination]').value)];if(!pattern||!target){ui.toast('Choose a URL pattern and project.');return;}void save([...configuration.rules,{id:crypto.randomUUID(),pattern,enabled:true,destination:{hostId:target.hostId,workspaceId:target.workspaceId,projectId:target.projectId}}]);};
    root.querySelector('[data-default]').onclick=()=>void perform({action:'make-default'});
    root.querySelector('[data-register]').onclick=()=>void perform({action:'register'});
    root.querySelector('[data-refresh]').onclick=()=>void perform({action:'get'});
  }
  draw();
}
