import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

export const scratchPathMigrationSchema=`
 CREATE TABLE IF NOT EXISTS scratch_path_migration(singleton INTEGER PRIMARY KEY CHECK(singleton=1),intent TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS scratch_path_aliases(former TEXT PRIMARY KEY,current TEXT NOT NULL);`;

function identity(store,relative,kind){
 try{
  const stat=fs.lstatSync(store.file(relative),{bigint:true});
  if(kind==='directory'?!stat.isDirectory():!stat.isFile())throw Error('A Scratchpad migration path changed type.');
  return `${stat.dev}:${stat.ino}`;
 }catch(error){if(error.code==='ENOENT')return null;throw error;}
}

export function planScratchPaths(store){
 if(store.db.prepare("SELECT 1 FROM operations WHERE status='pending' LIMIT 1").get())throw Error('Confirm pending Scratchpad saves before renaming files.');
 const folders=store.db.prepare("SELECT relative,coalesce(project,workspace) AS id FROM directories WHERE relative<>''").all().map(row=>({...row,kind:'directory'}));
 const files=store.db.prepare('SELECT relative,id FROM scratches WHERE deleted=0').all().map(row=>({...row,kind:'file'}));
 const candidates=[...folders,...files].sort((a,b)=>b.relative.split('/').length-a.relative.split('/').length||a.relative.localeCompare(b.relative));
 const changes=[],reserved=[];let missing=0;
 for(const row of candidates){
  const basename=path.posix.basename(row.relative),extension=row.kind==='directory'?'':'.md',suffix='--'+row.id+extension;
  if(!row.id||!basename.endsWith(suffix)||basename.length===suffix.length)continue;
  const sourceIdentity=identity(store,row.relative,row.kind);
  if(!sourceIdentity&&row.kind==='file'){missing++;continue;}
  const parent=path.posix.dirname(row.relative),stem=basename.slice(0,-suffix.length);
  const target=store.availablePath(parent==='.'?'':parent,stem,extension,row.relative,reserved);
  reserved.push(target);changes.push({from:row.relative,to:target,kind:row.kind,sourceIdentity});
 }
 const digest=createHash('sha256').update(JSON.stringify({changes,missing})).digest('hex');
 return {digest,folders:changes.filter(row=>row.kind==='directory').length,files:changes.filter(row=>row.kind==='file').length,missing,changes};
}

// The intent and its inode distinguish a committed filesystem rename from a
// new file that happens to appear at the destination after an interrupted run.
export function recoverScratchPath(store){
 const row=store.db.prepare('SELECT intent FROM scratch_path_migration WHERE singleton=1').get();
 if(!row)return;
 const {from,to,kind,sourceIdentity}=JSON.parse(row.intent);
 const source=identity(store,from,kind),target=identity(store,to,kind);
 if(sourceIdentity&&source===sourceIdentity&&!target){
  const previous=store.file(from),next=store.file(to);
  fs.renameSync(previous,next);
 }else if(sourceIdentity?(source!==null||target!==sourceIdentity):(source!==null||target!==null)){
  throw Error('Scratchpad paths changed during migration. Review the existing names before retrying.');
 }
 if(sourceIdentity){
  if(identity(store,to,kind)!==sourceIdentity||identity(store,from,kind)!==null)throw Error('Scratchpad rename could not be verified.');
  if(process.platform!=='win32'){
   const directory=fs.openSync(path.dirname(store.file(to)),'r');try{fs.fsyncSync(directory);}finally{fs.closeSync(directory);}
  }
 }
 store.db.exec('BEGIN IMMEDIATE');
 try{
  const suffixStart=[...from].length+1,args=[to,suffixStart,from,suffixStart,from+'/'];
  for(const table of ['directories','scratches'])store.db.prepare(`UPDATE ${table} SET relative=?||substr(relative,?) WHERE relative=? OR substr(relative,1,?)=?`).run(...args);
  store.db.prepare('UPDATE scratch_path_aliases SET current=?||substr(current,?) WHERE current=? OR substr(current,1,?)=?').run(...args);
  store.db.prepare('INSERT OR IGNORE INTO scratch_path_aliases(former,current) SELECT ?||substr(former,?),current FROM scratch_path_aliases WHERE substr(former,1,?)=?').run(to,suffixStart,suffixStart,from+'/');
  store.db.prepare('INSERT OR REPLACE INTO scratch_path_aliases(former,current) VALUES(?,?)').run(from,to);
  store.db.prepare('DELETE FROM scratch_path_migration WHERE singleton=1').run();
  store.db.exec('COMMIT');
 }catch(error){store.db.exec('ROLLBACK');throw error;}
}

export function migrateScratchPaths(store,digest){
 recoverScratchPath(store);
 const plan=planScratchPaths(store);
 if(plan.digest!==digest)throw Error('Scratchpad paths changed. Preview the migration again.');
 for(const change of plan.changes){
  if(identity(store,change.from,change.kind)!==change.sourceIdentity||identity(store,change.to,change.kind)!==null)throw Error('A Scratchpad migration path changed. Preview the remaining moves again.');
  store.db.prepare('INSERT INTO scratch_path_migration VALUES(1,?)').run(JSON.stringify(change));recoverScratchPath(store);
 }
 return {folders:plan.folders,files:plan.files,missing:plan.missing};
}

export function resolveMigratedScratchPath(store,relative){
 try{fs.lstatSync(store.file(relative));return relative;}
 catch(error){if(error.code!=='ENOENT')throw error;}
 const alias=store.db.prepare('SELECT former,current FROM scratch_path_aliases WHERE former=? OR substr(?,1,length(former)+1)=former||\'/\' ORDER BY length(former) DESC LIMIT 1').get(relative,relative);
 return alias?alias.current+relative.slice(alias.former.length):relative;
}
