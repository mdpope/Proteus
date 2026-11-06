// Disposable Electron acceptance: synthetic connection metadata and no sign-in.
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import http from 'node:http';import assert from 'node:assert/strict';import {_electron} from 'playwright';import {createRequire} from 'node:module';import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
const root=path.resolve(import.meta.dirname,'..'),temporary=privateTemporaryDirectory(path.join(os.tmpdir(),'managed-connections-ui-'));
const server=http.createServer((req,res)=>{const name=new URL(req.url,'http://fixture').pathname,file=path.resolve(root,'.'+name);if(name.startsWith('/public/')&&file.startsWith(root+path.sep)&&fs.existsSync(file)){res.setHeader('Content-Type',file.endsWith('.css')?'text/css':'text/javascript');res.end(fs.readFileSync(file));}else{res.setHeader('Content-Type','text/html');res.end('<link rel="stylesheet" href="/public/style.css"><main id="host"></main>');}});
let app;await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try{
 const entry=path.join(temporary,'main.cjs');fs.writeFileSync(entry,`const {app,BrowserWindow}=require('electron');app.setPath('userData',${JSON.stringify(path.join(temporary,'data'))});app.whenReady().then(()=>{new BrowserWindow({width:1000,height:1000,webPreferences:{nodeIntegration:false,contextIsolation:true}}).loadURL(${JSON.stringify('http://127.0.0.1:'+server.address().port)});});`);
 const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;app=await _electron.launch({executablePath:createRequire(import.meta.url)('electron'),args:[entry],env});const page=await app.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{
  const {mountManagedConnections}=await import('/public/features/settings/managed-connections.js');
  const fixture=window.fixture={calls:[],active:true,conflict:false,snapshot:{ownerId:'owner',revision:'r1',connections:[],workspaces:[{id:'workspace',name:'Fixture workspace'}],adapters:[{id:'atlassian-oauth-v2',name:'Atlassian / Jira',endpoint:'https://mcp.atlassian.com/v1/mcp/authv2',capabilities:['atlassian.identity.read','jira.issue.read','jira.issue.search']},{id:'ado-entra-public-client',name:'Azure DevOps corporate',transport:{type:'stdio',package:'@azure-devops/mcp',version:'2.11.0',integrity:'fixture'},audience:'fixture-audience',scopes:['fixture-scope'],capabilities:['ado.projects.read','ado.teams.read','ado.work-items.read','ado.work-items.query'],requires:'Approved public client required.'}]}};
  const ui={escape:v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),api:async(_path,args)=>{
   if(!args)return fixture.snapshot;fixture.calls.push(args);
   if(args.action==='save'){if(fixture.conflict)throw Error('Managed connections changed. Refresh before acting.');fixture.snapshot.connections=[{...args.definition,status:{state:'unchecked',credentialStore:'available',ownerSignIn:{state:'unchecked'}},references:[],active:false}];fixture.snapshot.revision='r2';}
   if(args.action==='verify')fixture.snapshot.connections[0].status={state:'ready',credentialStore:'available',authentication:'verified',transport:'connected',access:'verified',lastSuccessfulRead:'2026-11-05T12:00:00Z',capabilities:['jira.issue.read','jira.issue.search'],ownerSignIn:{state:'authenticated'}};
   if(args.action==='sign-in'){const nextAction='Atlassian sign-in could not start at browser-open (AUTH_REQUIRED). Review this connection setup; no consent completion is recorded.';fixture.snapshot.connections[0].status.ownerSignIn={state:'sign-in-required',stage:'browser-open',code:'AUTH_REQUIRED',nextAction};throw Error(nextAction);}
   if(args.action==='disable')fixture.snapshot.connections[0].enabled=false;
   if(args.action==='remove')fixture.snapshot.connections=[];
   return fixture.snapshot;
  }};await mountManagedConnections(document.querySelector('#host'),ui,()=>fixture.active);
 });
 await page.getByRole('button',{name:'Add connection',exact:true}).click();await page.getByLabel('Expected Atlassian account ID').fill('fixture-person');await page.getByLabel('Expected cloud/site ID').fill('fixture-site');await page.getByLabel('Expected site URL').fill('https://fixture.atlassian.net');await page.getByLabel('Fixture workspace',{exact:true}).check();await page.getByLabel('Issue key/ID for approved minimal Jira health reads').fill('FIXTURE-1');
 await page.getByRole('button',{name:'Save configuration',exact:true}).click();await page.locator('[data-connection]').waitFor();
 const saved=await page.evaluate(()=>fixture.calls[0]);assert.equal(saved.expectedRevision,'r1');assert.equal(saved.definition.name,'hc-atlassian');assert.equal(saved.definition.probes.length,2);assert.deepEqual(saved.definition.workspaceIds,['workspace']);assert.equal(saved.definition.expected.principal,'fixture-person');
 // A rejected owner browser launch is visible, leaves retry to the owner, and survives refresh.
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.locator('[data-managed-error]').filter({hasText:'browser-open (AUTH_REQUIRED)'}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Sign in',exact:true}).isEnabled(),true);
 await page.getByRole('button',{name:'Refresh status',exact:true}).click();
 await page.locator('[data-connection]').filter({hasText:'browser-open (AUTH_REQUIRED)'}).waitFor();
 assert.equal(await page.evaluate(()=>fixture.calls.filter(call=>call.action==='sign-in').length),1,'Status refresh must not retry authentication');
 await page.getByRole('button',{name:'Verify now',exact:true}).click();await page.locator('.connection-health dd').filter({hasText:'Verified'}).first().waitFor();
 await page.locator('.connection-details summary').click();
 assert.match(await page.locator('[data-managed-rows]').textContent(),/jira.issue.read, jira.issue.search/);
 await page.getByRole('button',{name:'Configure',exact:true}).click();await page.getByLabel('Display name',{exact:true}).fill('Retained draft');await page.evaluate(()=>fixture.conflict=true);await page.getByRole('button',{name:'Save configuration',exact:true}).click();await page.getByText('Managed connections changed. Refresh before acting.',{exact:true}).waitFor();assert.equal(await page.getByLabel('Display name',{exact:true}).inputValue(),'Retained draft');
 await page.getByRole('button',{name:'Cancel',exact:true}).click();await page.getByRole('button',{name:'Disable',exact:true}).click();await page.getByRole('button',{name:'Enable',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Verify now',exact:true}).isDisabled(),true);
 await page.getByRole('button',{name:'Remove connection',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('[data-connection]').length===0);
 await page.evaluate(()=>fixture.conflict=false);await page.getByRole('button',{name:'Add connection',exact:true}).click();await page.getByLabel('Connection type',{exact:true}).selectOption('ado-entra-public-client');
 const guid='11111111-1111-4111-8111-111111111111';for(const label of ['Expected corporate Entra object ID','Expected corporate tenant ID','Approved public application client ID','Expected Azure DevOps organization ID','Project ID for approved health reads','Team ID for the settings health read'])await page.getByLabel(label,{exact:true}).fill(guid);
 await page.getByLabel('Expected organization URL',{exact:true}).fill('https://dev.azure.com/fixture');await page.getByLabel('Work item ID for the read and exact-ID query',{exact:true}).fill('7');await page.getByLabel('Fixture workspace',{exact:true}).check();await page.getByRole('button',{name:'Save configuration',exact:true}).click();await page.locator('[data-connection]').waitFor();
 const ado=await page.evaluate(()=>fixture.calls.at(-1).definition);assert.equal(ado.name,'hc-ado-corporate');assert.equal(ado.authentication.clientId,guid);assert.equal(ado.expected.organizationId,guid);assert.equal(ado.probes.length,4);assert.equal(ado.probes.find(p=>p.capability==='ado.work-items.query').parameters.workItemId,7);assert.equal(ado.transport.type,'stdio');
 // Both non-registration options expose distinct setup fields and never retain a PAT in the definition.
 await page.evaluate(()=>{const base=fixture.snapshot.adapters.find(a=>a.id==='ado-entra-public-client');fixture.snapshot.adapters.push({...base,id:'ado-azure-cli',name:'Azure DevOps CLI'},{...base,id:'ado-pat',name:'Azure DevOps PAT',audience:'azure-devops-pat',scopes:['vso.project','vso.work']});});
 await page.getByRole('button',{name:'Add connection',exact:true}).click();await page.getByLabel('Connection type',{exact:true}).selectOption('ado-azure-cli');
 assert.equal(await page.getByLabel('Approved public application client ID',{exact:true}).count(),0);
 for(const label of ['Expected corporate Entra object ID','Expected corporate tenant ID','Expected Azure DevOps organization ID','Expected Azure DevOps user ID','Project ID for approved health reads','Team ID for the settings health read'])await page.getByLabel(label,{exact:true}).fill(guid);
 await page.getByLabel('Pinned Azure CLI executable').fill('/fixture/az');await page.getByLabel('Corporate CLI profile directory').fill('/fixture/corporate');await page.getByLabel('Executable SHA-256').fill('a'.repeat(64));await page.getByLabel('Expected organization URL',{exact:true}).fill('https://dev.azure.com/fixture');await page.getByLabel('Work item ID for the read and exact-ID query',{exact:true}).fill('7');await page.getByLabel('Fixture workspace',{exact:true}).check();await page.getByRole('button',{name:'Save configuration',exact:true}).click();await page.getByRole('button',{name:'Check CLI session',exact:true}).waitFor();
 const cli=await page.evaluate(()=>fixture.calls.at(-1).definition);assert.equal(cli.authentication.cli.profileDirectory,'/fixture/corporate');assert.equal(cli.authentication.clientId,undefined);
 await page.getByRole('button',{name:'Add connection',exact:true}).click();await page.getByLabel('Connection type',{exact:true}).selectOption('ado-pat');
 for(const label of ['Expected Azure DevOps user ID','Expected Azure DevOps organization ID','Project ID for approved health reads','Team ID for the settings health read'])await page.getByLabel(label,{exact:true}).fill(guid);
 await page.getByLabel('Expected organization URL',{exact:true}).fill('https://dev.azure.com/fixture');await page.getByLabel('PAT expiry (UTC timestamp)',{exact:true}).fill('2030-01-01T00:00:00Z');await page.getByLabel('Work item ID for the read and exact-ID query',{exact:true}).fill('7');await page.getByLabel('Fixture workspace',{exact:true}).check();await page.getByRole('button',{name:'Save configuration',exact:true}).click();await page.getByRole('button',{name:'Enter / replace PAT',exact:true}).click();
 const patDefinition=await page.evaluate(()=>fixture.calls.at(-1).definition);assert.equal(patDefinition.authentication.clientId,undefined);assert.equal(patDefinition.expected.tenant,guid);assert.deepEqual(patDefinition.expected.scopes,['vso.project','vso.work']);
 await page.getByLabel('Account email',{exact:true}).fill('fixture@example.test');await page.getByLabel('Personal access token',{exact:true}).fill('synthetic-pat');await page.getByRole('button',{name:'Verify and store PAT',exact:true}).click();await page.locator('[data-pat-entry]').waitFor({state:'detached'});
 const stored=await page.evaluate(()=>fixture.calls.at(-1));assert.equal(stored.action,'store-pat');assert.equal(stored.pat,'synthetic-pat');assert.ok(!JSON.stringify(patDefinition).includes('synthetic-pat'));assert.ok(!await page.evaluate(()=>JSON.stringify({...localStorage}).includes('synthetic-pat')));
 // Browser-first Atlassian owner flow: no manual identity/scope fields, explicit site/workspace confirmation.
 await page.evaluate(async()=>{
  fixture.active=false;
  const {mountManagedConnections}=await import('/public/features/settings/managed-connections.js');
  const snapshot={...fixture.snapshot,connections:[],atlassianSetup:null,adapters:[{id:'atlassian-oauth-v2',name:'Atlassian / Jira',onboarding:true,endpoint:'https://mcp.atlassian.com/v1/mcp/authv2',capabilities:[]}]};
  window.onboard={calls:[],active:true};
  document.querySelector('#host').replaceChildren();
  await mountManagedConnections(document.querySelector('#host'),{escape:v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),api:async(_route,args)=>{
   if(!args)return snapshot;onboard.calls.push(args);
   if(args.action==='atlassian-setup-start')return {id:'setup',state:'authorizing',message:'Approve in Atlassian'};
   if(args.action==='atlassian-setup-status')return {id:'setup',state:'review',account:{id:'discovered-person',name:'Fixture Person'},sites:[{id:'discovered-site',name:'Engineering',url:'https://engineering.atlassian.net'}]};
   if(args.action==='atlassian-setup-confirm')return {connectionId:'confirmed'};
  }},()=>onboard.active);
 });
 await page.getByRole('button',{name:'Add connection',exact:true}).click();
 assert.equal(await page.getByLabel('Expected Atlassian account ID').count(),0);assert.equal(await page.getByLabel('Approved OAuth scopes (one per line)').count(),0);
 await page.getByRole('button',{name:'Connect Atlassian',exact:true}).click();await page.getByRole('heading',{name:'Signed in as Fixture Person'}).waitFor();
 assert.equal(await page.getByLabel('Jira site',{exact:true}).inputValue(),'','Never silently select an account site');
 await page.getByLabel('Jira site',{exact:true}).selectOption('discovered-site');await page.getByLabel('Fixture workspace',{exact:true}).check();await page.getByLabel('Optional Jira issue to test').fill('FIXTURE-1');
 await page.getByRole('button',{name:'Confirm account and connect',exact:true}).click();await page.getByRole('button',{name:'Add connection',exact:true}).waitFor();
 const confirmation=await page.evaluate(()=>onboard.calls.at(-1));assert.equal(confirmation.action,'atlassian-setup-confirm');assert.equal(confirmation.siteId,'discovered-site');assert.deepEqual(confirmation.workspaceIds,['workspace']);assert.equal(confirmation.principal,undefined);assert.equal(confirmation.scopes,undefined);assert.equal(await page.evaluate(()=>onboard.calls.filter(c=>c.action==='atlassian-setup-start').length),1);
 await page.evaluate(()=>onboard.active=false);
 // Restore original form fixture for brand/layout comparison.
 await page.evaluate(ado=>{fixture.snapshot.connections=[{...ado,status:{state:'unchecked'},references:[],active:false}];},ado);
 // Exercise the composed page: managed first, legacy inventory lazy, two brands and narrow layout.
 await page.evaluate(async()=>{
  const ado=fixture.snapshot.connections[0];ado.references=[{id:'fixture-schedule'}];ado.active=true;
  ado.status={state:'sign-in-required',credentialStore:'available',authentication:'unverified',transport:'unchecked',access:'unverified',ownerSignIn:{nextAction:'Sign in with the approved corporate account to verify access.'}};
  const jira={...structuredClone(ado),id:'jira-fixture',name:'hc-atlassian',label:'Engineering Jira',active:false,references:[],authentication:{adapter:'atlassian-oauth-v2'},transport:{endpoint:'https://mcp.atlassian.com/v1/mcp/authv2'},expected:{principal:'engineering@example.test',tenant:'fixture-site',resource:'https://engineering.atlassian.net'},status:{state:'ready',credentialStore:'available',authentication:'verified',transport:'connected',access:'verified',verified:{principal:'engineering@example.test',resource:'https://engineering.atlassian.net'},lastSuccessfulRead:'2026-11-05T12:00:00Z',capabilities:['jira.issue.read','jira.issue.search']}};
  fixture.snapshot.connections=[jira,ado];fixture.inventoryLoads=0;
  document.body.innerHTML='<main id="main" style="height:100vh;padding:28px;overflow:auto"></main>';
  const {initEngineRoom,renderEngineRoom}=await import('/public/features/settings/engine-room.js');
  initEngineRoom({state:{page:'engine',engineSection:'integrations',data:{runs:[]}},escape:v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),toast:()=>{},api:async(route)=>{if(route==='/api/managed-connections')return fixture.snapshot;if(route==='/api/integrations'){fixture.inventoryLoads++;return {consumers:[],configurations:[]};}throw Error('Unexpected fixture request');}});
  renderEngineRoom('integrations');
 });
 await page.locator('[data-connection]').nth(1).waitFor();
 assert.equal(await page.locator('#engine-content > :first-child').getAttribute('class'),'managed-connections');
 assert.equal(await page.evaluate(()=>fixture.inventoryLoads),0);
 assert.equal(await page.locator('.connection-logo svg').count(),2);
 await page.setViewportSize({width:1320,height:1050});
 const gap=await page.locator('.managed-connection-grid').evaluate(node=>parseFloat(getComputedStyle(node).gap));assert.ok(gap>=20);
 if(process.env.PROTEUS_UI_ARTIFACTS){fs.mkdirSync(process.env.PROTEUS_UI_ARTIFACTS,{recursive:true});await page.screenshot({path:path.join(process.env.PROTEUS_UI_ARTIFACTS,'connections-desktop.png')});}
 await page.locator('[data-connection]').nth(1).locator('.connection-details summary').click();
 assert.equal(await page.locator('[data-connection]').nth(1).locator('[data-managed-remove]').isDisabled(),true);
 assert.equal(await page.locator('[data-connection]').nth(1).locator('[data-managed-edit]').isDisabled(),true);
 await page.locator('[data-connection]').nth(1).locator('.connection-details summary').click();
 for(const width of [768,390]){
  await page.setViewportSize({width,height:1000});
  assert.equal(await page.locator('#main').evaluate(node=>node.scrollWidth<=node.clientWidth),true);
  assert.equal(await page.locator('[data-connection]').first().evaluate(node=>node.scrollWidth<=node.clientWidth),true);
 }
 if(process.env.PROTEUS_UI_ARTIFACTS)await page.screenshot({path:path.join(process.env.PROTEUS_UI_ARTIFACTS,'connections-mobile.png')});
 await page.getByText('Other MCP configurations',{exact:true}).click();await page.getByRole('heading',{name:'MCP configuration inventory',exact:true}).waitFor();assert.equal(await page.evaluate(()=>fixture.inventoryLoads),1);
 assert.deepEqual(errors,[]);await page.evaluate(()=>fixture.active=false);console.log(JSON.stringify({passed:true,electron:true,explicitAccountWorkspace:true,distinctJiraProbes:true,explicitAdoClientAndCorporateBinding:true,staleEditDraftRetained:true,disableAndRemove:true,noCredentialValues:true}));
}finally{await app?.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(temporary,{recursive:true,force:true});}
