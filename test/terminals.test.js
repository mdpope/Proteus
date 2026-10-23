import {defaultTerminalShell,terminalShellArgs} from '../src/services/tools/terminal-shell.js';
import {assertPrivate} from './helpers/permissions.js';
import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {TerminalStore,importGhosttyProfile} from '../src/services/tools/terminals.js';
import {WorkspaceFiles} from '../src/services/workspaces/workspace-files.js';
import {randomUUID} from 'node:crypto';
import {terminalTools} from '../src/services/tools/terminal-agent.js';
import {browserTools} from '../src/services/browser/browser-tools.js';
import {codexToolContent,mcpToolResult} from '../src/shared/tool-results.js';
function fixture(t,options={}){const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-terminal-test-')),workspace=path.join(home,'workspace');fs.mkdirSync(workspace);let config={workspaces:[{id:'test',name:'Test',cwd:workspace,additionalDirectories:[]}],libraryFolders:[]};const calls=[],children=[],signals=[];const spawnPty=(shell,args,settings)=>{calls.push({shell,args,settings});let data,exit;const child={pid:900000+children.length,writes:[],sizes:[],onData:handler=>{data=handler;return {dispose(){data=null;}};},onExit:handler=>{exit=handler;return {dispose(){exit=null;}};},write(value){this.writes.push(value);},resize(cols,rows){this.sizes.push([cols,rows]);},kill(signal){exit?.({exitCode:0,signal});},data:value=>data?.(value),exit:value=>exit?.(value)};children.push(child);return child;};const store=new TerminalStore(home,{workspaceFiles:new WorkspaceFiles(()=>config),spawnPty,killGroup:(...args)=>signals.push(args),...options});t.after(async()=>{await store.dispose();fs.rmSync(home,{recursive:true,force:true});});return {home,workspace,store,calls,children,signals,roots:()=>store.workspaceFiles.roots().roots,revoke:()=>{config.workspaces=[];}};}

test('terminal profiles are private, revision guarded and validate command/color/size boundaries',async t=>{const f=fixture(t),value=f.store.profiles();assert.equal(fs.existsSync(f.store.file),false);const saved=f.store.saveProfiles([{...value.profiles[0],command:'printf synthetic',theme:{background:'#001122'}}],value.revision);assertPrivate(f.store.file,0o600);assert.equal(saved.profiles[0].command,'printf synthetic');assert.throws(()=>f.store.saveProfiles(saved.profiles,value.revision),/changed/);assert.throws(()=>f.store.saveProfiles([{...saved.profiles[0],fontSize:100}],saved.revision),/Font size/);assert.throws(()=>f.store.saveProfiles([{...saved.profiles[0],theme:{background:'url(secret)'}}],saved.revision),/hex colors/);assert.throws(()=>f.store.saveProfiles([saved.profiles[0],saved.profiles[0]],saved.revision),/unique/);});

test('terminal launch honors selected nested roots and rejects unconfigured/revoked locations',async t=>{const f=fixture(t);fs.mkdirSync(path.join(f.workspace,'Nested'));const id=f.roots()[0].id;const session=await f.store.create({rootId:id,directory:'Nested'});assert.equal(session.cwd,fs.realpathSync(path.join(f.workspace,'Nested')));assert.deepEqual(f.calls[0].args,process.platform==='win32'?['-NoLogo']:['-l']);await assert.rejects(f.store.create({rootId:id,directory:'../'}));await assert.rejects(f.store.create({rootId:'unscoped'}),/unavailable/);f.revoke();await assert.rejects(f.store.create({rootId:id}),/unavailable/);assert.equal(f.calls.length,1);});

test('startup commands run only on explicit new launch; shell resume never replays them',async t=>{const f=fixture(t),p=f.store.profiles();f.store.saveProfiles([{...p.profiles[0],command:'printf do-not-replay'}],p.revision);const session=await f.store.create({});assert.deepEqual(f.calls[0].args,process.platform==='win32'?['-NoLogo','-EncodedCommand',Buffer.from('printf do-not-replay','utf16le').toString('base64')]:['-lc','printf do-not-replay']);await f.store.close(session.id);await f.store.create({resumeShell:true});assert.deepEqual(f.calls[1].args,process.platform==='win32'?['-NoLogo']:['-l']);assert.equal(f.store.list().filter(item=>item.status==='running').length,1);assert.equal(f.store.list().length,2);});

test('terminal snapshots, events, input, resize and session counts are bounded',async t=>{const f=fixture(t),events=[];f.store.on('event',event=>events.push(event));const session=await f.store.create({cols:100,rows:30});f.children[0].data('x'.repeat(700000));const snapshot=f.store.snapshot(session.id);assert.equal(snapshot.truncated,true);assert.ok(Buffer.byteLength(snapshot.data)<=512*1024);assert.ok(events.every(event=>event.data.length<=32768));f.store.write(session.id,'typed\r');assert.equal(f.children[0].writes[0],'typed\r');assert.throws(()=>f.store.write(session.id,'x'.repeat(65537)),/64 KiB/);assert.throws(()=>f.store.resize(session.id,10000,30),/Terminal size/);f.store.resize(session.id,120,40);assert.deepEqual(f.children[0].sizes[0],[120,40]);for(let i=1;i<12;i++)await f.store.create({});await assert.rejects(f.store.create({}),/Close an active/);await f.store.dispose();assert.equal(f.store.sessions.size,0);assert.ok(f.signals.some(([,signal])=>signal==='SIGKILL'));await assert.rejects(f.store.create({}),/shutting down/);});

test('exited terminal descendants are killed and bounded local output survives restart',async t=>{const f=fixture(t);const session=await f.store.create({});f.children[0].data('PRIVATE SYNTHETIC OUTPUT');f.children[0].exit({exitCode:7,signal:0});assert.equal(f.store.snapshot(session.id).session.exitCode,7);assert.throws(()=>f.store.write(session.id,'no'),/exited/);await f.store.close(session.id);await f.store.dispose();assert.ok(f.signals.some(([,signal])=>signal==='SIGKILL'));assertPrivate(f.store.historyFile,0o600);assert.equal(JSON.parse(fs.readFileSync(f.store.historyFile)).items[0].data,'PRIVATE SYNTHETIC OUTPUT');});

test('Ghostty import maps supported profiles and palettes without changing original configuration',t=>{const f=fixture(t),config=path.join(f.home,'ghostty.conf'),themes=path.join(f.home,'themes');fs.mkdirSync(themes);fs.writeFileSync(path.join(themes,'Synthetic'),'background = 112233\nforeground = #eeeeee\npalette = 1=#aa0000\n');const source='theme = Synthetic\nfont-family = Test Mono\nfont-size = 16\ncommand = printf synthetic\nworking-directory = '+f.workspace+'\nbackground-opacity = 0.5\n';fs.writeFileSync(config,source);const imported=importGhosttyProfile({configFiles:[config],themeRoots:[themes]});assert.equal(imported.profile.fontSize,16);assert.equal(imported.profile.fontFamily,'Test Mono');assert.equal(imported.profile.theme.background,'#112233');assert.equal(imported.profile.theme.red,'#aa0000');assert.equal(imported.profile.command,'printf synthetic');assert.ok(imported.unsupported.includes('background-opacity'));assert.equal(fs.readFileSync(config,'utf8'),source);assert.equal(fs.existsSync(f.store.file),false);});

test('real local PTY is interactive and exchanges input/output without replaying commands',async t=>{
 const {spawn}=await import('node-pty');const f=fixture(t,{spawnPty:(shell,args,options)=>spawn(shell,process.platform==='win32'?['-NoProfile',...args]:args,{...options,env:{PATH:process.env.PATH,HOME:options.cwd,USERPROFILE:options.cwd,SystemRoot:process.env.SystemRoot,ComSpec:process.env.ComSpec,TEMP:os.tmpdir(),TMP:os.tmpdir(),TERM:'xterm-256color'}}),killGroup:undefined});
 const profiles=f.store.profiles();f.store.saveProfiles([{...profiles.profiles[0],shell:process.platform==='win32'?defaultTerminalShell():'/bin/sh',command:process.platform==='win32'?"[Console]::WriteLine('PTY_READY'); $answer=[Console]::ReadLine(); [Console]::WriteLine('PTY_INPUT:'+$answer)":'test -t 0 && printf "PTY_READY\\n"; read answer; printf "PTY_INPUT:%s\\n" "$answer"'}],profiles.revision);
 const session=await f.store.create({});const wait=async predicate=>{const end=Date.now()+10000;while(Date.now()<end){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,10));}throw new Error('Synthetic PTY did not reach expected state');};
 await wait(()=>f.store.snapshot(session.id).data.includes('PTY_READY'));f.store.write(session.id,'SYNTHETIC_INTERACTIVE\r');await wait(()=>f.store.snapshot(session.id).data.includes('PTY_INPUT:SYNTHETIC_INTERACTIVE'));await wait(()=>f.store.snapshot(session.id).session.status==='exited');assert.equal(f.store.snapshot(session.id).session.exitCode,0);
});

