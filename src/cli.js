import fs from 'node:fs';
import path from 'node:path';
import { defaultHome, readJSON } from './shared/files.js';
import { ScheduleStore, validateSchedule, revision } from './services/scheduling/schedules.js';

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
  } else if (command === 'refresh') {
    const input = readJSON(file); const entries = Array.isArray(input) ? input : [input];
    const store = new ScheduleStore(path.join(defaultHome(), 'schedules'));
    const changes = entries.map(entry => {
      validateSchedule(entry); const current = store.get(entry.id);
      if (!current.source?.manifest || current.source.manifest !== entry.source?.manifest || current.source.system !== entry.source?.system) throw new Error(`Source ownership mismatch for ${entry.id}`);
      return { entry, expected: revision(current) };
    });
    if (new Set(entries.map(entry => entry.id)).size !== entries.length) throw new Error('Duplicate schedule IDs in refresh.');
    for (const { entry, expected } of changes) store.save({ ...entry, enabled: false }, expected);
    console.log(`Refreshed ${entries.length} source-owned schedule(s), paused. Run history is preserved.`);
  } else if (command === 'list') {
    console.log(JSON.stringify(new ScheduleStore(path.join(defaultHome(), 'schedules')).list(), null, 2));
  } else {
    console.log('Usage: npm run cli -- validate FILE | import FILE | refresh FILE | list');
    if (command) process.exitCode = 1;
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
