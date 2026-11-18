import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';
import {LifeAskHost} from '../src/services/life/life-ask-host.js';
import {lifeDestinationURL} from '../public/features/tools/life-destinations.js';

test('memory target contains only opaque IDs and rechecks account, grant and file identity at open',t=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-memory-target-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
 const id=randomUUID(),account='a'.repeat(64),host=randomUUID(),inbox=path.join(home,'inbox');fs.mkdirSync(inbox);
 const file=path.join(inbox,id+'.md');fs.writeFileSync(file,'Synthetic memory');const config=path.join(home,'config.json');fs.writeFileSync(config,JSON.stringify({agent_requests:{inbox}}));
 const receipt={requestId:id,accountID:account,hostID:host};
 const owner={store:{binding:()=>({accountID:account}),read:()=>receipt,directory:()=>home},service:{omi:{getSettings:()=>({configPath:config})},workspaceExplorer:{reference:({workspaceId,file:target})=>{assert.equal(target,file);if(workspaceId!=='granted')throw Error('No root');return {workspaceId,rootId:'source',file:id+'.md'};}}}};
 const destination=LifeAskHost.prototype.documentTarget.call(owner,receipt,{savedPath:'Inbox/Mnemosyne/'+id+'.md'});
 assert.deepEqual(destination,{kind:'document',accountId:account,hostId:host,documentId:id});assert.equal(JSON.stringify(destination).includes(home),false);
 const open=(who,grants)=>LifeAskHost.prototype.documentReference.call(owner,id,who,grants);
 assert.equal(open(account,['granted']).file,id+'.md');assert.throws(()=>open('b'.repeat(64),['granted']),/another Life account/);
 assert.throws(()=>open(account,[]),/workspace file viewing/);assert.throws(()=>open(account,['revoked']),/workspace file viewing/);
 fs.writeFileSync(file,'Replaced content');assert.throws(()=>open(account,['granted']),/moved or changed/);
 fs.unlinkSync(file);assert.throws(()=>open(account,['granted']),/moved or changed/);
});
test('typed URLs cannot cross accounts or interpret paths as document identifiers',()=>{
 const account='a'.repeat(64),id=randomUUID(),hostId=randomUUID();
 assert.equal(lifeDestinationURL({kind:'reminder',accountId:account,reminderId:id},account),'/life/reminders?id='+id);
 assert.equal(lifeDestinationURL({kind:'document',accountId:account,hostId,documentId:'../../private'},account),null);
 assert.equal(lifeDestinationURL({kind:'reminder',accountId:'b'.repeat(64),reminderId:id},account),null);
});
test('browser push uses authenticated account, exact target, bounded preview and one event receipt',async()=>{
 const handlers={},seen=new Map(),shown=[],account='a'.repeat(64),id=randomUUID(),event=randomUUID(),now=new Date().toISOString();
 let notifications=[{eventId:event,type:'life.reminder',createdAt:now,title:'T'.repeat(200),body:'B'.repeat(600),destination:{kind:'reminder',accountId:account,reminderId:id}}];
 const context={Request,Response,URLSearchParams,Date,fetch:async()=>({ok:true,json:async()=>({accountId:account,notifications})}),caches:{open:async()=>({match:async key=>seen.get(key.url),put:async(key,value)=>seen.set(key.url,value),keys:async()=>[],delete:async()=>{}})},self:{location:{origin:'https://example.test'},addEventListener:(name,fn)=>handlers[name]=fn,registration:{showNotification:async(...value)=>shown.push(value)}},clients:{openWindow:async url=>url}};
 vm.runInNewContext(fs.readFileSync(new URL('../web/public/proteus-push-sw.js',import.meta.url),'utf8'),context);
 const push=()=>new Promise(resolve=>handlers.push({waitUntil:promise=>promise.then(resolve)}));
 await push();await push();assert.equal(shown.length,1);assert.equal(shown[0][1].data.url,'/life/reminders?id='+id);assert.equal(shown[0][0].length,160);assert.equal(shown[0][1].body.length,500);
 notifications=[{...notifications[0],eventId:randomUUID(),hostId:randomUUID(),chatId:randomUUID(),destination:{kind:'reminder',accountId:'b'.repeat(64),reminderId:id}}];
 await push();assert.equal(shown[1][1].data.url,'/engine-room?tab=notifications');
 let opened;handlers.notificationclick({notification:{close(){},data:{url:'https://attacker.test/'}},waitUntil:async result=>{opened=await result;}});await new Promise(resolve=>setImmediate(resolve));assert.equal(opened,'/engine-room?tab=notifications');
});
