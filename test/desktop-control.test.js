import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {DesktopControl,desktopTools,desktopExecutable} from '../src/services/remote/desktop-control.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const tools=['list_apps','list_windows','get_window_state','click','shell_execute'].map(name=>({name,inputSchema:{type:'object',properties:{pid:{type:'integer'},window_id:{type:'integer'},session:{type:'string'}}}}));
function fixture(){const calls=[];let now=1000,reply;const client={request:async(method,args)=>{calls.push({method,args});if(method==='tools/list')return {tools};return reply?reply(args):{structuredContent:{pid:10,window_id:20},content:[{type:'text',text:'Synthetic window'},{type:'image',mimeType:'image/png',data:'aGVsbG8='}]};},close(){calls.push({close:true});}};const broker=new DesktopControl({locate:()=>'/synthetic/driver',connect:async()=>client,platform:'darwin',now:()=>now});return {broker,calls,setReply:fn=>reply=fn,advance:ms=>now+=ms};}
const observe=broker=>broker.handle({action:'call',tool:'get_window_state',arguments:{pid:10,window_id:20}},'chat');
test('a desktop launch finds the official user install without a shell PATH and honors explicit overrides',t=>{
 const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-control-discovery-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
 const binary=path.join(home,'.local/bin/cua-driver');fs.mkdirSync(path.dirname(binary),{recursive:true});fs.writeFileSync(binary,'#!/bin/sh\nexit 0\n',{mode:0o700});
 for(const platform of ['darwin','linux'])assert.equal(desktopExecutable('cua',{PATH:'/usr/bin:/bin'},{platform,home}),binary);
 assert.equal(desktopExecutable('cua',{PATH:'/usr/bin:/bin',PROTEUS_CUA_DRIVER_PATH:path.join(home,'missing')},{home}),null,'an explicit missing backend must not silently select another install');
});
test('desktop broker lazily starts, restricts tools, binds fresh input and preserves model images',async()=>{
 const f=fixture();try{
  assert.equal(f.calls.length,0);assert.equal(f.broker.status().primary,'cua');assert.equal(f.calls.length,0);
  const catalog=await f.broker.handle({action:'catalog'},'chat');assert.ok(!catalog.tools.some(t=>t.name==='shell_execute'));
  await assert.rejects(f.broker.handle({action:'call',tool:'click',arguments:{pid:10,window_id:20}},'chat'),/fresh observation/);
  const result=await observe(f.broker),id=JSON.parse(result.content[0].text).observationId;
  const bridged=await desktopTools(f.broker,'chat')[0].handler({action:'call',tool:'get_window_state',arguments:{pid:10,window_id:20}});assert.equal(bridged.binaryResultsForLlm[0].data,'aGVsbG8=');
  const fresh=JSON.parse((await observe(f.broker)).content[0].text).observationId;
  await f.broker.handle({action:'call',tool:'click',arguments:{pid:10,window_id:20},observationId:fresh},'chat');
  await assert.rejects(f.broker.handle({action:'call',tool:'click',arguments:{pid:10,window_id:20},observationId:id},'chat'),/fresh observation/);
  await assert.rejects(observe(f.broker).then(()=>f.broker.handle({action:'catalog'},'another')),/another chat/);
  f.advance(21000);await assert.rejects(f.broker.handle({action:'call',tool:'click',arguments:{pid:10,window_id:20},observationId:fresh},'chat'),/fresh observation/);
 }finally{await f.broker.close();}
});
test('permission refusal cannot route through backup and Stop cancels queued input',async()=>{
 const f=fixture();try{
  f.setReply(()=>({isError:true,content:[{type:'text',text:'Screen Recording permission denied'}]}));await observe(f.broker);
  await assert.rejects(f.broker.handle({action:'catalog',backend:'peekaboo',reason:'permission failed'},'chat'),/cannot bypass/);
  f.setReply(null);const pending=f.broker.handle({action:'catalog'},'chat');await f.broker.stop('operator');await assert.rejects(pending,/cancelled by Stop/);
  assert.ok(f.calls.some(c=>c.close));
 }finally{await f.broker.close();}
});
test('Peekaboo is unavailable outside Mac and cannot reuse Cua target observations',async()=>{
 const f=fixture();try{
  const id=JSON.parse((await observe(f.broker)).content[0].text).observationId;
  await assert.rejects(f.broker.handle({action:'call',backend:'peekaboo',reason:'missing native control',tool:'click',arguments:{pid:10,window_id:20},observationId:id},'chat'),/fresh observation/);
  f.broker.platform='linux';await assert.rejects(f.broker.handle({action:'catalog',backend:'peekaboo',reason:'test'},'chat'),/unavailable on this platform/);
 }finally{await f.broker.close();}
});

