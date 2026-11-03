import {subagentJournal} from '../services/chats/subagents.js';
import {questionAttachmentTools} from '../services/chats/question-attachments.js';
import {providerActivity} from '../shared/provider-activity.js';
import {attachmentText} from './provider-attachment-input.js';
import {chatControlTools} from '../services/chats/chat-control-tools.js';
import {privateTemporaryDirectory} from '../shared/private-paths.cjs';
import {windowsProviderExecutable} from './windows-provider.js';
import {linuxCodexExecutable} from './linux-provider.js';
import {integrationTools} from '../services/integrations/integration-tools.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { createInterface } from 'node:readline';
import {appInstructions,documentBridge} from '../services/chats/document-tools.js';
import { browserTools } from '../services/browser/browser-tools.js';
import {codexToolContent} from '../shared/tool-results.js';
import {captureAppCapabilities} from '../services/chats/app-capabilities.js';
import { displayText, toolSummary } from '../shared/tool-activity.js';
import { canonicalPath, effectivePermissionMode } from '../services/settings/permissions.js';
import { validateModelOptions } from '../models/model-catalog.js';
const proteusVersion=JSON.parse(fs.readFileSync(new URL('../../package.json',import.meta.url),'utf8')).version;

export function codexExecutable({platform=process.platform,env=process.env,home=os.homedir(),executable}={}) {
 if(env.PROTEUS_CODEX_PATH)return env.PROTEUS_CODEX_PATH;
 if(platform==='linux')return linuxCodexExecutable({env,home,...(executable?{executable}:{})});
 if(platform==='win32')return windowsProviderExecutable('codex',{env,home});
 return ['/opt/homebrew/bin/codex','/usr/local/bin/codex','/Applications/ChatGPT.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex','/Applications/Codex.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex','/Applications/ChatGPT.app/Contents/Resources/codex','/Applications/Codex.app/Contents/Resources/codex'].find(p=>fs.existsSync(p))||'codex';
}
export function codexModel(model) {
 const efforts=(model.supportedReasoningEfforts||[]).map(e=>typeof e==='string'?e:e.reasoningEffort);
 return {id:model.model||model.id,name:model.displayName||model.id,isDefault:model.isDefault,description:model.description,controls:{reasoningEfforts:efforts,reasoningSupported:efforts.length>0,defaultReasoningEffort:model.defaultReasoningEffort||null,contextTiers:[{id:'default',promptTokens:null,totalTokens:null}],maxOutputTokens:null,serviceTiers:(model.serviceTiers||[]).map(t=>({id:t.id||t.serviceTier,name:t.displayName||t.name||t.id||t.serviceTier})).filter(t=>t.id)}};
}
// Filesystem grants never imply approval of a shell command. Keep native untrusted
// approval routing; the engine applies the user's separate saved operation rules.
export function codexSandbox(schedule, profile, { desktopPreview = false, permissionControls = desktopPreview } = {}) {
 if(permissionControls&&profile?.workingFolders?.length){
  const cwd=canonicalPath(schedule.workspace.cwd,schedule.workspace.cwd);
  if(!cwd)throw Error('The working folder is unavailable.');
  const grants=[...profile.workingFolders,...(profile.mode==='ask'?[]:profile.folders||[])];
  const roots=[...new Set([cwd,...(schedule.workspace.additionalDirectories||[]),...grants.map(folder=>folder.path)].map(root=>canonicalPath(root,cwd)).filter(Boolean))].sort();
  const filesystem={':root':'read',':tmpdir':'read',':slash_tmp':'read',':workspace_roots':{'.':'read','.git':'read','.agents':'read','.codex':'read','.aws':'read'}};
  for(const folder of grants.toSorted((a,b)=>a.path.length-b.path.length||Number(a.access==='read')-Number(b.access==='read'))){
   if(canonicalPath(folder.path,cwd)!==folder.path)throw Error('A working-folder grant changed on disk. Refresh permissions.');
   filesystem[folder.path]=folder.access==='read-write'?'write':'read';
  }
  const name='proteus-workspace';
  return {cwd,sandbox:'workspace-write',runtimeWorkspaceRoots:roots,managedProfile:name,policy:{networkAccess:false},config:{default_permissions:name,permissions:{[name]:{extends:':workspace',filesystem,network:{enabled:false}}}}};
 }
 const roots=[...new Set([schedule.workspace.cwd,...(schedule.workspace.additionalDirectories||[]),...(profile?.chatFolders||[]).filter(folder=>!permissionControls || (profile.mode !== 'ask' && (profile.folders||[]).some(active=>active.path===folder.path))).map(folder=>folder.path),...(permissionControls && profile?.mode !== 'ask' ? profile?.folders || [] : []).map(folder=>folder.path)])];
 const readOnly={cwd:schedule.workspace.cwd,sandbox:'read-only',runtimeWorkspaceRoots:roots,policy:{type:'readOnly',networkAccess:false},config:{}};
 if(!(permissionControls ? ['custom','trusted','autopilot'] : ['trusted','autopilot']).includes(effectivePermissionMode(profile)))return readOnly;
 const cwd=canonicalPath(schedule.workspace.cwd,schedule.workspace.cwd);
 if(!cwd)return readOnly;
 const contains=(root,target)=>{const relative=path.relative(root,target);return relative===''||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative));};
 const grants=(profile.folders||[]).filter(folder=>folder.access==='read-write'&&canonicalPath(folder.path,cwd)===folder.path);
 const writable=[...new Set(roots.map(root=>canonicalPath(root,cwd)).filter(root=>root&&grants.some(folder=>contains(folder.path,root))&&fs.existsSync(root)&&fs.statSync(root).isDirectory()))].sort();
 // cwd is implicitly writable in native workspace-write, so it must be granted.
 if(!cwd||!writable.includes(cwd))return readOnly;
 return {cwd,sandbox:'workspace-write',runtimeWorkspaceRoots:writable,policy:{type:'workspaceWrite',writableRoots:writable,networkAccess:false,excludeTmpdirEnvVar:true,excludeSlashTmp:true},config:{sandbox_workspace_write:{writable_roots:writable,network_access:false,exclude_tmpdir_env_var:true,exclude_slash_tmp:true}}};
}
// Permission transition check. The already-started native sandbox stays fixed;
// only a proven addition may wait until the next turn. Unknown or reduced bounds stop.
export function codexSandboxPreservesAccess(original, current) {
 if(original?.managedProfile||current?.managedProfile)return original?.managedProfile===current?.managedProfile&&JSON.stringify(original)===JSON.stringify(current);
 const contains=(root,target)=>{const relative=path.relative(root,target);return relative===''||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative));};
 const normalized=value=>{
  if(!value||!['read-only','workspace-write'].includes(value.sandbox)||typeof value.cwd!=='string'||!path.isAbsolute(value.cwd)||!Array.isArray(value.runtimeWorkspaceRoots)||value.policy?.networkAccess!==false)return null;
  const directory=folder=>typeof folder==='string'&&path.isAbsolute(folder)&&canonicalPath(folder,value.cwd)===folder&&fs.statSync(folder).isDirectory();
  if(!directory(value.cwd)||!value.runtimeWorkspaceRoots.every(directory))return null;
  const roots=[...new Set(value.runtimeWorkspaceRoots)].sort();if(!roots.some(root=>contains(root,value.cwd)))return null;
  if(value.sandbox==='read-only'){
   if(value.policy.type!=='readOnly'||Object.keys(value.policy).some(key=>!['type','networkAccess'].includes(key))||Object.keys(value.config||{}).length)return null;
   return {cwd:value.cwd,roots,writes:[]};
  }
  const policy=value.policy,config=value.config?.sandbox_workspace_write;
  if(policy.type!=='workspaceWrite'||policy.excludeTmpdirEnvVar!==true||policy.excludeSlashTmp!==true||!Array.isArray(policy.writableRoots)||!policy.writableRoots.every(directory))return null;
  const writes=[...new Set(policy.writableRoots)].sort();
  if(JSON.stringify(writes)!==JSON.stringify(roots)||!writes.includes(value.cwd)||!config||config.network_access!==false||config.exclude_tmpdir_env_var!==true||config.exclude_slash_tmp!==true||!Array.isArray(config.writable_roots)||JSON.stringify([...new Set(config.writable_roots)].sort())!==JSON.stringify(writes))return null;
  if(Object.keys(policy).some(key=>!['type','writableRoots','networkAccess','excludeTmpdirEnvVar','excludeSlashTmp'].includes(key))||Object.keys(value.config).some(key=>key!=='sandbox_workspace_write')||Object.keys(config).some(key=>!['writable_roots','network_access','exclude_tmpdir_env_var','exclude_slash_tmp'].includes(key)))return null;
  return {cwd:value.cwd,roots,writes};
 };
 try{
  const before=normalized(original),after=normalized(current);
  return !!before&&!!after&&before.cwd===after.cwd&&before.roots.every(root=>after.roots.some(allowed=>contains(allowed,root)))&&before.writes.every(root=>after.writes.some(allowed=>contains(allowed,root)));
 }catch{return false;}
}
export function verifyCodexSandbox(thread, expected, cwd) {
 if(expected.managedProfile){
  if(thread.cwd!==cwd||thread.approvalPolicy!=='untrusted'||thread.approvalsReviewer!=='user'||thread.activePermissionProfile?.id!==expected.managedProfile||thread.activePermissionProfile?.extends!==':workspace'||thread.sandbox?.networkAccess!==false||JSON.stringify([...(thread.runtimeWorkspaceRoots||[])].sort())!==JSON.stringify(expected.runtimeWorkspaceRoots))throw Error('Codex did not confirm the selected filesystem permission profile. No turn was started.');
  return;
 }
 if(expected.sandbox!=='workspace-write')return;
 const sandbox=thread.sandbox;
 const actual=[...new Set([thread.cwd,...(sandbox?.writableRoots||[])])].sort();
 if(thread.cwd!==cwd||thread.approvalPolicy!=='untrusted'||thread.approvalsReviewer!=='user'||sandbox?.type!=='workspaceWrite'||sandbox.networkAccess!==false||sandbox.excludeTmpdirEnvVar!==true||sandbox.excludeSlashTmp!==true||JSON.stringify(actual)!==JSON.stringify(expected.runtimeWorkspaceRoots)||JSON.stringify([...(thread.runtimeWorkspaceRoots||[])].sort())!==JSON.stringify(expected.runtimeWorkspaceRoots))throw new Error('Codex did not confirm the exact trusted-folder sandbox and approval policy. No turn was started.');
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
 async initialize(){await this.request('initialize',{clientInfo:{name:'proteus',title:'Proteus',version:proteusVersion},capabilities:{experimentalApi:true}});this.write({method:'initialized'});return this;}
 respond(id,result){if(!this.child.stdin.destroyed)this.write({id,result});}
 async close(){
  if(!this.child.pid||this.child.exitCode!==null||this.child.signalCode!==null)return;
  await new Promise(resolve=>{const timer=setTimeout(()=>this.child.kill('SIGKILL'),3000);timer.unref();this.child.once('exit',()=>{clearTimeout(timer);resolve();});this.child.once('error',()=>{clearTimeout(timer);resolve();});this.child.kill('SIGTERM');});
 }
}
export class CodexProvider {
 constructor(options={}, {browser,context}={}){this.options=options;this.browser=browser;this.context=context;this.active=null;this.starting=null;this.acceptedMediaTypes=Object.freeze(['image/png','image/jpeg','image/gif','image/webp','text/plain']);this.acceptedSteeringMediaTypes=this.acceptedMediaTypes;}
 async connect(){
  if(!this.starting){
   const client=this.options.clientFactory?this.options.clientFactory():new CodexRPC(this.options);this.client=client;
   client.on('closed',()=>{if(this.client===client){this.client=null;this.starting=null;}});
   this.starting=client.initialize().catch(e=>{client.close();if(this.client===client){this.client=null;this.starting=null;}throw e;});
  }
  await this.starting;return this.client;
 }
 async models(client){client ??= await this.connect();const result=[];let cursor;do{const page=await client.request('model/list',{limit:100,includeHidden:false,...(cursor?{cursor}:{})});result.push(...page.data.map(codexModel));cursor=page.nextCursor;}while(cursor);return result;}
 // Status polls inspect authentication; token refresh belongs to the runtime's
 // authenticated operations. Forcing refresh here can invalidate a metadata
 // connection's account while another session continues normally.
 async status(){try{let client=await this.connect();let account=await client.request('account/read',{refreshToken:false});if(!account.account&&!this.active){await this.close();client=await this.connect();account=await client.request('account/read',{refreshToken:false});}const models=account.account?await this.models(client):[];return {provider:'codex',available:!!account.account,models,error:account.account?null:'Sign in with codex login on this computer.',capabilities:{steering:true,context:'Selected instructions and skills; native Codex sessions and approvals.'}};}catch(error){return {provider:'codex',available:false,models:[],error:error.message};}}
 async quota(){const client=await this.connect();return client.request('account/rateLimits/read',{});}
 async steer(run,prompt,attachments=[]){
  const a=this.active;if(!a||a.run.id!==run.id||!a.turnId)throw new Error('Codex is still starting or the turn ended. Queue this message.');
  const input=[{type:'text',text:prompt}],images=attachments.filter(item=>item.mediaType.startsWith('image/'));
  for(const item of attachments)if(!this.acceptedSteeringMediaTypes.includes(item.mediaType)||!Buffer.isBuffer(item.bytes))throw Error('Codex can receive images and plain text here.');
  const texts=attachments.filter(item=>item.mediaType==='text/plain').map(item=>({type:'text',text:attachmentText(item,'Codex')}));input.push(...texts);
  if(images.length){
   const directory=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-codex-steer-'));(a.steeringImageDirs??=new Set()).add(directory);
   const extensions={'image/png':'png','image/jpeg':'jpg','image/gif':'gif','image/webp':'webp'};
   for(const [index,item]of images.entries()){const file=path.join(directory,`image-${index}.${extensions[item.mediaType]}`);fs.writeFileSync(file,item.bytes,{mode:0o600,flag:'wx'});input.push({type:'localImage',path:file});}
  }
  // Keep temporary images until the receiving native turn finishes, including
  // ambiguous acknowledgements. A request response alone need not consume bytes.
  await a.client.request('turn/steer',{threadId:run.providerSessionId,expectedTurnId:a.turnId,input});
 }
 async run({run,prompt,attachments=[],emit,ask,update,signal,stream,permissionProfile}){
  for(const item of attachments)if(!this.acceptedMediaTypes.includes(item.mediaType)||!Buffer.isBuffer(item.bytes))throw new Error('Codex can receive images and plain text here. PDF and other files are not supported.');
  let imageDir=null,appBridge=null;
  const client=await this.connect();const model=(await this.models(client)).find(m=>m.id===run.schedule.model);if(!model)throw new Error('Choose an available Codex model from the provider catalog.');validateModelOptions(run.schedule,model);
  const snapshot=run.schedule.context, managed=snapshot&&this.context?this.context.providerContext(snapshot):null;
  // Tool scopes are an execution contract. Do not silently drop provider-specific restrictions.
  const restricted=managed?.customAgents.filter(a=>a.tools!==null);
  // Structured so the chat can offer "turn these off and retry" instead of a dead end.
  if(restricted?.length)throw Object.assign(new Error(`Codex cannot yet enforce the declared tool filters for: ${restricted.map(a=>a.displayName).join(', ')}. Use an unrestricted agent or deselect these agents for this Codex chat.`),{code:'PROVIDER_AGENT_TOOL_FILTERS',agents:restricted.map(a=>({id:a.entryId,name:a.displayName}))});
  const native=await client.request('config/read',{includeLayers:true});const existing={};for(const layer of native.layers||[])Object.assign(existing,layer.config?.mcp_servers||{});
  Object.assign(existing,native.config?.mcp_servers||{});
  const plugins={};for(const layer of native.layers||[])Object.assign(plugins,layer.config?.plugins||{});Object.assign(plugins,native.config?.plugins||{});
  const selected=managed?{...Object.fromEntries(Object.entries(run.schedule.mcpServers||{}).filter(([name])=>!managed.disabledLegacyMcp.includes(name))),...managed.mcpServers}:run.schedule.mcpServers||{};
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
  const sandbox=codexSandbox(run.schedule,permissionProfile?.(),{permissionControls:(this.options.permissionControls===true||this.options.desktopPreview===true)});
  const currentBrowserTools=browserTools(this.browser,run.id),currentIntegrationTools=[...integrationTools(this.integrations,run.id),...chatControlTools(this.chatControl,run.id)];const browser=[...questionAttachmentTools(this,run.id),...currentBrowserTools,...currentIntegrationTools];const items=new Map();const calls=new Map();
  const approvedBridgeCalls=new Map();
  captureAppCapabilities(run,browser,update);
  let resolveTurn,rejectTurn,settled=false,abortTimer;const completed=new Promise((resolve,reject)=>{resolveTurn=resolve;rejectTurn=reject;});completed.catch(()=>{});
  const active={run,client,turnId:null};this.active=active;
  const agents=subagentJournal(run,'codex',update);
  active.recheckPermissions=()=>{
   if(active.permissionRevoked)return true;
   let changed;try{const current=codexSandbox(run.schedule,permissionProfile?.(),{permissionControls:(this.options.permissionControls===true||this.options.desktopPreview===true)});changed=(this.options.permissionControls===true||this.options.desktopPreview===true)?!codexSandboxPreservesAccess(sandbox,current):JSON.stringify(current)!==JSON.stringify(sandbox);}catch{changed=true;}
   if(changed){active.permissionRevoked=true;abort();}
   return changed;
  };
  const assertPendingApprovalCurrent=()=>{if((this.options.permissionControls===true||this.options.desktopPreview===true)&&active.recheckPermissions())throw new Error('Permissions changed while this approval was waiting. Continue with the current permissions.');};
  const assertAppToolActive=()=>{if(this.active!==active||settled||signal.aborted)throw new Error('This Proteus tool request no longer belongs to an active turn.');};
  const invokeAppTool=async(tool,args,callId)=>{
   assertAppToolActive();
   if(active.recheckPermissions())throw new Error('Workspace permissions changed; this tool request was cancelled.');
   if(['proteus_chats','proteus_agents'].includes(tool.name))return tool.handler(args); // The host service owns scoped approval and rechecks.
   const key=JSON.stringify([tool.name,args]),approved=approvedBridgeCalls.get(key);approvedBridgeCalls.delete(key);
   const answer=approved&&approved.expires>Date.now()?'approve':await ask({type:'permission',question:'Allow Proteus app action?',details:{kind:'custom-tool',toolCallId:callId,toolName:tool.name,args,intention:tool.name==='proteus_open_document'?`Open Markdown tab: ${args?.path||''}`:`Browser ${args?.action||'action'}`}});
   assertPendingApprovalCurrent();assertAppToolActive();
   return ['approve','approve-auto'].includes(answer)?await tool.handler(args):{resultType:'failure',textResultForLlm:'User declined.'};
  };
  const userInputRequests=new Map();
  const capture=providerActivity({provider:'codex',emit,update});
  const onNotification=({method,params:p={}})=>{
   if(p.threadId&&p.threadId!==run.providerSessionId){
    if(agents.codex({method,params:p})&&p.item)items.set(p.threadId+':'+p.item.id,p.item);
    return;
   }
   agents.codex({method,params:p});
   if(!p.turnId||!active.turnId||p.turnId===active.turnId)capture.receive({method,params:p});
   if(method==='turn/completed')capture.finish(p.turn?.status==='completed'?'completed':'interrupted');
   if(method==='serverRequest/resolved'){const request=userInputRequests.get(p.requestId);if(request){request.resolved=true;request.controller.abort({code:'provider-resolved'});}}
   if(method==='turn/started')active.turnId=p.turn.id;
   if(method==='item/agentMessage/delta')stream(p.itemId,p.delta);
   if(method==='thread/tokenUsage/updated'){run.usage={observed:true,inputTokens:p.tokenUsage.total.inputTokens,outputTokens:p.tokenUsage.total.outputTokens};run.contextUsage=p.tokenUsage;update();}
   if(method==='turn/plan/updated')emit('system',(p.explanation?p.explanation+'\n\n':'')+(p.plan||[]).map(x=>`- [${x.status==='completed'?'x':' '}] ${x.step}`).join('\n'));
   if(method==='error'&&p.willRetry)emit('system','Codex is retrying: '+displayText(p.error?.message||'temporary provider error',1500));
   if(method==='error'&&!p.willRetry)rejectTurn(Object.assign(new Error(p.error?.message||'Codex turn failed.'),{code:p.error?.codexErrorInfo||p.error?.code}));
   if(method==='item/started'||method==='item/completed'){
    const item=p.item;items.set(item.id,item);
    if(item.type==='agentMessage'&&method==='item/completed'){if(run.liveMessages)delete run.liveMessages[item.id];emit('assistant',item.text,{phase:item.phase,providerItemId:item.id,...(Array.isArray(item.questions)&&item.questions.length?{userQuestions:item.questions}:{})});}
    else if(item.type==='contextCompaction'&&method==='item/completed')emit('system','Codex compacted conversation context.');
    else if(['commandExecution','fileChange','mcpToolCall','dynamicToolCall','webSearch','imageView'].includes(item.type)){
      const name=item.type==='commandExecution'?'shell':item.type==='fileChange'?'apply_patch':item.tool||item.type;
      const args=item.arguments||{command:item.command,cwd:item.cwd,path:item.path,query:item.query};
      let tool=calls.get(item.id);if(!tool){tool={callId:item.id,name,summary:toolSummary(name,args,item.type==='fileChange'?'Edit · '+(item.changes||[]).map(c=>c.path).join(', '):undefined),status:'running',startedAt:new Date().toISOString(),arguments:displayText(item.type==='fileChange'?(item.changes||[]).map(c=>'*** Update File: '+c.path+'\n'+(c.diff||'')).join('\n'):args,6000)};calls.set(item.id,tool);emit('tool',tool.summary,{tool});}
      if(method==='item/completed'){tool.status=item.status==='failed'||(item.exitCode!=null&&item.exitCode!==0)?'failed':item.status==='declined'?'interrupted':'completed';tool.output=displayText(item.aggregatedOutput||item.result||item.contentItems?.map(x=>x.text).filter(Boolean).join('\n')||item.changes||'');tool.error=item.error?displayText(item.error):item.exitCode?`Command exited with code ${item.exitCode}.`:null;tool.durationMs=item.durationMs??Date.now()-Date.parse(tool.startedAt);tool.finishedAt=new Date().toISOString();}update();
    }
   }
   if(method==='item/commandExecution/outputDelta'){const tool=calls.get(p.itemId);if(tool){tool.output=displayText((tool.output||'')+p.delta);update();}}
   if(method==='turn/completed'){settled=true;clearTimeout(abortTimer);if(active.permissionRevoked)rejectTurn(new Error((this.options.permissionControls===true||this.options.desktopPreview===true)?'Permissions changed and this turn was stopped. Choose Continue to resume this chat with the current permissions. No actions were automatically retried.':'Workspace permissions changed during the Codex turn. Its tools were interrupted; continue with the current permissions.'));else if(p.turn.status==='completed')resolveTurn();else rejectTurn(Object.assign(new Error(p.turn.error?.message||'Codex turn '+p.turn.status),{code:p.turn.error?.codexErrorInfo||p.turn.error?.code}));}
  };
  const handledRequests=new Set();
  const onRequest=async msg=>{if(handledRequests.has(msg.id))return;handledRequests.add(msg.id);const p=msg.params||{};if(p.threadId&&p.threadId!==run.providerSessionId&&!agents.allows(p.threadId,p.turnId)||(!p.threadId||p.threadId===run.providerSessionId)&&p.turnId&&active.turnId&&p.turnId!==active.turnId){emit('system','Provider request rejected: unverified or expired agent scope; no user decision was requested.');return client.write({id:msg.id,error:{code:-32000,message:'Unverified or expired Proteus agent scope. This is an adapter scope rejection, not a user refusal.'}});}try{
   const scopeAsk=(request,requestSignal)=>ask(p.threadId&&p.threadId!==run.providerSessionId?{...request,details:{...request.details,delegation:{provider:'codex',rootThreadId:run.providerSessionId,threadId:p.threadId,parentThreadId:agents.find(p.threadId)?.parentNativeId,runId:run.id}}}:request,requestSignal);
   if(active.recheckPermissions())throw new Error('Workspace permissions changed; this tool request was cancelled.');
   if(msg.method==='item/tool/call'){
     const tool=browser.find(t=>t.name===p.tool);if(!tool)throw new Error('Unknown Proteus tool.');
     const result=await invokeAppTool(tool,p.arguments,p.callId);
     client.respond(msg.id,{success:result?.resultType!=='failure',contentItems:codexToolContent(result)});
   }else if(msg.method==='item/commandExecution/requestApproval'){
     const answer=await scopeAsk({type:'permission',question:p.reason||'Allow this command?',details:{kind:'shell',toolCallId:p.itemId,fullCommandText:p.command,reason:p.reason,requestSandboxBypass:!!p.additionalPermissions,managedApprovalRequired:!!p.networkApprovalContext}});assertPendingApprovalCurrent();client.respond(msg.id,{decision:['approve','approve-auto'].includes(answer)?'accept':'decline'});
   }else if(msg.method==='item/fileChange/requestApproval'){
     const changes=items.get(p.threadId&&p.threadId!==run.providerSessionId?p.threadId+':'+p.itemId:p.itemId)?.changes||[];let allowed=changes.length>0;
     for(const change of changes){const answer=await scopeAsk({type:'permission',question:p.reason||'Allow this file change?',details:{kind:'write',toolCallId:p.itemId,fileName:change.path,intention:'Edit '+change.path}});assertPendingApprovalCurrent();if(!['approve','approve-auto'].includes(answer))allowed=false;}
     client.respond(msg.id,{decision:allowed?'accept':'decline'});
   }else if(msg.method==='item/tool/requestUserInput'){
     const request={controller:new AbortController(),resolved:false};userInputRequests.set(msg.id,request);
     const abortRequest=()=>request.controller.abort(signal.reason);signal.addEventListener('abort',abortRequest,{once:true});
     try{const answers={};for(const q of p.questions||[])answers[q.id]={answers:[await scopeAsk({type:'question',question:q.question,choices:q.options?.map(x=>x.label),optionDetails:q.options?.map(x=>({label:x.label,description:x.description||''})),providerQuestionId:q.id,isBlocking:p.isBlocking!==false,autoResolutionMs:p.autoResolutionMs??null},request.controller.signal)]};if(!request.resolved)client.respond(msg.id,{answers});}
     catch(error){if(!request.resolved)throw error;}
     finally{signal.removeEventListener('abort',abortRequest);userInputRequests.delete(msg.id);}
   }else if(msg.method==='mcpServer/elicitation/request'){
     const meta=p._meta,name=p.message?.match(/tool "([^"\n]+)"\?$/)?.[1],tool=browser.find(tool=>tool.name===name);
     if(p.serverName==='proteus_app'&&p.mode==='form'&&meta?.codex_approval_kind==='mcp_tool_call'&&tool&&meta.tool_params&&typeof meta.tool_params==='object'&&!Array.isArray(meta.tool_params)&&Object.keys(p.requestedSchema?.properties||{}).length===0){
       const args=meta.tool_params,answer=await scopeAsk({type:'permission',question:'Allow Proteus app action?',details:{kind:'custom-tool',toolCallId:p.turnId,toolName:name,args,intention:`Proteus ${name} ${args.action||''}`}});
       assertPendingApprovalCurrent();assertAppToolActive();const allowed=['approve','approve-auto'].includes(answer);
       if(allowed){if(approvedBridgeCalls.size>=16)approvedBridgeCalls.clear();approvedBridgeCalls.set(JSON.stringify([name,args]),{expires:Date.now()+15000});}
       client.respond(msg.id,{action:allowed?'accept':'decline',content:allowed?{}:null});
     }else if(p.mode==='form'&&meta?.codex_approval_kind==='mcp_tool_call'){
       // Codex's native approval envelope identifies the server separately and embeds
       // the original tool name in its generated question. Never normalize across servers.
       const definition=Object.hasOwn(selected,p.serverName)?selected[p.serverName]:null;
       const expected=name&&`Allow the ${p.serverName} MCP server to run tool "${name}"?`;
       if(!definition||!mcp[p.serverName]?.enabled){emit('system','MCP approval rejected by adapter: server is not selected.');client.respond(msg.id,{action:'decline',content:null});return;}
       if(!name||p.message!==expected||!meta.tool_params||typeof meta.tool_params!=='object'||Array.isArray(meta.tool_params)||p.requestedSchema?.type!=='object'||Object.keys(p.requestedSchema.properties||{}).length||!p.threadId||!p.turnId||p.turnId!==active.turnId)throw new Error('Unsupported or stale MCP tool approval envelope. No user decision was requested.');
       if(definition.tools?.length&&!definition.tools.includes('*')&&!definition.tools.includes(name))throw new Error('This MCP tool is outside the selected tool set.');
       assertAppToolActive();
       const beforeApproval=JSON.stringify(permissionProfile?.());
       const answer=await scopeAsk({type:'permission',question:`Allow ${p.serverName} ${name}?`,details:{kind:'mcp',serverName:p.serverName,toolName:name,args:meta.tool_params,toolCallId:p.itemId||String(msg.id),intention:`${p.serverName} ${name}`,readOnly:false}});
       assertPendingApprovalCurrent();assertAppToolActive();
       if(answer==='approve-auto'&&JSON.stringify(permissionProfile?.())!==beforeApproval)throw new Error('Saved permissions changed before the MCP approval could be delivered.');
       if(p.turnId!==active.turnId)throw new Error('MCP approval belongs to an ended turn.');
       const allowed=['approve','approve-auto'].includes(answer);
       client.respond(msg.id,{action:allowed?'accept':'decline',content:allowed?{}:null});
     }else throw new Error('Unsupported MCP elicitation form or URL request. Proteus did not ask the user or record a refusal.');
   }
   else client.write({id:msg.id,error:{code:-32601,message:'Unsupported approval or tool request: '+msg.method}});
  }catch(e){client.write({id:msg.id,error:{code:-32000,message:e.message}});}};
  const closed=e=>rejectTurn(e);client.on('notification',onNotification);client.on('request',onRequest);client.on('closed',closed);
  const abort=()=>{if(abortTimer)return;if(active.turnId)void client.request('turn/interrupt',{threadId:run.providerSessionId,turnId:active.turnId}).catch(()=>client.close());abortTimer=setTimeout(()=>{client.close();rejectTurn(new Error('Codex did not confirm interruption; its Proteus runtime was stopped.'));},5000);};signal.addEventListener('abort',abort,{once:true});
  try{
   // Native dynamic tool schemas are persisted by Codex and cannot be replaced on resume.
   // A fresh per-turn MCP catalog supplies current browser/tab schemas to older chats.
   // Desktop screenshots must reach the model as native MCP image blocks.
   // The installed runtime accepts dynamic inputImage results but drops their
   // images before model delivery. Keep the fresh MCP path on new chats too.
   const resumedBrowserTools=currentBrowserTools.filter(tool=>tool.name!=='proteus_open_document'&&(run.providerSessionId||tool.name==='proteus_desktop')).map(tool=>({...tool,handler:args=>invokeAppTool(tool,args)}));
   if(this.browser?.openDocument||this.integrations||this.chatControl||resumedBrowserTools.length){
    if(selected.proteus_app)throw new Error('The MCP name proteus_app is reserved for Proteus app tools.');
    appBridge=await documentBridge({openDocument:async(args,id)=>{
      if(active.recheckPermissions())throw new Error('Workspace permissions changed.');
      const answer=await ask({type:'permission',question:'Open this Markdown document in the chat?',details:{kind:'custom-tool',toolName:'proteus_open_document',args,intention:`Open Markdown tab: ${args.path||''}`}});
      assertPendingApprovalCurrent();
      if(!['approve','approve-auto'].includes(answer))throw new Error('Document opening was declined.');
      return this.browser.openDocument(args,id);
    }},run.id,[...currentIntegrationTools,...resumedBrowserTools]);
    mcp.proteus_app={enabled:true,...appBridge.config};
   }
   const instructions=`${appInstructions}${resumedBrowserTools.length?'\nUse the fresh tools published by the proteus_app MCP server. Native desktop control uses its proteus_desktop tool so screenshots arrive as images. For browser and tab operations in resumed chats, also prefer that fresh catalog: older unprefixed dynamic schemas may be stale. The fresh catalog supports hidden/unloaded lifecycle actions and every available profile; normal workflow approvals still apply.':''}\nYou are working inside Proteus. Use only the selected sources below. Workspace folders:\n${roots.join('\n')}\n${managed?.instructionText||''}\n${(managed?.customAgents||[]).map(a=>`Agent: ${a.displayName}${a.name===managed.agent?' (main identity)':''}\n${a.prompt}`).join('\n\n')}\nEditor context: ${JSON.stringify(run.schedule.editorContext||null)}`;
   const config={...sandbox.config,project_doc_max_bytes:0,developer_instructions:instructions,mcp_servers:mcp,features:{skip_host_skill_discovery:true,skill_mcp_dependency_install:false,enable_mcp_apps:false,multi_agent:true},plugins:Object.fromEntries(Object.keys(plugins).map(name=>[name,{enabled:false}])),apps:{_default:{enabled:false}},web_search:'disabled'};
   const params={model:run.schedule.model,cwd:sandbox.cwd,runtimeWorkspaceRoots:sandbox.runtimeWorkspaceRoots,approvalPolicy:'untrusted',approvalsReviewer:'user',...(sandbox.managedProfile?{}:{sandbox:sandbox.sandbox}),developerInstructions:instructions,config};
   const thread=run.providerSessionId?await client.request('thread/resume',{...params,threadId:run.providerSessionId}):await client.request('thread/start',{...params,dynamicTools:browser.filter(t=>!['proteus_open_document','proteus_desktop'].includes(t.name)).map(t=>({type:'function',name:t.name,description:t.description,inputSchema:t.parameters}))});
   verifyCodexSandbox(thread,sandbox,sandbox.cwd);
   run.providerSessionId=thread.thread.id;run.providerHome=this.options.env?.CODEX_HOME||process.env.CODEX_HOME||path.join(os.homedir(),'.codex');run.nativeSessionPath=thread.thread.path||null;run.modelCapabilities={id:model.id,controls:model.controls,capturedAt:new Date().toISOString()};run.explicitProviderContext={mcpNames:Object.keys(selected),skillDirectories:[],disabledSkills:managed?.disabledSkills||[]};if(snapshot){snapshot.suppliedAt=new Date().toISOString();snapshot.delivery='Codex thread configuration accepted';}update();
   if(signal.aborted)throw new Error('Cancelled');
   if(active.recheckPermissions())throw new Error('Workspace permissions changed before the Codex turn started.');
   const input=[{type:'text',text:prompt}];
   if(attachments.some(item=>item.mediaType.startsWith('image/'))){imageDir=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-codex-image-'));}
   if(attachments.length){
    const extensions={'image/png':'png','image/jpeg':'jpg','image/gif':'gif','image/webp':'webp'};
    for(const [index,item] of attachments.entries()){
      if(item.mediaType==='text/plain'){
        let content;try{content=new TextDecoder('utf-8',{fatal:true}).decode(item.bytes);}catch{throw new Error('Codex requires UTF-8 plain text attachments.');}
        if(content.includes('\0'))throw new Error('Codex cannot receive binary content as a text attachment.');
        input.push({type:'text',text:`Attached plain text file: ${item.name}\n\n${content}`});continue;
      }
      const file=path.join(imageDir,`image-${index}.${extensions[item.mediaType]}`);fs.writeFileSync(file,item.bytes,{mode:0o600,flag:'wx'});input.push({type:'localImage',path:file});
    }
   }
   const result=await client.request('turn/start',{threadId:run.providerSessionId,...(sandbox.managedProfile?{}:{sandboxPolicy:sandbox.policy}),approvalPolicy:'untrusted',approvalsReviewer:'user',runtimeWorkspaceRoots:sandbox.runtimeWorkspaceRoots,input,effort:run.schedule.reasoningEffort||model.controls.defaultReasoningEffort||null,serviceTier:run.schedule.serviceTier||null});active.turnId=result.turn.id;if(signal.aborted||active.permissionRevoked){clearTimeout(abortTimer);abortTimer=null;abort();}await completed;
  }finally{agents.finish();for(const request of userInputRequests.values()){request.resolved=true;request.controller.abort({code:'provider-resolved'});}userInputRequests.clear();capture.finish();if(appBridge)await appBridge.close();clearTimeout(abortTimer);if(active.turnId&&!settled)await client.close();signal.removeEventListener('abort',abort);client.off('notification',onNotification);client.off('request',onRequest);client.off('closed',closed);for(const tool of calls.values())if(tool.status==='running')tool.status='interrupted';if(this.active===active)this.active=null;if(imageDir)fs.rmSync(imageDir,{recursive:true,force:true});for(const directory of active.steeringImageDirs||[])fs.rmSync(directory,{recursive:true,force:true});update();}
 }
 recheckPermissions(){this.active?.recheckPermissions?.();}
 async close(){await this.client?.close();this.client=null;this.starting=null;}
}
