import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {EventEmitter} from 'node:events';

function fixture(){
 class Window extends EventEmitter{
  constructor(options={}){super();this.options=options;this.visible=!!options.show;this.focused=false;this.minimized=false;this.raises=0;this.webContents=new EventEmitter();Object.assign(this.webContents,{setWindowOpenHandler(){},send(){},isDestroyed:()=>false});}
  loadFile(){return Promise.resolve();}isDestroyed(){return false;}isVisible(){return this.visible;}isMinimized(){return this.minimized;}isFocused(){return this.focused;}
  showInactive(){this.visible=true;this.raises++;}hide(){this.visible=false;}setBounds(){}getContentBounds(){return{x:0,y:0,width:1000,height:800};}
 }
 const deferred=[],timers=[],ipcMain=new EventEmitter(),module={exports:{}};
 const context={module,__dirname:path.resolve('desktop/features/notifications'),require:name=>name==='electron'?{BrowserWindow:Window,ipcMain}:path,setImmediate:fn=>deferred.push(fn),clearTimeout(){},setTimeout:fn=>{timers.push(fn);return{unref(){}};}};
 vm.runInNewContext(fs.readFileSync('desktop/features/notifications/notice-window.cjs','utf8'),context);
 const parent=new Window({show:true}),notice=new module.exports.NoticeWindow(parent);
 return{parent,notice,flush:()=>{while(deferred.length)deferred.shift()();},expire:()=>timers.at(-1)()};
}

test('background notice never raises its parent, and only an explicit foreground return reveals an unexpired notice',async()=>{
 const {parent,notice,flush,expire}=fixture();
 await notice.show({id:'one',message:'Synthetic completion',actions:['Open chat']});
 assert.equal(notice.window.raises,0);assert.equal(notice.window.visible,false);
 parent.emit('show');assert.equal(notice.window.raises,0,'Visibility alone is not foreground activation');
 parent.focused=true;parent.emit('focus');assert.equal(notice.window.visible,true);assert.equal(notice.window.raises,1);
 await notice.show({id:'two',message:'Another completion',actions:[]});assert.equal(notice.window.raises,1,'Updating a visible notice does not reorder windows');
 parent.focused=false;notice.window.focused=true;parent.emit('blur');flush();assert.equal(notice.window.visible,true,'Notice actions remain keyboard accessible');
 notice.window.focused=false;notice.window.emit('blur');flush();assert.equal(notice.window.visible,false,'Leaving the app hides its overlay');
 expire();parent.focused=true;parent.emit('focus');assert.equal(notice.window.visible,false,'Expired background notices never resurface');
});
