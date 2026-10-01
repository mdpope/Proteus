import fs from 'node:fs';
import path from 'node:path';
import { randomInt } from 'node:crypto';
import { atomicJSON, readJSON } from './files.js';
import { revision } from './schedules.js';

export class StandupStore {
  constructor(home, timezone) {
    this.file = path.join(home, 'standup.json');
    if (!fs.existsSync(this.file)) atomicJSON(this.file, { schemaVersion: 1, timezone, random: [], fixed: [], instructions: '', current: null });
  }
  get() { const value = readJSON(this.file); return { ...value, file: this.file, revision: revision(value) }; }
  save(value, expectedRevision) {
    const current = this.get();
    if (current.revision !== expectedRevision) throw new Error('Standup settings changed. Reload before saving.');
    new Intl.DateTimeFormat('en', { timeZone: value.timezone }).format();
    if (!Array.isArray(value.random) || !Array.isArray(value.fixed) || [...value.random, ...value.fixed].some(name => typeof name !== 'string' || !name.trim()) || typeof value.instructions !== 'string') throw new Error('Enter one member per line and valid instructions.');
    const names = [...value.random, ...value.fixed].map(name => name.trim());
    if (new Set(names).size !== names.length) throw new Error('Each name must appear only once.');
    const clean = { ...current, timezone: value.timezone, random: value.random.map(n => n.trim()), fixed: value.fixed.map(n => n.trim()), instructions: value.instructions };
    delete clean.file; delete clean.revision; atomicJSON(this.file, clean); return this.get();
  }
  generate(expectedRevision, now = new Date(), random = randomInt) {
    const value = this.get();
    if (value.revision !== expectedRevision) throw new Error('Standup changed. Refresh before generating.');
    if (!value.random.length && !value.fixed.length) throw new Error('Add members in Settings first.');
    const shuffled = [...value.random];
    for (let i = shuffled.length - 1; i > 0; i--) { const j = random(i + 1); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: value.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    value.current = { date, generatedAt: now.toISOString(), order: [...shuffled, ...value.fixed], instructions: value.instructions, timezone: value.timezone };
    delete value.file; delete value.revision; atomicJSON(this.file, value); return this.get();
  }
}
