import { _electron as electron } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';

const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'proteus-toolbar-ui-')));
fs.writeFileSync(path.join(home, 'settings.json'), JSON.stringify({
  schemaVersion: 1, provider: 'rehearsal', model: '', timezone: 'UTC',
  workspace: { cwd: home, additionalDirectories: [] }, skillDirectories: [], mcpServers: {}
}));
const fixture = createServer((request, response) => {
  response.setHeader('Content-Type', 'text/html');
  const step = new URL(request.url, 'http://localhost').searchParams.get('step') || 'home';
  response.end(`<!doctype html><title>History ${step}</title><style>body{background:#f0f3ed;color:#203020;font:20px system-ui;padding:30px}</style><h1>Browser toolbar preview</h1><p>Synthetic page ${step}. No account or agent is connected.</p>`);
});
await new Promise(resolve => fixture.listen(0, '127.0.0.1', resolve));
const url = 'http://127.0.0.1:' + fixture.address().port + '/notes';
let app;
try {
  app = await electron.launch({
    args: ['.', '--use-mock-keychain', '--user-data-dir=' + path.join(home, 'electron')],
    env: { ...process.env, PROTEUS_HOME: home, COPILOT_HOME: path.join(home, 'copilot'), PORT: '0' },
    timeout: 60000
  });
  const page = await app.firstWindow();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/team/lists', route => route.fulfill({ json: { identity: { accountId: 'fixture' }, teamLists: [] } }));
  await page.locator('#tab-add-menu summary').waitFor();
  await page.waitForLoadState('load');
  const command = value => page.evaluate(value => window.desktop.browser(value), value);
  const waitNativeActive = id => app.evaluate(async ({app},id) => {
    const browser=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();
    const until=Date.now()+10000;
    while(browser.active!==id&&Date.now()<until)await new Promise(resolve=>setTimeout(resolve,25));
    return browser.active;
  },id);
  const main = await command({ action: 'create', url });
  await page.locator(`[data-tab="${main.id}"]`).click();

  async function checkToolbar(prefix, id, scope) {
    const button = page.locator('#' + prefix + '-share');
    const address = page.locator('#' + prefix + '-url');
    await button.waitFor();
    await page.waitForFunction(selector => document.querySelector(selector)?.getAttribute('aria-pressed') === 'false', '#' + prefix + '-share');
    assert.equal(await button.locator('svg').count(), 1);
    assert.equal((await button.textContent()).trim(), '', 'The robot has no visible text or badge');
    assert.match(await button.getAttribute('title'), /OFF.*Private tab/);
    const off = await (await page.waitForFunction(selector => {
      const element = document.querySelector(selector);
      if (!element?.isConnected) return false;
      const style = getComputedStyle(element), field = element.closest('.browser-address');
      if (!field?.isConnected) return false;
      const rgb = color => { const values = color.match(/[\d.]+/g); return values?.length >= 3 ? values.slice(0, 3).map(Number) : null; };
      const address = rgb(getComputedStyle(field).backgroundColor), toolbar = rgb(getComputedStyle(document.body).backgroundColor);
      return address && toolbar && { background: style.backgroundColor, border: style.borderWidth, shadow: style.boxShadow, field: address, toolbar };
    }, '#' + prefix + '-share')).jsonValue();
    assert.equal(off.background, 'rgba(0, 0, 0, 0)');
    assert.equal(off.border, '0px');
    assert.equal(off.shadow, 'none');
    assert.ok(off.field.every((channel, i) => channel > off.toolbar[i]), 'Address field is visibly lighter than the app background');
    const chrome = await address.evaluate(input => {
      const form = input.closest('.browserbar');
      const field = input.closest('.browser-address');
      const sidebar = document.querySelector('#sidebar');
      const controls = [...form.querySelectorAll('button:not(.browser-agent-toggle)')].map(button => {
        const style = getComputedStyle(button), bounds = button.getBoundingClientRect();
        return { id: button.id, background: style.backgroundColor, border: style.borderWidth, color: style.color, width: bounds.width, height: bounds.height };
      });
      return {
        background: getComputedStyle(form).backgroundColor,
        sidebar: getComputedStyle(sidebar).backgroundColor,
        address: getComputedStyle(field).backgroundColor,
        height: form.getBoundingClientRect().height,
        addressHeight: field.getBoundingClientRect().height,
        controls
      };
    });
    assert.equal(chrome.background, chrome.sidebar, `${scope} toolbar uses the sidebar green`);
    assert.notEqual(chrome.address, chrome.background, `${scope} URL field remains distinct`);
    assert.ok(chrome.height <= 44, `${scope} toolbar is compact: ${chrome.height}px`);
    assert.ok(chrome.addressHeight <= 34, `${scope} address is compact: ${chrome.addressHeight}px`);
    assert.ok(chrome.controls.length >= 5);
    for (const control of chrome.controls) {
      assert.equal(control.background, 'rgba(0, 0, 0, 0)', `${scope} ${control.id} is unboxed`);
      assert.equal(control.border, '0px', `${scope} ${control.id} has no border`);
      assert.equal(control.color, 'rgb(167, 182, 172)', `${scope} ${control.id} uses muted green text`);
      assert.ok(control.width >= 34 && control.height >= 34, `${scope} ${control.id} keeps a usable target`);
    }
    await page.screenshot({ path: '/private/tmp/proteus-toolbar-' + scope + '-off.png' });
    if (scope === 'main') await page.screenshot({ path: '/private/tmp/proteus-toolbar-compact-detail.png', clip: { x: 0, y: 0, width: 1200, height: 230 } });
    await button.click();
    await page.waitForFunction(async id => (await window.desktop.browser({ action: 'list' })).find(tab => tab.id === id)?.shared === true, id);
    await page.waitForFunction(selector => document.querySelector(selector)?.getAttribute('aria-pressed') === 'true', '#' + prefix + '-share');
    assert.match(await button.getAttribute('aria-label'), /ON.*revoke access.*cancel pending/);
    const onHandle = await page.waitForFunction(selector => {
      const element = document.querySelector(selector);
      if (!element || element.getAttribute('aria-pressed') !== 'true') return false;
      const style = getComputedStyle(element);
      return style.backgroundColor === 'rgb(194, 232, 160)' && { background: style.backgroundColor, color: style.color };
    }, '#' + prefix + '-share');
    const on = await onHandle.jsonValue();
    assert.notEqual(on.background, off.background);
    assert.equal(on.background, 'rgb(194, 232, 160)');
    assert.equal(on.color, 'rgb(24, 36, 20)', 'Pressed robot inverts to dark ink');
    await page.screenshot({ path: '/private/tmp/proteus-toolbar-' + scope + '-on.png' });
    await button.focus();
    await page.keyboard.press('Space');
    await page.waitForFunction(async id => (await window.desktop.browser({ action: 'list' })).find(tab => tab.id === id)?.shared === false, id);
    assert.equal(await address.inputValue(), url, 'Toggling does not submit or replace the address');
    await address.fill(url + '?typed=1');
    await address.press('Enter');
    await page.waitForFunction(async id => (await window.desktop.browser({ action: 'list' })).find(tab => tab.id === id)?.url.endsWith('?typed=1'), id);
    await command({ action: 'navigate', id, url });
    // Restore the displayed value without testing unrelated Team navigation refresh behavior.
    await address.fill(url);
    await address.blur();
  }
  await checkToolbar('browser', main.id, 'main');
  const initialDocument = await page.evaluate(async()=> (await import('./browser-toolbar.js')).browserSurfaceIdentity());

  // Create a completed synthetic chat, then open a nested browser through the real UI.
  const chatId = await app.evaluate(({ app }, home) => {
    const engine = process.mainModule.require(app.getAppPath() + '/desktop/main.cjs').getService().engine;
    const schedule = { ...engine.schedules.list()[0], name: 'Toolbar fixture chat', workspace: { cwd: home, additionalDirectories: [] } };
    const run = engine.createRun(schedule, 'chat', null, { deferStart: true });
    run.status = 'completed';run.title = 'Toolbar fixture chat';run.titleKind = 'manual';
    engine.persist(run);
    return run.id;
  }, home);
  await page.reload();
  await page.locator('#tab-add-menu summary').waitFor();
  await page.waitForLoadState('load');
  await page.waitForFunction(id=>document.querySelector(`[data-tab-container="${id}"]`)?.classList.contains('selected'),main.id);
  const nextDocument = await page.evaluate(async()=> (await import('./browser-toolbar.js')).browserSurfaceIdentity());
  assert.notEqual(nextDocument.rendererEpoch, initialDocument.rendererEpoch, 'Reload starts a new renderer selection epoch');
  await page.locator('[data-page="runs"]').click();
  await page.locator('#chat-index-rows [title="Toolbar fixture chat"]').click();
  await page.locator('#chat-subtabs summary').click();
  await page.locator('[data-chat-add="browser"]').click();
  await page.locator('.chat-subtab [data-chat-subtab]').waitFor();
  const nestedId = await page.locator('.chat-subtab [data-chat-subtab]').last().getAttribute('data-chat-subtab');
  await command({ action: 'navigate', id: nestedId, url });
  await page.waitForFunction(() => document.querySelector('#browser-url')?.value.endsWith('/notes'));
  await checkToolbar('browser', nestedId, 'chat');

  // Child selection and order are chat-local and persist after leaving the chat and reloading.
  await page.locator(`[data-tab="${chatId}"]`).click();
  await page.locator(`#chat-subtabs [data-chat-subtab="${chatId}"]`).click();
  await page.locator('#chat-subtabs summary').click();
  await page.locator('[data-chat-add="browser"]').click();
  await page.waitForFunction(id => document.querySelectorAll('.chat-subtab [data-chat-subtab]').length === 2 && [...document.querySelectorAll('.chat-subtab [data-chat-subtab]')].some(node => node.dataset.chatSubtab !== id), nestedId);
  await page.locator(`.chat-subtab [data-chat-subtab="${nestedId}"]`).focus();
  await page.keyboard.press('Alt+Shift+ArrowRight');
  const childOrder = await page.locator('.chat-subtab [data-chat-subtab]').evaluateAll(nodes => nodes.map(node => node.dataset.chatSubtab));
  assert.equal(childOrder.at(-1), nestedId);
  await page.locator(`.chat-subtab [data-chat-subtab="${nestedId}"]`).click();
  await page.locator('[data-page="team"]').click();
  await page.locator(`[data-tab="${chatId}"]`).click();
  assert.equal(await page.locator('.chat-subtab.selected [data-chat-subtab]').getAttribute('data-chat-subtab'), nestedId);
  await page.waitForFunction(id=>window.desktop.browser({action:'list'}).then(items=>items.find(item=>item.id===id)?.loaded),nestedId);
  await page.waitForFunction(async ({chatId,nestedId}) => (await window.desktop.workspaceSession({action:'get'}))?.selectedChildren?.[chatId] === nestedId, {chatId,nestedId});
  await page.reload();
  await page.waitForFunction(id=>document.querySelector(`[data-tab-container="${id}"]`)?.classList.contains('selected'),chatId);
  await page.locator('.chat-subtab [data-chat-subtab]').first().waitFor();
  assert.deepEqual(await page.locator('.chat-subtab [data-chat-subtab]').evaluateAll(nodes => nodes.map(node => node.dataset.chatSubtab)), childOrder);
  assert.equal(await page.locator('.chat-subtab.selected [data-chat-subtab]').getAttribute('data-chat-subtab'), nestedId);

  await page.locator('[data-page="team"]').click();
  await page.locator('#team-subtabs summary').click();
  await page.locator('[data-team-add="browser"]').click();
  await page.locator('#team-browser-url').fill(url);
  await page.locator('#team-browser-url').press('Enter');
  const team = (await command({ action: 'list' })).find(tab => tab.group === 'team');
  await checkToolbar('team-browser', team.id, 'team');

  // Simulate an agent-owned (not globally shared) tab: the lit icon must revoke it.
  await app.evaluate(({ app }, id) => {
    const browser = process.mainModule.require(app.getAppPath() + '/desktop/main.cjs').getBrowser();
    browser.get(id).owner = 'synthetic-owner';
    browser.changed();
  }, team.id);
  await page.waitForFunction(() => document.querySelector('#team-browser-share')?.getAttribute('aria-pressed') === 'true');
  await page.locator('#team-browser-share').click();
  await page.waitForFunction(async id => {
    const tab = (await window.desktop.browser({ action: 'list' })).find(tab => tab.id === id);
    return !tab.owner && !tab.shared;
  }, team.id);
  assert.ok((await command({ action: 'list' })).every(tab => !tab.shared && !tab.owner), 'Other tabs remain private');

  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(850, 650));
  await page.waitForFunction(() => innerWidth === 850);
  const fits = await page.locator('#team-browser-form').evaluate(form => {
    const address = form.querySelector('.browser-address').getBoundingClientRect();
    const button = form.querySelector('.browser-agent-toggle').getBoundingClientRect();
    const input = form.querySelector('input').getBoundingClientRect();
    return form.scrollWidth <= form.clientWidth + 1 && input.width > 80 && button.left >= input.right && button.right <= address.right;
  });
  assert.ok(fits, 'Address and toggle fit at the desktop minimum width');
  await app.evaluate(() => {
    const { Menu } = process.mainModule.require('electron');
    const original = Menu.buildFromTemplate.bind(Menu);
    globalThis.__proteusHistoryMenus = [];
    Menu.buildFromTemplate = items => {
      if (items.some(item => item.toolTip?.includes('127.0.0.1'))) {
        globalThis.__proteusHistoryMenus.push(items);
        return { popup() {} };
      }
      return original(items);
    };
  });
  const nativeHistory = id => app.evaluate(({ app }, id) => {
    const browser = process.mainModule.require(app.getAppPath() + '/desktop/main.cjs').getBrowser();
    const history = browser.get(id).view.webContents.navigationHistory;
    return { entries: history.getAllEntries().map(entry => ({url:entry.url,title:entry.title})), index: history.getActiveIndex() };
  }, id);
  // A browser-state redraw can replace the held control before pointer-up.
  // Its release click must still be consumed by the same tab/direction.
  await command({action:'navigate',id:team.id,url:url+'?step=team-redraw'});
  await page.waitForFunction(()=>{const button=document.querySelector('#team-browser-back');return !!button&&!button.disabled;});
  const redrawIndex=(await nativeHistory(team.id)).index;
  await page.locator('#team-browser-back').dispatchEvent('pointerdown',{button:0,pointerId:31});
  await page.waitForTimeout(650);
  await page.evaluate(async()=>(await import('./team-tools.js')).renderTeamTools());
  await page.waitForFunction(()=>{const button=document.querySelector('#team-browser-back');return !!button&&!button.disabled;});
  await page.locator('#team-browser-back').dispatchEvent('pointerup',{button:0,pointerId:31});
  await page.locator('#team-browser-back').dispatchEvent('click',{button:0,detail:1});
  assert.equal((await nativeHistory(team.id)).index,redrawIndex,'Held Back click stays suppressed across toolbar replacement');
  async function checkHistory(prefix, id, scope) {
    for (let step = 1; step <= 3; step++) await command({action:'navigate',id,url:url+'?step='+scope+'-'+step});
    const activeID = await app.evaluate(({ app }) => process.mainModule.require(app.getAppPath() + '/desktop/main.cjs').getBrowser().active);
    assert.equal(activeID, id, scope+' native browser must match its selected toolbar');
    const back = page.locator('#'+prefix+'-back'), forward = page.locator('#'+prefix+'-forward');
    await page.waitForFunction(async id => (await window.desktop.browser({action:'list'})).find(item => item.id === id)?.canGoBack, id);
    await page.waitForFunction(selector => {const button=document.querySelector(selector);return !!button&&!button.disabled;}, '#'+prefix+'-back');
    const before = await nativeHistory(id);
    assert.ok(before.index >= 3, scope+' has directional history');
    assert.equal(await back.getAttribute('aria-haspopup'), 'menu');
    assert.match(await back.getAttribute('title'), /hold for history/);
    const menuCount = await app.evaluate(() => globalThis.__proteusHistoryMenus.length);
    await back.dispatchEvent('pointerdown', {button:0,pointerId:1});
    await page.waitForTimeout(650);
    const backMenu = await app.evaluate(() => globalThis.__proteusHistoryMenus.at(-1)?.map(item => ({label:item.label,sublabel:item.sublabel,toolTip:item.toolTip})));
    assert.equal(await app.evaluate(() => globalThis.__proteusHistoryMenus.length), menuCount+1, scope+' hold opens one native menu');
    assert.deepEqual(backMenu.map(item => item.toolTip), before.entries.slice(0,before.index).reverse().filter(item => /^https?:/.test(item.url)).map(item => item.url).slice(0,50), scope+' back entries are nearest first');
    assert.ok(backMenu.every(item => item.label && (item.label.includes('http') || item.sublabel?.includes('http'))), scope+' menu visibly includes title and URL');
    await back.dispatchEvent('pointerup', {button:0,pointerId:1});
    await back.dispatchEvent('click', {button:0,detail:1});
    assert.equal((await nativeHistory(id)).index, before.index, scope+' release after hold does not also go back');
    await app.evaluate(() => globalThis.__proteusHistoryMenus.at(-1)[0].click());
    await page.waitForFunction(async ({id,target}) => (await window.desktop.browser({action:'list'})).find(item => item.id === id)?.url === target, {id,target:backMenu[0].toolTip});
    await page.waitForFunction(selector => {const button=document.querySelector(selector);return !!button&&!button.disabled;}, '#'+prefix+'-forward');
    const afterBack = await nativeHistory(id);
    await forward.dispatchEvent('pointerdown', {button:0,pointerId:1});
    await page.waitForTimeout(650);
    const forwardMenu = await app.evaluate(() => globalThis.__proteusHistoryMenus.at(-1)?.map(item => ({label:item.label,sublabel:item.sublabel,toolTip:item.toolTip})));
    assert.deepEqual(forwardMenu.map(item => item.toolTip), afterBack.entries.slice(afterBack.index+1).filter(item => /^https?:/.test(item.url)).map(item => item.url).slice(0,50), scope+' forward entries are nearest first');
    await forward.dispatchEvent('pointerup', {button:0,pointerId:1});
    await forward.dispatchEvent('click', {button:0,detail:1});
    assert.equal((await nativeHistory(id)).index, afterBack.index, scope+' forward hold suppresses ordinary click');
    await app.evaluate(() => globalThis.__proteusHistoryMenus.at(-1)[0].click());
    await page.waitForFunction(async ({id,target}) => (await window.desktop.browser({action:'list'})).find(item => item.id === id)?.url === target, {id,target:forwardMenu[0].toolTip});
    // A menu opened against old navigation cannot act after the tab moves.
    await back.dispatchEvent('pointerdown', {button:0,pointerId:1});
    await page.waitForTimeout(650);
    await back.dispatchEvent('pointerup', {button:0,pointerId:1});
    await back.dispatchEvent('click', {button:0,detail:1});
    await command({action:'navigate',id,url:url+'?step='+scope+'-new'});
    const fresh = await nativeHistory(id);
    await app.evaluate(() => globalThis.__proteusHistoryMenus.at(-1)[0].click());
    assert.equal((await nativeHistory(id)).index, fresh.index, scope+' stale menu cannot navigate changed history');
    await page.waitForTimeout(800);
    await back.click();
    await page.waitForFunction(async ({id,target}) => (await window.desktop.browser({action:'list'})).find(item => item.id === id)?.url === target, {id,target:fresh.entries[fresh.index-1].url});
  }
  await checkHistory('team-browser', team.id, 'team');
  await page.locator(`[data-tab="${chatId}"]`).click();
  await page.locator(`.chat-subtab [data-chat-subtab="${nestedId}"]`).click();
  await page.locator('#browser-url').waitFor();
  await checkHistory('browser', nestedId, 'chat');
  const staleChildSelection = await page.evaluate(async()=> (await import('./browser-toolbar.js')).browserSurfaceIdentity());
  await page.locator(`[data-tab="${main.id}"]`).click();
  await page.locator('#browser-url').waitFor();
  assert.equal(await waitNativeActive(main.id),main.id,'Main toolbar activates its own browser');
  const mainSelection = await page.evaluate(async()=> (await import('./browser-toolbar.js')).browserSurfaceIdentity());
  assert.ok(mainSelection.selectionRevision>staleChildSelection.selectionRevision,'Switching to main advances selection revision');
  assert.equal(await app.evaluate(({app})=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().active), main.id);
  await command({action:'show',id:nestedId,bounds:{x:0,y:50,width:500,height:400},...staleChildSelection});
  await command({action:'history-menu',id:nestedId,direction:'back',x:100,y:100,expectedGroup:'main',...staleChildSelection});
  assert.equal(await app.evaluate(({app})=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().active),main.id,'Delayed old child selection cannot replace main browser');
  await checkHistory('browser', main.id, 'main');
  assert.deepEqual(errors, []);
  console.log('Passed: main/chat/Team compact toolbar, sharing, normal navigation, held directional history menus, direct selection, stale guard and click suppression.');
} catch (error) {
  console.error(error?.stack || error);
  if (app) {
    const page = await app.firstWindow();
    await page.screenshot({ path: '/private/tmp/proteus-toolbar-failure.png' });
    console.error((await page.locator('#main').innerText()).slice(0, 1600));
  }
  throw error;
} finally {
  if(app){
    const child=app.process();
    const graceful=app.close().then(()=>true,()=>false);
    const closed=await Promise.race([graceful,new Promise(resolve=>setTimeout(()=>resolve(false),10000))]);
    if(!closed&&!child.killed)child.kill('SIGKILL');
  }
  fixture.closeAllConnections();
  await new Promise(resolve => fixture.close(resolve));
  fs.rmSync(home, { recursive: true, force: true });
}
