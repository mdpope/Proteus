import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
const MAX_BYTES = 20 * 1024 * 1024;
const sha256 = data => createHash('sha256').update(data).digest('hex');
const inside = (root, target) => target.startsWith(root.replace(/\/$/, '') + '/');
function relativePath(value) {
    if (typeof value !== 'string' || !value || value.length > 2000 || /[\x00-\x1f\x7f]/.test(value) || value.startsWith('/') || value.split('/').some(part => !part || part === '.' || part === '..') || path.posix.normalize(value) !== value) throw new Error('Invalid evidence path.');
    return value;
}
function quote(value) { if (/[\x00-\x1f\x7f]/.test(value)) throw new Error('Invalid evidence path.'); return '"' + value.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'; }
export function validateEvidenceProfile(profile) {
    const value = profile.evidence;
    if (!value) return;
    if (value.mode !== 'sftp' || !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/.test(value.sshAlias || '') || typeof value.root !== 'string' || !value.root.startsWith('/') || value.root === '/' || /[\x00-\x1f\x7f]/.test(value.root) || path.posix.normalize(value.root) !== value.root || value.root.endsWith('/')) throw new Error('Shared evidence requires a saved SSH alias and a private absolute SFTP root.');
}
export function evidenceStatus(profile) { return { available: !!(profile.evidence?.mode === 'sftp' || profile.storageRoot), shared: profile.evidence?.mode === 'sftp', writable: !!(profile.storageRoot || profile.evidence?.mode === 'sftp') && profile.readOnly !== true && (profile.driver === 'sqlite' || profile.evidence?.mode === 'sftp') }; }
export async function sftpBatch(alias, commands, { monitorFile } = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn('/usr/bin/sftp', ['-q', '-b', '-', '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', '-o', 'ConnectTimeout=10', '-o', 'ConnectionAttempts=1', '-o', 'ControlMaster=no', '-o', 'ControlPath=none', alias], { stdio: ['pipe', 'pipe', 'pipe'], detached: process.platform !== 'win32', env: { ...process.env, LC_ALL: 'C' } });
        let output = '', failure = false;
        const terminate = () => { failure = true; try { process.platform !== 'win32' ? process.kill(-child.pid, 'SIGKILL') : child.kill('SIGKILL'); } catch {} };
        const timer = setTimeout(terminate, 30_000);
        const monitor = monitorFile ? setInterval(() => { try { if (fs.statSync(monitorFile).size > MAX_BYTES) terminate(); } catch {} }, 50) : null;
        child.stdout.on('data', bytes => { output += bytes.toString('utf8'); if (output.length > 64_000) terminate(); }); child.stderr.resume();
        child.stdin.on('error', () => {}); child.once('error', () => { failure = true; });
        child.once('close', code => { clearTimeout(timer); if (monitor) clearInterval(monitor); if (failure || code !== 0) reject(new Error('Shared evidence transfer failed. Check the approved SFTP route and storage permissions.')); else resolve(output); });
        child.stdin.end(commands.join('\n') + '\n');
    });
}
function workingDirectories(output) { return output.split(/\r?\n/).filter(line => line.startsWith('Remote working directory: ')).map(line => line.slice('Remote working directory: '.length).trim()); }
class SftpEvidence {
    constructor(profile, batch = sftpBatch) { validateEvidenceProfile(profile); this.config = profile.evidence; this.batch = (commands, options) => batch(this.config.sshAlias, commands, options); }
    async root() { const dirs = workingDirectories(await this.batch(['cd ' + quote(this.config.root), 'pwd'])); if (dirs.length !== 1 || !dirs[0].startsWith('/') || dirs[0] === '/') throw new Error('Could not verify the shared evidence root.'); return dirs[0]; }
    async parent(root, relative, create = false) {
        let parent = root;
        for (const part of path.posix.dirname(relativePath(relative)).split('/').filter(part => part !== '.')) {
            const destination = path.posix.join(parent, part);
            const commands = [...(create ? ['-mkdir ' + quote(destination)] : []), 'cd ' + quote(destination), 'pwd'];
            const dirs = workingDirectories(await this.batch(commands)); if (dirs.length !== 1 || !inside(root, dirs[0])) throw new Error('Shared evidence is outside the configured storage root.'); parent = dirs[0];
        }
        return parent;
    }
    async read(relative, expected = {}) {
        relativePath(relative); const root = await this.root(), parent = await this.parent(root, relative), remote = path.posix.join(parent, path.posix.basename(relative));
        const listing = await this.batch(['ls -l ' + quote(remote)]);
        const lines = listing.split(/\r?\n/).filter(line => /^[dl-][rwxstST-]{9}\s/.test(line));
        if (lines.length !== 1 || !lines[0].startsWith('-')) throw new Error('Evidence must be a regular original file, not a symlink or directory.');
        const size = Number(lines[0].match(/^-[rwxstST-]{9}\s+(?:\d+|\?)\s+\S+\s+\S+\s+(\d+)\s/)?.[1]);
        if (!Number.isSafeInteger(size) || size < 1 || size > MAX_BYTES || expected.bytes != null && size !== Number(expected.bytes)) throw new Error('The original evidence size no longer matches its record.');
        const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'proteus-evidence-')); fs.chmodSync(temp, 0o700); const file = path.join(temp, 'original'); fs.writeFileSync(file, '', { mode: 0o600, flag: 'wx' });
        try { await this.batch(['get ' + quote(remote) + ' ' + quote(file)], { monitorFile: file }); const info = fs.lstatSync(file); if (!info.isFile() || info.size !== size) throw new Error('Evidence transfer size verification failed.'); const data = fs.readFileSync(file); if (expected.sha256 && sha256(data) !== expected.sha256) throw new Error('Evidence integrity verification failed.'); return data; }
        finally { fs.rmSync(temp, { recursive: true, force: true }); }
    }
    async write(workspaceId, data) {
        if (!Number.isSafeInteger(workspaceId) || workspaceId < 1 || !data.length || data.length > MAX_BYTES) throw new Error('Invalid evidence upload.');
        const relative = `evidence/${workspaceId}/${randomUUID()}`, root = await this.root(), parent = await this.parent(root, relative, true);
        const final = path.posix.join(parent, path.posix.basename(relative)), temporary = final + '.upload';
        const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'proteus-evidence-')); fs.chmodSync(temp, 0o700); const file = path.join(temp, 'original'); fs.writeFileSync(file, data, { mode: 0o600, flag: 'wx' });
        let uploaded = false, promoted = false;
        try {
            uploaded = true; await this.batch(['put ' + quote(file) + ' ' + quote(temporary), 'chmod 0640 ' + quote(temporary)]); uploaded = true;
            const stagedRelative = path.posix.relative(root, temporary);
            await this.read(stagedRelative, { bytes: data.length, sha256: sha256(data) });
            await this.batch(['rename ' + quote(temporary) + ' ' + quote(final)]); promoted = true;
            const stored = path.posix.relative(root, final);
            return { relativePath: stored, cleanup: async () => { await this.batch(['rm ' + quote(final)]); } };
        } catch (error) { if (uploaded) await this.batch(['-rm ' + quote(promoted ? final : temporary)]).catch(() => {}); throw error; }
        finally { fs.rmSync(temp, { recursive: true, force: true }); }
    }
}
class LocalEvidence {
    constructor(profile) { this.profile = profile; }
    root() { if (!this.profile.storageRoot || !path.isAbsolute(this.profile.storageRoot)) throw new Error('Evidence storage is not configured on this host.'); return fs.realpathSync(this.profile.storageRoot); }
    async read(relative, expected = {}) { const root = this.root(), file = fs.realpathSync(path.resolve(root, relativePath(relative))); if (!file.startsWith(root + path.sep)) throw new Error('Evidence is outside the configured storage root.'); const info = fs.statSync(file); if (!info.isFile() || info.size > MAX_BYTES || expected.bytes != null && info.size !== Number(expected.bytes)) throw new Error('Evidence integrity verification failed: the original size changed.'); const data = fs.readFileSync(file); if (expected.sha256 && sha256(data) !== expected.sha256) throw new Error('Evidence integrity verification failed.'); return data; }
    async write(workspaceId, data) { if (this.profile.driver !== 'sqlite') throw new Error('A shared database requires shared SFTP evidence storage before uploading originals.'); const root = this.root(), relative = 'evidence/' + randomUUID(); fs.mkdirSync(path.join(root, 'evidence'), { recursive: true, mode: 0o700 }); const directory = fs.realpathSync(path.join(root, 'evidence')); if (!directory.startsWith(root + path.sep)) throw new Error('Evidence storage is outside the configured root.'); const file = path.join(directory, path.basename(relative)); fs.writeFileSync(file, data, { flag: 'wx', mode: 0o600 }); return { relativePath: relative, cleanup: async () => fs.rmSync(file, { force: true }) }; }
}
export function evidenceStorage(profile, options = {}) { return profile.evidence?.mode === 'sftp' ? new SftpEvidence(profile, options.sftpBatch) : new LocalEvidence(profile); }
