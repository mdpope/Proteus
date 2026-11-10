import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {startServer} from '../src/server.js';
import {revokeScheduleAccess} from '../src/services/scheduling/access-overlay.js';
import {revision} from '../src/services/scheduling/schedules.js';
import {commandIdentity,qualifyScopedCommandRuntime,runScopedCommand} from '../src/services/scheduling/host-scoped-executor.js';
import {until} from './remote-client.mjs';
const supported=process.platform==='darwin';
function fixture(t){const dir=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'host-execution-')));return {dir,schedule:{schemaVersion:1,id:'portable-fixture',name:'Portable fixture',provider:'codex',model:'fixture',workspace:{cwd:dir,additionalDirectories:[]},cron:'0 9 * * *',timezone:'UTC',misfire:'skip',prompt:'Process the synthetic inbox with proteus_exec',enabled:false,contextSelection:{selectedIds:[],includeDefaults:false},mcpServers:{},executionPermissions:{mode:'custom',sandboxedCommands:true,folders:[{path:dir,access:'read-write'}],rules:[]}}};}
test('actual host runtime denies filesystem/network escape with a clean environment',{skip:!supported},async()=>{
 const result=await qualifyScopedCommandRuntime({refresh:true});assert.equal(result.verified,true);assert.equal(result.modelTurnStarted,false);assert.equal(result.credentialIPC,'denied');
});
test('supervised native inbox command consent survives provider switch, replay and revocation',{skip:!supported},async t=>{
 const {dir,schedule}=fixture(t);let app,outputs=[],asks=0;
 t.after(async()=>{await app?.close();fs.rmSync(dir,{recursive:true,force:true,maxRetries:5});});
 fs.mkdirSync(path.join(dir,'inbox'));fs.mkdirSync(path.join(dir,'artifacts'));fs.writeFileSync(path.join(dir,'inbox','one.json'),JSON.stringify({id:'one',amount:3}));fs.writeFileSync(path.join(dir,'inbox','two.json'),JSON.stringify({id:'two',amount:7}));
 fs.writeFileSync(path.join(dir,'process.py'),'import json,pathlib\nr=pathlib.Path("."); records=[json.loads(p.read_text()) for p in sorted((r/"inbox").glob("*.json"))]; result={"count":len(records),"total":sum(v["amount"] for v in records)}; (r/"artifacts"/"totals.json").write_text(json.dumps(result,sort_keys=True)); print(json.dumps(result,sort_keys=True))\n');
 const argv=['/usr/bin/python3','process.py'];
 const adapter={status:async()=>({available:true,models:[{id:'fixture'}]}),run:async({scopedTools,emit})=>{const tool=scopedTools.find(tool=>tool.name==='proteus_exec');assert.ok(tool);const args={operationId:randomUUID(),argv};const result=JSON.parse(await tool.handler(args));assert.equal(result.exitCode,0,result.stderr);const replay=JSON.parse(await tool.handler(args));assert.equal(replay.replayed,true);assert.equal(replay.stdout,result.stdout);outputs.push(JSON.parse(result.stdout));emit('assistant','Synthetic inbox processed.');}};
 app=await startServer({home:path.join(dir,'owner'),port:0,timers:false,withSeed:false,providers:{codex:adapter,copilot:adapter,claude:adapter}});app.engine.schedules.save(schedule);
 for(const provider of ['codex','copilot','claude']){
  const current=app.engine.schedules.get(schedule.id);app.engine.schedules.save({...current,provider},revision(current));const run=app.engine.createRun(app.engine.schedules.get(schedule.id),'manual');
  await until(()=>run.pending||['completed','failed'].includes(run.status));
  if(run.pending){asks++;assert.equal(provider,'codex');assert.equal(run.pending.details.kind,'scoped-command');app.engine.reply(run.id,'allow-schedule',run.pending.id);}
  await until(()=>['completed','failed'].includes(run.status));assert.equal(run.status,'completed',JSON.stringify(run.events.slice(-2)));
 }
 assert.equal(asks,1);assert.deepEqual(outputs,[{count:2,total:10},{count:2,total:10},{count:2,total:10}]);assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,'artifacts','totals.json'))),{count:2,total:10});
 const saved=app.engine.schedules.get(schedule.id);assert.equal(saved.accessOverlay.grants.filter(grant=>grant.command).length,1);
 const revoked=revokeScheduleAccess(saved,saved.accessOverlay.grants.find(grant=>grant.command).id);app.engine.schedules.save(revoked,revision(saved));
 const denied=app.engine.createRun(app.engine.schedules.get(schedule.id),'manual');await until(()=>denied.pending||denied.status==='failed');assert.ok(denied.pending);app.engine.reply(denied.id,'deny',denied.pending.id);await until(()=>denied.status==='failed');assert.equal(outputs.length,3);
 const before=commandIdentity(saved,argv);fs.appendFileSync(path.join(dir,'process.py'),'\n# changed source\n');assert.notEqual(commandIdentity(saved,argv).digest,before.digest);
 const run=app.engine.createRun(saved,'manual');await until(()=>run.pending||run.status==='failed');assert.ok(run.pending);app.engine.reply(run.id,'deny',run.pending.id);await until(()=>run.status==='failed');assert.equal(outputs.length,3);
});

