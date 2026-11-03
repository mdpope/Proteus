import {remoteTransportLimits as limits} from './remote-transport.js';

// One bounded, ordered writer per host socket. Congestion belongs to a client;
// it must never close the shared host connection or replay an accepted command.
export class RemoteOutbound {
  constructor(socket,{reject=()=>{},sent=()=>{},congested=()=>{},clock=()=>Date.now()}={}) {
    Object.assign(this,{socket,reject,sent,congested,clock});this.queue=[];this.bytes=0;this.history=[];this.closed=false;this.writing=false;this.inflightBytes=0;
  }
  enqueue(peer,payload) {
    if(this.closed||this.socket.readyState!==1)return false;
    const bytes=Buffer.byteLength(payload);
    if(bytes>limits.packetBytes||this.bytes+this.inflightBytes+bytes>limits.queuedSendBytes||this.queue.length>=limits.hostWindowPackets) {
      this.congested(this.bytes+this.inflightBytes+bytes);this.remove(peer.id);this.reject(peer);
      return false;
    }
    this.queue.push({peer:peer.id,payload,bytes});this.bytes+=bytes;clearTimeout(this.timer);this.timer=null;this.pump();return true;
  }
  control(payload) {
    const bytes=Buffer.byteLength(payload);
    if(this.closed||bytes>256||this.queue.filter(row=>row.control).length>=64)return false;
    this.queue.unshift({peer:'relay-control',payload,bytes,control:true});this.bytes+=bytes;clearTimeout(this.timer);this.timer=null;this.pump();return true;
  }
  remove(id){this.queue=this.queue.filter(row=>{if(row.peer!==id)return true;this.bytes-=row.bytes;return false;});}
  pump() {
    if(this.closed||this.writing||this.timer||!this.queue.length)return;
    if(this.socket.readyState!==1){this.stop();return;}
    const now=this.clock();this.history=this.history.filter(x=>now-x.at<limits.windowMs);
    const total=this.history.reduce((n,x)=>n+x.bytes,0),usage=new Map();
    for(const item of this.history){const value=usage.get(item.peer)||{bytes:0,packets:0};value.bytes+=item.bytes;value.packets++;usage.set(item.peer,value);}
    const seen=new Set();
    const index=this.queue.findIndex(row=>{
      if(seen.has(row.peer))return false;seen.add(row.peer);
      const client=usage.get(row.peer)||{bytes:0,packets:0};
      return this.socket.bufferedAmount+row.bytes<=limits.bufferedBytes&&total+row.bytes<=limits.hostWindowBytes&&client.bytes+row.bytes<=limits.clientWindowBytes&&this.history.length<limits.hostWindowPackets&&client.packets<limits.hostWindowPackets;
    });
    if(index<0){const bufferBlocked=this.queue.some(row=>this.socket.bufferedAmount+row.bytes>limits.bufferedBytes),delay=bufferBlocked?25:Math.max(1,(this.history[0]?.at??now)+limits.windowMs-now);this.timer=setTimeout(()=>{this.timer=null;this.pump();},delay);this.timer.unref?.();return;}
    const [row]=this.queue.splice(index,1);
    this.bytes-=row.bytes;this.writing=true;this.inflightBytes=row.bytes;this.history.push({at:now,peer:row.peer,bytes:row.bytes});this.sent(row.bytes,this.socket.bufferedAmount+row.bytes);
    try{this.socket.send(row.payload,error=>{this.writing=false;this.inflightBytes=0;if(error){this.stop();return;}this.pump();});}catch{this.stop();}
  }
  stop(){this.closed=true;clearTimeout(this.timer);this.timer=null;this.queue=[];this.bytes=0;this.history=[];}
}
