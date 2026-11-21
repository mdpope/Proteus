import test from 'node:test';
import assert from 'node:assert/strict';
import {filterNotifications,notificationCategory} from '../public/features/chats/attention-state.js';

test('notification filters find older owner-specific history alerts and count other categories',()=>{
 const a='alpha',b='beta';
 const rows=[
  {id:'older',hostId:a,hostLabel:'Alpha Mac',title:'General',body:'A pending page conflicts with its saved history.',browserIssue:{kind:'history-conflict'},at:'2026-11-11'},
  {id:'newer',hostId:b,hostLabel:'Beta Mac',title:'General',body:'Review a history conflict.',notificationType:'browser.issue',at:'2026-11-18'},
  {id:'question',hostId:a,title:'General',chatId:'chat',notificationType:'review.required',at:'2026-11-17'},
  {id:'life',hostId:a,title:'Life answered',notificationType:'life.answer',chatId:'life-chat'},
 ];
 rows.push(...Array.from({length:80},(_,index)=>({id:'chat'+index,title:'Completion',hostId:a,notificationType:'chat.completed',at:'2026-11-19'})));
 const filtered=filterNotifications(rows,{query:'alpha HISTORY',categories:['browser'],hosts:[a]});
 assert.deepEqual(filtered.rows.map(row=>row.item.id),['older']);
 assert.deepEqual(filtered.counts,{browser:1});
 const all=filterNotifications(rows,{categories:['browser','reviews']});
 assert.deepEqual(all.rows.map(row=>row.item.id),['newer','question','older']);
 assert.deepEqual(all.counts,{browser:2,reviews:1,life:1,chats:80});
 assert.equal(notificationCategory({kind:'site-permission'}),'browser');
 assert.equal(notificationCategory({kind:'document'}),'reviews');
 assert.equal(notificationCategory({kind:'connection'}),'connections');
 assert.equal(notificationCategory({kind:'notification',notificationType:'schedule.error'}),'system');
});
