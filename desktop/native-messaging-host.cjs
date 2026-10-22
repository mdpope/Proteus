// Replacement for the pinned adapter's native pipe lifecycle. No vault payloads
// are logged. The extension receives one disconnect and one-shot calls settle.
const fs=require('node:fs');
function createNativeMessagingHost({readConfig,spawn,timeoutMs=30000}) {
 return class NativeMessagingHost {
  constructor(extensionId,sender,connectionId,application,keepAlive=true){
   Object.assign(this,{extensionId,sender,connectionId,keepAlive,connected:false,closed:false,pending:[],pendingBytes:0,buffer:Buffer.alloc(0)});
   this.receiveExtensionMessage=(_event,message)=>this.send(message);
   this.senderClosed=()=>this.destroy();sender.once?.('destroyed',this.senderClosed);
   if(keepAlive)sender.ipc.on(`crx-native-msg-${connectionId}`,this.receiveExtensionMessage);
   this.timer=setTimeout(()=>this.destroy(new Error('Native host did not connect in time.')),timeoutMs);this.timer.unref?.();
   this.ready=this.launch(application,extensionId).catch(()=>this.destroy(new Error('Native host could not start.')));
  }
  destroy(error){
   if(this.closed)return;this.closed=true;this.connected=false;this.failure=error||new Error('Native host disconnected.');
   clearTimeout(this.timer);clearTimeout(this.responseTimer);this.pending=[];this.pendingBytes=0;this.buffer=Buffer.alloc(0);
   const child=this.process;this.process=null;if(child)try{child.kill();}catch{}
   const sender=this.sender;this.sender=null;
   sender?.off?.('destroyed',this.senderClosed);
   if(this.keepAlive&&sender){sender.ipc.off(`crx-native-msg-${this.connectionId}`,this.receiveExtensionMessage);try{sender.send(`crx-native-msg-${this.connectionId}-disconnect`);}catch{}}
   try{this.onClosed?.(error);}catch{}this.rejectResponse?.(this.failure);this.rejectResponse=null;this.resolveResponse=null;
  }
  async launch(application,extensionId){
   const config=await readConfig(application);if(this.closed)return;
   if(!config?.allowed_origins?.includes(`chrome-extension://${extensionId}/`)||!config.path||!fs.statSync(config.path).isFile())return this.destroy(new Error('Native host unavailable or extension origin denied.'));
   const child=spawn(config.path,[`chrome-extension://${extensionId}/`],{shell:false});this.process=child;
   const failed=()=>this.destroy(new Error('Native host connection closed. Check the desktop application and retry.'));
   // Keep error listeners attached even after destroy: delayed pipe errors must
   // never escape into Electron's main process.
   child.on('error',failed);child.on('exit',failed);
   for(const stream of [child.stdin,child.stdout,child.stderr])stream.on('error',failed);
   child.stdout.on('data',data=>this.receive(data));child.stderr.on('data',()=>{});
   child.stdin.on('drain',()=>this.flush());
   this.connected=true;clearTimeout(this.timer);this.flush();
  }
  receive(data){
   if(this.closed)return;
   try{
    this.buffer=Buffer.concat([this.buffer,data]);
    while(this.buffer.length>=4){
     const size=this.buffer.readUInt32LE(0);if(size>1024*1024)throw Error('Native message exceeds 1 MB.');
     if(this.buffer.length<size+4)return;
     const message=JSON.parse(this.buffer.subarray(4,size+4).toString('utf8'));this.buffer=this.buffer.subarray(size+4);
     if(this.keepAlive)this.sender.send(`crx-native-msg-${this.connectionId}`,message);
     else{const resolve=this.resolveResponse;this.rejectResponse=null;this.resolveResponse=null;resolve?.(message);this.destroy();return;}
    }
   }catch{this.destroy(new Error('Invalid native host response.'));}
  }
  send(json){
   if(this.closed)return;
   try{
    const data=Buffer.from(JSON.stringify(json),'utf8');
    if(data.length>1024*1024||this.pending.length>=64||this.pendingBytes+data.length>4*1024*1024)throw Error('Native message queue exceeded its limit.');
    const frame=Buffer.alloc(4+data.length);frame.writeUInt32LE(data.length);data.copy(frame,4);
    this.pending.push(frame);this.pendingBytes+=frame.length;this.flush();
   }catch(error){this.destroy(error);}
  }
  flush(){
   if(!this.connected||this.closed||this.process?.stdin.writableNeedDrain)return;
   const stream=this.process?.stdin;if(!stream||stream.destroyed||!stream.writable){this.destroy();return;}
   try{while(this.pending.length&&!this.closed){const frame=this.pending.shift();this.pendingBytes-=frame.length;if(!stream.write(frame,error=>{if(error)this.destroy(new Error('Native host pipe closed.'));}))break;}}
   catch{this.destroy(new Error('Native host pipe closed.'));}
  }
  sendAndReceive(message){
   if(this.closed)return Promise.reject(this.failure);
   return new Promise((resolve,reject)=>{this.resolveResponse=resolve;this.rejectResponse=reject;this.responseTimer=setTimeout(()=>this.destroy(new Error('Native host response timed out.')),timeoutMs);this.send(message);});
  }
 };
}
module.exports={createNativeMessagingHost};
