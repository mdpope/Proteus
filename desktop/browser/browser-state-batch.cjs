// Browser event bursts describe one current owner state. Coalesce projections,
// never mutations, so sharing/revocation and direct tool reads remain immediate.
class BrowserStateBatch {
 constructor(flush,{delay=16,setTimer=setTimeout,clearTimer=clearTimeout}={}){Object.assign(this,{flush,delay,setTimer,clearTimer});this.timer=null;this.closed=false;}
 request(){if(this.closed||this.timer!==null)return;this.timer=this.setTimer(()=>{this.timer=null;if(!this.closed)this.flush();},this.delay);this.timer?.unref?.();}
 close(){this.closed=true;if(this.timer!==null)this.clearTimer(this.timer);this.timer=null;}
}
module.exports={BrowserStateBatch};
