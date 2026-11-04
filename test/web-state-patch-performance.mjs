// Isolated encrypted synthetic owner. Uses the coordinator's actual state stream,
// shared browser transport, production web worker bridge and chat DOM reconciler.
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {WebSocketServer} from 'ws';
import {RemoteStateStream} from '../src/services/remote/state-stream.js';
import {seal,unseal,secret} from '../src/services/remote/remote-crypto.js';

const moduleText=`export {BrowserRemoteClient as DirectClient,importKey,unseal} from './src/services/remote/remote-client.js';export {BrowserRemoteClient as WorkerClient} from './web/resources/js/worker-remote-client.js';export {acceptRemoteState,coalesceRender} from './web/resources/js/remote-updates.js';export {replaceChatMarkup} from './public/features/chats/chat-dom.js';export {onlyChatIndexChanges} from './web/resources/js/remote-state.js';export {mergeChatHistory} from './public/features/chats/chat-history.js';`;
const bundle=await build({stdin:{contents:moduleText,resolveDir:process.cwd()},bundle:true,write:false,format:'esm'});
const worker=await build({stdin:{contents:`import {BrowserRemoteClient} from './src/services/remote/remote-client.js';const receive=BrowserRemoteClient.prototype.receive;BrowserRemoteClient.prototype.receive=async function(packet){const at=this.benchmarkReceiveStart=performance.now();try{return await receive.call(this,packet);}finally{if(packet.type==='data')postMessage({diagnostic:true,ms:performance.now()-at});}};const emit=BrowserRemoteClient.prototype.event;BrowserRemoteClient.prototype.event=function(type,value){if(type==='change')postMessage({diagnostic:true,decodeMs:performance.now()-this.benchmarkReceiveStart});return emit.call(this,type,value);};import './web/resources/js/remote-transport-worker.js';`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm'});
const key=secret(),hostId='00000000-0000-4000-8000-000000000001',deviceId='00000000-0000-4000-8000-000000000002';
const fixture=()=>({hostName:'Synthetic owner',runs:Array.from({length:500},(_,i)=>({id:'chat-'+i,title:'Synthetic chat '+i,summary:'s'.repeat(3800),progress:{waitingTools:0,stalled:false,lastProgressAt:'0'}})),tabs:Array.from({length:200},(_,i)=>({id:'tab-'+i,url:'https://example.test/'+i})),padding:'p'.repeat(100000)});
const history=Array.from({length:1000},(_,i)=>({id:'event-'+i,role:'assistant',text:('Long streaming conversation '+i+' ').repeat(150)}));
const runPage=tick=>({id:'chat-0',eventCount:1000,eventStart:976,events:history.slice(-24).map((event,index)=>index===23?{...event,text:event.text+' chunk '+tick}:event),progress:{waitingTools:tick,stalled:false,lastProgressAt:String(tick)}});
let active;
const server=createServer((req,res)=>{
 res.setHeader('Content-Type',req.url==='/bench.js'||req.url==='/remote-transport-worker.js'?'text/javascript':'text/html');
 if(req.url==='/bench.js')return res.end(bundle.outputFiles[0].text);
 if(req.url==='/remote-transport-worker.js')return res.end(worker.outputFiles[0].text);
 if(req.url==='/start'){
  assert.ok(active);const owner=active;owner.started=performance.now();owner.measuring=true;
  owner.timer=setInterval(()=>{
   owner.tick++;const now=String(owner.tick*1000);
   owner.state={...owner.state,runs:owner.state.runs.map((run,index)=>index===0?{...run,updatedAt:now,progress:{...run.progress,waitingTools:owner.tick,lastProgressAt:now}}:run)};
   if(owner.mode==='patch')owner.stream.observe(owner.state);else owner.send({type:'event',event:'state',data:owner.state,cursor:'synthetic:'+owner.tick});
   // The visible run watch is delivered each second, independent of state batching.
   owner.send({type:'event',event:'run',runId:'chat-0',data:runPage(owner.tick),cursor:'synthetic:'+owner.tick});
   if(owner.tick===12)clearInterval(owner.timer);
  },1000);return res.end('started');
 }
 res.end('<style>textarea{position:fixed;top:0;right:0;z-index:2}nav,aside{display:flex;flex-wrap:wrap}</style><textarea id="editor"></textarea><main id="content"></main>');
});
const sockets=new WebSocketServer({server});
sockets.on('connection',(socket,req)=>{
 const mode=new URL(req.url,'http://localhost').searchParams.get('mode')||'patch',challenge=secret();let prefix,seq=0;
 const owner={mode,tick:0,state:fixture(),frames:[],socket,epoch:'synthetic',sequence:0,peers:new Map()};
 const peer={id:'synthetic',device:{id:deviceId}};owner.peers.set(peer.id,peer);
 owner.send=value=>{
  const wire=JSON.stringify({type:'data',seq:++seq,box:seal(key,value,`${prefix}:host:${seq}`)});
  if(owner.measuring)owner.frames.push({kind:value.event||'reply',bytes:Buffer.byteLength(wire),plain:Buffer.byteLength(JSON.stringify(value)),unchanged:value.result?.unchanged===true});
  socket.send(wire);
 };
 owner.stream=new RemoteStateStream({epoch:owner.epoch,sequence:0,peers:owner.peers,send:(_peer,value)=>owner.send(value)},{now:()=>owner.tick*1000});
 active=owner;socket.send(JSON.stringify({type:'challenge',challenge}));
 socket.on('message',bytes=>{
  const packet=JSON.parse(String(bytes));
  if(packet.type==='auth'){
   const auth=unseal(key,packet.box,`${challenge}:auth`);prefix=challenge+':'+auth.nonce;
   socket.send(JSON.stringify({type:'ready',box:seal(key,{protocol:1},`${prefix}:ready`)}));return;
  }
  const command=unseal(key,packet.box,`${prefix}:client:${packet.seq}`);
  assert.equal(command.method,'sync');
  const result=mode==='patch'?owner.stream.sync(peer,command.args,owner.state):{state:owner.state};
  owner.send({type:'result',id:command.id,result:{...result,cursor:'synthetic:'+owner.tick}});
 });
 socket.on('close',()=>clearInterval(owner.timer));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});
const stats=values=>({mean:values.length?values.reduce((a,b)=>a+b,0)/values.length:0,max:Math.max(0,...values),p95:[...values].sort((a,b)=>a-b)[Math.floor(values.length*.95)]||0});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),origin=`http://127.0.0.1:${server.address().port}`;
 for(const mode of ['full','patch']){
  await page.goto(origin);
  await page.evaluate(async({key,hostId,deviceId,mode,origin})=>{
   const {DirectClient,WorkerClient,importKey,acceptRemoteState,coalesceRender,replaceChatMarkup,mergeChatHistory,onlyChatIndexChanges}=await import('/bench.js');
   const samples=window.samples={timerDelay:[],mainReceive:[],workerReceive:[],mainDecode:[],workerDecode:[],apply:[],long:[],renders:0,nodes:0,runArrivals:[],stateArrivals:[],stateApplications:0,unchangedSections:0};
   const BaseWorker=Worker;window.Worker=class extends BaseWorker{constructor(...args){super(...args);this.addEventListener('message',event=>{if(event.data.diagnostic){if(event.data.ms!==undefined)samples.workerReceive.push(event.data.ms);if(event.data.decodeMs!==undefined)samples.workerDecode.push(event.data.decodeMs);}});}};
   const directReceive=DirectClient.prototype.receive;DirectClient.prototype.receive=async function(packet){const at=this.benchmarkReceiveStart=performance.now();try{return await directReceive.call(this,packet);}finally{if(packet.type==='data')samples.mainReceive.push(performance.now()-at);}};
   const directEvent=DirectClient.prototype.event;DirectClient.prototype.event=function(type,value){if(type==='change')samples.mainDecode.push(performance.now()-this.benchmarkReceiveStart);return directEvent.call(this,type,value);};
   const client=window.client=new (mode==='full'?DirectClient:WorkerClient)({hostId,deviceId,key:await importKey(key),relay:origin.replace('http:','ws:')},mode==='full'?{socketFactory:url=>new WebSocket(url+'&mode=full')}:{});
   const content=document.querySelector('#content'),current={};let state,run;
   const render=()=>{
    const at=performance.now();const markup='<nav>'+state.tabs.map(tab=>`<button>${tab.id}</button>`).join('')+'</nav><aside>'+state.runs.map(row=>`<button>${row.title}</button>`).join('')+'</aside><div class="remote-messages">'+run.events.map(event=>`<article data-event-key="${event.id}">${event.text}</article>`).join('')+'</div>';
    replaceChatMarkup(content,markup,'synthetic');samples.renders++;samples.apply.push(performance.now()-at);
   },schedule=coalesceRender(render);
   client.addEventListener('change',event=>{
    const at=performance.now();
    if(event.detail.event==='state'){
     const incoming=event.detail.data;
     if(state?.tabs===incoming.tabs)samples.unchangedSections++;
     state=incoming;samples.stateArrivals.push(at-window.started);samples.stateApplications++;
     if(mode==='full')render();else if(acceptRemoteState(current,incoming)&&!onlyChatIndexChanges(current.changedStateSections))schedule();
    }
    if(event.detail.event==='run'){
     run=mergeChatHistory(run,event.detail.data);samples.runArrivals.push(at-window.started);
     if(samples.runArrivals.length%4===0)void client.request('sync',{}).then(result=>{state=result.state;if(mode==='full')render();else if(acceptRemoteState(current,state))schedule();samples.syncs=(samples.syncs||0)+1;});
     if(mode==='full')render();else schedule();
    }
   });
   await client.connect();const first=await client.request('sync',{});state=first.state;run={id:'chat-0',eventCount:1000,eventStart:976,events:Array.from({length:24},(_,i)=>({id:'event-'+(976+i),text:('Long streaming conversation '+(976+i)+' ').repeat(150)}))};acceptRemoteState(current,state);render();
   const json=JSON.stringify(state),parses=[];for(let i=0;i<5;i++){const at=performance.now();JSON.parse(json);parses.push(performance.now()-at);}samples.parseCalibration=parses;
   samples.apply=[];samples.mainReceive=[];samples.workerReceive=[];samples.mainDecode=[];samples.workerDecode=[];samples.renders=0;
   new MutationObserver(records=>samples.nodes+=records.reduce((sum,row)=>sum+row.addedNodes.length+row.removedNodes.length,0)).observe(content,{subtree:true,childList:true});
   const observer=window.observer=new PerformanceObserver(list=>samples.long.push(...list.getEntries().map(entry=>entry.duration)));observer.observe({type:'longtask'});
   document.querySelector('#editor').focus();window.started=performance.now();window.done=false;let previous=performance.now();window.inputTimer=setInterval(()=>{const now=performance.now();samples.timerDelay.push(Math.max(0,now-previous-20));previous=now;},20);
   await fetch('/start');
   const check=setInterval(()=>{if(samples.runArrivals.length===12&&samples.syncs===3){clearInterval(check);setTimeout(()=>window.done=true,150);}},20);
  },{key,hostId,deviceId,mode,origin});
  const typing=[];let done=false;const deadline=performance.now()+45000;
  while(!done){if(performance.now()>deadline)throw Error('Synthetic benchmark timed out');const at=performance.now();await page.keyboard.type('x');typing.push(performance.now()-at);await new Promise(resolve=>setTimeout(resolve,40));done=await page.evaluate(()=>window.done);}
  const samples=await page.evaluate(()=>{clearInterval(window.inputTimer);window.observer.disconnect();window.client.close();return window.samples;});
  const frames=active.frames,kind=name=>frames.filter(frame=>frame.kind===name),total=rows=>rows.reduce((sum,row)=>sum+row.bytes,0);
  assert.equal(samples.runArrivals.length,12);if(mode==='patch'){assert.equal(kind('state.patch').length,6);assert.ok(samples.runArrivals[0]<samples.stateArrivals[0]);assert.ok(frames.some(frame=>frame.unchanged));}
  console.log(JSON.stringify({mode,stateBytes:Buffer.byteLength(JSON.stringify(fixture())),statePushes:kind('state').length,patchPushes:kind('state.patch').length,stateWireBytes:total([...kind('state'),...kind('state.patch')]),maxPatchWireBytes:Math.max(0,...kind('state.patch').map(row=>row.bytes)),syncReplies:kind('reply').length,syncWireBytes:total(kind('reply')),conditionalReplies:frames.filter(frame=>frame.unchanged).length,runWireBytes:total(kind('run')),runEvents:samples.runArrivals.length,firstRunMs:samples.runArrivals[0],firstStateMs:samples.stateArrivals[0],renders:samples.renders,mutatedNodes:samples.nodes,longTasks:samples.long.length,longTaskMs:samples.long.reduce((a,b)=>a+b,0),mainDecodeBeforeDispatchMs:stats(samples.mainDecode),workerDecodeBeforeDispatchMs:stats(samples.workerDecode),mainReceiveMs:stats(samples.mainReceive),workerReceiveMs:stats(samples.workerReceive),renderMs:stats(samples.apply),typingRoundTripMs:stats(typing),inputTimerDelayMs:stats(samples.timerDelay),parseCalibrationMs:stats(samples.parseCalibration),unchangedSectionObservations:samples.unchangedSections}));
 }
} finally {if(active?.timer)clearInterval(active.timer);await browser.close();for(const socket of sockets.clients)socket.terminate();await new Promise(resolve=>sockets.close(resolve));await new Promise(resolve=>server.close(resolve));}
