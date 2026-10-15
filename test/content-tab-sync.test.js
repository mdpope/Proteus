import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {ContentTabs,contentTab} from '../src/content-tabs.js';
import {normalizeContentTabDescriptor,normalizeContentTabHistory,sameContentTab} from '../public/content-tab-descriptor.js';
import {createTabSynchronizer,rebaseTabChanges,tabChanges,syncableTabURL} from '../public/content-tab-sync.js';
const pendingCount=values=>[...values.keys()].filter(key=>key.startsWith('proteus.navigation.pending:')).length;
const tab=id=>({id,type:'browser',title:id,url:'https://example.test/'+id});
test('tab deltas carry close, rename/navigation and order with concurrent additions preserved',()=>{const operations=tabChanges([tab('a'),tab('b')],[{...tab('b'),title:'Renamed'},tab('c')]);assert.deepEqual(operations.map(op=>op.action),['close','open','open','reorder']);const rebased=rebaseTabChanges(operations,[tab('a'),tab('b'),tab('remote')]);assert.deepEqual(rebased.at(-1).ids,['b','c','remote']);});
test('initial host descriptors win; local edits and concurrent remote opens reconcile after revision conflict',async()=>{const scope={scope:'chat',id:'fixture'};let local=[tab('old')],remote={revision:1,tabs:[tab('a')]},first=true;const errors=[];const sync=createTabSynchronizer({scopes:()=>[scope],readLocal:async()=>local,apply:async(_scope,tabs)=>{local=tabs;},request:async(_scope,action,args)=>{if(action==='get')return structuredClone(remote);if(first){first=false;remote={revision:2,tabs:[...remote.tabs,tab('remote')]};throw new Error('Content tabs changed. Refresh before retrying this action.');}assert.equal(args.expectedRevision,2);for(const op of args.operations){if(op.action==='open'){remote.tabs=remote.tabs.filter(t=>t.id!==op.tab.id);remote.tabs.push(op.tab);}if(op.action==='close')remote.tabs=remote.tabs.filter(t=>t.id!==op.id);if(op.action==='reorder')remote.tabs=op.ids.map(id=>remote.tabs.find(t=>t.id===id));}remote.revision++;return structuredClone(remote);},onError:error=>errors.push(error)});await sync.all();assert.deepEqual(local,[tab('a')]);local=[{...tab('a'),title:'User rename'},tab('local')];await sync.all();assert.deepEqual(local.map(t=>t.id),['a','local','remote']);assert.equal(local[0].title,'User rename');assert.deepEqual(errors,[]);});
test('failed offline mutation keeps local additions for reconnect',async()=>{const scope={scope:'team',id:'team'};let local=[],offline=false,remote={revision:0,tabs:[]};const sync=createTabSynchronizer({scopes:()=>[scope],readLocal:async()=>local,apply:async(_scope,tabs)=>local=tabs,request:async(_scope,action,args)=>{if(offline)throw new Error('offline');if(action==='get')return remote;remote={revision:1,tabs:args.operations.filter(op=>op.action==='open').map(op=>op.tab)};return remote;}});await sync.all();local=[tab('new')];offline=true;await sync.all();assert.equal(local.length,1);offline=false;await sync.all();assert.equal(remote.tabs[0].id,'new');});

test('full redirect addresses retain login paths, queries and fragments while refusing URL userinfo',()=>{for(const url of ['https://example.test/login','https://example.test/page?code=synthetic','https://example.test/page#access_token=synthetic'])assert.equal(syncableTabURL(url),url);assert.equal(syncableTabURL('https://user:password@example.test/'),null);assert.equal(syncableTabURL('file:///tmp/local'),null);});

test('closing a chat forgets local baseline so reopening restores saved children without deletes',async()=>{const scope={scope:'chat',id:'fixture'};let local=[],mutations=0;const tabs=[tab('a'),tab('b')];const sync=createTabSynchronizer({scopes:()=>[scope],readLocal:async()=>local,apply:async(_scope,value)=>local=value,request:async(_scope,action)=>{if(action!=='get')mutations++;return {revision:3,tabs};}});await sync.all();assert.equal(local.length,2);sync.forget(scope);local=[];await sync.all();assert.deepEqual(local,tabs);assert.equal(mutations,0);});

