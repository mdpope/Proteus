import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const SESSION = /^[a-zA-Z0-9_-]{1,80}$/;

/** A dedicated tmux server; it never opens, lists, or kills sessions on the user's default socket. */
export class ProteusTmux {
  constructor(home, { binary = process.platform === 'darwin' ? '/opt/homebrew/bin/tmux' : 'tmux', run = spawnSync } = {}) {
    this.binary = binary;
    this.run = run;
    this.root = path.join(home, 'terminal-tmux');
    fs.mkdirSync(this.root, { recursive: true, mode: 0o700 });
    fs.chmodSync(this.root, 0o700);
    this.socket = path.join(this.root, 'socket');
  }
  available() {
    const result = this.run(this.binary, ['-V'], { encoding: 'utf8', timeout: 2000 });
    return !result.error && result.status === 0;
  }
  command(args, { allowMissing = false } = {}) {
    const env = { ...process.env }; delete env.TMUX; delete env.TMUX_PANE;
    const result = this.run(this.binary, ['-S', this.socket, '-f', '/dev/null', ...args], { encoding: 'utf8', timeout: 4000, maxBuffer: 4 * 1024 * 1024, env });
    if (result.error || (result.status !== 0 && !allowMissing)) throw new Error(`Proteus tmux ${args[0]} failed: ${result.error?.message || String(result.stderr || '').trim() || 'unavailable'}`);
    return result;
  }
  sessions() {
    if (!this.available()) return { available: false, managedSessions: [] };
    const result = this.command(['list-sessions', '-F', '#{session_name}\t#{session_attached}\t#{session_created}\t#{@proteus_session_id}\t#{session_id}'], { allowMissing: true });
    if (result.status !== 0) return { available: true, managedSessions: [] };
    return { available: true, managedSessions: String(result.stdout).trim().split('\n').filter(Boolean).map(line => {
      const [id, attached, created, tag, internalId] = line.split('\t');
      return { id, name: id, tag, internalId, attached: Number(attached) > 0, createdAt: Number(created) ? new Date(Number(created) * 1000).toISOString() : null, provenance: 'Proteus-managed tmux socket' };
    }).filter(item => SESSION.test(item.id) && /^[0-9a-f-]{36}$/i.test(item.tag) && /^\$\d+$/.test(item.internalId)) };
  }
  status() {
    const state = this.sessions();
    const managedPids = [];
    if (!state.managedSessions.length) return { ...state, managedPids };
    const known = new Set(state.managedSessions.map(item => item.id));
    const server = this.command(['display-message', '-p', '#{pid}'], { allowMissing: true });
    const serverPid = Number(String(server.stdout || '').trim());
    if (server.status === 0 && Number.isSafeInteger(serverPid) && serverPid > 0) managedPids.push({ pid: serverPid, sessionId: null, role: 'tmux server' });
    const panes = this.command(['list-panes', '-a', '-F', '#{session_name}\t#{pane_pid}'], { allowMissing: true });
    if (panes.status === 0) for (const line of String(panes.stdout || '').trim().split('\n')) {
      const [sessionId, rawPid] = line.split('\t'), pid = Number(rawPid);
      if (known.has(sessionId) && Number.isSafeInteger(pid) && pid > 0 && !managedPids.some(item => item.pid === pid)) managedPids.push({ pid, sessionId, role: 'tmux pane' });
    }
    return { ...state, managedPids };
  }
  validate(id) { if (!SESSION.test(id)) throw new Error('Invalid Proteus tmux session name.'); return id; }
  create({ id, cwd, shell, args = ['-l'] }) {
    id = this.validate(id);
    if (!path.isAbsolute(cwd) || !path.isAbsolute(shell) || !Array.isArray(args) || args.some(item => typeof item !== 'string' || item.includes('\0'))) throw new Error('Invalid tmux launch settings.');
    if (this.sessions().managedSessions.some(item => item.id === id)) throw new Error('That Proteus tmux session already exists.');
    const tag = randomUUID();
    this.command(['new-session', '-d', '-s', id, '-c', cwd, '--', shell, ...args]);
    try { this.command(['set-option', '-t', id, '@proteus_session_id', tag]); }
    catch (error) { this.command(['kill-session', '-t', id], { allowMissing: true }); throw error; }
    return { id, tag };
  }
  assertIdentity(id, tag) {
    this.validate(id);
    const item = typeof tag === 'string' && /^[0-9a-f-]{36}$/i.test(tag) ? this.sessions().managedSessions.find(item => item.id === id && item.tag === tag) : null;
    if (!item) throw new Error('This Proteus tmux session identity changed or is unavailable.');
    return item;
  }
  attachArgs(id, tag) { const item = this.assertIdentity(id, tag); return ['-S', this.socket, '-f', '/dev/null', 'attach-session', '-t', item.internalId]; }
  capture(id, tag) {
    const item = this.assertIdentity(id, tag);
    const result = this.command(['capture-pane', '-p', '-e', '-S', '-5000', '-t', item.internalId]);
    const bytes = Buffer.from(String(result.stdout || ''), 'utf8');
    const limited = bytes.subarray(Math.max(0, bytes.length - 512 * 1024)).toString('utf8');
    return { data: limited, truncated: bytes.length > 512 * 1024, capturedAt: new Date().toISOString(), sessionId: id, tag };
  }
  end(id, tag) {
    const item = this.assertIdentity(id, tag);
    this.command(['kill-session', '-t', item.internalId]);
  }
}
