import {validateManagedRequirements} from '../integrations/managed-requirements.js';
import {validateScheduleSources} from './schedule-context.js';
import {canonicalPath} from '../settings/permissions.js';
import { validateModelOptionShape } from '../../models/model-catalog.js';
import {validateSelectionOverride} from './source-selection-overrides.js';
import {validateAccessOverlay} from './access-overlay.js';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { CronExpressionParser } from 'cron-parser';
import { atomicJSON, jsonFiles, readJSON } from '../../shared/files.js';

export function nextRuns(cron, timezone, from = new Date(), count = 5) {
  if (typeof cron !== 'string' || cron.trim().split(/\s+/).length !== 5) throw new Error('Use a five-field cron expression: minute hour day month weekday.');
  new Intl.DateTimeFormat('en', { timeZone: timezone }).format();
  const parser = CronExpressionParser.parse(cron, { tz: timezone, currentDate: from });
  return Array.from({ length: count }, () => parser.next().toISOString());
}
export function validateSchedule(value) {
  if(value?.ownerSelectionOverride!==undefined)validateSelectionOverride(value.ownerSelectionOverride);
  if(value?.accessOverlay!==undefined)validateAccessOverlay(value.accessOverlay);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('A schedule must be a JSON object.');
  if (value.schemaVersion !== 1) throw new Error('schemaVersion must be 1.');
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(value.id || '')) throw new Error('id must be a lowercase filename-safe identifier.');
  for (const key of ['name', 'prompt', 'timezone']) if (typeof value[key] !== 'string' || !value[key].trim()) throw new Error(`${key} is required.`);
  if (typeof value.enabled !== 'boolean') throw new Error('enabled must be true or false.');
  if (!['rehearsal', 'copilot', 'codex', 'claude', 'mtplx', 'llama-cpp', 'shared-llm', 'local-process'].includes(value.provider)) throw new Error('Choose an installed provider or local rehearsal.');
  if (!['rehearsal', 'local-process'].includes(value.provider) && (typeof value.model !== 'string' || !value.model.trim() || value.model === 'auto')) throw new Error('Choose an explicit provider model.');
  if (!value.workspace || typeof value.workspace.cwd !== 'string' || !path.isAbsolute(value.workspace.cwd)) throw new Error('workspace.cwd must be an absolute directory.');
  if (!Array.isArray(value.workspace.additionalDirectories) || value.workspace.additionalDirectories.some(p => typeof p !== 'string' || !path.isAbsolute(p))) throw new Error('workspace.additionalDirectories must be absolute paths.');
  if (value.misfire !== 'skip' && value.misfire !== 'coalesce') throw new Error('misfire must be skip or coalesce.');
  if (value.provider === 'local-process' && (value.integration?.type !== 'omi' || !['audio', 'library', 'semantic'].includes(value.integration?.job))) throw new Error('Local processes must be managed Omi jobs.');
  if (value.notifications !== undefined && (!value.notifications || typeof value.notifications !== 'object' || Array.isArray(value.notifications) || (value.notifications.onCompletion !== undefined && typeof value.notifications.onCompletion !== 'boolean'))) throw new Error('Schedule completion notification must be true or false.');
  validateScheduleSources(value);
  validateModelOptionShape(value);
  if (value.managedConnections !== undefined) validateManagedRequirements(value.managedConnections);
  if (value.contextSelection !== undefined) validateContextSelection(value.contextSelection);
  nextRuns(value.cron, value.timezone);
  return value;
}
export function validateContextSelection(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || typeof value.includeDefaults !== 'boolean' || !Array.isArray(value.selectedIds) || value.selectedIds.some(id => typeof id !== 'string' || !id) || (value.agentId != null && typeof value.agentId !== 'string')) throw new Error('Context selection needs includeDefaults, selectedIds, and an optional agentId.');
  return value;
}
export const revision = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

export class ScheduleStore {
  constructor(dir) { this.dir = dir; this.cache = new Map(); fs.mkdirSync(dir, { recursive: true, mode: 0o700 }); }
  readValidated(file) {
    // Metadata alone cannot establish freshness: external editors can retain
    // both size and mtime. Cache only after comparing the actual current bytes.
    const source = fs.readFileSync(file, 'utf8');
    let cached = this.cache.get(file);
    if (cached?.source !== source) {
      try {
        const schedule = validateSchedule(JSON.parse(source));
        cached = { source, schedule, revision: revision(schedule) };
      } catch (error) { cached = { source, error: error.message }; }
      this.cache.set(file, cached);
    }
    if (cached.error) throw new Error(cached.error);
    return cached;
  }
  list() {
    const files = jsonFiles(this.dir), current = new Set(files), now = new Date(), minute = Math.floor(now.getTime() / 60000);
    for (const file of this.cache.keys()) if (!current.has(file)) this.cache.delete(file);
    return files.map(file => {
      try {
        const cached = this.readValidated(file), schedule = cached.schedule;
        if (path.basename(file) !== `${schedule.id}.json`) throw new Error('Filename must match schedule id.');
        if (cached.previewMinute !== minute) { cached.nextRuns = nextRuns(schedule.cron, schedule.timezone, now); cached.previewMinute = minute; }
        return { ...structuredClone(schedule), file, revision: cached.revision, nextRuns: [...cached.nextRuns] };
      } catch (error) { return { id: path.basename(file, '.json'), file, error: error.message }; }
    });
  }
  get(id) {
    if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(id)) throw new Error('Invalid schedule id.');
    return structuredClone(this.readValidated(path.join(this.dir, `${id}.json`)).schedule);
  }
  save(value, expectedRevision) {
    const schedule = validateSchedule(structuredClone(value));
    const file = path.join(this.dir, `${schedule.id}.json`);
    if (fs.existsSync(file) && expectedRevision !== revision(readJSON(file))) throw new Error('This file changed outside the app. Reload before saving.');
    for (const key of ['file', 'revision', 'nextRuns', 'error']) delete schedule[key];
    // Pin explicit grants to their resolved destination when the operator saves.
    // Retargeting a selected symlink must not silently authorize a new directory.
    if(schedule.executionPermissions?.folders) schedule.executionPermissions.folders=schedule.executionPermissions.folders.map(folder=>{
      const resolved=canonicalPath(folder.path,schedule.workspace.cwd);
      if(!resolved)throw Error('A schedule folder cannot be resolved. Choose an existing accessible destination.');
      return {...folder,path:resolved};
    });
    atomicJSON(file, schedule);
    return schedule;
  }
}

export function lastDue(schedule, after, now) {
  const iterator = CronExpressionParser.parse(schedule.cron, { tz: schedule.timezone, currentDate: new Date(now.getTime() + 1) });
  const due = iterator.prev().toDate();
  return due.getTime() > after.getTime() && due.getTime() <= now.getTime() ? due.toISOString() : null;
}
