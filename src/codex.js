import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { createInterface } from 'node:readline';
import { browserTools } from './browser-tools.js';
import { displayText, toolSummary } from './tool-activity.js';
import { validateModelOptions } from './model-catalog.js';

export const codexExecutable = () => process.env.PROTEUS_CODEX_PATH || ['/opt/homebrew/bin/codex','/usr/local/bin/codex','/Applications/ChatGPT.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex','/Applications/Codex.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex','/Applications/ChatGPT.app/Contents/Resources/codex','/Applications/Codex.app/Contents/Resources/codex'].find(p=>fs.existsSync(p)) || 'codex';
export function codexModel(model) {
 const efforts=(model.supportedReasoningEfforts||[]).map(e=>typeof e==='string'?e:e.reasoningEffort);
 return {id:model.model||model.id,name:model.displayName||model.id,isDefault:model.isDefault,description:model.description,controls:{reasoningEfforts:efforts,reasoningSupported:efforts.length>0,defaultReasoningEffort:model.defaultReasoningEffort||null,contextTiers:[{id:'default',promptTokens:null,totalTokens:null}],maxOutputTokens:null,serviceTiers:(model.serviceTiers||[]).map(t=>({id:t.id||t.serviceTier,name:t.displayName||t.name||t.id||t.serviceTier})).filter(t=>t.id)}};
}
export class CodexRPC extends EventEmitter {
 constructor({command=codexExecutable(),args=[],cwd=os.homedir(),env=process.env}={}) {
  super();this.pending=new Map();this.sequence=0;this.stderr='';
  this.child=spawn(command,[...args,'app-server','--listen','stdio://','-c','project_doc_max_bytes=0','-c','features.skip_host_skill_discovery=true','-c','features.skill_mcp_dependency_install=false'],{cwd,env,stdio:['pipe','pipe','pipe']});
  this.child.stderr.on('data',chunk=>{this.stderr=(this.stderr+chunk).slice(-4000);});
  createInterface({input:this.child.stdout}).on('line',line=>{let msg;try{msg=JSON.parse(line);}catch{return;}if(msg.method){if(msg.id!==undefined)this.emit('request',msg);else this.emit('notification',msg);}else{const p=this.pending.get(msg.id);if(p){this.pending.delete(msg.id);clearTimeout(p.timer);msg.error?p.reject(new Error(msg.error.message)):p.resolve(msg.result);}}});
  const ended=error=>{this.closedError=error;for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(error);}this.pending.clear();this.emit('closed',error);};
  this.child.stdin.on('error',ended); this.child.on('error',ended);this.child.on('exit',code=>ended(new Error(`Codex runtime exited (${code ?? 'signal'}). ${displayText(this.stderr,1000)}`)));
 }
 write(message){if(this.closedError)throw this.closedError;if(this.child.stdin.destroyed)throw new Error('Codex connection is closed.');this.child.stdin.write(JSON.stringify(message)+'\n');}
 request(method,params={},timeout=45000){return new Promise((resolve,reject)=>{const id=++this.sequence;const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error(`Codex ${method} timed out.`));},timeout);this.pending.set(id,{resolve,reject,timer});try{this.write({id,method,params});}catch(e){clearTimeout(timer);this.pending.delete(id);reject(e);}});}
 async initialize(){await this.request('initialize',{clientInfo:{name:'proteus',title:'Proteus',version:'0.1.0'},capabilities:{experimentalApi:true}});this.write({method:'initialized'});return this;}
 respond(id,result){if(!this.child.stdin.destroyed)this.write({id,result});}
 async close(){
  if(!this.child.pid||this.child.exitCode!==null||this.child.signalCode!==null)return;
  await new Promise(resolve=>{const timer=setTimeout(()=>this.child.kill('SIGKILL'),3000);timer.unref();this.child.once('exit',()=>{clearTimeout(timer);resolve();});this.child.once('error',()=>{clearTimeout(timer);resolve();});this.child.kill('SIGTERM');});
 }
}
export class CodexProvider {
 constructor(options={}, {browser,context}={}){this.options=options;this.browser=browser;this.context=context;this.active=null;this.client=null;this.starting=null;}
 async connect(){
  if(!this.starting){
   const client=this.options.clientFactory?this.options.clientFactory():new CodexRPC(this.options);this.client=client;
   client.on('closed',()=>{if(this.client===client){this.client=null;this.starting=null;}});
   this.starting=client.initialize().catch(e=>{client.close();if(this.client===client){this.client=null;this.starting=null;}throw e;});
  }
  await this.starting;return this.client;
 }
 async models(client){client ??= await this.connect();const result=[];let cursor;do{const page=await client.request('model/list',{limit:100,includeHidden:false,...(cursor?{cursor}:{})});result.push(...page.data.map(codexModel));cursor=page.nextCursor;}while(cursor);return result;}
 async status(){try{const client=await this.connect();const [account,models]=await Promise.all([client.request('account/read',{refreshToken:false}),this.models(client)]);return {provider:'codex',available:!!account.account,models,error:account.account?null:'Sign in with codex login on this Mac.',capabilities:{steering:true,context:'Selected instructions and skills; native Codex sessions and approvals.'}};}catch(error){return {provider:'codex',available:false,models:[],error:error.message};}}
 async quota(){const client=await this.connect();return client.request('account/rateLimits/read',{});}
 async steer(run,prompt){const a=this.active;if(!a||a.run.id!==run.id||!a.turnId)throw new Error('Codex is still starting or the turn ended. Queue this message.');await a.client.request('turn/steer',{threadId:run.providerSessionId,expectedTurnId:a.turnId,input:[{type:'text',text:prompt}]});}
 async run({run,prompt,emit,ask,update,signal,stream}){
  const client=await this.connect();const model=(await this.models(client)).find(m=>m.id===run.schedule.model);if(!model)throw new Error('Choose an available Codex model from the provider catalog.');validateModelOptions(run.schedule,model);
  const snapshot=run.schedule.context, managed=snapshot&&this.context?this.context.providerContext(snapshot):null;
  // Tool scopes are an execution contract. Do not silently drop provider-specific restrictions.
  const restricted=managed?.customAgents.filter(a=>a.tools!==null);
  if(restricted?.length)throw new Error(`Codex cannot yet enforce the declared tool filters for: ${restricted.map(a=>a.displayName).join(', ')}. Use an unrestricted agent or deselect these agents for this Codex chat.`);
  const native=await client.request('config/read',{includeLayers:true});const existing={};for(const layer of native.layers||[])Object.assign(existing,layer.config?.mcp_servers||{});
  Object.assign(existing,native.config?.mcp_servers||{});
  const plugins={};for(const layer of native.layers||[])Object.assign(plugins,layer.config?.plugins||{});Object.assign(plugins,native.config?.plugins||{});
  const selected=managed?{...Object.fromEntries(Object.entries(snapshot.includeDefaults!==false?run.schedule.mcpServers||{}:{}).filter(([name])=>!managed.disabledLegacyMcp.includes(name))),...managed.mcpServers}:run.schedule.mcpServers||{};
  if(run.schedule.skillDirectories?.length && snapshot?.includeDefaults!==false)throw new Error('For Codex, select individual skills from the context list; legacy skill directories are not supported.');
  const mcp=Object.fromEntries(Object.keys(existing).map(name=>[name,{enabled:false}]));
  for(const [name,def] of Object.entries(selected)){
    const answer=await ask({type:'permission',question:`Allow ${name} server tools for this Codex turn?`,details:{kind:'mcp',serverName:name,toolName:'*',intention:`Enable the selected ${name} MCP server for this turn. Codex manages individual tool execution.`,readOnly:false}});
    if(!['approve','approve-auto'].includes(answer))throw new Error('Selected MCP server declined: '+name);
    if(def.type==='sse')throw new Error('Codex requires streamable HTTP for remote MCP servers. Update the selected server transport first.');
    if(def.type==='http')mcp[name]={enabled:true,url:def.url,...(def.headers?{http_headers:def.headers}:{})};
    else mcp[name]={enabled:true,command:def.command,args:def.args||[],env:def.env||{},cwd:def.workingDirectory||def.cwd||run.schedule.workspace.cwd};
    if(def.tools?.length&&!def.tools.includes('*'))mcp[name].enabled_tools=def.tools;
  }
  const roots=[run.schedule.workspace.cwd,...run.schedule.workspace.additionalDirectories];
  const browser=browserTools(this.browser,run.id);const items=new Map();const calls=new Map();
  let resolveTurn,rejectTurn,settled=false,abortTimer;const completed=new Promise((resolve,reject)=>{resolveTurn=resolve;rejectTurn=reject;});completed.catch(()=>{});
  const active={run,client,turnId:null};this.active=active;
  const onNotification=({method,params:p={}})=>{
   if(p.threadId&&p.threadId!==run.providerSessionId)return;
   if(method==='turn/started')active.turnId=p.turn.id;
   if(method==='item/agentMessage/delta')stream(p.itemId,p.delta);
   if(method==='thread/tokenUsage/updated'){run.usage={observed:true,inputTokens:p.tokenUsage.total.inputTokens,outputTokens:p.tokenUsage.total.outputTokens};run.contextUsage=p.tokenUsage;update();}
   if(method==='turn/plan/updated')emit('system',(p.explanation?p.explanation+'\n\n':'')+(p.plan||[]).map(x=>`- [${x.status==='completed'?'x':' '}] ${x.step}`).join('\n'));
   if(method==='error'&&p.willRetry)emit('system','Codex is retrying: '+displayText(p.error?.message||'temporary provider error',1500));
   if(method==='error'&&!p.willRetry)rejectTurn(new Error(p.error?.message||'Codex turn failed.'));
   if(method==='item/started'||method==='item/completed'){
    const item=p.item;items.set(item.id,item);
    if(item.type==='agentMessage'&&method==='item/completed'){if(run.liveMessages)delete run.liveMessages[item.id];emit('assistant',item.text,{phase:item.phase});}
    else if(item.type==='contextCompaction'&&method==='item/completed')emit('system','Codex compacted conversation context.');
    else if(['commandExecution','fileChange','mcpToolCall','dynamicToolCall','webSearch','imageView'].includes(item.type)){
      const name=item.type==='commandExecution'?'shell':item.type==='fileChange'?'apply_patch':item.tool||item.type;
      const args=item.arguments||{command:item.command,cwd:item.cwd,path:item.path,query:item.query};
      let tool=calls.get(item.id);if(!tool){tool={callId:item.id,name,summary:toolSummary(name,args,item.type==='fileChange'?'Edit · '+(item.changes||[]).map(c=>c.path).join(', '):undefined),status:'running',startedAt:new Date().toISOString(),arguments:displayText(item.type==='fileChange'?(item.changes||[]).map(c=>'*** Update File: '+c.path+'\n'+(c.diff||'')).join('\n'):args,6000)};calls.set(item.id,tool);emit('tool',tool.summary,{tool});}
      if(method==='item/completed'){tool.status=item.status==='failed'||(item.exitCode!=null&&item.exitCode!==0)?'failed':item.status==='declined'?'interrupted':'completed';tool.output=displayText(item.aggregatedOutput||item.result||item.contentItems?.map(x=>x.text).filter(Boolean).join('\n')||item.changes||'');tool.error=item.error?displayText(item.error):item.exitCode?`Command exited with code ${item.exitCode}.`:null;tool.durationMs=item.durationMs??Date.now()-Date.parse(tool.startedAt);tool.finishedAt=new Date().toISOString();}update();
    }
   }
   if(method==='item/commandExecution/outputDelta'){const tool=calls.get(p.itemId);if(tool){tool.output=displayText((tool.output||'')+p.delta);update();}}
   if(method==='turn/completed'){settled=true;clearTimeout(abortTimer);if(p.turn.status==='completed')resolveTurn();else rejectTurn(new Error(p.turn.error?.message||'Codex turn '+p.turn.status));}
  };
  const onRequest=async msg=>{const p=msg.params||{};if(p.threadId&&p.threadId!==run.providerSessionId)return client.respond(msg.id,{decision:'decline'});try{
   if(msg.method==='item/tool/call'){
     const tool=browser.find(t=>t.name===p.tool);if(!tool)throw new Error('Unknown Proteus tool.');
     const answer=await ask({type:'permission',question:'Allow browser action?',details:{kind:'custom-tool',toolCallId:p.callId,toolName:p.tool,args:p.arguments,intention:`Browser ${p.arguments?.action||'action'}`}});
     const result=['approve','approve-auto'].includes(answer)?await tool.handler(p.arguments):{resultType:'failure',textResultForLlm:'User declined.'};
     client.respond(msg.id,{success:result?.resultType!=='failure',contentItems:[{type:'inputText',text:typeof result==='string'?result:result.textResultForLlm||JSON.stringify(result)}]});
   }else if(msg.method==='item/commandExecution/requestApproval'){
     const answer=await ask({type:'permission',question:p.reason||'Allow this command?',details:{kind:'shell',toolCallId:p.itemId,fullCommandText:p.command,reason:p.reason,requestSandboxBypass:!!p.additionalPermissions,managedApprovalRequired:!!p.networkApprovalContext}});client.respond(msg.id,{decision:['approve','approve-auto'].includes(answer)?'accept':'decline'});
   }else if(msg.method==='item/fileChange/requestApproval'){
     const changes=items.get(p.itemId)?.changes||[];let allowed=changes.length>0;
     for(const change of changes){const answer=await ask({type:'permission',question:p.reason||'Allow this file change?',details:{kind:'write',toolCallId:p.itemId,fileName:change.path,intention:'Edit '+change.path}});if(!['approve','approve-auto'].includes(answer))allowed=false;}
     client.respond(msg.id,{decision:allowed?'accept':'decline'});
   }else if(msg.method==='item/tool/requestUserInput'){
     const answers={};for(const q of p.questions||[])answers[q.id]={answers:[await ask({type:'question',question:q.question,choices:q.options?.map(x=>x.label)})]};client.respond(msg.id,{answers});
   }else if(msg.method==='mcpServer/elicitation/request')client.respond(msg.id,{action:'decline',content:null});
   else client.write({id:msg.id,error:{code:-32601,message:'Unsupported approval or tool request: '+msg.method}});
  }catch(e){client.write({id:msg.id,error:{code:-32000,message:e.message}});}};
  const closed=e=>rejectTurn(e);client.on('notification',onNotification);client.on('request',onRequest);client.on('closed',closed);
  const abort=()=>{if(abortTimer)return;if(active.turnId)void client.request('turn/interrupt',{threadId:run.providerSessionId,turnId:active.turnId}).catch(()=>client.close());abortTimer=setTimeout(()=>{client.close();rejectTurn(new Error('Codex did not confirm interruption; its Proteus runtime was stopped.'));},5000);};signal.addEventListener('abort',abort,{once:true});
  try{
   const instructions=`You are working inside Proteus. Use only the selected sources below. Workspace folders:\n${roots.join('\n')}\n${managed?.instructionText||''}\n${(managed?.customAgents||[]).map(a=>`Agent: ${a.displayName}${a.name===managed.agent?' (main identity)':''}\n${a.prompt}`).join('\n\n')}\nEditor context: ${JSON.stringify(run.schedule.editorContext||null)}`;
   const config={project_doc_max_bytes:0,developer_instructions:instructions,mcp_servers:mcp,features:{skip_host_skill_discovery:true,skill_mcp_dependency_install:false,enable_mcp_apps:false,multi_agent:false},plugins:Object.fromEntries(Object.keys(plugins).map(name=>[name,{enabled:false}])),apps:{_default:{enabled:false}},web_search:'disabled'};
   const params={model:run.schedule.model,cwd:run.schedule.workspace.cwd,runtimeWorkspaceRoots:roots,approvalPolicy:'untrusted',approvalsReviewer:'user',sandbox:'read-only',developerInstructions:instructions,config};
   const thread=run.providerSessionId?await client.request('thread/resume',{...params,threadId:run.providerSessionId}):await client.request('thread/start',{...params,dynamicTools:browser.map(t=>({type:'function',name:t.name,description:t.description,inputSchema:t.parameters}))});
   run.providerSessionId=thread.thread.id;run.providerHome=process.env.CODEX_HOME||path.join(os.homedir(),'.codex');run.nativeSessionPath=thread.thread.path||null;run.modelCapabilities={id:model.id,controls:model.controls,capturedAt:new Date().toISOString()};run.explicitProviderContext={mcpNames:Object.keys(selected),skillDirectories:[],disabledSkills:managed?.disabledSkills||[]};if(snapshot){snapshot.suppliedAt=new Date().toISOString();snapshot.delivery='Codex thread configuration accepted';}update();
   if(signal.aborted)throw new Error('Cancelled');
   const result=await client.request('turn/start',{threadId:run.providerSessionId,input:[{type:'text',text:prompt}],effort:run.schedule.reasoningEffort||model.controls.defaultReasoningEffort||null,serviceTier:run.schedule.serviceTier||null});active.turnId=result.turn.id;if(signal.aborted){clearTimeout(abortTimer);abortTimer=null;abort();}await completed;
  }finally{clearTimeout(abortTimer);if(active.turnId&&!settled)await client.close();signal.removeEventListener('abort',abort);client.off('notification',onNotification);client.off('request',onRequest);client.off('closed',closed);for(const tool of calls.values())if(tool.status==='running')tool.status='interrupted';if(this.active===active)this.active=null;update();}
 }
 async close(){await this.client?.close();this.client=null;this.starting=null;}
}
