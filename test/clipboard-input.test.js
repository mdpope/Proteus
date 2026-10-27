import test from 'node:test';import assert from 'node:assert/strict';
import {textAttachmentReason} from '../public/features/chats/clipboard-input.js';
test('paste budgets cover the 200/201-line boundary and preserve large single-line Unicode payloads',()=>{
 assert.equal(textAttachmentReason(Array(200).fill('x').join('\n')),null);assert.equal(textAttachmentReason(Array(201).fill('x').join('\r\n')),'lines');assert.equal(textAttachmentReason('x'.repeat(1048576)),'bytes');assert.equal(textAttachmentReason('🙂'.repeat(65537)),'bytes');assert.equal(textAttachmentReason('🙂'.repeat(65536)),null);assert.equal(textAttachmentReason('x\r'.repeat(200)),'lines');
});
