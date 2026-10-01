import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { atomicJSON } from './files.js';

export function storagePaths(home, run) {
  const candidate = run.nativeSessionPath || (run.schedule.provider === 'copilot' && /^[a-zA-Z0-9_-]+$/.test(run.providerSessionId || '') ? path.join(run.providerHome || process.env.COPILOT_HOME || path.join(os.homedir(), '.copilot'), 'session-state', run.providerSessionId) : null);
  return { run: path.join(home, 'runs', run.id + '.json'), nativeSession: candidate && fs.existsSync(candidate) ? candidate : null };
}
export function exportTranscript(home, run, format) {
  if (!['markdown', 'json'].includes(format)) throw new Error('Choose Markdown or JSON.');
  // Export readable conversation only; never export the credential-bearing raw schedule/config.
  const data = { id: run.id, title: run.title, provider: run.schedule.provider, model: run.schedule.model, providerSessionId: run.providerSessionId, createdAt: run.createdAt, messages: run.events.filter(e => ['user', 'assistant'].includes(e.role)).map(({ role, text, at }) => ({ role, text, at })) };
  const file = path.join(home, 'exports', run.id + (format === 'json' ? '.json' : '.md'));
  if (format === 'json') atomicJSON(file, data);
  else {
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    fs.writeFileSync(file, `# ${data.title}\n\nProvider: ${data.provider} · Model: ${data.model}\nSession: ${data.providerSessionId || data.id}\n\n${data.messages.map(e => `## ${e.role} · ${e.at}\n\n${e.text}`).join('\n\n')}\n`, { mode: 0o600 });
  }
  return { file };
}
