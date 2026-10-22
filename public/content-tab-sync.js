// Revision-aware descriptor reconciliation. Cookies, selection and page contents stay local.
import {safeContentTabURL,sameContentTab,mergeContentTabMetadata} from './content-tab-descriptor.js';
export function syncableTabURL(value){return value?safeContentTabURL(value):'';}
export function tabChanges(before,after,{navigation=false,seed=false}={}){
  const prior=new Map(before.map(tab=>[tab.id,tab])),next=new Map(after.map(tab=>[tab.id,tab])),operations=[];
  for(const tab of before)if(!next.has(tab.id))operations.push({action:'close',id:tab.id});
  for(const observed of after){
    const previous=prior.get(observed.id),tab=mergeContentTabMetadata(previous,observed);
    if(sameContentTab(previous,tab))continue;
    if(!previous&&navigation&&(!seed||tab.navigationPending)&&tab.type==='browser'&&tab.url){
      operations.push({action:'open',tab:{...tab,url:'',history:undefined}});
      const entries=tab.history?.entries?.slice(0,tab.history.index+1)||[{url:tab.url,title:tab.title}];
      entries.forEach((entry,index)=>{const id=entry.id||crypto.randomUUID();operations.push({action:'browser-navigate',tabId:tab.id,entryId:id,url:entry.url,title:entry.title,operationId:crypto.randomUUID(),visitedAt:new Date().toISOString(),baseRevision:index});});
    }else if(navigation&&previous?.type==='browser'&&tab.type==='browser'&&!previous.url&&tab.url&&!Number.isSafeInteger(previous.history?.revision)){
      const entries=tab.history?.entries?.slice(0,tab.history.index+1)||[{url:tab.url,title:tab.title}];
      entries.forEach((entry,index)=>{const id=entry.id||crypto.randomUUID();operations.push({action:'browser-navigate',tabId:tab.id,entryId:id,url:entry.url,title:entry.title,operationId:crypto.randomUUID(),visitedAt:new Date().toISOString(),baseRevision:index});});
      if(!sameContentTab({...previous,url:tab.url,history:tab.history},tab))operations.push({action:'open',tab:{...tab,url:previous.url,history:previous.history}});
    }else if(previous?.type==='browser'&&tab.type==='browser'&&Number.isSafeInteger(previous.history?.revision)){
      const old=previous.history,history=tab.history,selected=history?.entries?.[history.index];
      if(selected&&selected.id!==old.currentEntryId){
        const existing=old.entries.find(entry=>entry.id===selected.id);
        if(existing)operations.push({action:'browser-traverse',tabId:tab.id,entryId:existing.id,operationId:crypto.randomUUID(),visitedAt:new Date().toISOString(),baseRevision:old.revision});
        else {
          const firstNew=history.entries.findIndex(entry=>!old.entries.some(prior=>prior.id===entry.id));
          for(const [offset,entry]of history.entries.slice(Math.max(0,firstNew),history.index+1).entries())operations.push({action:'browser-navigate',tabId:tab.id,entryId:entry.id,url:entry.url,title:entry.title,operationId:crypto.randomUUID(),visitedAt:new Date().toISOString(),baseRevision:old.revision+offset});
        }
      }else if(selected&&(selected.url!==previous.url||selected.title!==old.entries.find(entry=>entry.id===selected.id)?.title))operations.push({action:'browser-redirect',tabId:tab.id,entryId:selected.id,url:selected.url,title:selected.title,operationId:crypto.randomUUID(),baseRevision:old.revision});
      if(!sameContentTab({...previous,url:tab.url,history:tab.history},tab))operations.push({action:'open',tab:{...tab,url:previous.url,history:previous.history}});
    }else operations.push({action:'open',tab});
  }
  if(before.map(tab=>tab.id).join('\0')!==after.map(tab=>tab.id).join('\0'))operations.push({action:'reorder',ids:after.map(tab=>tab.id)});
  return operations;
}
export function rebaseTabChanges(operations,current){
  const live=new Map(current.map(tab=>[tab.id,tab])),changes=[];
  for(let op of operations){
    if(op.action==='browser-navigate'){
      // A descriptor moved into this scope can already contain these entries.
      // Metadata seeding is not a new visit, and a lost acknowledgement may
      // leave an identical committed entry in the persisted outbox.
      const entry=current.find(tab=>tab.id===op.tabId)?.history?.entries?.find(entry=>entry.id===op.entryId);
      if(entry&&entry.url===op.url&&entry.title===op.title)continue;
    }
    if(op.action==='close'){if(!live.has(op.id))continue;live.delete(op.id);}
    else if(op.action==='open'){
      const prior=live.get(op.tab.id);
      op={...op,tab:mergeContentTabMetadata(prior,op.tab)};
      if(prior?.type==='browser'&&op.tab.type==='browser'&&op.tab.url===''&&!op.tab.history)op={...op,tab:{...op.tab,url:prior.url,history:prior.history}};
      if(sameContentTab(prior,op.tab))continue;live.set(op.tab.id,op.tab);
    }
    else if(op.action==='reorder')continue;
    changes.push(op);
  }
  const order=operations.find(op=>op.action==='reorder');
  if(order){const ids=order.ids.filter(id=>live.has(id));for(const tab of current)if(live.has(tab.id)&&!ids.includes(tab.id))ids.push(tab.id);for(const id of live.keys())if(!ids.includes(id))ids.push(id);if(ids.join('\0')!==[...live.keys()].join('\0'))changes.push({action:'reorder',ids});}
  return changes;
}
export function createTabSynchronizer({scopes,readLocal,apply,request,onError=()=>{},navigation=false,pendingStorage,now=Date.now,preserveUntracked=()=>false}){
  const records=new Map(),navigationCache=new Map(),backoff=new Map();
  const hostKey=scope=>scope.hostId||'local';
  const key=scope=>JSON.stringify([scope.hostId||'',scope.scope,scope.id]);
  async function hydrate(scope,remote){
    if(!navigation||!remote?.tabs)return remote;
    const tabs=[];
    for(const tab of remote.tabs){
      const history=tab.history;
      if(tab.type!=='browser'||!history||(history.offset||0)===0&&!history.hasMore&&(!history.total||history.total===history.entries.length)){tabs.push(tab);continue;}
      const cacheKey=key(scope)+':'+tab.id+':'+history.revision+':'+history.currentEntryId;
      let full=navigationCache.get(cacheKey);
      if(!full){
        const entries=[],seen=new Set();let cursor=null,total=null;
        do{
          const page=await request(scope,'history',{tabId:tab.id,limit:200,...(cursor?{cursor}:{start:true})});
          if((page.revision??page.history?.revision)!==history.revision||(page.currentEntryId||page.history?.currentEntryId)!==history.currentEntryId)throw Error('Browser navigation changed while loading history. Retry synchronization.');
          if(total===null)total=page.total;if(page.total!==total||entries.length!==(page.offset||0))throw Error('Browser history page coverage changed. Retry synchronization.');
          for(const entry of page.entries||page.history?.entries||[]){if(!entry.id||seen.has(entry.id))throw Error('Browser history contains duplicate entry identities.');seen.add(entry.id);entries.push(entry);}
          if(entries.length>10000)throw Error('Browser history exceeds its supported navigation limit.');
          cursor=page.hasMore?page.nextCursor:null;if(page.hasMore&&!cursor)throw Error('Browser history paging is incomplete.');
        }while(cursor);
        const index=entries.findIndex(entry=>entry.id===history.currentEntryId);
        if(entries.length!==total||index<0)throw Error('Browser history is incomplete. The current page was preserved.');
        full={entries,index,currentEntryId:history.currentEntryId,revision:history.revision};navigationCache.set(cacheKey,full);
        while(navigationCache.size>64)navigationCache.delete(navigationCache.keys().next().value);
      }
      tabs.push({...tab,history:full});
    }
    return {...remote,tabs};
  }
  async function snapshot(scope){
    const local=structuredClone(await readLocal(scope));
      // Multiple native views can share one owner descriptor. Reconcile that
      // identity once; apply still keeps each distinct local view and its order.
      const unique=new Map();
      for(const tab of local){
        const prior=unique.get(tab.id);
        if(prior?.navigationPending&&tab.navigationPending&&(prior.url!==tab.url||JSON.stringify(prior.history)!==JSON.stringify(tab.history)))throw Error('Two local views have different pending navigation for one shared tab. Resolve their navigation before synchronizing.');
        if(!prior||tab.navigationPending&&!prior.navigationPending)unique.set(tab.id,tab);
      }
    return [...unique.values()];
  }
  async function sync(scope){
    if((backoff.get(hostKey(scope))?.until||0)>now())return;
    const id=key(scope);let record=records.get(id);
    if(record?.busy){record.again=true;return record.busy;}
    if(record?.conflict)return;
    if((record?.retry?.until||0)>now())return;
    if(!record){record={baseline:null,revision:0};records.set(id,record);}
    const work=async()=>{
      let wrote=false;
      let local=await snapshot(scope);
      let remote=await hydrate(scope,await request(scope,'get'));
      if(records.get(id)!==record)return;
      // Older owners may never have registered these saved local chat aliases.
      // Preserve them without publishing a reopening or treating absence as close.
      // Once the owner exposes an identity, ordinary synchronization owns it.
      const observedKey='proteus.navigation.observed:'+id;
      if(!record.ownerObserved){
        const encoded=pendingStorage?.getItem(observedKey),saved=encoded?JSON.parse(encoded):[];
        if(!Array.isArray(saved)||saved.length>2000||saved.some(item=>typeof item!=='string'||item.length>256))throw Error('Saved owner tab observations could not be read. Local views were preserved.');
        record.ownerObserved=new Set(saved);
      }
      if(record.baseline===null&&!record.localAliases)record.localAliases=new Set(local.filter(tab=>remote.revision>0&&!record.ownerObserved.has(tab.id)&&!remote.tabs.some(item=>item.id===tab.id)&&preserveUntracked(scope,tab)).map(tab=>tab.id));
      const rememberOwner=()=>{
        for(const tab of remote.tabs){record.localAliases?.delete(tab.id);if(preserveUntracked(scope,tab))record.ownerObserved.add(tab.id);}
        // Remember participation across renderer restarts, including a close made
        // while offline. Only identities still present locally or remotely matter.
        const liveIds=new Set([...local,...remote.tabs].map(tab=>tab.id));
        record.ownerObserved=new Set([...record.ownerObserved].filter(id=>liveIds.has(id)));
        if(record.ownerObserved.size)pendingStorage?.setItem(observedKey,JSON.stringify([...record.ownerObserved]));else pendingStorage?.removeItem(observedKey);
      };
      rememberOwner();
      local=local.filter(tab=>!record.localAliases?.has(tab.id));
      // An existing revision is authoritative at first connection. A brand-new scope
      // can adopt locally opened descriptors without resurrecting remotely closed tabs.
      const storageKey='proteus.navigation.pending:'+id;
      const requestKey='proteus.navigation.request:'+id;
      if(!record.pending&&pendingStorage)try{record.pending=JSON.parse(pendingStorage.getItem(storageKey)||'null');}catch{}
      const initial=remote.revision===0?tabChanges([],local,{navigation,seed:true}):tabChanges(remote.tabs,[...remote.tabs.map(tab=>local.find(item=>item.id===tab.id&&item.navigationPending)||tab),...local.filter(tab=>tab.navigationPending&&!remote.tabs.some(item=>item.id===tab.id))],{navigation});
      const retrying=!!record.pending;
      const operations=record.pending||(record.baseline===null?initial:tabChanges(record.baseline,local,{navigation}));
      let captured=local;
      if(operations.length){
        // Do not publish a close computed before the user replaced/moved a tab.
        if(!retrying&&JSON.stringify((await snapshot(scope)).filter(tab=>!record.localAliases?.has(tab.id)))!==JSON.stringify(local)){record.again=true;return;}
        if(!retrying)record.pendingSnapshot=structuredClone(local);
        if(!record.pendingSnapshot){const known=new Map((record.baseline||[]).map(tab=>[tab.id,tab]));for(const op of operations){const tab=op.tab||remote.tabs.find(tab=>tab.id===(op.tabId||op.id));if(tab)known.set(tab.id,tab);}record.pendingSnapshot=[...known.values()].map(tab=>local.find(item=>item.id===tab.id)||tab);}
        captured=record.pendingSnapshot;
        record.pending=operations;if(pendingStorage)pendingStorage.setItem(storageKey,JSON.stringify(operations));
        let rebased=rebaseTabChanges(operations,remote.tabs);
        const send=async changes=>{
          const args={expectedRevision:remote.revision,operations:changes},signature=JSON.stringify(args);
          if(!record.request&&pendingStorage)try{record.request=JSON.parse(pendingStorage.getItem(requestKey)||'null');}catch{}
          if(record.request?.signature!==signature)record.request={signature,id:crypto.randomUUID(),issuedAt:new Date().toISOString()};
          if(pendingStorage)pendingStorage.setItem(requestKey,JSON.stringify(record.request));
          remote=await hydrate(scope,await request(scope,'mutate',args,{id:record.request.id,issuedAt:record.request.issuedAt}));
          wrote=true;
          record.request=null;pendingStorage?.removeItem(requestKey);
        };
        const submit=async changes=>{let metadata=[];const flush=async()=>{while(metadata.length)await send(metadata.splice(0,100));};for(const op of changes){if(op.action.startsWith('browser-')){await flush();await send([op]);}else metadata.push(op);}await flush();};
        try{await submit(rebased);}
        catch(error){if(!/Content tabs changed/.test(error.message))throw error;remote=await hydrate(scope,await request(scope,'get'));if(records.get(id)!==record)return;rebased=rebaseTabChanges(operations,remote.tabs);await submit(rebased);}
        record.pending=null;record.request=null;pendingStorage?.removeItem(storageKey);pendingStorage?.removeItem(requestKey);
      }
      // apply receives the captured snapshot, so it preserves additions made during I/O.
      if(records.get(id)!==record)return;
      rememberOwner(); // Mutation acknowledgements also prove owner participation.
      await apply(scope,remote.tabs,captured);record.pendingSnapshot=null;
      record.baseline=structuredClone(remote.tabs);record.revision=remote.revision;record.retry=null;if(wrote)backoff.delete(hostKey(scope));
    };
    record.busy=work().catch(error=>{
      if(error.code==='JOURNAL_BUSY'||/Remote command history is busy/i.test(error.message)){
        const owner=hostKey(scope),old=backoff.get(owner),attempt=(old?.attempt||0)+1;
        const delay=Math.min(60_000,Math.max(1000*2**Math.min(attempt-1,6),error.details?.retryAfterMs||0));
        const notify=old?.notifiedAt===undefined||now()-old.notifiedAt>=60_000;
        backoff.set(owner,{attempt,until:now()+delay,notifiedAt:notify?now():old.notifiedAt});
        // A definite admission refusal has no effects or receipt. A later attempt
        // may get a fresh issue time; transport/uncertain failures retain theirs.
        record.request=null;pendingStorage?.removeItem('proteus.navigation.request:'+id);
        if(notify)onError(error,scope,record.baseline!==null,record.pending||[]);return;
      }
      if(error.code==='NAVIGATION_CONFLICT'||error.code==='NAVIGATION_OPERATION_CONFLICT'||error.code==='NAVIGATION_TAB_CLOSED'||/Navigation changed on the owning computer|Navigation operation ID was already used|This browser tab is no longer open/i.test(error.message)){
        record.conflict=true;onError(error,scope,record.baseline!==null,record.pending||[]);return;
      }
      // Rejected or uncertain requests keep their original receipt identity and
      // payload. Retry this scope gradually; healthy scopes can still synchronize.
      const previous=record.retry,attempt=(previous?.attempt||0)+1;
      const notify=previous?.notifiedAt===undefined||now()-previous.notifiedAt>=60_000;
      record.retry={attempt,until:now()+Math.min(60_000,1000*2**Math.min(attempt-1,6)),notifiedAt:notify?now():previous.notifiedAt};
      if(notify)onError(error,scope,record.baseline!==null,record.pending||[]);
    }).finally(()=>{record.busy=null;if(record.again&&records.get(id)===record){record.again=false;void sync(scope);}});
    return record.busy;
  }
  async function resolve(scope,{preserve}={}){
    const id=key(scope),record=records.get(id);if(!record?.conflict)return;
    if(record.busy)await record.busy;
    const local=await readLocal(scope),remote=await hydrate(scope,await request(scope,'get'));
    if(records.get(id)!==record)return;
    const affected=new Set((record.pending||[]).filter(op=>op.action.startsWith('browser-')).map(op=>op.tabId));
    if(preserve){
      const destinations=local.filter(tab=>affected.has(tab.id));
      for(const op of record.pending||[])if(op.action==='browser-navigate'&&op.url&&!destinations.some(tab=>tab.id===op.tabId))destinations.push({id:op.tabId,type:'browser',url:op.url,title:op.title});
      await preserve(destinations);
    }
    // Retain recovery intent across restart before acknowledging the user's
    // explicit resolution. Clearing an outbox must not erase its only copy.
    if(record.pending?.length&&pendingStorage){
      const recoveryKey='proteus.navigation.recovery:'+id;
      pendingStorage.setItem(recoveryKey,JSON.stringify({resolvedAt:new Date(now()).toISOString(),pending:record.pending,local:local.filter(tab=>affected.has(tab.id)),baseline:remote.tabs.filter(tab=>affected.has(tab.id))}));
    }
    await apply(scope,remote.tabs,local,{discardPendingNavigation:true});
    if(records.get(id)!==record)return;
    record.pending=null;record.conflict=false;record.again=false;record.retry=null;record.baseline=structuredClone(remote.tabs);record.revision=remote.revision;
    record.request=null;pendingStorage?.removeItem('proteus.navigation.pending:'+id);pendingStorage?.removeItem('proteus.navigation.request:'+id);
  }
  return {sync,resolve,hasConflict:scope=>records.get(key(scope))?.conflict===true,forget(scope){records.delete(key(scope));},forgetHost(hostId){backoff.delete(hostId);for(const id of records.keys())if(JSON.parse(id)[0]===hostId)records.delete(id);},async all(){const groups=new Map();for(const scope of scopes()){const owner=hostKey(scope);if(!groups.has(owner))groups.set(owner,[]);groups.get(owner).push(scope);}await Promise.all([...groups.values()].map(async group=>{for(const scope of group)await sync(scope);}));}};
}
