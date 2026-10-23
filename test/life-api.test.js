import {assertPrivate} from './helpers/permissions.js';
import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { LifeStore } from '../src/services/life/life.js';
import { BrowserProfiles } from '../src/services/browser/browser-profiles.js';
import { LifeAPI, LifeTokenVault, LIFE_CALLBACK, lifeOrigin } from '../src/services/life/life-api.js';
import { AccountSession } from '../src/services/remote/account-session.js';
import { AppAccount } from '../src/services/remote/app-account.js';
const origin='https://life.example.test',accountId='a'.repeat(64),profile={accountId,workspaceId:'1',displayName:'Synthetic account',readOnly:false,capabilities:['nutrition.read','nutrition.add'],sections:['nutrition']};
const credential=()=>({origin,clientId:'public',accessToken:'first-access',refreshToken:'first-refresh',expiresAt:Date.now()+3600000,accountId,workspaceId:'1'});
const response=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
const tokens=(suffix='next')=>({access_token:suffix+'-access',refresh_token:suffix+'-refresh',token_type:'Bearer',expires_in:3600});
function vault(initial=null){let value=initial;return {available(){},exists:()=>!!value,load:()=>value,save:next=>{value=next;},clear:()=>{value=null;},read:()=>value};}
function fixture(t,options={}){const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-life-api-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));return {home,store:new LifeStore(home,options)};}
test('legacy config is archived byte-for-byte, SQL never opens, API defaults preserve enable flag',async t=>{
 const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-life-api-migration-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
 const original='{\n "schemaVersion":2, "enabled":true, "profileFile":"/must/not/be/read/private.json", "websiteUrl":"https://life.example.test"\n}\n';fs.writeFileSync(path.join(home,'life.json'),original);
 const store=new LifeStore(home,{vault:vault()});assert.equal(store.get().enabled,true);assert.equal(store.get().configured,false);assert.equal(store.get().connection.mode,'website-api');
 const archive=fs.readdirSync(path.join(home,'life')).find(f=>f.startsWith('legacy-config-'));assert.equal(fs.readFileSync(path.join(home,'life',archive),'utf8'),original);assertPrivate(path.join(home,'life',archive),0o600);
 assert.equal(store.get().websiteOrigin,origin);assert.ok(!JSON.stringify(store.get()).includes('/must/not'));await assert.rejects(store.data('nutrition'),/Sign in/);assert.equal(store.planSetup,undefined);
});
test('protected vault fails closed and never writes plaintext tokens',t=>{
 const {home}=fixture(t);assert.throws(()=>new LifeTokenVault(home,{}).save(credential()),/protected/);
 const crypto={isEncryptionAvailable:()=>true,encryptString:s=>Buffer.from(s).map(b=>b^123),decryptString:b=>Buffer.from(b).map(v=>v^123).toString()};
 const store=new LifeTokenVault(home,crypto);store.save(credential());assert.ok(!fs.readFileSync(store.file).includes(Buffer.from('first-access')));assert.equal(store.load().accountId,accountId);store.clear();assert.equal(store.exists(),false);
});
test('missing Life session permits signed-out profile discovery without probing protected storage',async t=>{
 const {home}=fixture(t);let probes=0,requests=0;
 const storage={isEncryptionAvailable(){probes++;return false;}};
 const saved=new LifeTokenVault(home,storage),api=new LifeAPI({vault:saved,fetch:async()=>{requests++;throw new Error('No request expected.');}});
 const profiles=new BrowserProfiles(home,{life:{api}});
 assert.equal(saved.load(),null);assert.equal(profiles.list().authenticated,false);assert.equal(profiles.get().id,'default');assert.equal(probes,0);
 await assert.rejects(api.begin(origin),{code:'PROTECTED_STORAGE_UNAVAILABLE'});assert.equal(requests,0);
 assert.throws(()=>saved.save(credential()),{code:'PROTECTED_STORAGE_UNAVAILABLE'});assert.equal(saved.exists(),false);
});
test('existing Life sessions still require protected storage and preserve encrypted bytes',t=>{
 const {home}=fixture(t),encrypted=Buffer.from('synthetic encrypted session');let decrypts=0;
 for(const storage of [{isEncryptionAvailable:()=>false},{isEncryptionAvailable:()=>true,getSelectedStorageBackend:()=> 'basic_text'}]){
  const saved=new LifeTokenVault(home,{...storage,decryptString(){decrypts++;return JSON.stringify(credential());}});
  fs.mkdirSync(path.dirname(saved.file),{recursive:true});fs.writeFileSync(saved.file,encrypted,{mode:0o600});
  assert.throws(()=>saved.load(),{code:'PROTECTED_STORAGE_UNAVAILABLE'});assert.deepEqual(fs.readFileSync(saved.file),encrypted);
 }
 assert.equal(decrypts,0);
});
test('PKCE discovery exact endpoints, one-use state and callback origin are enforced',async()=>{
 let launched,verifier;const storage=vault();const api=new LifeAPI({vault:storage,openExternal:async url=>{launched=new URL(url);},fetch:async(url,options)=>{
  if(url.endsWith('native-config'))return response({enabled:true,protocol:1,issuer:origin,clientId:'public',redirectUri:LIFE_CALLBACK,authorizationEndpoint:origin+'/oauth/authorize',tokenEndpoint:origin+'/oauth/token',apiBase:origin+'/api/v1/life'});
  if(url.endsWith('/oauth/token')){verifier=options.body.get('code_verifier');return response(tokens());}return response(profile);
 }});
 await api.begin(origin);const state=launched.searchParams.get('state'),challenge=launched.searchParams.get('code_challenge');
 assert.equal(launched.searchParams.get('code_challenge_method'),'S256');assert.equal(launched.searchParams.get('redirect_uri'),LIFE_CALLBACK);
 await assert.rejects(api.callback('proteus://pair/callback?state='+state+'&code=code'),/callback/);assert.equal(storage.read(),null);
 await api.begin(origin);await api.callback(LIFE_CALLBACK+'?state='+launched.searchParams.get('state')+'&code=code');
 assert.equal(createHash('sha256').update(verifier).digest('base64url'),launched.searchParams.get('code_challenge'));assert.notEqual(state,launched.searchParams.get('state'));assert.ok(challenge);assert.equal(api.profile.accountId,accountId);
 await assert.rejects(api.callback(LIFE_CALLBACK+'?state='+state+'&code=code'),/callback/);
 assert.throws(()=>lifeOrigin('https://user:secret@example.test'),/HTTPS/);
});
test('all mutations bind original identity, changed account is cleared before returning records',async()=>{
 let calls=0,body;const api=new LifeAPI({vault:vault(credential()),fetch:async(url,options)=>{calls++;if(url.endsWith('/data'))return response({...profile,workspaceId:'2'});if(url.endsWith('/action')){body=JSON.parse(options.body);return response({...profile,ok:true,record:{id:1}});}return response(profile);}});api.load();const identity=api.identity();
 await assert.rejects(api.action('food.save',{},'key',{...identity,workspaceId:'2'}),/earlier/);assert.equal(calls,0);
 await api.action('food.save',{},'synthetic-key',identity);assert.equal(body.expectedAccountId,accountId);assert.equal(body.expectedWorkspaceId,'1');
 await assert.rejects(api.data('nutrition',{}),/workspace changed/);assert.equal(api.credential,null);assert.equal(api.profile,null);
 await assert.rejects(api.action('food.save',{},'key',identity),/earlier/);
});
test('single-flight refresh and delayed old 401 retain newest credential',async()=>{
 let refresh=0,first=0;const api=new LifeAPI({vault:vault(credential()),fetch:async(url,options)=>{
  if(url.endsWith('/oauth/token')){refresh++;await new Promise(r=>setTimeout(r,10));return response(tokens());}
  if(options.headers.Authorization==='Bearer first-access'){first++;await new Promise(r=>setTimeout(r,first===1?1:50));return response({},401);}
  return response({...profile,foods:[]});
 }});const results=await Promise.all([api.data('nutrition',{}),api.data('nutrition',{})]);assert.equal(results.length,2);assert.equal(refresh,1);assert.equal(api.credential.accessToken,'next-access');
});
test('logout settles token rotation, revokes latest token, and discards outstanding reads',async()=>{
 let unblock,started;const gate=new Promise(r=>{unblock=r;}),ready=new Promise(r=>{started=r;});let revoked;
 const c=credential();c.expiresAt=0;const api=new LifeAPI({vault:vault(c),fetch:async(url,options)=>{if(url.endsWith('/oauth/token')){started();await gate;return response(tokens('rotated'));}if(url.endsWith('native-session')){revoked=options.headers.Authorization;return response({ok:true});}return response(profile);}});
 const read=api.data('nutrition',{});await ready;const logout=api.logout();unblock();await assert.rejects(read,/changed/);await logout;assert.equal(revoked,'Bearer rotated-access');assert.equal(api.credential,null);
});
test('revoked refresh clears credentials and redirects never receive a bearer follow-up',async()=>{
 let options;const c=credential();c.expiresAt=0;const api=new LifeAPI({vault:vault(c),fetch:async(_,o)=>{options=o;return response({},400);}});
 await assert.rejects(api.data('nutrition',{}));assert.equal(api.credential,null);assert.equal(options.redirect,'error');
});
test('evidence is scoped, capped, converted to safe metadata without bearer disclosure',async()=>{
 const png=Buffer.from([137,80,78,71,13,10,26,10]);let evidenceCalls=0;const api=new LifeAPI({vault:vault(credential()),fetch:async url=>{if(url.includes('/evidence/')){evidenceCalls++;return new Response(png,{headers:{'content-disposition':'attachment; filename="original.png"'}});}return response(profile);}});api.load();
 await assert.rejects(api.evidence('../1',api.identity()),/valid evidence/);assert.equal(evidenceCalls,0);const value=await api.evidence('1',api.identity());assert.equal(value.mimeType,'image/png');assert.equal(value.name,'original.png');assert.ok(!JSON.stringify(value).includes('access'));
});
test('desktop query requests actual API desktop contract and rejects disabled operations',async t=>{
 let sent;const {store}=fixture(t,{vault:vault(credential()),fetch:async(url,options)=>{if(url.endsWith('/data'))sent=JSON.parse(options.body);return response({...profile,foods:[],foodPagination:{page:1,pageSize:25}});}});
 const s=store.get();store.save({schemaVersion:3,enabled:true},s.revision);await store.refresh();await store.data('nutrition',{tab:'foods',foodPage:2,search:'',from:''});assert.deepEqual(sent.query,{tab:'foods',foodPage:2,client:'desktop',projection:'tab'});const identity=store.get().identity;store.save({schemaVersion:3,enabled:false},store.get().revision);await assert.rejects(store.action('food.save',{},'key',identity),/disabled/);
});
test('cancel/logout and newer sign-in cannot resurrect a stale discovery or exchange',async t=>{
 const {home}=fixture(t);let release,entered,launched=0,url;const makeGate=()=>{let start;const ready=new Promise(r=>start=r),wait=new Promise(r=>release=r);entered=start;return {ready,wait};};
 let gate=makeGate(),pause='discovery';const fetcher=async(endpoint,options)=>{
  if(endpoint.endsWith('native-config')){if(pause==='discovery'){entered();await gate.wait;}return response({enabled:true,protocol:1,issuer:origin,clientId:'public',redirectUri:LIFE_CALLBACK,authorizationEndpoint:origin+'/oauth/authorize',tokenEndpoint:origin+'/oauth/token',apiBase:origin+'/api/v1/life'});}
  if(endpoint.endsWith('/oauth/token')){if(pause==='exchange'){entered();await gate.wait;}return response(tokens());}return response(profile);
 };
 const store=new LifeStore(home,{vault:vault(),fetch:fetcher,openExternal:async value=>{launched++;url=new URL(value);}});
 store.save({schemaVersion:3,enabled:true},store.get().revision);
 const begin=store.auth('begin',{websiteOrigin:origin});await gate.ready;await store.auth('cancel');release();await assert.rejects(begin,/cancelled/);assert.equal(launched,0);assert.equal(store.settings().websiteOrigin,'https://proteus.example');
 gate=makeGate();const second=store.auth('begin',{websiteOrigin:origin});await gate.ready;store.save({schemaVersion:3,enabled:false},store.get().revision);release();await second;assert.equal(launched,1);await store.auth('cancel');
 store.save({schemaVersion:3,enabled:true},store.get().revision);pause='';await store.auth('begin',{websiteOrigin:origin});
 pause='exchange';gate=makeGate();const complete=store.callback(LIFE_CALLBACK+'?state='+url.searchParams.get('state')+'&code=synthetic');await gate.ready;await store.auth('cancel');release();await assert.rejects(complete,/cancelled/);assert.equal(store.api.credential,null);
 pause='';await store.auth('begin',{websiteOrigin:origin});const a=url;
 pause='exchange';gate=makeGate();const old=store.callback(LIFE_CALLBACK+'?state='+a.searchParams.get('state')+'&code=old');await gate.ready;pause='';await store.auth('begin',{websiteOrigin:origin});const b=url;release();await assert.rejects(old,/cancelled/);assert.equal(store.api.pending.state,b.searchParams.get('state'));assert.equal(store.api.credential,null);
 await store.callback(LIFE_CALLBACK+'?state='+b.searchParams.get('state')+'&code=new');assert.equal(store.api.credential.accountId,accountId);
});
test('saved encrypted credential prevents website retargeting before lazy unlock',t=>{
 const {store}=fixture(t,{vault:vault(credential())});assert.equal(store.api.credential,null);assert.throws(()=>store.save({schemaVersion:3,enabled:true,websiteOrigin:'https://other.example.test'},store.get().revision),/Sign out/);
});

