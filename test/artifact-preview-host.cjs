const {app,BrowserWindow}=require('electron');
const {ArtifactPreview}=require('../desktop/documents/artifact-preview.cjs');
globalThis.previewConsole=[];
globalThis.previewPopups=0;
globalThis.previewScroll=[];
app.on('web-contents-created',(_event,contents)=>{
  contents.on('console-message',(...args)=>globalThis.previewConsole.push(args.map(item=>String(item?.message||item||'')).join(' ')));
  contents.on('did-create-window',()=>globalThis.previewPopups++);
});
app.whenReady().then(async()=>{
  const window=new BrowserWindow({show:false,width:700,height:500,webPreferences:{sandbox:true,nodeIntegration:false,contextIsolation:true}});
  await window.loadURL('data:text/html,<html><body>Preview host</body></html>');
  globalThis.preview=new ArtifactPreview(window);
  globalThis.previewWindow=window;const send=window.webContents.send.bind(window.webContents);window.webContents.send=(channel,...args)=>{if(channel==='proteus:artifact-scroll')globalThis.previewScroll.push(args[0]);return send(channel,...args);};
});
app.on('window-all-closed',()=>app.quit());