test('Peekaboo adapter binds its real snapshot-only input schema to the exact process/window',async()=>{
 const calls=[],native=[{name:'see',inputSchema:{properties:{app_target:{type:'string'},window_id:{type:'integer'},fresh:{type:'boolean'},include_elements:{type:'boolean'}}}},{name:'type',inputSchema:{properties:{text:{type:'string'},snapshot:{type:'string'}}}}];
 const client={request:async(method,args)=>{if(method==='tools/list')return {tools:native};calls.push(args);return {content:[{type:'text',text:'Synthetic fallback view'}],_meta:{snapshot_id:'snapshot-native',target_receipt:{pid:10,window_id:20}}};},close(){}};
 const broker=new DesktopControl({locate:()=>'/synthetic',connect:async()=>client,platform:'darwin'});
 try{const reply=await broker.handle({action:'call',backend:'peekaboo',reason:'Synthetic primary capability missing',tool:'see',arguments:{pid:10,window_id:20}},'chat'),id=JSON.parse(reply.content[0].text).observationId;
 assert.equal(calls[0].arguments.app_target,'PID:10');assert.equal(calls[0].arguments.pid,undefined);
 await broker.handle({action:'call',backend:'peekaboo',reason:'Synthetic primary capability missing',tool:'type',arguments:{pid:10,window_id:20,text:'synthetic'},observationId:id},'chat');assert.deepEqual(calls[1].arguments,{text:'synthetic',snapshot:'snapshot-native'});
 await broker.stop('operator');assert.equal(broker.status().uncertainTarget.windowId,20);
 await assert.rejects(broker.handle({action:'call',backend:'peekaboo',reason:'test',tool:'see',arguments:{pid:10,window_id:21}},'next-chat'),/uncertain target/);
 }finally{await broker.close();}
});
test('permission denial remains host-wide after Stop and cannot be bypassed by another chat',async()=>{
 const f=fixture();try{f.setReply(()=>({isError:true,content:[{type:'text',text:'Screen Recording permission denied'}]}));await observe(f.broker);await f.broker.stop('operator');await assert.rejects(f.broker.handle({action:'catalog',backend:'peekaboo',reason:'try backup'},'another-chat'),/cannot bypass/);}finally{await f.broker.close();}
});
test('Stop retires the Cua session and a later lease uses a new native lifecycle name',async()=>{
 const f=fixture();try{
  await observe(f.broker);const first=f.calls.find(call=>call.args?.name==='get_window_state').args.arguments.session;
  await f.broker.stop('operator');assert.ok(f.calls.some(call=>call.args?.name==='end_session'&&call.args.arguments.session===first));
  await observe(f.broker);const names=f.calls.filter(call=>call.args?.name==='get_window_state').map(call=>call.args.arguments.session);assert.notEqual(names.at(-1),first);
  await assert.rejects(f.broker.handle({action:'call',tool:'click',arguments:{pid:10,window_id:20,delivery_mode:'foreground'}},'chat'),/background delivery/);
 }finally{await f.broker.close();}
});
test('required Peekaboo permission failures are detected even when the native reply is successful JSON',async()=>{
 const f=fixture();try{
  f.setReply(()=>({content:[{type:'text',text:JSON.stringify({permissions:[{name:'Accessibility',isRequired:true,isGranted:false},{name:'Event Synthesizing',isRequired:false,isGranted:false}]})}]}));
  const reply=await observe(f.broker);assert.equal(reply.isError,true);assert.equal(f.broker.status().permissionIssue.backend,'cua');
  await assert.rejects(f.broker.handle({action:'catalog',backend:'peekaboo',reason:'Synthetic fallback'},'chat'),/cannot bypass/);
 }finally{await f.broker.close();}
});
test('a backend response for another window never becomes an input observation',async()=>{
 const f=fixture();try{f.setReply(()=>({structuredContent:{pid:10,window_id:21},content:[{type:'text',text:'Synthetic wrong window'}]}));await assert.rejects(observe(f.broker),/did not confirm/);assert.equal(f.broker.observations.size,0);}finally{await f.broker.close();}
});

