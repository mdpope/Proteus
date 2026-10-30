// Disposable desktop and transport fixtures. No production relay or pairing credential is used.
import { _electron as electron } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'proteus-pairing-ui-'));
const workspace = path.join(home, 'workspace'); fs.mkdirSync(workspace);
fs.writeFileSync(path.join(home, 'settings.json'), JSON.stringify({ schemaVersion: 1, provider: 'rehearsal', model: '', timezone: 'UTC', workspace: { cwd: workspace, additionalDirectories: [] }, skillDirectories: [], mcpServers: {} }));
const inherited = ['PATH', 'HOME', 'USER', 'LOGNAME', 'SHELL', 'LANG', 'LC_ALL', 'DISPLAY', 'WAYLAND_DISPLAY', 'XAUTHORITY', 'XDG_RUNTIME_DIR', 'DBUS_SESSION_BUS_ADDRESS', 'TMPDIR'];
const env = Object.fromEntries(inherited.filter(key => process.env[key] !== undefined).map(key => [key, process.env[key]]));
Object.assign(env, { PROTEUS_HOME: home, PORT: '0', COPILOT_HOME: path.join(home, 'copilot'), COPILOT_CLI_PATH: path.join(home, 'unavailable-copilot'), PROTEUS_CODEX_PATH: path.join(home, 'unavailable-codex'), PROTEUS_CLAUDE_PATH: path.join(home, 'unavailable-claude'), CLAUDE_CONFIG_DIR: path.join(home, 'claude') });
const remote = { enabled: false, status: 'disabled', error: null, label: 'Synthetic computer', mode: 'external', relayURL: 'wss://synthetic-relay.example', publicURL: 'wss://synthetic-relay.example', addresses: [], port: 4318, devices: [], documentRequests: [] };
let app, gets = 0, pairRequests = 0, failStatus = false;
const errors = [];
try {
  const executablePath = process.env.PROTEUS_TEST_EXECUTABLE;
  app = await electron.launch({ ...(executablePath ? { executablePath } : {}), args: [...(executablePath ? [] : ['.']), '--password-store=basic', '--user-data-dir=' + path.join(home, 'browser')], env });
  const page = await app.firstWindow(); page.setDefaultTimeout(15000); page.on('pageerror', error => errors.push(error.message));
  await page.locator('#topbar-home').waitFor();
  await page.route('**/api/remote', async route => {
    if (route.request().method() === 'GET') {
      gets++;
      return route.fulfill({ status: failStatus ? 503 : 200, contentType: 'application/json', body: JSON.stringify(failStatus ? { error: 'Synthetic status unavailable' } : remote) });
    }
    const body = route.request().postDataJSON();
    if (body.action === 'configure') {
      remote.enabled = body.enabled; remote.status = 'connecting'; remote.error = null;
      setTimeout(() => { remote.status = 'online'; }, 100);
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(remote) });
    }
    assert.equal(body.action, 'pair'); assert.equal(body.management,true); pairRequests++;
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ code: 'proteus://pair?data=synthetic-ui-fixture', browserURL: 'https://example.test/remote#pair=synthetic-ui-fixture', expiresAt: new Date(Date.now() + 300000).toISOString(), qr: '' }) });
  });
  await page.locator('[data-page="engine"]').click();
  await page.locator('[data-engine-section="connections"]').click();
  const code = page.locator('#peer-code'), pair = page.locator('#remote-pair');
  await code.waitFor();
  assert.equal(await pair.isDisabled(), true);
  assert.match(await page.locator('#remote-desktop-destinations').innerText(), /relay website does not issue pairing codes/);
  assert.match(await page.locator('#remote-pair-status').innerText(), /do not need incoming access/);
  const before = await page.locator('.desktop-destinations').boundingBox(), after = await page.getByRole('heading', { name: 'Allow connections to this computer', exact: true }).boundingBox();
  assert.ok(before.y < after.y);
  await code.fill('synthetic-invalid-invitation');
  await page.locator('#peer-pair').click();
  await page.waitForFunction(() => { const value = document.querySelector('#peer-pair-status')?.textContent; return value && value !== 'Pairing with the other computer…'; });
  assert.equal(await code.inputValue(), 'synthetic-invalid-invitation');
  assert.equal(await page.locator('#peer-pair').isEnabled(), true);
  await page.locator('#remote-enable').click();
  await page.locator('[data-remote-status]').filter({ hasText: 'connecting' }).waitFor();
  await page.locator('#remote-label').fill('Unapplied computer-name draft');
  await code.fill('Synthetic other-computer draft');
  await page.waitForFunction(() => !document.querySelector('#remote-pair').disabled);
  assert.equal(await page.locator('#remote-label').inputValue(), 'Unapplied computer-name draft');
  assert.equal(await code.inputValue(), 'Synthetic other-computer draft');
  assert.equal(pairRequests, 0, 'Status polling must not issue or consume an invitation.');
  assert.equal(await page.locator('#remote-management').isChecked(),false);
  await page.locator('#remote-management').check();await pair.click(); await page.locator('#remote-code').waitFor();
  assert.equal(await page.locator('#remote-code').inputValue(), 'proteus://pair?data=synthetic-ui-fixture');
  assert.equal(pairRequests, 1);
  remote.status = 'offline'; remote.error = 'Synthetic registration rejection';
  await page.locator('#remote-label').fill('Still editing this name');
  await page.locator('#remote-check-connection').click();
  await page.locator('#remote-connection-error').filter({ hasText: remote.error }).waitFor();
  assert.equal(await pair.isDisabled(), true);
  assert.equal(await page.locator('#remote-label').inputValue(), 'Still editing this name');
  failStatus = true; await page.locator('#remote-check-connection').click();
  await page.locator('#remote-connection-error').filter({ hasText: 'Could not check' }).waitFor();
  failStatus = false; remote.status = 'online'; remote.error = null;
  await page.locator('#remote-check-connection').click();
  await page.waitForFunction(() => !document.querySelector('#remote-pair').disabled);
  assert.equal(await page.locator('#remote-connection-error').isHidden(), true);
  assert.equal(await page.locator('#remote-label').inputValue(), 'Still editing this name');
  // Synthetic owner list only: no real relay, pairing, permission or device action.
  await app.evaluate(({app})=>{
    const peers=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getDesktopPeers();
    peers.list=()=>[{hostId:'synthetic-mac',label:'Synthetic personal computer with a long readable destination name',platform:'darwin',status:'online'}, {hostId:'synthetic-windows',label:'Synthetic-'+ 'longname'.repeat(18),platform:'win32',status:'online'}];
  });
  await page.locator('[data-page="home"]').click();
  await page.locator('[data-page="engine"]').click();await page.locator('[data-engine-section="connections"]').click();
  await page.locator('.desktop-peer-actions').first().waitFor();
  for(const width of [1560,920,680]){
    await page.setViewportSize({width,height:1000});
    assert.equal(await page.evaluate(()=>innerWidth),width,'Actual renderer viewport follows the fixture width');
    await page.waitForTimeout(150);
    const layout=await page.evaluate(()=>{
      const screen=document.querySelector('#remote-screen'),outgoing=document.querySelector('.desktop-destinations'),grid=screen.querySelector(':scope>.grid');
      const bounds=node=>{const b=node.getBoundingClientRect();return {x:b.x,y:b.y,right:b.right,bottom:b.bottom,width:b.width};};
      return {screen:bounds(screen),gap:bounds(grid).y-bounds(outgoing).bottom,overflow:screen.scrollWidth-screen.clientWidth,cards:[...screen.querySelectorAll('.card')].map(bounds),buttons:[...screen.querySelectorAll('.desktop-peer-actions button')].map(bounds),rows:[...screen.querySelectorAll('.device-row')].map(row=>({height:row.clientHeight,content:row.scrollHeight})),actionGaps:[...screen.querySelectorAll('.desktop-peer-actions')].map(group=>{const buttons=[...group.children];return buttons.slice(1).filter((node,i)=>node.getBoundingClientRect().y===buttons[i].getBoundingClientRect().y).map((node,i)=>node.getBoundingClientRect().x-buttons[i].getBoundingClientRect().right);}).flat()};
    });
    assert.ok(layout.gap>=19,'Outgoing and incoming cards have a consistent gap at '+width);
    assert.ok(layout.overflow<=1,'No horizontal overflow at '+width);
    for(const b of [...layout.cards,...layout.buttons])assert.ok(b.x>=layout.screen.x-1&&b.right<=layout.screen.right+1,'Cards and controls fit at '+width);
    assert.ok(layout.rows.every(row=>row.content<=row.height+1),'Long names wrap inside their row');
    assert.ok(layout.actionGaps.every(gap=>gap>=7&&gap<=9),'Actions stay grouped instead of spanning the card');
    const file=path.join(os.tmpdir(),'proteus-connections-'+width+'.png');await page.screenshot({path:file,fullPage:true});
  }
  const screenshot = path.resolve('dist/connection-pairing.png'); fs.mkdirSync(path.dirname(screenshot), { recursive: true }); await page.screenshot({ path: screenshot });
  const prior = gets; await page.locator('[data-page="home"]').click(); await page.waitForTimeout(3300);
  assert.equal(gets, prior, 'Leaving Connections stops status requests.');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, synthetic: true, checks: ['code source and pairing direction guidance', 'outgoing pairing available with incoming access disabled', 'failed pairing preserves pasted code', 'automatic relay readiness enables code generation', 'status refresh preserves input drafts and never creates an invitation', 'visible connection failures and manual recovery', 'polling stops after navigation'], screenshot }));
} finally { await app?.close(); fs.rmSync(home, { recursive: true, force: true }); }
