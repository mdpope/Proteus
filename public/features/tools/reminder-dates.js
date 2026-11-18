// Resolve wall-clock dates against captured speech, never the retry time.
// Repeated/skipped DST wall times require clarification.
export function reminderDue(value,capturedAt,timeZone){
 const parts=date=>Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(date)).map(x=>[x.type,x.value]));
 const base=parts(capturedAt),baseDate=base.year+'-'+base.month+'-'+base.day;
 let date=value.dueDate||'';
 if(['today','tomorrow'].includes(date)){const d=new Date(baseDate+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+(date==='tomorrow'?1:0));date=d.toISOString().slice(0,10);}
 if(value.dueKind==='none')return {dueKind:'none',dueDate:null,dueAt:null,timeZone:null};
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date+'T12:00:00Z'))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)throw Error('Which date should I use for this reminder?');
 if(value.dueKind==='date')return {dueKind:'date',dueDate:date,dueAt:null,timeZone:null};
 if(value.dueKind!=='datetime'||!/^\d{2}:\d{2}$/.test(value.dueTime||''))throw Error('What time should I use for this reminder?');
 const wall=Date.parse(date+'T'+value.dueTime+':00Z'),matches=[];
 if(Number.isNaN(wall))throw Error('What time should I use for this reminder?');
 for(let offset=-14*60;offset<=14*60;offset+=15){
  const instant=wall+offset*60000,p=parts(instant);
  if(p.year+'-'+p.month+'-'+p.day===date&&p.hour+':'+p.minute===value.dueTime)matches.push(instant);
 }
 if(matches.length!==1)throw Error('That time falls in a daylight-saving transition. Please give an unambiguous time and timezone.');
 return {dueKind:'datetime',dueDate:null,dueAt:new Date(matches[0]).toISOString().replace('.000Z','+00:00'),timeZone};
}

export function reminderWallTime(instant,timeZone){
 if(!instant)return '';
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(instant)).map(x=>[x.type,x.value]));
 return parts.year+'-'+parts.month+'-'+parts.day+'T'+parts.hour+':'+parts.minute;
}
