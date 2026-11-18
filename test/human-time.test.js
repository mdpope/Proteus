import test from 'node:test';
import assert from 'node:assert/strict';
import {humanTime,configureHumanTimeZone} from '../src/shared/human-time.js';
import {render,setTimeZone} from '../src/shared/markdown-renderer.js';

// N11-19: people see readable times in their time zone; exact values remain available.
test('human time formats instants in the configured zone and keeps invalid input', () => {
  const now=Date.parse('2026-11-11T20:00:00Z');
  assert.equal(humanTime('2026-11-11T19:10:00.000Z',{timeZone:'America/Denver',now}),'Nov 11, 12:10 PM MST');
  assert.equal(humanTime('2025-03-01T08:05:00Z',{timeZone:'America/Denver',now}),'Mar 1, 2025, 1:05 AM MST','other years include the year');
  configureHumanTimeZone(()=>'America/New_York');
  assert.equal(humanTime('2026-11-11T19:10:00Z',{now}),'Nov 11, 2:10 PM EST','server uses the configured zone');
  configureHumanTimeZone(undefined);
  assert.equal(humanTime('not a date'),'not a date');
});
test('rendered messages show ISO instants as readable times outside code', () => {
  setTimeZone('America/Denver');
  const html=render('Waiting until 2026-11-11T19:10:05.583Z.\n\n`2026-11-11T19:10:05Z`');
  assert.match(html,/<time datetime="2026-11-11T19:10:05.583Z" title="2026-11-11T19:10:05.583Z">Nov 11[^<]*12:10 PM MST<\/time>/);
  assert.match(html,/<code>2026-11-11T19:10:05Z<\/code>/);
  setTimeZone(undefined);
});
