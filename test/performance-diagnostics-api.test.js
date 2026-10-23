import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {startServer} from '../src/server.js';

test('performance diagnostics require local authentication and retain no application payloads',async()=>{
 const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-performance-api-'));let app;
 try {
  fs.writeFileSync(path.join(home,'settings.json'),JSON.stringify({schemaVersion:1,provider:'rehearsal',model:'',timezone:'UTC',workspace:{cwd:home,additionalDirectories:[]},skillDirectories:[],mcpServers:{}}));
  app=await startServer({home,port:0,timers:false});
  const endpoint=app.origin+'/api/performance/diagnostics';
  assert.equal((await fetch(endpoint)).status,401);
  const headers={Authorization:'Bearer '+app.token};
  await fetch(app.origin+'/api/state?summaries=1',{headers});
  const secret='PRIVATE_SYNTHETIC_DIAGNOSTIC_PAYLOAD';
  const failure=new Error(secret);
  assert.throws(()=>app.performanceDiagnostics.measureSync('context.get',()=>{throw failure;}),e=>e===failure);
  app.performanceDiagnostics.measureSync(secret,()=>secret);
  await app.engine.tick();
  const response=await fetch(endpoint,{headers});assert.equal(response.status,200);
  const result=await response.json(),encoded=JSON.stringify(result);
  assert.ok(result.scheduler);assert.ok(encoded.includes('context.get'));
  for(const value of [secret,home,app.token])assert.equal(encoded.includes(value),false);
  assert.ok(encoded.length<256000);
 } finally {await app?.close();fs.rmSync(home,{recursive:true,force:true});}
});
