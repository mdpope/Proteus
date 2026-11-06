import test from 'node:test';
import assert from 'node:assert/strict';
import {ManagedAtlassian} from '../src/services/integrations/managed-atlassian.js';
import {atlassianOAuthProfile as p} from '../src/services/integrations/managed-atlassian-oauth.js';
function fixture(t,{locked=false,principal='fixture-person'}={}){
 const definition={id:'fixture',name:'fixture-atlassian',enabled:true,ownerId:'owner',authentication:{adapter:p.adapter,credentialRef:'opaque',credentialOwnerId:'owner'},transport:{type:'http',endpoint:p.endpoint},expected:{principal:'fixture-person',tenant:'fixture-site',resource:'https://fixture.atlassian.net',audience:p.endpoint,scopes:['read:jira-work']},capabilities:[],probes:[],policy:{requestTimeoutMs:1000}};
 const registry={ownerId:'owner',read:()=>({revision:'registry-revision',connections:[definition]})},rows=new Map(),writes=[],calls=[],opened=[];
 const vault={requireAvailable:()=>{if(locked)throw Error('locked');},read:async ref=>structuredClone(rows.get(ref)),write:async(ref,row)=>{writes.push(row.phase);rows.set(ref,structuredClone(row));}};
 let flow;
 const oauth={begin:async options=>{calls.push('begin');flow={...options,clientInformation:{client_id:'client',token_endpoint_auth_method:'none'},authorizationUrl:new URL('https://auth.atlassian.com/authorize')};return flow;},exchange:async()=>{calls.push('exchange');return {accessToken:'synthetic-access-secret',expiresAt:Date.now()+3600000,credential:{issuer:p.issuer,resource:p.endpoint,clientInformation:flow.clientInformation,refreshToken:'synthetic-refresh-secret',scopes:['read:jira-work']}};},prepare:()=>assert.fail('initial token should remain cached'),refresh:()=>assert.fail('initial token should remain cached')};
 const transport=options=>({connect:async definition=>{const length=await options.withToken(definition,token=>token.length);assert.equal(length,'synthetic-access-secret'.length);return {verify:async()=>{assert.equal(rows.get('opaque').phase,'unverified');return {principal,tenant:'fixture-site'};},close:async()=>{}};}});
 const manager=new ManagedAtlassian({registry,vault,oauth,transport,openExternal:async url=>opened.push(url)});t.after(()=>manager.close());
 const callback=(state=flow.state)=>new URL(flow.redirectUri+'?state='+encodeURIComponent(state)+'&code=synthetic-code');
 return {manager,rows,writes,calls,opened,definition,callback};
}
test('owner sign-in validates loopback state, persists before identity proof and caches the initial token',async t=>{
 const f=fixture(t);const status=await f.manager.signIn('fixture',{expectedRevision:'registry-revision'});assert.deepEqual(status,{connectionId:'fixture',state:'sign-in-in-progress'});assert.equal(f.opened.length,1);
 for(const state of ['0'.repeat(64),'é'.repeat(64)])assert.equal((await fetch(f.callback(state))).status,400);
 assert.equal(f.calls.filter(c=>c==='exchange').length,0);
 const accepted=await fetch(f.callback());assert.equal(accepted.status,200);assert.match(await accepted.text(),/Sign-in verified/);
 assert.deepEqual(f.writes,['unverified','ready']);assert.equal(f.rows.get('opaque').credential.refreshToken,'synthetic-refresh-secret');
 assert.ok(!JSON.stringify(f.manager.status('fixture')).includes('secret'));
 const binding=await f.manager.context(f.definition);assert.equal(await f.manager.tokens.use(binding,t=>t.length),'synthetic-access-secret'.length);assert.equal(f.calls.filter(c=>c==='exchange').length,1);
});
test('wrong authenticated account stays quarantined and returns only actionable sanitized status',async t=>{
 const f=fixture(t,{principal:'wrong-account'});await f.manager.signIn('fixture',{expectedRevision:'registry-revision'});
 const response=await fetch(f.callback());assert.equal(response.status,400);assert.ok(!(await response.text()).includes('secret'));
 assert.deepEqual(f.writes,['unverified']);assert.equal(f.rows.get('opaque').phase,'unverified');assert.equal(f.manager.status('fixture').state,'sign-in-required');
});
test('locked store, stale owner revision and duplicate sign-in fail before additional registration',async t=>{
 const locked=fixture(t,{locked:true});await assert.rejects(locked.manager.signIn('fixture',{expectedRevision:'registry-revision'}));assert.deepEqual(locked.calls,[]);assert.deepEqual(locked.opened,[]);
 const f=fixture(t);await assert.rejects(f.manager.signIn('fixture',{expectedRevision:'old'}),{code:'CONFIGURATION_MISMATCH'});assert.deepEqual(f.calls,[]);
 await f.manager.signIn('fixture',{expectedRevision:'registry-revision'});await assert.rejects(f.manager.signIn('fixture',{expectedRevision:'registry-revision'}),{code:'BUSY'});assert.equal(f.calls.length,1);
});

test('owner startup diagnostics identify a fixed stage without exposing upstream details or retrying',async t=>{
 for(const stage of ['discovery','client-registration','authorization-request']){
  const f=fixture(t);let attempts=0;f.manager.oauth.begin=async()=>{attempts++;throw Object.assign(Error('secret authorization code'),{code:'UNAVAILABLE',stage,httpStatus:503});};
  await assert.rejects(f.manager.signIn('fixture',{expectedRevision:'registry-revision'}),e=>e.stage===stage&&e.code==='UNAVAILABLE'&&!e.message.includes('secret'));
  assert.equal(attempts,1);assert.equal(f.opened.length,0);assert.equal(f.manager.flows.size,0);assert.equal(f.manager.status('fixture').stage,stage);assert.equal(f.manager.status('fixture').httpStatus,503);
 }
 const f=fixture(t);f.manager.openExternal=async()=>{throw Error('secret browser URL');};
 await assert.rejects(f.manager.signIn('fixture',{expectedRevision:'registry-revision'}),e=>e.stage==='browser-open'&&!e.message.includes('secret'));
 assert.equal(f.calls.length,1);assert.equal(f.manager.flows.size,0);
});
