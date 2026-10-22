// OS-opened websites are human tabs; they never carry chat/agent ownership.
function webURL(raw) {
  if(typeof raw!=='string'||raw.length>32768||/[\u0000-\u0020\u007f]/.test(raw))return null;
  try {const url=new URL(raw);return ['http:','https:'].includes(url.protocol)&&url.hostname&&!url.username&&!url.password?url.href:null;}catch{return null;}
}
class ExternalURLs {
  constructor({target,open,onError}){this.target=target;this.open=open;this.onError=onError;this.queue=[];this.running=false;this.revision=0;}
  receive(raw){const url=webURL(raw);if(!url)return false;if(this.queue.length>=64){this.onError(new Error('Too many incoming website links. Open the remaining links again.'));return true;}this.queue.push(url);this.drain();return true;}
  async drain(){this.revision++;if(this.running)return;this.running=true;let revision;
    try{while(this.queue.length){revision=this.revision;const target=await this.target();if(!target)break;const url=this.queue.shift();try{await this.open(target,url);}catch(error){this.onError(error);}}}
    catch(error){this.onError(error);}
    finally{this.running=false;if(this.queue.length&&revision!==this.revision)void this.drain();}
  }
}
module.exports={webURL,ExternalURLs};
