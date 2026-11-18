import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {ReminderReplica,createReminderSync} from '../../../public/models/reminder-replica.js';

export function desktopReminderReplica(home,api){
 fs.mkdirSync(home,{recursive:true,mode:0o700});const file=path.join(home,'reminders.sqlite'),db=new DatabaseSync(file);fs.chmodSync(file,0o600);
 const replica=new ReminderReplica({exec:sql=>db.exec(sql),run:(sql,args=[])=>db.prepare(sql).run(...args),rows:(sql,args=[])=>db.prepare(sql).all(...args)});
 const current=()=>{const i=api.identity();return i?JSON.stringify([i.origin,i.accountId,i.workspaceId]):null;};
 const sync=createReminderSync({replica,current,request:query=>api.data('reminders',query)});
 return {...sync,cached:()=>!!current()&&!!replica.meta(current()),clear(){const binding=current();if(binding)replica.clear(binding);},close(){db.close();}};
}
