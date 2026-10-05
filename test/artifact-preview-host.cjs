const {app,BrowserWindow}=require('electron');
const {ArtifactPreview}=require('../desktop/artifact-preview.cjs');
globalThis.previewConsole=[];
globalThis.previewPopups=0;
app.on('web-contents-created',(_event,contents)=>{
  contents.on('console-message',(...args)=>globalThis.previewConsole.push(args.map(item=>String(item?.message||item||'')).join(' ')));
  contents.on('did-create-window',()=>globalThis.previewPopups++);
});
app.whenReady().then(async()=>{
  const window=new BrowserWindow({show:false,width:700,height:500,webPreferences:{sandbox:true,nodeIntegration:false,contextIsolation:true}});
  await window.loadURL('data:text/html,<html><body>Preview host</body></html>');
  globalThis.preview=new ArtifactPreview(window);
});
app.on('window-all-closed',()=>app.quit());
