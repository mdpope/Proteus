import test from 'node:test';
import assert from 'node:assert/strict';
import {ScratchEditor} from '../public/models/scratch-editor.js';
const record={id:'one',revision:'v1',title:'Draft',body:'First',category:'',format:'markdown'};
test('typing coalesces into one revision-protected save and unchanged flush does not write',async()=>{
 const calls=[],editor=new ScratchEditor(record,{request:async value=>{calls.push(value);return {...record,revision:'v2'};}});
 editor.edit({body:'Second'});editor.edit({body:'Third'});await editor.flush();await editor.flush();
 assert.equal(calls.length,1);assert.equal(calls[0].body,'Third');assert.equal(calls[0].expectedRevision,'v1');assert.equal(editor.dirty,false);
});
test('typing during an in-flight save follows its acknowledged revision',async()=>{
 let finish;const calls=[],editor=new ScratchEditor(record,{request:async value=>{calls.push(value);if(calls.length===1)await new Promise(resolve=>finish=resolve);return {...record,revision:'v'+(calls.length+1)};}});
 editor.edit({body:'Second'});const work=editor.flush();editor.edit({body:'While saving'});await Promise.resolve();finish();await work;
 assert.equal(calls.length,2);assert.equal(calls[1].expectedRevision,'v2');assert.equal(calls[1].body,'While saving');assert.equal(editor.dirty,false);
});
test('uncertain save freezes operation payload and preserves newer typing until explicit retry',async()=>{
 const calls=[];let fail=true;const editor=new ScratchEditor(record,{request:async value=>{calls.push(structuredClone(value));if(fail)throw Error('Disconnected');return {...record,revision:'v'+calls.length};}});
 editor.edit({body:'Submitted'});await assert.rejects(editor.flush(),/Disconnected/);editor.edit({body:'Newer draft'});
 await assert.rejects(editor.flush(),/Disconnected/);assert.equal(calls.length,1);fail=false;await editor.flush({retry:true});
 assert.deepEqual(calls[1],calls[0]);assert.notEqual(calls[2].operationId,calls[0].operationId);assert.equal(calls[2].body,'Newer draft');assert.equal(editor.dirty,false);
});
test('restored stale draft requires review and never automatically overwrites newer content',async()=>{
 let writes=0;const saved={id:'one',revision:'v0',value:{...record,body:'Unsaved'}};
 const editor=new ScratchEditor(record,{saved,request:async()=>{writes++;return record;}});
 assert.equal(editor.value.body,'Unsaved');await assert.rejects(editor.flush(),/older file version/);assert.equal(writes,0);
});
