import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {BrowsingHistory} from '../desktop/browsing-history.cjs';
import {historyTimestamp,historyDevice} from '../public/browser-home.js';
const hostId='11111111-1111-4111-8111-111111111111';
function home(t){const folder=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-visit-metadata-'));t.after(()=>fs.rmSync(folder,{recursive:true,force:true}));return folder;}
test('visit timestamp and configured device identity persist without rewriting older names',t=>{
 t.mock.timers.enable({apis:['Date'],now:new Date('2026-10-05T00:00:00Z')});
 let name='Original Mac';const visits=[],folder=home(t),store=new BrowsingHistory(folder,{device:()=>({id:hostId,name}),onVisit:item=>visits.push({...item})});
 store.visit('https://example.test/first','First');const original={...store.list().items[0]};assert.equal(original.visitedAt,'2026-10-05T00:00:00.000Z');assert.equal(original.deviceName,name);assert.equal(original.hostId,hostId);assert.equal(original.deviceId,hostId);assert.equal(original.source,'desktop');
 name='Renamed Mac';t.mock.timers.setTime(Date.now()+1000);store.visit('https://example.test/first','Updated title');assert.equal(store.list().total,1);assert.equal(store.list().items[0].deviceName,'Original Mac');assert.equal(store.list().items[0].visitedAt,original.visitedAt);assert.equal(visits.length,1);
 t.mock.timers.setTime(Date.now()+1000);store.visit('https://example.test/second','Second');const restored=new BrowsingHistory(folder).list().items;assert.deepEqual(restored.map(item=>item.deviceName),['Renamed Mac','Original Mac']);assert.equal(restored[0].visitedAt,'2026-10-05T00:00:02.000Z');assert.equal(restored[1].id,original.id);assert.equal(restored[1].title,'Updated title');assert.deepEqual(restored.map(item=>item.hostId),[hostId,hostId]);assert.deepEqual(visits.map(item=>item.deviceName),['Original Mac','Renamed Mac']);assert.equal(fs.statSync(store.file).mode&0o777,0o600);
});
test('visit metadata bounds device names and rejects invalid device identity without retaining extra fields',t=>{
 const folder=home(t),store=new BrowsingHistory(folder,{device:()=>({id:'not-a-uuid',name:' \u0000'+ 'N'.repeat(150)+'\n',secret:'not retained'})});store.visit('https://example.test/bounded','Bounded');const item=new BrowsingHistory(folder).list().items[0];assert.equal(item.deviceName.length,100);assert.doesNotMatch(item.deviceName,/[\x00-\x1f\x7f]/);assert.equal(item.hostId,undefined);assert.equal(item.deviceId,undefined);assert.equal(item.secret,undefined);assert.ok(Number.isFinite(Date.parse(item.visitedAt)));
});
test('legacy history remains unchanged and never infers a current or paired device name',t=>{
 const folder=home(t),item={id:'legacy',url:'https://example.test/legacy',title:'Legacy',visitedAt:new Date().toISOString(),source:'desktop'};const file=path.join(folder,'browsing-history.json');fs.writeFileSync(file,JSON.stringify({version:1,enabled:true,retentionDays:90,items:[item]}));const bytes=fs.readFileSync(file);const store=new BrowsingHistory(folder,{device:()=>({id:hostId,name:'Current Mac'})});assert.deepEqual(store.list().items,[item]);assert.deepEqual(fs.readFileSync(file),bytes);assert.equal(historyDevice(item),'Unknown device');assert.equal(historyDevice({deviceName:'  Visit-time Mac  ',source:'mobile'}),'Visit-time Mac');assert.equal(historyDevice({deviceName:' ',source:'web',hostId}),'Unknown device');
});
test('history timestamp renders date, year and local-zone DST offset instead of ambiguous wall time',()=>{
 const before='2026-11-01T07:30:00Z',after='2026-11-01T08:30:00Z';const a=historyTimestamp(before,'America/Denver'),b=historyTimestamp(after,'America/Denver');assert.notEqual(a,b);assert.match(a,/2026/);assert.match(b,/2026/);assert.match(a,/1:30/);assert.match(b,/1:30/);assert.match(a,/MDT|GMT-6/);assert.match(b,/MST|GMT-7/);
 assert.match(historyTimestamp('2026-03-08T08:59:00Z','America/Denver'),/1:59/);assert.match(historyTimestamp('2026-03-08T09:00:00Z','America/Denver'),/3:00/);
 const expected=new Intl.DateTimeFormat(undefined,{year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(before));assert.equal(historyTimestamp(before),expected);
 for(const invalid of [undefined,null,'','not-a-date'])assert.equal(historyTimestamp(invalid),'Unknown time');
});
