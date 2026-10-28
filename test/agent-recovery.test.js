import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Engine } from '../src/engine.js';
import { chatRecoveryState } from '../public/features/chats/chat-recovery-state.js';
const until = async check => { for (let i=0;i<200;i++) { if (check()) return; await new Promise(r=>setTimeout(r,10)); } throw new Error('Timed out'); };
const schedule = (home,prompt) => ({schemaVersion:1,id:'agents-'+Math.random().toString(36).slice(2),name:'Agents',enabled:false,cron:'* * * * *',timezone:'UTC',provider:'rehearsal',model:'',workspace:{cwd:home,additionalDirectories:[]},misfire:'skip',prompt});

test('an incompatible-agent rejection records the agents and retries the original request', async () => {
  const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-agent-recovery-'));const prompts=[];let reject=true;
  const engine=new Engine(home,{rehearsal:{run:async({prompt})=>{prompts.push(prompt);if(reject)throw Object.assign(new Error('Codex cannot yet enforce the declared tool filters for: Mail Operator.'),{code:'PROVIDER_AGENT_TOOL_FILTERS',agents:[{id:'agent-entry',name:'Mail Operator'}]});}}});
  try {
    const run=engine.createRun(schedule(home,'Draft the HOA fee email'),'chat');await until(()=>run.status==='failed');
    // A generic continuation must not replace the original request as the retry target.
    engine.resume(run.id,'Continue this conversation from where the interrupted turn left off.');await until(()=>run.status==='failed'&&prompts.length===2);
    const failure=run.events.at(-1).data.failure;
    assert.equal(failure.kind,'incompatible-agents');assert.deepEqual(failure.agents,[{id:'agent-entry',name:'Mail Operator'}]);
    assert.equal(failure.retryPrompt,'Draft the HOA fee email');assert.equal(failure.attachmentsOmitted,false);
    const state=chatRecoveryState({...run,trigger:'chat'});assert.deepEqual(state.incompatibleAgents,[{id:'agent-entry',name:'Mail Operator'}]);
    reject=false;engine.resume(run.id,failure.retryPrompt);await until(()=>run.status==='completed');
    assert.equal(prompts.at(-1),'Draft the HOA fee email');
    const other=engine.createRun(schedule(home,'Other'),'chat');reject=true;await until(()=>other.status==='failed');
    assert.equal(chatRecoveryState({...other,trigger:'chat',events:other.events.map(event=>event.data?.failure?{...event,data:{failure:{kind:'error'}}}:event)}).incompatibleAgents,null);
  } finally { await engine.close(); fs.rmSync(home,{recursive:true,force:true}); }
});
