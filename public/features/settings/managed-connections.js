import {managedConnectionsMarkup} from './managed-connection-cards.js';
const definitionKeys=['id','name','label','enabled','ownerId','workspaceIds','transport','authentication','expected','capabilities','probes','policy'];
const definitionOf=row=>Object.fromEntries(definitionKeys.map(key=>[key,structuredClone(row[key])]));
export async function mountManagedConnections(container,ui,active){
 const host=document.createElement('section');host.className='managed-connections';container.append(host);
 const esc=ui.escape;let snapshot,editing=false,timer;
 const error=message=>{if(active()){const target=host.querySelector('[data-managed-error]');if(target)target.textContent=message;}};
 const refresh=async()=>{
  const next=await ui.api('/api/managed-connections');if(!active()||editing)return;snapshot=next;draw();
  clearTimeout(timer);if(next.connections.some(c=>c.status.ownerSignIn?.state==='sign-in-in-progress'))timer=setTimeout(()=>{if(active()&&!editing)void refresh().catch(e=>error(e.message));},2000);
 };
 const action=async(button,args)=>{
  button.disabled=true;error('');
  try{await ui.api('/api/managed-connections',{...args,expectedRevision:snapshot.revision});await refresh();}
  catch(e){error(e.message);if(active())button.disabled=false;}
 };
 function draw(){
  const expanded=new Set([...host.querySelectorAll('[data-connection]:has(.connection-details[open])')].map(node=>node.dataset.connection));
  host.innerHTML=managedConnectionsMarkup(snapshot,esc,expanded);
  host.querySelector('[data-managed-add]').onclick=()=>edit();host.querySelector('[data-managed-refresh]').onclick=()=>void refresh().catch(e=>error(e.message));
  for(const element of host.querySelectorAll('[data-connection]')){
   const row=snapshot.connections.find(c=>c.id===element.dataset.connection);
   element.querySelector('[data-managed-edit]').onclick=()=>edit(row);
   for(const kind of ['verify','repair','sign-in','remove'])element.querySelector('[data-managed-'+kind+']').onclick=event=>void action(event.target,{action:kind,connectionId:row.id});
   element.querySelector('[data-managed-toggle]').onclick=event=>void action(event.target,row.enabled?{action:'disable',connectionId:row.id}:{action:'save',definition:{...definitionOf(row),enabled:true}});
  }
 }
 function edit(existing,adapterId){
  editing=true;clearTimeout(timer);const editor=host.querySelector('[data-managed-editor]'),adapter=snapshot.adapters.find(a=>a.id===(existing?.authentication.adapter||adapterId))||snapshot.adapters[0],ado=adapter.id==='ado-entra-public-client';
  const value=existing||{name:ado?'hc-ado-corporate':'hc-atlassian',label:ado?'Azure DevOps corporate':'Atlassian',workspaceIds:[],authentication:{},expected:{principal:'',tenant:'',resource:'',organizationId:'',scopes:adapter.scopes||[]},capabilities:ado?adapter.capabilities:['jira.issue.read','jira.issue.search'],probes:[]};
  const field=(name,label,current,extra='')=>`<label>${esc(label)}<input name="${name}" ${extra} value="${esc(current||'')}"></label>`;
  const probe=value.probes.find(p=>p.parameters?.projectId)?.parameters||{},team=value.probes.find(p=>p.parameters?.teamId)?.parameters||{},item=value.probes.find(p=>p.parameters?.workItemId)?.parameters||{};
  editor.innerHTML=`<form data-managed-form><h3>${existing?'Configure connection':'Add connection'}</h3><label>Connection type<select name="adapter" aria-label="Connection type" ${existing?'disabled':''}>${snapshot.adapters.map(a=>`<option value="${esc(a.id)}" ${a.id===adapter.id?'selected':''}>${esc(a.name)}</option>`).join('')}</select></label>${field('name','Logical name',value.name,'required pattern="[a-z][a-z0-9-]{0,63}"')}${field('label','Display name',value.label,'required maxlength="160"')}<fieldset><legend>Authorized workspaces</legend>${snapshot.workspaces.map(w=>`<label><input type="checkbox" name="workspace" value="${esc(w.id)}" ${value.workspaceIds.includes(w.id)?'checked':''}>${esc(w.name)}</label>`).join('')}</fieldset><p>Server: ${esc(adapter.endpoint||adapter.transport.package+' '+adapter.transport.version)}</p>${field('principal',ado?'Expected corporate Entra object ID':'Expected Atlassian account ID',value.expected.principal,'required')}${field('tenant',ado?'Expected corporate tenant ID':'Expected cloud/site ID',value.expected.tenant,'required')}${field('resource',ado?'Expected organization URL':'Expected site URL',value.expected.resource,'type="url" required')}${ado?`${field('clientId','Approved public application client ID',value.authentication.clientId,'required')}${field('organizationId','Expected Azure DevOps organization ID',value.expected.organizationId,'required')}<p class="note">${esc(adapter.requires)} Proteus uses a separate protected sign-in; it does not adopt the Azure CLI cache or switch its account.</p>`:`<label>Approved OAuth scopes (one per line)<textarea name="scopes" rows="3">${esc(value.expected.scopes.join('\n'))}</textarea></label>`}<fieldset><legend>Required capabilities</legend>${adapter.capabilities.map(c=>`<label><input type="checkbox" name="capability" value="${esc(c)}" ${value.capabilities.includes(c)?'checked':''}>${esc(c)}</label>`).join('')}</fieldset>${ado?`${field('projectId','Project ID for approved health reads',probe.projectId)}${field('teamId','Team ID for the settings health read',team.teamId)}${field('workItemId','Work item ID for the read and exact-ID query',item.workItemId,'type="number" min="1" step="1"')}`:field('issue','Issue key/ID for approved minimal Jira health reads',value.probes.find(p=>p.parameters?.issueIdOrKey)?.parameters.issueIdOrKey)}<p class="note">${ado?'Verification reads one project-list entry, the selected team settings, and the exact work item. Its WIQL query is limited to that item and one result.':'Verification reads the expected account/site and this exact issue. Search is limited to that issue and one result.'} Saving approves these health probes; it does not grant a model permission to call other tools. Enter no passwords, tokens or client secrets here.</p><div class="actions"><button type="submit">Save configuration</button><button type="button" data-managed-cancel>Cancel</button></div></form>`;
  editor.scrollIntoView({block:'start'});editor.querySelector('[name=name]').focus({preventScroll:true});
  editor.querySelector('[name=adapter]').onchange=event=>edit(undefined,event.target.value);
  editor.querySelector('[data-managed-cancel]').onclick=()=>{editing=false;void refresh().catch(e=>error(e.message));};
  editor.querySelector('form').onsubmit=async event=>{
   event.preventDefault();const form=event.target,fields=new FormData(form),button=form.querySelector('[type=submit]');button.disabled=true;error('');
   const text=name=>String(fields.get(name)||'').trim(),capabilities=fields.getAll('capability');
   const definition={...(existing?definitionOf(existing):{id:crypto.randomUUID(),enabled:true,ownerId:snapshot.ownerId,transport:ado?adapter.transport:{type:'http',endpoint:adapter.endpoint},authentication:{adapter:adapter.id,credentialRef:crypto.randomUUID(),credentialOwnerId:snapshot.ownerId},policy:{healthIntervalMs:900000,preflightLeadMs:300000,requestTimeoutMs:30000,maxReadRetries:1}}),name:text('name'),label:text('label'),workspaceIds:fields.getAll('workspace'),expected:{principal:text('principal'),tenant:text('tenant'),resource:text('resource'),audience:ado?adapter.audience:adapter.endpoint,scopes:ado?adapter.scopes:text('scopes').split(/\s+/).filter(Boolean)},capabilities,probes:[]};
   if(ado){
    definition.authentication.clientId=text('clientId');definition.expected.organizationId=text('organizationId');
    for(const capability of capabilities){const parameters=capability==='ado.projects.read'?{}:capability==='ado.teams.read'?{projectId:text('projectId'),teamId:text('teamId')}:{projectId:text('projectId'),workItemId:Number(text('workItemId'))};definition.probes.push({id:capability,capability,parameters});}
   }else for(const [capability,id]of [['jira.issue.read','jira-issue'],['jira.issue.search','jira-search']])if(capabilities.includes(capability))definition.probes.push({id,capability,parameters:{issueIdOrKey:text('issue')}});
   try{await ui.api('/api/managed-connections',{action:'save',definition,expectedRevision:snapshot.revision});editing=false;await refresh();}
   catch(e){error(e.message);if(active())button.disabled=false;}
  };
 }
 try{await refresh();}catch(e){if(active())host.innerHTML=`<section class="card"><h2>Managed connections</h2><p role="status">${esc(e.message)}</p></section>`;}
}
