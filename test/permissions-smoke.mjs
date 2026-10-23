// Opt-in: uses the signed-in Copilot account and only synthetic temporary files.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Engine } from '../src/engine.js';
import { CopilotProvider } from '../src/providers/copilot.js';

if (!process.argv.includes('--run-live')) throw new Error('Pass --run-live to use Copilot credits for the synthetic permission test.');
const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-auto-smoke-'));
const workspace=path.join(home,'workspace');fs.mkdirSync(workspace);
const marker=`permission-fixture-${randomUUID()}`;fs.writeFileSync(path.join(workspace,'seed.txt'),marker);
fs.writeFileSync(path.join(workspace,'AGENTS.md'),'This is a synthetic permission test. Work only with seed.txt and result.txt in this directory. Do not read any user files, invoke external services, or search outside this directory.');
const provider=new CopilotProvider();const engine=new Engine(home,{copilot:provider});
const schedule={schemaVersion:1,id:'permission-smoke',name:'Synthetic auto-approval test',enabled:false,cron:'0 9 * * 1-5',timezone:'UTC',provider:'copilot',model:'gpt-6-luna',workspace:{cwd:workspace,additionalDirectories:[]},misfire:'skip',prompt:'Permission smoke test in a synthetic directory. Use a file-read tool to read seed.txt, then a file-write tool to create result.txt with exactly the same content. Finally run a shell command in this directory to verify the two files are equal. Work only on these two files. Do not ask for extra approval or read files elsewhere. Reply with the marker and the verification result.'};
try {
  engine.permissions.setMode(schedule,'autopilot');
  const run=engine.createRun(schedule);
  const deadline=Date.now()+150000;
  while(['queued','running','awaiting_input'].includes(run.status) && Date.now()<deadline) {
    if(run.pending) throw new Error(`Unexpected manual request: ${run.pending.type}/${run.pending.details?.kind || 'question'}`);
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  assert.equal(run.status,'completed');assert.equal(fs.readFileSync(path.join(workspace,'result.txt'),'utf8').trim(),marker);
  assert.ok(run.automaticApprovals>0);
  assert.ok(run.events.some(event=>event.data?.permission?.kind==='shell' && event.data.permission.automatic));
  console.log(JSON.stringify({passed:true,manualApprovals:0,automaticApprovals:run.automaticApprovals,usage:run.usage}));
} finally {await engine.close();for(let i=0;engine.running&&i<100;i++)await new Promise(resolve=>setTimeout(resolve,50));if(!engine.running)fs.rmSync(home,{recursive:true,force:true});}
