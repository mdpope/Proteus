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

// Only physical gestures in the detached player can move/resize its host window.
// Never expose IPC to page scripts, and leave player buttons/sliders usable.
let popout=false,drag=null,gestureFrame=null,pendingGesture=null,suppressClick=false;
const sendGesture=value=>ipcRenderer.send('proteus:video-window-gesture',value);
const flushGesture=()=>{gestureFrame=null;if(pendingGesture){sendGesture(pendingGesture);pendingGesture=null;}};
const queueGesture=value=>{if(value.action==='pinch'&&pendingGesture?.action==='pinch')value.factor=Math.max(.5,Math.min(2,pendingGesture.factor*value.factor));pendingGesture=value;if(gestureFrame===null)gestureFrame=requestAnimationFrame(flushGesture);};
const resetGesture=()=>{drag=null;suppressClick=false;pendingGesture=null;cancelAnimationFrame(gestureFrame);gestureFrame=null;};
ipcRenderer.on('proteus:video-popout-state',(_event,active)=>{popout=active===true;resetGesture();});
function playerSurface(event){
 if(!popout||!document.fullscreenElement||!event.isTrusted)return false;
 const target=event.composedPath().find(node=>node instanceof Element);if(!target||target.closest('button,input,select,textarea,a,[role="button"],[role="slider"],[contenteditable="true"]'))return false;
 // Native video controls are closed UA shadow DOM; retain their bottom hit area.
 if(target instanceof HTMLVideoElement&&target.controls&&event.clientY>target.getBoundingClientRect().bottom-56)return false;
 return true;
}
window.addEventListener('pointerdown',event=>{if(event.button!==0||!playerSurface(event))return;drag={id:event.pointerId,x:event.screenX,y:event.screenY,started:false,target:event.target};suppressClick=false;sendGesture({action:'drag-start',x:event.screenX,y:event.screenY});},true);
window.addEventListener('pointermove',event=>{if(!event.isTrusted||!drag||event.pointerId!==drag.id)return;if(!(event.buttons&1)){sendGesture({action:'drag-end'});resetGesture();return;}if(!drag.started&&Math.hypot(event.screenX-drag.x,event.screenY-drag.y)<5)return;drag.started=true;suppressClick=true;event.preventDefault();event.stopImmediatePropagation();try{drag.target.setPointerCapture(event.pointerId);}catch{}queueGesture({action:'drag',x:event.screenX,y:event.screenY});},{capture:true,passive:false});
window.addEventListener('pointerup',event=>{if(!event.isTrusted||!drag)return;if(drag.started){event.preventDefault();event.stopImmediatePropagation();flushGesture();}sendGesture({action:'drag-end'});drag=null;},true);
window.addEventListener('click',event=>{if(event.isTrusted&&suppressClick){suppressClick=false;event.preventDefault();event.stopImmediatePropagation();}},true);
window.addEventListener('wheel',event=>{if(!popout||!document.fullscreenElement||!event.isTrusted||!event.ctrlKey||!Number.isFinite(event.deltaY))return;event.preventDefault();event.stopImmediatePropagation();queueGesture({action:'pinch',factor:Math.max(.5,Math.min(2,Math.exp(-event.deltaY*.005)))});},{capture:true,passive:false});
window.addEventListener('pointercancel',()=>{sendGesture({action:'drag-end'});resetGesture();});
window.addEventListener('blur',resetGesture);window.addEventListener('pagehide',()=>{popout=false;resetGesture();});
