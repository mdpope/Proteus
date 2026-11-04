import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {AsyncLocalStorage} from 'node:async_hooks';
import fs from 'node:fs';
import vm from 'node:vm';
import {browserAddress} from '../public/models/browser-address.js';
import {browserTarget} from '../public/features/browser/browser-home.js';
import {questionMessageText} from '../public/features/chats/user-questions.js';
import {inputOrigin} from '../src/services/chats/input-origin.js';
const require=createRequire(import.meta.url),{normalizeURL}=require('../desktop/browser/browser-address.cjs');
const {agentWindow,originTab}=require('../desktop/windows/agent-origin.cjs');

test('all JS address entry points accept intranet hosts and exact fragment syntax',()=>{
 const inputs=['https://consolefixture:8006/#v1:0:=qemu%2F106:4:::::8::','consolefixture:8006','nas/','nas?q=1','router#status','[::1]:8080','0xc0.0.2.33','127.1','bücher.example','UPPER_HOST:65535'];
 for(const input of inputs){const expected=new URL(/^https?:/i.test(input)?input:'https://'+input).href;for(const parse of [browserAddress,browserTarget,normalizeURL])assert.equal(parse(input),expected,input);}
 for(const input of ['consolefixture:65536','https://u:p@nas/','file:///tmp/test','javascript:alert(1)','mailto:a@example.test','/tmp/file','..\\file'])for(const parse of [browserAddress,browserTarget,normalizeURL])assert.throws(()=>parse(input),undefined,input);
 assert.equal(browserTarget('nas'),'https://www.google.com/search?q=nas');
});

test('question display removes only exact structured list choices and retains unrelated prose',()=>{
 const original='Pick one.\n- Red\n- Blue\n- Background details\nRed is a color.';
 assert.equal(questionMessageText(original,[{choices:['Red','Blue']}]),'Pick one.\n- Background details\nRed is a color.');
 assert.equal(questionMessageText(original,[]),original);
});

const ctx=(id,tabs=[])=>({id,window:{isDestroyed:()=>false},session:{get:()=>({tabs})}});
test('origin selection survives focus changes and names a constrained same-project fallback',()=>{
 const a=ctx('a',[{id:'project:local:p'}]),b=ctx('b',[{id:'project:local:p'}]),unrelated=ctx('c');
 const local={client:'desktop',deviceId:'local-desktop',windowId:'a'};
 assert.equal(agentWindow({contexts:[a,b,unrelated],origin:local,currentId:'c',runId:'chat',parentId:'project:local:p'}).id,'a');
 const fallback=agentWindow({contexts:[b,unrelated],origin:local,currentId:'c',runId:'chat',parentId:'project:local:p'});
 assert.equal(fallback.id,'b');assert.match(fallback.note,/closed/);
 assert.throws(()=>agentWindow({contexts:[ctx('b'),unrelated],origin:local,currentId:'c',runId:'chat',parentId:'project:local:p'}),/No owner window/);
 assert.equal(agentWindow({contexts:[a,b],origin:{client:'mobile',windowId:'a'},currentId:'b',runId:'chat',parentId:'project:local:p'}).id,'b');
 assert.throws(()=>agentWindow({contexts:[a],explicitWindowId:'missing'}),/closed/);
});

test('browser mirror resolution never loads an unrelated window or changes profile authority',()=>{
 const tabs=new Map([['a',{id:'a',windowId:'a',thumbnailId:'shared',profileId:'default'}],['b',{id:'b',windowId:'b',thumbnailId:'shared',profileId:'default'}],['private',{id:'private',windowId:'c',thumbnailId:'private'}]]);
 assert.equal(originTab(tabs,'b','a'),'a');
 assert.throws(()=>originTab(tabs,'private','a'),/not open in the submitting window/);
 tabs.get('a').profileId='other';assert.throws(()=>originTab(tabs,'b','a'),/not open/);
});

test('authenticated transport supplies origin identity; client claims only narrow window/view',()=>{
 assert.deepEqual(inputOrigin({hostId:'forged',deviceId:'forged',windowId:'window-1',viewId:'chat:one',grants:['all']},{hostId:'owner',deviceId:'paired',client:'mobile'}),{hostId:'owner',deviceId:'paired',client:'mobile',windowId:'window-1',viewId:'chat:one'});
 assert.equal(inputOrigin({windowId:'../private'},{hostId:'owner'}).windowId,null);
});

test('queued browser calls capture their original window before another input changes origin',async()=>{
 const module={exports:{}};
 // Load the real broker with inert Electron classes; this test exercises its tool queue only.
 const source=fs.readFileSync(new URL('../desktop/browser/browser.cjs',import.meta.url),'utf8');
 const start=source.indexOf('  agent(value,runId){'),end=source.indexOf('  async performAgent(',start);
 vm.runInNewContext('module.exports=class {'+source.slice(start,end)+'}',{module,require:name=>require('../desktop/'+name.replace('../','')),Promise});
 const BrowserTabs=module.exports.BrowserTabs||module.exports,storage=new AsyncLocalStorage(),seen=[];
 let current='a';
 const broker={options:{agentWindow:()=>({id:current,note:'Submitting app window.'})},tabs:new Map(),windowRegistry:{run:(id,work)=>storage.run(id,work)},async performAgent(){await Promise.resolve();seen.push(storage.getStore());return {ok:true};}};
 const first=BrowserTabs.prototype.agent.call(broker,{action:'open'},'chat');current='b';const second=BrowserTabs.prototype.agent.call(broker,{action:'open'},'chat');
 assert.equal((await first).windowId,'a');assert.equal((await second).windowId,'b');assert.deepEqual(seen,['a','b']);
});
