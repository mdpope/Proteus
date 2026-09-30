const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktop', {
  openPath: file => ipcRenderer.invoke('proteus:open-path', file),
  openBrowser: value => ipcRenderer.invoke('proteus:open-browser', value),
  hideBrowser: () => ipcRenderer.invoke('proteus:hide-browser')
});
