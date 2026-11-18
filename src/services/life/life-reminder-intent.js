import {reminderOperationId} from './reminder-tools.js';

export class ReminderConfirmationPending extends Error {}
export class ReminderClarification extends Error {}

import {reminderDue} from '../../../public/features/tools/reminder-dates.js';
export {reminderDue};
const markdown=value=>String(value).replace(/[\\\x60*_[\]<>]/g,'\\$&');
/** Match spoken workspace/project names to exactly one known destination, never guessing. */
export function resolveScope(scopes,{workspaceName='',projectName=''}={}){
 const same=(a,b)=>String(a||'').trim().toLowerCase()===String(b||'').trim().toLowerCase(),workspace=String(workspaceName||'').trim(),project=String(projectName||'').trim();
 if(!workspace&&!project)return {};
 const workspaces=scopes?.workspaces||[],projects=scopes?.projects||[];
 let candidates=workspace?workspaces.filter(row=>same(row.name,workspace)):workspaces;
 if(workspace&&candidates.length!==1)throw new ReminderClarification(candidates.length?'Which workspace named '+workspace+' should I use?':'I could not find a workspace named '+workspace+'.');
 if(!project)return {workspaceId:candidates[0].id,projectId:null};
 const owned=new Set(candidates.map(row=>row.id)),matches=projects.filter(row=>same(row.name,project)&&owned.has(row.workspaceId));
 if(matches.length!==1)throw new ReminderClarification(matches.length?'Which project named '+project+' should I use? Name its workspace too.':'I could not find a project named '+project+(workspace?' in '+workspace:'')+'.');
 return {workspaceId:matches[0].workspaceId,projectId:matches[0].id};
}
export class LifeReminderIntent{
 constructor(life,scopes=()=>({workspaces:[],projects:[]})){this.life=life;this.scopes=scopes;}
 async context(receipt){
  const identity={...this.life.api.identity()};
  if(identity.accountId!==receipt.accountID)throw Error('Life account changed.');
  const value=await this.life.data('reminders');this.life.api.assertIdentity(identity);
  return {identity,timeZone:value.timeZone,lists:value.lists,scopes:this.scopes(),captureStartedAt:receipt.times.captureStartedAt};
 }
 async commit(receipt,result,context){
  const current={...this.life.api.identity()};
  if(!context||['accountId','workspaceId','origin'].some(key=>current[key]!==context.identity[key]))throw Error('Life reminder account changed.');
  context={...context,identity:current};
  this.life.api.assertIdentity(context.identity);
  if(context.identity.accountId!==receipt.accountID||result.professional!==false)throw Error('Life reminder account or personal scope changed.');
  const value=result.reminder;if(!value?.title?.trim())throw new ReminderClarification('What should I remind you to do?');
  let due;try{due=reminderDue(value,receipt.times.captureStartedAt,context.timeZone);}catch(error){throw new ReminderClarification(error.message);}
  const name=(value.listName||'Inbox').trim(),matches=context.lists.filter(x=>x.name.toLowerCase()===name.toLowerCase());
  if(matches.length!==1)throw new ReminderClarification('Which existing reminder list should I use?');
  const scope=resolveScope(context.scopes,value);
  let response;
  try{response=await this.life.action('reminders.create',{title:value.title,notes:value.notes||'',listId:matches[0].id,...scope,...due},reminderOperationId(receipt.requestId),context.identity);}
  catch(error){
   // The immutable operation ID reconciles a lost response with the original
   // server commit. Never publish a contradictory failure while it is uncertain.
   if([404,409,422].includes(error.status))throw new ReminderClarification('The reminder was not saved. '+error.message);
   throw new ReminderConfirmationPending('Waiting to confirm the reminder with Life.');
  }
  this.life.api.assertIdentity(context.identity);
  const r=response.record,link=new URL('/life/reminders',context.identity.origin);link.searchParams.set('id',r.id);
  const when=r.dueKind==='date'?'due **'+r.dueDate+'**. This is date-only; no timed alert was scheduled.':r.dueKind==='datetime'?'due **'+new Intl.DateTimeFormat('en-US',{timeZone:r.timeZone,dateStyle:'full',timeStyle:'short'}).format(new Date(r.dueAt))+' ('+r.timeZone+')**. A due alert is scheduled.':'with no due date. No due alert was scheduled.';
  return {...result,reminder:r,confirmation:response.confirmation,savedPath:null,destination:{kind:'reminder',accountId:receipt.accountID,reminderId:r.id},answer:'Saved **'+markdown(r.title)+'** in **'+markdown(matches[0].name)+'**, '+when+' [Open reminder]('+link.href+')'};
 }
}
