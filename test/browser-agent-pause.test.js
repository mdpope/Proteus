import {privateTemporaryDirectory} from '../src/private-paths.cjs';
import {assertPrivate} from './helpers/permissions.js';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';
const {BrowserAgentAccess}=createRequire(import.meta.url)('../desktop/browser-agent-access.cjs');
const fixture=t=>{const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-agent-pause-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));return new BrowserAgentAccess(home);};
test('human tabs default unshared; explicit tab pause survives recreation/restart and detects stale resume without affecting other identities',t=>{
 const store=fixture(t);assert.equal(store.paused('logical-tab'),true);store.set('logical-tab',true,0);assert.equal(store.paused('logical-tab'),true);assert.equal(store.paused('other-tab'),true);
 const restored=new BrowserAgentAccess(path.dirname(store.file));assert.equal(restored.paused('logical-tab'),true);assert.throws(()=>restored.set('logical-tab',false,0),/changed/);assert.equal(restored.paused('logical-tab'),true);
 const raw=JSON.parse(fs.readFileSync(store.file));raw.future={keep:true};fs.writeFileSync(store.file,JSON.stringify(raw));restored.set('logical-tab',false,1);assert.deepEqual(JSON.parse(fs.readFileSync(store.file)).future,{keep:true});assert.equal(new BrowserAgentAccess(path.dirname(store.file)).paused('logical-tab'),false);assertPrivate(store.file);
});
test('unreadable pause state fails closed without replacing the original record',t=>{
 const store=fixture(t);fs.writeFileSync(store.file,'invalid original');const bad=new BrowserAgentAccess(path.dirname(store.file));assert.equal(bad.paused('any-tab'),true);assert.throws(()=>bad.set('any-tab',false,0),/preserved/);assert.equal(fs.readFileSync(store.file,'utf8'),'invalid original');
});
