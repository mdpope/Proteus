import { spawn } from 'node:child_process';

// No shell, bounded lines, and no raw process output crosses this boundary.
export function runLocalProcess({ command, args = [], cwd, signal, timeoutMs = 7_200_000, onRecord = () => {}, sanitize = () => null, killGraceMs = 3000 }) {
  if (signal?.aborted) return Promise.reject(new Error('Cancelled'));
  return new Promise((resolve, reject) => {
    let child, settled = false, stopped = false, closed = false, escalated = false, reason, timer, killTimer;
    const streams = { stdout: '', stderr: '' }, overflow = { stdout: false, stderr: false };
    const finish = (error, result) => {
      if (settled) return; settled = true; clearTimeout(timer); signal?.removeEventListener('abort', abort);
      clearTimeout(killTimer);
      if (error) reject(error); else resolve(result);
    };
    const kill = kind => { try { if (process.platform === 'win32') child?.kill(kind); else if (child?.pid) process.kill(-child.pid, kind); } catch (error) { if (error.code !== 'ESRCH') { /* Exit is still awaited. */ } } };
    const stop = message => { if (stopped) return; stopped = true; reason = message; kill('SIGTERM'); killTimer = setTimeout(() => { escalated = true; kill('SIGKILL'); if (closed) finish(new Error(reason)); }, killGraceMs); };
    const abort = () => stop('Cancelled');
    const record = (stream, line) => { try { const data = sanitize(line); if (data) onRecord({ stream, data }); } catch { /* Malformed/private output is intentionally withheld. */ } };
    const chunk = (stream, data) => {
      for (const part of data.toString('utf8').split(/(?<=\n)/)) {
        const ended = part.endsWith('\n');
        if (!overflow[stream]) { streams[stream] += part; if (streams[stream].length > 32768) { streams[stream] = ''; overflow[stream] = true; } }
        if (ended) { if (!overflow[stream]) record(stream, streams[stream].trim()); streams[stream] = ''; overflow[stream] = false; }
      }
    };
    try {
      child = spawn(command, args, { cwd, shell: false, detached: process.platform !== 'win32', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PYTHONUNBUFFERED: '1' } });
      child.stdout.on('data', data => chunk('stdout', data)); child.stderr.on('data', data => chunk('stderr', data));
      child.once('error', () => finish(new Error('Could not start the configured local runtime. Verify its executable and permissions.')));
      child.once('close', (code, terminationSignal) => {
        for (const stream of ['stdout', 'stderr']) if (!overflow[stream] && streams[stream]) record(stream, streams[stream]);
        if (stopped) {
          closed = true;
          // Do not let host shutdown escape escalation when the direct child exits first.
          let descendants = false;
          if (process.platform !== 'win32' && child.pid) { try { process.kill(-child.pid, 0); descendants = true; } catch { /* Process group has exited. */ } }
          if (!descendants || escalated) finish(new Error(reason));
        }
        else if (code !== 0) finish(new Error(`Local worker exited ${code ?? terminationSignal}. Inspect the private native log for details.`));
        else finish(null, { exitCode: code });
      });
      signal?.addEventListener('abort', abort, { once: true }); if (signal?.aborted) abort();
      timer = setTimeout(() => stop('Local worker exceeded its configured time limit.'), timeoutMs); timer.unref();
    } catch { finish(new Error('Could not start the configured local runtime.')); }
  });
}
