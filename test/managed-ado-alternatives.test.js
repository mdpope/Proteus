import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {ManagedAdoCli,qualifyCliStorage} from '../src/services/integrations/managed-ado-cli.js';
import {ManagedAdoPat} from '../src/services/integrations/managed-ado-pat.js';
import {adoIdentityProfile} from '../src/services/integrations/managed-ado-identity.js';
import {adoReadScopes} from '../src/services/integrations/managed-ado-alternative-profile.js';
import {managedAdoAdapter,adoServerProfile} from '../src/services/integrations/managed-ado-adapter.js';
const guid=n=>`${n.repeat(8)}-${n.repeat(4)}-${n.repeat(4)}-${n.repeat(4)}-${n.repeat(12)}`;
const tenant=guid('1'),principal=guid('2'),organizationId=guid('3'),adoUserId=guid('4');
const definition=adapter=>({id:'fixture',name:'hc-ado-corporate',ownerId:'owner',authentication:{adapter,credentialOwnerId:'owner',credentialRef:'ref',...(adapter==='ado-pat'?{expiresAt:'2030-01-01T00:00:00Z',reminderDays:7}:{cli:{executable:'/fixture/az',profileDirectory:'/fixture/corporate',sha256:'a'.repeat(64),version:'2.80.0'}})},expected:{principal,tenant:adapter==='ado-pat'?organizationId:tenant,organizationId,resource:'https://dev.azure.com/fixture',audience:adapter==='ado-pat'?'azure-devops-pat':adoIdentityProfile.audience,scopes:adapter==='ado-pat'?adoReadScopes:[adoIdentityProfile.scope],...(adapter==='ado-pat'?{}:{adoUserId})},policy:{requestTimeoutMs:10000},transport:adoServerProfile});
function cliFixture(t){
 let now=Date.UTC(2026,10,5),issued=0;const calls=[];const keys=generateKeyPairSync('rsa',{modulusLength:2048});const jwk={...keys.publicKey.export({format:'jwk'}),kid:'fixture',use:'sig'};
 const state={wrongPrincipal:false,wrongOrg:false,wrongAudience:false,wrongTenant:false,deniedStore:false};
 const run=async(_file,args,options)=>{calls.push({args,env:options.env});assert.equal(options.shell,false);assert.ok(!Object.hasOwn(options.env,'AZURE_CLIENT_ID'));if(args[0]==='version')return {stdout:JSON.stringify({'azure-cli':'2.80.0'})};if(args[1]==='show')return {stdout:JSON.stringify({tenantId:tenant,user:{type:'user'}})};issued++;
  const h=Buffer.from(JSON.stringify({alg:'RS256',kid:'fixture'})).toString('base64url'),body=Buffer.from(JSON.stringify({iss:'https://sts.windows.net/'+tenant+'/',tid:state.wrongTenant?organizationId:tenant,oid:state.wrongPrincipal?organizationId:principal,aud:state.wrongAudience?'other':adoIdentityProfile.audience,scp:'user_impersonation',nbf:now/1000-60,exp:now/1000+3600})).toString('base64url');
  const token=h+'.'+body+'.'+sign('RSA-SHA256',Buffer.from(h+'.'+body),keys.privateKey).toString('base64url');
  return {stdout:JSON.stringify({accessToken:token,expires_on:String(now/1000+3600),tokenType:'Bearer',tenant})};};
 const fetchFn=async(url,opts)=>{assert.equal(opts.redirect,'manual');if(url.includes('/discovery/'))return Response.json({keys:[jwk]});assert.equal(url.startsWith('https://dev.azure.com/fixture/'),true);return Response.json({instanceId:state.wrongOrg?tenant:organizationId,authenticatedUser:{id:adoUserId,isActive:true}});};
 const adapter=new ManagedAdoCli({ownerId:'owner',now:()=>now,run,fetchFn,pinCheck:async()=>{},storageCheck:async()=>{if(state.deniedStore)throw Object.assign(Error('private cache details'),{code:'CLI_STORAGE_UNQUALIFIED'});}});t.after(()=>adapter.close());
 return {adapter,state,calls,advance:()=>now+=3600000,issued:()=>issued,d:definition('ado-azure-cli')};
}
test('explicit CLI concurrently renews once, uses only pinned profile/tenant/audience, and never runs login or fallback',async t=>{
 const f=cliFixture(t);await Promise.all(Array.from({length:20},()=>f.adapter.use(f.d,(token,expiry)=>{assert.ok(token.split('.').length===3);assert.ok(expiry>0);})));assert.equal(f.issued(),1);f.advance();await Promise.all(Array.from({length:10},()=>f.adapter.use(f.d,()=>{})));assert.equal(f.issued(),2);
 assert.ok(f.calls.every(c=>c.env.AZURE_CONFIG_DIR==='/fixture/corporate'&&!c.args.includes('login')&&!c.args.includes('set')));
 const acquire=f.calls.find(c=>c.args.includes('get-access-token'));assert.ok(acquire.args.includes(tenant)&&acquire.args.includes(adoIdentityProfile.audience));assert.ok(!JSON.stringify(f.calls).includes('accessToken'));
});
for(const property of ['wrongPrincipal','wrongOrg','wrongAudience','wrongTenant'])test('CLI rejects '+property+' before publishing credentials',async t=>{const f=cliFixture(t);f.state[property]=true;await assert.rejects(f.adapter.use(f.d,()=>assert.fail()),{code:'ACCESS_DENIED'});});
test('unqualified CLI storage fails before process invocation and does not inspect cache contents',async t=>{
 const f=cliFixture(t);f.state.deniedStore=true;await assert.rejects(f.adapter.use(f.d,()=>assert.fail()),{code:'CLI_STORAGE_UNQUALIFIED'});assert.equal(f.calls.length,0);
 for(const platform of ['darwin','linux'])await assert.rejects(qualifyCliStorage(f.d.authentication.cli,{platform}),{code:'CLI_STORAGE_UNQUALIFIED'});
});
function patFixture(t){const rows=new Map(),state={locked:false,wrong:false},requests=[];let now=Date.UTC(2026,10,5);const vault={requireAvailable(){if(state.locked)throw Object.assign(Error('locked'),{code:'CREDENTIAL_STORE_UNAVAILABLE'});},read:async ref=>rows.get(ref),write:async(ref,v)=>rows.set(ref,v)};const adapter=new ManagedAdoPat({ownerId:'owner',vault,now:()=>now,fetchFn:async(url,opts)=>{requests.push({url,redirect:opts.redirect});assert.match(opts.headers.authorization,/^Basic /);return Response.json({instanceId:organizationId,authenticatedUser:{id:state.wrong?adoUserId:principal,isActive:true}});}});t.after(()=>adapter.close());return {adapter,rows,state,requests,d:definition('ado-pat'),expire:()=>now=Date.UTC(2031,0,1)};}
test('PAT is verified before protected persistence and supplies only the distinct Basic-mode payload',async t=>{
 const f=patFixture(t),pat='x'.repeat(52);await assert.rejects(f.adapter.use(f.d,()=>assert.fail()),{code:'PAT_REQUIRED'});
 const status=await f.adapter.store(f.d,{pat,email:'owner@example.test'});assert.ok(!JSON.stringify(status).includes(pat));assert.equal(f.rows.size,1);
 await f.adapter.use(f.d,token=>assert.equal(Buffer.from(token,'base64').toString(),'owner@example.test:'+pat));assert.ok(f.requests.every(r=>r.redirect==='manual'));
 f.expire();await assert.rejects(f.adapter.use(f.d,()=>assert.fail()),{code:'PAT_EXPIRED'});
});
test('PAT wrong identity and denied store never persist; no automatic fallback or issuance',async t=>{
 const f=patFixture(t),values={pat:'x'.repeat(52),email:'owner@example.test'};f.state.wrong=true;await assert.rejects(f.adapter.store(f.d,values),{code:'ACCESS_DENIED'});assert.equal(f.rows.size,0);f.state.locked=true;await assert.rejects(f.adapter.store(f.d,values),{code:'CREDENTIAL_STORE_UNAVAILABLE'});assert.equal(f.requests.length,1);
});
test('actual pinned MCP server initializes PAT mode without a credential or network call',async t=>{
 const d=definition('ado-pat'),adapter=managedAdoAdapter({identity:{use:(_d,consume)=>consume(Buffer.from('fixture@example.test:synthetic-not-a-real-pat').toString('base64'),Date.now()+3600000),invalidate(){}},verify:()=>assert.fail()});
 const client=await adapter.connect(d);t.after(()=>client.close());const tools=await client.listTools();assert.ok(tools.find(t=>t.name==='wit_query'));assert.ok(tools.find(t=>t.name==='wit_work_item_write').annotations.readOnlyHint===false);
});
test('CLI command failures redact private subprocess output and wrong owner never starts acquisition',async t=>{
 const f=cliFixture(t);f.adapter.run=async()=>{throw Error('secret-token-stderr');};await assert.rejects(f.adapter.use(f.d,()=>assert.fail()),e=>e.code==='CLI_UNAVAILABLE'&&!e.message.includes('secret'));
 await assert.rejects(f.adapter.use({...f.d,ownerId:'other'},()=>assert.fail()),{code:'CONFIGURATION_MISMATCH'});
});
test('PAT redirects, transport errors and failed persistence never expose or publish a credential',async t=>{
 const f=patFixture(t),values={pat:'z'.repeat(52),email:'owner@example.test'};
 f.adapter.fetchFn=async()=>new Response(null,{status:302,headers:{location:'https://other.test'}});await assert.rejects(f.adapter.store(f.d,values),{code:'CONFIGURATION_MISMATCH'});assert.equal(f.rows.size,0);
 f.adapter.fetchFn=async()=>{throw Error('secret-token-header');};await assert.rejects(f.adapter.store(f.d,values),e=>e.code==='UNAVAILABLE'&&!e.message.includes('secret'));assert.equal(f.rows.size,0);
 f.adapter.fetchFn=async()=>Response.json({instanceId:organizationId,authenticatedUser:{id:principal,isActive:true}});f.adapter.vault.write=async()=>{throw Object.assign(Error('private-secret-disk'),{code:'CREDENTIAL_STORE_UNAVAILABLE'});};await assert.rejects(f.adapter.store(f.d,values),e=>e.code==='CREDENTIAL_STORE_UNAVAILABLE'&&!e.message.includes('private'));assert.equal(f.rows.size,0);
});
