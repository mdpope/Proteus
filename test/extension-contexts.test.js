import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {installExtensionContexts,filterContexts}=createRequire(import.meta.url)('../desktop/browser/extension-contexts.cjs');
test('MV3 contexts follow exact extension/session, document navigation, filters and window lifetime',()=>{
 let callback;const session={isPersistent:()=>true},other={},listeners=new Map();
 const window=(id,owner,partition=session)=>({id,extensionOwnerID:owner,extensionActionPopup:true,isDestroyed:()=>false,getParentWindow:()=>({id:1,isDestroyed:()=>false}),webContents:{id:100+id,session:partition,isDestroyed:()=>false,getURL:()=>`chrome-extension://${owner}/popup.html`,on:(event,fn)=>listeners.set(id+event,fn)}});
 const popup=window(2,'extension-a'),foreign=window(3,'extension-b'),profile=window(4,'extension-a',other),windows=[popup,foreign,profile];
 const host={session,adapter:{ctx:{router:{apiHandler:()=>((name,fn)=>{assert.equal(name,'runtime.getContexts');callback=fn;})}}}};
 installExtensionContexts(host,()=>windows);
 const event={extension:{id:'extension-a'}},first=callback(event,{});
 assert.equal(first.length,1);assert.equal(first[0].contextType,'POPUP');assert.equal(first[0].windowId,1);assert.equal(first[0].tabId,-1);assert.equal(first[0].documentId,undefined);
 assert.equal(callback(event,{contextTypes:['TAB']}).length,0);assert.equal(callback(event,{windowIds:[1]}).length,1);
 assert.equal(callback(event,{contextIds:[first[0].contextId]}).length,1);
 listeners.get('2did-start-navigation')({},'new',false,true);assert.notEqual(callback(event,{})[0].contextId,first[0].contextId);
 popup.isDestroyed=()=>true;assert.deepEqual(callback(event,{}),[]);
 assert.throws(()=>filterContexts([],{contextTypes:'POPUP'}),/Invalid/);assert.throws(()=>filterContexts([],{unknown:[]}),/Invalid/);
});
