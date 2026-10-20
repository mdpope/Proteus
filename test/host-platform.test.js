import test from 'node:test';
import assert from 'node:assert/strict';
import { hostPlatformMetadata, readHostPlatformMetadata } from '../src/host-platform.js';
import { parsePairing, pairingRelayOrigin } from '../src/remote-client.js';

test('host metadata describes Mac, Linux and Windows without inferring features or paths', () => {
  for (const [platform, label, architecture] of [['darwin', 'macOS', 'arm64'], ['linux', 'Linux', 'x64'], ['win32', 'Windows', 'arm64']]) {
    assert.deepEqual(hostPlatformMetadata({ platform, architecture }), { hostPlatform: platform, hostPlatformLabel: label, hostArchitecture: architecture });
  }
  assert.deepEqual(hostPlatformMetadata(), hostPlatformMetadata({ platform: process.platform, architecture: process.arch }));
  assert.deepEqual(readHostPlatformMetadata({ hostName: 'Legacy Mac' }), { hostPlatform: 'unknown', hostPlatformLabel: 'Computer', hostArchitecture: 'unknown' });
  assert.deepEqual(readHostPlatformMetadata({ hostPlatform: 'linux', hostPlatformLabel: 'Forged Mac', hostArchitecture: '../private' }), { hostPlatform: 'linux', hostPlatformLabel: 'Linux', hostArchitecture: 'unknown' });
  assert.deepEqual(readHostPlatformMetadata({ hostPlatform: '__proto__', hostArchitecture: {} }), readHostPlatformMetadata(null));
});

test('native desktop pairing accepts private LAN relays while browsers retain secure-origin policy', () => {
  const capsule = { version: 1, hostId: '11111111-1111-4111-8111-111111111111', key: 'ab'.repeat(32), expiresAt: new Date(Date.now() + 60_000).toISOString() };
  const code = relay => Buffer.from(JSON.stringify({ ...capsule, relay })).toString('base64url');
  for (const relay of ['ws://10.2.3.4:4318', 'ws://192.168.1.20:4318', 'ws://172.16.0.2:4318', 'ws://172.31.255.254:4318', 'ws://synthetic.local:4318']) {
    assert.throws(() => parsePairing(code(relay)), /secure relay/);
    assert.equal(parsePairing(code(relay), { allowLocalNetwork: true }).relay, relay);
  }
  for (const relay of ['wss://relay.example.test', 'ws://127.0.0.1:4318', 'ws://localhost:4318', 'ws://[::1]:4318']) {
    assert.equal(pairingRelayOrigin(relay), relay);
  }
  for (const relay of ['ws://172.15.0.1:4318', 'ws://172.32.0.1:4318', 'ws://8.8.8.8:4318', 'ws://relay.example.test', 'ws://10.2.3.4:4318/socket', 'ws://10.2.3.4:4318?token=secret', 'ws://user:secret@10.2.3.4:4318', 'https://10.2.3.4:4318']) {
    assert.throws(() => parsePairing(code(relay), { allowLocalNetwork: true }));
  }
});
