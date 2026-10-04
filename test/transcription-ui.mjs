import { _electron as electron } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-transcription-ui-'));
const native=path.join(home,'native'),policy=path.join(home,'policy'),automations=path.join(home,'automations');
for(const dir of [native,policy,automations])fs.mkdirSync(dir);
fs.writeFileSync(path.join(native,'config.json'),JSON.stringify({state_dir:native,semantic:{wtbos_root:policy}}));fs.writeFileSync(path.join(native,'omi_worker.py'),'# Synthetic only');
for(const file of ['AGENTS.md','agent/transcript-intake.md','agent/omi-transcript-intake.md','plugins/milo/skills/transcript-intake/SKILL.md']){fs.mkdirSync(path.dirname(path.join(policy,file)),{recursive:true});fs.writeFileSync(path.join(policy,file),'Synthetic policy');}
fs.mkdirSync(path.join(policy,'automations'));
for(const [id,manifestId,hour,minute,rule] of [['cerebro-transcript-intake','cerebro-transcript-intake',null,15,'FREQ=HOURLY;INTERVAL=1;BYMINUTE=15;BYSECOND=0'],['cerebro-transcript-follow-up-review','cerebro-transcript-review',20,45,'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR,SA,SU;BYHOUR=20;BYMINUTE=45;BYSECOND=0']]){
 const fields={id,name:'Synthetic transcript source',status:'ACTIVE',model:'test-model',reasoning_effort:'low',prompt:'Synthetic workflow only; never run.',cwds:[home],rrule:rule};
 fs.mkdirSync(path.join(automations,id));fs.writeFileSync(path.join(automations,id,'automation.toml'),Object.entries(fields).map(([k,v])=>`${k} = ${JSON.stringify(v)}`).join('\n'));
 fs.writeFileSync(path.join(policy,'automations',manifestId+'.json'),JSON.stringify({schema_version:1,id:manifestId,timezone:'America/Denver',schedule:{weekdays:['MO','TU','WE','TH','FR','SA','SU'],hours:hour===null?Array.from({length:24},(_,i)=>i):[hour],minute},model:fields.model,reasoning_effort:fields.reasoning_effort,prompt:fields.prompt}));
}
let app;
try{
 app=await electron.launch({cwd:root,args:[root,'--user-data-dir='+path.join(home,'browser')],env:{...process.env,PROTEUS_HOME:home,PORT:'0'},timeout:60000});
 const page=await app.firstWindow(),errors=[];page.on('pageerror',error=>errors.push(error.message));await page.locator('[data-page="omi"]').waitFor();
 await app.evaluate(async({app},{native,policy,automations})=>{const service=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService();service.omi.launchdProbe=async()=>({state:'loaded'});const s=service.omi.getSettings();await service.omi.saveSettings({...s,pipelineRoot:native,pythonPath:process.execPath,workerPath:native+'/omi_worker.py',configPath:native+'/config.json',workflowRoot:policy,automationRoot:automations},s.revision);},{native,policy,automations});
 await page.locator('[data-page="omi"]').click();await page.getByRole('heading',{name:'Transcription',exact:true}).waitFor();await page.getByText('Observation mode · execution disabled',{exact:true}).waitFor();
 await page.getByRole('tab',{name:'Settings',exact:true}).click();await page.locator('[name="timeoutMinutes"]').fill('90');
 await page.locator('[data-transcription-area="general"]').click();await page.getByText('Observation mode · general intake disabled',{exact:true}).waitFor();assert.equal(await page.getByText('Installed automation matches canonical policy and cadence.',{exact:true}).count(),2);
 await page.screenshot({path:path.join(os.tmpdir(),'proteus-transcription-general.png')});
 await page.getByRole('tab',{name:'Settings',exact:true}).click();assert.equal(await page.locator('[name="workflowRoot"]').inputValue(),policy);await page.locator('[name="intakeTakeoverConfirmed"]').check();await page.locator('[name="intakeEnabled"]').check();await page.getByRole('button',{name:'Save settings',exact:true}).click();await page.getByText('The source Codex automations must be paused before Proteus can own general intake.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Discard draft',exact:true}).click();assert.equal(await page.locator('[name="intakeEnabled"]').isChecked(),false);
 await page.getByRole('tab',{name:'Schedules',exact:true}).click();await page.getByRole('button',{name:'Prepare disabled schedules'}).click();await page.locator('[data-omi-schedule="omi-transcript-intake"]').waitFor();assert.equal(await page.locator('[data-omi-schedule]').count(),2);
 await page.locator('[data-transcription-area="omi"]').click();await page.getByRole('tab',{name:'Schedules',exact:true}).click();await page.getByRole('button',{name:'Prepare disabled schedules'}).click();await page.locator('[data-omi-schedule="omi-audio-worker"]').waitFor();assert.equal(await page.locator('[data-omi-schedule]').count(),3);
 const state=await page.evaluate(async()=>fetch('/api/state').then(r=>r.json()));const schedules=state.schedules.filter(s=>s.integration?.type==='omi');assert.equal(schedules.length,5);assert.ok(schedules.every(s=>s.enabled===false));
 const disabled=await page.evaluate(async()=>{const r=await fetch('/api/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:'omi-transcript-intake'})});return {status:r.status,body:await r.json()};});assert.equal(disabled.status,400);assert.match(disabled.body.error,/General transcript intake is disabled/);
 await page.getByRole('tab',{name:'Settings',exact:true}).click();await page.locator('[name="timeoutMinutes"]').fill('88');await page.locator('[data-transcription-area="general"]').click();await page.getByRole('tab',{name:'Settings',exact:true}).click();await page.locator('[data-transcription-area="omi"]').click();await page.getByRole('tab',{name:'Settings',exact:true}).click();assert.equal(await page.locator('[name="timeoutMinutes"]').inputValue(),'88');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,checks:['Transcription umbrella','separate areas','canonical source verification','active source cutover refused','area-only paused preparation','five stable IDs','generic run gate','cross-area draft preservation'],screenshot:path.join(os.tmpdir(),'proteus-transcription-general.png')}));
}finally{if(app)await app.close();fs.rmSync(home,{recursive:true,force:true});}
