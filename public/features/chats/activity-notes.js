import {groupActivity,isActivityEvent} from './tool-presentation.js';

// Display saved status events with tools without changing their journal or the
// provider's replay history. Assistant prose, including commentary, stays inline.
export function activityNote(entry,run){
 if(entry.data?.question||entry.data?.agentFeedback||entry.data?.tool||entry.data?.permission||entry.streaming)return null;
 if(run.schedule?.provider==='mtplx'&&entry.role==='system'&&entry.text==='MTPLX is thinking.')return {kind:'thinking',label:'Thinking notice',source:'MTPLX · adapter status notice'};
 return null;
}

export function activityEntries(entries,run){
 const projected=entries.map(entry=>{const note=activityNote(entry,run);return note?{...entry,data:{...entry.data,activityNote:note}}:entry;});
 return groupActivity(projected,entry=>isActivityEvent(entry)||!!entry.data?.activityNote);
}
