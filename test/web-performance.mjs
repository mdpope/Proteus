// Stage benchmark: real WebCrypto decoder and chat DOM reconciler, synthetic UI/state.
// No owner, pairing, account or provider is contacted. Run with --preserve-symlinks.
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
const bundle=await build({stdin:{contents:`export {acceptRemoteState} from './web/resources/js/remote-updates.js';export {replaceChatMarkup} from './public/features/chats/chat-dom.js';export {importKey,seal,unseal} from './web/resources/js/remote-client.js';`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm'});
const workerBundle=await build({stdin:{contents:`import {unseal} from './src/services/remote/remote-client.js';onmessage=async({data})=>{const at=performance.now();const state=await unseal(data.key,data.box,'benchmark');postMessage({state,cost:performance.now()-at});};`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm'});
const server=createServer((req,res)=>{res.setHeader('Content-Type',req.url.endsWith('.js')?'text/javascript':'text/html');res.end(req.url==='/bench.js'?bundle.outputFiles[0].text:req.url==='/worker.js'?workerBundle.outputFiles[0].text:'<textarea id="editor"></textarea><main id="content"></main>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 for(const optimized of [false,true]){
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const result=await page.evaluate(async optimized=>{
   const {acceptRemoteState,replaceChatMarkup,importKey,seal,unseal}=await import('/bench.js');
   const key=await importKey('a'.repeat(64)),state={runs:Array.from({length:500},(_,i)=>({id:'chat-'+i,title:'Synthetic chat '+i,summary:'s'.repeat(3800)})),tabs:Array.from({length:200},(_,i)=>({id:'tab-'+i,url:'https://example.test/'+i})),padding:'p'.repeat(100000)};
   const text=JSON.stringify(state),box=await seal(key,state,'benchmark'),current={},samples={decrypt:[],worker:[],parse:[],apply:[],input:[],long:[],mutations:0,renders:0,bytes:new TextEncoder().encode(text).length};
   const worker=optimized?new Worker('/worker.js',{type:'module'}):null;
   const observer=new PerformanceObserver(list=>samples.long.push(...list.getEntries().map(e=>e.duration)));observer.observe({type:'longtask'});
   const content=document.querySelector('#content'),editor=document.querySelector('#editor');editor.focus();
   new MutationObserver(records=>samples.mutations+=records.reduce((n,r)=>n+r.addedNodes.length+r.removedNodes.length,0)).observe(content,{subtree:true,childList:true});
   const markup=()=>'<nav>'+state.tabs.map(t=>`<button>${t.id}</button>`).join('')+'</nav><aside>'+state.runs.map(r=>`<button>${r.title}</button>`).join('')+'</aside><div class="remote-messages">'+Array.from({length:24},(_,i)=>`<article data-event-key="${i}">${('Long streaming conversation '+i+' ').repeat(150)}${i===23?state.stream:''}</article>`).join('')+'</div>';
   // Both runs render the same 24-event window of a retained 1,000-event conversation.
   const history=Array.from({length:1000},(_,i)=>({id:i,text:'retained '.repeat(150)}));
   let next=performance.now();
   const typing=setInterval(()=>{const now=performance.now();samples.input.push(Math.max(0,now-next-20));next=now;editor.value+='x';editor.dispatchEvent(new InputEvent('input',{bubbles:true,data:'x'}));},20);
   for(let i=0;i<12;i++){
    const start=performance.now();if(worker){const result=await new Promise(resolve=>{worker.onmessage=({data})=>resolve(data);worker.postMessage({key,box});});samples.worker.push(result.cost);}else await unseal(key,box,'benchmark');samples.decrypt.push(performance.now()-start);
    let at=performance.now();JSON.parse(text);samples.parse.push(performance.now()-at);
    // Stream content advances every third push; the others repeat the same state.
    const incoming={...state,stream:'chunk '+Math.floor(i/3)};at=performance.now();
    if(!optimized||acceptRemoteState(current,incoming)){state.stream=incoming.stream;replaceChatMarkup(content,markup(),'synthetic');samples.renders++;}
    samples.apply.push(performance.now()-at);
    await new Promise(resolve=>setTimeout(resolve,Math.max(0,1000-(performance.now()-start))));
   }
   clearInterval(typing);worker?.terminate();observer.disconnect();samples.retainedEvents=history.length;
   const stats=values=>({mean:values.reduce((a,b)=>a+b,0)/values.length,max:Math.max(0,...values),p95:[...values].sort((a,b)=>a-b)[Math.floor(values.length*.95)]||0});
   return {optimized,bytes:samples.bytes,renders:samples.renders,mutatedNodes:samples.mutations,longTasks:samples.long.length,longTaskMs:samples.long.reduce((a,b)=>a+b,0),decodeRoundTripMs:stats(samples.decrypt),workerDecodeMs:stats(samples.worker),parseOnlyMs:stats(samples.parse),applyMs:stats(samples.apply),typingTimerDelayMs:stats(samples.input),retainedEvents:samples.retainedEvents};
  },optimized);console.log(JSON.stringify(result));
 }
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
