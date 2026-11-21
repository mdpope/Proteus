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

export async function pickBrowserMoveDestination({groups,current,anchor}) {
 const rect=anchor?.getBoundingClientRect();
 const position={x:rect?.left??12,y:rect?.bottom??52};
 const choices=[
  {tab:{id:'main',label:'Application tabs'}},
  {tab:{id:'team',label:'Team Tools'}},
  ...groups.map(group=>({group})),
 ];
 const label=tab=>String(tab.label||'Untitled').slice(0,78)+(tab.id===current?' · Current location':'');
 const pick=async (rows,format)=>{
  const pageSize=24;
  for(let offset=0;offset>=0&&offset<rows.length;){
   const items=rows.slice(offset,offset+pageSize).map((row,index)=>({id:'choice-'+index,...format(row)}));
   if(offset>0)items.push({id:'previous',label:'Previous destinations'});
   if(offset+pageSize<rows.length)items.push({id:'next',label:'More destinations'});
   const choice=await window.desktop.browser({action:'popup-menu',items,...position});
   if(choice==='previous')offset-=pageSize;
   else if(choice==='next')offset+=pageSize;
   else return items.some(item=>item.id===choice&&item.enabled!==false) ? rows[offset+Number(choice.slice(7))] : null;
  }
  return null;
 };
 const choice=await pick(choices,row=>row.tab
  ? {label:label(row.tab),enabled:row.tab.id!==current}
  : {label:String(row.group.label||'Workspace').slice(0,90)+' ›',enabled:row.group.tabs.length>0});
 if(choice?.tab)return choice.tab.id;
 if(!choice?.group)return null;
 const target=await pick(choice.group.tabs,tab=>({label:label(tab),enabled:!tab.disabled&&tab.id!==current}));
 return target?.id??null;
}
/** Group a single owner's complete project catalog, including unopened destinations. */
export function projectMoveGroups(workspaces,projects,{workspaceOnly=false}={}){
 return workspaces.map(workspace=>({label:workspace.name,tabs:workspaceOnly?[{id:workspace.id,label:workspace.name}]:projects.filter(project=>project.workspaceId===workspace.id).map(project=>({id:project.id,label:project.name}))}));
}
