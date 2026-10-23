// A short rolling window excludes paused time and never treats total bytes as speed.
class DownloadSpeed {
 constructor(now=()=>performance.now()){this.now=now;this.samples=[];}
 reset(bytes=0){this.samples=[[this.now(),bytes]];}
 update(bytes){const now=this.now();if(!this.samples.length||bytes<this.samples.at(-1)[1])this.reset(bytes);else this.samples.push([now,bytes]);while(this.samples.length>2&&this.samples[1][0]<now-3000)this.samples.shift();}
 value(){const now=this.now(),first=this.samples[0],last=this.samples.at(-1);if(!first||!last||now-last[0]>2000)return 0;const elapsed=Math.max(now,last[0])-first[0];return elapsed>=200?Math.max(0,(last[1]-first[1])*1000/elapsed):0;}
}
module.exports={DownloadSpeed};
