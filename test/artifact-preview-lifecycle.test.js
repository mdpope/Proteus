import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {EventEmitter} from 'node:events';
import vm from 'node:vm';

const deferred=()=>{let resolve;const promise=new Promise(done=>resolve=done);return {promise,resolve};};
function fixture(){
 const views=[],children=new Set(),starts=[];
 class View{constructor(){views.push(this);this.load=deferred();this.webContents=new EventEmitter();Object.assign(this.webContents,{setWindowOpenHandler(){},loadURL:()=>this.load.promise,executeJavaScript:async()=>true,isDestroyed:()=>!!this.closed,close:()=>{this.closed=true;this.webContents.emit('destroyed');}});}setBounds(){}setVisible(){}}
 class Scroll{constructor(){this.starting=deferred();starts.push(this);}start(){return this.starting.promise;}async dispose(){this.closed=true;}async apply(){return true;}}
 const partition={setPermissionRequestHandler(){},setPermissionCheckHandler(){},webRequest:{onBeforeRequest(){}},on(){}};
 const window={contentView:{addChildView:view=>children.add(view),removeChildView:view=>children.delete(view)},getContentBounds:()=>({width:800,height:600}),isDestroyed:()=>false,webContents:{send(){}}};
 const module={exports:{}};vm.runInNewContext(readFileSync(new URL('../desktop/documents/artifact-preview.cjs',import.meta.url),'utf8'),{require:name=>name==='electron'?{WebContentsView:View,session:{fromPartition:()=>partition}}:name==='node:crypto'?{createHash,randomUUID}:{ArtifactScroll:Scroll},module,Buffer});
 const preview=new module.exports.ArtifactPreview(window),data=html=>({html,version:createHash('sha256').update(html).digest('hex'),tabId:'document',bounds:{x:0,y:0,width:600,height:400}});
 return {preview,views,children,starts,data};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('simultaneous artifact show requests create only the latest viewer',async()=>{
 const {preview,views,children,data}=fixture(),first=preview.show(data('first')),second=preview.show({...data('second'),tabId:undefined});await tick();assert.equal(views.length,1);views[0].load.resolve();await Promise.all([first,second]);assert.equal(children.size,1);assert.equal(preview.version,data('second').version);await preview.hide();assert.equal(children.size,0);assert.ok(views.every(view=>view.closed));
});
test('show then hide before creation does not attach a late viewer',async()=>{
 const {preview,views,children,data}=fixture(),show=preview.show(data('first'));await preview.hide();assert.equal((await show).scrollAvailable,false);assert.equal(views.length,0);assert.equal(children.size,0);
});
test('replacing an artifact during load closes its view and cannot publish stale readiness',async()=>{
 const {preview,views,children,data}=fixture(),first=preview.show(data('first'));await tick();const old=views[0],second=preview.show({...data('second'),tabId:undefined});await tick();assert.equal(old.closed,true);assert.equal(children.size,1);old.load.resolve();views[1].load.resolve();assert.equal((await first).scrollAvailable,false);await second;assert.equal(preview.view,views[1]);await preview.hide();assert.ok(views.every(view=>view.closed));
});
test('same-key readiness and pending observer installation are invalidated by hide',async()=>{
 const {preview,views,children,starts,data}=fixture(),request=data('approved'),first=preview.show(request);await tick();views[0].load.resolve();await tick();assert.equal(starts.length,1);const same=preview.show(request);await preview.hide();assert.equal(starts[0].closed,true);starts[0].starting.resolve(true);assert.equal((await first).scrollAvailable,false);assert.equal((await same).scrollAvailable,false);assert.equal(children.size,0);assert.equal(views[0].closed,true);
});