test('an exact closed-window refusal plus authoritative absence settles uncertainty without granting input',async()=>{
 const f=fixture();try{
  const id=JSON.parse((await observe(f.broker)).content[0].text).observationId;
  await f.broker.handle({action:'call',tool:'click',arguments:{pid:10,window_id:20},observationId:id},'chat');
  const closed={isError:true,content:[{type:'text',text:'window_id 20 is not a live window (closed, or the id is stale). Refusing other surfaces.'}]};
  f.setReply(args=>args.name==='list_windows'?{structuredContent:{windows:[{pid:10,window_id:21}]}}:closed);
  const result=await observe(f.broker);assert.equal(result.structuredContent.targetState,'closed');assert.equal(result.structuredContent.observationRequired,true);
  assert.equal(f.broker.status().uncertainTarget,null);assert.equal(f.broker.observations.size,0);
  await assert.rejects(f.broker.handle({action:'call',tool:'click',arguments:{pid:10,window_id:21},observationId:id},'chat'),/fresh observation/);
  f.setReply(()=>({structuredContent:{pid:10,window_id:21},content:[]}));
  const observed=await f.broker.handle({action:'call',tool:'get_window_state',arguments:{pid:10,window_id:21}},'chat');
  await f.broker.handle({action:'call',tool:'click',arguments:{pid:10,window_id:21},observationId:JSON.parse(observed.content[0].text).observationId},'chat');
 }finally{await f.broker.close();}
});

test('reuse, incomplete or denied discovery, transport loss and Stop cannot invent a closed-window settlement',async()=>{
 for(const inventory of [
  {structuredContent:{windows:[{pid:10,window_id:20}]}},
  {structuredContent:{windows:[{pid:11,window_id:21}]}},
  {structuredContent:{windows:[],partial:true}},
  {structuredContent:{windows:[],truncated:true}},
  {isError:true,content:[{type:'text',text:'Screen Recording permission denied'}]},
  {content:[{type:'text',text:'Unknown result'}]},
  null
 ]){
  const f=fixture();try{
   const id=JSON.parse((await observe(f.broker)).content[0].text).observationId;
   await f.broker.handle({action:'call',tool:'click',arguments:{pid:10,window_id:20},observationId:id},'chat');
   await f.broker.stop('operator');assert.ok(f.broker.status().uncertainTarget);
   f.setReply(args=>{if(args.name==='list_windows'){if(!inventory)throw Error('Lost inventory response');return inventory;}return {isError:true,structuredContent:{code:'window_id_not_found',pid:10,window_id:20},content:[]};});
   if(!inventory)await assert.rejects(observe(f.broker),/Lost inventory/);else assert.equal((await observe(f.broker)).isError,true);
   assert.ok(f.broker.status().uncertainTarget);assert.equal(f.broker.observations.size,0);
   await assert.rejects(f.broker.handle({action:'call',tool:'get_window_state',arguments:{pid:10,window_id:21}},'chat'),/Stop this lease|uncertain target/);
  }finally{await f.broker.close();}
 }
});

test('discovery alone and unrelated missing-window text do not settle an uncertain input',async()=>{
 const f=fixture();try{
  const id=JSON.parse((await observe(f.broker)).content[0].text).observationId;
  await f.broker.handle({action:'call',tool:'click',arguments:{pid:10,window_id:20},observationId:id},'chat');
  f.setReply(()=>({structuredContent:{windows:[]},content:[]}));
  await f.broker.handle({action:'call',tool:'list_windows',arguments:{pid:10}},'chat');assert.ok(f.broker.status().uncertainTarget);
  f.setReply(()=>({isError:true,content:[{type:'text',text:'Window not found, maybe permission denied'}]}));
  await observe(f.broker);assert.ok(f.broker.status().uncertainTarget);
 }finally{await f.broker.close();}
});
