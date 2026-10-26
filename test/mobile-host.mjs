import { LiveBrowser } from '../src/services/browser/live-browser.js';
// Synthetic fixture only: never run against an operator's real data directory.
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { atomicJSON } from '../src/shared/files.js';
import { secret, seal } from '../src/services/remote/remote-crypto.js';
import { startServer } from '../src/server.js';
import { RehearsalProvider } from '../src/providers/rehearsal.js';
import { startRelay } from '../relay/server.js';
import { copilotModel } from '../src/models/model-catalog.js';
import { until } from './remote-client.mjs';
const fixtureRelayPort=Number(process.env.PROTEUS_TEST_RELAY_PORT||4328),fixtureHTTPPort=Number(process.env.PROTEUS_TEST_HTTP_PORT||4329);
const fixtureHTTPOrigin='http://127.0.0.1:'+fixtureHTTPPort,fixtureRelayOrigin='ws://127.0.0.1:'+fixtureRelayPort;
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'proteus-mobile-test-'));
const workspace = path.join(home, 'workspace'); fs.mkdirSync(workspace);
fs.writeFileSync(path.join(workspace, 'AGENTS.md'), '# Synthetic workspace instructions\nValidate the evidence.');
fs.mkdirSync(path.join(workspace, '.agents/skills/example'), { recursive: true }); fs.writeFileSync(path.join(workspace, '.agents/skills/example/SKILL.md'), '---\nname: Synthetic skill\n---\nUse synthetic evidence.');
atomicJSON(path.join(home, 'settings.json'), { schemaVersion: 1, provider: 'rehearsal', model: '', timezone: 'UTC', workspace: { cwd: workspace, additionalDirectories: [] }, skillDirectories: [], mcpServers: {} });
const token = secret(); let relay;
if (process.env.PROTEUS_TEST_CONTAINER === '1') {
  const envFile = path.join(home, 'relay.env'); fs.writeFileSync(envFile, `PROTEUS_RELAY_TOKEN=${token}\n`, { mode: 0o600 });
  execFileSync('docker', ['--context', 'colima-proteus', 'run', '--detach', '--rm', '--name', 'proteus-relay-test', '--read-only', '--cap-drop=ALL', '--security-opt=no-new-privileges', '--env-file', envFile, '-p', '127.0.0.1:'+fixtureRelayPort+':4318', 'proteus-relay:local'], { stdio: 'ignore' });
  relay = { port: fixtureRelayPort, close: async () => execFileSync('docker', ['--context', 'colima-proteus', 'stop', 'proteus-relay-test'], { stdio: 'ignore' }) };
} else relay = await startRelay({ port: fixtureRelayPort, token });
const rehearsal = new RehearsalProvider();
let authConnected = false;
let recoveryRun,recoveryAttempts=0;
const syntheticQuota = remaining => async () => ({available:true,windows:[{id:"synthetic",label:"Synthetic account allowance",remainingPercent:remaining,resetAt:"2099-10-05T12:00:00Z"}]});
const app = await startServer({ home, port: 0, timers: false, providers: { copilot: {
  quota: syntheticQuota(73),
  mcpStatus: async () => ({servers:[{name:'synthetic-integration',status:authConnected?'connected':'needs-auth',remote:true}]}),
  mcpLogin: async () => { setTimeout(()=>{authConnected=true;},1200); return {server:'synthetic-integration',status:'sign-in-required'}; },
  status: async () => ({available:true,models:[copilotModel({id:"synthetic-mobile",name:"Synthetic mobile",supportedReasoningEfforts:["none","high"],capabilities:{supports:{reasoningEffort:true},limits:{max_output_tokens:128000}},billing:{tokenPrices:{maxPromptTokens:272000,longContext:{maxPromptTokens:872000}}}})]}),
  async run(args) {
    if(args.prompt==='Structured questions rehearsal'){
      args.emit('assistant','Two structured questions for this rehearsal.',{providerItemId:'native-questions',userQuestions:[{title:'Choose a rehearsal destination',options:['Project A','Project B']},{title:'Any rehearsal instructions?'}]});return;
    }
    if(args.prompt.startsWith('Answer to your question:')){args.emit('assistant','Synthetic answer accepted. No external provider.');return;}
    if (args.prompt === 'Model options rehearsal') {
      args.emit('assistant', 'Local model-options rehearsal — no AI provider or tool was called.');
      await args.ask({type:'permission',question:'Allow synthetic model-options checkpoint?',details:{kind:'shell',fullCommandText:'synthetic model-options checkpoint; no process is executed'}});
      return;
    }
    return rehearsal.run(args);
  } }, rehearsal: {
  async run(args) {
    if(args.run.schedule.name==='Native recovery fixture'){
      recoveryAttempts++;
      if(recoveryAttempts===1)throw Error('Selected model is at capacity. Synthetic native retry.');
      args.emit('assistant','Recovered native fixture: '+args.prompt);return;
    }
    args.emit('tool', 'Read synthetic notes', { tool: { callId: 'synthetic-read', name: 'view', summary: 'Read synthetic notes', status: 'completed', arguments: '{"path":"fixture.md"}', output: 'Expanded synthetic tool result', durationMs: 120 } });
    if (args.prompt.includes('Permission rehearsal')) await args.ask({ type: 'permission', question: 'Allow synthetic command?', details: { kind: 'shell', fullCommandText: 'synthetic command; no process is executed' } });
    return rehearsal.run(args);
  }
}, codex:{status:async()=>({available:false,models:[]}),quota:syntheticQuota(41)},claude:{status:async()=>({available:false,models:[]}),quota:syntheticQuota(88)} } });
app.liveBrowser=new LiveBrowser({list:()=>[{id:'fixture-live-tab',title:'Synthetic desktop browser',agentControlling:true}],current:()=>true,capture:async()=>({revision:1,width:800,height:600,image:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='})});
const schedule = app.engine.schedules.list()[0]; app.engine.schedules.save({ ...app.engine.schedules.get(schedule.id), workspace: { cwd: workspace, additionalDirectories: [] } }, schedule.revision);
await app.remote.configure({ label: 'Build Mac', enabled: true, mode: 'external', relayURL: fixtureRelayOrigin, publicURL: fixtureRelayOrigin, relayToken: token });
await until(() => app.remote.status === 'online', 20_000);
const receive = app.remote.receive.bind(app.remote);
app.remote.receive = async (...args) => { try { return await receive(...args); } catch (error) { console.log('Synthetic protocol rejection: ' + error.message); throw error; } };
if(process.env.PROTEUS_TEST_PROTOCOL_TRACE==='1'){
 const command=app.remote.command.bind(app.remote),counts=new Map();
 app.remote.command=async(peer,message)=>{const method=message.method;counts.set(method,(counts.get(method)||0)+1);console.log('Synthetic command '+method+' '+counts.get(method));try{return await command(peer,message);}catch(error){console.log('Synthetic command error '+method+' '+error.message);throw error;}};
}
// A second independent execution host shares the relay, never the first host's state.
const secondHome = path.join(home, 'second-host'); fs.mkdirSync(secondHome);
const secondWorkspace = path.join(secondHome, 'workspace'); fs.mkdirSync(secondWorkspace);
fs.writeFileSync(path.join(secondWorkspace, 'AGENTS.md'), '# Synthetic second host only');
atomicJSON(path.join(secondHome, 'settings.json'), { schemaVersion: 1, provider: 'rehearsal', model: '', timezone: 'UTC', workspace: { cwd: secondWorkspace, additionalDirectories: [] }, skillDirectories: [], mcpServers: {} });
const unavailable = { status: async () => ({available:false,models:[],error:'Synthetic host'}) };
const second = await startServer({home: secondHome, port: 0, timers: false, providers: {rehearsal: new RehearsalProvider(), copilot: unavailable, codex: unavailable, claude: unavailable}});
await second.remote.configure({label:'Work Mac',enabled:true,mode:'external',relayURL:fixtureRelayOrigin,publicURL:fixtureRelayOrigin,relayToken:token});
await until(() => second.remote.status === 'online', 20_000);
const browserVisits = new Map();
let previewRevision = 1;
let projectFixture;
async function seedProjectFixture() {
  if (projectFixture) return projectFixture;
  const workspaceId = 'native-studio', otherWorkspaceId = 'native-personal';
  app.context.mutate(config => {
    const base = config.workspaces[0];
    config.workspaces.push({...structuredClone(base), id: workspaceId, name: 'Studio'});
    config.workspaces.push({...structuredClone(base), id: otherWorkspaceId, name: 'Personal'});
  }, app.context.config().revision);
  app.workspaceProjects.ensureProjects();
  let catalog = app.workspaceProjects.get(app.engine);
  catalog = app.workspaceProjects.projects({action:'create', workspaceId, name:'Design review', expectedRevision:catalog.revision}, app.engine);
  const project = catalog.projects.find(row => row.workspaceId === workspaceId && row.name === 'Design review');
  const chatIds = [];
  for (let index = 0; index < 9; index++) {
    const schedule = await app.buildChatSchedule({workspaceId, projectId:project.id, name:index ? `Synthetic project notes ${index}` : 'Review desktop navigation refinements', prompt:'Synthetic project fixture; no provider execution.', provider:'rehearsal'});
    const run = app.engine.createRun(schedule, 'chat', null, {deferStart:true});
    run.status = 'completed';
    run.lastActivityAt = new Date(Date.now() - (index + 1) * 60_000).toISOString();
    run.events.push({role:'assistant', text:'Synthetic project history remains available after organizational changes.', at:run.lastActivityAt});
    app.workspaceProjects.associate(run, project, app.engine);
    chatIds.push(run.id);
  }
  const initial = app.contentTabs.get('project', project.id);
  app.contentTabs.mutate({scope:'project', id:project.id, expectedRevision:initial.revision, operations:[
    {action:'open', tab:{id:'native-project-browser', type:'browser', title:'Synthetic project browser', url:fixtureHTTPOrigin+'/browser/one'}},
    {action:'open', tab:{id:'terminal:native-project-terminal', type:'terminal', terminalId:'native-project-terminal', title:'Synthetic terminal descriptor'}},
    {action:'open', tab:{id:'chat:'+chatIds[0], type:'chat', chatId:chatIds[0], title:'Review desktop navigation refinements'}}
  ]});
  app.contentTabs.mutate({scope:'workspace', id:workspaceId, expectedRevision:0, operations:[{action:'open', tab:{id:'native-direct-browser', type:'browser', title:'Direct workspace browser', url:fixtureHTTPOrigin+'/browser/two'}}]});
  projectFixture = {workspaceId, otherWorkspaceId, projectId:project.id, defaultProjectId:catalog.defaultProjectIds[workspaceId], chatIds};
  return projectFixture;
}
// Website-service rehearsal shared by both simulator previews; never reads a live account.
let previewTeamLists = [{id:'preview-team', revision:'1', name:'Platform Services Team', timezone:'America/Denver', instructions:'Review yesterday, today and any blockers.', members:[{id:'p1',name:'Alex',mode:'random'},{id:'p2',name:'Morgan',mode:'fixed'},{id:'p3',name:'Sam',mode:'random'}], links:[{id:'l1',title:'On Call — Operations',url:fixtureHTTPOrigin+'/browser/phone-preview?section=on-call'},{id:'l2',title:'Operational Health',url:fixtureHTTPOrigin+'/browser/one'},{id:'l3',title:'Team Queue',url:fixtureHTTPOrigin+'/browser/two'}]}, {id:'preview-review', revision:'1', name:'Design review', timezone:'UTC', instructions:'Review the current design.', members:[{id:'r1',name:'Taylor',mode:'fixed'}], links:[{id:'r-link',title:'Design notes',url:fixtureHTTPOrigin+'/browser/phone-preview?section=design-notes'}]}];
const fixture = http.createServer(async (req, res) => {
  if(req.url.startsWith('/native-app')) {
    res.setHeader('Content-Type','application/json');
    if(req.url==='/native-app' && req.method==='GET'){res.end(JSON.stringify({teamLists:previewTeamLists,links:[],identity:{accountId:'synthetic-service-account'}}));return;}
    try {
      let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>262144)throw new Error('Request too large.');}
      const body=JSON.parse(raw||'{}'),id=decodeURIComponent(req.url.slice('/native-app/team-lists/'.length)),index=previewTeamLists.findIndex(item=>item.id===id);
      if(req.url==='/native-app/team-lists'&&req.method==='POST'){previewTeamLists.push({...body,id:crypto.randomUUID(),revision:'1'});}
      else if(index>=0&&['PUT','DELETE'].includes(req.method)){
        if(body.expectedRevision!==previewTeamLists[index].revision){res.statusCode=409;res.end(JSON.stringify({error:'This list changed. Refresh before saving.'}));return;}
        if(req.method==='DELETE')previewTeamLists.splice(index,1);
        else {const prior=previewTeamLists[index];previewTeamLists[index]={...prior,...body,id,revision:String(Number(prior.revision)+1)};delete previewTeamLists[index].expectedRevision;}
      }else {res.statusCode=404;res.end(JSON.stringify({error:'List unavailable.'}));return;}
      res.end(JSON.stringify({ok:true}));
    }catch(error){res.statusCode=400;res.end(JSON.stringify({error:error.message}));}return;
  }
  if (req.url === '/projects-fixture') {
    const ids = await seedProjectFixture();
    res.writeHead(200, {'Content-Type':'application/json'}); res.end(JSON.stringify({...ids, catalog:app.workspaceProjects.get(app.engine), tabs:app.contentTabs.list({scope:'project'}), runs:ids.chatIds.map(id => app.engine.getRun(id))})); return;
  }
  if(req.url==='/logs-fixture'){
    let newest;for(let i=0;i<120;i++)newest=app.activity.log('error','synthetic.log','Rehearsal diagnostic '+i+'\n'+('    at synthetic-frame\n'.repeat(150)),{details:{position:i,password:'SYNTHETIC_HIDDEN'}});
    await app.activity.logs();res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({newestId:newest.id}));return;
  }
  if(req.url==='/history-settings-fixture'){
    // Synthetic owner pairing/profile catalogs only; no real pairing or account grant.
    app.peers={list:()=>[{hostId:second.remote.config.hostId,label:'Synthetic paired Mac',status:'offline',paused:false}],syncHistory:async()=>{}};
    const originalProfiles=app.browserProfiles.list.bind(app.browserProfiles);
    app.browserProfiles.list=()=>({...originalProfiles(),items:[{id:'default',name:'Default'},{id:'20000000-0000-4000-8000-000000000001',name:'Synthetic Work'}]});
    await app.browserHistory.settings({enabled:true,retentionDays:30,peers:[{hostId:second.remote.config.hostId,enabled:false,backfill:'7',profileIds:['default'],futurePreference:{keep:'owner value'}}]});
    await app.browserHistory.record({events:[{eventId:'30000000-0000-4000-8000-000000000001',url:'https://example.test/work-history',title:'Synthetic owner Work visit',visitedAt:new Date().toISOString(),profileId:'20000000-0000-4000-8000-000000000001',sourceHostId:app.remote.config.hostId}]});
    res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({peerId:second.remote.config.hostId,profileId:'20000000-0000-4000-8000-000000000001'}));return;
  }
  if(req.url==='/history-settings-fixture/state'){
    res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({owner:await app.browserHistory.settings(),otherOwner:await second.browserHistory.settings()}));return;
  }
  if(req.url==='/design-update'){previewRevision++;res.end('Updated synthetic preview');return;}
  if(req.url==='/preview-grant'){for(const device of app.remote.config.devices)app.remote.setDocumentAccess(device.id,true);res.end('Granted for synthetic test');return;}
  if(req.url==='/design/index.html'){res.setHeader('content-type','text/html');res.end(`<title>Relay design fixture</title><link rel="stylesheet" href="./style.css"><p id="version">Version ${previewRevision}</p><button id="action">Change sample</button><script type="module" src="./main.js"></script>`);return;}
  if(req.url==='/design/style.css'){res.setHeader('content-type','text/css');res.end('body{font:20px system-ui;background:#eef4e9;padding:20px}button{padding:12px}');return;}
  if(req.url==='/design/main.js'){res.setHeader('content-type','application/javascript');res.end(`document.querySelector('#action').onclick=()=>document.querySelector('#version').textContent='Changed version ${previewRevision}';`);return;}
  if(req.url==='/live-grant'){for(const device of app.remote.config.devices)app.remote.setBrowserAccess(device.id,true);res.end('Granted for synthetic test');return;}

  if(req.url==='/browser/downloads'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><h1>Native downloads fixture</h1><a download href="/browser/download-file">Download native fixture</a>');return;}
  if(req.url==='/browser/download-file'){const body=Buffer.from('Native WKDownload fixture');res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Disposition':'attachment; filename="native-fixture.txt"','Content-Length':body.length});res.end(body);return;}
  if (req.url.startsWith('/browser/phone-preview')) {
    res.writeHead(200, {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
    res.end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=5,user-scalable=yes"><title>Proteus phone browser rehearsal</title>${req.url.includes('nested=1')?'<style>html,body{height:100%;overflow:hidden;margin:0!important}.nested-scroll{height:100%;overflow:auto;padding:24px;box-sizing:border-box}</style>':''}<style>body{font:17px/1.65 system-ui;margin:24px;color:#e7eee5;background:#121a15}h1{font-size:28px;font-weight:600}a{color:#bedc93}p{margin:22px 0}</style><main class="nested-scroll"><h1>Proteus browser rehearsal</h1><p>Synthetic page for native scrolling, full URLs, page search and double-tap controls.</p><a href="/browser/two">Next browser page</a>${Array.from({length:24},(_,index)=>`<h2>Reading section ${index+1}</h2><p>This is disposable fixture content. Scroll the page and double tap to hide or restore the top controls. The browser navigation stays at the bottom.</p>`).join('')}</main>`);return;
  }
  if (req.url.startsWith('/browser/spa')) {
    res.writeHead(200, {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
    res.end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Synthetic SPA history</title><h1 id="step"></h1><p id="fragment"></p><button style="min-height:44px;padding:12px" onclick="nextStep()">SPA Next</button><button style="min-height:44px;padding:12px" onclick="history.replaceState({}, '', location.pathname+location.search+'&view=results')">SPA Replace</button><a href="#section">Hash section</a><script>function nextStep(){try{history.pushState({},'', '/browser/spa?step='+((Number(new URL(location.href).searchParams.get('step'))||1)+1));render()}catch(error){document.getElementById('fragment').textContent='Synthetic SPA error: '+error.message}}function render(){document.getElementById('step').textContent='SPA step '+(new URL(location.href).searchParams.get('step')||1);document.getElementById('fragment').textContent=location.hash?'Hash '+location.hash:'No hash'}addEventListener('popstate',render);addEventListener('hashchange',render);render()</script>`);return;
  }
  if (['/browser/one', '/browser/two', '/browser/three'].includes(req.url)) {
    const count = (browserVisits.get(req.url) || 0) + 1; browserVisits.set(req.url, count);
    const first = req.url.endsWith('/one'); const third = req.url.endsWith('/three');
    const title = first ? 'First' : third ? 'Third' : 'Second';
    res.writeHead(200, {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
    res.end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=5,user-scalable=yes"><title>${title} browser page</title><h1>${title} browser page</h1><p>Load ${count}</p><p id="page-scale"></p><a href="/browser/${first?'two':third?'two':'three'}">${third?'Previous':'Next'} browser page</a><script>function scaleStatus(){const text='Page scale '+visualViewport.scale.toFixed(2),label=document.getElementById('page-scale');if(label.textContent!==text)label.textContent=text}visualViewport.addEventListener('resize',scaleStatus);scaleStatus()</script>`);return;
  }
  if (req.url === '/latest') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ context: app.engine.listRuns()[0]?.schedule.context, reasoningEffort: app.engine.listRuns()[0]?.schedule.reasoningEffort, contextTier: app.engine.listRuns()[0]?.schedule.contextTier, queuedMessages: app.engine.listRuns()[0]?.queuedMessages })); return; }
  if(req.url==='/recovery-status'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({attempts:recoveryAttempts,status:recoveryRun?.status,queue:recoveryRun?.queuedMessages,retry:recoveryRun?.capacityRetry}));return;}
  if (!req.url.startsWith('/pair')) { res.writeHead(404); res.end(); return; }
  const target = req.url.includes('host=second') ? second : app;
  const projectIDs = req.url.includes('projects=1') ? await seedProjectFixture() : {};
  // Every native test starts with an idle synthetic runner, including after a failed test.
  for (const run of target.engine.listRuns()) if (['running', 'queued', 'awaiting_input'].includes(run.status)) target.engine.cancel(run.id);
  target.context.mutate(config => { config.favorites = []; }, target.context.config().revision);
  const defaults = target.settings.get();
  target.settings.save({...defaults,provider:req.url.includes("models=1")?"copilot":"rehearsal",model:req.url.includes("models=1")?"synthetic-mobile":"",reasoningEffort:"",contextTier:"default"},defaults.revision);
  authConnected = false;
  const key = secret(); const aad = 'synthetic:cross-platform';
  const invite = await target.remote.pairing();
  let previewRunId;
  if(req.url.includes('recovery=1')){
    recoveryAttempts=0;
    const schedule=await target.buildChatSchedule({name:'Native recovery fixture',prompt:'Synthetic native recovery',provider:'rehearsal'});
    recoveryRun=target.engine.createRun(schedule,'chat',null,{deferStart:true});
    recoveryRun.status='failed';delete recoveryRun.deferredStart;delete recoveryRun.nextPrompt;
    recoveryRun.failureEventAt=target.engine.now();
    target.engine.event(recoveryRun,'system','Selected model is at capacity. Synthetic native initial failure.',{failure:{kind:'capacity'}});
    recoveryRun.queuedMessages=[{id:'native-recovery-queue',prompt:'Native queued follow-up',at:target.engine.now()}];target.engine.persist(recoveryRun);
    previewRunId=recoveryRun.id;
  }
  if(req.url.includes('preview=1')){
    previewRevision=1;
    const schedule=await target.buildChatSchedule({name:'Automatic preview rehearsal',prompt:'Synthetic preview',provider:'rehearsal'});
    const run=target.engine.createRun(schedule,'chat',null,{deferStart:true});
    previewRunId=run.id;
    target.contentTabs.mutate({scope:'chat',id:run.id,expectedRevision:0,operations:[{action:'open',tab:{id:'preview-desktop-browser',type:'browser',title:'Design from desktop',url:fixtureHTTPOrigin+'/design/index.html'}}]});
  }
  res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ code: invite.code, hostId:target.remote.config.hostId,runId:previewRunId,...projectIDs,key, aad, box: seal(key, { test: 'CryptoKit ↔ Node' }, aad) }));
});
await new Promise(resolve => fixture.listen(fixtureHTTPPort, '127.0.0.1', resolve));
console.log('Synthetic mobile test host ready. Relay: ' + (process.env.PROTEUS_TEST_CONTAINER === '1' ? 'Docker container' : 'Node process'));
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await new Promise(resolve => fixture.close(resolve)); await app.close(); await second.close(); await relay.close(); fs.rmSync(home, { recursive: true, force: true }); process.exit(0); });
