// SQLite is a replica of the Life account's change feed. Writes always commit
// through the server's existing revision/idempotency boundary, never this cache.
export class ReminderReplica {
 constructor(db){this.db=db;db.exec('CREATE TABLE IF NOT EXISTS reminder_records (binding TEXT,kind TEXT,id TEXT,revision INTEGER,json TEXT,PRIMARY KEY(binding,kind,id)); CREATE TABLE IF NOT EXISTS reminder_cursors (binding TEXT PRIMARY KEY,cursor INTEGER,context TEXT);');}
 meta(binding){const row=this.db.rows('SELECT * FROM reminder_cursors WHERE binding=?',[binding])[0];return row?{cursor:row.cursor,context:JSON.parse(row.context)}:null;}
 apply(binding,page){
  if(!Number.isSafeInteger(page.cursor)||page.cursor<0||!Array.isArray(page.changes))throw Error('Invalid reminder change feed.');
  const previous=this.meta(binding);if(previous&&page.cursor<previous.cursor)throw Error('Reminder cursor went backwards.');
  const {changes,hasMore,...context}=page;
  if(previous&&page.cursor===previous.cursor&&!changes.length&&JSON.stringify(previous.context)===JSON.stringify(context))return false;
  this.db.exec('BEGIN');try{
   for(const change of page.changes)this.record(binding,change.kind,change.record);
   this.db.run('INSERT INTO reminder_cursors VALUES(?,?,?) ON CONFLICT(binding) DO UPDATE SET cursor=excluded.cursor,context=excluded.context',[binding,page.cursor,JSON.stringify(context)]);this.db.exec('COMMIT');
  }catch(error){this.db.exec('ROLLBACK');throw error;}
  return true;
 }
 record(binding,kind,record){
  if(!['reminder','list'].includes(kind)||!record?.id||!Number.isSafeInteger(record.revision)||record.revision<1)throw Error('Invalid reminder record.');
  this.db.run('INSERT INTO reminder_records VALUES(?,?,?,?,?) ON CONFLICT(binding,kind,id) DO UPDATE SET revision=excluded.revision,json=excluded.json WHERE excluded.revision>=reminder_records.revision',[binding,kind,record.id,record.revision,JSON.stringify(record)]);
 }
 read(binding,query={},offline=false){
  const meta=this.meta(binding);if(!meta)throw Error('Connect to Life to download reminders first.');
  const all=this.db.rows('SELECT kind,json FROM reminder_records WHERE binding=?',[binding]),lists=all.filter(row=>row.kind==='list').map(row=>JSON.parse(row.json)).filter(row=>!row.deletedAt).sort((a,b)=>Number(!!b.inbox)-Number(!!a.inbox)||a.name.localeCompare(b.name));
  const base={...meta.context,lists,cached:offline,readOnly:offline||meta.context.readOnly===true};
  const records=all.filter(row=>row.kind==='reminder').map(row=>JSON.parse(row.json));
  if(query.id){const record=records.find(row=>row.id===query.id);if(!record)throw Object.assign(Error('Reminder unavailable.'),{status:404});return {...base,record};}
  const key=row=>query.sort==='title'?row.title:query.sort==='list'?lists.find(list=>list.id===row.listId)?.name||'':query.sort==='created'?row.createdAt:row.dueDate||row.dueAt||'9999';
  const rows=records.filter(row=>!!row.deletedAt===!!query.deleted&&(!query.listId||row.listId===query.listId)&&(!query.workspaceId||row.workspaceId===query.workspaceId)&&(!query.projectId||row.projectId===query.projectId)&&(query.completed==='all'||(query.completed==='completed'?!!row.completedAt:!row.completedAt))&&(!query.search||row.title.toLowerCase().includes(query.search.toLowerCase()))).sort((a,b)=>String(key(a)).localeCompare(String(key(b)))||a.id.localeCompare(b.id));
  const page=Math.max(1,Number(query.page)||1);return {...base,items:rows.slice((page-1)*100,page*100),total:rows.length,page};
 }
 clear(binding){this.db.run('DELETE FROM reminder_records WHERE binding=?',[binding]);this.db.run('DELETE FROM reminder_cursors WHERE binding=?',[binding]);}
}

export function createReminderSync({replica,request,current,persist=async()=>{}}){
 let pending=null,last=0,epoch=0;
 async function sync(force=false){
  if(pending)return pending;if(!force&&Date.now()-last<3000)return;
  const binding=current(),started=epoch;if(!binding)throw Error('Sign into Life first.');
  pending=(async()=>{let cursor=replica.meta(binding)?.cursor||0;for(;;){
   const page=await request({since:cursor});if(current()!==binding)throw Error('Life account changed.');
   if(replica.apply(binding,page))await persist();if(!page.hasMore)break;if(page.cursor<=cursor)throw Error('Reminder synchronization made no progress.');cursor=page.cursor;
  }if(started===epoch)last=Date.now();})();try{await pending;}finally{pending=null;}
 }
 return {sync,invalidate(){last=0;epoch++;},async read(query={}){
  if(query.since!==undefined)return request(query);
  const binding=current();let offline=false;
  try{await sync();}catch(error){const network=error.status>=500||['TypeError','AbortError','TimeoutError'].includes(error.name)||/Life website is unreachable|Life request timed out/.test(error.message);if(current()!==binding||!network||!replica.meta(binding))throw error;offline=true;}
  if(current()!==binding)throw Error('Life account changed.');return replica.read(binding,query,offline);
 }};
}
