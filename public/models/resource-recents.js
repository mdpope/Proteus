// Recent metadata is local navigation history, never a cached resource or grant.
// Bind it to the account/storage root and re-read through the owner on selection.
export function createResourceRecents({load,save,now=()=>Date.now(),limit=100}){
 let entries;try{entries=load();}catch{}if(!Array.isArray(entries))entries=[];
 entries=entries.filter(row=>row&&['reminders','scratchpad'].includes(row.feature)&&typeof row.binding==='string'&&typeof row.id==='string'&&typeof row.title==='string'&&Number.isFinite(row.at)).slice(0,limit);
 const rows=(feature,binding)=>binding?entries.filter(row=>row.feature===feature&&row.binding===binding).sort((a,b)=>b.at-a.at||a.id.localeCompare(b.id)):[];
 // Scratchpad history spans every computer; each row keeps the storage binding it came from.
 const all=feature=>entries.filter(row=>row.feature===feature).sort((a,b)=>b.at-a.at||a.id.localeCompare(b.id));
 function remember(feature,binding,record,{visit=true}={}){
  if(!binding||!record?.id||!record.title)return false;
  const old=entries.find(row=>row.feature===feature&&row.binding===binding&&row.id===record.id);
  const next={feature,binding,id:record.id,title:record.title,at:visit?now():old?.at||now()};
  if(old?.title===next.title&&old.at===next.at)return false;
  entries=[next,...entries.filter(row=>row!==old)].sort((a,b)=>b.at-a.at).slice(0,limit);save(entries);return true;
 }
 function remove(feature,binding,id){const next=entries.filter(row=>row.feature!==feature||row.binding!==binding||row.id!==id);if(next.length===entries.length)return false;entries=next;save(entries);return true;}
 return {rows,all,remember,remove};
}
