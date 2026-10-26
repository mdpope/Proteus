// The broker is born inside the guardian job. Never enumerate or kill PIDs.
const MAX_FRAME = 524288;
const MAX_INPUT = 65536;
const BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
let terminal;
let started = false;
let ended = false;
let pending = 0;

function send(value) {
  const line = JSON.stringify(value) + '\n';
  if (Buffer.byteLength(line) > MAX_FRAME) throw Error('Outbound terminal frame exceeds limit');
  pending += Buffer.byteLength(line);
  if (pending > 2 * 1024 * 1024) throw Error('Terminal transport backpressure limit');
  process.stdout.write(line, () => { pending -= Buffer.byteLength(line); });
}

function fail() {
  if (ended) return;
  ended = true;
  send({t: 'error', code: 'terminal-broker-failed'});
}

const decoder = new TextDecoder('utf-8', {fatal: true});

function receive(line) {
  try {
    if (Buffer.byteLength(line) > MAX_FRAME) throw Error('Frame too large');
    const value = JSON.parse(line);
    if (!started) {
      if (value.t !== 'start' || typeof value.shell !== 'string' || !Array.isArray(value.args) ||
          value.args.some(arg => typeof arg !== 'string') || !value.options ||
          typeof value.options.cwd !== 'string' || !value.options.env || typeof value.options.env !== 'object') {
        throw Error('Invalid terminal start');
      }
      started = true;
      terminal = require('node-pty').spawn(value.shell, value.args, {...value.options, useConptyDll: false});
      terminal.onData(data => {
        const bytes = Buffer.from(data, 'utf8');
        for (let offset = 0; offset < bytes.length; offset += 8192) {
          send({t: 'data', b: bytes.subarray(offset, offset + 8192).toString('base64')});
        }
      });
      terminal.onExit(({exitCode, signal}) => {
        if (ended) return;
        ended = true;
        send({t: 'exit', exitCode, signal});
      });
      send({t: 'ready'});
      return;
    }
    if (ended) return;
    if (value.t === 'write') {
      if (typeof value.b !== 'string' || !BASE64.test(value.b)) throw Error('Invalid input');
      const bytes = Buffer.from(value.b, 'base64');
      if (bytes.length > MAX_INPUT) throw Error('Input too large');
      terminal.write(decoder.decode(bytes));
    } else if (value.t === 'resize') {
      if (!Number.isInteger(value.cols) || value.cols < 2 || value.cols > 500 ||
          !Number.isInteger(value.rows) || value.rows < 1 || value.rows > 300) {
        throw Error('Invalid resize');
      }
      terminal.resize(value.cols, value.rows);
    } else {
      throw Error('Invalid terminal action');
    }
  } catch {
    fail();
  }
}

// Bound raw bytes before decoding; readline alone buffers an unbounded line.
let buffered = Buffer.alloc(0);
process.stdin.on('data', chunk => {
  buffered = Buffer.concat([buffered, chunk]);
  let newline;
  while ((newline = buffered.indexOf(10)) >= 0) {
    if (newline > MAX_FRAME) {
      fail();
      process.stdin.pause();
      return;
    }
    const line = buffered.subarray(0, newline);
    buffered = buffered.subarray(newline + 1);
    try { receive(decoder.decode(line)); } catch { fail(); }
  }
  if (buffered.length > MAX_FRAME) {
    fail();
    process.stdin.pause();
  }
});
process.stdin.on('end', () => {
  // Guardian independently observes desktop EOF and owns termination.
  process.stdin.pause();
});
process.on('uncaughtException', fail);
process.on('unhandledRejection', fail);
