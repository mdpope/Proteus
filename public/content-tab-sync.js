// Revision-aware descriptor reconciliation. Cookies, selection and page contents stay local.
export function syncableTabURL(value){if(!value)return '';if(typeof value!=='string'||value.length>4096)return null;try{const url=new URL(value);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)return null;if(/(?:oauth|authorize|callback|sign[-_]?in|login|reset|token)(?:\/|$)/i.test(url.pathname)||/proteus(?::|%3a)(?:\/|%2f)/i.test(value))return null;const sensitive=/^(?:access_token|id_token|refresh_token|token|password|passwd|secret|api[_-]?key|authorization|code|pair|pairing|session|signature|sig)$/i;if([...url.searchParams.keys()].some(key=>sensitive.test(key)))return null;const fragment=url.hash.slice(1);if(fragment.includes('=')&&[...new URLSearchParams(fragment).keys()].some(key=>sensitive.test(key)))return null;return url.href;}catch{return null;}}
export function tabChanges(before,after){
  const prior=new Map(before.map(tab=>[tab.id,tab])),next=new Map(after.map(tab=>[tab.id,tab])),operations=[];
  for(const tab of before)if(!next.has(tab.id))operations.push({action:'close',id:tab.id});
  for(const tab of after)if(JSON.stringify(prior.get(tab.id))!==JSON.stringify(tab))operations.push({action:'open',tab});
  if(before.map(tab=>tab.id).join('\0')!==after.map(tab=>tab.id).join('\0'))operations.push({action:'reorder',ids:after.map(tab=>tab.id)});
  return operations;
}
export function rebaseTabChanges(operations,current){
  const live=new Set(current.map(tab=>tab.id));
  const changes=operations.filter(op=>op.action!=='reorder');
  for(const op of changes){if(op.action==='close')live.delete(op.id);else if(op.action==='open')live.add(op.tab.id);}
  const order=operations.find(op=>op.action==='reorder');
  if(order){const ids=order.ids.filter(id=>live.has(id));for(const tab of current)if(live.has(tab.id)&&!ids.includes(tab.id))ids.push(tab.id);for(const id of live)if(!ids.includes(id))ids.push(id);changes.push({action:'reorder',ids});}
  return changes;
}
export function createTabSynchronizer({scopes,readLocal,apply,request,onError=()=>{}}){
  const records=new Map();
  const key=scope=>JSON.stringify([scope.hostId||'',scope.scope,scope.id]);
  async function sync(scope){
    const id=key(scope);let record=records.get(id);
    if(record?.busy){record.again=true;return record.busy;}
    if(!record){record={baseline:null,revision:0};records.set(id,record);}
    const work=async()=>{
      const local=await readLocal(scope);
      let remote=await request(scope,'get');
      // An existing revision is authoritative at first connection. A brand-new scope
      // can adopt locally opened descriptors without resurrecting remotely closed tabs.
      const operations=record.baseline===null?(remote.revision===0?tabChanges([],local):[]):tabChanges(record.baseline,local);
      if(operations.length){
        let rebased=rebaseTabChanges(operations,remote.tabs);
        try{remote=await request(scope,'mutate',{expectedRevision:remote.revision,operations:rebased});}
        catch(error){if(!/Content tabs changed/.test(error.message))throw error;remote=await request(scope,'get');rebased=rebaseTabChanges(operations,remote.tabs);remote=await request(scope,'mutate',{expectedRevision:remote.revision,operations:rebased});}
      }
      // apply receives the captured snapshot, so it preserves additions made during I/O.
      if(records.get(id)!==record)return;
      await apply(scope,remote.tabs,local);
      record.baseline=remote.tabs.map(tab=>({...tab}));record.revision=remote.revision;
    };
    record.busy=work().catch(error=>{onError(error,scope,record.baseline!==null);}).finally(()=>{record.busy=null;if(record.again&&records.get(id)===record){record.again=false;void sync(scope);}});
    return record.busy;
  }
  return {sync,forgetHost(hostId){for(const id of records.keys())if(JSON.parse(id)[0]===hostId)records.delete(id);},async all(){await Promise.all(scopes().map(sync));}};
}
