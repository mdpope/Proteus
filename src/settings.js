import fs from 'node:fs';
import path from 'node:path';
import { atomicJSON, readJSON } from './files.js';
import { revision } from './schedules.js';

export function validateSettings(value) {
  if (value?.schemaVersion !== 1) throw new Error('Settings schemaVersion must be 1.');
  if (!['copilot','rehearsal'].includes(value.provider)) throw new Error('Choose a supported default provider.');
  if (value.provider === 'copilot' && (!value.model?.trim() || value.model === 'auto')) throw new Error('Choose an explicit default model.');
  new Intl.DateTimeFormat('en', { timeZone: value.timezone }).format();
  for (const directory of [value.workspace?.cwd, ...(value.workspace?.additionalDirectories || []), ...(value.skillDirectories || [])]) {
    if (typeof directory !== 'string' || !path.isAbsolute(directory) || !fs.statSync(directory).isDirectory()) throw new Error(`Directory unavailable: ${directory}`);
  }
  if (!Array.isArray(value.workspace?.additionalDirectories) || !Array.isArray(value.skillDirectories)) throw new Error('Directory lists must be arrays.');
  if (!value.mcpServers || typeof value.mcpServers !== 'object' || Array.isArray(value.mcpServers)) throw new Error('MCP servers must be a JSON object.');
  return value;
}
export class SettingsStore {
  constructor(home, cwd) {
    this.file = path.join(home, 'settings.json');
    this.defaults = { schemaVersion: 1, workspace: { cwd, additionalDirectories: [] }, provider: 'copilot', model: 'gpt-6-sol', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, skillDirectories: [], mcpServers: {} };
    if (!fs.existsSync(this.file)) atomicJSON(this.file, this.defaults);
  }
  get() { const value = readJSON(this.file, this.defaults); return { ...value, file: this.file, revision: revision(value) }; }
  save(value, expectedRevision) {
    if (expectedRevision !== this.get().revision) throw new Error('Settings changed outside the app. Reload before saving.');
    const clean = structuredClone(value); delete clean.file; delete clean.revision;
    validateSettings(clean); atomicJSON(this.file, clean); return this.get();
  }
}
