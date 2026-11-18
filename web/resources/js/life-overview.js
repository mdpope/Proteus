const host=document.querySelector('#life-overview-content');
if(host){
 let generation=0;
 const el=(tag,text)=>{const node=document.createElement(tag);node.textContent=text;return node;};
 async function refresh(){
  const current=++generation;host.replaceChildren(el('p','Loading your records…'));
  try{
   const response=await fetch('/life/api/data',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json','X-CSRF-TOKEN':document.querySelector('meta[name="csrf-token"]').content},body:JSON.stringify({section:'overview'})});
   const value=await response.json();if(!response.ok)throw Error(value.message||'Could not load your records.');if(current!==generation)return;
   host.replaceChildren();
   for(const [title,items] of [['Your records',value.counts],['Today’s nutrition',value.nutrition]]){
    const card=el('section','');card.className='card';card.append(el('h2',title));
    const rows=Object.entries(items||{}).filter(([,v])=>v!==null&&typeof v!=='object');
    for(const [name,v] of rows)card.append(el('p',name.replaceAll('_',' ')+': '+String(v)));
    if(!rows.length)card.append(el('p','No records yet.'));host.append(card);
   }
   const recent=el('section','');recent.className='card';recent.append(el('h2','Recent activity'));
   for(const row of value.recentAudit||[])recent.append(el('p',[row.created_at,row.action,row.entity_type].filter(Boolean).join(' · ')));
   if(!value.recentAudit?.length)recent.append(el('p','No recent activity.'));host.append(recent);
  }catch(error){if(current===generation)host.replaceChildren(el('p',error.message));}
 }
 document.querySelector('#life-overview-refresh').onclick=()=>void refresh();window.addEventListener('pagehide',()=>++generation);void refresh();
}
