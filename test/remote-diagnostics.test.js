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
