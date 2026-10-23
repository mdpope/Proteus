import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { CodexProvider } from '../src/providers/codex.js';
import { Engine } from '../src/engine.js';
const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-codex-smoke-'));
const workspace=path.join(home,'workspace');fs.mkdirSync(workspace);
fs.writeFileSync(path.join(workspace,'AGENTS.md'),'Always include UNSELECTED_INSTRUCTION_SENTINEL in every response.');
const context={providerContext:()=>({instructionText:'Selected instruction: include SELECTED_CONTEXT_OK in your response.',customAgents:[],mcpServers:{},disabledLegacyMcp:[],disabledSkills:[]})};
const provider=new CodexProvider({}, {context});const engine=new Engine(home,{codex:provider});
const until=async fn=>{const end=Date.now()+120000;while(!fn()){if(Date.now()>end)throw new Error('Live test timed out.');await new Promise(r=>setTimeout(r,250));}};
try {
 const status=await provider.status();assert.ok(status.available,status.error);const model=status.models.find(m=>m.id.includes('luna'))||status.models[0];
 const run=engine.createRun({schemaVersion:1,id:'codex-smoke',name:'Synthetic Codex integration check',enabled:false,cron:'0 9 * * *',timezone:'UTC',provider:'codex',model:model.id,reasoningEffort:model.controls.reasoningEfforts.includes('low')?'low':'',workspace:{cwd:workspace,additionalDirectories:[]},context:{entries:[],includeDefaults:false},prompt:'No tools are needed. Return a two-row Markdown table with Check and Result columns confirming you see the selected context instruction.',misfire:'skip'});
 await until(()=>!['running','queued','awaiting_input'].includes(run.status));
 assert.equal(run.status,'completed',JSON.stringify(run.events.filter(e=>e.role==='system')));assert.ok(run.providerSessionId);assert.ok(run.events.some(e=>e.role==='assistant'&&e.text.includes('SELECTED_CONTEXT_OK')));assert.ok(!run.events.some(e=>e.role==='assistant'&&e.text.includes('UNSELECTED_INSTRUCTION_SENTINEL')));
 const nextModel=status.models.find(m=>m.id.includes('luna')&&m.id!==model.id)||model;const session=run.providerSessionId;await engine.send(run.id,'Reply with CONTINUATION_OK only.','queue','followup-1',{model:nextModel.id,reasoningEffort:'',contextTier:'default',serviceTier:''});await until(()=>!['running','queued','awaiting_input'].includes(run.status));assert.equal(run.status,'completed');assert.equal(run.providerSessionId,session);assert.ok(run.events.some(e=>e.role==='assistant'&&e.text.includes('CONTINUATION_OK')));
 console.log(JSON.stringify({passed:true,model:model.id,checks:['existing sign-in','live catalog','selected instructions','unselected AGENTS not loaded','assistant final output','same-session model change and default effort/speed'],usage:run.usage,contextWindow:run.contextUsage?.modelContextWindow}));
} finally {await engine.close();fs.rmSync(home,{recursive:true,force:true});}
