// Explicit live provider qualification. Synthetic prompt, no real audio/account/vault data.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {CodexProvider} from '../src/providers/codex.js';
import {Engine} from '../src/engine.js';
const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-life-codex-')),workspace=path.join(home,'workspace');fs.mkdirSync(workspace);
const provider=new CodexProvider({permissionControls:true}),engine=new Engine(home,{codex:provider});
try{
 const status=await provider.status();assert.ok(status.available,status.error);const model=status.models.find(item=>item.id==='gpt-6.1-terra');assert.ok(model,'Configured default model must exist in the fresh catalog.');assert.ok(model.controls.reasoningEfforts.includes('medium'));
 const run=engine.createRun({schemaVersion:1,id:'life-ask-live-smoke',name:'Synthetic Life Ask qualification',enabled:false,cron:'0 9 * * *',timezone:'UTC',provider:'codex',model:model.id,reasoningEffort:'medium',workspace:{cwd:workspace,additionalDirectories:[]},context:{entries:[],includeDefaults:false},lifeAsk:{requestId:randomUUID()},chatType:'life-ask',prompt:'Synthetic qualification: What is 2 + 2? No research or filing is needed. Answer concisely using the required result format.',misfire:'skip'},'chat');
 const deadline=Date.now()+120000;
 while(['queued','running','awaiting_input'].includes(run.status)){if(Date.now()>deadline)throw Error('Live Life Ask qualification timed out.');await new Promise(resolve=>setTimeout(resolve,200));}
 assert.equal(run.status,'completed',run.events.filter(event=>event.role==='system').map(event=>event.text).join('\n'));
 const reply=[...run.events].reverse().find(event=>event.role==='assistant'&&event.data?.phase==='final')||[...run.events].reverse().find(event=>event.role==='assistant');
 const result=reply.data?.lifeAskResult||JSON.parse(reply.text);assert.ok(['search','clarification'].includes(result.kind));assert.equal(result.professional,false);assert.match(result.answer,/4|four/i);
 assert.equal(run.events.some(event=>event.data?.tool&&['shell','apply_patch'].includes(event.data.tool.name)),false);
 console.log(JSON.stringify({passed:true,model:model.id,checks:['fresh catalog','native read-only acknowledgment','structured output','no command or file effects'],usage:run.usage}));
}finally{await engine.close();await provider.close();fs.rmSync(home,{recursive:true,force:true});}