test('unreadable protected session can be explicitly forgotten without claiming remote revocation',async()=>{let cleared=false,called=false;const api=new LifeAPI({vault:{load(){throw new Error('Unreadable protected session');},clear(){cleared=true;}},fetch:async()=>{called=true;}});await api.logout();assert.equal(cleared,true);assert.equal(called,false);assert.equal(api.credential,null);assert.match(api.notice,/revocation could not be confirmed/);});

test('account refresh stays connected with Life disabled while Life reads remain gated',async t=>{
 const {store}=fixture(t,{vault:vault(credential()),fetch:async()=>response(profile)});await store.auth('refresh');assert.equal(store.get().enabled,false);assert.equal(store.get().ready,false);assert.equal(store.get().connected,true);await assert.rejects(store.data('nutrition'),/disabled/);store.save({schemaVersion:3,enabled:true},store.get().revision);store.save({schemaVersion:3,enabled:false},store.get().revision);assert.equal(store.get().connected,true);
});

test('shared account session authenticates and refreshes without Life endpoints or scopes',async()=>{
 let launched;const paths=[],storage=vault();
 const api=new AccountSession({vault:storage,openExternal:async url=>{launched=new URL(url);},fetch:async(url)=>{
  paths.push(url);
  if(url.endsWith('native-config'))return response({enabled:true,protocol:1,issuer:origin,clientId:'public',redirectUri:LIFE_CALLBACK,authorizationEndpoint:origin+'/oauth/authorize',tokenEndpoint:origin+'/oauth/token',appApiBase:origin+'/api/v1/app',appScopes:['app:read','app:write']});
  if(url.endsWith('/oauth/token'))return response(tokens());
  assert.equal(url,origin+'/api/v1/app?view=bootstrap');return response({accountId,workspaceId:'1',displayName:'Synthetic account',preferences:{}});
 }});
 await api.begin(origin);assert.equal(launched.searchParams.get('scope'),'app:read app:write');
 await api.callback(LIFE_CALLBACK+'?state='+launched.searchParams.get('state')+'&code=synthetic');await api.refresh();
 assert.equal(storage.read().accountId,accountId);assert.equal(paths.some(url=>url.endsWith('/api/v1/life')),false);
});

