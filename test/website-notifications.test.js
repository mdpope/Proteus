import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {ActivityStore} from '../src/services/telemetry/activity.js';
import {portableWebsiteNotification} from '../src/services/telemetry/website-notification.js';
const detail={origin:'https://messages.example.test',windowId:'owner-window',tabId:'native-view',logicalTabId:'logical-tab',profileId:'profile',siteNotificationId:'site-event',title:'Messages · Actual website title',body:'Actual website message',hostId:'10000000-0000-4000-8000-000000000001',hostName:'Synthetic Mac'};
function fixture(t,options){const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-site-notice-')),store=new ActivityStore(home,options);t.after(async()=>{await store.close();fs.rmSync(home,{recursive:true,force:true});});return store;}
const settled=async store=>{for(let i=0;i<200&&store.flushing;i++)await new Promise(resolve=>setTimeout(resolve,5));assert.equal(store.flushing,false);};
test('real website events use the common history and preserve text, source, sound intent and exact event deduplication',t=>{
 const store=fixture(t),heard=[];store.on('notification',item=>heard.push(item));const first=store.websiteNotification({...detail,silent:true});
 assert.equal(first.type,'website.notification');assert.equal(first.title,detail.title);assert.equal(first.body,detail.body);assert.equal(first.sound,false);assert.equal(first.silent,false);assert.equal(first.browserIssue.tabId,'native-view');assert.equal(store.websiteNotification({...detail,silent:true}).id,first.id);assert.equal(heard.length,1);
 const second=store.websiteNotification({...detail,siteNotificationId:'second-event',silent:false});assert.equal(second.sound,true);assert.equal(store.notifications().items.length,2);assert.equal(store.data.outbox.length,0,'forwarding is explicit');
 const portable=portableWebsiteNotification(first);assert.equal(portable.origin,detail.origin);assert.equal(portable.sound,false);assert.equal(portable.hostId,detail.hostId);assert.doesNotMatch(JSON.stringify(portable),/owner-window|native-view|logical-tab|profile|site-event/);
 store.read(first.id);assert.ok(portableWebsiteNotification(store.notifications().items.find(item=>item.id===first.id)).readAt);
});
test('website forwarding waits for server support without dropping events or blocking other notifications',async t=>{
 const published=[],identity={accountId:'account',workspaceId:'workspace',origin:'https://example.test'},store=fixture(t,{identity:()=>identity,publish:async item=>{if(item.type==='website.notification')throw Object.assign(Error('Older server'),{status:422});published.push(item);}});
 store.preferences({forwardWebsiteNotifications:true});const item=store.websiteNotification(detail);await settled(store);assert.equal(store.data.outbox.length,1);assert.equal(store.data.outbox[0].item.id,item.id);assert.equal(store.data.outbox[0].item.browserIssue,undefined);
 store.add('review.required',{chatId:'synthetic',requestId:'question',requestKind:'question',preview:'Actual question'});await settled(store);assert.equal(published.length,1);assert.equal(published[0].type,'review.required');assert.equal(store.data.outbox.length,1);
 store.publish=async value=>published.push(value);await store.flush();assert.equal(store.data.outbox.length,0);assert.equal(published.at(-1).id,item.id);
});
test('stale website alerts expire from forwarding instead of producing an old reconnect backlog',async t=>{
 let now=new Date(),attempts=0;const store=fixture(t,{clock:()=>now,identity:()=>({accountId:'account',workspaceId:'workspace',origin:'https://example.test'}),publish:async()=>{attempts++;throw Object.assign(Error('Server rollout pending'),{status:422});}});
 store.preferences({forwardWebsiteNotifications:true});store.websiteNotification(detail);await settled(store);assert.equal(attempts,1);assert.equal(store.data.outbox.length,1);now=new Date(now.getTime()+5*60000+1);await store.flush();assert.equal(attempts,1);assert.equal(store.data.outbox.length,0);assert.equal(store.notifications().items.length,1,'history remains after the live forwarding window expires');
});
