import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import { chromium } from 'playwright';

const moduleSource = fs.readFileSync(new URL('../public/provider-auth.js', import.meta.url));
const server = http.createServer((request, response) => {
  response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; connect-src 'self'");
  if (request.url === '/provider-auth.js') { response.setHeader('Content-Type', 'text/javascript'); response.end(moduleSource); }
  else { response.setHeader('Content-Type', 'text/html'); response.end('<!doctype html><html><body><div id="auth"></div></body></html>'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${address.port}/`);
  await page.evaluate(async () => {
    const { renderProviderAuth } = await import('/provider-auth.js');
    window.calls = []; window.opened = []; window.connected = 0;
    window.flow = { providerId: 'copilot', state: 'idle' };
    window.api = async (_route, body) => {
      window.calls.push(body.action);
      if (body.action === 'start') { window.flow = { providerId: body.providerId, state: 'waiting', url: window.unsafe ? 'https://github.com.evil.test/login/device' : 'https://github.com/login/device', message: '<img src=x onerror=alert(1)>secret-code' }; }
      else if (body.action === 'cancel') window.flow = { providerId: body.providerId, state: 'cancelled' };
      return window.flow;
    };
    window.mount = () => renderProviderAuth(document.querySelector('#auth'), 'copilot', { api: window.api, openExternal: url => window.opened.push(url), onConnected: () => { window.connected++; } });
    window.manager = window.mount();
  });
  await page.getByRole('button', { name: 'Connect / sign in' }).click();
  await page.getByRole('button', { name: 'Open sign-in page' }).waitFor();
  assert.equal(await page.getByText('secret-code').count(), 0, 'Raw provider text must never render');
  assert.equal(await page.evaluate(() => window.opened.length), 0, 'Start alone does not open an external page');
  await page.getByRole('button', { name: 'Open sign-in page' }).click();
  assert.deepEqual(await page.evaluate(() => window.opened), ['https://github.com/login/device']);
  await page.evaluate(() => { window.flow = { providerId: 'copilot', state: 'connected', message: 'secret-code', accountLabel: '<img src=x onerror=alert(1)> Connected account' }; });
  await page.getByText('GitHub Copilot is connected.').waitFor({ timeout: 7000 });
  await page.getByText('Account: <img src=x onerror=alert(1)> Connected account').waitFor();
  assert.equal(await page.locator('#auth img').count(), 0, 'Account label must be rendered as text');
  assert.equal(await page.evaluate(() => window.connected), 1);
  await page.evaluate(() => { window.manager.dispose(); window.flow = { providerId: 'copilot', state: 'idle' }; window.manager = window.mount(); });
  await page.getByRole('button', { name: 'Connect / sign in' }).click();
  await page.getByRole('button', { name: 'Cancel sign-in' }).click();
  await page.getByText('GitHub Copilot sign-in was cancelled.').waitFor();
  assert.equal(await page.evaluate(() => window.calls.filter(action => action === 'cancel').length), 1);
  await page.evaluate(() => { window.unsafe = true; });
  await page.getByRole('button', { name: 'Retry sign-in' }).click();
  await page.getByText('Finish GitHub Copilot sign-in on this computer. Checking automatically…').waitFor();
  assert.equal(await page.getByRole('button', { name: 'Open sign-in page' }).count(), 0, 'Lookalike host must not open');
  assert.deepEqual(await page.evaluate(() => window.opened), ['https://github.com/login/device']);
  assert.deepEqual(errors, []);
  console.log('Provider sign-in UI: explicit safe URL, no raw status text, completion refresh and Cancel passed.');
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
