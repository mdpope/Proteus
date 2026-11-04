import { parentPort } from 'node:worker_threads';
import { serializeStateProjection } from './state-projection.js';

parentPort.on('message', ({ id, input }) => {
  const start = performance.now();
  try {
    const body = serializeStateProjection(input);
    parentPort.postMessage({ id, body, bodyBytes: Buffer.byteLength(body), durationMs: performance.now() - start });
  } catch (error) {
    parentPort.postMessage({ id, error: error.message, durationMs: performance.now() - start });
  }
});