test('account collection reads are scoped, paged and independent of optional Life',async()=>{
 const calls=[],api=new AccountSession({vault:vault(credential()),fetch:async(url,options)=>{calls.push({url,options});return response({accountId,workspaceId:'1',teamLists:[{id:'list',members:[{name:'A',mode:'fixed'}]}]});}});
 const account=new AppAccount(api);const lists=await account.lists();assert.deepEqual(lists.teamLists[0].fixed,['A']);
 assert.equal(calls[0].url,origin+'/api/v1/app?view=bootstrap&include=teamLists');
 await account.request({path:'/logs',page:2,pageSize:25,collectionRevision:'c'.repeat(64)});assert.match(calls[1].url,/page=2&pageSize=25&expectedRevision=c+/);
 await assert.rejects(account.request({path:'/logs',pageSize:101}),/page size/);
 await assert.rejects(account.request({path:'/logs?token=secret'}),/Unsupported/);
 await account.request({path:'/team-lists/'+ 'a'.repeat(36),method:'DELETE',body:{expectedRevision:2},identity:lists.identity});
 const body=JSON.parse(calls[2].options.body);assert.equal(body.expectedRevision,2);assert.equal(body.expectedAccountId,accountId);assert.equal(body.expectedWorkspaceId,'1');
});
