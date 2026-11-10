import {chromium,webkit} from 'playwright';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {MnemosyneOperations} from '../src/services/mnemosyne/operations.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const counts={snapshot:0,logs:0,controls:0};
let controlState={available:true,state:'running',desired:'running',revision:'initial',active:false,configurationRevision:'fixture'};
const operations=new MnemosyneOperations({omi:{serviceControl:async()=>controlState,status:async()=>({settings:{pipelineRoot:'/nonexistent-synthetic'},status:{runtimeAvailable:true,enabled:false,intakeEnabled:true,checkedAt:'2026-11-01T00:00:00Z',nativeServices:[{id:'audio',state:'loaded'}],metadata:{audio:{available:true,modifiedAt:'2026-11-01T00:00:00Z',pending:2,failed:1}}},automations:[]}),logs:()=>({available:true,records:[{pending:2}],withheld:1,modifiedAt:'2026-11-01T00:00:00Z',localPath:'/private/example.log'})},engine:{schedules:{list:()=>[{id:'omi-transcript-intake',provider:'codex',enabled:true,cron:'15 * * * *'}]},listRuns:()=>[{id:'fixture-run',status:'completed',createdAt:'2026-11-01T00:00:00Z',schedule:{id:'omi-transcript-intake',model:'gpt-6.1-sol'}}]}});
const server=http.createServer(async(req,res)=>{try{
 if(req.url==='/snapshot'){counts.snapshot++;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(await operations.snapshot()));return;}
 if(req.url==='/control'&&req.method==='POST'){counts.controls++;controlState={...controlState,state:'paused',desired:'paused',revision:'next'};res.setHeader('Content-Type','application/json');res.end(JSON.stringify(controlState));return;}
 if(req.url==='/logs'){counts.logs++;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(operations.logs('audio')));return;}
 if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/features/mnemosyne/operations.css"><style>body{margin:16px;background:#18231c;color:#e3ece5;font:15px system-ui}</style><div id="view"></div><script type="module">import{mountMnemosyne}from'/features/mnemosyne/operations.js';window.observer=mountMnemosyne(document.querySelector('#view'),{readSnapshot:()=>fetch('/snapshot').then(r=>r.json()),readLogs:()=>fetch('/logs').then(r=>r.json()),controlServices:args=>fetch('/control',{method:'POST',body:JSON.stringify(args)}).then(r=>r.json()),openSchedule:id=>window.openedSchedule=id,openRun:id=>window.openedRun=id,onError:e=>{throw e;}});</script>`);return;}
 if(!['/features/mnemosyne/operations.js','/features/mnemosyne/operations.css'].includes(req.url)){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',req.url.endsWith('.css')?'text/css':'text/javascript');res.end(await fs.readFile(path.join(root,'public',req.url)));
 }catch(error){res.writeHead(500).end(error.message);}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try{for(const [name,driver]of [['chromium',chromium],['webkit',webkit]]){
 const browser=await driver.launch();try{for(const viewport of [{width:1440,height:1000},{width:390,height:844},{width:820,height:1180}]){
 const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));const before=counts.snapshot;
 await page.goto('http://127.0.0.1:'+server.address().port);await page.getByText('Independent native processing',{exact:true}).waitFor();assert.equal(counts.snapshot,before+1);
 await page.getByRole('tab',{name:'Configuration'}).click();await page.getByText('Read-only from web.',{exact:false}).waitFor();assert.equal(await page.getByRole('button',{name:'Configure on this desktop'}).count(),0);assert.equal(await page.locator('input').count(),0);
 await page.getByRole('tab',{name:'Activity'}).click();await page.getByRole('button',{name:/Transcript intake/}).click();await page.getByText('Not inferred from model status',{exact:true}).waitFor();await page.getByRole('button',{name:'Open Proteus run'}).click();assert.equal(await page.evaluate(()=>window.openedRun),'fixture-run');
 await page.getByRole('tab',{name:'Schedules'}).click();await page.getByRole('button',{name:'Open schedule'}).click();assert.equal(await page.evaluate(()=>window.openedSchedule),'omi-transcript-intake');
 await page.getByRole('tab',{name:'Services'}).click();const controls=counts.controls;await page.getByRole('button',{name:'Pause after current work'}).click();await page.getByText('paused',{exact:true}).waitFor();assert.equal(counts.controls,controls+1,'one explicit service control action');
 await page.getByRole('tab',{name:'Logs'}).click();const logs=counts.logs;await page.getByRole('button',{name:'Read metadata'}).click();await page.locator('.mn-log-record').waitFor();await page.locator('.mn-log-record summary').click();assert.equal(counts.logs,logs+1);assert.match(await page.locator('.mn-log-record').textContent(),/pending/);assert.doesNotMatch(await page.locator('body').textContent(),/private\/example/);
 await page.getByRole('tab',{name:'Overview'}).click();assert.ok(await page.getByText(/Stale snapshot/).count()>0);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no horizontal overflow');
 await page.screenshot({path:path.join(os.tmpdir(),`proteus-mnemosyne-${name}-${viewport.width}.png`),fullPage:true});
 await page.waitForTimeout(500);assert.equal(counts.snapshot,before+1,'tab switches and idle must not re-fetch');assert.deepEqual(errors,[]);await page.close();
 }}finally{await browser.close();}
 }console.log(JSON.stringify({passed:true,counts,checks:['shared production renderer','desktop-only configuration absent','schedule/run navigation','bounded explicit logs','stale evidence','phone/tablet/desktop widths','no idle fetches']}));
}finally{await new Promise(resolve=>server.close(resolve));}
