const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('notice',{
 on:handler=>ipcRenderer.on('proteus:notice',(_event,value)=>handler(value)),
 action:value=>ipcRenderer.send('proteus:notice-action',value)
});
