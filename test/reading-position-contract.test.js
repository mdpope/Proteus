import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {normalizePosition,ViewPositions,MAX_VIEW_POSITIONS}=require('../desktop/windows/view-positions.cjs');
test('renderer checkpoint preserves many real scrollports, filters visible overflow and retains state after invalid capture',async t=>{
 const home=privateTemporaryDirectory(path.join(os.tmpdir(),'view-contract-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
 const store=new ViewPositions(home),globals=['window','document','CSS','getComputedStyle'].map(k=>[k,globalThis[k]]);
 t.after(()=>{for(const [k,v]of globals)if(v===undefined)delete globalThis[k];else globalThis[k]=v;});
 globalThis.window={addEventListener(){},desktop:{viewPositions:async v=>v.action==='get'?store.get():store.set(v.key,v.position)}};
 globalThis.document={dispatchEvent(){}};globalThis.CSS={escape:s=>s};
 globalThis.getComputedStyle=n=>({overflowY:n.overflow,overflowX:'auto'});
 const m=await import('../public/shared/navigation/view-position.js');
 assert.equal(m.MAX_VIEW_POSITIONS,MAX_VIEW_POSITIONS);
 await m.initializeViewPositions();
 const node=(id,overflow='auto')=>({id,overflow,scrollHeight:100,clientHeight:50,scrollWidth:50,clientWidth:50,scrollTop:0,scrollLeft:0,dataset:{},children:[],querySelectorAll:()=>[],getBoundingClientRect:()=>({top:0,bottom:50}),matches:()=>false,dispatchEvent(){},addEventListener(){},removeEventListener(){}});
 const root=node('root'),children=Array.from({length:40},(_,i)=>node('scroll-'+i));
 const visible=Array.from({length:100},(_,i)=>node('layout-'+i,'visible'));
 root.children=[...children,...visible];for(const child of root.children)child.parentElement=root;
 root.querySelectorAll=q=>q==='*'?root.children:[];root.querySelector=q=>root.children.find(n=>'#'+n.id===q);
 for(let i=0;i<children.length;i++)children[i].scrollTop=i;
 children[0].id='x'.repeat(3000);children[1].overflow='visible';children[1].scrollHeight=50;children[1].scrollWidth=200;children[1].scrollTop=0;children[1].scrollLeft=17;
 m.rememberView(root,'test-view');await m.flushViewPositions();
 const saved=store.get()[0][1];assert.equal(saved.length,41);assert.equal(saved[1][0],'0');assert.equal(saved[2][1].left,17);
 for(const child of children)child.scrollTop=0;
 m.restoreView(root,'test-view');assert.equal(children[39].scrollTop,39);
 const bytes=fs.readFileSync(store.file);
 for(const bad of [NaN,Infinity,100_000_000]){children[2].scrollTop=bad;assert.throws(()=>m.rememberView(root,'test-view'),/invalid locator or offset/);assert.deepEqual(fs.readFileSync(store.file),bytes);}
 children[2].scrollTop=2;
 root.children=Array.from({length:256},(_,i)=>node('extra-'+i));
 assert.throws(()=>m.rememberView(root,'test-view'),/capacity exceeded/);assert.deepEqual(fs.readFileSync(store.file),bytes);
});
test('owner rejects oversized locators, invalid offsets and capacity without replacing saved positions',t=>{
 const home=privateTemporaryDirectory(path.join(os.tmpdir(),'view-owner-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
 const store=new ViewPositions(home),valid=Array.from({length:80},(_,i)=>['#s'+i,{top:i,left:0}]);
 store.set('view',valid);const bytes=fs.readFileSync(store.file);
 for(const value of [[['x'.repeat(2049),{top:0,left:0}]],[['root',{top:NaN,left:0}]],[['root',{top:0,left:-100_000_000}]],Array.from({length:257},()=>valid[0]),[null]]) {
  assert.throws(()=>store.set('view',value));assert.deepEqual(fs.readFileSync(store.file),bytes);
 }
 assert.equal(new ViewPositions(home).get()[0][1].length,80);
 assert.equal(normalizePosition(valid).length,80);
});
