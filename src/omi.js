import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { atomicJSON, readJSON } from './files.js';
import { revision } from './schedules.js';
import { runLocalProcess } from './local-process.js';

const execFileAsync = promisify(execFile);
const nativePath = value => typeof value === 'string' && (value === '~' || value.startsWith('~/')) ? path.join(os.homedir(), value.slice(2)) : value;
export const OMI_JOBS = Object.freeze([
  { id: 'audio', scheduleId: 'omi-audio-worker', name: 'Omi · Audio & transcription', label: 'org.proteusapp.review.omi-audio-worker', command: 'run', args: ['--max-jobs', '8'], log: 'launchd', description: 'Verify incoming recordings, revise sessions, run local MacWhisper ASR and package the library.' },
  { id: 'library', scheduleId: 'omi-library-sync', name: 'Omi · Library & review controls', label: 'org.proteusapp.review.omi-library-sync', command: 'library', args: ['--housekeeping-only', '--apply'], log: 'omi-library-sync', description: 'Synchronize phone review and Keep controls through the existing guarded native worker.' },
  { id: 'semantic', scheduleId: 'omi-semantic-worker', name: 'Omi · Semantic processing', label: 'org.proteusapp.review.omi-semantic-worker', command: 'semantic-run', args: ['--max-jobs', '1', '--apply'], log: 'omi-semantic-worker', description: 'Run one bounded Codex semantic group or review answer; existing policy, domain routing and publication locks apply.' }
]);
export const TRANSCRIPT_AUTOMATIONS = [
  { id: 'intake', sourceId: 'cerebro-transcript-intake', manifestId: 'cerebro-transcript-intake', scheduleId: 'omi-transcript-intake', name: 'Transcript intake', cron: '15 * * * *' },
  { id: 'followup', sourceId: 'cerebro-transcript-follow-up-review', manifestId: 'cerebro-transcript-review', scheduleId: 'omi-transcript-follow-up-review', name: 'Transcript follow-up review', cron: '45 20 * * *' }
];
const AUTOMATIONS = TRANSCRIPT_AUTOMATIONS;
const sourceHash = source => createHash('sha256').update(JSON.stringify([source.prompt,source.model,source.reasoning_effort,source.rrule,source.cwds,source.timezone,source.policyRoot])).digest('hex');
const genericJob = schedule => AUTOMATIONS.find(job => job.scheduleId === schedule?.id || job.id === schedule?.integration?.job);
const numeric = new Set(['source_issues','exhausted_jobs','free_bytes','candidates','conflicts','expired','packaged','removed_bytes','retry_deferred','superseded','unavailable','updated','imported','staged','max_items','returncode','inventory_seconds','eligible_sources','eligible_jobs','processed','completed','pending','failed','ready','transcribed','filed','retry','new','staged','processing','held','open','closing','final','reopened','count','queued','done','discovered','invalid','ignored','attempts']);
const containers = new Set(['sources','jobs','source_counts','controls','library','library_after_asr','review','raw_cleanup','semantic_wake','low_disk_recovery','counts']);
const states = new Set(['disabled','preview','requested','scheduled_retry','busy','ok','completed','idle','failed','running','pending','skipped']);
export function safeOmiMetadata(value, depth = 0) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || depth > 4) return {};
  const out = {};
  for (const [key, item] of Object.entries(value)) {
    if (numeric.has(key) && typeof item === 'number' && Number.isFinite(item)) out[key] = item;
    else if (['enabled','capacity_restored'].includes(key) && typeof item === 'boolean') out[key] = item;
    else if (['checked_at','generated_at','inventory_completed_at'].includes(key) && typeof item === 'string' && /^\d{4}-\d\d-\d\dT[\d:.+Z-]+$/.test(item)) out[key] = item;
    else if (key === 'status' && states.has(item)) out[key] = item;
    else if (key === 'errors' && Array.isArray(item)) out.error_count = item.length;
    else if (containers.has(key)) { const nested = safeOmiMetadata(item, depth + 1); if (Object.keys(nested).length) out[key] = nested; }
  }
  return out;
}
function safeLine(line) { try { const value = safeOmiMetadata(JSON.parse(line)); return Object.keys(value).length ? value : null; } catch { return null; } }
function boundedJSON(file, max = 1048576) {
  const fd = fs.openSync(file, 'r');
  try { const stat = fs.fstatSync(fd); if (!stat.isFile() || stat.size > max) throw new Error('Metadata exceeds the bounded reader limit.'); return JSON.parse(fs.readFileSync(fd, 'utf8')); } finally { fs.closeSync(fd); }
}
function insideFile(root, relative) {
  const resolvedRoot = fs.realpathSync(root), target = fs.realpathSync(path.join(root, relative));
  if (!target.startsWith(resolvedRoot + path.sep)) throw new Error('Metadata path leaves the configured pipeline.');
  return target;
}
function readAutomation(root, sourceId) {
  const file = insideFile(root, `${sourceId}/automation.toml`);
  if (fs.statSync(file).size > 262144) throw new Error('Automation file is too large.');
  const source = fs.readFileSync(file, 'utf8');
  const values = {};
  // Supported Codex export scalar syntax; reject unsupported source shapes instead of guessing.
  for (const key of ['id','name','status','rrule','model','reasoning_effort','prompt']) {
    const match = source.match(new RegExp(`^${key} = (".*")$`, 'm'));
    if (match) values[key] = JSON.parse(match[1]);
  }
  const cwd = source.match(/^cwds = (\[.*\])$/m); values.cwds = cwd ? JSON.parse(cwd[1]) : [];
  if (values.id !== sourceId) throw new Error('Automation identity does not match its source.');
  return { ...values, file };
}
async function launchdProbe(label) {
  if (process.platform !== 'darwin') return { state: 'unknown' };
  try { await execFileAsync('/bin/launchctl', ['print', `gui/${process.getuid()}/${label}`], { timeout: 4000, maxBuffer: 65536 }); return { state: 'loaded' }; }
  catch (error) { return { state: /Could not find service|Could not find specified service/i.test(error.stderr || '') ? 'unloaded' : 'unknown' }; }
}
export function isOmiSchedule(schedule) { return schedule?.integration?.type === 'omi' || schedule?.provider === 'local-process' || [...OMI_JOBS, ...AUTOMATIONS].some(job => job.scheduleId === schedule?.id); }
export class OmiIntegration {
  constructor(home, options = {}) {
    this.home = home; this.file = path.join(home, 'omi.json'); this.launchdProbe = options.launchdProbe || launchdProbe; this.execute = options.execute || runLocalProcess;
    const root = path.join(os.homedir(), 'Library', 'Application Support', 'OmiPipeline');
    this.defaults = { schemaVersion: 1, enabled: false, takeoverConfirmed: false, intakeEnabled: false, intakeTakeoverConfirmed: false, workflowRoot: '', pipelineRoot: root, pythonPath: path.join(root, 'worker', '.venv', 'bin', 'python'), workerPath: path.join(root, 'worker', 'omi_worker.py'), configPath: path.join(root, 'config.json'), automationRoot: path.join(os.homedir(), '.codex', 'automations'), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, timeoutMinutes: 120 };
  }
  getSettings() { const value = readJSON(this.file, this.defaults); return { ...this.defaults, ...value, revision: revision(value) }; }
  validate(value) {
    if (value?.schemaVersion !== 1 || typeof value.enabled !== 'boolean' || typeof value.takeoverConfirmed !== 'boolean') throw new Error('Invalid Omi settings.');
    if (typeof value.intakeEnabled !== 'boolean' || typeof value.intakeTakeoverConfirmed !== 'boolean' || typeof value.workflowRoot !== 'string' || (value.workflowRoot && (!path.isAbsolute(value.workflowRoot) || value.workflowRoot.includes('\0')))) throw new Error('Invalid general transcript intake settings.');
    if (value.intakeEnabled && !value.intakeTakeoverConfirmed) throw new Error('Confirm the separate Codex automation cutover before enabling general intake.');
    for (const key of ['pipelineRoot','pythonPath','workerPath','configPath','automationRoot']) if (typeof value[key] !== 'string' || !path.isAbsolute(value[key]) || value[key].includes('\0')) throw new Error(`Choose an absolute ${key}.`);
    if (!Number.isInteger(value.timeoutMinutes) || value.timeoutMinutes < 1 || value.timeoutMinutes > 360) throw new Error('Timeout must be between 1 and 360 minutes.');
    new Intl.DateTimeFormat('en', { timeZone: value.timezone }).format();
    if (value.enabled && !value.takeoverConfirmed) throw new Error('Confirm the separate native-service cutover before enabling Omi execution.');
    return value;
  }
  async saveSettings(value, expectedRevision) {
    if (expectedRevision !== this.getSettings().revision) throw new Error('Omi settings changed. Reload before saving.');
    const clean = { ...this.defaults, ...structuredClone(value) }; delete clean.revision; this.validate(clean);
    if (clean.enabled) { this.verifyRuntime(clean); await this.assertNativeStopped(); }
    if (clean.intakeEnabled) {
      let count = 0;
      for (const job of AUTOMATIONS) { if (!fs.existsSync(path.join(clean.automationRoot,job.sourceId,'automation.toml'))) continue; const {source} = this.automationSource(job,clean); if(source.status !== 'PAUSED') throw new Error('The source Codex automations must be paused before Proteus can own general intake.'); count++; }
      if (!count) throw new Error('Configure a verified canonical transcript automation before enabling general intake.');
    }
    if (expectedRevision !== this.getSettings().revision) throw new Error('Omi settings changed. Reload before saving.');
    atomicJSON(this.file, clean); return this.getSettings();
  }
  verifyRuntime(settings) {
    if (!fs.statSync(settings.pipelineRoot).isDirectory()) throw new Error('Pipeline root is unavailable.');
    for (const key of ['pythonPath','workerPath','configPath']) if (!fs.statSync(settings[key]).isFile()) throw new Error('Configured native runtime is unavailable.');
    fs.accessSync(settings.pythonPath, fs.constants.X_OK);
    const config = boundedJSON(settings.configPath);
    if (config.state_dir && fs.realpathSync(nativePath(config.state_dir)) !== fs.realpathSync(settings.pipelineRoot)) throw new Error('Native config and Omi pipeline root differ.');
  }
  async nativeServices() { return Promise.all(OMI_JOBS.map(async job => ({ id: job.id, label: job.label, ...await this.launchdProbe(job.label) }))); }
  async assertNativeStopped() { const services = await this.nativeServices(); if (services.some(item => item.state !== 'unloaded')) throw new Error('Native Omi services are loaded or ownership cannot be verified. Complete the separate cutover before running Proteus schedules.'); }
  policyRoot(settings = this.getSettings()) {
    const root = settings.workflowRoot || nativePath(boundedJSON(settings.configPath).semantic?.wtbos_root);
    if (typeof root !== 'string' || !path.isAbsolute(root)) throw new Error('Choose the canonical personal workflow checkout in Transcription settings.');
    return root;
  }
  automationSource(job, settings = this.getSettings()) {
    const source = readAutomation(settings.automationRoot, job.sourceId), root = this.policyRoot(settings);
    const manifestFile = insideFile(root, `automations/${job.manifestId}.json`), manifest = boundedJSON(manifestFile);
    const rule = job.id === 'intake' ? 'FREQ=HOURLY;INTERVAL=1;BYMINUTE=15;BYSECOND=0' : 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR,SA,SU;BYHOUR=20;BYMINUTE=45;BYSECOND=0';
    const expectedHours = job.id === 'intake' ? Array.from({length:24},(_,i)=>i) : [20];
    if (manifest.id !== job.manifestId || manifest.schema_version !== 1 || source.rrule !== rule || JSON.stringify(manifest.schedule?.hours) !== JSON.stringify(expectedHours) || manifest.schedule?.minute !== (job.id === 'intake' ? 15 : 45) || JSON.stringify(manifest.schedule?.weekdays) !== JSON.stringify(['MO','TU','WE','TH','FR','SA','SU'])) throw new Error('Source automation cadence changed. Review the canonical schedule before migration.');
    if (!source.prompt || source.prompt !== manifest.prompt || source.model !== manifest.model || source.reasoning_effort !== manifest.reasoning_effort || !source.cwds.length || !source.cwds.every(item => typeof item === 'string' && path.isAbsolute(item))) throw new Error('Installed and canonical transcript automation differ. Reconcile the source before migration.');
    new Intl.DateTimeFormat('en',{timeZone:manifest.timezone}).format();
    if (!manifest.timezone) throw new Error('The canonical transcript automation needs an explicit timezone.');
    const policyFiles = ['AGENTS.md','agent/transcript-intake.md','agent/omi-transcript-intake.md','plugins/milo/skills/transcript-intake/SKILL.md'].map(file=>insideFile(root,file));
    return {source,root,manifest,manifestFile,policyFiles,sourceRevision:sourceHash({...source,timezone:manifest.timezone,policyRoot:root})};
  }
  assertEnabled(schedule) {
    if (!isOmiSchedule(schedule)) return;
    const settings = this.validate(this.getSettings()), general = genericJob(schedule);
    if (general ? (!settings.intakeEnabled || !settings.intakeTakeoverConfirmed) : (!settings.enabled || !settings.takeoverConfirmed)) throw new Error(general ? 'General transcript intake is disabled in Proteus. Existing Codex automations retain ownership.' : 'Omi processing is disabled in Proteus. Existing native services retain ownership.');
    const job = [...OMI_JOBS, ...AUTOMATIONS].find(item => item.id === schedule.integration?.job);
    if (schedule.integration?.type !== 'omi' || !job || schedule.id !== job.scheduleId || schedule.provider !== (AUTOMATIONS.includes(job) ? 'codex' : 'local-process')) throw new Error('Unrecognized transcription schedule. Prepare it from Transcription settings.');
  }
  async assertRunnable(schedule) {
    if (!isOmiSchedule(schedule)) return;
    this.assertEnabled(schedule);
    const automation = genericJob(schedule);
    if (automation) {
      const value = this.automationSource(automation);
      if (value.source.status !== 'PAUSED') throw new Error('The source Codex automation must be paused before Proteus can own this schedule.');
      if (schedule.integration.sourceRevision !== value.sourceRevision) throw new Error('The transcript source changed or this is a legacy snapshot. Prepare and review its replacement before running.');
    } else { await this.assertNativeStopped(); this.verifyRuntime(this.getSettings()); }
    this.assertEnabled(schedule);
  }
  automationInventory() {
    const settings = this.getSettings();
    return AUTOMATIONS.map(item => {
      let source; try { source = readAutomation(settings.automationRoot,item.sourceId); } catch { return {...item,available:false,canonicalVerified:false}; }
      const record = {...item,available:true,sourceStatus:['ACTIVE','PAUSED'].includes(source.status)?source.status:'UNKNOWN',source:source.file,model:source.model,reasoningEffort:source.reasoning_effort};
      try { const verified=this.automationSource(item,settings);return {...record,canonicalVerified:true,manifest:verified.manifestFile,timezone:verified.manifest.timezone,sourceRevision:verified.sourceRevision}; }
      catch { return {...record,canonicalVerified:false,issue:'Canonical policy or schedule differs, is unavailable, or needs review.'}; }
    });
  }
  async status() {
    const settings = this.getSettings(), metadata = {};
    for (const [key, file] of [['audio','status.json'], ['library','library/status.json'], ['queue','intake-state.json']]) {
      try { const target = insideFile(settings.pipelineRoot, file); const value = boundedJSON(target); metadata[key] = { available: true, modifiedAt: fs.statSync(target).mtime.toISOString(), ...safeOmiMetadata(value) }; } catch { metadata[key] = { available: false }; }
    }
    let runtimeAvailable = false; try { this.verifyRuntime(settings); runtimeAvailable = true; } catch { /* Read-only status can describe incomplete setup. */ }
    return { settings, areas: [{id:'omi',name:'Omi',enabled:settings.enabled,scope:'Pendant recording preparation, local ASR, library controls and guarded semantic publication.'},{id:'general',name:'private notes & MacWhisper',enabled:settings.intakeEnabled,scope:'Stable transcript exports, mixed review queues, People/project/household context effects and daily summary/follow-up audits.'}], status: { enabled: settings.enabled, intakeEnabled: settings.intakeEnabled, runtimeAvailable, nativeServices: await this.nativeServices(), metadata, checkedAt: new Date().toISOString() }, jobs: OMI_JOBS, automations: this.automationInventory() };
  }
  logs(jobId, stream = 'out', limit = 50) {
    const job = OMI_JOBS.find(item => item.id === jobId);
    if (!job || !['out','err'].includes(stream)) throw new Error('Choose a known Omi job and log stream.');
    const count = Math.max(1, Math.min(200, Number.isFinite(Number(limit)) ? Math.floor(Number(limit)) : 50));
    const result = { job: jobId, stream, records: [], withheld: 0, available: false, note: 'Metadata only. Private text, transcript content and paths are withheld.' };
    let fd;
    try {
      const file = insideFile(this.getSettings().pipelineRoot, `logs/${job.log}.${stream}.log`); fd = fs.openSync(file, 'r'); const stat = fs.fstatSync(fd); if (!stat.isFile()) return result;
      const length = Math.min(stat.size, 262144), start = stat.size - length, buffer = Buffer.alloc(length); fs.readSync(fd, buffer, 0, length, start);
      let lines = buffer.toString('utf8').split('\n'); if (start > 0) lines.shift(); if (!lines.at(-1)) lines.pop();
      for (const line of lines.slice(-count)) { const safe = line.length <= 32768 ? safeLine(line) : null; if (safe) result.records.push(safe); else result.withheld++; }
      result.available = true; result.localPath = file; result.modifiedAt = stat.mtime.toISOString(); result.truncated = start > 0; return result;
    } catch { return result; } finally { if (fd !== undefined) fs.closeSync(fd); }
  }
  prepareSchedules(store, expectedRevision, area = 'all') {
    if (!['all','omi','general'].includes(area)) throw new Error('Choose Omi, general intake or all transcription schedules.');
    const settings = this.getSettings(); if (expectedRevision !== settings.revision) throw new Error('Omi settings changed. Reload before preparing schedules.');
    const definitions = (area === 'general' ? [] : OMI_JOBS).map(job => ({ job, provider: 'local-process', model: '', prompt: job.description, workspace: { cwd: settings.pipelineRoot, additionalDirectories: [] }, cron: '* * * * *' }));
    for (const job of area === 'omi' ? [] : AUTOMATIONS) {
      try { readAutomation(settings.automationRoot,job.sourceId); } catch { continue; }
      const {source,root,manifest,manifestFile,policyFiles,sourceRevision} = this.automationSource(job,settings);
      const preamble = 'This schedule follows the canonical personal transcript workflow. Before processing, read these repository-owned files completely; host skill discovery is not assumed:\n' + policyFiles.map(file=>'- '+file).join('\n') + '\nThe canonical schedule manifest is '+manifestFile+'. Use its workflow and existing guarded helpers. For Omi work, use the configured native executor and its claims; never become a second publisher. Resolve machine paths from the source workflow. Do not create another recurring task.\n\n';
      definitions.push({job,provider:'codex',model:source.model,prompt:preamble+source.prompt,reasoningEffort:source.reasoning_effort,workspace:{cwd:source.cwds[0],additionalDirectories:[...new Set([...source.cwds.slice(1),root,...(fs.existsSync(settings.pipelineRoot)?[settings.pipelineRoot]:[])])]},cron:job.cron,timezone:manifest.timezone,source:source.file,sourceRevision,manifest:manifestFile,sourcePrompt:source.prompt});
    }
    // All source documents are validated before any schedule is changed. Existing schedules retain edits.
    const existing = new Map(store.list().map(value => [value.id, value]));
    for (const { job } of definitions) if (existing.has(job.scheduleId) && (existing.get(job.scheduleId).error || existing.get(job.scheduleId).integration?.type !== 'omi')) throw new Error('An existing schedule has a conflicting Omi identity.');
    for (const definition of definitions) { const prior=existing.get(definition.job.scheduleId); if(prior && definition.sourceRevision && ((prior.integration.sourceRevision && prior.integration.sourceRevision !== definition.sourceRevision) || (!prior.integration.sourceRevision && !prior.prompt?.endsWith(definition.sourcePrompt)))) throw new Error('An existing transcript schedule has changed source content. Review its prompt before replacing it.'); }
    return definitions.map(({ job, source, sourceRevision, manifest, sourcePrompt, ...definition }) => {
      const prior = existing.get(job.scheduleId);
      if (prior) return store.save({ ...prior, enabled: false, integration:{...prior.integration,area:source?'general':'omi',...(sourceRevision?{sourceRevision,manifest,sourceId:job.sourceId,manifestId:job.manifestId}:{})} }, prior.revision);
      return store.save({ schemaVersion: 1, id: job.scheduleId, name: job.name, enabled: false, timezone: settings.timezone, misfire: 'skip', ...definition, integration: { type: 'omi', job: job.id, area:source?'general':'omi', ...(source ? { source, sourceRevision, manifest, sourceId:job.sourceId, manifestId:job.manifestId } : {}) }, contextSelection: { includeDefaults: false, selectedIds: [] } });
    });
  }
  provider() {
    return {
      status: async () => ({ available: this.getSettings().enabled, label: 'Omi native worker', usage: null }),
      close: async () => {},
      run: async ({ run, signal, emit }) => {
        await this.assertRunnable(run.schedule); if (signal?.aborted) throw new Error('Cancelled');
        const settings = this.getSettings(), job = OMI_JOBS.find(item => item.id === run.schedule.integration.job);
        if (!job) throw new Error('This Omi job requires its configured AI provider.');
        this.assertEnabled(run.schedule);
        emit('system', `${job.name}: starting the installed worker with its existing configuration and native locks.`);
        let records = 0;
        await this.execute({ command: settings.pythonPath, args: [settings.workerPath, '--config', settings.configPath, job.command, ...job.args], cwd: settings.pipelineRoot, signal, timeoutMs: settings.timeoutMinutes * 60000, sanitize: safeLine, onRecord: ({ data }) => { if (records++ < 200) emit('system', JSON.stringify(data), { omi: data }); } });
        emit('assistant', 'The native worker exited successfully. This confirms process completion; inspect processing status for held, pending or failed items.');
      }
    };
  }
}
