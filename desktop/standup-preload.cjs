const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('standup', {
  current: () => ipcRenderer.invoke('proteus:standup-current'),
  close: () => ipcRenderer.invoke('proteus:standup-close')
});