function hostStore(t){const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-tab-sync-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));return new ContentTabs(home);}
test('repeated renderer roundtrips through the actual host omit unchanged mutations and writes',async t=>{
  let writes=0,mutations=0;const host=hostStore(t),write=host.write.bind(host);host.write=data=>{writes++;write(data);};
  const scope={scope:'chat',id:'roundtrip'};
  let local=[{url:'https://EXAMPLE.test',profileId:'default',title:'Page\u0000',type:'browser',id:'browser-a',history:{index:1,entries:[{url:'https://example.test/login',title:'Private'},{url:'https://example.test/',title:'Page',pageState:'private'}]}}];
  const errors=[];
  const sync=createTabSynchronizer({scopes:()=>[scope],readLocal:async()=>structuredClone(local),apply:async(_scope,tabs)=>{local=tabs.map(value=>({url:value.url,history:value.history,profileId:'default',title:value.title,type:value.type,id:value.id}));},request:async(_scope,action,args)=>{if(action==='get')return host.get(scope.scope,scope.id);mutations++;return host.mutate({...scope,...args});},onError:error=>errors.push(error)});
  for(let pass=0;pass<6;pass++)await sync.all();
  assert.equal(mutations,1);assert.equal(writes,1);assert.equal(host.get(scope.scope,scope.id).revision,1);assert.deepEqual(errors,[]);
  local[0].url='https://example.test/next';delete local[0].history;await sync.all();
  assert.equal(mutations,2);assert.equal(writes,2);assert.equal(host.get(scope.scope,scope.id).tabs[0].url,local[0].url);
  for(let pass=0;pass<3;pass++)await sync.all();assert.equal(mutations,2);
});

test('comparison matches host defaults and filtering while retaining every portable edit',()=>{
  const profile='11111111-1111-4111-8111-111111111111',documentId='a'.repeat(64);
  const examples=[{...tab('a'),profileId:'default',customTitle:'',title:'\u0000a',url:'https://EXAMPLE.test/a'},
    {id:'arbitrary',type:'document',title:'Notes',documentId,mediaType:'unknown',chatId:'invalid/id'},
    {id:'arbitrary',type:'chat',title:'Chat',chatId:'fixture'},
    {id:'arbitrary',type:'terminal',title:'Terminal',terminalId:'fixture'}];
  for(const value of examples)assert.deepEqual(normalizeContentTabDescriptor(value),contentTab(value));
  const before=contentTab({...tab('a'),history:{index:0,entries:[{url:tab('a').url,title:'A'}]}});
  for(const edit of [{title:'Renamed'},{customTitle:'Custom'},{profileId:profile},{url:'https://example.test/b'},{history:{index:0,entries:[{url:tab('a').url,title:'Changed'}]}}]){
    assert.equal(tabChanges([before],[{...before,...edit}]).filter(op=>op.action==='open').length,1);
  }
  assert.equal(sameContentTab(before,{...before,url:'https://example.test/login'}),false);
  assert.equal(tabChanges([examples[1]],[{...examples[1],mediaType:'text/html'}]).length,1);
});

test('shared canonical history retains the full portable list while desktop engine restoration keeps its legacy bounded window',()=>{
  const {normalizeHistory}=createRequire(import.meta.url)('../desktop/browser-history.cjs');
  const entries=Array.from({length:70},(_,index)=>({id:'entry-'+index,url:`https://example.test/${index}?q=${'x'.repeat(1600)}`,title:'🎉'.repeat(150),pageState:'private'}));
  entries[36]={id:'entry-36',url:'https://example.test/callback?token=private',title:'Private'};
  const history=normalizeContentTabHistory({entries,index:30,currentEntryId:'entry-30',revision:7});
  assert.equal(history.entries.length,70);assert.equal(history.currentEntryId,'entry-30');assert.equal(history.entries[history.index].id,'entry-30');assert.equal(history.revision,7);assert.ok(new TextEncoder().encode(JSON.stringify(history)).length<=512*1024);assert.doesNotMatch(JSON.stringify(history),/pageState/);
  const engine=normalizeHistory({entries,index:30});assert.ok(engine.entries.length<=50);assert.ok(new TextEncoder().encode(JSON.stringify(engine)).length<=32768);assert.doesNotMatch(JSON.stringify(engine),/pageState/);
  assert.equal(normalizeContentTabHistory({entries,index:36}).entries[36].url,entries[36].url);
});

