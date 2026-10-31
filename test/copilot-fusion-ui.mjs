// Shared desktop renderer, synthetic owner only. No live chats or model calls.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';
import assert from 'node:assert/strict';import {chromium} from 'playwright';
const root=process.env.PROTEUS_TEST_APP_ROOT||path.resolve(import.meta.dirname,'..');
const html='<!doctype html><link rel="stylesheet" href="/public/style.css"><link rel="stylesheet" href="/public/parity.css"><style>body{height:100vh}#host{height:70vh}.conversation-shell{height:100%;display:flex;flex-direction:column}.conversation{overflow:auto;flex:1}</style><div id="host"></div><div id="card"></div><script>window.ProteusMarkdown={mount:(node,text)=>node.textContent=text}</script>';
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://fixture').pathname,file=path.resolve(root,'.'+pathname);if(pathname.startsWith('/public/')&&file.startsWith(root+path.sep)&&fs.existsSync(file)){res.setHeader('Content-Type',file.endsWith('.css')?'text/css':'text/javascript');res.end(fs.readFileSync(file));}else{res.setHeader('Content-Type','text/html');res.end(html);}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1000,height:900}});const errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto('http://127.0.0.1:'+server.address().port);
 await page.evaluate(async()=>{
  const {conversation}=await import('/public/features/chats/conversation.js');const {renderCopilotFusion}=await import('/public/features/chats/copilot-fusion.js');
  const turn={fusionId:'f1',status:'running',policy:'fusion-high',pattern:'critique',plan:{primaryModel:'model-a',judgeModel:'model-j',critics:[{model:'model-<b>b</b>'}],hint:'Draft, critique, revise'},phases:[{phaseId:'d1',role:'drafter',model:'model-a',status:'running'}],models:{}};
  const run={id:'fusion-ui',status:'running',schedule:{provider:'copilot',model:'copilot-fusion',reasoningEffort:'fusion-high'},fusionSelection:{tier:'fusion-high',label:'High'},fusionTurns:[turn],events:[{role:'user',text:'Refactor it'},{role:'assistant',text:'Final answer',data:{fusion:{fusionId:'f1',sourceModel:'model-a'}}}],eventStart:0,eventCount:2};
  window.fixture={run,turn};window.render=()=>{conversation(document.querySelector('#host'),run,{time:String,notify:()=>{},copy:()=>{}});document.querySelector('#card').innerHTML=renderCopilotFusion(run,v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));};render();
 });
 const summary=page.locator('#host .fusion-attribution summary');
 assert.match(await summary.textContent(),/^Fusion High · Critique · also used model-a \(drafter\) · running$/);
 // Progressive update in place: phases complete, the final model arrives, expansion is retained.
 await summary.click();
 await page.evaluate(()=>{const t=fixture.turn;t.status='succeeded';t.phases=[{phaseId:'d1',role:'drafter',model:'model-a',status:'succeeded',durationMs:1200,usage:{inputTokens:100,outputTokens:40,requestCount:1,totalNanoAiu:2000000}},{phaseId:'c1',role:'critic',model:'model-<b>b</b>',status:'succeeded',conversationScope:'review'},{phaseId:'r1',role:'reviser',model:'model-a',status:'succeeded'}];t.models={'model-a':{roles:['drafter','final answer'],requests:2,inputTokens:220,outputTokens:100}};t.final={sourceModel:'model-a'};t.completion={phaseCount:3,requestCount:3,inputTokens:320,outputTokens:140,totalNanoAiu:7000000,durationMs:3100};render();});
 assert.match(await summary.textContent(),/^Fusion High · Critique · answer by model-a · also used model-<b>b<\/b> \(critic\)$/);
 assert.equal(await page.locator('#host .fusion-attribution').getAttribute('open'),'','expansion survives updates');
 assert.equal(await page.locator('#host .fusion-attribution b').count(),0,'model names are escaped');
 assert.equal(await page.locator('#host .fusion-phases li').count(),3);
 assert.match(await page.locator('#host .fusion-attribution').textContent(),/Planned but not run: model-j \(judge\)/);
 assert.match(await page.locator('#host .fusion-attribution').textContent(),/Turn totals: 3 phases · 3 requests · 320 input tokens · 140 output tokens · 0\.007 AI units · 3\.1 s/);
 assert.match(await page.locator('#card .fusion-models').textContent(),/model-a.*2.*1.*2/);
 await page.screenshot({path:process.env.FUSION_SCREENSHOT||'/tmp/copilot-fusion-ui.png',fullPage:true});
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,progressiveAttribution:true,expansionRetained:true,escaped:true,plannedOnly:true,totals:true,runDetailsTable:true}));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
