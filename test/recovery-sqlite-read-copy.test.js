import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {DatabaseSync} from 'node:sqlite';
import {tree} from '../desktop/updates/update-package.cjs';
import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import {withSQLiteReadCopy} from '../scripts/recovery-sqlite-read-copy.mjs';

function fixture(t){
 const root=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-recovery-sqlite-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const original=path.join(root,'frozen'),scratch=path.join(root,'scratch');fs.mkdirSync(original);fs.mkdirSync(scratch);
 const file=path.join(original,'history.sqlite'),db=new DatabaseSync(file);db.exec("PRAGMA journal_mode=WAL; CREATE TABLE entries(id TEXT, value TEXT); INSERT INTO entries VALUES('entry','synthetic history');");db.close();
 return {original,scratch,file};
}
test('uncheckpointed WAL contents are read from copies without touching any original sidecar',t=>{
 const f=fixture(t),writer=new DatabaseSync(f.file);
 try{
  writer.exec("PRAGMA wal_autocheckpoint=0; INSERT INTO entries VALUES('wal-entry','synthetic WAL history');");
  assert.ok(fs.statSync(f.file+'-wal').size>0);
  const before=tree(f.original,{entries:true});
  assert.equal(withSQLiteReadCopy(f.file,db=>db.prepare('SELECT count(*) AS count FROM entries').get().count,{temporaryRoot:f.scratch}),2);
  assert.deepEqual(tree(f.original,{entries:true}),before);assert.deepEqual(fs.readdirSync(f.scratch),[]);
 }finally{writer.close();}
});
test('WAL database inspection queries a copy and preserves every original file, mode and hash',t=>{
 const f=fixture(t),before=tree(f.original,{entries:true});
 const value=withSQLiteReadCopy(f.file,db=>db.prepare('SELECT * FROM entries').get(),{temporaryRoot:f.scratch});
 assert.equal(value.id,'entry');assert.equal(value.value,'synthetic history');
 assert.deepEqual(tree(f.original,{entries:true}),before);assert.deepEqual(fs.readdirSync(f.scratch),[]);
});
test('a failed query closes and removes only the disposable copy',t=>{
 const f=fixture(t),before=tree(f.original,{entries:true});
 assert.throws(()=>withSQLiteReadCopy(f.file,db=>db.prepare('SELECT * FROM missing').all(),{temporaryRoot:f.scratch}),/missing/);
 assert.deepEqual(tree(f.original,{entries:true}),before);assert.deepEqual(fs.readdirSync(f.scratch),[]);
});
test('writes and asynchronous callbacks are refused without changing the frozen recovery',t=>{
 const f=fixture(t),before=tree(f.original,{entries:true});
 assert.throws(()=>withSQLiteReadCopy(f.file,db=>db.exec('DELETE FROM entries'),{temporaryRoot:f.scratch}),/readonly/i);
 assert.throws(()=>withSQLiteReadCopy(f.file,()=>Promise.resolve(),{temporaryRoot:f.scratch}),/synchronous/);
 assert.deepEqual(tree(f.original,{entries:true}),before);assert.deepEqual(fs.readdirSync(f.scratch),[]);
});
