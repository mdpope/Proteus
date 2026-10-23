import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
import {modelToolResult} from '../../shared/tool-results.js';

const reads=new Set(['list_apps','list_windows','get_window_state','check_permissions','get_accessibility_tree','get_agent_cursor_state','verify_state','see','permissions']);
const allowed=new Set([...reads,'click','double_click','right_click','type_text','press_key','hotkey','scroll','drag','set_value','set_window_frame','invoke_menu','type','press','action','app','window','launch_app']);
export function desktopExecutable(name,env=process.env,{platform=process.platform,home=os.homedir()}={}){
 const override=env[name==='cua'?'PROTEUS_CUA_DRIVER_PATH':'PROTEUS_PEEKABOO_PATH'];
 const command=name==='cua'?'cua-driver':'peekaboo';
 const directories=[...(env.PATH||'').split(path.delimiter).filter(Boolean),path.join(home,'.local','bin'),...(platform==='darwin'?['/opt/homebrew/bin','/usr/local/bin']:platform==='linux'?['/usr/local/bin','/usr/bin']:[])];
 const candidates=override?[override]:[...new Set(directories)].map(dir=>path.join(dir,command+(platform==='win32'?'.exe':'')));
 return candidates.find(file=>{try{fs.accessSync(file,fs.constants.X_OK);return true;}catch{return false;}})||null;
}
// One private stdio lease per backend, started only when a catalog/action is requested.
export class DesktopMCPClient {
 constructor(command,args,{spawnProcess=spawn}={}){this.command=command;this.args=args;this.spawnProcess=spawnProcess;this.pending=new Map();this.sequence=0;}
 async connect(){
  this.child=this.spawnProcess(this.command,this.args,{stdio:['pipe','pipe','pipe'],windowsHide:true,env:{...process.env,CUA_DRIVER_RS_TELEMETRY_ENABLED:'0',PEEKABOO_DISABLE_TOOLS:'browser,agent,shell,analyze,clipboard,capture,image,dock,space,dialog,paste'}});
  let buffer='';this.child.stdout.setEncoding('utf8');this.child.stdout.on('data',part=>{
   buffer+=part;if(Buffer.byteLength(buffer)>20*1024*1024){this.close(new Error('Desktop response exceeds its image budget.'));return;}
   for(let end;(end=buffer.indexOf('\n'))>=0;){const line=buffer.slice(0,end);buffer=buffer.slice(end+1);try{const message=JSON.parse(line),pending=this.pending.get(message.id);if(!pending)continue;this.pending.delete(message.id);clearTimeout(pending.timer);message.error?pending.reject(new Error(message.error.message)):pending.resolve(message.result);}catch{/* Non-protocol startup output is never model evidence. */}}
  });
  this.child.stderr.on('data',()=>{});this.child.once('error',error=>this.close(error));this.child.once('exit',()=>this.close(new Error('Desktop backend exited.')));
  await this.request('initialize',{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'Proteus desktop control',version:'1.0.0'}});
  this.child.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');return this;
 }
 request(method,params={}){return new Promise((resolve,reject)=>{const id=++this.sequence,timer=setTimeout(()=>{this.pending.delete(id);reject(new Error('Desktop backend timed out; any input effect is uncertain. Observe before retrying.'));},60000);this.pending.set(id,{resolve,reject,timer});this.child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n',error=>{if(error){clearTimeout(timer);this.pending.delete(id);reject(error);}});});}
 close(error=new Error('Desktop control stopped.')){if(this.closed)return;this.closed=true;for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(error);}this.pending.clear();this.child?.stdin.end();this.child?.kill();}
}
function snapshotId(result){
 const meta=result._meta||result.structuredContent||{};if(meta.snapshot_id||meta.snapshotId)return meta.snapshot_id||meta.snapshotId;
 for(const block of result.content||[])if(block.type==='text')try{const value=JSON.parse(block.text),meta=value._meta||value.data||value;const id=meta.snapshot_id||meta.snapshotId||meta.snapshot?.id;if(id)return id;}catch{}
 return null;
}
function deniedPermission(result){
 const text=(result.content||[]).filter(block=>block.type==='text').map(block=>block.text).join('\n');
 const denied=value=>{
  if(!value||typeof value!=='object')return false;
  if(value.isRequired===true&&value.isGranted===false)return true;
  for(const key of ['accessibility','screen_recording','screenRecording'])if(value[key]===false||value[key]?.granted===false)return true;
  return Object.values(value).some(denied);
 };
 const payloads=[result.structuredContent,result._meta];
 for(const block of result.content||[])if(block.type==='text')try{payloads.push(JSON.parse(block.text));}catch{}
 return {denied:payloads.some(denied)||/permission (?:denied|not granted)|not authorized|TCC.{0,30}denied/i.test(text),text};
}
const sessionLabel=owner=>'proteus-'+createHash('sha256').update(owner).digest('hex').slice(0,12);
export class DesktopControl {
 constructor({platform=process.platform,locate=desktopExecutable,connect=async(command,args)=>new DesktopMCPClient(command,args).connect(),now=Date.now,idleMs=120000,active=()=>true}={}){
  Object.assign(this,{platform,locate,connect,now,idleMs,active});this.clients=new Map();this.cuaSessions=new Set();this.observations=new Map();this.failure=new Map();this.serial=Promise.resolve();this.epoch=0;this.sessionNonce=randomUUID().slice(0,8);this.lastUsed=now();
  this.timer=setInterval(()=>{if(this.clients.size&&this.now()-this.lastUsed>this.idleMs)void this.stop();},10000);this.timer.unref?.();
 }
 status(){return {platform:this.platform,primary:'cua',backup:this.platform==='darwin'?'peekaboo':null,backends:['cua',...(this.platform==='darwin'?['peekaboo']:[])].map(id=>({id,installed:!!this.locate(id),running:this.clients.has(id),setup:id==='cua'?'https://cua.ai/docs/cua-driver/quickstart':'https://github.com/openclaw/Peekaboo'})),permissionIssue:this.permissionFailure||null,uncertainTarget:this.uncertain||null,lastProbe:this.lastProbe||null,lease:this.lease?{owner:this.lease.owner,backend:this.lease.backend,pid:this.lease.pid,windowId:this.lease.windowId,uncertain:!!this.lease.uncertain}:null};}
 async client(backend){
  if(!['cua','peekaboo'].includes(backend)||backend==='peekaboo'&&this.platform!=='darwin')throw Error('This desktop backend is unavailable on this platform.');
  if(this.clients.has(backend))return this.clients.get(backend);
  const file=this.locate(backend);if(!file)throw Error((backend==='cua'?'Cua Driver':'Peekaboo')+' is not installed. Open Engine Room → Desktop Control for setup.');
  const client=await this.connect(file,backend==='cua'?['mcp']:['mcp','serve']);this.clients.set(backend,client);this.lastUsed=this.now();return client;
 }
 async catalog(backend){
  const client=await this.client(backend),result=await client.request('tools/list');
  return (result.tools||[]).filter(tool=>allowed.has(tool.name)).map(tool=>{
   if(backend!=='peekaboo')return tool;
   const schema=structuredClone(tool.inputSchema||{type:'object',properties:{}});schema.properties||={};
   if(tool.name==='app'&&schema.properties.action)schema.properties.action.enum=['list','launch'];
   if(!['app','permissions','get_agent_cursor_state'].includes(tool.name)){schema.properties.pid={type:'integer',minimum:1,description:'Proteus target process from app discovery.'};schema.properties.window_id={type:'integer',minimum:1,description:'Exact window from window discovery. Proteus binds this to the backend snapshot.'};}
   return {...tool,inputSchema:schema,description:tool.description+' Proteus additionally requires exact pid/window_id for observations and input; it supplies the pinned backend snapshot.'};
  });
 }
 handle(value={},owner='operator'){
  if(value.action==='status')return Promise.resolve(this.status());
  if(value.action==='stop')return this.stop(owner);
  const epoch=this.epoch,execute=async()=>{if(this.stopping)await this.stopping;if(epoch!==this.epoch)throw Error('Desktop request was cancelled by Stop.');return this.perform(value,owner);};const pending=this.serial.then(execute,execute);this.serial=pending.catch(()=>{});return pending;
 }
 async perform(value,owner){
  if(!this.active(owner))throw Error('This desktop request no longer belongs to an active chat.');
  const backend=value.backend||'cua',epoch=this.epoch;
  if(this.lease&&this.lease.owner!==owner)throw Error('Desktop input is owned by another chat. Stop that lease or wait for it to become idle.');
  if(backend==='peekaboo'&&this.permissionFailure?.backend==='cua')throw Error('Desktop permission was denied. Review it in Desktop Control; switching backends cannot bypass it.');
  if(backend==='peekaboo'&&this.locate('cua')&&!String(value.reason||'').trim())throw Error('Use Cua Driver first. Explain the missing capability or failed observation before choosing Peekaboo.');
  const tools=await this.catalog(backend);this.lastUsed=this.now();
  if(value.action==='test'){
   if(this.lease&&this.lease.owner!=='operator')throw Error('A chat owns desktop control. Discovery test will not interrupt it.');
   const client=await this.client(backend),name=backend==='cua'?'check_permissions':'permissions';const result=await client.request('tools/call',{name,arguments:{}});const checked=deniedPermission(result),text=checked.text,denied=result.isError||checked.denied;
   if(denied)this.permissionFailure={backend,message:text.slice(0,1200)};
   this.lastProbe={backend,at:this.now(),catalogTools:tools.length,permissionError:!!denied};return {tools:tools.length,permissionResult:result,controlVerified:false};
  }
  if(value.action==='catalog'){this.lease={...(this.lease||{}),owner,backend,at:this.now()};return {backend,tools,order:'Cua Driver first; Peekaboo on Mac only after a fresh observation of the same target. No input is retried automatically.'};}
  if(value.action!=='call')throw Error('Choose status, catalog, call or stop.');
  const tool=tools.find(tool=>tool.name===value.tool);if(!tool)throw Error('Choose a tool from the current desktop catalog.');
  const args={...(value.arguments||{})};if(JSON.stringify(args).length>64000)throw Error('Desktop arguments exceed the supported limit.');
  if(args.foreground===true||args.delivery_mode==='foreground'||args.background===false||args.web_focus===true||args.scope==='desktop'||args.target&&args.target.kind!=='window')throw Error('Proteus desktop control uses the exact observed window and background delivery.');
  if(['path','screenshot_out_file','output_path','additional_arguments','webkit_inspector_port','urls'].some(key=>args[key]!==undefined))throw Error('Use embedded observations and the bounded native-app tools. File exports and launch arguments use their existing authorized tools.');
  if(tool.name==='app'&&!['list','launch'].includes(args.action))throw Error('Use app list or launch. Other app lifecycle actions require the observed window.');
  const launching=tool.name==='launch_app'||tool.name==='app'&&args.action==='launch';
  const discovery=['list_apps','list_windows','check_permissions','get_accessibility_tree','permissions','get_agent_cursor_state'].includes(tool.name)||tool.name==='app'&&args.action==='list'||tool.name==='window'&&args.action==='list';
  const pid=Number(args.pid??args.target?.pid),windowId=args.window_id??args.windowId??args.target?.window_id;
  if(!discovery&&!launching&&(!Number.isSafeInteger(pid)||pid<1||!Number.isSafeInteger(windowId)||windowId<1))throw Error('Choose an exact process and window from fresh discovery.');
  if(args.target&&(args.target.pid!==pid||args.target.window_id!==windowId))throw Error('The nested input target differs from the observed window.');
  if(launching&&!(args.bundle_id||args.bundleId||args.name))throw Error('Choose one exact app from discovery.');
  if(launching&&(args.all||args.force))throw Error('Launch one exact app.');
  if(!discovery&&!launching&&this.lease?.pid&&(this.lease.pid!==pid||this.lease.windowId!==windowId))throw Error('Stop this lease before selecting another app/window.');
  const observe=['get_window_state','see'].includes(tool.name),mutating=!discovery&&!launching&&!reads.has(tool.name),observation=this.observations.get(owner);
  if(this.uncertain&&!discovery&&!launching&&(this.uncertain.pid!==pid||this.uncertain.windowId!==windowId))throw Error('Re-observe the previous uncertain target before switching windows.');
  if(mutating&&this.permissionFailure)throw Error('Desktop permission remains denied. Check permissions and observe successfully before input.');
  if(mutating&&(!observation||observation.id!==value.observationId||observation.backend!==backend||observation.pid!==pid||observation.windowId!==windowId||this.now()-observation.at>20000))throw Error('Take a fresh observation with this backend and use its observationId before input.');
  if(backend==='peekaboo'){
   if(tool.name==='see'){args.app_target='PID:'+pid;args.fresh=true;args.include_elements=true;}
   if(tool.name==='window'&&pid){args.app='PID:'+pid;delete args.title;delete args.index;}
   if(mutating){if(!observation.snapshot)throw Error('Peekaboo did not return a target-bound snapshot. Re-observe before input.');if(tool.inputSchema.properties.snapshot)args.snapshot=observation.snapshot;if(args.coordinate_reference!==undefined)args.coordinate_reference=observation.snapshot;}
   // Peekaboo input targets are snapshot-bound; several tools accept no PID or
   // window selector. Keep the wrapper's check, then pass its native schema.
   const raw=(await (await this.client(backend)).request('tools/list')).tools.find(item=>item.name===tool.name)?.inputSchema?.properties||{};
   for(const key of ['pid','window_id'])if(!raw[key])delete args[key];
  }
  if(tool.inputSchema?.properties?.session){args.session=sessionLabel(owner)+'-'+this.sessionNonce;if(backend==='cua')this.cuaSessions.add(args.session);}
  this.lease={owner,backend,pid:discovery||launching?this.lease?.pid:pid,windowId:discovery||launching?this.lease?.windowId:windowId,at:this.now(),uncertain:mutating};
  if(mutating){this.observations.delete(owner);this.uncertain={owner,backend,pid,windowId};}
  this.inFlight={owner,backend,pid,windowId,mutating};
  try{
   const result=await (await this.client(backend)).request('tools/call',{name:tool.name,arguments:args});
   if(epoch!==this.epoch||!this.active(owner))throw Error('Desktop control was revoked while the operation was in flight. Observe before any retry.');
   const checked=deniedPermission(result);
   if(result.isError||checked.denied){const message=checked.text,permission=checked.denied||/permission|denied|not authorized|TCC/i.test(message);this.failure.set(owner,{permission,uncertain:mutating});if(permission)this.permissionFailure={backend,message:message.slice(0,1200)};return {...result,isError:true};}
   if(observe){const receipt=result._meta?.target_receipt||result.structuredContent?.target_receipt||result.structuredContent;if(Number(receipt?.pid)!==pid||Number(receipt?.window_id)!==windowId)throw Error('The desktop backend did not confirm the requested process/window. No input is authorized from this observation.');}
   if(observe){const observed={id:randomUUID(),backend,pid,windowId,at:this.now(),snapshot:snapshotId(result)};this.observations.set(owner,observed);this.lease.uncertain=false;this.uncertain=null;this.failure.delete(owner);if(this.permissionFailure?.backend===backend)this.permissionFailure=null;return {...result,content:[{type:'text',text:JSON.stringify({observationId:observed.id,backend,pid,windowId,expiresInMs:20000})},...(result.content||[])]};}
   return result;
  }catch(error){const permission=/permission|denied|not authorized|TCC/i.test(error.message);this.failure.set(owner,{permission,uncertain:mutating});if(permission)this.permissionFailure={backend,message:error.message.slice(0,1200)};throw error;}
  finally{this.inFlight=null;}
 }
 async stop(owner){
  if(owner&&this.lease&&this.lease.owner!==owner&&owner!=='operator')throw Error('This chat does not own desktop input.');
  if(this.stopping)return this.stopping;
  this.epoch++;this.observations.clear();this.lease=null;
  this.stopping=(async()=>{
   if(this.clients.has('cua')){let timer;await Promise.race([Promise.all([...this.cuaSessions].map(session=>this.clients.get('cua').request('tools/call',{name:'end_session',arguments:{session}}).catch(()=>{}))),new Promise(resolve=>{timer=setTimeout(resolve,1500);})]);clearTimeout(timer);}
   for(const client of this.clients.values())client.close();this.clients.clear();this.cuaSessions.clear();this.sessionNonce=randomUUID().slice(0,8);return this.status();
  })();try{return await this.stopping;}finally{this.stopping=null;}
 }

 async close(){clearInterval(this.timer);return this.stop();}
}

export function desktopTools(broker,runId){return broker?[{name:'proteus_desktop',defer:'auto',description:'Host-owned native desktop control. Inspect status, discover the Cua Driver catalog on demand, then list apps/windows and observe an exact process/window. Use the returned observationId for one input within 20 seconds; observe again to verify. Cua Driver is primary; Peekaboo is a Mac-only fallback with a reason and its own fresh observation. A single chat owns input. Permission denial is never bypassed, uncertain effects are never retried automatically. Stop releases the lease and Proteus-owned MCP processes. Browser page work should use Proteus browser tools first.',parameters:{type:'object',properties:{action:{type:'string',enum:['status','catalog','call','stop']},backend:{type:'string',enum:['cua','peekaboo']},reason:{type:'string'},tool:{type:'string'},arguments:{type:'object'},observationId:{type:'string'}},required:['action'],additionalProperties:false},handler:async args=>{try{return modelToolResult(await broker.handle(args,runId));}catch(error){return {resultType:'failure',textResultForLlm:JSON.stringify({error:error.message})};}}}]:[];}
