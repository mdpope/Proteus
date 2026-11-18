import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {ActivityStore} from '../src/services/telemetry/activity.js';

function fixture(t){
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-ask-notification-'));let account='synthetic';const published=[];
 const activity=new ActivityStore(home,{identity:()=>({accountId:account,origin:'https://synthetic.invalid',workspaceId:'synthetic'}),publish:async item=>{published.push(item);return {pushAcceptedAt:5000};}});
 t.after(async()=>{await activity.close();fs.rmSync(home,{recursive:true,force:true});});
 const detail={accountID:account,eventId:randomUUID(),requestId:randomUUID(),hostId:randomUUID(),chatId:randomUUID(),title:'Synthetic question',answer:'Synthetic answer'};
 return {activity,detail,published,switchAccount:value=>{account=value;}};
}
test('Life Ask event and outbox persist together and retries publish only the stable ID',async t=>{
 const f=fixture(t),first=await f.activity.lifeAnswer(f.detail),second=await f.activity.lifeAnswer(f.detail);
 assert.equal(f.published.length,1);assert.deepEqual(second,first);assert.equal(first.pushAcceptedAt,5000);
 assert.equal(f.published[0].eventId,f.detail.eventId);assert.equal(f.published[0].type,'life.answer');assert.equal(f.published[0].chatId,f.detail.chatId);assert.equal(f.published[0].sound,false);
 assert.equal(f.activity.data.outbox.length,0);
});
test('older website keeps Life Ask events queued while unrelated activity continues',async t=>{
 const f=fixture(t);f.activity.publish=async item=>{if(item.type==='life.answer')throw Object.assign(Error('not deployed'),{status:422});f.published.push(item);};
 assert.deepEqual(await f.activity.lifeAnswer(f.detail),{queued:true});assert.equal(f.activity.data.outbox.length,1);
 f.activity.queue('logs',{id:randomUUID(),event:'app.started',createdAt:new Date().toISOString()});
 while(f.activity.flushing)await new Promise(resolve=>setTimeout(resolve,1));
 assert.equal(f.published.length,1);assert.equal(f.activity.data.outbox.length,1);
 f.activity.publish=async item=>{f.published.push(item);return {};};assert.ok((await f.activity.lifeAnswer(f.detail)).at);assert.equal(f.activity.data.outbox.length,0);
});
test('account switches cannot publish pending Life Ask answers under the new account',async t=>{
 const f=fixture(t);f.activity.publish=async()=>{throw Error('offline');};await f.activity.lifeAnswer(f.detail);
 f.switchAccount('other');f.activity.publish=async item=>{f.published.push(item);return {};};await f.activity.flush();
 assert.equal(f.published.length,0);assert.equal(f.activity.data.outbox.length,1);
 await assert.rejects(f.activity.lifeAnswer(f.detail),/account changed/);
 f.switchAccount('synthetic');await f.activity.flush();assert.equal(f.published.length,1);
});
test('server reminder confirmation is projected locally under the same event without republishing',async t=>{
 const f=fixture(t),eventId=randomUUID(),receipt={...f.detail,hostID:f.detail.hostId},result={reminder:{id:randomUUID(),title:'Water plants'},confirmation:{eventId,at:5000},answer:'Saved in Inbox.',destination:{kind:'reminder',accountId:f.detail.accountID,reminderId:randomUUID()}};
 let alerts=0;f.activity.on('notification',()=>alerts++);
 assert.deepEqual(f.activity.localLifeConfirmation(receipt,result),result.confirmation);f.activity.localLifeConfirmation(receipt,result);
 assert.equal(alerts,1);assert.equal(f.published.length,0);assert.equal(f.activity.data.outbox.length,0);assert.equal(f.activity.data.notifications[0].id,eventId);assert.deepEqual(f.activity.data.notifications[0].destination,result.destination);
 f.switchAccount('other');assert.throws(()=>f.activity.localLifeConfirmation(receipt,result),/account changed/);
});
