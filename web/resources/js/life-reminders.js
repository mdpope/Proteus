import {browserReminderReplica} from './reminder-replica.js';
import {mountReminders} from '../../../public/features/tools/life-reminders.js';
import {featureResources} from './feature-resources.js';
const host=document.querySelector('#life-reminders');
if(host){
 let identity=null;
 async function request(path,body){
  const response=await fetch('/life/api/'+path,{method:'POST',headers:{'Accept':'application/json','Content-Type':'application/json','X-Proteus-Account':document.body.dataset.browserAccount,'X-CSRF-TOKEN':document.querySelector('meta[name="csrf-token"]').content},body:JSON.stringify(body),cache:'no-store',redirect:'error'});
  const value=await response.json();if(!response.ok)throw Object.assign(Error(value.message||'Life is unavailable.'),{status:response.status});
  if(identity&&(identity.accountId!==value.accountId||identity.workspaceId!==value.workspaceId))throw Error('Life account changed. Reload this page.');
  identity??={accountId:value.accountId,workspaceId:value.workspaceId};return value;
 }
 const cache=browserReminderReplica({binding:location.origin+':'+document.body.dataset.browserAccount,request:query=>request('data',{section:'reminders',query})});
 document.querySelector('form[action$="/logout"]')?.addEventListener('submit',()=>void cache.clear());
 const resources=featureResources(host,'reminders');
 mountReminders(host,{contentTabs:resources,onOpenRecord:(id,listId)=>resources.openRecord('reminder',id,listId),selectedId:new URL(location.href).searchParams.get('id'),read:query=>cache.read(query),write:async(action,input,idempotencyKey)=>{const result=await request('action',{action:'reminders.'+action,input,idempotencyKey,expectedAccountId:identity.accountId,expectedWorkspaceId:identity.workspaceId});cache.invalidate();return result;}});
}
