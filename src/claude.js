import {browserTools} from './browser-tools.js';
import {captureAppCapabilities} from './app-capabilities.js';
import {accumulateClaudeUsage} from './claude-usage.js';
import {integrationTools} from './integration-tools.js';
import {appInstructions,documentBridge} from './document-tools.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { validateModelOptions } from './model-catalog.js';
import { displayText, toolSummary } from './tool-activity.js';

export function claudeExecutable() {
  if (process.env.PROTEUS_CLAUDE_PATH) return process.env.PROTEUS_CLAUDE_PATH;
  for (const file of [path.join(os.homedir(), '.local/bin/claude'), '/opt/homebrew/bin/claude', '/usr/local/bin/claude']) if (fs.existsSync(file)) return file;
  const root = path.join(os.homedir(), 'Library/Application Support/Claude/claude-code');
  try { for (const version of fs.readdirSync(root).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true}))) for (const build of fs.readdirSync(path.join(root,version))) {
    const file = path.join(root,version,build,'claude.app/Contents/MacOS/claude'); if (fs.existsSync(file)) return file;
  } } catch { /* A normal CLI installation is also supported. */ }
  return 'claude';
}
export function claudeModel(model, runtime={}) {
  const efforts = (model.supportedEffortLevels || []).filter(e => typeof e === 'string');
  const id=model.value||model.id, resolved=typeof model.resolvedModel==='string'&&model.resolvedModel!==id?model.resolvedModel:null;
  const name=(model.displayName||id)+(resolved?` · ${resolved} (alias)`:'');
  return { id, name, description:resolved?`${model.description||''}${model.description?' ':''}Alias currently resolves to ${resolved}; this can change with the Claude runtime or account.`:model.description, resolvedModel:model.resolvedModel,
    controls:{ reasoningEfforts:efforts, reasoningSupported:model.supportsEffort ?? efforts.length>0, defaultReasoningEffort:null,
      contextTiers:[{id:'default',promptTokens:null,totalTokens:null}], maxOutputTokens:null,
      serviceTiers:model.supportsFastMode === true && !runtime.fast_mode_disabled_reason ? [{id:'fast',name:'Fast (extra usage)'}] : [] } };
}
const claudeMcpLauncher=fileURLToPath(new URL('./claude-mcp-launcher.cjs',import.meta.url));
export function claudeMcpConfig(selected={},cwd,makeLauncher) {
  if(!selected||typeof selected!=='object'||Array.isArray(selected)||Object.keys(selected).length>20)throw new Error('Choose at most 20 Claude MCP servers.');
  const mcpServers={};
  for(const [name,definition] of Object.entries(selected)){
    if(!/^[a-zA-Z0-9_-]{1,80}$/.test(name)||!definition||typeof definition!=='object'||Array.isArray(definition))throw new Error('A selected Claude MCP server has an invalid name or definition.');
    if(definition.tools!=null&&!(Array.isArray(definition.tools)&&definition.tools.length===1&&definition.tools[0]==='*'))throw new Error(`Claude cannot enforce the selected tool filter for ${name}. Remove that filter or deselect this server.`);
    const type=definition.type==='local'?'stdio':definition.type||'stdio',timeout=definition.timeout;
    if(timeout!=null&&(!Number.isSafeInteger(timeout)||timeout<1000||timeout>86_400_000))throw new Error(`Claude MCP timeout for ${name} must be 1 second to 24 hours.`);
    const common=timeout==null?{}:{timeout};
    if(type==='stdio'){
      if(typeof definition.command!=='string'||!definition.command.trim()||/\0|[\r\n]/.test(definition.command))throw new Error(`Claude MCP command for ${name} is invalid.`);
      const args=definition.args||[],env=definition.env||{};
      if(!Array.isArray(args)||args.some(value=>typeof value!=='string'||value.includes('\0'))||!env||typeof env!=='object'||Array.isArray(env)||Object.entries(env).some(([key,value])=>!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)||typeof value!=='string'||value.includes('\0')))throw new Error(`Claude MCP process options for ${name} are invalid.`);
      let launch={command:definition.command,args,env};
      if(definition.workingDirectory){
        if(typeof definition.workingDirectory!=='string'||!path.isAbsolute(definition.workingDirectory))throw new Error(`Claude MCP ${name} needs an absolute working directory.`);
        let directory,chatDirectory;try{directory=fs.realpathSync(definition.workingDirectory);chatDirectory=fs.realpathSync(cwd);if(!fs.statSync(directory).isDirectory())throw new Error('not a directory');}catch{throw new Error(`Claude MCP ${name} working directory is unavailable. Refresh the selected source.`);}
        if(directory!==chatDirectory){if(!makeLauncher)throw new Error(`Claude MCP ${name} needs a private working-directory launcher.`);launch=makeLauncher(name,{workingDirectory:directory,command:definition.command,args,env});}
      }
      mcpServers[name]={type:'stdio',...launch,...common};
    }else if(type==='http'||type==='sse'){
      let url;try{url=new URL(definition.url);}catch{throw new Error(`Claude MCP URL for ${name} is invalid.`);}
      if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.protocol==='http:'&&!['localhost','127.0.0.1','::1'].includes(url.hostname))throw new Error(`Claude MCP ${name} needs HTTPS or a local HTTP endpoint without URL credentials.`);
      const headers=definition.headers||{};
      if(!headers||typeof headers!=='object'||Array.isArray(headers)||Object.entries(headers).some(([key,value])=>!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(key)||typeof value!=='string'||/[\r\n\0]/.test(value)))throw new Error(`Claude MCP headers for ${name} are invalid.`);
      mcpServers[name]={type,url:url.href,headers,...common};
    }else throw new Error(`Claude MCP transport for ${name} is unsupported.`);
  }
  return {mcpServers};
}
function privateClaudeMcpConfig(selected,cwd){
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-claude-mcp-'));fs.chmodSync(directory,0o700);
  const file=path.join(directory,'mcp.json');
  try{
    let total=0;
    const config=claudeMcpConfig(selected,cwd,(name,spec)=>{
      const content=JSON.stringify(spec);total+=Buffer.byteLength(content);if(total>512*1024)throw new Error('Selected Claude MCP configuration is too large.');
      const specFile=path.join(directory,`launcher-${name}.json`);fs.writeFileSync(specFile,content,{mode:0o600,flag:'wx'});
      return {command:process.execPath,args:[claudeMcpLauncher,specFile],env:{ELECTRON_RUN_AS_NODE:'1'}};
    });
    const content=JSON.stringify(config);total+=Buffer.byteLength(content);if(total>512*1024)throw new Error('Selected Claude MCP configuration is too large.');fs.writeFileSync(file,content,{mode:0o600,flag:'wx'});return {file,dispose:()=>fs.rmSync(directory,{recursive:true,force:true})};
  }
  catch(error){fs.rmSync(directory,{recursive:true,force:true});throw error;}
}
export function claudeAccountAvailable(account={}) {
  // Current authenticated CLI initialization reports profile fields instead of
  // tokenSource/apiKeySource. Never store or expose the profile to the UI.
  return !!(account.apiKeySource&&account.apiKeySource!=='none')||!!(account.tokenSource&&account.tokenSource!=='none')||
    (typeof account.subscriptionType==='string'&&account.subscriptionType.length>0)||
    (typeof account.email==='string'&&account.email.length>0);
}
// get_usage percentages are 0–100; streamed rate_limit_event utilization is 0–1.
// Only copy allowance windows. Session totals, account profile and behavior/transcript data stay private.
export function claudeQuota(value) {
  const source='Claude Code /usage';
  if(value?.rate_limits_available!==true||!value.rate_limits||typeof value.rate_limits!=='object')return {provider:'claude',source,available:false,windows:[],error:'Claude subscription allowance is unavailable for this sign-in. API-key and third-party sessions do not report subscription quota.'};
  const windows=[];
  const add=(id,label,window)=>{
    if(!window||typeof window!=='object')return;
    const used=window.utilization,remainingPercent=typeof used==='number'&&Number.isFinite(used)&&used>=0&&used<=100?100-used:null;
    const reset=typeof window.resets_at==='string'?Date.parse(window.resets_at):NaN;
    windows.push({id,label,remainingPercent,resetAt:Number.isFinite(reset)?new Date(reset).toISOString():null,unlimited:false});
  };
  for(const [id,window] of Object.entries(value.rate_limits))if(/^(five_hour|seven_day(?:_[a-z0-9_]+)?)$/.test(id))add(id,({five_hour:'5-hour allowance',seven_day:'Weekly allowance',seven_day_oauth_apps:'Weekly connected-app allowance',seven_day_opus:'Weekly Opus allowance',seven_day_sonnet:'Weekly Sonnet allowance'})[id]||id.replaceAll('_',' '),window);
  for(const [index,window] of (Array.isArray(value.rate_limits.model_scoped)?value.rate_limits.model_scoped:[]).entries())if(typeof window?.display_name==='string')add('model_'+index,window.display_name,window);
  return {provider:'claude',source,available:windows.length>0,windows,...(!windows.length?{error:'Claude returned no subscription allowance windows.'}:{})};
}
// Only signal the process group created for this child. EPERM is unknown liveness,
// never evidence that a process exited. All signal exceptions stay inside this promise.
export async function stopClaudeProcess(child, {platform=process.platform,signalGroup=(pid,signal)=>process.kill(pid,signal),graceMs=500,pollMs=20}={}) {
  if(!Number.isSafeInteger(child?.pid)||child.pid<=0)return;
  const errors=new Set();
  const remember=error=>errors.add(error?.code||'signal failed');
  const directAlive=()=>child.exitCode===null&&child.signalCode===null;
  const state=()=>{
    if(platform==='win32')return directAlive()?'alive':'gone';
    try{signalGroup(-child.pid,0);return 'alive';}catch(error){if(error.code==='ESRCH')return 'gone';remember(error);return 'unknown';}
  };
  const direct=signal=>{if(!directAlive())return;try{if(!child.kill(signal)&&directAlive())errors.add('child did not accept signal');}catch(error){if(error.code!=='ESRCH')remember(error);}};
  const send=signal=>{
    if(platform==='win32'){direct(signal);return;}
    try{signalGroup(-child.pid,signal);}catch(error){if(error.code==='ESRCH')return;remember(error);direct(signal);}
  };
  const wait=async()=>{const until=Date.now()+graceMs;do{if(state()==='gone')return true;await new Promise(resolve=>setTimeout(resolve,Math.min(pollMs,Math.max(1,until-Date.now()))));}while(Date.now()<until);return state()==='gone';};
  if(state()==='gone')return;
  send('SIGTERM');if(await wait())return;
  send('SIGKILL');if(await wait())return;
  throw new Error(`Claude runtime cleanup could not confirm termination${errors.size?' ('+[...errors].join(', ')+')':''}. A Proteus-owned process may still be running; resolve its OS permission or stop it before another Claude turn.`);
}
// The private process uses the same bidirectional protocol as Anthropic's Agent SDK.
export class ClaudeRPC extends EventEmitter {
  constructor({command=claudeExecutable(),args=[],cwd=os.tmpdir(),env=process.env,mcpConfigPath=null}={}) {
    super(); this.pending=new Map(); this.sequence=0; this.ended=false;
    this.child=spawn(command,['--print','--input-format','stream-json','--output-format','stream-json','--verbose','--include-partial-messages',
      '--permission-prompt-tool','stdio','--permission-mode','default','--setting-sources','','--strict-mcp-config','--mcp-config',mcpConfigPath||'{"mcpServers":{}}',
      '--disable-slash-commands','--no-chrome',...args],{cwd,env:{...env,CLAUDE_CODE_DISABLE_AUTO_MEMORY:'1'},detached:process.platform!=='win32',stdio:['pipe','pipe','pipe']});
    // Runtime stderr may contain private prompt/credential material. Do not persist it in errors.
    this.child.stderr.on('data',()=>{});
    const end=error=>{if(this.ended)return;this.ended=true;for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(error);}this.pending.clear();this.emit('closed',error);};
    createInterface({input:this.child.stdout}).on('line',line=>{let m;try {m=JSON.parse(line);}catch{return;}
      if(m.type==='control_response'){const r=m.response,p=this.pending.get(r.request_id);if(p){clearTimeout(p.timer);this.pending.delete(r.request_id);r.subtype==='error'?p.reject(new Error(r.error)):p.resolve(r.response);}}
      else if(m.type==='control_request')this.emit('request',m);else this.emit('message',m);
    });
    this.child.on('error',end);this.child.stdin.on('error',end);this.child.on('exit',code=>end(new Error(`Claude runtime exited (${code ?? 'signal'}).`)));
  }
  write(value){if(this.ended)throw new Error('Claude connection closed.');this.child.stdin.write(JSON.stringify(value)+'\n');}
  request(request,timeout=30000){return new Promise((resolve,reject)=>{const id=String(++this.sequence);const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error(`Claude ${request.subtype} timed out.`));},timeout);this.pending.set(id,{resolve,reject,timer});try{this.write({type:'control_request',request_id:id,request});}catch(error){clearTimeout(timer);this.pending.delete(id);reject(error);}});}
  respond(id,response){if(!this.ended)this.write({type:'control_response',response:{subtype:'success',request_id:id,response}});}
  async initialize(hooks={},timeout=30000){return this.request({subtype:'initialize',hooks,skills:[],agents:{}},timeout);}
  close(){
    if(!this.closing)this.closing=stopClaudeProcess(this.child,{graceMs:this.killGraceMs??500}).catch(error=>{this.cleanupFailure=error;throw error;});
    return this.closing;
  }
  retryClose(){if(this.cleanupFailure){this.closing=null;this.cleanupFailure=null;}return this.close();}
}
export class ClaudeProvider {
  constructor(options={}, {context,browser}={}) {this.browser=browser;this.options=options;this.context=context;this.active=null;this.cleanupClients=new Set();this.cleanupError=null;this.acceptedMediaTypes=Object.freeze(['image/png','image/jpeg','image/gif','image/webp','text/plain']);}
  client(args=[],cwd,mcpConfigPath=null){return this.options.clientFactory ? this.options.clientFactory({args,cwd,mcpConfigPath}) : new ClaudeRPC({...this.options,args,cwd,mcpConfigPath});}
  selectedMcp(run){const snapshot=run.schedule.context,managed=snapshot&&this.context?(this.context.providerMcpContext?.(snapshot)||this.context.providerContext(snapshot)):null;return managed?{...Object.fromEntries(Object.entries(snapshot.includeDefaults!==false?run.schedule.mcpServers||{}:{}).filter(([name])=>!managed.disabledLegacyMcp.includes(name))),...managed.mcpServers}:run.schedule.mcpServers||{};}
  withMcpSelectionBatch(callback){return this.context?.withMcpSelectionBatch?this.context.withMcpSelectionBatch(callback):callback();}
  async mcpState(client,names,timeout=10000,selected={}){
    let raw;
    try{raw=await client.request({subtype:'mcp_status'},timeout);}catch{throw new Error('Claude MCP connection status is unavailable. Check the selected server on this Mac and retry.');}
    const list=raw?.mcpServers||raw?.mcp_servers||raw?.servers;
    if(!Array.isArray(list))throw new Error('Claude did not return MCP connection status. Update Claude Code on this Mac.');
    return names.map(name=>{const item=list.find(value=>value?.name===name),status=['connected','pending','failed','needs-auth','disabled'].includes(item?.status)?item.status:'not-connected';return {name,status,scope:'selected-chat',observedAt:new Date().toISOString(),remote:['http','sse'].includes(selected[name]?.type),...(status==='failed'?{error:'Claude could not connect to this selected server. Check its Mac configuration and credentials.'}:status==='needs-auth'?{error:'This server needs sign-in in Claude Code on the owning Mac.'}:{})};});
  }
  hasMcpSession(run){return !!this.active&&this.activeRunId===run.id;}
  async mcpStatus(run,{signal}={}){
    const selected=this.selectedMcp(run),names=Object.keys(selected);if(!names.length)return {servers:[]};
    const cancelled=()=>new Error('Claude MCP connection check cancelled.');
    if(signal?.aborted)throw cancelled();
    if(this.cleanupError)throw this.cleanupError;
    if(this.active&&this.activeRunId===run.id)return {servers:await this.mcpState(this.active,names,10000,selected)};
    if(this.active)throw new Error('Refresh Claude MCP connections after the active Claude turn finishes.');
    if(this.mcpProbe)throw new Error('A Claude MCP connection check is already running.');
    const config=privateClaudeMcpConfig(selected,run.schedule.workspace.cwd);
    let client,result,cleanupError,failure;
    const withAbort=promise=>!signal?promise:new Promise((resolve,reject)=>{
      if(signal.aborted){reject(cancelled());return;}
      const abort=()=>reject(cancelled());signal.addEventListener('abort',abort,{once:true});
      Promise.resolve(promise).then(resolve,reject).finally(()=>signal.removeEventListener('abort',abort));
    });
    try{
      client=this.client(['--no-session-persistence','--system-prompt','Proteus selected MCP connection status.'],run.schedule.workspace.cwd,config.file);this.mcpProbe=client;
      await withAbort(client.initialize({},30000));
      const now=this.options.mcpStatusNow||(()=>performance.now()),wait=this.options.mcpStatusWait||((ms)=>new Promise(resolve=>setTimeout(resolve,ms)));
      const deadline=now()+(this.options.mcpStatusSettleMs??15000),pollMs=this.options.mcpStatusPollMs??250;
      let servers;
      do{
        if(signal?.aborted)throw cancelled();
        servers=await withAbort(this.mcpState(client,names,Math.max(1000,Math.min(10000,deadline-now())),selected));
        if(!servers.some(item=>item.status==='pending')||now()>=deadline)break;
        await withAbort(wait(Math.min(pollMs,Math.max(1,deadline-now()))));
      }while(true);
      result={servers};
    }
    catch(error){failure=signal?.aborted?cancelled():error.message?.startsWith('Claude did not return MCP')?error:new Error('Claude MCP connection status is unavailable. Check the selected server on this Mac and retry.');}
    finally{if(client)try{await client.close();}catch(error){this.cleanupClients.add(client);this.cleanupError=error;cleanupError=error;}if(!cleanupError&&this.mcpProbe===client)this.mcpProbe=null;config.dispose();}
    if(cleanupError)throw cleanupError;
    if(failure)throw failure;
    return result;
  }
  async retryPendingCleanup(){
    for(const client of this.cleanupClients){
      try{await (client.retryClose?client.retryClose():client.close());this.cleanupClients.delete(client);if(this.active===client)this.active=null;if(this.mcpProbe===client)this.mcpProbe=null;}
      catch(error){this.cleanupError=error;}
    }
    if(!this.cleanupClients.size)this.cleanupError=null;
    return this.cleanupError;
  }
  async status(){
    if(this.cleanupClients.size&&await this.retryPendingCleanup())return {provider:'claude',available:false,models:[],error:this.cleanupError.message,authenticationCommand:{executable:this.options.command||claudeExecutable(),args:['auth','login']}};
    const client=this.client(['--no-session-persistence','--system-prompt','Proteus capability discovery.']);let status;
    const authenticationCommand={executable:this.options.command||claudeExecutable(),args:['auth','login']};
    try{
      const result=await client.initialize();const account=result.account||{};
      const available=claudeAccountAvailable(account);
      status={provider:'claude',authenticationCommand,available,models:(result.models||[]).map(m=>claudeModel(m,result)),error:available?null:'Sign in to Claude Code on this Mac with claude auth login. The Claude app account is separate.',capabilities:{steering:false,context:'Selected instructions and skills; native Claude sessions; tool approvals through Proteus.'}};
    }catch(error){status={provider:'claude',authenticationCommand,available:false,models:[],error:error.message};}
    try{await client.close();}catch(error){this.cleanupClients.add(client);this.cleanupError=error;status={...status,available:false,error:error.message};}
    if(this.cleanupError)status={...status,available:false,error:this.cleanupError.message};
    return status;
  }
  async quota(){
    if(this.quotaPending)return this.quotaPending;
    this.quotaPending=this.readQuota().finally(()=>{this.quotaPending=null;});return this.quotaPending;
  }
  async readQuota(){
    const unavailable=error=>({provider:'claude',windows:[],available:false,source:'Claude Code /usage',error});
    if(this.cleanupClients.size&&await this.retryPendingCleanup())return unavailable(this.cleanupError.message);
    const client=this.client(['--no-session-persistence','--system-prompt','Proteus read-only account usage discovery.']);this.quotaClient=client;
    const deadline=Date.now()+(this.options.quotaTimeoutMs??8000),remaining=()=>Math.max(1,deadline-Date.now());let quota;
    try{await client.initialize({},remaining());quota=claudeQuota(await client.request({subtype:'get_usage'},remaining()));}
    catch(error){
      const message=/timed out/i.test(error.message)?'Claude account usage request timed out.':'This Claude runtime could not provide structured subscription usage. Update Claude Code or check Usage in the Claude app.';
      quota=this.rateLimits?.size?{provider:'claude',windows:[...this.rateLimits.values()],available:true,source:'Claude runtime rate-limit events',observedAt:this.rateLimitsObservedAt,error:message}:unavailable(message);
    }
    try{await client.close();}catch(error){this.cleanupClients.add(client);this.cleanupError=error;quota=unavailable(error.message);}
    if(this.quotaClient===client)this.quotaClient=null;return quota;
  }

