// N11-17 scroll smoothness profile. Synthetic local data only: no accounts, providers or
// external pages. Drives wheel input through Electron's input path and records renderer frame
// intervals, long tasks, style/layout work and main-process event-loop delay for (1) a long
// rich chat, (2) the same chat while a reply streams and (3) a heavy local page in a project
// browser tab. Run: node test/scroll-smoothness-profile.mjs [--assert]
import {_electron as electron} from 'playwright';import assert from 'node:assert/strict';import http from 'node:http';
import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';import {atomicJSON} from '../src/shared/files.js';
const require=createRequire(import.meta.url),{WorkspaceSession}=require('../desktop/windows/workspace-session.cjs');
const strict=process.argv.includes('--assert');
const code=index=>'```js\n'+Array.from({length:24},(_,line)=>`export function sample${index}_${line}(value) { return value.map(item => ({ ...item, total: item.count * ${line} })); }`).join('\n')+'\n```';
const table=index=>'| Item | Count | Notes |\n| --- | ---: | --- |\n'+Array.from({length:8},(_,row)=>`| Row ${index}.${row} | ${row*7} | Synthetic **note** with \`code\` |`).join('\n');
function transcript(){
 const events=[],at='2026-11-11T16:00:00Z';
 for(let turn=0;turn<70;turn++){
  events.push({role:'user',text:`Scroll fixture question ${turn}: please review the synthetic module and explain the change.`,at,data:{}});
  for(let tool=0;tool<4;tool++)events.push({role:'tool',text:'Synthetic tool output',at,data:{tool:{id:`tool-${turn}-${tool}`,name:'Synthetic read',status:'completed',output:'Synthetic result '.repeat(20)}}});
  events.push({role:'system',text:'Automatic approval',at,data:{permission:{automatic:true,kind:'read'}}});
  events.push({role:'assistant',text:`## Synthetic answer ${turn}\n\n${'This paragraph contains **bold**, _italic_ and `inline code` so the renderer does representative work. '.repeat(6)}\n\n- First point ${turn}\n- Second point with a [link](https://example.invalid/${turn})\n- Third point\n\n${code(turn)}\n\n${table(turn)}\n\n${'Closing synthetic explanation. '.repeat(12)}`,at,data:{}});
 }
 return events;
}
const page=(count=900)=>'<!doctype html><meta charset="utf-8"><title>Synthetic heavy article</title><style>body{margin:0 auto;max-width:880px;font:17px/1.6 system-ui;padding:20px}article{border-bottom:1px solid #ddd;padding:12px 0}.card{display:grid;grid-template-columns:120px 1fr;gap:12px;border-radius:10px;box-shadow:0 2px 10px #0002;padding:12px;margin:10px 0}.thumb{height:90px;border-radius:8px;background:linear-gradient(135deg,#9c6,#369)}</style>'+Array.from({length:count},(_,i)=>`<article><h2>Synthetic article section ${i}</h2><p>${'Readable synthetic paragraph text for scrolling measurement. '.repeat(5)}</p><div class="card"><div class="thumb"></div><div><strong>Card ${i}</strong><p>${'Secondary synthetic description. '.repeat(3)}</p></div></div></article>`).join('');
const stats=intervals=>{const sorted=[...intervals].sort((a,b)=>a-b),pick=q=>sorted.length?+sorted[Math.min(sorted.length-1,Math.floor(q*sorted.length))].toFixed(1):null;return {frames:intervals.length,p50:pick(.5),p95:pick(.95),p99:pick(.99),max:sorted.length?+sorted.at(-1).toFixed(1):null,over25ms:intervals.filter(v=>v>25).length,over50ms:intervals.filter(v=>v>50).length};};
const recorder=()=>{const scroller=()=>document.querySelector('.conversation')||document.scrollingElement;window.__scrollProfile={frames:[],stamps:[],longTasks:[],run:true,origin:performance.now(),startTop:scroller().scrollTop,travel:0,lastTop:scroller().scrollTop};let last=performance.now();const tick=t=>{const top=scroller().scrollTop;window.__scrollProfile.travel+=Math.abs(top-window.__scrollProfile.lastTop);window.__scrollProfile.lastTop=top;window.__scrollProfile.frames.push(t-last);window.__scrollProfile.stamps.push(t-window.__scrollProfile.origin);last=t;if(window.__scrollProfile.run)requestAnimationFrame(tick);};requestAnimationFrame(t=>{last=t;requestAnimationFrame(tick);});try{window.__scrollProfile.observer=new PerformanceObserver(list=>{for(const entry of list.getEntries())window.__scrollProfile.longTasks.push(+entry.duration.toFixed(1));});window.__scrollProfile.observer.observe({type:'longtask'});}catch{}};
const collect=()=>{window.__scrollProfile.run=false;window.__scrollProfile.observer?.disconnect();const p=window.__scrollProfile,worst=p.frames.map((v,i)=>[+v.toFixed(1),+p.stamps[i].toFixed(0)]).sort((a,b)=>b[0]-a[0]).slice(0,4);return {frames:p.frames.slice(2),stamps:p.stamps.slice(2),longTasks:p.longTasks,travel:Math.round(p.travel),worst};};
const metricNames=['LayoutCount','RecalcStyleCount','LayoutDuration','RecalcStyleDuration','ScriptDuration','TaskDuration'];
async function metrics(cdp){const {metrics}=await cdp.send('Performance.getMetrics');return Object.fromEntries(metrics.filter(m=>metricNames.includes(m.name)).map(m=>[m.name,m.value]));}
const delta=(a,b)=>Object.fromEntries(metricNames.map(name=>[name,name.endsWith('Duration')?+((b[name]-a[name])*1000).toFixed(1):b[name]-a[name]]));

