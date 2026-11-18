import initSQLite from 'sql.js';
import wasm from 'sql.js/dist/sql-wasm.wasm?url';
import {ReminderReplica} from '../../../public/models/reminder-replica.js';
const sqlite=initSQLite({locateFile:()=>wasm});
const database=new Promise((resolve,reject)=>{const request=indexedDB.open('proteus-life-reminders-sqlite',1);request.onupgradeneeded=()=>request.result.createObjectStore('accounts');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
// A read-write IndexedDB transaction serializes SQLite snapshots across browser
// tabs. Reload inside that transaction so a slower tab cannot erase newer data.
self.onmessage=async({data:{id,binding,action,page,query}})=>{
 try{const [SQL,index]=await Promise.all([sqlite,database]);const value=await new Promise((resolve,reject)=>{
  const tx=index.transaction('accounts',action==='read'||action==='meta'?'readonly':'readwrite'),store=tx.objectStore('accounts'),request=store.get(binding);let result;
  tx.oncomplete=()=>resolve(result);tx.onabort=tx.onerror=()=>reject(tx.error||Error('Reminder cache unavailable.'));
  request.onsuccess=()=>{const db=new SQL.Database(request.result),replica=new ReminderReplica({exec:sql=>db.run(sql),run:(sql,args=[])=>db.run(sql,args),rows:(sql,args=[])=>{const statement=db.prepare(sql);try{statement.bind(args);const rows=[];while(statement.step())rows.push(statement.getAsObject());return rows;}finally{statement.free();}}});
   try{if(action==='apply'){const previous=replica.meta(binding);if((!previous||page.cursor>=previous.cursor)&&replica.apply(binding,page))store.put(db.export(),binding);result=true;}
    else if(action==='clear'){store.delete(binding);result=true;}
    else if(action==='meta')result=replica.meta(binding);
    else result=replica.read(binding,query,false);
   }catch(error){tx.abort();reject(error);}finally{db.close();}
  };
 });self.postMessage({id,value});}catch(error){self.postMessage({id,error:error.message,status:error.status});}
};
