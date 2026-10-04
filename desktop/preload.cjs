const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktop', {
  lifeAccount: value => ipcRenderer.invoke('proteus:life-account', value),
  peers: value => ipcRenderer.invoke('proteus:desktop-peers', value),
  onPeer: handler => { const listener = (_event, value) => handler(value); ipcRenderer.on('proteus:desktop-peer-event', listener); return () => ipcRenderer.removeListener('proteus:desktop-peer-event', listener); },
  terminal: value => ipcRenderer.invoke('proteus:terminal', value),
  onTerminal: handler => { const listener = (_event, value) => handler(value); ipcRenderer.on('proteus:terminal-event', listener); return () => ipcRenderer.removeListener('proteus:terminal-event', listener); },
  workspaceSession: value => ipcRenderer.invoke('proteus:workspace-session', value),
  onShutdown: handler => { const listener = () => handler(); ipcRenderer.on('proteus:shutdown', listener); return () => ipcRenderer.removeListener('proteus:shutdown', listener); },
  onRemote: handler => { const listener = () => handler(); ipcRenderer.on('proteus:remote', listener); return () => ipcRenderer.removeListener('proteus:remote', listener); },
  standupPopout: width => ipcRenderer.invoke('proteus:standup-popout', width),
  credentials: value => ipcRenderer.invoke('proteus:credentials', value),
  copyText: text => ipcRenderer.invoke('proteus:copy-text', text),
  choosePaths: options => ipcRenderer.invoke('proteus:choose-paths', options),
  openPath: file => ipcRenderer.invoke('proteus:open-path', file),
  browser: value => ipcRenderer.invoke('proteus:browser', value),
  onAddressFocus: handler => { const listener = () => handler(); ipcRenderer.on('proteus:focus-address', listener); return () => ipcRenderer.removeListener('proteus:focus-address', listener); },
  onBrowserState: handler => { const listener = (_event, value) => handler(value); ipcRenderer.on('proteus:browser-state', listener); return () => ipcRenderer.removeListener('proteus:browser-state', listener); },
  onBrowserResize: handler => { const listener = () => handler(); ipcRenderer.on('proteus:browser-resize', listener); return () => ipcRenderer.removeListener('proteus:browser-resize', listener); }
});
