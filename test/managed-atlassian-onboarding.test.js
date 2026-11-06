import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {ManagedAtlassian} from '../src/services/integrations/managed-atlassian.js';
import {ManagedConnectionRegistry} from '../src/services/integrations/managed-connection-registry.js';
import {AtlassianOnboarding,atlassianSetupScopes,atlassianReadScopes} from '../src/services/integrations/managed-atlassian-onboarding.js';
import {discoverAtlassian} from '../src/services/integrations/managed-atlassian-probes.js';
import {atlassianOAuthProfile as p} from '../src/services/integrations/managed-atlassian-oauth.js';
function fixture(t,{locked=false,failWrite=false}={}){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'atlassian-setup-')),registry=new ManagedConnectionRegistry(dir,{ownerId:'owner'}),rows=new Map(),calls=[],opened=[];let flow;
 const vault={requireAvailable:()=>{if(locked)throw Error('locked');},read:ref=>rows.get(ref),write:(ref,data)=>{if(failWrite)throw Error('private failure');rows.set(ref,structuredClone(data));}};
 const oauth={begin:async value=>{calls.push('begin');flow={...value,clientInformation:{client_id:'fixture-client'},authorizationUrl:new URL('https://auth.atlassian.com/authorize')};return flow;},exchange:async()=>{calls.push('exchange');return {accessToken:'private-access',expiresAt:Date.now()+3600000,credential:{issuer:p.issuer,resource:p.endpoint,clientInformation:flow.clientInformation,refreshToken:'private-refresh',scopes:[...flow.scopes]}};}};
 const tools=['atlassianUserInfo','getAccessibleAtlassianResources'].map(name=>({name,inputSchema:{type:'object',additionalProperties:false}}));
 const transport=options=>({connect:async definition=>({verify:async context=>options.verify(definition,{...context,listTools:async()=>tools,call:async name=>{calls.push(name);assert.equal(await options.withToken(definition,token=>token),'private-access');return {structuredContent:name==='atlassianUserInfo'?{account_id:'person',name:'Fixture User'}:[{id:'site-a',name:'First site',url:'https://first.atlassian.net',scopes:['read:jira-work']},{id:'site-b',name:'Second site',url:'https://second.atlassian.net',scopes:['read:jira-work']}]};}}),close:async()=>{}})});
 const auth=new ManagedAtlassian({registry,vault,oauth,transport,openExternal:async url=>opened.push(url)}),setup=new AtlassianOnboarding(auth,{workspaces:()=>[{id:'workspace'}]});
 t.after(async()=>{setup.close();await auth.close();fs.rmSync(dir,{recursive:true,force:true});});
 return {auth,setup,registry,rows,calls,opened,flow:()=>flow,callback:state=>flow.redirectUri+'?code=fixture-code&state='+(state||flow.state),confirm:()=>({setupId:setup.status().id,expectedRevision:registry.read().revision,siteId:'site-b',workspaceIds:['workspace'],name:'fixture-atlassian',label:'Fixture Jira',issue:'FIXTURE-1'})};
}
test('browser-first setup discovers account/sites but cannot be captured until explicit selection; refresh credentials protected and runtime identity pinned',async t=>{
 const f=fixture(t);await f.setup.start();assert.equal(f.opened.length,1);assert.equal(f.registry.read().connections.length,0);
 assert.equal((await fetch(f.callback('0'.repeat(64)))).status,400);assert.equal(f.calls.includes('exchange'),false);
 assert.equal((await fetch(f.callback())).status,200);const status=f.setup.status();assert.equal(status.state,'review');assert.equal(status.account.name,'Fixture User');assert.equal(status.sites.length,2);assert.ok(!JSON.stringify(status).includes('private-'));assert.equal(f.registry.read().connections.length,0);assert.equal([...f.rows.values()][0].phase,'onboarding-unconfirmed');
 await assert.rejects(f.setup.confirm({...f.confirm(),principal:'override'}));await assert.rejects(f.setup.confirm({...f.confirm(),siteId:'invented'}));await assert.rejects(f.setup.confirm({...f.confirm(),workspaceIds:['other']}));await assert.rejects(f.setup.confirm({...f.confirm(),expectedRevision:'stale'}));assert.equal(f.registry.read().connections.length,0);
 const result=await f.setup.confirm(f.confirm()),saved=f.registry.read().connections[0];assert.equal(result.connectionId,saved.id);assert.equal(saved.expected.principal,'person');assert.equal(saved.expected.tenant,'site-b');assert.equal(saved.expected.resource,'https://second.atlassian.net');assert.equal(saved.probes.length,2);assert.equal(f.rows.get(saved.authentication.credentialRef).phase,'ready');assert.equal(f.setup.status().state,'complete');assert.equal(f.setup.session.result,null);assert.ok(!JSON.stringify(saved).includes('private-'));
 await assert.rejects(f.setup.confirm(f.confirm()));assert.equal(f.registry.read().connections.length,1);
});
test('locked storage, duplicate start, cancellation and persistence failure never create a connection or retry consent',async t=>{
 const locked=fixture(t,{locked:true});await assert.rejects(locked.setup.start());assert.equal(locked.opened.length,0);
 const f=fixture(t);const starting=f.setup.start();await assert.rejects(f.setup.start());await starting;assert.equal(f.opened.length,1);f.setup.cancel(f.setup.status().id);assert.equal(f.setup.status().state,'cancelled');assert.equal(f.registry.read().connections.length,0);
 const failed=fixture(t,{failWrite:true});await failed.setup.start();assert.equal((await fetch(failed.callback())).status,400);assert.equal(failed.registry.read().connections.length,0);assert.equal(failed.setup.status().state,'failed');assert.equal(failed.setup.status().stage,'protected-storage');assert.ok(!JSON.stringify(failed.setup.status()).includes('private'));assert.equal(failed.calls.includes('atlassianUserInfo'),false);
});
test('discovery validates actual schemas, safe HTTPS sites and bounded minimal projections',async()=>{
 const call=async name=>({structuredContent:name==='atlassianUserInfo'?{account_id:'person',name:'Person',privateProfile:'not returned'}:[{id:'site',name:'Site',url:'https://fixture.atlassian.net',scopes:['read:jira-work']}]});
 const listTools=async()=>['atlassianUserInfo','getAccessibleAtlassianResources'].map(name=>({name,inputSchema:{type:'object',additionalProperties:false}}));
 const found=await discoverAtlassian({call,listTools});assert.equal(found.account.privateProfile,undefined);
 await assert.rejects(discoverAtlassian({call,listTools:async()=>[]}));
 await assert.rejects(discoverAtlassian({listTools,call:async name=>name==='atlassianUserInfo'?call(name):{structuredContent:[{id:'site',name:'Site',url:'https://attacker.test/?token=secret',scopes:['read:jira-work']}]}}));
 const empty=await discoverAtlassian({listTools,call:async name=>name==='atlassianUserInfo'?call(name):{structuredContent:[]}});assert.deepEqual(empty.sites,[]);
});
test('browser launch failure exposes only the stage; no new attempt without owner action',async t=>{
 const f=fixture(t);f.auth.openExternal=async()=>{throw Error('private-url');};await assert.rejects(f.setup.start(),/browser-open/);assert.equal(f.setup.status().state,'failed');assert.ok(!JSON.stringify(f.setup.status()).includes('private-url'));assert.equal(f.calls.length,1);
});