// The feed variant mutates the page while it scrolls, like an infinite social feed, so any
// layout read by Proteus during scrolling becomes a forced synchronous layout.
const feed='<script>let n=0;addEventListener("scroll",()=>{document.body.dataset.progress=String(Math.round(scrollY));if(++n%6===0){const a=document.createElement("article");a.innerHTML="<h2>Appended feed item "+n+"</h2><p>"+"Lazy synthetic content. ".repeat(20)+"</p>";document.body.append(a);}if(location.search.includes("frames")&&n%20===0){const f=document.createElement("iframe");f.src="/embed?"+n;f.style.cssText="width:300px;height:80px;border:0";document.body.append(f);history.replaceState(null,"","/feed?frames&item="+n);document.title="Synthetic feed ("+n+")";}},{passive:true});</script>';
const server=http.createServer((request,r)=>{r.writeHead(200,{'Content-Type':'text/html'});r.end(request.url.startsWith('/embed')?'<!doctype html><p>Synthetic embed</p>':page()+(request.url.includes('feed')?feed:''));});await new Promise(r=>server.listen(0,'127.0.0.1',r));
// --live-copy ROOT profiles an isolated preview copy prepared by scripts/prepare-load-test-copy.mjs
// (one prepared copy per run: the app writes to it). Copy contents stay outside the repository;
// (credentials, pairing, cookies, extensions and terminals excluded; schedules disabled). The
// largest copied chat is opened inside its project. Without it, synthetic fixtures are used.
const liveIndex=process.argv.indexOf('--live-copy'),liveRoot=liveIndex>0?path.resolve(process.argv[liveIndex+1]):null;
async function prepareTarget(){
 if(liveRoot){
  const home=path.join(liveRoot,'app-data'),runs=path.join(home,'runs');
  const largest=fs.readdirSync(runs).filter(file=>file.endsWith('.json')).map(file=>({file,size:fs.statSync(path.join(runs,file)).size})).sort((a,b)=>b.size-a.size)[0];
  const run=JSON.parse(fs.readFileSync(path.join(runs,largest.file),'utf8')),session=new WorkspaceSession(home),saved=session.get()||{schemaVersion:1,tabs:[]};
  let parent=saved.tabs.find(tab=>tab.type==='workspace'&&run.projectId&&tab.projectId===run.projectId);
  if(!parent&&run.projectId){parent={id:'project:local:'+run.projectId,type:'workspace',projectId:run.projectId,workspaceId:run.workspaceId,label:'Load-test project',workspacePage:'chats'};saved.tabs.push(parent);}
  const tabId=(parent?parent.id+':chat:':'')+run.id;if(!saved.tabs.some(tab=>tab.id===tabId))saved.tabs.push({id:tabId,type:'run',runId:run.id,label:run.title||'Load-test chat',...(parent?{parentId:parent.id}:{})});
  session.save({...saved,active:tabId});
  return {root:liveRoot,home,userData:path.join(liveRoot,'electron'),auth:path.join(liveRoot,'codex'),chatId:run.id,parentId:parent?.id||null,live:{runBytes:largest.size,events:run.events?.length,runs:fs.readdirSync(runs).length,tabs:saved.tabs.length},cleanup:async()=>{}};
 }
 const fixture=await sidebarFixture();
 // Replace the first project chat's transcript with a long, rich synthetic history and open it.
 const chat=fixture.user[0],file=path.join(fixture.locations.home,'runs',chat.id+'.json'),run=JSON.parse(fs.readFileSync(file,'utf8'));
 Object.assign(run,{events:transcript(),status:'completed',pending:null});atomicJSON(file,run);
 const session=new WorkspaceSession(fixture.locations.home),saved=session.get();session.save({...saved,active:fixture.parentId+':chat:'+chat.id});
 return {root:fixture.locations.root,home:fixture.locations.home,userData:fixture.locations.userData,auth:fixture.auth,chatId:chat.id,parentId:fixture.parentId,cleanup:fixture.cleanup};
}
const target=await prepareTarget();let app;
try{
 // --executable APP_BINARY profiles a packaged build instead of this checkout.
 const executableIndex=process.argv.indexOf('--executable'),executablePath=executableIndex>0?path.resolve(process.argv[executableIndex+1]):null;
 app=await electron.launch({...(executablePath?{executablePath}:{}),args:[...(executablePath?[]:['.']),'--use-mock-keychain','--user-data-dir='+target.userData],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_AUTH:'none',PROTEUS_PREVIEW_HOME:target.root,PROTEUS_HOME:target.home,CODEX_HOME:target.auth,PORT:'0'}});
 // Restored sessions can open several windows; profile the one showing the selected chat.
 await app.firstWindow({timeout:liveRoot?120000:30000});let host;for(let attempt=0;attempt<120&&!host;attempt++){for(const candidate of app.windows())if(await candidate.locator('.conversation [data-key^="event-"]').count().catch(()=>0)){host=candidate;break;}if(!host)await new Promise(r=>setTimeout(r,500));}
 assert.ok(host,'The selected chat did not render');const errors=[];host.on('pageerror',e=>errors.push(e.message));await host.waitForTimeout(liveRoot?6000:1500);
 const cdp=await host.context().newCDPSession(host);await cdp.send('Performance.enable');
 const appPath=await app.evaluate(({app})=>app.getAppPath());
 // Main-process loop delay and wheel input share one harness in the Electron main process.
 await app.evaluate(()=>{const {monitorEventLoopDelay}=process.mainModule.require('node:perf_hooks');globalThis.__scrollHarness={histogram:monitorEventLoopDelay({resolution:5})};});
 await (await app.browserWindow(host)).evaluate(window=>{globalThis.__scrollHarness.window=window;});
 const scrollChat=async(label,{streaming=false}={})=>{
  const box=await host.locator('.conversation').boundingBox();const x=Math.round(box.x+box.width/2),y=Math.round(box.y+box.height/2);
  await host.locator('.conversation').evaluate(node=>{node.scrollTop=Math.max(0,node.scrollHeight-node.clientHeight-4000);});await host.waitForTimeout(400);
  await startMain();const before=await metrics(cdp);await host.evaluate(recorder);
  const main=await app.evaluate(async({},{x,y,streaming,chatId,appPath})=>{
   const harness=globalThis.__scrollHarness,engine=process.mainModule.require(appPath+'/desktop/main.cjs').getService().engine,run=engine.runs.get(chatId);
   harness.histogram.reset();harness.histogram.enable();let maxGap=0,last=performance.now();const gap=setInterval(()=>{const now=performance.now();maxGap=Math.max(maxGap,now-last);last=now;},4);
   // A streaming chat is running, so the owner keeps its history resident (pinned).
   const priorStatus=run?.status;if(streaming&&run){run.status='running';run.progress??={startedAt:engine.now(),lastProgressAt:engine.now(),lastProviderEventAt:engine.now(),stage:'provider',stalled:false};void run.events;}
   const stream=streaming&&run?setInterval(()=>engine.stream(run,'scroll-profile-live','Streaming synthetic words with **markdown** and `code`. '),40):null;
   for(let i=0;i<180;i++){const up=i<90;harness.window.webContents.sendInputEvent({type:'mouseWheel',x,y,deltaX:0,deltaY:up?40:-40,hasPreciseScrollingDeltas:true,canScroll:true});await new Promise(r=>setTimeout(r,16));}
   await new Promise(r=>setTimeout(r,250));clearInterval(gap);clearInterval(stream);harness.histogram.disable();
   if(streaming&&run)run.status=priorStatus;if(run?.liveMessages){delete run.liveMessages['scroll-profile-live'];engine.emit('change',run,{});}
   return {mainMaxGapMs:+maxGap.toFixed(1),mainLoopDelayP99Ms:+(harness.histogram.percentile(99)/1e6).toFixed(1),mainLoopDelayMaxMs:+(harness.histogram.max/1e6).toFixed(1)};
  },{x,y,streaming,chatId:target.chatId,appPath});
  const rendered=await host.evaluate(collect),after=await metrics(cdp),mainHot=await stopMain();
  return {label,...(mainHot?{mainHot}:{}),travelPx:rendered.travel,worstFrames:rendered.worst,...stats(rendered.frames),longTasks:rendered.longTasks.length,longTaskMs:+rendered.longTasks.reduce((a,b)=>a+b,0).toFixed(1),...delta(before,after),...main};
 };
 // --accessibility mirrors machines where VoiceOver or a desktop-control client (Cua Driver)
 // has turned on Chromium accessibility: every DOM change then also updates the AX tree.
 if(process.argv.includes('--accessibility'))await app.evaluate(({app})=>app.setAccessibilitySupportEnabled(true));
 const summarize=profile=>{const self=new Map(),byId=new Map(profile.nodes.map(node=>[node.id,node])),interval=(profile.endTime-profile.startTime)/Math.max(1,profile.samples.length)/1000;for(const id of profile.samples){const frame=byId.get(id).callFrame,key=(frame.functionName||'(anonymous)')+' '+frame.url.split('/').slice(-2).join('/')+':'+(frame.lineNumber+1);self.set(key,(self.get(key)||0)+interval);}const parents=new Map();for(const node of profile.nodes)for(const child of node.children||[])parents.set(child,node.id);const stacks=new Map();for(const id of profile.samples){const names=[];let cursor=id;while(cursor!==undefined&&names.length<9){const frame=byId.get(cursor).callFrame;if(frame.functionName||frame.url)names.push((frame.functionName||'(anon)')+'@'+frame.url.split('/').slice(-2).join('/')+':'+(frame.lineNumber+1));cursor=parents.get(cursor);}if(!names.length)continue;const key=names.slice(0,6).join(' < ');stacks.set(key,(stacks.get(key)||0)+interval);}
 return {self:[...self].sort((a,b)=>b[1]-a[1]).slice(0,12).map(([name,ms])=>[name,+ms.toFixed(1)]),stacks:[...stacks].sort((a,b)=>b[1]-a[1]).slice(0,14).map(([name,ms])=>[+ms.toFixed(0),name])};};
 // --main-profile samples the Electron main process (browser UI thread, owner server).
 const mainProfile=process.argv.includes('--main-profile');
 const startMain=()=>mainProfile&&app.evaluate(()=>new Promise(resolve=>{const inspector=process.mainModule.require('node:inspector'),session=new inspector.Session();session.connect();globalThis.__mainProfiler=session;session.post('Profiler.enable',()=>session.post('Profiler.setSamplingInterval',{interval:250},()=>session.post('Profiler.start',resolve)));}));
 const stopMain=async()=>mainProfile?summarize(await app.evaluate(()=>new Promise(resolve=>globalThis.__mainProfiler.post('Profiler.stop',(error,value)=>{globalThis.__mainProfiler.disconnect();resolve(value.profile);})))):undefined;
 const results=[];
 results.push(await scrollChat('chat'));
 results.push(await scrollChat('chat-streaming',{streaming:true}));
 // Heavy local page in a project browser tab; frames are recorded inside the page itself.
 const openBrowser=async url=>app.evaluate(async({},{url,appPath,parentId})=>{
  const b=process.mainModule.require(appPath+'/desktop/main.cjs').getBrowser();
  // Project placement makes the tab part of the visible cross-device follow scope.
  const active=await b.create(url,null,null,{parentId});b.actions.send({type:'select-tab',info:active});
  for(let i=0;i<100&&(!b.get(active.id).view||b.get(active.id).view.webContents.isLoading());i++)await new Promise(r=>setTimeout(r,100));await new Promise(r=>setTimeout(r,1500));
  return active.id;
 },{url,appPath,parentId:target.parentId});
 // --cpu-profile prints the host renderer's hottest functions for each browser scenario.
 const hostProfile=process.argv.includes('--cpu-profile');
 const scrollBrowser=async(label,browserTab)=>{
  if(hostProfile){await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:200});await cdp.send('Profiler.start');}
  await startMain();const before=await metrics(cdp);await host.evaluate(recorder);
  const measured=await app.evaluate(async({},{id,recorder,collect,appPath})=>{
   const b=process.mainModule.require(appPath+'/desktop/main.cjs').getBrowser(),harness=globalThis.__scrollHarness,wc=b.get(id).view.webContents;
   await wc.executeJavaScript('('+recorder+')()');harness.histogram.reset();harness.histogram.enable();let maxGap=0,last=performance.now();const gap=setInterval(()=>{const now=performance.now();maxGap=Math.max(maxGap,now-last);last=now;},4);
   const ipc=process.mainModule.require('electron').ipcMain;let scrollMessages=0,interactionMessages=0;const countScroll=()=>scrollMessages++,countInteraction=()=>interactionMessages++;ipc.on('proteus:browser-scroll',countScroll);ipc.on('proteus:browser-interaction',countInteraction);
   const service=process.mainModule.require(appPath+'/desktop/main.cjs').getService(),follow=service.projectFollow,originalHandle=follow.handle;let followCalls=0,followMs=0,followMax=0;follow.handle=function(...args){const t=performance.now();try{return originalHandle.apply(this,args);}finally{const d=performance.now()-t;followCalls++;followMs+=d;followMax=Math.max(followMax,d);}};
   const thumbnails=b.thumbnails,originalSet=thumbnails?.set;let thumbnailWrites=0;if(thumbnails)thumbnails.set=function(...args){thumbnailWrites++;return originalSet.apply(this,args);};
   const nativeImage=process.mainModule.require('electron').nativeImage,proto=Object.getPrototypeOf(nativeImage.createEmpty()),originalResize=proto.resize,originalJPEG=proto.toJPEG;let encodeMs=0,encodeMax=0;const timed=fn=>function(...args){const t=performance.now();try{return fn.apply(this,args);}finally{const d=performance.now()-t;encodeMs+=d;encodeMax=Math.max(encodeMax,d);}};proto.resize=timed(originalResize);proto.toJPEG=timed(originalJPEG);
   const originalFlush=b.flushStateChanged;let stateFlushes=0,stateMs=0,stateMax=0;b.flushStateChanged=function(...args){const t=performance.now();try{return originalFlush.apply(this,args);}finally{const d=performance.now()-t;stateFlushes++;stateMs+=d;stateMax=Math.max(stateMax,d);}};
   const hostSends={},target=harness.window.webContents,original=target.send;target.send=function(channel,...args){hostSends[channel]=(hostSends[channel]||0)+1;return original.call(this,channel,...args);};
   const started=performance.now();for(let i=0;i<240;i++){wc.sendInputEvent({type:'mouseWheel',x:300,y:300,deltaX:0,deltaY:i<120?-40:40,hasPreciseScrollingDeltas:true,canScroll:true});await new Promise(r=>setTimeout(r,16));}
   const scrollMs=performance.now()-started;await new Promise(r=>setTimeout(r,6500));clearInterval(gap);harness.histogram.disable();ipc.removeListener('proteus:browser-scroll',countScroll);ipc.removeListener('proteus:browser-interaction',countInteraction);target.send=original;follow.handle=originalHandle;b.flushStateChanged=originalFlush;proto.resize=originalResize;proto.toJPEG=originalJPEG;if(thumbnails)thumbnails.set=originalSet;
   const page=await wc.executeJavaScript('('+collect+')()');
   return {page,scrollMs:Math.round(scrollMs),stateFlushes,stateMs:+stateMs.toFixed(1),stateMaxMs:+stateMax.toFixed(1),thumbnailWrites,thumbnailEncodeMs:+encodeMs.toFixed(1),thumbnailEncodeMaxMs:+encodeMax.toFixed(1),followUpdates:followCalls,followMs:+followMs.toFixed(1),followMaxMs:+followMax.toFixed(1),scrollMessages,interactionMessages,hostSends,mainMaxGapMs:+maxGap.toFixed(1),mainLoopDelayP99Ms:+(harness.histogram.percentile(99)/1e6).toFixed(1),mainLoopDelayMaxMs:+(harness.histogram.max/1e6).toFixed(1)};
  },{id:browserTab,recorder:recorder.toString(),collect:collect.toString(),appPath});
  const hostFrames=await host.evaluate(collect),after=await metrics(cdp),hot=hostProfile?summarize((await cdp.send('Profiler.stop')).profile):undefined,mainHot=await stopMain();
  const {page,...rest}=measured,scrolling=page.frames.filter((_,i)=>page.stamps[i]<=rest.scrollMs);
  return {label,travelPx:page.travel,worstFrames:page.worst,...stats(scrolling),pageLongTasks:page.longTasks.length,pageLongTaskMs:+page.longTasks.reduce((a,b)=>a+b,0).toFixed(1),hostLongTasks:hostFrames.longTasks.length,host:delta(before,after),...(hot?{hostHot:hot}:{}),...(mainHot?{mainHot}:{}),...rest};
 };
 const origin='http://127.0.0.1:'+server.address().port;
 let tab=await openBrowser(origin+'/article');await host.waitForTimeout(800);results.push(await scrollBrowser('browser',tab));
 tab=await openBrowser(origin+'/feed');await host.waitForTimeout(800);results.push(await scrollBrowser('browser-feed',tab));
 // Many dormant tabs plus a feed whose embeds, in-page URL and title change while scrolling:
 // each of those page events requests a full browser-state projection to every window.
 if(!liveRoot)await app.evaluate(async({},{appPath,parentId})=>{const b=process.mainModule.require(appPath+'/desktop/main.cjs').getBrowser();for(let i=0;i<220;i++)await b.create('https://example.invalid/dormant/'+i,null,{entries:[{url:'https://example.invalid/dormant/'+i,title:'Synthetic dormant page '+i}],index:0},{unloaded:true,title:'Synthetic dormant page '+i,parentId});},{appPath,parentId:target.parentId});
 tab=await openBrowser(origin+'/feed?frames');await host.waitForTimeout(1500);results.push(await scrollBrowser(liveRoot?'browser-feed-frames-live-tabs':'browser-feed-frames-220-tabs',tab));
 // A reply streaming in a background chat while the operator reads a website.
 const streamer=await app.evaluate(({},{id,appPath})=>{const engine=process.mainModule.require(appPath+'/desktop/main.cjs').getService().engine,run=engine.runs.get(id);globalThis.__scrollStatus=run.status;run.status='running';run.progress??={startedAt:engine.now(),lastProgressAt:engine.now(),lastProviderEventAt:engine.now(),stage:'provider',stalled:false};void run.events;globalThis.__scrollStream=setInterval(()=>engine.stream(run,'scroll-profile-background','Background streaming words. '),40);return true;},{id:target.chatId,appPath});
 results.push(await scrollBrowser('browser-feed-background-stream',tab));
 await app.evaluate(({},{id,appPath})=>{clearInterval(globalThis.__scrollStream);const engine=process.mainModule.require(appPath+'/desktop/main.cjs').getService().engine,run=engine.runs.get(id);run.status=globalThis.__scrollStatus;if(run?.liveMessages)delete run.liveMessages['scroll-profile-background'];},{id:target.chatId,appPath});
 console.log(JSON.stringify({synthetic:!liveRoot,...(target.live?{live:target.live}:{}),results,errors},null,1));
 if(strict){
  for(const result of results){assert.ok(result.over50ms<=2,`${result.label}: frames over 50 ms`);assert.ok((result.mainLoopDelayMaxMs??0)<100,`${result.label}: main loop blocked`);}
  assert.deepEqual(errors,[]);
 }
}finally{await app?.close().catch(()=>{});await new Promise(r=>server.close(r));await target.cleanup();}
