// Registered for every website frame, before page scripts. No host API is exposed.
const {contextBridge,ipcRenderer}=require('electron');
function apply(blocked){contextBridge.executeInMainWorld({func:enabled=>{
 const key=Symbol.for('proteus.video-autoplay');
 if(window[key]){window[key].enabled=enabled;return;}
 const policy={enabled};Object.defineProperty(window,key,{value:policy});
 const permitted=media=>!policy.enabled||media.tagName!=='VIDEO'||navigator.userActivation.hasBeenActive;
 const original=HTMLMediaElement.prototype.play;
 HTMLMediaElement.prototype.play=function(...args){if(!permitted(this))return Promise.reject(new DOMException('Video autoplay is blocked in Proteus. Press Play to start the video.','NotAllowedError'));return original.apply(this,args);};
 // Covers declarative autoplay, including muted players that Chromium otherwise allows.
 document.addEventListener('play',event=>{if(event.target instanceof HTMLMediaElement&&!permitted(event.target))event.target.pause();},true);
 },args:[blocked]});}
apply(process.argv.includes('--proteus-block-video-autoplay'));
ipcRenderer.on('proteus:video-autoplay',(_event,blocked)=>apply(blocked===true));

// Trusted physical activity wakes only this player’s host-owned pop-out controls.
let lastVideoActivity=0;window.addEventListener("pointermove",event=>{if(event.isTrusted&&document.fullscreenElement&&Date.now()-lastVideoActivity>300){lastVideoActivity=Date.now();ipcRenderer.send("proteus:video-activity");}},{passive:true});
