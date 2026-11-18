import test from 'node:test';
import assert from 'node:assert/strict';
import {browserLabel} from '../public/features/browser/browser-label.js';
test('live browser title wins over stale shared labels; explicit names and setup titles remain',()=>{
 const tab={type:'browser',label:'Old page',info:{url:'https://example.test/new',title:'Current page'}};
 assert.equal(browserLabel(tab),'Current page');
 assert.equal(browserLabel({...tab,label:'Another stale poll'}),'Current page');
 assert.equal(browserLabel({...tab,customTitle:'My name'}),'My name');
 assert.equal(browserLabel({...tab,newChatDraft:{},label:'New chat'}),'New chat');
 assert.equal(browserLabel({...tab,info:{url:'',title:'New chat'}}),'New Tab');
 assert.equal(browserLabel({type:'browser',url:'https://example.test',title:'Team page'}),'Team page');
});