test('managed tmux session detaches on close and ends only after explicit end',async t=>{
 const managed=new Map(),ended=[];
 const tmux={binary:'/synthetic/tmux',socket:'/synthetic/proteus/socket',available:()=>true,validate:id=>id,sessions:()=>({available:true,managedSessions:[...managed].map(([id,tag])=>({id,name:id,tag,attached:false,provenance:'Proteus-managed tmux socket'}))}),create:({id})=>{const tag='00000000-0000-4000-8000-000000000001';managed.set(id,tag);return {id,tag};},attachArgs:(id,tag)=>{if(managed.get(id)!==tag)throw new Error('identity changed');return ['-S','/synthetic/proteus/socket','attach-session','-t','$1'];},capture:(id,tag)=>{if(managed.get(id)!==tag)throw new Error('identity changed');return {data:'DETACHED OUTPUT',truncated:false,sessionId:id,tag};},end:(id,tag)=>{if(managed.get(id)!==tag)throw new Error('identity changed');ended.push(id);managed.delete(id);}};
 const f=fixture(t,{tmux});
 const first=await f.store.create({persistence:'tmux'});
 assert.equal(first.persistence,'tmux');assert.ok(first.tmuxSessionId.startsWith('proteus-'));
 assert.equal(f.calls[0].shell,'/synthetic/tmux');assert.deepEqual(f.calls[0].args.slice(-2),['-t','$1']);
 await assert.rejects(f.store.create({persistence:'tmux',tmuxSessionId:first.tmuxSessionId,tmuxSessionTag:first.tmuxSessionTag}),/attached viewer/);
 const detached=await f.store.close(first.id);assert.equal(detached.detached,true);assert.ok(managed.has(first.tmuxSessionId));assert.deepEqual(ended,[]);assert.equal(f.store.snapshot(first.id).detachedOutput.data,'DETACHED OUTPUT');
 await assert.rejects(f.store.create({persistence:'tmux',tmuxSessionId:first.tmuxSessionId,tmuxSessionTag:'00000000-0000-4000-8000-000000000002'}),/identity changed/);
 const second=await f.store.create({persistence:'tmux',tmuxSessionId:first.tmuxSessionId,tmuxSessionTag:first.tmuxSessionTag,resumeShell:true});assert.equal(second.tmuxSessionId,first.tmuxSessionId);
 await f.store.end(second.id);assert.deepEqual(ended,[first.tmuxSessionId]);assert.equal(f.store.snapshot(second.id).session.status,'ended');
});