test('already applied local changes and a conflict resolved by the other client need no retry mutation',async t=>{
  const host=hostStore(t),scope={scope:'chat',id:'conflict'};let local=[tab('a')],mutations=0,conflict=true;
  host.mutate({...scope,expectedRevision:0,operations:[{action:'open',tab:tab('a')}]});
  const sync=createTabSynchronizer({scopes:()=>[scope],readLocal:async()=>structuredClone(local),apply:async(_scope,tabs)=>local=tabs,request:async(_scope,action,args)=>{
    if(action==='get')return host.get(scope.scope,scope.id);mutations++;
    if(conflict){conflict=false;host.mutate({...scope,expectedRevision:args.expectedRevision,operations:args.operations});}
    return host.mutate({...scope,...args});
  }});
  await sync.all();local[0].title='Shared edit';await sync.all();assert.equal(mutations,1);assert.equal(local[0].title,'Shared edit');assert.equal(host.get(scope.scope,scope.id).revision,2);
  local[0].title='Same remote edit';host.mutate({...scope,expectedRevision:2,operations:[{action:'open',tab:local[0]}]});await sync.all();assert.equal(mutations,1);
});

test('no-op rebase preserves remote closes, concurrent additions and meaningful ordering',()=>{
  assert.deepEqual(rebaseTabChanges([{action:'open',tab:{...tab('a'),profileId:'default'}},{action:'close',id:'gone'},{action:'reorder',ids:['a','b']}],[tab('a'),tab('b')]),[]);
  const ops=tabChanges([tab('a'),tab('b')],[tab('b'),tab('a')]);
  assert.deepEqual(rebaseTabChanges(ops,[tab('a'),tab('remote')]),[]);
  assert.deepEqual(rebaseTabChanges(ops,[tab('a'),tab('b'),tab('remote')]),[{action:'reorder',ids:['b','a','remote']}]);
});

test('host no-op comparison preserves an existing file with alternate descriptor key order and defaults',t=>{
  const host=hostStore(t),saved={schemaVersion:1,scopes:{'chat:saved':{revision:4,extension:'retained',tabs:[{url:'https://example.test/a',title:'a',profileId:'default',type:'browser',id:'a'}]}}};
  fs.writeFileSync(host.file,JSON.stringify(saved));const before=fs.readFileSync(host.file,'utf8');
  let changes=0;host.onChange=()=>changes++;
  const result=host.mutate({scope:'chat',id:'saved',expectedRevision:4,operations:[{action:'open',tab:tab('a')}]});
  assert.equal(result.revision,4);assert.equal(changes,0);assert.equal(fs.readFileSync(host.file,'utf8'),before);
});

test('a remotely closed normalized tab stays closed and additions during I/O remain for the next pass',async t=>{
  const host=hostStore(t),scope={scope:'chat',id:'inflight'};let local=[tab('a')],duringGet=false,mutations=0;
  host.mutate({...scope,expectedRevision:0,operations:[{action:'open',tab:tab('a')}]});
  const sync=createTabSynchronizer({scopes:()=>[scope],readLocal:async()=>structuredClone(local),apply:async(_scope,tabs,captured)=>{const additions=local.filter(value=>!captured.some(old=>old.id===value.id));local=[...tabs.map(value=>({...value,profileId:'default'})),...additions];},request:async(_scope,action,args)=>{
    if(action==='get'){if(duringGet){duringGet=false;local.push(tab('late'));}return host.get(scope.scope,scope.id);}
    mutations++;return host.mutate({...scope,...args});
  }});
  await sync.all();host.mutate({...scope,expectedRevision:1,operations:[{action:'close',id:'a'}]});duringGet=true;await sync.all();assert.deepEqual(local.map(value=>value.id),['late']);assert.equal(mutations,0);
  await sync.all();assert.deepEqual(host.get(scope.scope,scope.id).tabs.map(value=>value.id),['late']);assert.equal(mutations,1);
});

