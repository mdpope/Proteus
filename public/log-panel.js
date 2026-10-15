// Shared desktop/web log presentation. Lists contain summaries only; expanded
// diagnostic bodies are fetched individually and retained only on this page.
export async function mountLogPanel(host,{list,detail,escape,time,active=()=>true,target,title='Application logs',note='Up to 2,000 entries retained. Older entries rotate automatically.'}) {
  let cursor=null,previous=[],version=0;
  const load=async(query={})=>{
    const request=++version;
    host.innerHTML=`<section class="card"><h2>${escape(title)}</h2><p role="status">Loading logs…</p></section>`;
    try {
      const page=await list({limit:50,...query});if(!active()||request!==version)return;
      host.innerHTML=`<section class="card log-panel"><h2>${escape(title)}</h2><p class="note">${escape(note)}</p><div class="log-items">${(page.items||[]).map(item=>`<article class="log-entry" tabindex="-1" data-log-id="${escape(item.id||item.eventId)}"><header><time>${escape(time(item.createdAt||item.at))}</time><strong class="log-severity">${escape(item.level||'info')}</strong><span>${escape(item.event||item.code||'')}</span></header><p class="log-summary">${escape(item.summary||item.message||item.event||item.code||'Event')}</p>${item.chatId||item.scheduleId?`<small>${escape(item.chatId?'Chat '+item.chatId:'Schedule '+item.scheduleId)}</small>`:''}<details><summary>Details</summary><div class="log-detail"><p>Expand to load recorded details.</p></div></details></article>`).join('')||'<p class="empty">No retained log events.</p>'}</div><div class="actions log-pagination"><button data-log-refresh>Refresh</button><button data-log-newer ${previous.length?'':'disabled'}>Newer</button><button data-log-older ${page.hasMore?'':'disabled'}>Older</button><span class="note">${(page.items||[]).length} shown${Number.isFinite(page.total)?' · '+page.total+' retained':''}</span></div></section>`;
      host.querySelector('[data-log-refresh]').onclick=()=>{previous=[];cursor=null;void load();};
      host.querySelector('[data-log-newer]').onclick=()=>{cursor=previous.pop()||null;void load(cursor?{cursor}:{});};
      host.querySelector('[data-log-older]').onclick=()=>{previous.push(cursor);cursor=page.nextCursor;void load({cursor});};
      for(const [index,row] of [...host.querySelectorAll('[data-log-id]')].entries()) {
        const disclosure=row.querySelector('details'),body=row.querySelector('.log-detail');let loaded=false,busy=false;
        disclosure.ontoggle=async()=>{
          if(!disclosure.open||loaded||busy)return;busy=true;body.textContent='Loading details…';
          try {
            const value=await detail(page.items[index]);if(!active()||!row.isConnected)return;
            body.innerHTML=`${value.truncated?'<p class="note">This entry exceeded the diagnostic size limit. The retained content is shown below.</p>':''}${value.legacy?'<p class="note">Imported legacy entry; previously truncated or unrecorded details are unavailable.</p>':''}<pre>${escape(value.message||value.summary||value.event||value.code||'')}</pre>${value.details?`<pre>${escape(typeof value.details==='string'?value.details:JSON.stringify(value.details,null,2))}</pre>`:''}<pre>${escape(JSON.stringify(Object.fromEntries(Object.entries(value).filter(([key])=>!['message','summary','details'].includes(key))),null,2))}</pre>`;loaded=true;
          }catch(error){body.textContent=error.message;}finally{busy=false;}
        };
      }
      if(target){const row=[...host.querySelectorAll('[data-log-id]')].find(row=>row.dataset.logId===target);if(row){row.focus({preventScroll:true});row.scrollIntoView({block:'center'});}target=null;}
    }catch(error){if(active()&&request===version){host.innerHTML=`<section class="card"><h2>${escape(title)}</h2><p class="banner">${escape(error.message)}</p><button data-log-retry>Retry</button></section>`;host.querySelector('[data-log-retry]').onclick=()=>void load(query);}}
  };
  await load(target?{target}:{});
}

export function pagedAccountLogs(items,{limit=50,cursor}={}) {
  const offset=Math.max(0,Number(cursor)||0),page=items.slice(offset,offset+limit);
  return {items:page,total:items.length,hasMore:offset+page.length<items.length,nextCursor:String(offset+page.length)};
}
