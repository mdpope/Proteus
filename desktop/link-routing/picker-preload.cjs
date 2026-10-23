const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('linkPicker',{
  on:callback=>ipcRenderer.on('proteus:link-picker',(_event,value)=>callback(value)),
  choose:value=>ipcRenderer.send('proteus:link-picker-choice',value)
});
