import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {EventEmitter} from 'node:events';
import {ActivityStore} from '../src/services/telemetry/activity.js';
import {initBrowserNotifications} from '../public/features/browser/browser-notifications.js';

function fixture(t, publish) {
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-notification-resolution-'));
 const engine=new EventEmitter(),run={id:'fixture',title:'Fixture chat',status:'running',trigger:'chat',events:[],schedule:{},turns:[{id:'turn-one'}]};
 engine.listRuns=()=>[run];
 const store=new ActivityStore(home,{identity:()=>({accountId:'account',workspaceId:'workspace',origin:'https://example.test'}),publish});
 store.attach(engine,()=> '10000000-0000-4000-8000-000000000001');
 t.after(async()=>{await store.close();fs.rmSync(home,{recursive:true,force:true});});
 return {store,engine,run};
}
async function settled(store){for(let i=0;i<200&&store.flushing;i++)await new Promise(resolve=>setTimeout(resolve,5));assert.equal(store.flushing,false);}

test('a temporary display failure after recovery leaves the browser conflict marked read',async t=>{
 const {store}=fixture(t,async()=>{}), windowId='fixture-window';
 const issue=store.browserIssue({kind:'history-conflict',windowId,scope:{scope:'project',id:'social'},title:'Browser history needs attention'});
 const originalWindow=globalThis.window;
 t.after(()=>{if(originalWindow===undefined)delete globalThis.window;else globalThis.window=originalWindow;});
 let receive,completed=false;
 globalThis.window={desktop:{windowId,onNotification:fn=>{receive=fn;},browserNotification:value=>store.browserIssue(value)}};
 initBrowserNotifications({api:async(_route,action)=>action?store.read(action.id):store.notifications(),
  resolve:async()=>{completed=true;},refresh:async()=>{throw Error('State display is temporarily unavailable.');}});
 receive({browserIssueId:issue.id,issueAction:'open-copy'});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(completed,true);
 const notices=store.notifications().items;
 assert.equal(notices.length,1);
 assert.ok(notices[0].readAt);
});

test('resolved approval replaces an offline alert with silent resolved history; completion remains distinct',async t=>{
 const published=[];let online=false;
 const {store,engine,run}=fixture(t,async item=>{if(!online)throw Error('Offline');published.push(structuredClone(item));});
 Object.assign(run,{status:'awaiting_input',pending:{id:'permission-one',type:'permission',details:{kind:'shell',fullCommandText:'synthetic-command'}}});engine.emit('change',run);await settled(store);
 const approval=store.notifications().items[0];assert.match(approval.title,/Approval required/);
 // Auto approval settles while account delivery is offline; a stale pending
 // object on a completed run must not generate another approval.
 run.status='completed';run.events=[{role:'assistant',text:'Completed fixture'}];engine.emit('change',run);await settled(store);
 online=true;await store.flush();
 const approvals=published.filter(item=>item.type==='review.required');assert.ok(approvals.length>=1);
 for(const item of approvals){assert.equal(item.id,approval.id);assert.equal(item.silent,true);assert.ok(item.readAt);assert.ok(item.resolvedAt);}
 const completion=published.filter(item=>item.type==='chat.completed');assert.equal(completion.length,1);assert.equal(completion[0].silent,false);assert.doesNotMatch(completion[0].title,/Approval required/);
 engine.emit('change',run);await settled(store);assert.equal(store.notifications().items.length,2);
});

test('resolution follows an in-flight pending publication using the same immutable event identity',async t=>{
 const published=[];let release;
 const {store,engine,run}=fixture(t,async item=>{published.push(structuredClone(item));if(published.length===1)await new Promise(resolve=>release=resolve);});
 Object.assign(run,{status:'awaiting_input',pending:{id:'question-one',type:'question',question:'Synthetic question'}});engine.emit('change',run);
 await new Promise(resolve=>setImmediate(resolve));assert.equal(typeof release,'function');
 run.status='running';run.pending=null;engine.emit('change',run);release();await settled(store);
 const updates=published.filter(item=>item.type==='review.required');assert.equal(updates.length,2);assert.equal(updates[0].id,updates[1].id);assert.equal(updates[1].silent,true);assert.ok(updates[1].resolvedAt);
 store.read(updates[0].id);await settled(store);assert.equal(store.notifications().items.length,1);
});
