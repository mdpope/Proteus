import fs from 'node:fs';
import {readJSON} from '../../shared/files.js';
import {primeChatActivity} from './run-activity.js';

const active = new Set(['queued', 'running', 'awaiting_input']);
// Durable records remain authoritative. The byte budget estimates encoded file bytes,
// not exact JS heap usage; in-flight provider references are always pinned.
export class RunHistoryCache {
  constructor(fileFor, limit=4, {maxBytes=16*1024*1024, isPinned=()=>false, idleMs=600000, now=()=>Date.now()}={}) {
    if(!Number.isSafeInteger(limit)||limit<0||!Number.isSafeInteger(maxBytes)||maxBytes<0)throw new TypeError('Choose nonnegative history cache limits.');
    this.fileFor=fileFor;this.limit=limit;this.maxBytes=maxBytes;this.isPinned=isPinned;this.idleMs=idleMs;this.now=now;
    this.entries=new Map();this.resident=new Map();this.evictionQueued=false;
    this.timer=setInterval(()=>this.trim(),30000);this.timer.unref();
  }
  configure({chatViewLimit=4,inactiveMinutes=10}={}){this.limit=chatViewLimit;this.idleMs=inactiveMinutes*60000;this.trim();}
  close(){clearInterval(this.timer);}
  pinned(entry){return active.has(entry.run.status)||this.isPinned(entry.run);}
  size(id){try{return fs.statSync(this.fileFor(id)).size;}catch{return this.maxBytes+1;}}
  touch(entry){if(this.entries.get(entry.run.id)!==entry)return;entry.usedAt=this.now();this.resident.delete(entry.run.id);this.resident.set(entry.run.id,entry);}
  attach(run, bytes) {
    const existing=this.entries.get(run.id);
    if(existing){existing.bytes=bytes??existing.bytes;primeChatActivity(run,existing.events??run.events);this.trim(run.id);return;}
    const entry={run,events:run.events,bytes:bytes??this.size(run.id)};
    primeChatActivity(run,entry.events);this.entries.set(run.id,entry);this.touch(entry);
    Object.defineProperty(run,'events',{enumerable:true,configurable:true,get:()=>{
      if(!entry.events){entry.events=readJSON(this.fileFor(run.id)).events;entry.bytes=this.size(run.id);}
      const events=entry.events;this.touch(entry);this.trim(run.id);return events;
    },set:events=>{entry.events=events;this.touch(entry);}});
    this.trim(run.id);
  }
  trim(keep) {
    for(const [id,entry]of this.resident){if(this.pinned(entry))entry.usedAt=this.now();else if(id!==keep&&this.now()-entry.usedAt>=this.idleMs){entry.events=null;this.resident.delete(id);}}
    const inactive=[...this.resident.values()].filter(entry=>entry.events&&!this.pinned(entry));
    let count=inactive.length,bytes=inactive.reduce((total,entry)=>total+entry.bytes,0);
    for(const entry of inactive){
      if(count<=this.limit&&bytes<=this.maxBytes)break;
      if(entry.run.id===keep)continue;
      count--;bytes-=entry.bytes;entry.events=null;this.resident.delete(entry.run.id);
    }
    // A single oversized inspected record may live through the current synchronous
    // projection. Drop the cache reference afterwards instead of retaining it idle.
    if((count>this.limit||bytes>this.maxBytes)&&!this.evictionQueued){
      this.evictionQueued=true;queueMicrotask(()=>{this.evictionQueued=false;this.trim();});
    }
  }
  forget(id){this.entries.delete(id);this.resident.delete(id);}
}
