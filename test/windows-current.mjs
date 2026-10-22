// Exact-package Windows acceptance with no developer tool directories in PATH.
// Every fixture is disposable; this never loads the installed Proteus data home.
import {_electron as electron} from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {privateTemporaryDirectory} from '../src/private-paths.cjs';

if(process.platform!=='win32'||!process.argv[2])throw new Error('Supply an exact packaged Windows executable.');
const executablePath=fs.realpathSync(process.argv[2]),bundle=path.dirname(executablePath),root=path.join(bundle,'resources','app');
const metadata=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-windows-acceptance-')),workspace=path.join(home,'workspace');fs.mkdirSync(workspace);
fs.writeFileSync(path.join(home,'settings.json'),JSON.stringify({schemaVersion:1,provider:'codex',model:'',timezone:'UTC',workspace:{cwd:workspace,additionalDirectories:[]},skillDirectories:[],mcpServers:{}}));
const env=Object.fromEntries(['SystemRoot','WINDIR','ComSpec','USERPROFILE','HOMEDRIVE','HOMEPATH','APPDATA','LOCALAPPDATA','TEMP','TMP','COMPUTERNAME'].filter(key=>process.env[key]).map(key=>[key,process.env[key]]));
env.PATH=[path.join(env.SystemRoot,'System32'),env.SystemRoot,path.join(env.SystemRoot,'System32','WindowsPowerShell','v1.0')].join(';');
const launch=()=>electron.launch({executablePath,cwd:workspace,args:['--user-data-dir='+path.join(home,'browser')],env:{...env,PROTEUS_HOME:home,PORT:'0'},timeout:60000});
const until=async(check,label)=>{const end=Date.now()+30000;while(!await check()){if(Date.now()>end)throw new Error('Timed out: '+label);await new Promise(resolve=>setTimeout(resolve,100));}};
let app;const checks=[],errors=[];
try {
  for(const name of ['.git','.env','.codex','work','outputs','web','test','scripts'])assert.equal(fs.existsSync(path.join(root,name)),false,'Exclude '+name);
  assert.equal(fs.existsSync(path.join(root,'node_modules','electron-builder')),false);
  checks.push('runtime package excludes source tools and private state');
  app=await launch();app.process().stderr.on('data',chunk=>process.stderr.write(chunk));let page=await app.firstWindow();page.on('pageerror',error=>errors.push(error.message));try{await page.locator('#topbar-home').waitFor({timeout:60000});}catch(error){console.error('Startup page:',page.url(),await page.locator('body').innerText(),'Renderer errors:',errors);if(process.env.PROTEUS_SCREENSHOT)await page.screenshot({path:path.resolve(process.env.PROTEUS_SCREENSHOT)});throw error;}
  const first=await app.evaluate(async({app})=>{const service=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService();const catalog=await service.catalogs.codex.get();return {version:app.getVersion(),home:service.home,hostId:service.remote.info().hostId,provider:{available:catalog.available,modelCount:catalog.models?.length||0,error:catalog.error||null}};});
  assert.equal(first.version,metadata.version);assert.equal(fs.realpathSync(first.home),home);assert.match(first.hostId,/^[a-f0-9-]{36}$/);checks.push('packaged renderer and owner start with developer PATH unavailable');
  if(process.env.PROTEUS_SCREENSHOT)await page.screenshot({path:path.resolve(process.env.PROTEUS_SCREENSHOT)});
  await page.getByRole('button',{name:'Default workspace',exact:true}).click();
  await page.getByRole('button',{name:/New chat/i}).first().click();const provider=page.getByRole('combobox',{name:'Provider',exact:true});await provider.waitFor();
  const providers=await provider.locator('option').evaluateAll(options=>options.map(option=>option.value));assert.ok(providers.includes('codex'));checks.push('native New Chat surface exposes provider controls');
  await page.keyboard.press('Escape');
  const session=await page.evaluate(async()=>{
    const state=await window.desktop.terminal({action:'state'}),profiles=state.profiles.profiles;
    profiles[0]={...profiles[0],command:"[Console]::WriteLine('WINDOWS_PTY_READY'); $answer=[Console]::ReadLine(); [Console]::WriteLine('WINDOWS_INPUT:'+$answer)"};
    await window.desktop.terminal({action:'save-profiles',profiles,expectedRevision:state.profiles.revision});return window.desktop.terminal({action:'create'});
  });
  const snapshot=()=>page.evaluate(id=>window.desktop.terminal({action:'snapshot',id}),session.id);
  await until(async()=>(await snapshot()).data.includes('WINDOWS_PTY_READY'),'native PowerShell output');
  await page.evaluate(id=>window.desktop.terminal({action:'write',id,data:'SYNTHETIC_INPUT\r'}),session.id);
  await until(async()=>(await snapshot()).data.includes('WINDOWS_INPUT:SYNTHETIC_INPUT'),'native PowerShell input');
  await until(async()=>(await snapshot()).session.status==='exited','native terminal exit');
  assert.equal((await snapshot()).session.exitCode,0);checks.push('bundled native PTY exchanges input/output and exits normally');
  const rehearsal=await app.evaluate(({app},cwd)=>{const service=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService();return service.engine.createRun({schemaVersion:1,id:'windows-persistence-rehearsal',name:'Windows persistence rehearsal',enabled:false,cron:'0 9 * * *',timezone:'UTC',provider:'rehearsal',model:'',workspace:{cwd,additionalDirectories:[]},misfire:'skip',prompt:'REHEARSAL ONLY: validate local state persistence; no real model or external workflow.'},'chat').id;},workspace);
  const rehearsalState=()=>JSON.parse(fs.readFileSync(path.join(home,'runs',rehearsal+'.json'),'utf8'));
  await until(async()=>{const run=rehearsalState();assert.notEqual(run.status,'failed');if(run.status==='awaiting_input'&&run.pending?.type==='question'){assert.equal(run.pending.question,'This sample run needs feedback. What should the next checkpoint focus on?');await app.evaluate(({app},{id,requestId})=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService().engine.reply(id,'REHEARSAL ONLY: finish persistence verification.',requestId),{id:rehearsal,requestId:run.pending.id});}return run.status==='completed';},'rehearsal persistence while another process reads state');
  const savedEvents=rehearsalState().events;checks.push('explicit rehearsal completes while a separate process reads its atomically replaced state');
  const screenshot=process.env.PROTEUS_SCREENSHOT;if(screenshot)await page.screenshot({path:path.resolve(screenshot)});
  await app.close();app=await launch();page=await app.firstWindow();page.on('pageerror',error=>errors.push(error.message));await page.locator('#topbar-home').waitFor({timeout:60000});
  const second=await app.evaluate(({app})=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService().remote.info().hostId);assert.equal(second,first.hostId);
  const restored=await page.evaluate(id=>window.desktop.terminal({action:'snapshot',id}),session.id);assert.equal(restored.live,false);assert.ok(restored.data.includes('WINDOWS_INPUT:SYNTHETIC_INPUT'));checks.push('restart retains host identity and terminal history without replay');
  assert.equal(rehearsalState().status,'completed');assert.deepEqual(rehearsalState().events,savedEvents);checks.push('completed rehearsal history survives restart unchanged');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,version:metadata.version,buildRevision:metadata.buildRevision,checks,provider:first.provider,scope:'synthetic Windows package acceptance; no production state or workflows'}));
} finally {if(app)await app.close();fs.rmSync(home,{recursive:true,force:true,maxRetries:10,retryDelay:100});}
