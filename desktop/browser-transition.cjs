const { WebContentsView } = require('electron');
const { loadURLWithTimeout } = require('./navigation.cjs');
const bounded = (promise,ms) => {let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Page transition timed out.')),ms);})]).finally(()=>clearTimeout(timer));};
// Screenshots live only in this isolated, temporary native view. They are never
// injected into the remote page (which could expose cross-origin iframe pixels).
class PageSlide {
  constructor(window, source, bounds) {this.window=window;this.source=source;this.bounds=bounds;this.cancelled=false;this.view=null;}
  cancel() {this.cancelled=true;const view=this.view;this.view=null;if(view){if(!this.window.isDestroyed())this.window.contentView.removeChildView(view);if(!view.webContents.isDestroyed())view.webContents.close();}}
  async play(direction, navigate, valid) {
    let navigated=false;
    const go=()=>{if(!this.cancelled&&valid()&&!navigated){navigated=true;navigate();}};
    try {
      const snapshot=await bounded(this.source.capturePage(),500);
      if(this.cancelled||!valid())return;
      const view=this.view=new WebContentsView({webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,webSecurity:true,partition:'proteus-gesture-overlay',backgroundThrottling:false}});
      view.setBackgroundColor('#00000000');view.setBounds(this.bounds);view.setVisible(false);
      view.webContents.setWindowOpenHandler(()=>({action:'deny'}));
      view.webContents.on('will-navigate',event=>event.preventDefault());
      this.window.contentView.addChildView(view);
      const html='<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data:; style-src \'unsafe-inline\'"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:transparent}img{width:100%;height:100%;object-fit:fill;box-shadow:0 0 30px #0006;will-change:transform}</style><img alt="" src="'+snapshot.toDataURL()+'">';
      await loadURLWithTimeout(view.webContents,'data:text/html;charset=utf-8,'+encodeURIComponent(html),800);
      if(this.cancelled||!valid())return;
      view.setVisible(true);go();
      // Briefly retain the outgoing frame while the new page starts painting.
      await new Promise(resolve=>setTimeout(resolve,60));
      if(this.cancelled||view.webContents.isDestroyed())return;
      const end=direction==='back'?100:-100;
      await bounded(view.webContents.executeJavaScript(`(async()=>{const image=document.querySelector('img');if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;await image.animate([{transform:'translateX(0)'},{transform:'translateX(${end}%)'}],{duration:320,easing:'cubic-bezier(.22,.75,.22,1)',fill:'forwards'}).finished;})()`),700);
    } catch(error) {this.failure=error?.name||'TransitionError';go();} finally {this.cancel();}
  }
}
module.exports={PageSlide};
