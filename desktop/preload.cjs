const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktop', {
  credentials: value => ipcRenderer.invoke('proteus:credentials', value),
  copyText: text => ipcRenderer.invoke('proteus:copy-text', text),
  choosePaths: options => ipcRenderer.invoke('proteus:choose-paths', options),
  openPath: file => ipcRenderer.invoke('proteus:open-path', file),
  browser: value => ipcRenderer.invoke('proteus:browser', value),
  onAddressFocus: handler => { const listener = () => handler(); ipcRenderer.on('proteus:focus-address', listener); return () => ipcRenderer.removeListener('proteus:focus-address', listener); },
  onBrowserState: handler => { const listener = (_event, value) => handler(value); ipcRenderer.on('proteus:browser-state', listener); return () => ipcRenderer.removeListener('proteus:browser-state', listener); },
  onBrowserResize: handler => { const listener = () => handler(); ipcRenderer.on('proteus:browser-resize', listener); return () => ipcRenderer.removeListener('proteus:browser-resize', listener); }
});
