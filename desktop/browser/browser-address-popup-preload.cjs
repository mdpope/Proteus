const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('addressPopup',{choose:index=>ipcRenderer.send('proteus:address-choice',index),onUpdate:handler=>ipcRenderer.on('proteus:address-update',(_event,value)=>handler(value))});
