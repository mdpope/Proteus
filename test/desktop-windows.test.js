import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {EventEmitter} from 'node:events';import {createRequire} from 'node:module';
const {WindowRegistry,windowBounds}=createRequire(import.meta.url)('../desktop/windows/windows.cjs');
class Window extends EventEmitter{constructor(bounds){super();this.bounds=bounds;this.webContents={mainFrame:{},send(){}};}isDestroyed(){return false;}getNormalBounds(){return this.bounds;}isFocused(){return false;}}
test('window Quit restores open geometry; explicit Close forgets only that window and retains unknown metadata',async t=>{
 const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-windows-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));const handlers=new Map(),registry=new WindowRegistry(home,{ipcMain:{handle:(key,fn)=>handlers.set(key,fn)}}),other='22222222-2222-4222-8222-222222222222';
 assert.deepEqual(registry.records(),[{id:'main'}]);registry.document.future={keep:true};
 const a=new Window({x:100,y:200,width:1000,height:700}),b=new Window({x:400,y:100,width:900,height:800});registry.attach(a,'main');registry.attach(b,other);
 registry.handle('test',async event=>{await Promise.resolve();return registry.current().id;});
 assert.equal(await handlers.get('test')({sender:b.webContents,senderFrame:b.webContents.mainFrame}),other);
 await assert.rejects(async()=>handlers.get('test')({sender:b.webContents,senderFrame:{}}),/app window/);
 registry.forget('main');registry.contexts.delete('main');registry.prepareQuit();
 const restored=new WindowRegistry(home);assert.equal(restored.records().length,1);assert.equal(restored.records()[0].id,other);assert.deepEqual(restored.records()[0].bounds,b.bounds);assert.deepEqual(restored.document.future,{keep:true});
 const bytes=fs.readFileSync(restored.file);fs.writeFileSync(restored.file,'invalid');assert.throws(()=>new WindowRegistry(home),/preserved/);fs.writeFileSync(restored.file,bytes);
});
test('restored windows remain accessible after a display is removed',()=>{assert.deepEqual(windowBounds({x:-4000,y:9000,width:2000,height:1200},[{x:0,y:0,width:1440,height:900}]),{x:0,y:0,width:1440,height:900});});

test('a closed window callback cannot resolve a sibling context',()=>{const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-window-ownership-'));try{const registry=new WindowRegistry(home),a=new Window({}),b=new Window({});registry.attach(a,'main');registry.attach(b,'22222222-2222-4222-8222-222222222222');registry.run('main',()=>{registry.contexts.delete('main');assert.equal(registry.current(),undefined);assert.equal(registry.proxy().webContents,undefined);});}finally{fs.rmSync(home,{recursive:true,force:true});}});
