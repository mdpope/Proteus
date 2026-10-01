import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { CopilotProvider } from '../src/copilot.js';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-permission-'));
const file=path.join(root,'probe.txt'); const marker='PROTEUS_READ_'+randomUUID();fs.writeFileSync(file,marker);
const provider=new CopilotProvider();const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),120000);
const run={id:randomUUID(),providerSessionId:null,schedule:{model:'gpt-6-luna',workspace:{cwd:root,additionalDirectories:[]}},usage:{inputTokens:0,outputTokens:0,observed:false}};
let approvals=0;const output=[];
try {
 await provider.run({run,prompt:`Use the view tool to read ${file} and reply with its exact text. Use no shell commands and do not read any other file.`,signal:controller.signal,update:()=>{},emit:(role,text)=>{output.push({role,text});if(role==='tool')console.log(text);},ask:async request=>{
  if(request.type==='permission' && request.details?.kind==='read' && path.resolve(request.details.path)===file){approvals++;return 'approve';}
  throw new Error('Unexpected operation in bounded fixture test: '+JSON.stringify(request));
 }});
 assert.ok(approvals>0,'The provider must exercise a real permission callback');assert.ok(output.some(e=>e.role==='assistant'&&e.text.includes(marker)),'The approved read must reach the model');assert.ok(!output.some(e=>e.text.startsWith('Tool failed')));
 console.log(JSON.stringify({passed:true,approvals,model:run.schedule.model,usage:run.usage}));
} finally {clearTimeout(timer);await provider.close();fs.rmSync(root,{recursive:true,force:true});}