test('a previously synchronized blank tab records its first URL through navigation instead of metadata seeding',()=>{
 const before={id:'new-tab',type:'browser',title:'New tab',url:''},entry={id:'first-entry',url:'https://example.test/first',title:'First'};
 const changes=tabChanges([before],[{...before,url:entry.url,title:entry.title,history:{index:0,currentEntryId:entry.id,entries:[entry]}}],{navigation:true});
 assert.equal(changes[0].action,'browser-navigate');assert.equal(changes[0].baseRevision,0);assert.notEqual(changes[0].operationId,entry.id);assert.equal(changes[0].url,entry.url);
 assert.equal(changes.find(op=>op.action==='open').tab.url,'');
});

test('navigation conflicts retain durable operations, stop automatic retries and require explicit resolution',async()=>{
 const scope={scope:'chat',id:'conflict-navigation'},entry=(id,url)=>({id,url,title:id}),a=entry('a','https://example.test/a'),b=entry('b','https://example.test/b');
 const original={id:'browser',type:'browser',title:'a',url:a.url,history:{entries:[a],index:0,currentEntryId:'a',revision:1}};
 let local=[structuredClone(original)],remote={revision:2,tabs:[structuredClone(original)]},submits=0,applications=0,preserved;
 const values=new Map(),storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
 const sync=createTabSynchronizer({navigation:true,pendingStorage:storage,scopes:()=>[scope],readLocal:async()=>structuredClone(local),apply:async(_scope,tabs,_captured,options)=>{applications++;if(options?.discardPendingNavigation)assert.equal(options.discardPendingNavigation,true);local=structuredClone(tabs);},request:async(_scope,action)=>{if(action==='get')return structuredClone(remote);submits++;const error=Error('Navigation changed on the owning computer. Preserve this pending action and refresh.');error.code='NAVIGATION_CONFLICT';throw error;}});
 await sync.all();local=[{...original,url:b.url,title:'b',navigationPending:true,history:{entries:[a,b],index:1,currentEntryId:'b',revision:1}}];await sync.all();assert.equal(submits,1);assert.equal(pendingCount(values),1);assert.equal(local[0].url,b.url);for(let i=0;i<3;i++)await sync.all();assert.equal(submits,1);
 remote={revision:3,tabs:[{...original,title:'Owner won'}]};await sync.resolve(scope,{preserve:async tabs=>preserved=tabs});assert.equal(preserved[0].url,b.url);assert.equal(local[0].title,'Owner won');assert.equal(values.size,0);assert.equal(applications,2);await sync.all();assert.equal(submits,1);
});

test('a navigation receipt retry keeps the original operation ID and timestamp across a restarted synchronizer',async()=>{
 const scope={scope:'chat',id:'receipt-retry'},a={id:'a',url:'https://example.test/a',title:'A'},b={id:'b',url:'https://example.test/b',title:'B'},original={id:'browser',type:'browser',title:'A',url:a.url,history:{entries:[a],index:0,currentEntryId:'a',revision:1}};
 const values=new Map(),storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
 let local=[structuredClone(original)],remote={revision:1,tabs:[structuredClone(original)]},first=true,attempts=[];
 const options={navigation:true,pendingStorage:storage,scopes:()=>[scope],readLocal:async()=>structuredClone(local),apply:async(_scope,tabs)=>local=structuredClone(tabs),request:async(_scope,action,args)=>{if(action==='get')return structuredClone(remote);const operation=args.operations.find(op=>op.action==='browser-navigate');if(operation){attempts.push(structuredClone(operation));if(first){first=false;throw Error('transport closed after committed operation');}}remote={revision:2,tabs:structuredClone(local)};return structuredClone(remote);}};
 const sync=createTabSynchronizer(options);await sync.all();local=[{...original,url:b.url,title:'B',history:{entries:[a,b],index:1,currentEntryId:'b',revision:1}}];await sync.all();assert.equal(pendingCount(values),1);
 const resumed=createTabSynchronizer(options);await resumed.all();assert.equal(values.size,0);assert.equal(attempts.length,2);assert.deepEqual(attempts[0],attempts[1]);
});

