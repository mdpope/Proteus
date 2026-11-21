const removeIcon='<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m4 4 8 8m0-8-8 8"/></svg>';

export function showSitePermissionRows(list,rows,{edit,remove,notify,focus}){
 list.replaceChildren();
 list.hidden=rows.length===0;
 for(const row of rows){
  const item=document.createElement('li');
  const origin=document.createElement('button');
  origin.type='button';
  origin.className='site-permission-origin';
  origin.textContent=row.origin;
  origin.title=row.origin;
  origin.setAttribute('aria-label','Edit '+row.label.toLowerCase()+' permission for '+row.origin);
  origin.onclick=()=>edit(row);
  const discard=document.createElement('button');
  discard.type='button';
  discard.className='site-permission-remove';
  discard.innerHTML=removeIcon;
  discard.title='Remove permission';
  discard.setAttribute('aria-label','Remove '+row.label.toLowerCase()+' permission for '+row.origin);
  discard.onclick=async()=>{
   discard.disabled=true;
   try{await remove(row);if(!discard.isConnected)focus();}
   catch(error){notify(error.message);}
   finally{discard.disabled=false;}
  };
  const state=document.createElement('span');
  state.className='site-permission-state';
  state.textContent=row.label+' · '+(row.permission==='allow'?'Allowed':'Blocked');
  item.append(origin,discard,state);
  list.append(item);
 }
}
