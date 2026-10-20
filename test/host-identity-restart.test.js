import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {startServer} from '../src/server.js';
test('an unconfigured owner retains disabled identity and complete navigation retry receipts after restart',async()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-owner-restart-'));let app;
 try{
  const open=()=>startServer({home,port:0,timers:false,withSeed:false});app=await open();const hostId=app.remote.info().hostId;
  assert.equal(app.remote.info().enabled,false);assert.equal(app.remote.info().status,'disabled');assert.deepEqual(app.remote.info().devices,[]);assert.equal(fs.statSync(path.join(home,'remote.json')).mode&0o777,0o600);
  const scope={scope:'main',id:'main'};await app.contentTabs.mutateAsync({...scope,expectedRevision:0,operations:[{action:'open',tab:{id:'receipt-browser',type:'browser',url:'https://example.test/a',title:'A'}}]});
  let row=await app.contentTabs.getAsync('main','main');const first=row.tabs[0].history.entries[0].id;
  const operation={action:'browser-navigate',tabId:'receipt-browser',operationId:'unconfigured-owner-navigation',entryId:'second',baseRevision:row.tabs[0].history.revision,url:'https://example.test/b',title:'B',visitedAt:'2026-10-19T12:00:00.000Z'};
  await app.contentTabs.mutateAsync({...scope,operations:[operation]});row=await app.contentTabs.getAsync('main','main');await app.contentTabs.mutateAsync({...scope,operations:[{action:'browser-traverse',tabId:'receipt-browser',operationId:'unconfigured-owner-back',entryId:first,baseRevision:row.tabs[0].history.revision,visitedAt:'2026-10-19T12:00:01.000Z'}]});const history=(await app.contentTabs.getAsync('main','main')).tabs[0].history;
  await app.close();app=await open();assert.equal(app.remote.info().hostId,hostId);assert.equal(app.remote.info().enabled,false);assert.deepEqual(app.remote.info().devices,[]);
  await app.contentTabs.mutateAsync({...scope,operations:[operation]});assert.deepEqual((await app.contentTabs.getAsync('main','main')).tabs[0].history,history);assert.equal(history.entries.length,2);assert.equal(history.index,0);
 }finally{await app?.close();fs.rmSync(home,{recursive:true,force:true});}
});
