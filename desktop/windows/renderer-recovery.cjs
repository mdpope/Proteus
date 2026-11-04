const path=require('node:path');
// Only the app shell is reloaded. This controller never owns the runner, turns,
// native page lifetimes, terminal sessions, or the saved workspace records.
class RendererRecovery{
 constructor(window,{url,prepare=()=>{},log=()=>{},closing=()=>false,delays=[250,1000,3000],timeout=30000,stable=60000,startupReport=120000}={}){
  Object.assign(this,{window,url,prepare,log,closing,delays,timeout,stable});this.generation=0;this.attempts=0;this.restoring=false;this.stopped=false;
  window.webContents.on('render-process-gone',(_event,details)=>{if(details.reason!=='clean-exit')this.failed(details.reason,details.exitCode);});
  window.webContents.on('did-fail-load',(_event,code,_description,_url,main)=>{if(main&&code!==-3&&this.restoring)this.failed('load-failed',code);});
  window.webContents.on('unresponsive',()=>{if(this.available())this.report('unresponsive');});
  window.on('closed',()=>this.dispose());
  // A window that never reports ready has no session saves or owner sync. This
  // records it for diagnosis; recovery itself belongs to the renderer's explicit UI.
  this.startupTimer=setTimeout(()=>{if(this.available())this.report('startup-not-ready');},startupReport);this.startupTimer.unref?.();
 }
 available(){return !this.stopped&&!this.closing()&&!this.window.isDestroyed()&&!this.window.webContents.isDestroyed();}
 report(reason,exitCode){try{this.log({reason:String(reason).slice(0,80),...(Number.isInteger(exitCode)?{exitCode}:{}),attempt:this.attempts,generation:this.generation});}catch{/* Logging cannot stop recovery. */}}
 clear(){clearTimeout(this.timer);clearTimeout(this.deadline);clearTimeout(this.reset);this.timer=this.deadline=this.reset=null;}
 failed(reason,exitCode){
  if(!this.available())return;this.report(reason,exitCode);if(this.timer||this.fallback)return;
  this.clear();this.restoring=true;this.generation++;
  try{this.prepare();}catch(error){this.report('prepare-failed');}
  if(this.attempts>=this.delays.length){this.fallback=true;const generation=this.generation;this.timer=setTimeout(()=>{this.timer=null;if(!this.available()||generation!==this.generation)return;void this.window.webContents.loadFile(path.join(__dirname,'renderer-recovery.html')).catch(()=>this.report('recovery-page-failed'));},0);this.timer.unref?.();return;}
  const generation=this.generation,delay=this.delays[this.attempts++];
  // Never navigate synchronously inside Chromium's renderer teardown callback.
  this.timer=setTimeout(()=>{this.timer=null;if(!this.available()||generation!==this.generation)return;
   this.deadline=setTimeout(()=>this.failed('ready-timeout'),this.timeout);this.deadline.unref?.();
   void this.window.loadURL(this.url).catch(error=>{if(generation===this.generation&&error.code!=='ERR_ABORTED'&&error.errno!==-3)this.failed('reload-failed',error.errno);});
  },delay);this.timer.unref?.();
 }
 reload(){if(!this.available())return;this.clear();this.fallback=false;this.attempts=0;this.failed('manual-reload');}
 ready(generation){
  clearTimeout(this.startupTimer);this.startupTimer=null;
  if(!this.available()||generation!==this.generation||this.fallback)return false;
  if(this.restoring)this.report('recovered');
  clearTimeout(this.deadline);this.deadline=null;this.restoring=false;
  clearTimeout(this.reset);this.reset=setTimeout(()=>{this.attempts=0;},this.stable);this.reset.unref?.();return true;
 }
 dispose(){this.stopped=true;this.generation++;this.clear();clearTimeout(this.startupTimer);}
}
module.exports={RendererRecovery};
