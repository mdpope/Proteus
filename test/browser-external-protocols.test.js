import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { ExternalProtocols, externalProtocolURL } = require('../desktop/browser/browser-external-protocols.cjs');

test('only external application schemes are classified for launch', () => {
  for (const value of ['zoommtg://zoom.us/join?confno=1', 'msteams:/l/meetup-join/x', 'mailto:someone@example.com', 'slack://open']) assert.ok(externalProtocolURL(value), value);
  for (const value of ['https://example.com', 'http://localhost:5000/', 'javascript:alert(1)', 'data:text/html,x', 'file:///etc/hosts', 'proteus-desktop://life-oauth/callback', 'blob:https://x/y', 'not a url', 'x'.repeat(9000) + ':y']) assert.equal(externalProtocolURL(value), null, value);
});

test('external links ask once per tab, remember an explicit always-allow, and report missing handlers', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'proteus-external-'));
  try {
    const opened = [], prompts = [], errors = [], tab = { id: 'tab', profileId: 'work', view: { webContents: { getURL: () => 'https://zoom.example/j/1' } } };
    const browser = { tabs: new Map([[tab.id, tab]]), withTabWindow: (_tab, action) => action(), window: null, actions: { send: value => errors.push(value) } };
    let answer = { response: 0, checkboxChecked: false };
    const handler = new ExternalProtocols(browser, { home, show: async (_parent, options) => { prompts.push(options); return answer; }, open: async url => opened.push(url), handlerName: url => (url.startsWith('zoommtg:') ? 'zoom.us' : '') });
    assert.equal(await handler.request(tab, 'zoommtg://zoom.us/join?confno=1'), true);
    assert.match(prompts[0].message, /Open zoom\.us\?/); assert.match(prompts[0].checkboxLabel, /zoom\.example/);
    answer = { response: 1, checkboxChecked: true };
    assert.equal(await handler.request(tab, 'zoommtg://zoom.us/join?confno=2'), false, 'Cancel never opens or remembers');
    answer = { response: 0, checkboxChecked: true };
    await handler.request(tab, 'zoommtg://zoom.us/join?confno=3');
    const before = prompts.length;
    assert.equal(await handler.request(tab, 'zoommtg://zoom.us/join?confno=4'), true);
    assert.equal(prompts.length, before, 'Always allow skips the prompt for that profile, site and scheme');
    assert.deepEqual(opened, ['zoommtg://zoom.us/join?confno=1', 'zoommtg://zoom.us/join?confno=3', 'zoommtg://zoom.us/join?confno=4']);
    assert.equal(new ExternalProtocols(browser, { home, show: async () => assert.fail('remembered'), open: async () => {}, handlerName: () => 'zoom.us' }).allowed('work', 'https://zoom.example', 'zoommtg'), true);
    assert.equal(await handler.request({ ...tab, profileId: 'personal' }, 'msteams:/l/x'), false);
    assert.match(errors.at(-1).message, /No application/);
  } finally { fs.rmSync(home, { recursive: true, force: true }); }
});
