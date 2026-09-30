import fs from 'node:fs';
import path from 'node:path';
import { defaultHome, readJSON } from './files.js';
import { ScheduleStore, validateSchedule } from './schedules.js';

const [command, file] = process.argv.slice(2);
try {
  if (command === 'validate') {
    const input = readJSON(file); const entries = Array.isArray(input) ? input : [input];
    for (const entry of entries) validateSchedule(entry);
    console.log(`Validated ${entries.length} schedule(s).`);
  } else if (command === 'import') {
    const input = readJSON(file); const entries = Array.isArray(input) ? input : [input];
    const store = new ScheduleStore(path.join(defaultHome(), 'schedules')); const seen = new Set(store.list().map(s => s.id));
    for (const entry of entries) { validateSchedule(entry); if (seen.has(entry.id)) throw new Error(`Duplicate schedule: ${entry.id}`); seen.add(entry.id); }
    for (const entry of entries) store.save({ ...entry, enabled: false });
    console.log(`Imported ${entries.length} paused schedule(s).`);
  } else if (command === 'list') {
    console.log(JSON.stringify(new ScheduleStore(path.join(defaultHome(), 'schedules')).list(), null, 2));
  } else {
    console.log('Usage: npm run cli -- validate FILE | import FILE | list');
    if (command) process.exitCode = 1;
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
