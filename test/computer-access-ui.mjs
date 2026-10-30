// Disposable native renderer acceptance; synthetic devices never connect to a real relay.
import {_electron as electron} from 'playwright';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-managed-ui-')),workspace=path.join(home,'workspace');fs.mkdirSync(workspace);
fs.writeFileSync(path.join(home,'settings.json'),JSON.stringify({schemaVersion:1,provider:'rehearsal',model:'',timezone:'UTC',workspace:{cwd:workspace,additionalDirectories:[]},skillDirectories:[],mcpServers:{}}));
const inherited=['PATH','HOME','USER','LOGNAME','SHELL','LANG','LC_ALL','DISPLAY','WAYLAND_DISPLAY','XAUTHORITY','XDG_RUNTIME_DIR','DBUS_SESSION_BUS_ADDRESS','TMPDIR'];
const env=Object.fromEntries(inherited.filter(key=>process.env[key]!==undefined).map(key=>[key,process.env[key]]));
Object.assign(env,{PROTEUS_HOME:home,PORT:'0',COPILOT_HOME:path.join(home,'copilot'),COPILOT_CLI_PATH:path.join(home,'unavailable-copilot'),PROTEUS_CODEX_PATH:path.join(home,'unavailable-codex'),PROTEUS_CLAUDE_PATH:path.join(home,'unavailable-claude'),CLAUDE_CONFIG_DIR:path.join(home,'claude')});
let app;const errors=[];
try{
 app=await electron.launch({args:['.','--use-mock-keychain','--password-store=basic','--user-data-dir='+path.join(home,'browser')],env});
 const page=await app.firstWindow();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));await page.locator('#topbar-home').waitFor();
 await app.evaluate(({app})=>{
  const main=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs'),service=main.getService(),peers=main.getDesktopPeers();
  peers.loaded=true;peers.records.set('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',{hostId:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',label:'Synthetic retained destination',paused:true});
  peers.syntheticRole={managed:false,revision:'cccccccc-cccc-cccc-cccc-cccccccccccc'};
  peers.request=async(id,method,args)=>{if(id!=='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')throw Error('Unexpected synthetic host');if(method==='computer.access.get')return peers.syntheticRole;if(method==='computer.access.update'){if(args.expectedRevision!==peers.syntheticRole.revision)throw Error('Stale synthetic role');peers.syntheticRole={managed:args.managed,revision:'dddddddd-dddd-dddd-dddd-dddddddddddd'};return peers.syntheticRole;}throw Error('Unexpected synthetic command');};
  service.remote.config.devices.push({id:'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',name:'Synthetic incoming controller',key:'00'.repeat(32),pairedAt:new Date().toISOString(),resourceAccess:true});
 });
 const open=async()=>{await page.locator('[data-page="engine"]').click();await page.locator('[data-engine-section="connections"]').click();await page.locator('#computer-managed').waitFor();};
 await open();await page.locator('#peer-code').waitFor();assert.equal(await page.locator('#computer-managed').isChecked(),false);
 await page.locator('[data-peer-access]').click();await page.locator('#peer-computer-managed').check();await page.locator('#dialog-submit').click();await page.locator('#peer-computer-managed').waitFor({state:'hidden'});
 assert.equal(await app.evaluate(({app})=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getDesktopPeers().syntheticRole.managed),true);assert.equal(await page.locator('#computer-managed').isChecked(),false,'editing the destination role does not change the controller role');
 await page.locator('#remote-label').fill('Unsaved incoming connection name');await page.locator('#computer-managed').check();await page.locator('[data-save-computer-access]').click();await page.locator('[data-outgoing-blocked]').waitFor();
 assert.equal(await page.locator('#peer-code').count(),0);assert.equal(await page.locator('[data-peer-access]').count(),0);assert.equal(await page.locator('#remote-label').inputValue(),'Unsaved incoming connection name');
 assert.match(await page.locator('#paired-device-list').innerText(),/Synthetic incoming controller/);assert.equal(await page.locator('[data-resource-access]').isChecked(),true);
 assert.equal(JSON.parse(fs.readFileSync(path.join(home,'computer-access.json'))).managed,true);
 const state=await app.evaluate(async({app})=>{const main=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs');return {peers:main.getDesktopPeers().list(),index:await main.getDesktopPeers().index(),computers:main.getService().chatControl.computers()};});
 assert.deepEqual(state.peers,[]);assert.deepEqual(state.index.items,[]);assert.equal(state.computers.length,1);assert.equal(state.computers[0].local,true);
 await page.locator('[data-page="home"]').click();await open();await page.locator('[data-outgoing-blocked]').waitFor();assert.equal(await page.locator('#computer-managed').isChecked(),true);assert.equal(await page.locator('#remote-management').isChecked(),true);
 assert.equal(await page.locator('#remote-pair-status').innerText(),'Enable incoming access to create a code for this computer.');
 for(const width of [1560,680]){await page.setViewportSize({width,height:1000});assert.ok(await page.locator('#remote-screen').evaluate(el=>el.scrollWidth<=el.clientWidth+1));}
 await page.setViewportSize({width:1560,height:1200});fs.mkdirSync('dist',{recursive:true});await page.screenshot({path:'dist/computer-access.png',fullPage:true});
 await page.locator('#computer-managed').uncheck();await page.locator('[data-save-computer-access]').click();await page.locator('#peer-code').waitFor();assert.match(await page.locator('.desktop-peer-list').innerText(),/Synthetic retained destination/);assert.match(await page.locator('#paired-device-list').innerText(),/Synthetic incoming controller/);
 assert.equal(JSON.parse(fs.readFileSync(path.join(home,'computer-access.json'))).managed,false);
 await page.locator('#remote-label').fill('Draft during another window role change');
 await app.evaluate(({app})=>{const policy=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService().computerAccess;policy.set({managed:true,expectedRevision:policy.get().revision});});
 await page.locator('[data-outgoing-blocked]').waitFor();assert.equal(await page.locator('#computer-managed').isChecked(),true);assert.equal(await page.locator('#remote-label').inputValue(),'Draft during another window role change');assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,synthetic:true,checks:['actual Connections role control and durable policy','managed outgoing UI hidden','incoming device grants and unsaved name retained','local-only agent inventory','reopened screen and narrow layout','saved outgoing destinations restored without pairing']}));
}finally{await app?.close();fs.rmSync(home,{recursive:true,force:true});}
