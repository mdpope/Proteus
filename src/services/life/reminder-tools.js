import {createHash} from 'node:crypto';
export const reminderActions=['list','get','sync','create','update','complete','reopen','delete','restore','list.create','list.update','list.delete'];
export function reminderTools(handle,runId){
 if(!handle)return [];
 return [{
  name:'proteus_reminders',defer:'never',
  description:'Built-in tool for Life Reminders. Call list first for accountId, list IDs, timezone and revisions. Use list.create with input.name for a list, or create with input.title and an observed input.listId for a reminder. For existing records use the observed id and current expectedRevision. Writes require the current accountId and a stable UUID operationId. After uncertain delivery, reconcile and preserve the original operationId and input if retrying. Verify the returned record or read it back before reporting success. Deleting a list moves its items to Inbox. Date-only dueDate has no time or alert. Timed dueAt is ISO8601 with offset and IANA timeZone. Clarify ambiguous dates. Ordinary tool permissions apply.',
  parameters:{
   type:'object',
   properties:{
    action:{type:'string',enum:reminderActions},accountId:{type:'string'},operationId:{type:'string'},id:{type:'string'},expectedRevision:{type:'integer'},
    input:{type:'object',properties:{
     title:{type:'string'},notes:{type:'string'},name:{type:'string'},listId:{type:'string'},workspaceId:{type:['string','null']},projectId:{type:['string','null']},
     dueKind:{type:'string',enum:['none','date','datetime']},
     dueDate:{type:['string','null']},dueAt:{type:['string','null']},timeZone:{type:['string','null']}
    }},
    query:{type:'object',properties:{
     listId:{type:'string'},workspaceId:{type:'string'},projectId:{type:'string'},search:{type:'string'},completed:{type:'string',enum:['all','open','completed']},
     sort:{type:'string',enum:['due','created','list','title']},page:{type:'integer'},since:{type:'integer'},deleted:{type:'boolean'}
    }}
   },
   required:['action'],additionalProperties:false
  },
  handler:async args=>JSON.stringify(await handle(args,runId))
 }];
}
export async function reminderCommand(life,args,run){
 const identity={...life.api.identity()};
 if(!identity.accountId)throw Error('Sign in to Life before using reminders.');
 if(run?.schedule?.lifeAsk?.accountID&&run.schedule.lifeAsk.accountID!==identity.accountId)throw Error('This Life Ask chat belongs to another account.');
 const check=()=>life.api.assertIdentity(identity);check();
 if(['list','get','sync'].includes(args.action)){
  if(args.accountId&&args.accountId!==identity.accountId)throw Error('The Life account changed.');
  if(args.action==='get'&&!args.id)throw Error('Choose a reminder ID.');
  const value=await life.data('reminders',{...args.query,...(args.action==='get'?{id:args.id}:{})});check();return value;
 }
 if(!reminderActions.includes(args.action)||args.accountId!==identity.accountId)throw Error('List reminders and supply the current accountId before writing.');
 if(!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(args.operationId||''))throw Error('A stable UUID operationId is required.');
 const value=await life.action('reminders.'+args.action,{...args.input,...(args.id?{id:args.id,expectedRevision:args.expectedRevision}:{})},args.operationId,identity);check();return value;
}
export function reminderOperationId(requestId){
 const h=createHash('sha256').update('life.reminder:'+requestId).digest('hex');
 return h.slice(0,8)+'-'+h.slice(8,12)+'-5'+h.slice(13,16)+'-a'+h.slice(17,20)+'-'+h.slice(20,32);
}
