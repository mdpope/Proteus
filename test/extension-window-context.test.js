import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {installExtensionWindowContext}=createRequire(import.meta.url)('../desktop/browser/extension-window-context.cjs');

test('extension sender and last-focused windows differ while both retain active tabs',()=>{
 const first={id:1,isDestroyed:()=>false},second={id:2,isDestroyed:()=>false};
 const a={id:10},b={id:20},c={id:21},popup={};
 const tabToWindow=new Map([[a,first],[b,second],[c,second]]),active=new Map([[first,a],[second,b]]);
 const cache=new Map([[10,{id:10,windowId:1,active:true}],[20,{id:20,windowId:2,active:true}],[21,{id:21,windowId:2,active:false}]]);
 const store={windows:new Set([first,second]),tabToWindow,tabDetailsCache:cache,windowDetailsCache:new Map(),getLastFocusedWindow:()=>second,getWindowById:id=>[first,second].find(w=>w.id===id),getTabById:id=>[a,b,c].find(t=>t.id===id),getActiveTabFromWebContents:tab=>active.get(tabToWindow.get(tab))};
 const handlers=new Map(['tabs.query','windows.getCurrent','windows.create','windows.remove','browserAction.openPopup'].map(name=>[name,{callback:()=>{}}]));
 handlers.get('tabs.query').callback=(_event,info)=>[...cache.values()].filter(t=>(info.active===undefined||t.active===info.active)&&(info.windowId===undefined||t.windowId===info.windowId));
 const api={windows:{createWindowDetails:w=>({id:w.id}),getWindowDetails:w=>({id:w.id})},tabs:{onActivated:id=>{const tab=store.getTabById(id);active.set(tabToWindow.get(tab),tab);for(const row of cache.values())row.active=row.id===id;}}};
 installExtensionWindowContext({adapter:{ctx:{store,router:{handlers}},api}},{ownerForPopup:sender=>sender===popup?first:null,windowForSender:()=>null,createWindow:()=>{},openPopup:()=>{}});
 const event={sender:popup};
 assert.equal(handlers.get('windows.getCurrent').callback(event).id,1);
 assert.deepEqual(handlers.get('tabs.query').callback(event,{active:true,currentWindow:true}).map(t=>t.id),[10]);
 assert.deepEqual(handlers.get('tabs.query').callback(event,{active:true,lastFocusedWindow:true}).map(t=>t.id),[20]);
 assert.deepEqual(handlers.get('tabs.query').callback(event,{active:true,windowId:-2}).map(t=>t.id),[10]);
 api.tabs.onActivated(21);
 assert.deepEqual(handlers.get('tabs.query').callback(event,{active:true}).map(t=>t.id),[10,21]);
 assert.deepEqual(handlers.get('tabs.query').callback(event,{active:true,lastFocusedWindow:true}).map(t=>t.id),[21]);
});
