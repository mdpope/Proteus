import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
import { createWindowChrome } from '../public/shared/navigation/window-chrome.js';
const { windowChromeOptions, installWindowChrome } = createRequire(import.meta.url)('../desktop/windows/window-chrome.cjs');

test('Linux and Windows share custom chrome; Mac and website retain their existing UI', () => {
  for (const platform of ['linux', 'win32']) assert.deepEqual(windowChromeOptions(platform), { frame: false });
  for (const platform of ['darwin']) {
    assert.deepEqual(windowChromeOptions(platform), {});
    assert.equal(createWindowChrome({ platform }).html, '');
  }
  assert.equal(createWindowChrome().html, '');
});

for (const platform of ['linux', 'win32']) test(platform+' window controls use only the trusted owning window and reject unavailable actions', async () => {
  const target = new EventEmitter(), sent = [];
  let maximized = false, fullscreen = false, closed = false, minimized = false, handler, popup, shuttingDown = false;
  Object.assign(target, {
    isDestroyed: () => false, isFocused: () => true, isMaximized: () => maximized, isFullScreen: () => fullscreen,
    maximize: () => { maximized = true; }, unmaximize: () => { maximized = false; }, setFullScreen: value => { fullscreen = value; },
    close: () => { closed = true; }, minimize: () => { minimized = true; }, getContentSize: () => [850, 650],
    setAutoHideMenuBar() {}, setMenuBarVisibility() {}, webContents: { send: (...args) => sent.push(args) }
  });
  const windows = { handle: (_channel, fn) => { handler = fn; }, current: () => ({ window: target }) };
  const configure = installWindowChrome({ windows, platform, trusted: event => { if (!event.trusted) throw Error('Untrusted renderer.'); }, isClosing: () => shuttingDown, Menu: { getApplicationMenu: () => ({ popup: options => { popup = options; options.callback(); } }) } });
  configure(target);
  await assert.rejects(handler({}, { action: 'close' }), /Untrusted/);
  assert.equal(closed, false);
  await assert.rejects(handler({ trusted: true }, { action: 'destroy' }), /Choose/);
  await handler({ trusted: true }, { action: 'toggle-maximize' }); assert.equal(maximized, true);
  await handler({ trusted: true }, { action: 'toggle-maximize' }); assert.equal(maximized, false);
  fullscreen = true; await handler({ trusted: true }, { action: 'toggle-maximize' }); assert.equal(fullscreen, false);
  await handler({ trusted: true }, { action: 'menu', x: -20, y: 10000 });
  assert.equal(popup.window, target); assert.equal(popup.x, 0); assert.equal(popup.y, 649);
  target.emit('maximize'); assert.deepEqual(sent.at(-1), ['proteus:window-chrome-state', { maximized: false, fullscreen: false, focused: true }]);
  await handler({ trusted: true }, { action: 'minimize' }); assert.equal(minimized, true);
  shuttingDown = true; await assert.rejects(handler({ trusted: true }, { action: 'close' }), /unavailable/); assert.equal(closed, false);
  shuttingDown = false; await handler({ trusted: true }, { action: 'close' }); assert.equal(closed, true);
  installWindowChrome({ windows, platform: 'darwin', trusted() {}, isClosing: () => false });
  await assert.rejects(handler({}, { action: 'close' }), /unavailable/);
});
