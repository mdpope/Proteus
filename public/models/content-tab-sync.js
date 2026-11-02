// Revision-aware descriptor reconciliation. Cookies, selection and page contents stay local.
import {safeContentTabURL,sameContentTab,mergeContentTabMetadata} from './content-tab-descriptor.js';
import {applyNavigationDelta} from '../shared/navigation/navigation-history.js';
export function syncableTabURL(value){return value?safeContentTabURL(value):'';}
// A membership-only pass may remove only identities confirmed absent by the owner.
// Newly captured local opens must survive until the subsequent mutation pass.
export function shouldRemoveCapturedTab(id,ownerIds,capturedIds,{membershipOnly=false,removedIds=[],preservedIds=[]}={}){
  if(!id||ownerIds.has(id)||!capturedIds.has(id))return false;
  if(membershipOnly&&!removedIds.includes(id))return false;
  return !preservedIds.includes(id)||removedIds.includes(id);
}
export function tabChanges(before,after,{navigation=false,seed=false}={}){
  const prior=new Map(before.map(tab=>[tab.id,tab])),next=new Map(after.map(tab=>[tab.id,tab])),operations=[];
  const seedNavigation=tab=>{
    const entries=tab.history?.entries?.length?tab.history.entries:[{url:tab.url,title:tab.title}],ids=[];
    entries.forEach((entry,index)=>{const id=entry.id||crypto.randomUUID();ids.push(id);operations.push({action:'browser-navigate',tabId:tab.id,entryId:id,url:entry.url,title:entry.title,operationId:crypto.randomUUID(),visitedAt:new Date().toISOString(),baseRevision:index});});
    const selected=tab.history?.index;if(Number.isSafeInteger(selected)&&selected>=0&&selected<entries.length-1)operations.push({action:'browser-traverse',tabId:tab.id,entryId:ids[selected],operationId:crypto.randomUUID(),visitedAt:new Date().toISOString(),baseRevision:entries.length});
  };
  for(const tab of before)if(!next.has(tab.id))operations.push({action:'close',id:tab.id});
  for(const observed of after){
    const previous=prior.get(observed.id),tab=mergeContentTabMetadata(previous,observed);
    if(sameContentTab(previous,tab))continue;
    if(!previous&&navigation&&(!seed||tab.navigationPending)&&tab.type==='browser'&&tab.url){
      operations.push({action:'open',tab:{...tab,url:'',history:undefined}});
      seedNavigation(tab);
    }else if(navigation&&previous?.type==='browser'&&tab.type==='browser'&&!previous.url&&tab.url&&!Number.isSafeInteger(previous.history?.revision)){
      seedNavigation(tab);
      if(!sameContentTab({...previous,url:tab.url,history:tab.history},tab))operations.push({action:'open',updateOnly:true,tab:{...tab,url:previous.url,history:previous.history}});
    }else if(previous?.type==='browser'&&tab.type==='browser'&&Number.isSafeInteger(previous.history?.revision)){
      const old=previous.history,history=tab.history,selected=history?.entries?.[history.index];
      const oldEntries=new Map(old.entries.map(entry=>[entry.id,entry])),firstNew=history?.entries.findIndex(entry=>!oldEntries.has(entry.id))??-1,canNavigate=!navigation||tab.navigationPending!==false;
      // Native views explicitly distinguish human navigation from a stale
      // mirror. An application skipped during I/O is not an instruction to
      // navigate the owner back on the next reconciliation.
      if(selected&&firstNew>=0&&canNavigate){
        // Visits made while offline remain meaningful after Back. Publish the
        // whole new branch, then restore its selected entry instead of losing
        // forward history or appending at the owner's previous selection.
        let revision=old.revision,current=old.currentEntryId;
        const traverse=id=>{if(id&&id!==current){operations.push({action:'browser-traverse',tabId:tab.id,entryId:id,operationId:crypto.randomUUID(),visitedAt:new Date().toISOString(),baseRevision:revision++});current=id;}};
        traverse(history.entries[firstNew-1]?.id);
        for(const entry of history.entries.slice(firstNew)){if(oldEntries.has(entry.id)){traverse(entry.id);continue;}operations.push({action:'browser-navigate',tabId:tab.id,entryId:entry.id,url:entry.url,title:entry.title,operationId:crypto.randomUUID(),visitedAt:new Date().toISOString(),baseRevision:revision++});current=entry.id;}
        traverse(selected.id);
      }else if(selected&&selected.id!==old.currentEntryId&&canNavigate){
        operations.push({action:'browser-traverse',tabId:tab.id,entryId:selected.id,operationId:crypto.randomUUID(),visitedAt:new Date().toISOString(),baseRevision:old.revision});
      }else if(selected&&selected.id===old.currentEntryId&&(selected.url!==previous.url||selected.title!==old.entries.find(entry=>entry.id===selected.id)?.title))operations.push({action:'browser-redirect',tabId:tab.id,entryId:selected.id,url:selected.url,title:selected.title,operationId:crypto.randomUUID(),baseRevision:old.revision});
      if(!sameContentTab({...previous,url:tab.url,history:tab.history},tab))operations.push({action:'open',updateOnly:true,tab:{...tab,url:previous.url,history:previous.history}});
    }else operations.push({action:'open',...(previous?{updateOnly:true}:{}),tab});
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
    if(op.action==='browser-redirect'){
      // Another client may already have supplied the same selected-entry title.
      // Converge that metadata intent without issuing a stale navigation write.
      const history=current.find(tab=>tab.id===op.tabId)?.history,entry=history?.entries?.[history.index];
      if(history?.currentEntryId===op.entryId&&entry?.id===op.entryId&&entry.url===op.url&&entry.title===op.title)continue;
    }
    if(op.action==='close'){if(!live.has(op.id))continue;live.delete(op.id);}
    else if(op.action==='open'){
      const prior=live.get(op.tab.id);
      // A title/history/visibility refresh of an existing view cannot reopen
      // its identity after another window has closed or moved that tab.
      if(op.updateOnly===true&&!prior)continue;
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
function changesAfterOwnerUpdates(baseline,local,remote,navigation){
  const known=new Set(baseline.map(tab=>tab.id)),present=new Set(local.map(tab=>tab.id));
  const arrivals=new Map(remote.filter(tab=>!known.has(tab.id)&&present.has(tab.id)).map(tab=>[tab.id,tab]));
  if(!arrivals.size)return tabChanges(baseline,local,{navigation});
  // Native placement can reach a window before its next GET. That descriptor
  // already exists on the owner: neither replay its history as new visits nor
  // publish the old native view position as an intentional destination reorder.
  const observed=local.map(tab=>arrivals.has(tab.id)&&!tab.navigationPending?arrivals.get(tab.id):tab);
  const operations=tabChanges([...baseline,...arrivals.values()],observed,{navigation});
  const previousOrder=baseline.filter(tab=>!arrivals.has(tab.id)).map(tab=>tab.id);
  const localOrder=local.filter(tab=>!arrivals.has(tab.id)).map(tab=>tab.id);
  const explicitChatOpen=local.some(tab=>arrivals.has(tab.id)&&tab.type==='chat'&&tab.navigationPending);
  return !explicitChatOpen&&previousOrder.join('\0')===localOrder.join('\0')?operations.filter(op=>op.action!=='reorder'):operations;
}
export function createTabSynchronizer({scopes,readLocal,apply,acknowledge=async()=>{},request,onError=()=>{},navigation=false,explicitCloseOnly=false,pendingStorage,now=Date.now,preserveUntracked=()=>false}){
  const records=new Map(),navigationCache=new Map(),backoff=new Map();
  // A view can disappear while its parent remounts or an alias changes. Only a
  // durable human Close can delete membership; incomplete views cannot reorder it.
  const viewChanges=(before,after,operations)=>!explicitCloseOnly?operations:operations.filter(op=>op.action!=='close'&&(op.action!=='reorder'||before.every(tab=>after.some(row=>row.id===tab.id))));
  const hostKey=scope=>scope.hostId||'local';
  const key=scope=>JSON.stringify([scope.hostId||'',scope.scope,scope.id]);
  async function hydrate(scope,remote){
    if(!navigation||!remote?.tabs)return remote;
    const tabs=[],baselines=new Map((records.get(key(scope))?.baseline||[]).map(tab=>[tab.id,tab.history]));
    for(const tab of remote.tabs){
      const history=tab.history;
      if(tab.type!=='browser'||!history){tabs.push(tab);continue;}
      const cacheKey=key(scope)+':'+tab.id,cached=navigationCache.get(cacheKey)||baselines.get(tab.id);
      let full;
      if((history.offset||0)===0&&!history.hasMore&&(!history.total||history.total===history.entries.length))full={entries:history.entries,index:history.index,currentEntryId:history.currentEntryId,revision:history.revision};
      else if(cached?.revision===history.revision&&cached.currentEntryId===history.currentEntryId)full=cached;
      else if(cached&&history.deltaSupported&&cached.revision<history.revision){
        const response=await request(scope,'history',{tabId:tab.id,sinceRevision:cached.revision});
        if(response.delta)full=applyNavigationDelta(cached,response,history);
        else if(!response.reset)throw Error('Browser history delta is unavailable. The current page was preserved.');
      }
      if(!full){
        const entries=[],seen=new Set();let cursor=null,total=null;
        do{
          const page=await request(scope,'history',{tabId:tab.id,limit:200,...(cursor?{cursor}:{start:true})});
          if((page.revision??page.history?.revision)!==history.revision||(page.currentEntryId||page.history?.currentEntryId)!==history.currentEntryId)throw Error('Browser navigation changed while loading history. Retry synchronization.');
          if(total===null)total=page.total;if(page.total!==total||entries.length!==(page.offset||0))throw Error('Browser history page coverage changed. Retry synchronization.');
          for(const entry of page.entries||page.history?.entries||[]){if(!entry.id||seen.has(entry.id))throw Error('Browser history contains duplicate entry identities.');seen.add(entry.id);entries.push(entry);}
          cursor=page.hasMore?page.nextCursor:null;if(page.hasMore&&!cursor)throw Error('Browser history paging is incomplete.');
          if(page.hasMore&&!(page.entries||page.history?.entries||[]).length)throw Error('Browser history paging did not advance.');
        }while(cursor);
        const index=entries.findIndex(entry=>entry.id===history.currentEntryId);
        if(entries.length!==total||index<0)throw Error('Browser history is incomplete. The current page was preserved.');
        full={entries,index,currentEntryId:history.currentEntryId,revision:history.revision};
      }
      if(records.has(key(scope))){navigationCache.delete(cacheKey);navigationCache.set(cacheKey,full);while(navigationCache.size>64)navigationCache.delete(navigationCache.keys().next().value);}
      // apply may hand these entries to mutable native views; keep the verified
      // delta baseline private so local pending navigation cannot corrupt it.
      tabs.push({...tab,history:structuredClone(full)});
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
  async function checkpoint(scope){
    // Leaving a visible scope must not hydrate it again just to retain intent.
    // The workspace also saves native pending navigation, covering first reads
    // and edits newer than an uncertain/in-flight outbox without replacing it.
    const id=key(scope),record=records.get(id),baseline=record?.baseline;
    if(!baseline||record.busy||record.pending||record.conflict||!pendingStorage)return false;
    const local=(await snapshot(scope)).filter(tab=>!record.localAliases?.has(tab.id));
    if(records.get(id)!==record||record.baseline!==baseline||record.busy||record.pending||record.conflict)return false;
    const operations=viewChanges(baseline,local,tabChanges(baseline,local,{navigation}));if(!operations.length)return false;
    pendingStorage.setItem('proteus.navigation.pending:'+id,JSON.stringify(operations));
    record.pending=operations;record.pendingSnapshot=structuredClone(local);return true;
  }
  async function sync(scope){
    if((backoff.get(hostKey(scope))?.until||0)>now())return;
    const id=key(scope);let record=records.get(id);
    if(record?.busy){record.again=true;return record.busy;}
    if((record?.retry?.until||0)>now())return;
    if(!record){record={baseline:null,revision:0};records.set(id,record);}
    const work=async()=>{
      let wrote=false;
      let local=await snapshot(scope);
      let raw=await request(scope,'get',{historyLimit:200});
      // Explicit local Close is independent of baseline/history quarantine. Its
      // durable envelope is separate from an uncertain navigation request.
      const closeKey='proteus.navigation.closes:'+id,closeRequestKey=closeKey+':request';
      const queued=JSON.parse(pendingStorage?.getItem(closeKey)||'[]');
      if(!Array.isArray(queued)||queued.length>1000||queued.some(id=>typeof id!=='string'||!/^[-a-zA-Z0-9_:.]{1,256}$/.test(id)))throw Error('Queued tab closes could not be read. The original intent was preserved.');
      const closes=queued.slice(0,100);
      if(closes.length){
        const operations=closes.filter(tabId=>!Object.hasOwn(raw.closed||{},tabId)).map(id=>({action:'close',id}));
        if(operations.length){
          let envelope=JSON.parse(pendingStorage?.getItem(closeRequestKey)||'null');
          if(!envelope)envelope={id:crypto.randomUUID(),issuedAt:new Date().toISOString(),args:{expectedRevision:raw.revision,operations}};
          pendingStorage?.setItem(closeRequestKey,JSON.stringify(envelope));
          try{raw=await request(scope,'mutate',envelope.args,{id:envelope.id,issuedAt:envelope.issuedAt});}
          catch(error){if(/Content tabs changed/.test(error.message))pendingStorage?.removeItem(closeRequestKey);throw error;}
        }
        const remaining=JSON.parse(pendingStorage?.getItem(closeKey)||'[]').filter(tabId=>!closes.includes(tabId));
        if(remaining.length){pendingStorage?.setItem(closeKey,JSON.stringify(remaining));record.again=true;}else pendingStorage?.removeItem(closeKey);
        pendingStorage?.removeItem(closeRequestKey);
        local=local.filter(tab=>!closes.includes(tab.id));
        // Confirmed explicit closes may accompany a replacement in the same
        // position. They must not make that complete local order look partial.
        if(record.baseline)record.baseline=record.baseline.filter(tab=>!closes.includes(tab.id));
      }
      if(records.get(id)!==record)return;
      if(raw.revision<record.revision)throw Error('The owner returned an older tab revision. Retry synchronization.');
      const known=new Set([...(record.baseline||[]).map(tab=>tab.id),...(record.ownerObserved||[])]),present=new Set(raw.tabs.map(tab=>tab.id));
      const removedIds=[...new Set([...known,...local.filter(tab=>Object.hasOwn(raw.closed||{},tab.id)).map(tab=>tab.id)])].filter(tabId=>!present.has(tabId));
      if(removedIds.length){
        if(pendingStorage&&(record.pending?.some(op=>removedIds.includes(op.tabId))||local.some(tab=>removedIds.includes(tab.id)&&tab.navigationPending)))pendingStorage.setItem('proteus.navigation.recovery:'+id,JSON.stringify({reason:'Owner closed or moved a tab with pending navigation',resolvedAt:new Date(now()).toISOString(),pending:record.pending||[],local:local.filter(tab=>removedIds.includes(tab.id))}));
        await apply(scope,raw.tabs,local,{membershipOnly:true,removedIds});
      }
      let remote=await hydrate(scope,raw);
      if(records.get(id)!==record)return;
      if(record.conflict){
        // Navigation review quarantines that intent, not the shared container.
        // Continue adopting canonical membership, order and unaffected metadata.
        const quarantined=new Set((record.pending||[]).map(op=>op.tabId||op.tab?.id).filter(Boolean));
        const membershipKey='proteus.navigation.membership:'+id;
        let envelope=JSON.parse(pendingStorage?.getItem(membershipKey)||'null');
        const observed=local.filter(tab=>!record.localAliases?.has(tab.id));
        const changes=viewChanges(record.baseline||remote.tabs,observed,changesAfterOwnerUpdates(record.baseline||remote.tabs,observed,remote.tabs,navigation))
          .filter(op=>!op.action.startsWith('browser-')&&(op.action!=='open'||!quarantined.has(op.tab.id)))
          .map(op=>op.action==='open'&&!remote.tabs.some(tab=>tab.id===op.tab.id)?{...op,tab:local.find(tab=>tab.id===op.tab.id)||op.tab}:op)
          .filter(op=>op.action!=='open'||!Object.hasOwn(remote.closed||{},op.tab.id));
        const operations=rebaseTabChanges(envelope?.args.operations||changes,remote.tabs).slice(0,100);
        if(operations.length){
          // Separate durable envelope: an unrelated membership action must not
          // rewrite or replay the quarantined navigation's receipt identity.
          envelope??={id:crypto.randomUUID(),issuedAt:new Date().toISOString(),args:{historyLimit:200,expectedRevision:remote.revision,operations}};
          pendingStorage?.setItem(membershipKey,JSON.stringify(envelope));
          try{remote=await hydrate(scope,await request(scope,'mutate',envelope.args,{id:envelope.id,issuedAt:envelope.issuedAt}));}
          catch(error){if(/Content tabs changed/.test(error.message))pendingStorage?.removeItem(membershipKey);throw error;}
          await acknowledge(scope,remote.tabs);
        }
        pendingStorage?.removeItem(membershipKey);
        if(!operations.length&&remote.revision===record.revision)return;
        const protectedIds=new Set((record.pending||[]).filter(op=>op.action.startsWith('browser-')).map(op=>op.tabId));
        const safe=remote.tabs.map(tab=>{const pending=local.find(value=>value.id===tab.id);return protectedIds.has(tab.id)&&pending?.type==='browser'?{...tab,url:pending.url,history:pending.history,navigationPending:pending.navigationPending}:tab;});
        await apply(scope,safe,local,{preservedNavigationIds:[...protectedIds],removedIds});
        record.baseline=structuredClone(remote.tabs);record.revision=remote.revision;return;
      }
      // Older owners may never have registered these saved local chat aliases.
      // Preserve them without publishing a reopening or treating absence as close.
      // Once the owner exposes an identity, ordinary synchronization owns it.
      const observedKey='proteus.navigation.observed:'+id;
      if(!record.ownerObserved){
        const encoded=pendingStorage?.getItem(observedKey),saved=encoded?JSON.parse(encoded):[];
        if(!Array.isArray(saved)||saved.length>2000||saved.some(item=>typeof item!=='string'||item.length>256))throw Error('Saved owner tab observations could not be read. Local views were preserved.');
        record.ownerObserved=new Set(saved);
      }
      if(record.baseline===null&&!record.localAliases)record.localAliases=new Set(local.filter(tab=>!tab.navigationPending&&remote.revision>0&&!Object.hasOwn(remote.closed||{},tab.id)&&!record.ownerObserved.has(tab.id)&&!remote.tabs.some(item=>item.id===tab.id)&&preserveUntracked(scope,tab)).map(tab=>tab.id));
      const rememberOwner=()=>{
        for(const tab of remote.tabs){record.localAliases?.delete(tab.id);if(preserveUntracked(scope,tab))record.ownerObserved.add(tab.id);}
        // Remember participation across renderer restarts, including a close made
        // while offline. Only identities still present locally or remotely matter.
        const liveIds=new Set([...local,...remote.tabs].map(tab=>tab.id));
        record.ownerObserved=new Set([...record.ownerObserved].filter(id=>liveIds.has(id)));
        if(record.ownerObserved.size)pendingStorage?.setItem(observedKey,JSON.stringify([...record.ownerObserved]));else pendingStorage?.removeItem(observedKey);
      };
      rememberOwner();
      for(const tab of local)if(tab.navigationPending)record.localAliases?.delete(tab.id);
      local=local.filter(tab=>!record.localAliases?.has(tab.id));
      // An existing revision is authoritative at first connection. A brand-new scope
      // can adopt locally opened descriptors without resurrecting remotely closed tabs.
      const storageKey='proteus.navigation.pending:'+id;
      const requestKey='proteus.navigation.request:'+id;
      if(!record.pending&&pendingStorage)try{record.pending=JSON.parse(pendingStorage.getItem(storageKey)||'null');}catch{}
      if(explicitCloseOnly&&record.pending?.some(op=>op.action==='close'))throw Object.assign(Error('A retained legacy Close needs navigation review. Its original receipt was preserved.'),{code:'NAVIGATION_CONFLICT'});
      const initial=remote.revision===0?tabChanges([],local,{navigation,seed:true}):tabChanges(remote.tabs,[...remote.tabs.map(tab=>local.find(item=>item.id===tab.id&&item.navigationPending)||tab),...local.filter(tab=>tab.navigationPending&&!remote.tabs.some(item=>item.id===tab.id))],{navigation});
      const retrying=!!record.pending;
      const operations=record.pending||viewChanges(record.baseline||[],local,record.baseline===null?initial:changesAfterOwnerUpdates(record.baseline,local,remote.tabs,navigation));
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
          let args={historyLimit:200,expectedRevision:remote.revision,operations:changes},signature=JSON.stringify(args);
          if(!record.request&&pendingStorage)try{record.request=JSON.parse(pendingStorage.getItem(requestKey)||'null');}catch{}
          // Upgrading the response-window preference must not change an
          // uncertain older request's bytes, timestamp or durable receipt ID.
          if(record.request?.signature)try{const prior=JSON.parse(record.request.signature);if(JSON.stringify({expectedRevision:prior.expectedRevision,operations:prior.operations})===JSON.stringify({expectedRevision:args.expectedRevision,operations:args.operations})){args=prior;signature=record.request.signature;}}catch{}
          if(record.request?.signature!==signature)record.request={signature,id:crypto.randomUUID(),issuedAt:new Date().toISOString()};
          if(pendingStorage)pendingStorage.setItem(requestKey,JSON.stringify(record.request));
          let converged=false;
          try{
            remote=await hydrate(scope,await request(scope,'mutate',args,{id:record.request.id,issuedAt:record.request.issuedAt}));
            wrote=true;
          }catch(error){
            // A peer may commit identical metadata after our GET. Read once to
            // prove that this intent is satisfied; never replay a stale write or
            // manufacture its receipt. Navigation/traversal batches still conflict.
            const redirect=changes[0];
            if(error.code!=='NAVIGATION_CONFLICT'||changes.length!==1||redirect.action!=='browser-redirect'||operations.filter(op=>op.action==='browser-redirect').length!==1)throw error;
            if(!operations.every(op=>op===redirect||op.action==='reorder'||(op.action==='open'&&op.tab.id===redirect.tabId&&op.tab.type==='browser')))throw error;
            let fresh;try{fresh=await hydrate(scope,await request(scope,'get',{historyLimit:200}));}catch{throw error;}
            const tab=fresh.tabs.find(tab=>tab.id===redirect.tabId);
            if(records.get(id)!==record||rebaseTabChanges(changes,fresh.tabs).length||operations.some(op=>op.action==='open'&&(op.tab.profileId||'default')!==(tab?.profileId||'default')))throw error;
            remote=fresh;converged=true;
          }
          // A following metadata batch may race another desktop's navigation.
          // Settle this exact native branch while its own receipt is available;
          // the later response may already select a different committed entry.
          if(changes.some(op=>op.action.startsWith('browser-'))&&records.get(id)===record)await acknowledge(scope,remote.tabs);
          record.request=null;pendingStorage?.removeItem(requestKey);
          return converged;
        };
        const submit=async changes=>{
          let remaining=[...changes],metadata=[];
          const flush=async()=>{while(metadata.length)await send(metadata.splice(0,100));};
          while(remaining.length){
            const op=remaining.shift();
            if(op.action.startsWith('browser-')){
              await flush();
              if(await send([op]))remaining=rebaseTabChanges(remaining,remote.tabs);
            }else metadata.push(op);
          }
          await flush();
        };
        try{await submit(rebased);}
        catch(error){if(!/Content tabs changed/.test(error.message))throw error;remote=await hydrate(scope,await request(scope,'get',{historyLimit:200}));if(records.get(id)!==record)return;rebased=rebaseTabChanges(operations,remote.tabs);await submit(rebased);}
        record.pending=null;record.request=null;pendingStorage?.removeItem(storageKey);pendingStorage?.removeItem(requestKey);
      }
      // apply receives the captured snapshot, so it preserves additions made during I/O.
      if(records.get(id)!==record)return;
      rememberOwner(); // Mutation acknowledgements also prove owner participation.
      await apply(scope,remote.tabs,captured,{preservedIds:[...(record.localAliases||[])]});record.pendingSnapshot=null;
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
    }).finally(async()=>{record.busy=null;if(record.again&&records.get(id)===record){record.again=false;await sync(scope);}});
    return record.busy;
  }
  async function resolve(scope,{preserve}={}){
    const id=key(scope),record=records.get(id);if(!record?.conflict)return;
    if(record.busy)await record.busy;
    const local=await readLocal(scope),remote=await hydrate(scope,await request(scope,'get',{historyLimit:200}));
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
    await apply(scope,remote.tabs,local,{discardPendingNavigation:true,preservedIds:[...(record.localAliases||[])]});
    if(records.get(id)!==record)return;
    record.pending=null;record.conflict=false;record.again=false;record.retry=null;record.baseline=structuredClone(remote.tabs);record.revision=remote.revision;
    record.request=null;pendingStorage?.removeItem('proteus.navigation.pending:'+id);pendingStorage?.removeItem('proteus.navigation.request:'+id);
  }
  function close(scope,tabId){
    const storageKey='proteus.navigation.closes:'+key(scope);
    const ids=JSON.parse(pendingStorage?.getItem(storageKey)||'[]');
    if(!ids.includes(tabId))ids.push(tabId);
    if(ids.length>1000)throw Error('Too many queued tab closes. Reconnect before closing more tabs.');
    pendingStorage?.setItem(storageKey,JSON.stringify(ids));
    // In-memory storage also supports callers without a persistent adapter.
    if(!pendingStorage)throw Error('Closing shared tabs requires durable intent storage.');
  }
  async function reopen(scope,tab){
    // An immediate Undo may race its own queued Close. Settle that intent first;
    // a later reopen must refer to the resulting owner closing revision.
    const closeKey='proteus.navigation.closes:'+key(scope);
    if(JSON.parse(pendingStorage?.getItem(closeKey)||'[]').includes(tab.id))await sync(scope);
    const remote=await request(scope,'get',{historyLimit:200}),closedRevision=Object.hasOwn(remote.closed||{},tab.id)?remote.closed[tab.id]:null;
    if(!closedRevision)return false;
    await request(scope,'mutate',{expectedRevision:remote.revision,operations:[{action:'reopen',closedRevision,tab}]},{id:crypto.randomUUID(),issuedAt:new Date().toISOString()});
    await sync(scope);return true;
  }
  function forgetKey(id){records.delete(id);for(const cacheKey of navigationCache.keys())if(cacheKey.startsWith(id+':'))navigationCache.delete(cacheKey);}
  return {sync,checkpoint,resolve,close,reopen,hasConflict:scope=>records.get(key(scope))?.conflict===true,forget(scope){forgetKey(key(scope));},forgetHost(hostId){backoff.delete(hostId);for(const id of records.keys())if(JSON.parse(id)[0]===hostId)forgetKey(id);},async all(){const groups=new Map();for(const scope of scopes()){const owner=hostKey(scope);if(!groups.has(owner))groups.set(owner,[]);groups.get(owner).push(scope);}await Promise.all([...groups.values()].map(async group=>{for(const scope of group)await sync(scope);}));}};
}