test('full signed redirect URLs are retained in descriptors and navigation without unsafe schemes or URL userinfo',t=>{
 const {safeHistoryURL}=createRequire(import.meta.url)('../desktop/browser-history.cjs'),host=hostStore(t);
 const keys=['code','state','cookie','signedCookie','X-Amz-Signature','X-Goog-Credential','Key-Pair-Id'];let revision=0;
 for(const key of keys)for(const address of [`https://example.test/login?${key}=fixture`,`https://example.test/callback#${key}=fixture`]){
   assert.equal(safeHistoryURL(address),address);assert.equal(syncableTabURL(address),address);
   revision=host.mutate({scope:'main',id:'main',expectedRevision:revision,operations:[{action:'open',tab:{...tab('signed'),url:address}}]}).revision;
 }
 const expanded='https://example.test/'+ '🎉'.repeat(1000);assert.equal(safeHistoryURL(expanded),null);assert.equal(syncableTabURL(expanded),null);
 assert.equal(safeHistoryURL('https://user:password@example.test/'),null);
});

test('paged navigation hydrates complete history before applying and caches the exact revision',async()=>{
 const scope={scope:'chat',id:'paged'},entries=Array.from({length:5},(_,i)=>({id:'entry-'+i,url:'https://example.test/'+i,title:String(i)}));let calls=0,applied=[];
 const partial={id:'browser',type:'browser',title:'2',url:entries[2].url,history:{entries:entries.slice(2,4),index:0,currentEntryId:'entry-2',revision:9,offset:2,total:5,hasMore:true,nextCursor:'partial'}};
 const sync=createTabSynchronizer({navigation:true,scopes:()=>[scope],readLocal:async()=>applied,apply:async(_scope,tabs)=>applied=tabs,request:async(_scope,action,args)=>{if(action==='get')return {revision:4,tabs:[partial]};assert.equal(action,'history');calls++;const offset=args.start?0:Number(args.cursor);return {revision:9,currentEntryId:'entry-2',offset,total:5,entries:entries.slice(offset,offset+2),hasMore:offset+2<5,nextCursor:offset+2<5?String(offset+2):null};}});
 await sync.all();assert.equal(calls,3);assert.equal(applied[0].history.entries.length,5);assert.equal(applied[0].history.index,2);await sync.all();assert.equal(calls,3);
});

test('a stale navigation page preserves the current local stack and never applies a partial list',async()=>{
 const scope={scope:'team',id:'team'},entry={id:'local',url:'https://example.test/local',title:'Local'},local=[{id:'browser',type:'browser',url:entry.url,title:'Local',history:{entries:[entry],index:0,currentEntryId:'local',revision:1}}];let applications=0,errors=[];
 const sync=createTabSynchronizer({navigation:true,scopes:()=>[scope],readLocal:async()=>structuredClone(local),apply:async()=>applications++,onError:error=>errors.push(error.message),request:async(_scope,action,args)=>action==='get'?{revision:3,tabs:[{id:'browser',type:'browser',url:entry.url,title:'Owner',history:{entries:[entry],index:0,currentEntryId:'local',revision:2,offset:200,total:201,hasMore:false}}]}:{revision:args.start?2:3,currentEntryId:'local',offset:args.start?0:1,total:201,entries:[entry],hasMore:true,nextCursor:'second'}});
 await sync.all();assert.equal(applications,0);assert.equal(local[0].history.entries.length,1);assert.match(errors[0],/changed while loading history/);
});

