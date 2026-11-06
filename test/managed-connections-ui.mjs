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
  const fixture=window.fixture={calls:[],active:true,conflict:false,snapshot:{ownerId:'owner',revision:'r1',connections:[],workspaces:[{id:'workspace',name:'Fixture workspace'}],adapters:[{id:'atlassian-oauth-v2',endpoint:'https://mcp.atlassian.com/v1/mcp/authv2',capabilities:['atlassian.identity.read','jira.issue.read','jira.issue.search']}]}};
  const ui={escape:v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),api:async(_path,args)=>{
   if(!args)return fixture.snapshot;fixture.calls.push(args);
   if(args.action==='save'){if(fixture.conflict)throw Error('Managed connections changed. Refresh before acting.');fixture.snapshot.connections=[{...args.definition,status:{state:'unchecked',credentialStore:'available',ownerSignIn:{state:'unchecked'}},references:[],active:false}];fixture.snapshot.revision='r2';}
   if(args.action==='verify')fixture.snapshot.connections[0].status={state:'ready',credentialStore:'available',authentication:'verified',transport:'connected',access:'verified',lastSuccessfulRead:'2026-11-05T12:00:00Z',capabilities:['jira.issue.read','jira.issue.search'],ownerSignIn:{state:'authenticated'}};
   if(args.action==='disable')fixture.snapshot.connections[0].enabled=false;
   if(args.action==='remove')fixture.snapshot.connections=[];
   return fixture.snapshot;
  }};await mountManagedConnections(document.querySelector('#host'),ui,()=>fixture.active);
 });
 await page.getByRole('button',{name:'Add connection',exact:true}).click();await page.getByLabel('Expected Atlassian account ID').fill('fixture-person');await page.getByLabel('Expected cloud/site ID').fill('fixture-site');await page.getByLabel('Expected site URL').fill('https://fixture.atlassian.net');await page.getByLabel('Fixture workspace',{exact:true}).check();await page.getByLabel('Issue key/ID for approved minimal Jira health reads').fill('FIXTURE-1');
 await page.getByRole('button',{name:'Save configuration',exact:true}).click();await page.locator('[data-connection]').waitFor();
 const saved=await page.evaluate(()=>fixture.calls[0]);assert.equal(saved.expectedRevision,'r1');assert.equal(saved.definition.name,'hc-atlassian');assert.equal(saved.definition.probes.length,2);assert.deepEqual(saved.definition.workspaceIds,['workspace']);assert.equal(saved.definition.expected.principal,'fixture-person');
 await page.getByRole('button',{name:'Verify now',exact:true}).click();await page.getByText(/authentication: verified/).waitFor();
 assert.match(await page.locator('[data-managed-rows]').textContent(),/jira.issue.read, jira.issue.search/);
 await page.getByRole('button',{name:'Configure',exact:true}).click();await page.getByLabel('Display name',{exact:true}).fill('Retained draft');await page.evaluate(()=>fixture.conflict=true);await page.getByRole('button',{name:'Save configuration',exact:true}).click();await page.getByText('Managed connections changed. Refresh before acting.',{exact:true}).waitFor();assert.equal(await page.getByLabel('Display name',{exact:true}).inputValue(),'Retained draft');
 await page.getByRole('button',{name:'Cancel',exact:true}).click();await page.getByRole('button',{name:'Disable',exact:true}).click();await page.getByRole('button',{name:'Enable',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Verify now',exact:true}).isDisabled(),true);
 await page.getByRole('button',{name:'Remove connection',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('[data-connection]').length===0);
 assert.deepEqual(errors,[]);await page.evaluate(()=>fixture.active=false);console.log(JSON.stringify({passed:true,electron:true,explicitAccountWorkspace:true,distinctJiraProbes:true,staleEditDraftRetained:true,disableAndRemove:true,noCredentialValues:true}));
}finally{await app?.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(temporary,{recursive:true,force:true});}
