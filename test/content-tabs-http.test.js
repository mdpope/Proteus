import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import {cleanupStack} from './helpers/cleanup.js';
import {startServer} from '../src/server.js';

test('local content-tab HTTP preserves typed navigation conflicts and owner closes without exposing exception details',async t=>{
 const cleanup=cleanupStack(t),home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-tabs-http-'));
 cleanup(()=>fs.rmSync(home,{recursive:true,force:true}));
 const app=await startServer({home,port:0,timers:false,withSeed:false,providers:{}});cleanup(()=>app.close());
 const scope={scope:'main',id:'main'},entries=['a','b'].map(id=>({id,url:'https://example.test/'+id,title:id}));
 await app.contentTabs.mutateAsync({...scope,expectedRevision:0,operations:[{action:'open',tab:{id:'browser',type:'browser',title:'A',url:entries[0].url,history:{entries,index:0}}}]});
 const before=await app.contentTabs.getAsync(scope.scope,scope.id),history=before.tabs[0].history;
 const post=async value=>{const response=await fetch(app.origin+'/api/content-tabs',{method:'POST',headers:{authorization:'Bearer '+app.token,'content-type':'application/json'},body:JSON.stringify(value)});return {status:response.status,body:await response.json()};};
 const operation={action:'browser-redirect',tabId:'browser',entryId:history.currentEntryId,url:entries[0].url,title:'Changed',operationId:'typed-conflict',baseRevision:history.revision+1};
 const conflict=await post({action:'mutate',...scope,expectedRevision:before.revision,operations:[operation]});
 assert.equal(conflict.status,400);assert.equal(conflict.body.code,'NAVIGATION_CONFLICT');assert.deepEqual(Object.keys(conflict.body).sort(),['code','error']);
 const after=await app.contentTabs.getAsync(scope.scope,scope.id);assert.deepEqual(after.tabs[0].history,history,'a rejected navigation does not discard Forward history');
 await app.mutateContentTabs({...scope,expectedRevision:after.revision,operations:[{action:'close',id:'browser'}]});
 const closed=await post({action:'mutate',...scope,expectedRevision:after.revision,operations:[operation]});assert.equal(closed.body.code,'NAVIGATION_TAB_CLOSED');
 assert.equal((await app.contentTabs.getAsync(scope.scope,scope.id)).tabs.length,0,'a pending request cannot reopen an owner-closed tab');
});
