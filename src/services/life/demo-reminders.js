import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {atomicJSON,readJSON} from '../../shared/files.js';

// Explicitly synthetic, retained only inside the isolated demo home. This is
// not the canonical Life service and is never loaded by production composition.
export function demoReminders(file){
 const lists=['Inbox','Personal','Work','Groceries','Ideas & reading'].map((name,index)=>({id:'demo-list-'+index,name,revision:1}));
 const titles=['Plan a weekend outside','Pick up coffee and fresh fruit','Review the new navigation','Read a chapter tonight','A place for the next good idea'];
 const data=readJSON(file,{lists,items:titles.map((title,index)=>({id:randomUUID(),title,listId:lists[index].id,notes:index===2?'Synthetic demo item. Opening and completing are separate actions.':'',dueKind:index<3?'date':'none',dueDate:index<3?new Date(Date.now()+(index-1)*86400000).toISOString().slice(0,10):null,dueAt:null,timeZone:null,revision:1,createdAt:new Date().toISOString(),completedAt:null,deletedAt:null})),operations:{}});
 const save=()=>atomicJSON(file,data);if(!fs.existsSync(file))save();
 const identity={accountId:'demo-life',workspaceId:'demo',displayName:'Demo Life account',capabilities:[],readOnly:false};
 return {identity,read(query={}){
  if(query.since!==undefined)return {...identity,identity,cursor:[...data.lists,...data.items].reduce((sum,row)=>sum+(row.revision||1),0),hasMore:false,inboxId:data.lists[0].id,timeZone:'America/Denver',changes:[...data.lists.map(record=>({kind:'list',record})),...data.items.map(record=>({kind:'reminder',record}))]};
  let rows=data.items.filter(row=>!!row.deletedAt===!!query.deleted&&(!query.listId||row.listId===query.listId)&&(query.completed==='all'||(query.completed==='completed'?!!row.completedAt:!row.completedAt)));
  rows.sort((a,b)=>String(query.sort==='title'?a.title:query.sort==='list'?a.listId:query.sort==='created'?a.createdAt:a.dueDate||'9999').localeCompare(String(query.sort==='title'?b.title:query.sort==='list'?b.listId:query.sort==='created'?b.createdAt:b.dueDate||'9999')));
  return {...identity,identity,items:rows,lists:data.lists,inboxId:data.lists[0].id,timeZone:'America/Denver',total:rows.length,page:1,...(query.id?{record:data.items.find(row=>row.id===query.id)}:{})};
 },write(action,input,operation){
  const digest=JSON.stringify([action,input]);if(data.operations[operation]){if(data.operations[operation].digest!==digest)throw Error('Demo operation conflict.');return data.operations[operation].result;}
  const list=action.startsWith('list.'),rows=list?data.lists:data.items;let record=rows.find(row=>row.id===input.id);
  if(action.endsWith('create')){record={id:randomUUID(),revision:1,...(!list?{createdAt:new Date().toISOString(),completedAt:null,deletedAt:null}:{}),...input};rows.push(record);}
  else {if(!record||record.revision!==input.expectedRevision)throw Error('Demo revision changed.');Object.assign(record,input,{revision:record.revision+1});if(action==='complete')record.completedAt=new Date().toISOString();if(action==='reopen')record.completedAt=null;if(action==='delete')record.deletedAt=new Date().toISOString();if(action==='restore')record.deletedAt=null;if(action==='list.delete'){for(const row of data.items)if(row.listId===record.id)row.listId=data.lists[0].id;data.lists=data.lists.filter(row=>row.id!==record.id);}}
  const result={...identity,record:structuredClone(record)};data.operations[operation]={digest,result};save();return result;
 }};
}
