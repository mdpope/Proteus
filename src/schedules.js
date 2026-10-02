import { validateModelOptionShape } from './model-catalog.js';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { CronExpressionParser } from 'cron-parser';
import { atomicJSON, jsonFiles, readJSON } from './files.js';

export function nextRuns(cron, timezone, from = new Date(), count = 5) {
  if (typeof cron !== 'string' || cron.trim().split(/\s+/).length !== 5) throw new Error('Use a five-field cron expression: minute hour day month weekday.');
  new Intl.DateTimeFormat('en', { timeZone: timezone }).format();
  const parser = CronExpressionParser.parse(cron, { tz: timezone, currentDate: from });
  return Array.from({ length: count }, () => parser.next().toISOString());
}
export function validateSchedule(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('A schedule must be a JSON object.');
  if (value.schemaVersion !== 1) throw new Error('schemaVersion must be 1.');
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(value.id || '')) throw new Error('id must be a lowercase filename-safe identifier.');
  for (const key of ['name', 'prompt', 'timezone']) if (typeof value[key] !== 'string' || !value[key].trim()) throw new Error(`${key} is required.`);
  if (typeof value.enabled !== 'boolean') throw new Error('enabled must be true or false.');
  if (!['rehearsal', 'copilot'].includes(value.provider)) throw new Error('This prototype supports rehearsal and copilot providers.');
  if (value.provider === 'copilot' && (typeof value.model !== 'string' || !value.model.trim() || value.model === 'auto')) throw new Error('Choose an explicit model for Copilot.');
  if (!value.workspace || typeof value.workspace.cwd !== 'string' || !path.isAbsolute(value.workspace.cwd)) throw new Error('workspace.cwd must be an absolute directory.');
  if (!Array.isArray(value.workspace.additionalDirectories) || value.workspace.additionalDirectories.some(p => typeof p !== 'string' || !path.isAbsolute(p))) throw new Error('workspace.additionalDirectories must be absolute paths.');
  if (value.misfire !== 'skip' && value.misfire !== 'coalesce') throw new Error('misfire must be skip or coalesce.');
  validateModelOptionShape(value);
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
  constructor(dir) { this.dir = dir; fs.mkdirSync(dir, { recursive: true, mode: 0o700 }); }
  list() {
    return jsonFiles(this.dir).map(file => {
      try {
        const schedule = validateSchedule(readJSON(file));
        if (path.basename(file) !== `${schedule.id}.json`) throw new Error('Filename must match schedule id.');
        return { ...schedule, file, revision: revision(schedule), nextRuns: nextRuns(schedule.cron, schedule.timezone) };
      } catch (error) { return { id: path.basename(file, '.json'), file, error: error.message }; }
    });
  }
  get(id) {
    if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(id)) throw new Error('Invalid schedule id.');
    return validateSchedule(readJSON(path.join(this.dir, `${id}.json`)));
  }
  save(value, expectedRevision) {
    const schedule = validateSchedule(structuredClone(value));
    const file = path.join(this.dir, `${schedule.id}.json`);
    if (fs.existsSync(file) && expectedRevision !== revision(readJSON(file))) throw new Error('This file changed outside the app. Reload before saving.');
    for (const key of ['file', 'revision', 'nextRuns', 'error']) delete schedule[key];
    atomicJSON(file, schedule);
    return schedule;
  }
}

export function lastDue(schedule, after, now) {
  const iterator = CronExpressionParser.parse(schedule.cron, { tz: schedule.timezone, currentDate: new Date(now.getTime() + 1) });
  const due = iterator.prev().toDate();
  return due.getTime() > after.getTime() && due.getTime() <= now.getTime() ? due.toISOString() : null;
}
