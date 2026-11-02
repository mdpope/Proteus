import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {browserAddressCompletion,addressCompletionPrefix} from '../public/models/browser-address-completion.js';
import {BrowserHistoryStore} from '../src/services/browser/browser-history-store.js';
import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
test('ghost origins honor typed scheme/www/ports, preserve case and never complete paths or search input',()=>{
 const sites=[{url:'https://www.example.test/deep?private=value'},{url:'http://example.test:8080/path'}];
 assert.deepEqual(browserAddressCompletion('Ex',sites),{url:'https://www.example.test/',value:'https://www.example.test/',suffix:'ample.test/'});
 assert.equal(browserAddressCompletion('www.e',sites).suffix,'xample.test/');assert.equal(browserAddressCompletion('http://ex',sites).url,'http://example.test:8080/');
 for(const value of ['', 'two words','example.test/path','example.test/','example.test?q=1','https://user@ex',' javascript:ex','ex\\evil'])assert.equal(browserAddressCompletion(value,sites),null,value);
 assert.equal(addressCompletionPrefix('localhost:8').host,'localhost:8');assert.equal(browserAddressCompletion('ex',[{url:'file:///example.test'}]),null);
});
test('all retained visits rank origins by popularity; deduplication, redirects, profiles, deletion and restart keep the derived index correct',()=>{
 const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-completion-'));let store=new BrowserHistoryStore(home);
 const visit=(eventId,url,extra={})=>({eventId,url,visitedAt:'2026-01-01T00:00:00Z',sourceHostId:'fixture-owner',...extra});
 try{
  const old=Array.from({length:15},(_,i)=>visit('popular-'+i,'https://www.example.test/deep/'+i));store.record({events:old});store.record({events:old});
  store.record({events:Array.from({length:200},(_,i)=>visit('recent-'+i,'https://other-'+i+'.test/',{visitedAt:'2026-11-02T00:00:00Z'}))});
  store.record({events:[visit('less','https://example-other.test/'),visit('another-profile','https://example-private.test/',{profileId:'separate'})]});
  assert.equal(store.suggest({query:'ex'}).items[0].url,'https://www.example.test/');assert.equal(store.suggest({query:'ex'}).items[0].visits,15);
  assert.equal(store.suggest({query:'ex',profileId:'separate'}).items[0].url,'https://example-private.test/');assert.equal(store.suggest({query:'ex',profileId:'private:incognito'}).items.length,0);
  store.delete({eventIds:old.map(item=>item.eventId)});assert.equal(store.suggest({query:'ex'}).items[0].url,'https://example-other.test/');
  store.record({events:[visit('redirect','https://before.test/')]});store.insert(store.normalize(visit('redirect','https://after.test/path',{updatedAt:'2026-11-02T00:00:00Z',aliases:['https://before.test/']}),{replicated:true}),true);
  assert.equal(store.suggest({query:'before'}).items.length,0);assert.equal(store.suggest({query:'after'}).items[0].visits,1);
  store.close();store=new BrowserHistoryStore(home);assert.equal(store.suggest({query:'after'}).items[0].url,'https://after.test/');
  assert.deepEqual(store.suggest({query:'after/path'}),{items:[]});
 }finally{store.close();fs.rmSync(home,{recursive:true,force:true});}
});
