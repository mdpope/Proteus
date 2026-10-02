// Explicit opt-in: one synthetic model turn, then verify the same session on resume.
import { CopilotClient } from '@github/copilot-sdk';
import { copilotModel, validateModelOptions } from '../src/model-catalog.js';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import os from 'node:os';
if (!process.argv.includes('--run-live')) { console.log('Use --run-live to verify model options against the authenticated Copilot runtime.'); process.exit(0); }
const client=new CopilotClient();const id=randomUUID();let created=false;
try {
 await client.start();
 const models=(await client.rpc.models.list({})).models.map(copilotModel);
 const model=models.find(m=>m.id===(process.env.PROTEUS_TEST_MODEL||'gpt-6-sol'));
 assert.ok(model,'Requested model must be available');
 const config={sessionId:id,model:model.id,reasoningEffort:'none',contextTier:'long_context',workingDirectory:os.tmpdir(),skipCustomInstructions:true,enableConfigDiscovery:false,enableOnDemandInstructionDiscovery:false,enableSkills:false,enableFileHooks:false,mcpServers:{},onPermissionRequest:async()=>({kind:'reject'})};
 validateModelOptions(config,model);
 const session=await client.createSession(config);created=true;
 const first=await session.rpc.model.getCurrent();assert.equal(first.contextTier,'long_context');assert.equal(first.reasoningEffort,'none');
 const result = await session.sendAndWait({prompt:'Reply exactly PROTEUS_OPTIONS_OK. Do not use any tools.'},60000);
 assert.ok(result?.data?.content?.includes('PROTEUS_OPTIONS_OK'));
 await session.disconnect();
 const resumed=await client.resumeSession(id,config);const second=await resumed.rpc.model.getCurrent();assert.equal(second.contextTier,'long_context');assert.equal(second.reasoningEffort,'none');
 await resumed.disconnect();
 console.log(JSON.stringify({passed:true,model:model.id,models:models.length,effort:second.reasoningEffort,contextTier:second.contextTier,modelTurns:1}));
} finally {if(created)await client.deleteSession(id).catch(()=>{});await client.stop();}