test('a selected entry title update uses redirect metadata without creating another visit',()=>{
 const entry={id:'current',url:'https://example.test/page',title:'Before'},before={id:'browser',type:'browser',url:entry.url,title:'Before',history:{entries:[entry],index:0,currentEntryId:'current',revision:3}},after={...before,title:'After',history:{...before.history,entries:[{...entry,title:'After'}]}};
 const operations=tabChanges([before],[after],{navigation:true});const redirect=operations.find(op=>op.action==='browser-redirect');assert.equal(redirect.entryId,'current');assert.equal(redirect.title,'After');assert.equal(redirect.baseRevision,3);assert.equal(operations.filter(op=>op.action==='browser-navigate'||op.action==='browser-traverse').length,0);assert.equal(redirect.visitedAt,undefined);
});

test('mutable renderer history cannot change the synchronized baseline or captured snapshot',async()=>{
 const scope={scope:'main',id:'main'},entry={id:'entry',url:'https://example.test/page',title:'Before'};
 let local=[],capturedTitle,mutations=[];const remote={revision:1,tabs:[{id:'browser',type:'browser',title:'Before',url:entry.url,history:{entries:[entry],index:0,currentEntryId:entry.id,revision:1}}]};
 const sync=createTabSynchronizer({navigation:true,scopes:()=>[scope],readLocal:async()=>local,apply:async(_scope,tabs,captured)=>{capturedTitle=captured[0]?.history.entries[0].title;local=tabs;},request:async(_scope,action,args)=>{if(action==='get')return structuredClone(remote);mutations.push(...args.operations);return structuredClone(remote);}});
 await sync.all();local[0].history.entries[0].title='After';await sync.all();
 assert.equal(mutations.find(op=>op.action==='browser-redirect')?.title,'After','History edits remain visible as changes against an immutable baseline');
 assert.equal(capturedTitle,'After');
});


test('navigation operation identities are independent of entries and moving seeded history does not publish it again',()=>{
 const entry={id:'stable-entry',url:'https://example.test/page',title:'Page'},browser={id:'stable-tab',type:'browser',url:entry.url,title:entry.title,history:{entries:[entry],index:0,currentEntryId:entry.id,revision:0}};
 const first=tabChanges([], [browser],{navigation:true}),second=tabChanges([], [browser],{navigation:true});
 const navigation=first.find(op=>op.action==='browser-navigate');assert.equal(navigation.entryId,entry.id);assert.notEqual(navigation.operationId,entry.id);assert.notEqual(navigation.operationId,second.find(op=>op.action==='browser-navigate').operationId);
 assert.deepEqual(rebaseTabChanges(first,[browser]),[],'The moved descriptor already contains its navigation, without recording another visit');
 assert.deepEqual(rebaseTabChanges([{...navigation,title:'Changed'}],[browser]),[{...navigation,title:'Changed'}],'Conflicting content is never silently acknowledged');
});

test('operation identity conflicts stop retry storms and preserve pending data until explicit resolution',async()=>{
 const scope={scope:'workspace',id:'identity-conflict'},entry={id:'a',url:'https://example.test/a',title:'A'},original={id:'browser',type:'browser',url:entry.url,title:entry.title,history:{entries:[entry],index:0,currentEntryId:entry.id,revision:1}};
 let local=[structuredClone(original)],submits=0,errors=0;const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 const sync=createTabSynchronizer({navigation:true,pendingStorage:storage,scopes:()=>[scope],readLocal:async()=>local,apply:async(_scope,tabs)=>local=structuredClone(tabs),onError:()=>errors++,request:async(_scope,action)=>{if(action==='get')return {revision:1,tabs:[original]};submits++;throw Object.assign(Error('Navigation operation ID was already used.'),{code:'NAVIGATION_OPERATION_CONFLICT'});}});
 await sync.all();local[0].history.entries.push({id:'b',url:'https://example.test/b',title:'B'});local[0].history.index=1;local[0].url='https://example.test/b';await sync.all();for(let i=0;i<5;i++)await sync.all();assert.equal(submits,1);assert.equal(errors,1);assert.equal(pendingCount(values),1);assert.equal(local[0].history.entries.length,2);
 await sync.resolve(scope);assert.equal(values.size,0);assert.equal(local[0].url,entry.url);await sync.all();assert.equal(submits,1);
});
