import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { loadURLWithTimeout, cancelNavigation } from '../desktop/navigation.cjs';

class Page extends EventEmitter {
  stopped = 0;
  destroyed = false;
  loads = [];
  isDestroyed() { return this.destroyed; }
  loadURL(url) { return new Promise((resolve, reject) => this.loads.push({ url, resolve, reject })); }
  // Deliberately leave loadURL pending: cancellation must not depend on Electron settling it.
  stop() { this.stopped++; }
}
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

test('an unresponsive page releases the caller and the same tab can navigate again', async () => {
  const page = new Page();
  await assert.rejects(loadURLWithTimeout(page, 'https://example.test/stuck', 20), /timed out.*Loading was stopped/);
  assert.equal(page.stopped, 1);
  assert.equal(page.listenerCount('destroyed'), 0);
  const next = loadURLWithTimeout(page, 'https://example.test/ready', 20);
  page.loads[1].resolve(); await next;
  page.loads[0].reject(new Error('Late abort from the stopped page'));
  await delay(30);
  assert.equal(page.stopped, 1);
  assert.equal(cancelNavigation(page), false);
});

test('completed and failed loads clear their timers and listeners', async () => {
  for (const fail of [false, true]) {
    const page = new Page();
    const load = loadURLWithTimeout(page, 'https://example.test', 20);
    if (fail) { page.loads[0].reject(new Error('Network unavailable')); await assert.rejects(load, /Network unavailable/); }
    else { page.loads[0].resolve(); await load; }
    await delay(30);
    assert.equal(page.stopped, 0);
    assert.equal(page.listenerCount('destroyed'), 0);
    assert.equal(cancelNavigation(page), false);
  }
});

test('a replacement navigation cannot be stopped by the previous deadline', async () => {
  const page = new Page();
  const first = assert.rejects(loadURLWithTimeout(page, 'https://example.test/old', 20), /replaced/);
  const next = loadURLWithTimeout(page, 'https://example.test/new', 1000);
  await first; await delay(30);
  assert.equal(page.stopped, 0);
  assert.equal(page.listenerCount('destroyed'), 1);
  page.loads[1].resolve(); await next;
  assert.equal(page.listenerCount('destroyed'), 0);
});

test('manual stop releases the caller even if loadURL stays pending', async () => {
  const page = new Page(); const load = loadURLWithTimeout(page, 'https://example.test', 1000);
  assert.equal(cancelNavigation(page), true);
  await assert.rejects(load, /Navigation stopped/);
  assert.equal(page.stopped, 1);
  assert.equal(cancelNavigation(page), false);
});

test('closing a tab releases the caller and never stops a destroyed page', async () => {
  const page = new Page(); const load = loadURLWithTimeout(page, 'https://example.test', 1000);
  page.destroyed = true; page.emit('destroyed');
  await assert.rejects(load, /closed during navigation/);
  await assert.rejects(loadURLWithTimeout(page, 'https://example.test'), /closed/);
  assert.equal(page.stopped, 0);
  assert.equal(page.listenerCount('destroyed'), 0);
});
