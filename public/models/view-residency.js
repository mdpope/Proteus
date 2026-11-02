export const resourceDefaults=Object.freeze({chatViewLimit:4,documentViewLimit:4,inactiveMinutes:10});
export function resourcePreferences(value={}){
 const result={};for(const [key,fallback]of Object.entries(resourceDefaults)){const max=key==='inactiveMinutes'?120:32;result[key]=Number.isInteger(value?.[key])&&value[key]>=1&&value[key]<=max?value[key]:fallback;}return result;
}
// One budget per window, shared by local and paired-host content. Slots allow
// transcript data and its DOM to be released together without retaining either.
export class ViewResidency{
 constructor({now=()=>Date.now(),preferences}={}){this.now=now;this.preferences=resourcePreferences(preferences);this.entries=new Map();}
 configure(value){this.preferences=resourcePreferences(value);this.sweep();}
 retain(key,kind,slot,{active=()=>false,dispose}={}){
  let entry=this.entries.get(key);if(!entry){entry={kind,usedAt:this.now(),slots:new Map()};this.entries.set(key,entry);}
  entry.usedAt=this.now();entry.slots.set(slot,{active,dispose});
  // The selected view may still be mounting in this synchronous render.
  queueMicrotask(()=>this.sweep());
 }
 release(key,slot){const entry=this.entries.get(key);entry?.slots.delete(slot);if(!entry?.slots.size)this.entries.delete(key);}
 drop(key){const entry=this.entries.get(key);if(!entry)return;this.entries.delete(key);for(const slot of entry.slots.values())slot.dispose?.();}
 sweep(){
  const now=this.now(),idle=this.preferences.inactiveMinutes*60000;
  const pinned=entry=>[...entry.slots.values()].some(slot=>slot.active());
  for(const [key,entry]of this.entries){if(pinned(entry))entry.usedAt=now;else if(now-entry.usedAt>=idle)this.drop(key);}
  for(const kind of ['chat','document']){
   const entries=[...this.entries].filter(([,entry])=>entry.kind===kind).sort((a,b)=>a[1].usedAt-b[1].usedAt);
   let count=entries.length;const limit=this.preferences[kind==='chat'?'chatViewLimit':'documentViewLimit'];
   for(const [key,entry]of entries){if(count<=limit)break;if(!pinned(entry)){this.drop(key);count--;}}
  }
 }
}
export const viewResidency=new ViewResidency();
if(typeof window!=='undefined'){
 setInterval(()=>viewResidency.sweep(),30000);
 window.addEventListener('proteus:resource-preferences',event=>viewResidency.configure(event.detail));
}
