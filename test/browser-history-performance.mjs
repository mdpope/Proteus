// Explicit synthetic rehearsal; never opens the installed application-data directory.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {performance,monitorEventLoopDelay} from 'node:perf_hooks';
import {BrowserHistory} from '../src/browser-history.js';
const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-history-50k-'));
const now=Date.now(),day=86400000,sha=value=>createHash('sha256').update(value).digest('hex');
const legacyFile=path.join(home,'browsing-history.json');
const legacy={version:1,enabled:true,retentionDays:365,extension:{preserved:true},items:Array.from({length:100},(_,i)=>({id:'legacy-'+i,url:'https://synthetic.test/legacy/'+i,title:'Legacy '+i,visitedAt:new Date(now-i*day/10).toISOString(),profileId:'default'}))};
fs.writeFileSync(legacyFile,JSON.stringify(legacy),{mode:0o600});const original=sha(fs.readFileSync(legacyFile));
let history,ticks=0,maxGap=0,previous=performance.now(),timer;
const delay=monitorEventLoopDelay({resolution:10});delay.enable();
try{
 history=new BrowserHistory(home,{hostId:'synthetic-owner'});history.scheduleMaintenance=()=>{};await history.ready;await history.maintenance();
 const migration=await history.status();assert.equal(migration.migration.imported,100);assert.equal(sha(fs.readFileSync(legacyFile)),original);
 timer=setInterval(()=>{const current=performance.now();maxGap=Math.max(maxGap,current-previous);previous=current;ticks++;},5);
 const insertStart=performance.now();
 for(let offset=0;offset<50000;offset+=200){
  await history.record({events:Array.from({length:200},(_,position)=>{const i=offset+position;return {eventId:'synthetic-'+i,url:'https://synthetic.test/page/'+i,title:(i%997===0?'needle ':'Page ')+i,visitedAt:new Date(now-(i%30)*day).toISOString(),profileId:i%2?'work':'default'};})});
 }
 const insertMs=performance.now()-insertStart;
 assert.equal((await history.query()).total,50100);assert.equal((await history.query({profileId:'work'})).total,25000);
 const latencies=[];for(let i=0;i<40;i++){const start=performance.now(),result=await history.query({query:'needle',limit:17});latencies.push(performance.now()-start);assert.equal(result.total,51);assert.equal(result.items.length,17);}
 let cursor,pages=0,rows=0,largestPage=0;
 do{const page=await history.sync({cursor,limit:200});assert.ok(page.events.length+page.tombstones.length<=200);largestPage=Math.max(largestPage,Buffer.byteLength(JSON.stringify(page)));assert.ok(largestPage<520*1024);rows+=page.events.length;pages++;cursor=page.hasMore?page.cursor:null;}while(cursor);
 assert.equal(rows,50100);assert.equal(pages,251);
 await history.close();history=new BrowserHistory(home,{hostId:'synthetic-owner'});history.scheduleMaintenance=()=>{};await history.ready;assert.equal((await history.query()).total,50100);assert.equal(sha(fs.readFileSync(legacyFile)),original);
 const pruneStart=performance.now();let pruneDone=false;const duringPrune=[];const pruning=history.maintenance({now:now+366*day}).finally(()=>{pruneDone=true;});const readers=(async()=>{for(let i=0;i<60&&!pruneDone;i++){const start=performance.now();await history.query({limit:1});duringPrune.push(performance.now()-start);await new Promise(resolve=>setTimeout(resolve,10));}})();const pruned=await pruning;await readers;const pruneMs=performance.now()-pruneStart;assert.equal(pruned.pruned,50100);assert.ok(pruned.batches>=51);assert.equal((await history.query()).total,0);assert.equal(sha(fs.readFileSync(legacyFile)),original);
 const sorted=latencies.sort((a,b)=>a-b);assert.ok(ticks>100,'Main event loop must continue progressing during the rehearsal.');
 console.log(JSON.stringify({rehearsal:true,visits:50100,insertMs:Math.round(insertMs),queryP50Ms:+sorted[20].toFixed(2),queryP95Ms:+sorted[38].toFixed(2),syncPages:pages,largestDeltaBytes:largestPage,pruneMs:Math.round(pruneMs),pruneBatches:pruned.batches,duringPruneQueryP95Ms:+duringPrune.sort((a,b)=>a-b)[Math.floor(duringPrune.length*.95)].toFixed(2),eventLoopTicks:ticks,maxTimerGapMs:+maxGap.toFixed(2),eventLoopP99Ms:+(delay.percentile(99)/1e6).toFixed(2),legacySHA256Preserved:true,reopenCountVerified:true}));
}finally{clearInterval(timer);delay.disable();await history?.close();fs.rmSync(home,{recursive:true,force:true});}
