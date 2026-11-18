import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeScratch, scratchAccess} from '../src/services/scratchpad/scratch-format.js';

test('manual Markdown gains portable metadata without changing the body', () => {
  const body = '# Draft\n\n```js\nconst value = 1;\n```\n';
  const result = normalizeScratch(body, {title: 'Draft', workspaceId: 'workspace-a', projectId: 'project-a'});
  assert.equal(result.body, body);
  assert.equal(normalizeScratch(result.text, {workspaceId: 'workspace-a', projectId: 'project-a'}).text, result.text);
});
test('normalization preserves custom properties but cannot assign another project', () => {
  const result = normalizeScratch('---\ntitle: Notes\nproject_id: victim\ntags: [idea]\ncustom: keep\n---\nPrivate draft', {projectId: 'actual'});
  assert.equal(result.projectId, 'actual');
  assert.match(result.text, /custom: keep/);
  assert.match(result.text, /tags: \[ idea \]|tags: \[idea\]/);
  assert.equal(result.body, 'Private draft');
});
test('malformed YAML and changed identity are rejected without returning replacement text', () => {
  assert.throws(() => normalizeScratch('---\ntitle: one\ntitle: two\n---\nbody'), /Invalid/);
  const first = normalizeScratch('body');
  assert.throws(() => normalizeScratch(first.text, {id: '20000000-0000-4000-8000-000000000002'}), /identity changed/);
});
test('captured project access never grants other projects or unassociated scratches', () => {
  for (const action of ['list','read','create','update','rename','delete','move','sync']) {
    assert.equal(scratchAccess({capturedProjectId:'a',targetProjectId:'a',action}).allowed,true);
    assert.equal(scratchAccess({capturedProjectId:'a',targetProjectId:'b',action}).requiresPermission,true);
    assert.equal(scratchAccess({capturedProjectId:null,targetProjectId:null,action}).allowed,false);
  }
  assert.equal(scratchAccess({capturedProjectId:'a',targetProjectId:'b',action:'read',grants:[{projectId:'b',actions:['read']}]}).allowed,true);
  assert.equal(scratchAccess({capturedProjectId:'a',targetProjectId:'b',action:'update',grants:[{projectId:'b',actions:['read']}]}).allowed,false);
});
