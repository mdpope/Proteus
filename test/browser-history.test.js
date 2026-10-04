import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import history from '../desktop/browser-history.cjs';import workspace from '../desktop/workspace-session.cjs';
const {normalizeHistory,safeHistoryURL,MAX_ENTRIES,MAX_HISTORY_BYTES}=history;
test('browser history preserves selected index and forward entries; strips page/form/auth data',()=>{
 const input={index:1,entries:['a','b','c'].map(name=>({url:'https://example.test/'+name,title:name,pageState:'PRIVATE_FORM_POST',postData:'PRIVATE_BODY',headers:{Authorization:'PRIVATE_AUTH'}}))};
 assert.deepEqual(normalizeHistory(input),{index:1,entries:['a','b','c'].map(name=>({url:'https://example.test/'+name,title:name}))});
 assert.doesNotMatch(JSON.stringify(normalizeHistory(input)),/PRIVATE/);
});
test('history rejects unsafe URLs and current privileged origin while mapping selected index',()=>{
 const urls=['file:///tmp/private','https://user:secret@example.test','http://localhost:9999/app','https://example.test/a','https://example.test/oauth?code=PRIVATE','https://example.test/b#access_token=PRIVATE','https://example.test/c'];
 const clean=normalizeHistory({index:3,entries:urls.map(url=>({url}))},'http://localhost:9999');assert.equal(clean.index,0);assert.deepEqual(clean.entries.map(e=>e.url),[urls[3],urls[6]]);
 for(const index of [-1,1.1,99,0])assert.equal(normalizeHistory({index,entries:[{url:'javascript:alert(1)'}]}),undefined);
 assert.equal(safeHistoryURL('https://example.test/'+'x'.repeat(4096)),null);
});
test('history limits entries, UTF8 size and title length while retaining current URL',()=>{
 const entries=Array.from({length:200},(_,i)=>({url:'https://example.test/'+i+'?q='+'x'.repeat(3900),title:'t'.repeat(500)}));const clean=normalizeHistory({index:100,entries});
 assert.ok(clean.entries.length<=MAX_ENTRIES);assert.ok(Buffer.byteLength(JSON.stringify(clean))<=MAX_HISTORY_BYTES);assert.equal(clean.entries[clean.index].url,entries[100].url);assert.ok(clean.index>0&&clean.index<clean.entries.length-1);assert.ok(clean.entries.every(e=>e.title.length===200));
});
test('workspace caps total history, migrates URL-only tabs and preserves oversized source on refusal',()=>{
 const entries=Array.from({length:50},(_,i)=>({url:'https://example.test/'+i+'?q='+'x'.repeat(1000),title:'Title'}));const clean=workspace.normalizeSession({tabs:Array.from({length:100},(_,i)=>({id:'web'+i,type:'browser',url:'https://example.test/current',history:{entries,index:25}}))});
 assert.ok(clean.tabs.filter(t=>t.history).length<100);assert.ok(Buffer.byteLength(JSON.stringify(clean))<2*1024*1024);assert.equal(workspace.normalizeSession({tabs:[{id:'legacy',type:'browser',url:'https://example.test/legacy'}]}).tabs[1].url,'https://example.test/legacy');
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-history-limit-'));try{const store=new workspace.WorkspaceSession(home);fs.writeFileSync(store.file,' '.repeat(2*1024*1024+1));assert.throws(()=>store.get(),/preserved/);assert.equal(fs.statSync(store.file).size,2*1024*1024+1);}finally{fs.rmSync(home,{recursive:true,force:true});}
});
