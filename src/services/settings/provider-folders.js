import path from 'node:path';
import { canonicalPath } from './permissions.js';

// The owner supplies the captured provider home; display workers never discover
// credentials or instantiate a provider. Authorization uses the fresh resolver.
export function automaticProviderFolders(run, home, resolvePath = canonicalPath) {
  const provider = run.schedule.provider;
  if (!['copilot', 'claude'].includes(provider)) return [];
  const root = home && path.isAbsolute(home) && resolvePath(home, run.schedule.workspace.cwd);
  return root ? [{ path: root, access: 'read-write', source: 'provider', label: (provider === 'claude' ? 'Claude' : 'Copilot') + ' working folder (automatic)' }] : [];
}