test('native most-specific folders preserve read-only areas and writable nested exceptions',{skip:!supported},async t=>{
 const {dir,schedule}=fixture(t);t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const readonly=path.join(dir,'readonly'),writable=path.join(readonly,'inbox');fs.mkdirSync(writable,{recursive:true});
 schedule.executionPermissions.folders.push({path:readonly,access:'read'},{path:writable,access:'read-write'});
 const code='const fs=require("fs");let denied=false;try{fs.writeFileSync("readonly/no","no")}catch{denied=true}fs.writeFileSync("readonly/inbox/yes","yes");console.log(JSON.stringify({denied}))';
 const result=await runScopedCommand(schedule,[process.execPath,'-e',code]);assert.equal(result.exitCode,0,result.stderr);assert.equal(JSON.parse(result.stdout).denied,true);assert.equal(fs.readFileSync(path.join(writable,'yes'),'utf8'),'yes');
});

test('explicit command variations remain scoped and revocation stops an active child',{skip:!supported},async t=>{
 const {dir,schedule}=fixture(t);let app,step=0,results=[];
 t.after(async()=>{await app?.close();fs.rmSync(dir,{recursive:true,force:true,maxRetries:5});});
 const adapter={status:async()=>({available:true,models:[{id:'fixture'}]}),run:async({scopedTools,emit})=>{
  const argv=step++<2?[process.execPath,'-e','console.log(process.argv[1])',String(step)]:[process.execPath,'-e','require("fs").writeFileSync("started.json","true");setInterval(()=>{},1000)'];
  results.push(JSON.parse(await scopedTools.find(tool=>tool.name==='proteus_exec').handler({operationId:randomUUID(),argv})));emit('assistant','Synthetic scoped command finished.');
 }};
 app=await startServer({home:path.join(dir,'owner'),port:0,timers:false,withSeed:false,providers:{codex:adapter}});app.engine.schedules.save(schedule);
 const first=app.engine.createRun(app.engine.schedules.get(schedule.id),'manual');await until(()=>first.pending||first.status==='failed');assert.ok(first.pending);app.engine.reply(first.id,'allow-schedule-scoped',first.pending.id);await until(()=>first.status==='completed');
 const second=app.engine.createRun(app.engine.schedules.get(schedule.id),'manual');await until(()=>second.pending||['completed','failed'].includes(second.status));assert.equal(second.status,'completed');assert.equal(second.pending,null);assert.equal(results[1].stdout.trim(),'2');
 const third=app.engine.createRun(app.engine.schedules.get(schedule.id),'manual');await until(()=>fs.existsSync(path.join(dir,'started.json'))||third.pending||third.status==='failed');assert.equal(third.pending,null);assert.equal(third.status,'running');
 const saved=app.engine.schedules.get(schedule.id),grant=saved.accessOverlay.grants.find(grant=>grant.commandScope);
 const response=await fetch(app.origin+'/api/schedule-access/revoke',{method:'POST',headers:{Authorization:'Bearer '+app.token,'Content-Type':'application/json'},body:JSON.stringify({scheduleId:schedule.id,grantId:grant.id,expectedRevision:revision(saved)})});assert.equal(response.status,200);await until(()=>third.status==='completed');assert.equal(results[2].revoked,true);assert.notEqual(results[2].exitCode,0);
});

test('relative virtualenv invocation keeps its environment while pinning the actual interpreter',{skip:!supported},async t=>{
 const {dir,schedule}=fixture(t);t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const {execFileSync}=await import('node:child_process');execFileSync('/usr/bin/python3',['-m','venv','--without-pip',path.join(dir,'.venv')]);
 const argv=['./.venv/bin/python3','-c','import sys;print(sys.prefix)'];const identity=commandIdentity(schedule,argv);assert.ok(path.isAbsolute(identity.executable));
 const result=await runScopedCommand(schedule,argv);assert.equal(result.exitCode,0,result.stderr);assert.equal(result.stdout.trim(),path.join(dir,'.venv'));
});

test('data-volume aliases and unapproved executable identity reads cannot escape Mac scope',{skip:!supported},async t=>{
 const {dir,schedule}=fixture(t),outside=path.join(path.dirname(dir),randomUUID());fs.writeFileSync(outside,'synthetic outside scope');fs.chmodSync(outside,0o700);t.after(()=>{fs.rmSync(dir,{recursive:true,force:true});fs.rmSync(outside,{force:true});});
 assert.throws(()=>commandIdentity(schedule,[outside]),/outside/);
 const alias='/System/Volumes/Data'+outside,code='try{require("fs").readFileSync(process.argv[1]);console.log("escaped")}catch{console.log("denied")}';
 const result=await runScopedCommand(schedule,[process.execPath,'-e',code,alias]);assert.equal(result.exitCode,0,result.stderr);assert.equal(result.stdout.trim(),'denied');
});
