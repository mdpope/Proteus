import { parentPort } from 'node:worker_threads';
import { serializeStateProjection } from '../../src/services/state/state-projection.js';

parentPort.on('message', ({ id, input }) => {
  if (input.state.crash) process.exit(7);
  if (input.state.gate) {
    const gate = new Int32Array(input.state.gate);
    Atomics.store(gate, 0, 1);
    Atomics.wait(gate, 0, 1, 10000);
    delete input.state.gate;
  }
  try { parentPort.postMessage({ id, body: serializeStateProjection(input), durationMs: 0 }); }
  catch (error) { parentPort.postMessage({ id, error: error.message, durationMs: 0 }); }
});