test('terminal history restores as inactive and never restarts a shell',async t=>{
 const f=fixture(t),session=await f.store.create({});f.children[0].data('SYNTHETIC LOCAL HISTORY');assert.equal(f.store.snapshot(session.id).live,true);await f.store.dispose();
 const reopened=new TerminalStore(f.home,{workspaceFiles:f.store.workspaceFiles,spawnPty:()=>{throw new Error('must not spawn during restore');},killGroup:()=>{}});
 try{const restored=reopened.snapshot(session.id);assert.equal(restored.live,false);assert.equal(restored.session.status,'closed');assert.equal(restored.data,'SYNTHETIC LOCAL HISTORY');assert.equal(reopened.list().length,1);}finally{await reopened.dispose();}
});

test('terminal agent sharing gates output and input, deduplicates delivery, and revokes old observations',async t=>{
 const f=fixture(t),session=await f.store.create({}),access=f.store.agentAccess;
 let active=true,now=1000;access.active=()=>active;access.now=()=>now;
 f.children[0].data('\u001b[32mPRIVATE_SYNTHETIC_OUTPUT\u001b[0m');
 assert.equal(access.handle({action:'list'},'chat-a').terminals[0].shared,false);
 assert.throws(()=>access.handle({action:'snapshot',terminalId:session.id},'chat-a'),/not shared/);
 const shared=access.set(session.id,true,0);assert.equal(shared.agentShared,true);
 assert.throws(()=>access.set(session.id,false,0),/changed/);
 const snapshot=access.handle({action:'snapshot',terminalId:session.id},'chat-a');assert.equal(snapshot.output,'PRIVATE_SYNTHETIC_OUTPUT');
 const input={action:'write',terminalId:session.id,data:'printf SYNTHETIC\\n\r',operationId:randomUUID(),observationId:snapshot.observationId};
 assert.throws(()=>access.handle(input,'chat-b'),/fresh snapshot/);
 assert.equal(access.handle(input,'chat-a').delivered,true);access.handle(input,'chat-a');assert.equal(f.children[0].writes.length,1);
 assert.throws(()=>access.handle({...input,data:'different'},'chat-a'),/different input/);
 now+=120001;assert.throws(()=>access.handle({...input,operationId:randomUUID()},'chat-a'),/fresh snapshot/);
 access.set(session.id,false,shared.agentAccessRevision);assert.throws(()=>access.handle(input,'chat-a'),/not shared/);
 access.set(session.id,true,2);assert.equal(access.handle(input,'chat-a').delivered,true);assert.equal(f.children[0].writes.length,1);assert.throws(()=>access.handle({...input,operationId:randomUUID()},'chat-a'),/fresh snapshot/);
 active=false;assert.throws(()=>access.handle({action:'snapshot',terminalId:session.id},'chat-a'),/active/);active=true;
 await f.store.close(session.id);assert.equal(access.shared(session.id),false);assert.throws(()=>access.handle(input,'chat-a'),/not shared/);
 assert.equal(f.calls.length,1,'agent actions never create or restart a shell');f.store.saveHistory();assert.equal(fs.readFileSync(f.store.historyFile,'utf8').includes('agentShared'),false);
});

for(const provider of ['copilot','codex','claude'])test(provider+' receives the same bounded shared-terminal tool result',async t=>{
 const f=fixture(t),session=await f.store.create({});f.store.agentAccess.set(session.id,true,0);f.children[0].data('SYNTHETIC_COMMAND_OUTPUT');
 const terminal=(args,owner)=>f.store.agentAccess.handle(args,owner),tool=browserTools({terminal,agent:()=>{}},'run').find(tool=>tool.name==='proteus_terminal');
 assert.ok(tool);const result=await tool.handler({action:'snapshot',terminalId:session.id});
 const text=provider==='codex'?codexToolContent(result)[0].text:mcpToolResult(result).content[0].text;
 assert.equal(JSON.parse(text).output,'SYNTHETIC_COMMAND_OUTPUT');assert.equal(terminalTools(null,'run').length,0);
});
