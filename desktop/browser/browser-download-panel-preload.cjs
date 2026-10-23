const {contextBridge,ipcRenderer}=require('electron'),channel='proteus:downloads-panel';
contextBridge.exposeInMainWorld('downloadsPanel',{act:(action,id)=>ipcRenderer.send(channel,{action,id}),onUpdate:callback=>ipcRenderer.on(channel,(_event,value)=>callback(value))});
