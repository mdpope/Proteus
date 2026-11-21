const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('captureChoice',{
 onSources:handler=>ipcRenderer.once('proteus:screen-share-sources',(_event,value)=>handler(value)),
 select:value=>ipcRenderer.send('proteus:screen-share-choice',value),
});
