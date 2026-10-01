import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { atomicJSON, jsonFiles, readJSON } from './files.js';
import { ScheduleStore, lastDue, revision, validateSchedule } from './schedules.js';
import { RehearsalProvider } from './rehearsal.js';

const active = new Set(['queued', 'running', 'awaiting_input']);
export class Engine extends EventEmitter {
  constructor(home, providers = {}, clock = () => new Date()) {
    super(); this.home = home; this.clock = clock;
    this.schedules = new ScheduleStore(path.join(home, 'schedules'));
    this.runsDir = path.join(home, 'runs');
    this.providers = { rehearsal: new RehearsalProvider(), ...providers };
    this.pending = new Map(); this.questionQueues = new Map(); this.running = null; this.stopping = false;
    fs.mkdirSync(this.runsDir, { recursive: true, mode: 0o700 });
    this.journal = readJSON(path.join(home, 'scheduler.json'), { lastPoll: clock().toISOString(), slots: {} });
    this.runs = new Map();
    for (const file of jsonFiles(this.runsDir)) {
      try {
        const run = readJSON(file);
        if (active.has(run.status)) {
          run.status = 'interrupted'; run.pending = null;
          run.events.push({ role: 'system', text: 'The runner stopped. Continue this session to recover; no work was silently replayed.', at: clock().toISOString() });
          atomicJSON(file, run);
        }
        this.runs.set(run.id, run);
      } catch (error) { this.recoveryErrors ??= []; this.recoveryErrors.push({ file, error: error.message }); }
    }
  }
  now() { return this.clock().toISOString(); }
  persist(run) { run.updatedAt = this.now(); atomicJSON(path.join(this.runsDir, `${run.id}.json`), run); this.emit('change'); }
  event(run, role, text, data) {
    run.events.push({ role, text, ...(data ? { data } : {}), at: this.now() }); this.persist(run);
  }
  listRuns() { return [...this.runs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
  getRun(id) { const run = this.runs.get(id); if (!run) throw new Error('Run not found.'); return run; }
  createRun(schedule, trigger = 'manual', slot = null) {
    validateSchedule(schedule);
    if (this.stopping) throw new Error('Runner is stopping.');
    if ([...this.runs.values()].some(run => run.schedule.id === schedule.id && active.has(run.status))) throw new Error('This schedule already has an active run.');
    for (const dir of [schedule.workspace.cwd, ...schedule.workspace.additionalDirectories]) if (!fs.statSync(dir).isDirectory()) throw new Error(`Workspace directory unavailable: ${dir}`);
    const run = {
      id: randomUUID(), schedule: structuredClone(schedule), scheduleRevision: revision(schedule),
      title: schedule.name, trigger, slot, status: 'queued', createdAt: this.now(), updatedAt: this.now(),
      events: [{ role: 'user', text: schedule.prompt, at: this.now() }], pending: null,
      providerSessionId: null, usage: { inputTokens: 0, outputTokens: 0, observed: false },
      nextPrompt: schedule.prompt
    };
    this.runs.set(run.id, run); this.persist(run); queueMicrotask(() => this.drain()); return run;
  }
  resume(id, prompt) {
    const run = this.getRun(id);
    if (active.has(run.status)) throw new Error('Reply to the pending question, or wait for the active turn.');
    if (typeof prompt !== 'string' || !prompt.trim()) throw new Error('A follow-up message is required.');
    run.status = 'queued'; run.pending = null; run.nextPrompt = prompt;
    this.event(run, 'user', prompt); queueMicrotask(() => this.drain()); return run;
  }
  reply(id, answer, requestId) {
    const run = this.getRun(id); const pending = this.pending.get(id);
    if (!pending || run.pending?.id !== requestId) throw new Error('This request is no longer waiting for an answer.');
    if (typeof answer !== 'string' || !answer.trim()) throw new Error('A reply is required.');
    if (run.pending.type === 'permission' && !['approve', 'deny'].includes(answer)) throw new Error('Choose approve or deny.');
    this.pending.delete(id); run.pending = null; run.status = 'running';
    this.event(run, 'user', answer); pending.resolve(answer); return run;
  }
  ask(run, request, signal) {
    const previous = this.questionQueues.get(run.id) || Promise.resolve();
    const response = previous.catch(() => {}).then(() => this.askNext(run, request, signal));
    this.questionQueues.set(run.id, response);
    const cleanup = () => { if (this.questionQueues.get(run.id) === response) this.questionQueues.delete(run.id); };
    response.then(cleanup, cleanup);
    return response;
  }
  askNext(run, request, signal) {
    if (signal.aborted) return Promise.reject(new Error('Cancelled'));
    return new Promise((resolve, reject) => {
      const onAbort = () => { this.pending.delete(run.id); reject(new Error('Cancelled')); };
      signal.addEventListener('abort', onAbort, { once: true });
      this.pending.set(run.id, {
        resolve: value => { signal.removeEventListener('abort', onAbort); resolve(value); },
        reject: error => { signal.removeEventListener('abort', onAbort); reject(error); }
      });
      run.pending = { ...request, id: randomUUID() }; run.status = 'awaiting_input'; this.persist(run);
    });
  }
  async drain() {
    if (this.running || this.stopping) return;
    const run = [...this.runs.values()].find(value => value.status === 'queued'); if (!run) return;
    const controller = new AbortController(); this.running = { id: run.id, controller };
    run.status = 'running'; const prompt = run.nextPrompt; delete run.nextPrompt; this.persist(run);
    try {
      const provider = this.providers[run.schedule.provider]; if (!provider) throw new Error('Provider is not installed.');
      await provider.run({
        run, prompt, signal: controller.signal,
        emit: (role, text, data) => this.event(run, role, text, data),
        update: () => this.persist(run),
        ask: request => this.ask(run, request, controller.signal)
      });
      run.status = controller.signal.aborted ? (this.stopping ? 'interrupted' : 'cancelled') : 'completed';
    } catch (error) {
      run.status = controller.signal.aborted ? (this.stopping ? 'interrupted' : 'cancelled') : 'failed';
      this.event(run, 'system', error.message);
    } finally {
      // Provider errors/timeouts can leave permission promises pending. Settle them
      // before another turn reuses this run's serialized question queue.
      controller.abort();
      this.pending.delete(run.id); run.pending = null; this.persist(run); this.running = null;
      queueMicrotask(() => this.drain());
    }
  }
  cancel(id) {
    const run = this.getRun(id);
    if (!active.has(run.status)) throw new Error('This run is not active.');
    if (this.running?.id === id) this.running.controller.abort();
    else { run.status = 'cancelled'; delete run.nextPrompt; this.persist(run); }
  }
  tick() {
    const now = this.clock(); const after = new Date(this.journal.lastPoll);
    if (now <= after) return;
    for (const scheduleInfo of this.schedules.list()) {
      if (scheduleInfo.error || !scheduleInfo.enabled) continue;
      const schedule = this.schedules.get(scheduleInfo.id);
      const due = lastDue(schedule, after, now);
      if (!due || this.journal.slots[schedule.id] === due) continue;
      // A persisted run is also a claim: a crash between run and journal writes cannot duplicate it.
      const exists = [...this.runs.values()].some(run => run.schedule.id === schedule.id && run.slot === due);
      if (!exists && (schedule.misfire === 'coalesce' || now - new Date(due) < 60000)) {
        try { this.createRun(schedule, 'scheduled', due); }
        catch (error) { this.emit('scheduler-error', { schedule: schedule.id, error: error.message, at: this.now() }); }
      }
      this.journal.slots[schedule.id] = due;
    }
    this.journal.lastPoll = now.toISOString(); atomicJSON(path.join(this.home, 'scheduler.json'), this.journal);
  }
  async close() {
    this.stopping = true;
    if (this.running) this.running.controller.abort();
    for (const provider of Object.values(this.providers)) await provider.close?.();
    for (const run of this.runs.values()) if (active.has(run.status)) { run.status = 'interrupted'; run.pending = null; this.persist(run); }
  }
}
