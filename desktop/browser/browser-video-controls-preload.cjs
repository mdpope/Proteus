const {ipcRenderer}=require('electron');
window.addEventListener('DOMContentLoaded',()=>{
 let timer;const wake=()=>{document.body.classList.add('awake');clearTimeout(timer);timer=setTimeout(()=>{if(!document.querySelector('button:focus-visible'))document.body.classList.remove('awake');},2200);};
 document.querySelector('button').addEventListener('click',event=>{if(event.isTrusted)ipcRenderer.send('proteus:video-popout-close');});
 window.addEventListener('pointermove',wake);window.addEventListener('focusin',wake);window.addEventListener('keydown',event=>{if(event.key==='Escape')ipcRenderer.send('proteus:video-popout-close');else wake();});
 ipcRenderer.on('proteus:video-popout-wake',wake);wake();
});
