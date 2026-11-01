// Source-mode reproduction of the packaged rehearsal → terminal keyboard → restart path.
// Disposable fixture only; package identity remains a separate frozen-artifact gate.
import { _electron as electron } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { hostPlatformMetadata } from '../src/shared/host-platform.js';
const sourceRoot=process.env.PROTEUS_TEST_SOURCE_ROOT||path.resolve('.');
const metadata=JSON.parse(fs.readFileSync(path.join(sourceRoot,'package.json'),'utf8')); 
const checks=[];
  const temporary = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'proteus-package-ui-')));
  const workspace = path.join(temporary, 'workspace');
  fs.mkdirSync(workspace); fs.mkdirSync(path.join(temporary, 'schedules'));
  fs.writeFileSync(path.join(temporary, 'settings.json'), JSON.stringify({ schemaVersion: 1, provider: 'rehearsal', model: '', timezone: 'UTC', workspace: { cwd: workspace, additionalDirectories: [] }, copilotDataDirectory: path.join(temporary, 'copilot'), skillDirectories: [], mcpServers: {} }));
  fs.writeFileSync(path.join(temporary, 'schedules/workspace-pulse.json'), JSON.stringify({ schemaVersion: 1, id: 'workspace-pulse', name: 'Synthetic package rehearsal', enabled: false, cron: '0 9 * * 1-5', timezone: 'UTC', provider: 'rehearsal', model: '', workspace: { cwd: workspace, additionalDirectories: [] }, misfire: 'skip', prompt: 'Synthetic package feedback rehearsal. No model calls.' }));
  // Preserve only OS launch/display settings. Provider paths deliberately fail
  // before any CLI can inspect existing credentials, even on a signed-in machine.
  const inherited = ['PATH', 'HOME', 'USER', 'LOGNAME', 'SHELL', 'LANG', 'LC_ALL', 'DISPLAY', 'WAYLAND_DISPLAY', 'XAUTHORITY', 'XDG_RUNTIME_DIR', 'DBUS_SESSION_BUS_ADDRESS', 'TMPDIR', 'TMP', 'TEMP'];
  const env = Object.fromEntries(inherited.filter(key => process.env[key] !== undefined).map(key => [key, process.env[key]]));
  Object.assign(env, { PROTEUS_HOME: temporary, PORT: '0', COPILOT_HOME: path.join(temporary, 'copilot'), COPILOT_CLI_PATH: path.join(temporary, 'unavailable-copilot'), PROTEUS_CODEX_PATH: path.join(temporary, 'unavailable-codex'), PROTEUS_CLAUDE_PATH: path.join(temporary, 'unavailable-claude'), CLAUDE_CONFIG_DIR: path.join(temporary, 'claude') });
  let application;
  const errors = [];
  const closeApplication = async () => {
    if (!application) return;
    const current = application, child = current.process(); application = null;
    let timer;
    const closed = await Promise.race([current.close().then(() => true, () => false), new Promise(resolve => { timer = setTimeout(() => resolve(false), 10_000); })]);
    clearTimeout(timer);
    if (!closed && !child.killed) child.kill('SIGKILL');
  };
  const until = async (callback, label) => {
    const end = Date.now() + 30_000;
    while (!await callback()) { if (Date.now() >= end) throw new Error('Timed out: ' + label); await new Promise(resolve => setTimeout(resolve, 100)); }
  };
  const launch = async () => {
    application = await electron.launch({ args: [sourceRoot, ...(process.platform === 'darwin' ? ['--use-mock-keychain'] : ['--password-store=basic']), '--user-data-dir=' + path.join(temporary, 'browser')], env, timeout: 60_000 });
    const page = await application.firstWindow(); page.setDefaultTimeout(20_000); page.on('pageerror', error => errors.push(error.message));
    await page.locator('#topbar-home').waitFor();
    const isolation = await application.evaluate(({ app }) => ({ home: process.env.PROTEUS_HOME, browser: app.getPath('userData'), version: app.getVersion(), mock: app.commandLine.hasSwitch('use-mock-keychain') }));
    assert.equal(isolation.home, temporary); assert.equal(isolation.browser, path.join(temporary, 'browser')); assert.equal(isolation.version, metadata.version);
    if (process.platform === 'darwin') assert.equal(isolation.mock, true, 'Disposable Mac tests must use mock Keychain');
    return page;
  };
  const runs = () => application.evaluate(({ app }) => process.mainModule.require(app.getAppPath() + '/desktop/main.cjs').getService().engine.listRuns().map(run => ({ id: run.id, status: run.status, provider: run.schedule.provider, events: run.events, usage: run.usage })));
  try {
    let page = await launch();
    // Pause after the renderer captures its local tabs, before it reads owner
    // membership. The owner operation uses the actual synthetic service.
    const overlap=[],cdp=await page.context().newCDPSession(page);await cdp.send('Debugger.enable');
    const syncText=fs.readFileSync(path.join(sourceRoot,'public/models/content-tab-sync.js'),'utf8').split('\n');
    const syncLine=syncText.findIndex(line=>line.includes("let raw=await request(scope,'get'"));
    const removalLine=fs.readFileSync(path.join(sourceRoot,'public/app.js'),'utf8').split('\n').findIndex(line=>line.includes('for(const tab of list.slice()){const id=await descriptorId(tab);'));
    assert.ok(syncLine>=0&&removalLine>=0,'controlled overlap breakpoints exist');
    let armed=true,barrierError=null;
    const syncBp=await cdp.send('Debugger.setBreakpointByUrl',{urlRegex:'.*/content-tab-sync\\.js$',lineNumber:syncLine,condition:"scope.scope==='main' && local.some(t=>t.type==='terminal') && (record.baseline||[]).some(t=>t.type==='browser')"});
    const applyBp=await cdp.send('Debugger.setBreakpointByUrl',{urlRegex:'.*/app\\.js$',lineNumber:removalLine,condition:"membershipOnly && list.some(t=>t.type==='terminal')"});
    cdp.on('Debugger.paused',async event=>{try{
      const f=event.callFrames[0];
      if(event.hitBreakpoints.includes(syncBp.breakpointId)&&armed){
        armed=false;
        const v=await cdp.send('Debugger.evaluateOnCallFrame',{callFrameId:f.callFrameId,expression:"({baseline:record.baseline.map(t=>({id:t.id,type:t.type})),local:local.map(t=>({id:t.id,type:t.type}))})",returnByValue:true});
        const before=v.result.value,old=before.baseline.find(t=>t.type==='browser');assert.ok(old);
        const owner=await application.evaluate(async({app},id)=>{const service=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService().contentTabs;const before=await service.getAsync('main','main');if(before.tabs.some(t=>t.id===id))await service.mutateAsync({scope:'main',id:'main',expectedRevision:before.revision,operations:[{action:'close',id}]});const after=await service.getAsync('main','main');return {before,after};},old.id);
        assert.ok(!owner.after.tabs.some(t=>t.id===old.id));assert.ok(!owner.after.tabs.some(t=>before.local.some(l=>l.type==='terminal'&&l.id===t.id)));
        console.log('CONTROLLED OWNER BARRIER',JSON.stringify({capture:before,ownerBefore:owner.before.tabs,ownerAfter:owner.after.tabs,closed:old.id}));
      }else if(event.hitBreakpoints.includes(applyBp.breakpointId)){
        const value=await cdp.send('Debugger.evaluateOnCallFrame',{callFrameId:f.callFrameId,expression:`({scope,captured:captured.map(x=>({id:x.id,type:x.type})),descriptors:descriptors.map(x=>({id:x.id,type:x.type})),removedIds,membershipOnly,list:list.map(t=>({id:t.id,type:t.type})),active:state.tab})`,returnByValue:true});if(value.result.value){overlap.push(value.result.value);console.log('ACTUAL MEMBERSHIP APPLY',JSON.stringify(value.result.value));}
      }
    }catch(error){barrierError=error;console.error('BARRIER ERROR',error.stack);}finally{await cdp.send('Debugger.resume').catch(()=>{});}});
    const observation = await page.evaluate(async () => { const response=await fetch('/api/state');const text=await response.text();let body;try{body=JSON.parse(text)}catch{body={}};return {status:response.status,keys:Object.keys(body),error:response.ok?null:text.slice(0,512),body}; });
    console.log('Synthetic state response:',JSON.stringify({status:observation.status,keys:observation.keys,error:observation.error}));assert.equal(observation.status,200);const state=observation.body;
    const homeInfo = await page.evaluate(async () => (await fetch('/api/home')).json());
    assert.equal(homeInfo.version, metadata.version); assert.equal(homeInfo.buildRevision, metadata.buildRevision);
    for (const [key, value] of Object.entries(hostPlatformMetadata())) assert.equal(state[key], value, 'Authenticated local platform metadata: ' + key);
    await until(() => application.evaluate(({ app }) => {
      const catalogs = process.mainModule.require(app.getAppPath() + '/desktop/main.cjs').getService().catalogs;
      return ['copilot', 'codex', 'claude'].every(id => catalogs[id].value?.available === false);
    }), 'unavailable credential-free provider catalogs');
    checks.push('isolated UI startup, shared platform metadata and unavailable provider catalogs');
    await page.locator('[data-page="schedules"]').click();
    await page.getByRole('row').filter({ hasText: 'Synthetic package rehearsal' }).click();
    await page.locator('#run-now').click(); await page.locator('#answer').waitFor();
    await page.locator('#answer').fill('SYNTHETIC_PACKAGE_CHECKPOINT'); await page.locator('#reply').click();
    await until(async () => (await runs())[0]?.status === 'completed', 'synthetic rehearsal completes');
    const [run] = await runs(); assert.equal(run.provider, 'rehearsal'); assert.equal(run.usage.observed, false);
    assert.ok(run.events.some(event => event.role === 'assistant' && event.text.includes('no AI provider was called')));
    assert.ok(run.events.some(event => event.role === 'assistant' && event.text.includes('SYNTHETIC_PACKAGE_CHECKPOINT')));
    checks.push('explicit synthetic rehearsal and feedback; no provider usage invented');
    await page.evaluate(async () => {
      const state = await window.desktop.terminal({ action: 'state' }), profiles = state.profiles.profiles;
      profiles[0] = { ...profiles[0], name: 'Synthetic native PTY', shell: '/bin/sh', command: 'printf "PACKAGE_PTY_READY\\n"; read answer; printf "PACKAGE_PTY_INPUT:%s\\n" "$answer"; read finish' };
      await window.desktop.terminal({ action: 'save-profiles', profiles, expectedRevision: state.profiles.revision });
    });
    await page.locator('#tab-add-menu summary').click();
    // Ensure the owner has observed the blank browser before replacing it with
    // a terminal, reproducing the closed-browser/new-terminal overlap.
    await until(()=>application.evaluate(async({app})=>(await process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService().contentTabs.getAsync('main','main')).tabs.some(t=>t.type==='browser')),'owner observes blank browser');
    await page.locator('#browser-area .new-tab-actions').getByRole('button', { name: 'Terminal', exact: true }).click();
    await page.locator('#terminal-session').selectOption('process'); await page.getByRole('button', { name: 'Open terminal', exact: true }).last().click();
    await until(()=>barrierError||overlap.length,'controlled membership apply');if(barrierError)throw barrierError;
    assert.ok(overlap.some(row=>row.membershipOnly&&row.removedIds.length&&row.list.some(t=>t.type==='terminal'&&t.id===row.active)&&row.captured.some(t=>t.type==='terminal'&&t.id===row.active)&&!row.descriptors.some(t=>t.id===row.active)),'confirmed owner removal and selected local terminal absent from owner response');
    await page.locator('.terminal-canvas canvas').waitFor({state:'visible',timeout:5000});
    const terminal = (await page.evaluate(() => window.desktop.terminal({ action: 'state' }))).sessions[0]; assert.ok(terminal?.id);
    const snapshot = () => page.evaluate(id => window.desktop.terminal({ action: 'snapshot', id }), terminal.id);
    await until(async () => (await snapshot()).data.includes('PACKAGE_PTY_READY'), 'native PTY output');
    await page.locator('.terminal-canvas').click(); await page.keyboard.type('SYNTHETIC_INPUT'); await page.keyboard.press('Enter');
    await until(async () => (await snapshot()).data.includes('PACKAGE_PTY_INPUT:SYNTHETIC_INPUT'), 'keyboard reaches packaged native PTY');
    await until(()=>application.evaluate(async({app},id)=>(await process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService().contentTabs.getAsync('main','main')).tabs.some(t=>t.id==='terminal:'+id),terminal.id),'owner converges on opened terminal after refresh');
    assert.equal(await page.locator('[data-tab-container="terminal:' + terminal.id + '"]').getAttribute('class').then(value=>value?.includes('selected')),true,'terminal remains selected after owner convergence and refresh');
    await page.locator('.terminal-canvas canvas').waitFor({state:'visible',timeout:5000});
    console.log('POST-REFRESH SELECTION AND REAL KEYBOARD',JSON.stringify({terminalId:terminal.id,selected:true,output:'PACKAGE_PTY_INPUT:SYNTHETIC_INPUT'}));
    await page.locator('[data-close="terminal:' + terminal.id + '"]').click();
    assert.ok(overlap.some(row=>row.membershipOnly&&row.removedIds.length&&row.list.some(t=>t.type==='terminal'&&t.id===row.active)&&row.captured.some(t=>t.type==='terminal'&&t.id===row.active)&&!row.descriptors.some(t=>t.id===row.active)),'actual owner membership removal overlaps a selected uncommitted terminal');
    checks.push('owner removal overlaps pending selected terminal without losing keyboard input');
    checks.push('source-mode native terminal and keyboard input through canvas');
    await closeApplication(); page = await launch();
    const restored = await runs(); assert.equal(restored.length, 1); assert.equal(restored[0].id, run.id); assert.equal(restored[0].status, 'completed');
    assert.equal(restored[0].usage.observed, false); assert.ok(restored[0].events.some(event => event.text?.includes('SYNTHETIC_PACKAGE_CHECKPOINT')));
    checks.push('same rehearsal history survives packaged app restart'); assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, version: metadata.version, buildRevision: metadata.buildRevision, mode: 'source-mode; package provenance not checked', platform: process.platform, credentials: process.platform === 'darwin' ? 'disposable mock Keychain; real store unverified' : 'disposable basic cookie store; real keyring unverified', checks }));
  } finally {
    await closeApplication();
    fs.rmSync(temporary, { recursive: true, force: true });
  }