  async run({run,prompt,attachments=[],emit,ask,update,signal,stream,permissionProfile}) {
    const content=attachments.length?[{type:'text',text:prompt}]:prompt;
    for(const item of attachments){
      if(!this.acceptedMediaTypes.includes(item.mediaType)||!Buffer.isBuffer(item.bytes)||item.bytes.length>8*1024*1024)throw new Error('Claude can receive images and UTF-8 plain text here. PDF and other files are not supported.');
      if(item.mediaType==='text/plain'){
        let decoded;try{decoded=new TextDecoder('utf-8',{fatal:true}).decode(item.bytes);}catch{throw new Error('Claude requires UTF-8 plain text attachments.');}
        if(decoded.includes('\0'))throw new Error('Claude cannot receive binary content as plain text.');
        content.push({type:'text',text:`Attached plain text file: ${item.name}\n\n${decoded}`});
      }else content.push({type:'image',source:{type:'base64',media_type:item.mediaType,data:item.bytes.toString('base64')}});
    }
    if(this.cleanupError)throw this.cleanupError;
    if(this.active)throw new Error('A Claude turn is already active.');
    if(this.mcpProbe)throw new Error('Wait for the Claude MCP connection check to finish before starting this chat.');
    const snapshot=run.schedule.context,managed=snapshot&&this.context?this.context.providerContext(snapshot):null;
    if(managed?.customAgents?.some(a=>a.tools!==null))throw new Error('Claude cannot enforce selected editor agent tool filters. Deselect restricted agents.');
    const selected=this.selectedMcp(run);
    if(Object.hasOwn(selected,'proteus_app'))throw new Error('The proteus_app MCP name is reserved for Proteus document tools.');
    if(run.schedule.skillDirectories?.length&&snapshot?.includeDefaults!==false)throw new Error('For Claude select individual skills; legacy skill directories cannot be isolated.');
    if(signal.aborted)throw new Error('Cancelled');
    const instructions=`${appInstructions}\nYou are running inside Proteus. Use only the following explicitly supplied instructions and sources. Do not discover instruction, skill, agent, or memory files automatically.\nWorkspace: ${run.schedule.workspace.cwd}\n${managed?.instructionText||''}\n${(managed?.customAgents||[]).map(a=>`Agent ${a.displayName}:\n${a.prompt}`).join('\n\n')}\nEditor context: ${JSON.stringify(run.schedule.editorContext||null)}`;
    // A custom system prompt omits Claude Code's automatic instruction context. Settings,
    // skills, MCPs and plugins are excluded independently, while native credentials stay native.
    const settings={claudeMdExcludes:['/**'],autoMemoryEnabled:false,enabledPlugins:{},fastMode:run.schedule.serviceTier==='fast'};
    const args=['--system-prompt',instructions,'--settings',JSON.stringify(settings),'--disallowedTools','Agent,Task,Skill,EnterWorktree,ExitWorktree'];
    if(run.schedule.model)args.push('--model',run.schedule.model);
    if(run.schedule.reasoningEffort)args.push('--effort',run.schedule.reasoningEffort);
    if(run.providerSessionId)args.push('--resume',run.providerSessionId);
    // Additional roots are conveyed to the native permission system, with skills disabled.
    for(const root of new Set([...(run.schedule.workspace.additionalDirectories||[]),...(permissionProfile?.().chatFolders||[]).map(folder=>folder.path)]))args.push('--add-dir',root);
    const appTools=[...browserTools(this.browser,run.id),...integrationTools(this.integrations,run.id)];captureAppCapabilities(run,appTools,update);
    const bridge=await documentBridge(this.browser,run.id,appTools.filter(tool=>tool.name!=='proteus_open_document'));
    const configured={...selected,...(bridge?{proteus_app:bridge.config}:{})};
    let mcpConfig;try{mcpConfig=Object.keys(configured).length?privateClaudeMcpConfig(configured,run.schedule.workspace.cwd):null;}catch(error){await bridge?.close();throw error;}
    let client;try{client=this.client(args,run.schedule.workspace.cwd,mcpConfig?.file||null);}catch(error){mcpConfig?.dispose();await bridge?.close();throw error;}
    this.active=client;this.activeRunId=run.id;
    let resolve,reject;const done=new Promise((a,b)=>{resolve=a;reject=b;});done.catch(()=>{});
    const calls=new Map();let currentId='claude',resultSeen=false;const approved=new Map();
    let remaining=this.options.timeoutMs??30*60*1000,started=performance.now(),timer,pauses=0,finished=false;
    const arm=()=>{if(finished||pauses)return;started=performance.now();timer=setTimeout(()=>reject(new Error('Claude exceeded the active execution time limit. Waiting for input was excluded.')),Math.max(0,remaining));};
    const askUser=async request=>{if(pauses++===0){clearTimeout(timer);remaining-=performance.now()-started;}try{return await ask(request);}finally{if(--pauses===0)arm();}};
    const permissionKey=(id,name,input)=>typeof id==='string'&&id.length?JSON.stringify([id,name,input]):null;
    arm();
    const permit=async(name,input,id)=>{
      if(name==='AskUserQuestion'){const answers={};for(const q of input.questions||[])answers[q.question]=await askUser({type:'question',question:q.question,choices:q.options?.map(x=>x.label),optionDetails:q.options?.map(x=>({label:x.label,description:x.description||''})),providerQuestionId:q.id});return {behavior:'allow',updatedInput:{...input,answers}};}
      const kind=name==='Bash'?'shell':['Write','Edit','MultiEdit','NotebookEdit'].includes(name)?'write':['Read','Glob','Grep'].includes(name)?'read':'custom-tool';
      const answer=await askUser({type:'permission',question:`Allow Claude ${name}?`,details:{kind,toolCallId:id,toolName:name,args:input,fullCommandText:input.command,fileName:input.file_path||input.notebook_path||input.path,path:input.file_path||input.path||run.schedule.workspace.cwd,intention:`Claude ${name}`}});
      return ['approve','approve-auto'].includes(answer)?{behavior:'allow',updatedInput:input}:{behavior:'deny',message:'The operator declined this tool.'};
    };
    const request=async m=>{try{const r=m.request;let answer;
      if(r.subtype==='hook_callback'){
        const data=r.input||{},id=data.tool_use_id||r.tool_use_id;answer=await permit(data.tool_name,data.tool_input||{},id);
        const key=permissionKey(id,data.tool_name,data.tool_input||{});if(key)approved.set(key,answer);
        client.respond(m.request_id,{hookSpecificOutput:{hookEventName:'PreToolUse',permissionDecision:answer.behavior==='allow'?'allow':'deny',permissionDecisionReason:answer.message||'Approved through Proteus',...(answer.updatedInput?{updatedInput:answer.updatedInput}:{})}});
      }else if(r.subtype==='can_use_tool')client.respond(m.request_id,approved.get(permissionKey(r.tool_use_id,r.tool_name,r.input||{}))||await permit(r.tool_name,r.input||{},r.tool_use_id));
      else client.respond(m.request_id,{behavior:'deny',message:'Unsupported Claude control request.'});
    }catch(error){if(!client.ended)client.respond(m.request_id,{behavior:'deny',message:error.message});}};
    const message=m=>{
      if(m.session_id){run.providerSessionId=m.session_id;run.providerHome=process.env.CLAUDE_CONFIG_DIR||path.join(os.homedir(),'.claude');update();}
      if(m.type==='stream_event'){const event=m.event;if(event?.type==='message_start')currentId=event.message.id;if(event?.type==='content_block_delta'&&event.delta?.type==='text_delta')stream(currentId,event.delta.text);}
      if(m.type==='assistant'){
        if(m.error){reject(new Error(`Claude ${m.error}`));return;}
        for(const block of m.message?.content||[]){if(block.type==='text'){if(run.liveMessages)delete run.liveMessages[m.message.id];emit('assistant',block.text);}if(block.type==='tool_use'){
          const tool={callId:block.id,name:block.name,summary:toolSummary(block.name,block.input),arguments:displayText(block.input,6000),status:'running',startedAt:new Date().toISOString()};calls.set(block.id,tool);emit('tool',tool.summary,{tool});}}
      }
      if(m.type==='user')for(const block of m.message?.content||[])if(block.type==='tool_result'){const tool=calls.get(block.tool_use_id);if(tool){tool.status=block.is_error?'failed':'completed';tool.output=displayText(block.content);tool.finishedAt=new Date().toISOString();tool.durationMs=Date.now()-Date.parse(tool.startedAt);update();}}
      if(m.type==='system'&&m.subtype==='compact_boundary')emit('system','Claude compacted conversation context.');
      if(m.type==='rate_limit_event'){
        const q=m.rate_limit_info||m.rateLimitInfo||{},id=q.rateLimitType||q.rate_limit_type;
        if(id){this.rateLimits??=new Map();this.rateLimitsObservedAt=new Date().toISOString();const reset=q.resetsAt??q.resets_at;this.rateLimits.set(id,{id,label:id.replaceAll('_',' '),remainingPercent:Number.isFinite(q.utilization)?Math.max(0,Math.min(100,100-q.utilization*100)):null,resetAt:Number.isFinite(reset)?new Date(reset*1000).toISOString():null,status:q.status,unlimited:false});}
      }
      if(m.type==='result'){if(resultSeen)return;resultSeen=true;if(m.usage)run.usage=accumulateClaudeUsage(run.usage,m.usage);run.contextUsage=m.modelUsage||null;update();m.is_error||m.subtype!=='success'?reject(new Error((m.errors||[]).join('\n')||`Claude ${m.subtype}`)):resolve();}
    };
    const closed=e=>{if(!resultSeen)reject(e);};const abort=()=>{void client.close().then(()=>reject(new Error('Cancelled')),error=>reject(error));};
    client.on('message',message);client.on('request',request);client.on('closed',closed);signal.addEventListener('abort',abort,{once:true});
    try {let result;
      try{result=await client.initialize({PreToolUse:[{matcher:'.*',hookCallbackIds:['proteus_permission']}]});}
      catch(error){if(Object.keys(selected).length)throw new Error('Claude could not initialize the selected MCP connections on this Mac. Check their configuration and retry.');throw error;}
      if(result.hooks_applied!==true)throw new Error('Claude did not confirm the Proteus permission hooks. Update Claude Code before running this chat.');
      if(Object.keys(selected).length){
        const names=Object.keys(selected),deadline=Date.now()+30_000;let states=[];
        do{
          states=await this.mcpState(client,names,Math.max(1000,Math.min(5000,deadline-Date.now())),selected);
          run.mcpConnections=Object.fromEntries(states.map(item=>[item.name,{status:item.status,observedAt:new Date().toISOString(),...(item.error?{error:item.error}:{})}]));update();
          const unavailable=states.find(item=>['failed','needs-auth','disabled','not-connected'].includes(item.status));
          if(unavailable)throw new Error(`Claude MCP ${unavailable.name}: ${unavailable.status}. ${unavailable.error||'Check the selected server on this Mac.'}`);
          if(states.every(item=>item.status==='connected'))break;
          await new Promise(resolve=>setTimeout(resolve,250));
        }while(Date.now()<deadline);
        if(states.some(item=>item.status!=='connected'))throw new Error('Claude MCP connection is still pending. Check the selected server on this Mac and retry.');
      }
      const model=(result.models||[]).map(m=>claudeModel(m,result)).find(m=>m.id===run.schedule.model);if(!model)throw new Error('Choose an available Claude model from the provider catalog.');validateModelOptions(run.schedule,model);
      // Fast mode requires both model support and runtime opt-in. Do not silently ignore a selection.
      if(run.schedule.serviceTier==='fast'&&result.fast_mode_disabled_reason)throw new Error(`Claude fast mode unavailable: ${result.fast_mode_disabled_reason}. Choose Provider default.`);
      run.modelCapabilities={id:model.id,controls:model.controls,capturedAt:new Date().toISOString()};if(snapshot){snapshot.suppliedAt=new Date().toISOString();snapshot.delivery='Claude explicit system prompt accepted';}update();
      if(signal.aborted)throw new Error('Cancelled');client.write({type:'user',session_id:run.providerSessionId||'',message:{role:'user',content},parent_tool_use_id:null});await done;
    }finally{
      finished=true;clearTimeout(timer);signal.removeEventListener('abort',abort);let cleanupError;
      try{await client.close();}catch(error){cleanupError=error;this.cleanupError=error;this.cleanupClients.add(client);}
      finally{client.off('message',message);client.off('request',request);client.off('closed',closed);mcpConfig?.dispose();await bridge?.close();if(!cleanupError){this.active=null;this.activeRunId=null;}for(const tool of calls.values())if(tool.status==='running')tool.status='interrupted';update();}
      if(cleanupError)throw cleanupError;
    }
  }
  async close(){const results=await Promise.allSettled([...new Set([this.active,this.mcpProbe,this.quotaClient,...this.cleanupClients].filter(Boolean))].map(client=>client.close()));const failed=results.find(result=>result.status==='rejected');if(failed){this.cleanupError=failed.reason;throw failed.reason;}}
}
