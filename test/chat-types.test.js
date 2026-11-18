import test from 'node:test';
import assert from 'node:assert/strict';
import {chatType} from '../public/features/chats/chat-types.js';

// N11-13: interactive chats carry a synthetic chat-<timestamp>-<hash> schedule record and may
// advertise scheduled-run recovery support; neither makes them Scheduled Tasks.
test('chat type follows recorded origin, then trigger, then legacy schedule names', () => {
  const synthetic = {id:'chat-1794000000000-abcd1234', name:'Workspace chat'};
  assert.equal(chatType({trigger:'chat', chatType:'user', scheduleName:'Workspace chat', schedule:synthetic, chatControls:{scheduledRecovery:true}}), 'user');
  assert.equal(chatType({trigger:'chat', scheduleName:'Workspace chat'}), 'user', 'pre-chatType interactive records stay user chats');
  assert.equal(chatType({trigger:'chat', chatType:'internet', scheduleName:'Search'}), 'internet');
  assert.equal(chatType({trigger:'scheduled', chatType:'scheduled', scheduleName:'Morning review'}), 'scheduled');
  assert.equal(chatType({trigger:'manual', scheduleName:'Morning review'}), 'scheduled', 'manual schedule runs remain scheduled');
  assert.equal(chatType({trigger:'scheduled', scheduleName:''}), 'scheduled', 'a deleted schedule keeps its run scheduled');
  assert.equal(chatType({scheduleName:'Legacy schedule'}), 'scheduled', 'legacy rows without origin use their schedule name');
  assert.equal(chatType({}), 'user');
});
