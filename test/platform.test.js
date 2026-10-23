import test from 'node:test';
import assert from 'node:assert/strict';
import { applicationHome } from '../src/shared/files.js';
import platform from '../desktop/services/platform.cjs';

test('Linux data follows absolute XDG paths, with explicit override and unchanged Mac storage', () => {
  const options = { home: '/synthetic/user', platform: 'linux', env: {} };
  assert.equal(applicationHome(options), '/synthetic/user/.local/share/proteus');
  assert.equal(applicationHome({ ...options, env: { XDG_DATA_HOME: '/synthetic/data' } }), '/synthetic/data/proteus');
  assert.equal(applicationHome({ ...options, env: { XDG_DATA_HOME: 'relative' } }), '/synthetic/user/.local/share/proteus');
  assert.equal(applicationHome({ ...options, env: { PROTEUS_HOME: '/synthetic/override', XDG_DATA_HOME: '/synthetic/data' } }), '/synthetic/override');
  assert.equal(applicationHome({ ...options, platform: 'darwin', env: { XDG_DATA_HOME: '/synthetic/data' } }), '/synthetic/user/Library/Application Support/Proteus');
});

test('desktop launch finds user-installed Linux tools and retains the Mac PATH order', () => {
  const linux = platform.launchPath('linux', '/synthetic/user', '/custom/bin:/usr/bin').split(':');
  assert.equal(linux[0], '/synthetic/user/.local/bin');
  assert.ok(linux.includes('/custom/bin'));
  assert.ok(linux.includes('/usr/local/bin'));
  assert.equal(linux.filter(p => p === '/usr/bin').length, 1);
  assert.equal(platform.launchPath('darwin', '/synthetic/user', '/usr/bin:/opt/homebrew/bin'), '/synthetic/user/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin');
  assert.equal(platform.launchPath('darwin', '/synthetic/user', ''), '/synthetic/user/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin');
});

test('Linux minimizes on close unless tray hiding is explicitly selected; Mac still hides', () => {
  assert.equal(platform.closeToTray('linux', {}), false);
  assert.equal(platform.closeToTray('linux', { PROTEUS_CLOSE_TO_TRAY: '1' }), true);
  assert.equal(platform.closeToTray('darwin', {}), true);
});
test('desktop protocol launch arguments select only the desktop callback or validated chat scheme',()=>{
 const callback='proteus-desktop://life-oauth/callback?state=synthetic&code=synthetic';
 assert.equal(platform.protocolURL(['/synthetic/proteus','--flag',callback]),callback);
 assert.equal(platform.protocolURL(['proteus://chat/synthetic']), 'proteus://chat/synthetic');
 for(const value of ['proteus://life-oauth/callback','https://example.test/callback','proteus-desktop://life-oauth/other','proteus-desktop://user:secret@life-oauth/callback'])assert.equal(platform.protocolURL([value]),undefined);
});
