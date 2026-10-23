import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const runFile = promisify(execFile);

export function requireProtectedStorage(storage, purpose = 'save credentials') {
  if (!storage?.isEncryptionAvailable?.() || storage.getSelectedStorageBackend?.() === 'basic_text') {
    const error = new Error(`Unlock protected system credential storage to ${purpose}. On Linux, an available desktop keyring or Secret Service is required.`);
    error.code = 'PROTECTED_STORAGE_UNAVAILABLE';
    throw error;
  }
}

export function validateCredentialReference(ref) {
  for (const key of ['service', 'account']) {
    if (typeof ref?.[key] !== 'string' || !ref[key].trim() || ref[key].length > 512 || /[\x00-\x1f\x7f]/.test(ref[key])) throw new Error('Choose a valid system credential service and account.');
  }
  if (ref.store !== undefined && !['auto', 'keychain', 'secret-service'].includes(ref.store)) throw new Error('Choose a supported system credential store.');
  return ref;
}

// Read an existing entry only. No password is supplied in a process argument or profile.
export async function resolveSystemCredential(ref, { platform = process.platform, run = runFile } = {}) {
  validateCredentialReference(ref);
  const store = ref.store && ref.store !== 'auto' ? ref.store : platform === 'darwin' ? 'keychain' : platform === 'linux' ? 'secret-service' : null;
  if (!store || store === 'keychain' && platform !== 'darwin' || store === 'secret-service' && platform !== 'linux') throw new Error('This credential reference requires a store supported on the execution computer.');
  const command = store === 'keychain' ? '/usr/bin/security' : 'secret-tool';
  const args = store === 'keychain' ? ['find-generic-password', '-s', ref.service, '-a', ref.account, '-w'] : ['lookup', '--', 'service', ref.service, 'account', ref.account];
  try {
    const { stdout } = await run(command, args, { maxBuffer: 64_000, timeout: 15_000, windowsHide: true });
    const secret = stdout.replace(/\r?\n$/, '');
    if (!secret) throw new Error('Credential unavailable.');
    return secret;
  } catch {
    const error = new Error('Unlock the system credential store and verify the saved service/account entry. On Linux, install secret-tool and enable Secret Service.');
    error.code = 'PROTECTED_STORAGE_UNAVAILABLE';
    // Retain callers' legacy error classification; no secret-bearing process details escape.
    error.keychainLocked = true;
    throw error;
  }
}
