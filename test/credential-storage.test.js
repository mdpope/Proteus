import test from 'node:test';
import assert from 'node:assert/strict';
import { requireProtectedStorage, resolveSystemCredential, validateCredentialReference } from '../src/credential-storage.js';

test('all desktop token stores require a protected OS backend and refuse basic_text', () => {
  for (const backend of ['gnome_libsecret', 'kwallet6', 'keychain', undefined]) assert.doesNotThrow(() => requireProtectedStorage({ isEncryptionAvailable: () => true, getSelectedStorageBackend: () => backend }));
  for (const storage of [null, {}, { isEncryptionAvailable: () => false }, { isEncryptionAvailable: () => true, getSelectedStorageBackend: () => 'basic_text' }]) assert.throws(() => requireProtectedStorage(storage), error => error.code === 'PROTECTED_STORAGE_UNAVAILABLE');
});

test('Linux resolves existing Secret Service entries while Mac preserves legacy Keychain arguments', async () => {
  const calls = [], ref = { service: '--help', account: 'synthetic-user' };
  const run = async (...args) => { calls.push(args); return { stdout: 'synthetic-password\n' }; };
  assert.equal(await resolveSystemCredential(ref, { platform: 'linux', run }), 'synthetic-password');
  assert.deepEqual(calls[0].slice(0, 2), ['secret-tool', ['lookup', '--', 'service', ref.service, 'account', ref.account]]);
  assert.equal(await resolveSystemCredential(ref, { platform: 'darwin', run }), 'synthetic-password');
  assert.deepEqual(calls[1].slice(0, 2), ['/usr/bin/security', ['find-generic-password', '-s', ref.service, '-a', ref.account, '-w']]);
  assert.equal(calls[0][2].timeout, 15_000);
  assert.equal(JSON.stringify(calls).includes('synthetic-password'), false);
});

test('credential failures hide stdout/stderr and incompatible references never invoke a command', async () => {
  const ref = { service: 'synthetic', account: 'owner' };
  for (const run of [async () => { throw new Error('PRIVATE_SECRET_OUTPUT'); }, async () => ({ stdout: '' })]) await assert.rejects(resolveSystemCredential(ref, { platform: 'linux', run }), e => e.code === 'PROTECTED_STORAGE_UNAVAILABLE' && !e.message.includes('PRIVATE_SECRET_OUTPUT'));
  for (const [platform, store] of [['linux', 'keychain'], ['darwin', 'secret-service'], ['unknown', 'auto']]) await assert.rejects(resolveSystemCredential({ ...ref, store }, { platform, run: () => { throw new Error('must not execute'); } }), /requires a store supported/);
  for (const value of [{}, { service: '-bad\n', account: 'a' }, { ...ref, store: 'plaintext' }]) assert.throws(() => validateCredentialReference(value));
});
