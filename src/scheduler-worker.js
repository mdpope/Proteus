import { parentPort, workerData } from 'node:worker_threads';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { atomicJSON, jsonFiles } from './files.js';
import { lastDue, revision, validateSchedule } from './schedules.js';

const schedulesDir = path.join(workerData.home, 'schedules');
const checkpointFile = path.join(workerData.home, 'scheduler.json');
const cache = new Map();

function readSchedule(file) {
  // Always read disk. Cached validation must never hide an external edit, even
  // one that preserves the file's timestamp or size.
  const source = fs.readFileSync(file, 'utf8');
  const previous = cache.get(file);
  if (previous?.source === source) return previous;
  let entry;
  try {
    const schedule = validateSchedule(JSON.parse(source));
    if (path.basename(file) !== `${schedule.id}.json`) throw new Error('Filename must match schedule id.');
    entry = { source, schedule, revision: revision(schedule) };
  } catch (error) { entry = { source, error: error.message }; }
  cache.set(file, entry);
  return entry;
}

function scan(journal, timestamp) {
  const now = new Date(timestamp), after = new Date(journal.lastPoll), due = [], errors = [];
  const files = jsonFiles(schedulesDir), current = new Set(files);
  for (const file of cache.keys()) if (!current.has(file)) cache.delete(file);
  for (const file of files) {
    let entry;
    try { entry = readSchedule(file); }
    catch (error) { errors.push({ schedule: path.basename(file, '.json'), error: error.message }); continue; }
    if (entry.error) { errors.push({ schedule: path.basename(file, '.json'), error: entry.error }); continue; }
    if (!entry.schedule.enabled) continue;
    // Five-field cron occurrences fall on minute boundaries; there is no new
    // slot within the same minute, including across a timezone/DST transition.
    if (Math.floor(now.getTime() / 60000) === Math.floor(after.getTime() / 60000)) continue;
    const slot = lastDue(entry.schedule, after, now);
    if (slot && journal.slots[entry.schedule.id] !== slot) due.push({ schedule: entry.schedule, revision: entry.revision, slot });
  }
  return { due, errors, scheduleCount: files.length };
}

parentPort.on('message', ({ id, method, args }) => {
  const started = performance.now();
  try {
    let result;
    if (method === 'scan') result = scan(...args);
    else if (method === 'verify') result = args[0].every(item => {
      try { return readSchedule(path.join(schedulesDir, `${item.schedule.id}.json`)).revision === item.revision; }
      catch { return false; }
    });
    else if (method === 'checkpoint') atomicJSON(checkpointFile, args[0]);
    else if (method !== 'close') throw new Error('Unknown scheduler worker operation.');
    parentPort.postMessage({ id, result, durationMs: performance.now() - started });
    if (method === 'close') parentPort.close();
  } catch (error) { parentPort.postMessage({ id, error: error.message, code: error.code, durationMs: performance.now() - started }); }
});
