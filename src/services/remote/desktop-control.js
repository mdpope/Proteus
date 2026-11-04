import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
import {modelToolResult} from '../../shared/tool-results.js';

const reads=new Set(['list_apps','list_windows','get_window_state','check_permissions','get_accessibility_tree','get_agent_cursor_state','verify_state','see','permissions']);
const allowed=new Set([...reads,'click','double_click','right_click','type_text','press_key','hotkey','scroll','drag','set_value','set_window_frame','invoke_menu','type','press','action','app','window','launch_app']);
export function desktopExecutable(name,env=process.env,{platform=process.platform,home=os.homedir(),executable=file=>{try{fs.accessSync(file,fs.constants.X_OK);return true;}catch{return false;}}}={}){
 const override=env[name==='cua'?'PROTEUS_CUA_DRIVER_PATH':'PROTEUS_PEEKABOO_PATH'];
 const command=name==='cua'?'cua-driver':'peekaboo',paths=platform==='win32'?path.win32:path.posix;
 // A running app keeps the PATH it started with, so a driver installed afterwards
 // must also be found at the official installer's own location.
 const windows=platform==='win32'&&name==='cua'?[env.CUA_DRIVER_RS_INSTALL_DIR,env.LOCALAPPDATA&&paths.join(env.LOCALAPPDATA,'Programs','Cua','cua-driver','bin')].filter(Boolean):[];
 const directories=[...(env.PATH||'').split(paths.delimiter).filter(Boolean),...windows,paths.join(home,'.local','bin'),...(platform==='darwin'?['/opt/homebrew/bin','/usr/local/bin']:platform==='linux'?['/usr/local/bin','/usr/bin']:[])];
 const candidates=override?[override]:[...new Set(directories)].map(dir=>paths.join(dir,command+(platform==='win32'?'.exe':'')));
 return candidates.find(file=>executable(file))||null;
}
// Official first-run steps per OS. Every command still goes through the setup chat's
// ordinary approval, and steps marked human are the person's own to perform.
export function desktopSetupSteps(platform){
 const verify={id:'verify',text:'Verify discovery, permissions, windows and a real observation.'};
 if(platform==='win32')return [
  {id:'install',text:'Install Cua Driver with its official installer. No administrator access is needed.',command:'irm https://cua.ai/driver/install.ps1 | iex'},
  {id:'start',text:'Start its background service in this signed-in desktop session. Run it from a desktop terminal, not over SSH. If the sign-in task is unavailable, run cua-driver serve and leave that window open.',command:'cua-driver autostart kick'},
  verify];
 if(platform==='darwin')return [
  {id:'install',text:'Install Cua Driver with its official installer.',command:'/bin/bash -c "$(curl -fsSL https://cua.ai/driver/install.sh)"'},
  {id:'permissions',human:true,text:'Grant Accessibility and Screen Recording to the driver when macOS asks. Only you can approve these.',command:'cua-driver permissions grant'},
  verify];
 return [
  {id:'install',text:'Install Cua Driver with its official installer. A minimal Debian or Ubuntu image also needs libxi6 and at-spi2-core.',command:'/bin/bash -c "$(curl -fsSL https://cua.ai/driver/install.sh)"'},
  {id:'start',text:'Start its service in your graphical session and leave it running.',command:'cua-driver serve'},
  verify];
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
// A missing exact window is an observation outcome, never an input grant. Older
// Cua builds return the documented refusal as text; corroborate it with a fresh,
// complete process-scoped WindowServer inventory before settling uncertainty.
function missingCuaWindow(result,pid,windowId){
 const values=[result.structuredContent];
 for(const block of result.content||[])if(block.type==='text')try{values.push(JSON.parse(block.text));}catch{}
 if(values.some(value=>value&&value.code==='window_id_not_found'&&value.pid===pid&&value.window_id===windowId))return true;
 return result.isError===true&&(result.content||[]).some(block=>block.type==='text'&&block.text.startsWith(`window_id ${windowId} is not a live window (closed, or the id is stale).`));
}
function windowInventory(result){
 if(result.isError||deniedPermission(result).denied)return null;
 const candidates=[result.structuredContent];
 for(const block of result.content||[])if(block.type==='text')try{candidates.push(JSON.parse(block.text));}catch{}
 const value=candidates.find(value=>Array.isArray(value?.windows));
 if(!value||value.truncated===true||value.partial===true||value.refusal||value.code||value.status&&value.status!=='ok')return null;
 return value.windows.every(window=>Number.isSafeInteger(window.pid)&&window.pid>0&&Number.isSafeInteger(window.window_id)&&window.window_id>0)?value.windows:null;
}
export class DesktopControl {
 constructor({platform=process.platform,locate=desktopExecutable,connect=async(command,args)=>new DesktopMCPClient(command,args).connect(),now=Date.now,idleMs=120000,active=()=>true}={}){
  Object.assign(this,{platform,locate,connect,now,idleMs,active});this.clients=new Map();this.cuaSessions=new Set();this.observations=new Map();this.failure=new Map();this.serial=Promise.resolve();this.epoch=0;this.sessionNonce=randomUUID().slice(0,8);this.lastUsed=now();
  this.timer=setInterval(()=>{if(this.clients.size&&this.now()-this.lastUsed>this.idleMs)void this.stop();},10000);this.timer.unref?.();
 }
 status(){return {setupSteps:desktopSetupSteps(this.platform),verification:this.lastVerification||null,platform:this.platform,primary:'cua',backup:this.platform==='darwin'?'peekaboo':null,backends:['cua',...(this.platform==='darwin'?['peekaboo']:[])].map(id=>({id,installed:!!this.locate(id),running:this.clients.has(id),setup:id==='cua'?'https://cua.ai/docs/cua-driver/quickstart':'https://github.com/openclaw/Peekaboo'})),permissionIssue:this.permissionFailure||null,uncertainTarget:this.uncertain||null,lastProbe:this.lastProbe||null,lease:this.lease?{owner:this.lease.owner,backend:this.lease.backend,pid:this.lease.pid,windowId:this.lease.windowId,uncertain:!!this.lease.uncertain}:null};}
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
  if(value.action==='verify')return this.verify(owner);
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
   if(observe&&backend==='cua'&&!checked.denied&&!/permission|denied|not authorized|TCC/i.test(checked.text)&&missingCuaWindow(result,pid,windowId)&&(!this.uncertain||this.uncertain.backend===backend)){
    const inventory=await (await this.client(backend)).request('tools/call',{name:'list_windows',arguments:{pid,...(args.session?{session:args.session}:{})}});
    if(epoch!==this.epoch||!this.active(owner))throw Error('Desktop control was revoked while checking window closure.');
    const windows=windowInventory(inventory),permission=deniedPermission(inventory);
    if(permission.denied)this.permissionFailure={backend,message:permission.text.slice(0,1200)};
    if(windows&&windows.every(window=>window.pid===pid&&window.window_id!==windowId)){
     this.observations.delete(owner);if(this.uncertain?.owner)this.observations.delete(this.uncertain.owner);
     this.uncertain=null;this.failure.delete(owner);this.lease={owner,backend,at:this.now(),uncertain:false};
     const receipt={targetState:'closed',backend,pid,windowId,observationRequired:true};
     return {structuredContent:receipt,content:[{type:'text',text:JSON.stringify(receipt)}]};
    }
   }
   if(result.isError||checked.denied){const message=checked.text,permission=checked.denied||/permission|denied|not authorized|TCC/i.test(message);this.failure.set(owner,{permission,uncertain:mutating});if(permission)this.permissionFailure={backend,message:message.slice(0,1200)};return {...result,isError:true};}
   if(observe){const receipt=result._meta?.target_receipt||result.structuredContent?.target_receipt||result.structuredContent;if(Number(receipt?.pid)!==pid||Number(receipt?.window_id)!==windowId)throw Error('The desktop backend did not confirm the requested process/window. No input is authorized from this observation.');}
   if(observe){const observed={id:randomUUID(),backend,pid,windowId,at:this.now(),snapshot:snapshotId(result)};this.observations.set(owner,observed);this.lease.uncertain=false;this.uncertain=null;this.failure.delete(owner);if(this.permissionFailure?.backend===backend)this.permissionFailure=null;return {...result,content:[{type:'text',text:JSON.stringify({observationId:observed.id,backend,pid,windowId,expiresInMs:20000})},...(result.content||[])]};}
   return result;
  }catch(error){const permission=/permission|denied|not authorized|TCC/i.test(error.message);this.failure.set(owner,{permission,uncertain:mutating});if(permission)this.permissionFailure={backend,message:error.message.slice(0,1200)};throw error;}
  finally{this.inFlight=null;}
 }
 /**
  * Read-only staged proof that this computer can be controlled: the driver starts,
  * its catalog and permission report are usable, it reaches desktop windows, and a real
  * window observation returns. It sends no input and keeps counts and fixed labels only,
  * never window titles or contents. Input delivery stays unproven until a real task.
  */
 async verify(owner){
  const steps=[],finish=()=>{const verified=steps.every(step=>step.status==='pass');this.lastVerification={verified,inputVerified:false,at:new Date(this.now()).toISOString(),steps};return this.lastVerification;};
  const fail=(id,detail)=>{steps.push({id,status:'fail',detail});return finish();},pass=(id,detail,count)=>steps.push({id,status:'pass',detail,...(count===undefined?{}:{count})});
  if(this.lease&&this.lease.owner!==owner&&this.lease.owner!=='operator')throw Error('A chat owns desktop control. Verification will not interrupt it.');
  if(!this.locate('cua'))return fail('driver','Cua Driver is not installed where Proteus can find it. Follow the setup steps, then verify again.');
  pass('driver','Cua Driver is installed.');
  let client,tools;
  try{client=await this.client('cua');tools=(await client.request('tools/list')).tools||[];}
  catch{return fail('discovery',this.platform==='win32'?'Cua Driver did not answer. Start its background service with cua-driver autostart kick from this desktop session, or run cua-driver serve and leave it open.':'Cua Driver did not answer. Start its service in this desktop session, then verify again.');}
  this.lastUsed=this.now();
  const names=new Set(tools.map(tool=>tool.name));
  for(const name of ['list_windows','get_window_state'])if(!names.has(name))return fail('discovery','This Cua Driver version does not offer the required window tools. Update it, then verify again.');
  pass('discovery','The driver catalog is available.',tools.filter(tool=>allowed.has(tool.name)).length);
  if(names.has('check_permissions')){
   let report;try{report=await client.request('tools/call',{name:'check_permissions',arguments:{}});}catch{return fail('permissions','The permission report did not complete.');}
   const checked=deniedPermission(report);
   if(report.isError||checked.denied){this.permissionFailure={backend:'cua',message:checked.text.slice(0,1200)};return fail('permissions',this.platform==='darwin'?'A required permission is not granted. Only you can grant it in System Settings.':'A required desktop permission is not available.');}
   pass('permissions','No required permission is denied.');
  }else pass('permissions','This driver reports no separate permission check on this system.');
  const inventory=async args=>windowInventory(await client.request('tools/call',{name:'list_windows',arguments:args}));
  let windows;
  // Prefer observing this app's own window; nothing else needs to be read for the proof.
  try{windows=(await inventory({pid:process.pid}))||[];if(!windows.length)windows=(await inventory({}))||[];}
  catch{return fail('windows','The driver could not list windows.');}
  if(!windows.length)return fail('windows','The driver reached no windows, so it cannot see this desktop session. Run it in the signed-in desktop session, not over SSH or as a service.');
  pass('windows','The driver can see desktop windows.',windows.length);
  const target=windows.find(window=>window.is_on_screen!==false)||windows[0];
  const properties=tools.find(tool=>tool.name==='get_window_state').inputSchema?.properties||{};
  let observed;try{observed=await client.request('tools/call',{name:'get_window_state',arguments:{pid:target.pid,window_id:target.window_id,...(properties.include_screenshot?{include_screenshot:false}:{}),...(properties.max_elements?{max_elements:25}:{})}});}
  catch{return fail('observation','The window observation did not complete.');}
  const checked=deniedPermission(observed),receipt=observed._meta?.target_receipt||observed.structuredContent?.target_receipt||observed.structuredContent;
  if(observed.isError||checked.denied)return fail('observation','The driver could not observe a window.');
  if(Number(receipt?.pid)!==target.pid||Number(receipt?.window_id)!==target.window_id)return fail('observation','The driver did not confirm which window it observed.');
  if(receipt.degraded_reason||!checked.text.trim())return fail('observation',this.platform==='win32'?'The window returned no UI Automation tree. Re-check that the driver runs in this desktop session.':'The window returned no accessibility tree.');
  pass('observation',this.platform==='win32'?'A real window returned its UI Automation tree.':'A real window returned its accessibility tree.');
  return finish();
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

export function desktopTools(broker,runId){return broker?[{name:'proteus_desktop',defer:'auto',description:'Host-owned native desktop control. Inspect status and its setup steps, verify (read-only, sends no input), discover the Cua Driver catalog on demand, then list apps/windows and observe an exact process/window. Use the returned observationId for one input within 20 seconds; observe again to verify. Cua Driver is primary; Peekaboo is a Mac-only fallback with a reason and its own fresh observation. A single chat owns input. Permission denial is never bypassed, uncertain effects are never retried automatically. Stop releases the lease and Proteus-owned MCP processes. Browser page work should use Proteus browser tools first.',parameters:{type:'object',properties:{action:{type:'string',enum:['status','verify','catalog','call','stop']},backend:{type:'string',enum:['cua','peekaboo']},reason:{type:'string'},tool:{type:'string'},arguments:{type:'object'},observationId:{type:'string'}},required:['action'],additionalProperties:false},handler:async args=>{try{return modelToolResult(await broker.handle(args,runId));}catch(error){return {resultType:'failure',textResultForLlm:JSON.stringify({error:error.message})};}}}]:[];}
