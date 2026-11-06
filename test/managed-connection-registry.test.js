import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import {ManagedConnectionRegistry,validateManagedConnection} from '../src/services/integrations/managed-connection-registry.js';

const definition=()=>({id:'connection-1',name:'example-work-tracking',label:'Work tracking',enabled:true,ownerId:'owner-1',workspaceIds:['workspace-1'],transport:{type:'http',endpoint:'https://example.test/mcp'},authentication:{adapter:'oauth',credentialRef:'opaque-1',credentialOwnerId:'owner-1'},expected:{principal:'subject-1',tenant:'tenant-1',resource:'site-1',audience:'https://example.test',scopes:['read']},capabilities:['work-items.read'],probes:[{id:'issue-read',capability:'work-items.read'}],policy:{healthIntervalMs:900000,preflightLeadMs:300000,requestTimeoutMs:30000,maxReadRetries:1}});
function setup(t,references=()=>[]){
 const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-managed-registry-'));
 t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
 return new ManagedConnectionRegistry(home,{ownerId:'owner-1',references});
}
test('connection capture refuses cross-owner/workspace use and stale account retargeting',t=>{
 const registry=setup(t),start=registry.read();registry.save(definition(),{expectedRevision:start.revision});
 const [binding]=registry.capture({ownerId:'owner-1',workspaceId:'workspace-1',names:['example-work-tracking']});
 assert.equal(registry.resolve(binding).expected.principal,'subject-1');
 assert.throws(()=>registry.capture({ownerId:'owner-2',workspaceId:'workspace-1',names:[binding.name]}));
 assert.throws(()=>registry.capture({ownerId:'owner-1',workspaceId:'workspace-2',names:[binding.name]}));
 assert.throws(()=>registry.resolve({...binding,ownerId:'owner-2'}));
 const changed=definition();changed.expected.principal='subject-2';registry.save(changed,{expectedRevision:registry.read().revision});
 assert.throws(()=>registry.resolve(binding),/changed/);
 assert.throws(()=>registry.save(definition(),{expectedRevision:start.revision}),/changed/);
});
test('dependent references protect names and removal; disable preserves configuration and credentials',t=>{
 const registry=setup(t,()=>['schedule-1']);registry.save(definition(),{expectedRevision:registry.read().revision});
 const renamed={...definition(),name:'new-name'};
 assert.throws(()=>registry.save(renamed,{expectedRevision:registry.read().revision}),/dependent/);
 assert.throws(()=>registry.remove('connection-1',{expectedRevision:registry.read().revision}),/referenced/);
 registry.save({...definition(),enabled:false},{expectedRevision:registry.read().revision});
 assert.equal(registry.read().connections[0].authentication.credentialRef,'opaque-1');
 assert.throws(()=>registry.capture({ownerId:'owner-1',workspaceId:'workspace-1',names:['example-work-tracking']}),/unavailable/);
});
test('definitions reject secret-bearing launch fields, unpinned packages and cross-owner credential rotation',()=>{
 const bad=[
  {...definition(),transport:{type:'http',endpoint:'https://user:secret@example.test/mcp'}},
  {...definition(),transport:{type:'http',endpoint:'https://example.test/mcp?token=secret'}},
  {...definition(),transport:{type:'http',endpoint:'https://example.test/mcp',headers:{Authorization:'secret'}}},
  {...definition(),transport:{type:'stdio',package:'example',version:'latest',integrity:'bad'}},
  {...definition(),authentication:{adapter:'oauth',credentialRef:'opaque-1',credentialOwnerId:'owner-2'}},
  {...definition(),authentication:{...definition().authentication,refreshToken:'secret'}},
  {...definition(),policy:{...definition().policy,maxReadRetries:10}},
 ];
 for(const candidate of bad)assert.throws(()=>validateManagedConnection(candidate));
 assert.equal(validateManagedConnection(definition()).transport.endpoint,'https://example.test/mcp');
});
test('removal is revision guarded and captured bindings cannot silently follow reused names',t=>{
 const registry=setup(t);registry.save(definition(),{expectedRevision:registry.read().revision});
 const [binding]=registry.capture({ownerId:'owner-1',workspaceId:'workspace-1',names:[definition().name]});
 registry.remove('connection-1',{expectedRevision:registry.read().revision});
 registry.save({...definition(),id:'different-connection'},{expectedRevision:registry.read().revision});
 assert.throws(()=>registry.resolve(binding),/changed/);
 assert.equal(registry.read().connections.length,1);
});
