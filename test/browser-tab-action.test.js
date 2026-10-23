import test from 'node:test';
import assert from 'node:assert/strict';
import {mutateBrowserNavigation} from '../public/features/browser/browser-tab-action.js';
test('web navigation retries a metadata revision conflict with exactly the same operation identity',async()=>{
 const calls=[];let first=true;const request=async(method,args)=>{calls.push({method,args});if(method==='tabs.get')return {revision:3};if(first){first=false;throw Error('Content tabs changed');}return {revision:4};};
 await mutateBrowserNavigation(request,{scope:'workspace',id:'w',tab:{id:'tab',history:{revision:2}},revision:1,url:'https://example.test/next'});assert.equal(calls.length,3);assert.deepEqual(calls[0].args.operations,calls[2].args.operations);assert.equal(calls[2].args.expectedRevision,3);assert.equal(calls[2].args.operations[0].baseRevision,2);
});
test('web traversal uses stable entry identity and refuses URL userinfo and unsafe schemes',async()=>{
 let action;await mutateBrowserNavigation(async(_method,args)=>{action=args.operations[0];return {};},{scope:'workspace',id:'w',tab:{id:'tab',history:{revision:8}},revision:1,entry:{id:'previous',url:'https://example.test/previous'}});assert.equal(action.action,'browser-traverse');assert.equal(action.entryId,'previous');assert.equal(action.url,undefined);
 await assert.rejects(()=>mutateBrowserNavigation(()=>{throw Error('must not call');},{scope:'workspace',id:'w',tab:{id:'tab'},revision:1,url:'https://user:password@example.test/'}),/cannot be shared/);
});
