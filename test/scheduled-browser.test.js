import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{agentWindow}=require('../desktop/windows/agent-origin.cjs'),{agentViewport,ensureAgentViewport,releaseAgentViewport}=require('../desktop/browser/agent-viewport.cjs');
const ctx=(id,tabs=[])=>({id,window:{isDestroyed:()=>false},session:{get:()=>({tabs})}});
test('scheduled owner allocation is deterministic and sticky without using global focus',()=>{
 const contexts=[ctx('secondary'),ctx('main')],base={contexts,origin:{client:'mobile'},runId:'run',scheduled:true};
 assert.equal(agentWindow({...base,currentId:'secondary'}).id,'main');
 assert.equal(agentWindow({...base,allocatedWindowId:'secondary',currentId:'main'}).id,'secondary');
 assert.equal(agentWindow({...base,allocatedWindowId:'closed'}).id,'main');
 assert.equal(agentWindow({...base,explicitWindowId:'secondary'}).id,'secondary');
 assert.throws(()=>agentWindow({...base,explicitWindowId:'closed'}),/closed/);
 assert.throws(()=>agentWindow({...base,scheduled:false}),/No owner window/);
 assert.throws(()=>agentWindow({...base,contexts:[]}),/No owner window/);
 const matching=ctx('project',[{id:'project:local:target'}]);
 assert.equal(agentWindow({...base,contexts:[...contexts,matching],parentId:'project:local:target'}).id,'project');
});
test('hidden viewport fallback rejects invalid geometry and respects native content bounds',()=>{
 const content={width:1200,height:800};
 assert.deepEqual(agentViewport({x:0,y:0,width:0,height:0},content),{x:0,y:0,...content});
 const valid={x:200,y:100,width:800,height:650};assert.deepEqual(agentViewport(valid,content),valid);
 for(const bounds of [{...valid,x:1000},{...valid,height:Infinity},{...valid,x:-1}])assert.deepEqual(agentViewport(bounds,content),{x:0,y:0,...content});
 assert.throws(()=>agentViewport(valid,{width:0,height:0}),/no usable viewport/);
});
test('background layout is stable, invalidates old captures and returns to native metrics on selection',async()=>{
 let bounds={x:0,y:0,width:0,height:0},emulated=0,cleared=0;
 const wc={executeJavaScript:async()=>({width:bounds.width,height:bounds.height}),enableDeviceEmulation:value=>{emulated++;assert.equal(value.screenPosition,'desktop');assert.equal(value.deviceScaleFactor,0);},disableDeviceEmulation:()=>cleared++,isDestroyed:()=>false};
 const tab={view:{webContents:wc,getBounds:()=>bounds,setBounds:value=>bounds=value,getVisible:()=>false}};
 const browser={window:{getContentBounds:()=>({width:1000,height:700})},bounds:{x:0,y:0,width:0,height:0}};
 await ensureAgentViewport(browser,tab);assert.deepEqual(bounds,{x:0,y:0,width:1000,height:700});assert.equal(emulated,1);const revision=tab.captureRevision;
 await ensureAgentViewport(browser,tab);assert.equal(emulated,1);assert.equal(tab.captureRevision,revision);
 releaseAgentViewport(tab);assert.equal(cleared,1);assert.equal(tab.agentViewport,null);assert.ok(tab.captureRevision>revision);
 releaseAgentViewport(tab);assert.equal(cleared,1);
});