test('Jira read/write selection requests explicit write scope; read-only stays read-only and confirmation cannot expand it',async t=>{
 const write=fixture(t);await write.setup.start();assert.equal(write.setup.status().accessMode,'read-write');assert.ok(write.flow().scopes.includes('write:jira-work'));await fetch(write.callback());await write.setup.confirm(write.confirm());assert.ok(write.registry.read().connections[0].expected.scopes.includes('write:jira-work'));
 const read=fixture(t);await read.setup.start({accessMode:'read-only'});assert.deepEqual(read.flow().scopes,[...atlassianReadScopes]);await fetch(read.callback());await assert.rejects(read.setup.confirm({...read.confirm(),accessMode:'read-write'}));await read.setup.confirm(read.confirm());assert.equal(read.registry.read().connections[0].expected.scopes.includes('write:jira-work'),false);
});
test('callback denial and discovery failure show sanitized stage/code on the page and in retained owner status',async t=>{
 const denied=fixture(t);await denied.setup.start();const url=new URL(denied.callback());url.searchParams.delete('code');url.searchParams.set('error','access_denied');url.searchParams.set('error_description','private provider data');const response=await fetch(url);assert.equal(response.status,400);const text=await response.text();assert.match(text,/consent-response.*CONSENT_DENIED/);assert.ok(!text.includes('private'));assert.equal(denied.calls.includes('exchange'),false);
 const failed=fixture(t);failed.auth.transport=()=>({connect:async()=>{throw Object.assign(Error('private transport response'),{code:'CAPABILITY_MISMATCH'});}});await failed.setup.start();const bad=await fetch(failed.callback());assert.match(await bad.text(),/account-discovery.*CAPABILITY_MISMATCH/);assert.equal(failed.setup.status().code,'CAPABILITY_MISMATCH');assert.equal(failed.setup.status().state,'failed');assert.equal(failed.registry.read().connections.length,0);
});

test('site discovery retains resources without classic Jira scope metadata and deduplicates only identical site identities',async()=>{
 const listTools=async()=>['atlassianUserInfo','getAccessibleAtlassianResources'].map(name=>({name,inputSchema:{type:'object',additionalProperties:false}}));
 const discover=resources=>discoverAtlassian({listTools,call:async name=>({structuredContent:name==='atlassianUserInfo'?{account_id:'person',name:'Person'}:resources})});
 const rows=[
  {id:'missing',name:'No scope metadata',url:'https://missing.atlassian.net'},
  {id:'granular',name:'Granular scope',url:'https://granular.atlassian.net',scopes:['read:issue-details:jira']},
  {id:'other',name:'Other product',url:'https://other.atlassian.net',scopes:['read:confluence-content.all']}
 ];
 const found=await discover([...rows,rows[0]]);
 assert.deepEqual(found.sites.map(s=>s.id),['missing','granular','other']);
 assert.deepEqual(found.discovery,{resourceCount:4,siteCount:3,jiraAccess:'unchecked'});
 assert.equal(found.capabilities,undefined);
 assert.equal(JSON.stringify(found).includes('read:confluence'),false);
 const empty=await discover([]);assert.deepEqual(empty.discovery,{resourceCount:0,siteCount:0,jiraAccess:'unchecked'});
 await assert.rejects(discover([rows[0],{...rows[0],url:'https://different.atlassian.net'}]),e=>e.detail==='RESOURCES_MALFORMED');
 await assert.rejects(discover([null]),e=>e.detail==='RESOURCES_MALFORMED');
});
