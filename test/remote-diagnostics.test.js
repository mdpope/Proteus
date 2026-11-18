import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {startServer} from '../src/server.js';

test('remote journal diagnostics are authenticated and contain only bounded counters',async()=>{
  const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-journal-diagnostics-'));
  let app;
  try{
    fs.writeFileSync(path.join(home,'settings.json'),JSON.stringify({schemaVersion:1,provider:'rehearsal',model:'',timezone:'UTC',workspace:{cwd:home,additionalDirectories:[]},skillDirectories:[],mcpServers:{}}));
    app=await startServer({home,port:0,timers:false});
    const url=app.origin+'/api/remote/diagnostics';assert.equal((await fetch(url)).status,401);
    const device={id:'synthetic-diagnostics'};app.remote.config.devices.push(device);
    const message={id:randomUUID(),issuedAt:new Date().toISOString(),method:'tabs.mutate',args:{scope:'team',id:'team',expectedRevision:0,operations:[{action:'open',tab:{id:'synthetic-browser',type:'browser',title:'PRIVATE_SYNTHETIC_PAYLOAD',url:'https://example.com/private-synthetic'}}]}};
    await app.remote.command({device},message);await app.remote.command({device},message);
    const response=await fetch(url,{headers:{Authorization:'Bearer '+app.token}});assert.equal(response.status,200);
    const data=await response.json(),encoded=JSON.stringify(data);
    assert.equal(data.records,1);assert.equal(data.pending,0);assert.equal(data.methods['tabs.mutate'],2);
    assert.ok(data.bytes>0);assert.ok(data.storageBytes>0);assert.equal(data.worker,'ready');
    for(const secret of [message.id,device.id,'PRIVATE_SYNTHETIC_PAYLOAD','private-synthetic',home])assert.equal(encoded.includes(secret),false);
  }finally{await app?.close();fs.rmSync(home,{recursive:true,force:true});}
});

test('tab mutation receipts retain a bounded exact reply while full navigation remains pageable',async()=>{
 const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-bounded-mutation-'));let app;
 try{
  app=await startServer({home,port:0,timers:false});
  const device={id:'bounded-client'};app.remote.config.devices.push(device);
  const entries=Array.from({length:1200},(_,i)=>({url:'https://example.test/'+i,title:'Page '+i}));
  app.contentTabs.mutate({scope:'team',id:'team',expectedRevision:0,operations:[{action:'open',tab:{id:'long-history',type:'browser',url:entries.at(-1).url,history:{entries,index:1199}}}]});
  const message={id:randomUUID(),issuedAt:new Date().toISOString(),method:'tabs.mutate',args:{scope:'team',id:'team',expectedRevision:1,operations:[{action:'visibility',id:'long-history',hidden:true}]}};
  const first=await app.remote.command({device},message);
  assert.ok(first.tabs[0].history.entries.length<=32);assert.equal(first.tabs[0].url,entries.at(-1).url);
  assert.equal((await app.contentTabs.history({scope:'team',id:'team',tabId:'long-history',start:true,limit:100})).total,1200);
  await app.contentTabs.mutateAsync({scope:'team',id:'team',expectedRevision:first.revision,operations:[{action:'visibility',id:'long-history',hidden:false}]});
  assert.deepEqual(await app.remote.command({device},message),first,'retry returns original revision and result, without repeating mutation');
  assert.equal(!!app.contentTabs.get('team','team').tabs[0].hidden,false);
 }finally{await app?.close();fs.rmSync(home,{recursive:true,force:true});}
});
