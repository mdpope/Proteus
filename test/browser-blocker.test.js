import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const {BrowserBlocker}=require('../desktop/browser-blocker.cjs');const {ElectronBlocker}=require('@ghostery/adblocker-electron');
test('filter refresh coalesces, activates only after atomic cache replacement, retains prior filters on failure',async()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-filter-update-')),original=ElectronBlocker.fromPrebuiltAdsAndTracking;let release,calls=0;
 const engine={serialize:()=>new Uint8Array([1,2,3]),onBeforeRequest(_details,callback){callback({cancel:true});}};
 try{ElectronBlocker.fromPrebuiltAdsAndTracking=async()=>{calls++;await new Promise(resolve=>release=resolve);return engine;};const blocker=new BrowserBlocker(home),first=blocker.update(),second=blocker.update();assert.equal(calls,1);assert.equal(blocker.status().updating,true);release();await Promise.all([first,second]);assert.equal(blocker.engine,engine);assert.equal(blocker.status().updating,false);assert.ok(blocker.status().updatedAt);const saved=fs.readFileSync(blocker.file);let decision;blocker.before({},value=>decision=value);assert.deepEqual(decision,{cancel:true});ElectronBlocker.fromPrebuiltAdsAndTracking=async()=>{throw new Error('Synthetic offline');};await assert.rejects(blocker.update(),/offline/);assert.deepEqual(fs.readFileSync(blocker.file),saved);assert.equal(blocker.engine,engine);assert.equal(blocker.status().ready,true);assert.match(blocker.status().error,/offline/);
 }finally{ElectronBlocker.fromPrebuiltAdsAndTracking=original;fs.rmSync(home,{recursive:true,force:true});}
});

test('cosmetic scriptlets isolate proxy helpers, deduplicate identical injections and reset on document generation',async()=>{
 const {default:vm}=await import('node:vm'),home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-scriptlet-isolation-')),blocker=new BrowserBlocker(home);
 const script='function proxyApplyFn(){};proxyApplyFn.nativeToString=Function.prototype.toString;Function.prototype.toString=new Proxy(Function.prototype.toString,{apply:function(target,self){return proxyApplyFn.nativeToString.call(self)}});';
 try{
  const broken=vm.createContext({});vm.runInContext(script,broken);vm.runInContext(script,broken);assert.throws(()=>vm.runInContext('String(function synthetic(){})',broken),/Maximum call stack/);
  let context=vm.createContext({}),calls=0;const sender={async insertCSS(){},async executeJavaScript(code){calls++;vm.runInContext(code,context);}};blocker.engine={getCosmeticsFilters:()=>({active:true,styles:'',scripts:[script,script]})};
  await blocker.inject({sender},'https://x.com/',undefined,{revision:1});assert.match(vm.runInContext('String(function synthetic(){})',context),/synthetic/);assert.equal(calls,1);
  await blocker.inject({sender},'https://x.com/',undefined,{revision:1});assert.equal(calls,1);
  context=vm.createContext({});await blocker.inject({sender},'https://x.com/',undefined,{revision:2});assert.equal(calls,2);assert.match(vm.runInContext('String(function synthetic(){})',context),/synthetic/);
 }finally{fs.rmSync(home,{recursive:true,force:true});}
});
