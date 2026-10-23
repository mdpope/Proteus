import {assertPrivate} from './helpers/permissions.js';
import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {EventEmitter} from 'node:events';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);

function fixture(t,{write=fs.promises.writeFile}={}){
  const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-cookie-async-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
  const cookies=new EventEmitter();let rows=[],reads=0;
  cookies.get=async()=>{reads++;return structuredClone(rows);};cookies.set=async item=>{rows.push({...item,domain:new URL(item.url).hostname,session:true});};
  const module={exports:{}};
  const safeStorage={isEncryptionAvailable:()=>true,getSelectedStorageBackend:()=> 'keychain',encryptString:value=>Buffer.from(value),decryptString:value=>value.toString()};
  const io={...fs,promises:{...fs.promises,writeFile:write},statSync:()=>{throw new Error('synchronous disk read');},readFileSync:()=>{throw new Error('synchronous disk read');},mkdirSync:()=>{throw new Error('synchronous disk write');},writeFileSync:()=>{throw new Error('synchronous disk write');},renameSync:()=>{throw new Error('synchronous disk write');}};
  vm.runInThisContext('(function(require,module){'+fs.readFileSync(new URL('../desktop/browser/browser-cookie-store.cjs',import.meta.url),'utf8')+'\n})')(name=>name==='electron'?{safeStorage}:name==='node:fs'?io:require(name),module);
  const session={storagePath:path.join(home,'chromium'),cookies};
  const Store=module.exports.BrowserCookieStore,store=new Store(home,session);
  return {home,store,Store,session,cookies,rows:value=>{rows=value;},reads:()=>reads};
}
const cookie=value=>({session:true,domain:'example.test',name:'synthetic',value,path:'/',secure:true,httpOnly:true,hostOnly:true,sameSite:'lax'});

test('cookie snapshot disk I/O yields, serializes overlapping saves and close flushes the latest snapshot',async t=>{
  let release,writes=0;const f=fixture(t,{write:async(...args)=>{writes++;if(writes===1)await new Promise(resolve=>{release=resolve;});return fs.promises.writeFile(...args);}});
  await f.store.ready;f.rows([cookie('first')]);const first=f.store.save();
  while(!release)await new Promise(resolve=>setImmediate(resolve));
  assert.equal(fs.existsSync(f.store.file),false);assert.equal(f.cookies.listenerCount('changed'),1);
  f.rows([cookie('latest')]);const second=f.store.save();await new Promise(resolve=>setImmediate(resolve));assert.equal(writes,1);release();await Promise.all([first,second]);
  assert.equal(writes,2);assert.equal(JSON.parse(fs.readFileSync(f.store.file))[0].value,'latest');assertPrivate(f.store.file,0o600);
  f.rows([cookie('quit')]);f.cookies.emit('changed');await f.store.close();
  assert.equal(f.cookies.listenerCount('changed'),0);assert.equal(JSON.parse(fs.readFileSync(f.store.file))[0].value,'quit');assert.equal(fs.existsSync(f.store.file+'.tmp'),false);
});

test('failed cookie snapshot writes preserve existing encrypted state and retry successfully',async t=>{
  let fail=false;const f=fixture(t,{write:async(...args)=>{if(fail)throw Object.assign(new Error('synthetic disk full'),{code:'ENOSPC'});return fs.promises.writeFile(...args);}});
  await f.store.ready;f.rows([cookie('original')]);await f.store.save();const before=fs.readFileSync(f.store.file);
  fail=true;f.rows([cookie('replacement')]);await assert.rejects(f.store.save(),/disk full/);assert.deepEqual(fs.readFileSync(f.store.file),before);assert.equal(fs.existsSync(f.store.file+'.tmp'),false);
  fail=false;await f.store.close();assert.equal(JSON.parse(fs.readFileSync(f.store.file))[0].value,'replacement');
});

test('async cookie restore keeps existing cookies and restores only missing session values',async t=>{
  const f=fixture(t);await f.store.ready;f.rows([cookie('retained')]);await f.store.save();await f.store.close();
  f.rows([cookie('present')]);const restored=new f.Store(f.home,f.session);await restored.ready;await restored.close();assert.equal(JSON.parse(fs.readFileSync(restored.file))[0].value,'present');
  f.rows([]);const missing=new f.Store(f.home,f.session);await missing.ready;await missing.close();assert.equal(JSON.parse(fs.readFileSync(missing.file))[0].value,'present');
});
