import test from 'node:test';
import assert from 'node:assert/strict';
import { toolActivity, displayText } from '../src/tool-activity.js';
import { TurnWaiter } from '../src/turn-waiter.js';
import { CopilotProvider } from '../src/copilot.js';
import { fakeSession } from './fake-copilot.js';

test('parallel tool calls retain arguments, progress, output, failure and one entry per call', () => {
  const events = []; const receive = toolActivity({ emit: (role, text, data) => events.push({ role, text, data }), update() {} });
  const event = (type, toolCallId, data = {}) => receive({ type: 'tool.execution_' + type, timestamp: new Date().toISOString(), data: { toolCallId, ...data } });
  event('start', 'read', { toolName: 'view', arguments: { path: '/fixture/notes.md' } });
  event('start', 'browser', { toolName: 'proteus_browser', arguments: { action: 'open', url: 'https://example.test' } });
  event('progress', 'read', { progressMessage: 'Reading notes' });
  event('partial_result', 'read', { partialOutput: 'First output' });
  event('complete', 'browser', { success: true, result: { content: JSON.stringify({ error: 'Navigation timed out' }) } });
  event('complete', 'read', { success: true, result: { content: 'Model summary', detailedContent: 'Full readable result' } });
  assert.equal(events.length, 2);
  assert.match(events[0].data.tool.summary, /Read.*notes.md/);
  assert.match(events[0].data.tool.arguments, /notes.md/);
  assert.equal(events[0].data.tool.progress, 'Reading notes');
  assert.equal(events[0].data.tool.output, 'Full readable result');
  assert.equal(events[1].data.tool.status, 'failed');
  assert.equal(events[1].data.tool.error, 'Navigation timed out');
  event('start', 'snapshot', { toolName: 'proteus_browser' });
  event('complete', 'snapshot', { success: true, result: { content: JSON.stringify({ title: 'Browser page', snapshot: 'Readable line\n' + 'x'.repeat(30000) }) } });
  assert.match(events[2].data.tool.output, /Browser page\n\nReadable line\n/);
  assert.match(events[2].data.tool.output, /Display shortened/);
  event('start', 'interrupted', { toolName: 'bash', arguments: { command: 'test command' } });
  receive.finish(); assert.equal(events[3].data.tool.status, 'interrupted');
});
test('tool display masks credential fields and caps large payloads', () => {
  const text = displayText({ password: 'fixture-secret', nested: { Authorization: 'Bearer fixture-token' }, command: 'curl -H "Authorization: Bearer abcdef"' });
  assert.ok(!text.includes('fixture-secret')); assert.ok(!text.includes('fixture-token')); assert.ok(!text.includes('abcdef'));
  assert.match(displayText('x'.repeat(25000)), /Display shortened/);
});
test('a human approval pause does not consume active execution time', async () => {
  const session = fakeSession({ send: async () => {} });
  const turn = new TurnWaiter(session, new AbortController().signal, 100);
  turn.pause(); const done = turn.run('fixture');
  await new Promise(resolve => setTimeout(resolve, 160));
  turn.resume(); session.event('session.idle'); await done;
});
test('active execution timeout and cancellation release the waiter', async () => {
  const session = fakeSession({ send: async () => {} });
  await assert.rejects(new TurnWaiter(session, new AbortController().signal, 20).run('fixture'), /active execution time limit/);
  const controller = new AbortController(); const turn = new TurnWaiter(session, controller.signal, 1000);
  turn.pause(); const done = turn.run('fixture'); controller.abort(); await assert.rejects(done, /Cancelled/);
});
test('Copilot sends approved synthetic file bytes as native SDK blobs',async()=>{
  let sent;const session=fakeSession({async send(value){sent=value;this.event('session.idle');}});
  const provider=new CopilotProvider();provider.connect=async()=>({listModels:async()=>[{id:'fixture'}],createSession:async()=>session});
  const run={id:'attachment-fixture',schedule:{model:'fixture',workspace:{cwd:'/fixture',additionalDirectories:[]}},usage:{inputTokens:0,outputTokens:0}};
  assert.deepEqual(provider.acceptedMediaTypes,['image/png','image/jpeg','image/gif','image/webp','application/pdf','text/plain']);
  await provider.run({run,prompt:'Inspect the synthetic file',attachments:[{bytes:Buffer.from('Synthetic fixture only'),name:'Fixture.txt',mediaType:'text/plain'}],signal:new AbortController().signal,update(){},emit(){},ask(){}});
  assert.equal(sent.prompt,'Inspect the synthetic file');assert.deepEqual(sent.attachments,[{type:'blob',data:Buffer.from('Synthetic fixture only').toString('base64'),mimeType:'text/plain',displayName:'Fixture.txt'}]);
  await assert.rejects(provider.run({run,prompt:'Unsupported',attachments:[{bytes:Buffer.from('fixture'),name:'x.zip',mediaType:'application/zip'}],signal:new AbortController().signal,update(){},emit(){},ask(){}}),/cannot receive this attachment type/);
});
test('Copilot omits empty assistant cards, preserves streamed final text and shows warnings', async () => {
  const run = { id: 'fixture', schedule: { model: 'fixture', workspace: { cwd: '/fixture', additionalDirectories: [] } }, events: [], usage: { inputTokens: 0, outputTokens: 0 } };
  const session = fakeSession({ async send() {
    this.event('assistant.message', { messageId: 'empty', content: '', reasoningText: 'Never surface internal reasoning' });
    this.event('assistant.message_delta', { messageId: 'final', deltaContent: '# Complete final answer\n\n| A | B |\n|---|---|\n|1|2|' });
    this.event('assistant.message', { messageId: 'final', content: '' });
    this.event('session.warning', { message: 'An integration is unavailable' });
    this.event('session.idle');
  } });
  const provider = new CopilotProvider(); provider.connect = async () => ({ listModels: async () => [{ id: 'fixture' }], createSession: async () => session });
  await provider.run({ run, prompt: 'fixture', signal: new AbortController().signal, update() {}, ask() {},
    emit: (role, text, data) => run.events.push({ role, text, data }), stream: (id, text) => { run.liveMessages ??= {}; run.liveMessages[id] = (run.liveMessages[id] || '') + text; } });
  assert.equal(run.events.filter(e => e.role === 'assistant').length, 1);
  assert.match(run.events[0].text, /Complete final answer/);
  assert.ok(run.events.some(e => e.text === 'An integration is unavailable'));
  assert.ok(!JSON.stringify(run.events).includes('Never surface internal reasoning'));
});
test('duplicate permission checks share one decision only within the exact active tool call', async () => {
  const asked = []; let config;
  const session = fakeSession({ async send() {
    const request = { kind: 'read', toolCallId: 'one', path: '/fixture/a' };
    await config.onPermissionRequest(request); await config.onPermissionRequest({ ...request });
    await config.onPermissionRequest({ ...request, path: '/fixture/b' });
    for (let i = 0; i < 2; i++) await config.onPermissionRequest({ ...request, managedApprovalRequired: true });
    this.event('tool.execution_complete', { toolCallId: 'one', success: true });
    await config.onPermissionRequest(request);
    this.event('session.idle');
  } });
  const provider = new CopilotProvider(); provider.connect = async () => ({ listModels: async () => [{ id: 'fixture' }], createSession: async value => { config = value; return session; } });
  const run = { id: 'fixture', events: [], schedule: { model: 'fixture', workspace: { cwd: '/fixture', additionalDirectories: [] } }, usage: { inputTokens: 0, outputTokens: 0 } };
  await provider.run({ run, prompt: 'fixture', signal: new AbortController().signal, update() {}, emit() {}, ask: async request => { asked.push(request.details); return 'approve'; } });
  assert.equal(asked.length, 5);
  assert.equal(asked.filter(r => r.managedApprovalRequired).length, 2);
  assert.equal(asked.filter(r => r.path === '/fixture/b').length, 1);
});

test('nonzero shell exit is visible even when the SDK reports successful tool execution', () => {
  const events = []; const receive = toolActivity({ emit: (role, text, data) => events.push({ role, text, data }), update() {} });
  for (const code of [0, 1]) {
    receive({ type: 'tool.execution_start', data: { toolCallId: String(code), toolName: 'bash', arguments: { command: 'synthetic validator' } } });
    receive({ type: 'tool.execution_complete', data: { toolCallId: String(code), success: true, result: { content: `Validation result\n<shellId: ${code} completed with exit code ${code}>` } } });
  }
  assert.equal(events[0].data.tool.status, 'completed');
  assert.equal(events[1].data.tool.status, 'failed');
  assert.equal(events[1].data.tool.error, 'Command exited with code 1.');
});
