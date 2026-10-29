import {createHash} from 'node:crypto';
import {workspaceContentScopes,contentTab} from './content-tabs.js';

const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const historySignature=history=>history?.entries?.map(entry=>[entry.url,entry.title||''])||[];
// Historical branches are alternatives, not visits to append to the current
// stack. Keep their original order/selection in a separate unloaded logical tab.
function containsHistory(current,saved){
  let cursor=0;
  for(const entry of saved||[]){
    while(cursor<(current?.length||0)&&current[cursor].url!==entry.url)cursor++;
    if(cursor>=(current?.length||0))return false;cursor++;
  }
  return true;
}
export function planWindowContentRecovery({sources,scopes,available}){
  const candidates=new Map(),unavailable=[],moved=[],byIdentity=new Map();
  for(const row of scopes)for(const tab of row.tabs){if(!byIdentity.has(tab.id))byIdentity.set(tab.id,[]);byIdentity.get(tab.id).push(row.scope+':'+row.id);}
  for(const source of [...sources].sort((a,b)=>(b.at||'').localeCompare(a.at||'')||a.id.localeCompare(b.id))){
    for(const row of workspaceContentScopes(source.session).filter(row=>['workspace','project'].includes(row.scope))){
      if(!available(row)){unavailable.push({source:source.id,scope:row.scope,id:row.id});continue;}
      const owner=scopes.find(scope=>scope.scope===row.scope&&scope.id===row.id)||{revision:0,tabs:[]};
      for(const tab of row.tabs){
        const current=owner.tabs.find(item=>item.id===tab.id),placements=byIdentity.get(tab.id)||[];
        if(!current&&placements.length){moved.push({tabId:tab.id,source:source.id,placements});continue;}
        const key=row.scope+':'+row.id+':'+tab.id;
        if(!current){
          const retained=owner.retainedNavigation?.[tab.id],entry=retained?.entries[retained.index];
          const restored=entry?contentTab({...tab,url:entry.url,title:tab.customTitle||entry.title||tab.title,history:retained}):tab;
          if(!candidates.has(key))candidates.set(key,{scope:row.scope,id:row.id,revision:owner.revision,tab:restored,kind:'missing',source:source.id});
          // A second saved branch for that identity must not overwrite the first.
          const prior=candidates.get(key);
          if(tab.type!=='browser'||containsHistory(prior.tab.history?.entries,tab.history?.entries))continue;
        }else if(tab.type!=='browser'||containsHistory(current.history?.entries,tab.history?.entries))continue;
        if(!tab.history?.entries.length)continue;
        const branch=digest([row.scope,row.id,tab.id,historySignature(tab.history)]),id='recovered:'+branch;
        if(owner.tabs.some(item=>item.id===id))continue;
        candidates.set(branch,{scope:row.scope,id:row.id,revision:owner.revision,tab:contentTab({...tab,id,persist:false,title:'Recovered history · '+tab.title,customTitle:'Recovered history · '+tab.title}),kind:'history-branch',source:source.id,originalTabId:tab.id});
      }
    }
  }
  // Never import one identity into two containers from competing old layouts.
  // Prefer its most recent source; project placement wins an equal timestamp.
  const unique=new Map();
  for(const row of candidates.values()){
    const previous=unique.get(row.tab.id);
    if(!previous||row.source===previous.source&&row.scope==='project'&&previous.scope==='workspace')unique.set(row.tab.id,row);
  }
  const items=[...unique.values()];
  const evidence=sources.map(({session,...source})=>source).sort((a,b)=>a.id.localeCompare(b.id));
  return {id:digest({evidence,items,scopes:scopes.map(({scope,id,revision,retainedNavigation})=>({scope,id,revision,retainedNavigation})).sort((a,b)=>(a.scope+':'+a.id).localeCompare(b.scope+':'+b.id))}),items,sources:evidence,unavailable,moved,
    qualification:'Retained window records only. Older records do not distinguish an intentional tab close from a missing tab. Restore is explicit; current stacks are never replaced.'};
}
