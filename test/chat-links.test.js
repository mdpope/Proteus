import test from 'node:test';import assert from 'node:assert/strict';
import {chatLink,parseChatLink} from '../public/chat-links.js';
import {historyDateSections} from '../public/browser-history-panel.js';
const hostId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
test('chat links retain host and run identity across application/workspace representations',()=>{
 const link=chatLink({hostId,id});assert.deepEqual(parseChatLink(link),{hostId,id});assert.equal(chatLink({hostId,id:'workspace:child',runId:id}),link);assert.equal(chatLink({hostId,id},{origin:'https://app.example'}),'https://app.example/remote?view=chats&host='+hostId+'&chat='+id);assert.throws(()=>chatLink({hostId:'local',id}),/unavailable/);
 for(const bad of ['proteus://chat?host='+hostId+'&id=bad',link+'&token=secret',link.replace('chat','other'),'https://example.com/remote'])assert.equal(parseChatLink(bad),null);
});
test('history day grouping uses viewer timezone across DST and preserves host order',()=>{
 const items=[{visitedAt:'2026-11-02T08:00:00Z'},{visitedAt:'2026-11-02T06:00:00Z'},{visitedAt:'2026-11-01T08:00:00Z'},{visitedAt:'2026-11-01T07:00:00Z'}];const groups=historyDateSections(items,'America/Denver');assert.equal(groups.length,2);assert.equal(groups[0].items.length,1);assert.equal(groups[1].items.length,3);assert.deepEqual(groups.flatMap(group=>group.items),items);
});
