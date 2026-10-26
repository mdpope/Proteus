import fs from 'node:fs';
import {StringDecoder} from 'node:string_decoder';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';

const MAX_FRAME = 524288;
const MAX_EARLY = 512 * 1024;
const FORCE_AFTER_MS = 1000;
const CONFIRM_TERMINATION_MS = 1000;
const BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

// One guardian owns an anonymous kill-on-close job before starting a broker.
// Configuration and input travel in bounded frames, never launcher arguments.
export function createWindowsPty({
  guardianPath = fileURLToPath(new URL('../../../../desktop/terminal/windows-terminal-guardian.exe', import.meta.url)),
  brokerPath = fileURLToPath(new URL('./broker.cjs', import.meta.url)),
  runtimeExecutable = process.execPath,
  spawnGuardian = spawn,
  guardianArguments = []
} = {}) {
  return async function spawnWindowsPty(shell, args, options) {
    if (!fs.statSync(guardianPath).isFile()) {
      throw Error('The Windows terminal guardian asset is unavailable.');
    }
    const guardian = spawnGuardian(
      guardianPath, [runtimeExecutable, brokerPath, ...guardianArguments],
      {windowsHide: true, stdio: ['pipe', 'pipe', 'pipe']}
    );
    let jobReady = false;
    let ready = false;
    let stopping = false;
    let closed = false;
    let exitValue = null;
    let cleanupError = null;
    let buffer = Buffer.alloc(0);
    let early = [];
    let earlyBytes = 0;
    let queuedBytes = 0;
    let forceTimer;
    let confirmationTimer;
    let startTimer;
    const decoder = new StringDecoder('utf8');
    const dataListeners = new Set();
    const exitListeners = new Set();
    let resolveReady, rejectReady, resolveClose, rejectClose, confirmCleanup;
    const started = new Promise((resolve, reject) => {
      resolveReady = resolve;
      rejectReady = reject;
    });
    const closeResult = new Promise((resolve, reject) => {
      resolveClose = resolve;
      rejectClose = reject;
    });
    // This promise is independent of the bounded operation result. Root keeps
    // a startup blocker until this resolves, even when closeResult has rejected.
    const cleanupCompleted = new Promise(resolve => { confirmCleanup = resolve; });
    // A background protocol failure may begin close before a caller awaits it.
    // Observing this rejection does not change the promise returned to callers.
    void closeResult.catch(() => {});

    function send(value) {
      if (closed || guardian.stdin.destroyed) return;
      const line = JSON.stringify(value) + '\n';
      const bytes = Buffer.byteLength(line);
      if (bytes > MAX_FRAME || queuedBytes + bytes > MAX_EARLY) {
        throw Error('Terminal transport limit exceeded.');
      }
      queuedBytes += bytes;
      guardian.stdin.write(line, error => {
        queuedBytes -= bytes;
        if (error && !stopping) void stop();
      });
    }

    function unconfirmedCleanup(cause) {
      if (closed || cleanupError) return;
      clearTimeout(forceTimer);
      clearTimeout(confirmationTimer);
      clearTimeout(startTimer);
      cleanupError = new Error('Windows terminal guardian termination is unconfirmed.', {cause});
      cleanupError.code = 'PROTEUS_TERMINAL_CLEANUP_UNCONFIRMED';
      cleanupError.cleanupUnconfirmed = true;
      cleanupError.cleanupCompleted = cleanupCompleted;
      process.stderr.write(cleanupError.message + '\n');
      rejectClose(cleanupError);
      rejectReady(cleanupError);
      // Do not emit exit or resolve cleanupCompleted. The live session remains
      // owned by its caller; a later real close can confirm that cleanup.
    }

    function forceGuardian() {
      if (closed) return;
      let requested;
      try {
        // ChildProcess retains the native process handle. Never look up a PID.
        requested = guardian.kill();
      } catch (error) {
        unconfirmedCleanup(error);
        return;
      }
      if (closed) return;
      if (requested !== true) {
        unconfirmedCleanup(Error('The guardian process handle refused termination.'));
        return;
      }
      // Preserve the existing one-second force deadline. Add a finite one-second
      // confirmation deadline where the previous implementation waited forever.
      confirmationTimer = setTimeout(() => {
        unconfirmedCleanup(Error('No guardian close event followed termination.'));
      }, CONFIRM_TERMINATION_MS);
      confirmationTimer.unref?.();
    }

    function stop() {
      if (!stopping && !closed) {
        stopping = true;
        try { send({t: 'close'}); } catch { /* Force via the owned handle below. */ }
        forceTimer = setTimeout(forceGuardian, FORCE_AFTER_MS);
        forceTimer.unref?.();
      }
      return closeResult;
    }

    function fail(message) {
      if (ready) {
        exitValue = {exitCode: null, signal: 'guardian-failed'};
        process.stderr.write(message + '\n');
      }
      rejectReady(Error(message));
      void stop();
    }

    function deliverData(text) {
      if (dataListeners.size) {
        for (const listener of dataListeners) listener(text);
      } else {
        earlyBytes += Buffer.byteLength(text);
        if (earlyBytes > MAX_EARLY) return fail('Early terminal output limit exceeded.');
        early.push(text);
      }
    }

    function receiveFrame(line) {
      let value;
      try { value = JSON.parse(line); } catch { return fail('Invalid guardian frame.'); }
      if (value.t === 'job-ready') {
        if (jobReady || value.nonInheritable !== true || value.killOnClose !== true) {
          return fail('Invalid guardian job handshake.');
        }
        jobReady = true;
        send({t: 'start', shell, args, options});
      } else if (value.t === 'ready') {
        if (!jobReady || ready) return fail('Invalid terminal readiness.');
        ready = true;
        clearTimeout(startTimer);
        resolveReady(api);
      } else if (value.t === 'data') {
        if (!ready || typeof value.b !== 'string' || value.b.length > 12000 || !BASE64.test(value.b)) {
          return fail('Invalid terminal output.');
        }
        deliverData(decoder.write(Buffer.from(value.b, 'base64')));
      } else if (value.t === 'exit') {
        if (!ready || exitValue || !Number.isInteger(value.exitCode)) {
          return fail('Invalid terminal exit.');
        }
        exitValue = {exitCode: value.exitCode, signal: value.signal};
      } else if (value.t === 'error') {
        fail('Windows terminal guardian failed: ' + String(value.code || 'unknown') + ' (' + String(value.win32 || 0) + ').');
      } else {
        fail('Unknown guardian frame.');
      }
    }

    guardian.stdout.on('data', chunk => {
      buffer = Buffer.concat([buffer, chunk]);
      let newline;
      while ((newline = buffer.indexOf(10)) >= 0) {
        if (newline > MAX_FRAME) return fail('Guardian frame limit exceeded.');
        const line = buffer.subarray(0, newline).toString('utf8');
        buffer = buffer.subarray(newline + 1);
        try { receiveFrame(line); } catch { fail('Guardian transport failed.'); }
      }
      if (buffer.length > MAX_FRAME) fail('Guardian frame limit exceeded.');
    });
    // Preserve diagnostics, including any vendor AttachConsole error.
    guardian.stderr.on('data', chunk => process.stderr.write(chunk));
    guardian.stdin.on('error', () => { if (!stopping) void stop(); });
    guardian.on('error', () => fail('Unable to start Windows terminal guardian.'));

    const api = {
      ownsProcessTree: true,
      pid: guardian.pid,
      get cleanupUnconfirmed() { return !closed && cleanupError !== null; },
      cleanupCompleted,
      onData(listener) {
        dataListeners.add(listener);
        const pending = early;
        early = [];
        earlyBytes = 0;
        for (const text of pending) listener(text);
        return {dispose() { dataListeners.delete(listener); }};
      },
      onExit(listener) {
        exitListeners.add(listener);
        if (closed) queueMicrotask(() => {
          if (exitListeners.has(listener)) listener(exitValue);
        });
        return {dispose() { exitListeners.delete(listener); }};
      },
      write(text) {
        if (stopping || closed) throw Error('Terminal is closing.');
        if (typeof text !== 'string' || Buffer.byteLength(text) > 65536) {
          throw Error('Terminal input is limited to64 KiB.');
        }
        send({t: 'write', b: Buffer.from(text, 'utf8').toString('base64')});
      },
      resize(cols, rows) {
        if (!Number.isInteger(cols) || cols < 2 || cols > 500 || !Number.isInteger(rows) || rows < 1 || rows > 300) {
          throw Error('Invalid terminal size.');
        }
        if (!stopping && !closed) send({t: 'resize', cols, rows});
      },
      kill: stop,
      close: stop,
      closed: closeResult
    };

    guardian.on('close', () => {
      if (closed) return;
      closed = true;
      clearTimeout(forceTimer);
      clearTimeout(confirmationTimer);
      clearTimeout(startTimer);
      if (buffer.length) rejectReady(Error('Partial guardian frame.'));
      if (!ready) rejectReady(Error('Windows terminal ended before readiness.'));
      exitValue ??= {exitCode: null, signal: stopping ? 'terminated' : 'guardian-ended'};
      // Only this actual event confirms the lifecycle. A rejected closeResult
      // stays rejected; root may release its blocker using cleanupCompleted.
      confirmCleanup();
      for (const listener of exitListeners) listener(exitValue);
      resolveClose();
    });
    startTimer = setTimeout(() => fail('Windows terminal startup timed out.'), 10000);
    try {
      return await started;
    } catch (startupError) {
      try { await stop(); } catch (error) {
        if (error !== startupError) error.startupError = startupError;
        throw error;
      }
      throw startupError;
    }
  };
}

export const spawnWindowsPty = createWindowsPty();
