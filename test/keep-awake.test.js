import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { KeepAwake } = createRequire(import.meta.url)('../desktop/keep-awake.cjs');

test('keep-awake owns one assertion, including ID zero, and releases only its own', () => {
  const live = new Map([[77, 'other app assertion']]); let next = 0;
  const controller = new KeepAwake({ start: type => { const id = next++; live.set(id, type); return id; }, stop: id => live.delete(id), isStarted: id => live.has(id) });
  assert.equal(controller.enabled, false);
  controller.setEnabled(true); controller.setEnabled(true);
  assert.equal(next, 1); assert.equal(live.get(0), 'prevent-display-sleep');
  controller.dispose(); controller.dispose();
  assert.deepEqual([...live.keys()], [77]); assert.equal(controller.enabled, false);
});

test('failed keep-awake activation stays off and can be retried', () => {
  let fail = true;
  const controller = new KeepAwake({ start: () => { if (fail) throw Error('Unavailable'); return 4; }, isStarted: id => id === 4, stop: () => {} });
  assert.throws(() => controller.setEnabled(true), /Unavailable/); assert.equal(controller.enabled, false);
  fail = false; assert.equal(controller.setEnabled(true), true);
  controller.dispose(); assert.equal(controller.enabled, false);
});

test('shutdown releases the assertion without erasing the saved enabled preference',()=>{
  let saved=false,next=0;const live=new Set();
  const blocker={start:()=>{live.add(next);return next++;},stop:id=>live.delete(id),isStarted:id=>live.has(id)};
  const first=new KeepAwake(blocker);first.onChange=value=>{saved=value;};first.setEnabled(true);first.dispose();
  assert.equal(saved,true);assert.equal(live.size,0);
  const relaunched=new KeepAwake(blocker);relaunched.onChange=value=>{saved=value;};relaunched.setEnabled(saved);
  assert.equal(relaunched.enabled,true);relaunched.setEnabled(false);relaunched.dispose();assert.equal(saved,false);
});
