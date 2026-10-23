/** One destination control for every resource; callers retain owner-specific mutations. */
export function moveMenuMarkup({groups,current,escape,id='tab-destination',application=true}){
 const option=tab=>`<option value="${escape(tab.id)}" ${tab.id===current?'selected':''} ${tab.disabled?'disabled':''}>${escape(tab.label)}${tab.id===current?' · Current location':''}</option>`;
 const roots=application?[{id:'main',label:'Application tabs'},{id:'team',label:'Team Tools'}]:[];
 return `<label>Destination<select id="${escape(id)}" data-move-destination>${roots.map(option).join('')}${groups.map(group=>`<optgroup label="${escape(group.label)}">${group.tabs.map(option).join('')}</optgroup>`).join('')}</select></label>`;
}
export function showMoveMenu({showDialog,escape,groups,current,id='tab-destination',application=true,title='Move tab',button='Move tab',note='Choose where this tab belongs. Its session and history are preserved.',submit}){
 showDialog(`<h2>${escape(title)}</h2>${moveMenuMarkup({groups,current,escape,id,application})}<p class="note">${escape(note)}</p><div class="actions"><button id="close-dialog">Cancel</button><button id="dialog-submit">${escape(button)}</button></div>`,async()=>{const select=document.getElementById(id);if(select.value===current)return;await submit(select.value);});
 const select=document.getElementById(id),buttonElement=document.getElementById('dialog-submit');
 const update=()=>buttonElement.disabled=!select.value||select.value===current;select.onchange=update;update();
 return select;
}
/** Group a single owner's complete project catalog, including unopened destinations. */
export function projectMoveGroups(workspaces,projects,{workspaceOnly=false}={}){
 return workspaces.map(workspace=>({label:workspace.name,tabs:workspaceOnly?[{id:workspace.id,label:workspace.name}]:projects.filter(project=>project.workspaceId===workspace.id).map(project=>({id:project.id,label:project.name}))}));
}
