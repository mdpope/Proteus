const {ipcRenderer,contextBridge}=require('electron');
const channel='proteus:browser-page-menu';
contextBridge.exposeInMainWorld('pageMenu',{
 choose:id=>ipcRenderer.send(channel,{action:'choose',id}),
 scale:direction=>ipcRenderer.send(channel,{action:'scale',direction}),
 close:()=>ipcRenderer.send(channel,{action:'close'}),
 onUpdate:callback=>ipcRenderer.on(channel,(_event,value)=>callback(value))
});
