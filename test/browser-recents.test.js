import test from 'node:test';
import assert from 'node:assert/strict';
import { recentBrowserVisits } from '../public/features/browser/browser-recents.js';
test('recent address suggestions keep the latest device for each URL and cap at 20',()=>{
 const visits=Array.from({length:25},(_,i)=>({url:`https://example.test/${i}`,visitedAt:new Date(Date.UTC(2026,9,7,0,i)).toISOString(),deviceName:'Mac'}));
 visits.push({url:'https://example.test/0',visitedAt:'2026-10-07T02:00:00Z',deviceName:'iPad'});
 visits.push({url:'https://name:password@example.test/',visitedAt:'2026-10-07T03:00:00Z'},{url:'javascript:alert(1)'},{url:'invalid'});
 const result=recentBrowserVisits(visits);assert.equal(result.length,20);assert.equal(result[0].deviceName,'iPad');assert.equal(result[0].url,'https://example.test/0');assert.equal(new Set(result.map(x=>x.url)).size,20);assert.equal(result[1].url,'https://example.test/24');assert.equal(visits.length,29);
});
test('legacy visit timestamps sort correctly, missing timestamps come last',()=>{
 const result=recentBrowserVisits([{url:'https://example.test/unknown'},{url:'https://example.test/old',at:'2026-10-01T00:00:00Z'},{url:'https://example.test/new',createdAt:'2026-10-02T00:00:00Z'}]);assert.deepEqual(result.map(x=>x.url.split('/').at(-1)),['new','old','unknown']);
});
test('history matching happens before result cap and matches case-insensitive titles',()=>{
 const visits=Array.from({length:80},(_,i)=>({url:`https://example.test/${i}`,title:i===0?'Older Needle':'Recent '+i,visitedAt:new Date(100000+i).toISOString()}));
 assert.deepEqual(recentBrowserVisits(visits,20,'NEEDLE').map(x=>x.title),['Older Needle']);
 assert.equal(recentBrowserVisits(visits,20,'example.test').length,20);
});
