import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedProviderAuthURL } from '../public/features/settings/provider-auth.js';

test('provider sign-in pages are exact HTTPS destinations without embedded credentials or tokens', () => {
  assert.equal(allowedProviderAuthURL('copilot', 'https://github.com/login/device'), 'https://github.com/login/device');
  assert.equal(allowedProviderAuthURL('codex', 'https://login.openai.com/authorize?state=synthetic'), 'https://login.openai.com/authorize?state=synthetic');
  for (const url of [
    'javascript:alert(1)', 'http://github.com/login/device', 'https://github.com.evil.test/login/device',
    'https://evil.test/', 'https://user:pass@github.com/login/device', 'https://github.com/login/device#secret',
    'https://github.com/login/device?access_token=secret', 'https://github.com/login/device?code=secret',
  ]) assert.equal(allowedProviderAuthURL('copilot', url), null, url);
  assert.equal(allowedProviderAuthURL('claude', 'https://github.com/login/device'), null);
  assert.equal(allowedProviderAuthURL('unknown', 'https://github.com/login/device'), null);
});
