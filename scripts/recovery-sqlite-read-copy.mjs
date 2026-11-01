import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';

const suffixes=['','-wal','-shm','-journal'];
function snapshot(database){
 return suffixes.flatMap(suffix=>{
  const file=database+suffix;if(!fs.existsSync(file))return [];
  const stat=fs.lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink())throw Error('SQLite verification requires ordinary files.');
  const hash=createHash('sha256'),fd=fs.openSync(file,'r'),buffer=Buffer.allocUnsafe(1024*1024);
  try{for(let size;(size=fs.readSync(fd,buffer,0,buffer.length,null))>0;)hash.update(buffer.subarray(0,size));}finally{fs.closeSync(fd);}
  return [{suffix,bytes:stat.size,mode:stat.mode&0o777,sha256:hash.digest('hex')}];
 });
}

/** SQLite readOnly can write WAL/SHM beside the database. Never connect to a
 * recovery original: preserve its opaque files and query a disposable copy.
 * This helper grants no file authority; callers retain their ordinary scope. */
export function withSQLiteReadCopy(database,read,{temporaryRoot=os.tmpdir()}={}){
 if(!path.isAbsolute(database)||fs.realpathSync(database)!==path.resolve(database)||typeof read!=='function')throw Error('Choose a canonical database and a synchronous read callback.');
 const before=snapshot(database);if(!before.some(row=>row.suffix===''))throw Error('The source database is unavailable.');
 const directory=privateTemporaryDirectory(path.join(temporaryRoot,'proteus-sqlite-read-')),copy=path.join(directory,'snapshot.sqlite');let db;
 try{
  for(const row of before)fs.copyFileSync(database+row.suffix,copy+row.suffix,fs.constants.COPYFILE_EXCL);
  const contents=rows=>rows.map(({mode,...row})=>row);
  if(JSON.stringify(snapshot(database))!==JSON.stringify(before)||JSON.stringify(contents(snapshot(copy)))!==JSON.stringify(contents(before)))throw Error('The source changed while preparing its read copy. Preserve it and retry after activity settles.');
  db=new DatabaseSync(copy,{readOnly:true});db.exec('PRAGMA query_only=ON');
  const result=read(db);if(result&&typeof result.then==='function')throw Error('The SQLite read callback must be synchronous.');
  return result;
 }finally{
  try{db?.close();}finally{
   fs.rmSync(directory,{recursive:true,force:true,maxRetries:10,retryDelay:100});
   if(JSON.stringify(snapshot(database))!==JSON.stringify(before))throw Error('The original SQLite snapshot changed during verification. Keep its recovery receipts for inspection.');
  }
 }
}
