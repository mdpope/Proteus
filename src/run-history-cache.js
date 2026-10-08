import {readJSON} from './files.js';
// Durable events stay on disk; only recently inspected completed histories stay resident.
// Active runs are pinned because provider callbacks can retain event references.
export class RunHistoryCache {
  constructor(fileFor, limit=4){this.fileFor=fileFor;this.limit=limit;this.entries=new Map();}
  attach(run){
    if(this.entries.has(run.id))return;
    const entry={run,events:run.events};this.entries.set(run.id,entry);
    Object.defineProperty(run,'events',{enumerable:true,configurable:true,get:()=>{
      if(!entry.events)entry.events=readJSON(this.fileFor(run.id)).events;
      this.entries.delete(run.id);this.entries.set(run.id,entry);this.trim(run.id);return entry.events;
    },set:events=>{entry.events=events;}});
    this.trim(run.id);
  }
  trim(keep){
    const inactive=[...this.entries.values()].filter(entry=>entry.events&&!['queued','running','awaiting_input'].includes(entry.run.status));
    for(const entry of inactive){if(inactive.filter(item=>item.events).length<=this.limit)break;if(entry.run.id!==keep)entry.events=null;}
  }
  forget(id){this.entries.delete(id);}
}
