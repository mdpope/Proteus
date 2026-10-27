import test from 'node:test';import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {providerAttachmentInputs,turnAttachmentTools} from '../src/services/chats/attachment-input.js';
import {resolveScheduleContext,validateScheduleSources} from '../src/services/scheduling/schedule-context.js';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {ScheduleStore} from '../src/services/scheduling/schedules.js';
const require=createRequire(import.meta.url),{browserErrorDocument}=require('../desktop/browser/browser-error.cjs'),{BrowserStateBatch}=require('../desktop/browser/browser-state-batch.cjs');
test('arbitrary binary and oversized text preserve exact bytes through a bounded current-turn attachment reader',async()=>{
 const bytes=Buffer.from([0,255,31,128]),files=[{name:'synthetic.custom',mediaType:'application/octet-stream',bytes}];
 const input=providerAttachmentInputs(files,['text/plain']);assert.equal(input[0].mediaType,'text/plain');assert.match(input[0].bytes.toString(),/proteus_attachments/);assert.deepEqual(files[0].bytes,bytes);
 let active=true;const tool=turnAttachmentTools({attachmentInputs:()=>active?files:null},'parent')[0];
 assert.equal(JSON.parse(await tool.handler({action:'list'})).files[0].size,4);const page=JSON.parse(await tool.handler({action:'read',index:0,encoding:'base64'}));assert.deepEqual(Buffer.from(page.content,'base64'),bytes);
 await assert.rejects(tool.handler({action:'read',index:0,encoding:'utf8'}),/binary/);active=false;await assert.rejects(tool.handler({action:'list'}),/ended/);
 const large={name:'large.txt',mediaType:'text/plain',bytes:Buffer.from('🙂'.repeat(300000))};assert.ok(providerAttachmentInputs([large],['text/plain'])[0].bytes.length<1000);assert.equal(large.bytes.length,1200000);
});
test('workspace categories merge selected sources without moving an unassigned schedule or inheriting unrelated sources',()=>{
 const snapshots={A:{workspaceId:'A',workspaceName:'A',configurationRevision:'A1',workspace:{cwd:'/synthetic/a',additionalDirectories:[]},entries:[{id:'instruction-a',kind:'instruction',hash:'a'},{id:'mcp-a',kind:'mcp',hash:'m'}]},B:{workspaceId:'B',workspaceName:'B',configurationRevision:'B1',workspace:{cwd:'/synthetic/b',additionalDirectories:[]},entries:[{id:'skill-b',kind:'skill',hash:'b'}]}};
 const context={capture:args=>args.workspaceId?(structuredClone(snapshots[args.workspaceId])||(()=>{throw Error('missing workspace');})()):{workspaceId:null,workspace:{...args.workspace},entries:[]}};
 const schedule={workspace:{cwd:'/synthetic/schedule',additionalDirectories:[]},workspaceSources:[{workspaceId:'A',categories:['instructions','folders']},{workspaceId:'B',categories:['skills']}],contextSelection:{selectedIds:[],includeDefaults:false}};
 const value=resolveScheduleContext(schedule,context,{});assert.equal(value.context.workspaceId,null);assert.equal(value.context.followsWorkspace,false);assert.deepEqual(value.context.entries.map(e=>e.id),['instruction-a','skill-b']);assert.deepEqual(value.context.workspace.additionalDirectories,['/synthetic/a']);assert.equal(value.executionPermissions,undefined);
 snapshots.A.configurationRevision='A2';assert.equal(resolveScheduleContext(schedule,context,{}).context.sourceWorkspaces[0].configurationRevision,'A2');
 assert.throws(()=>validateScheduleSources({...schedule,workspaceSources:[{workspaceId:'A',categories:['credentials']}]}),/valid workspace/);
});
test('conflicting inherited approval modes require explicit schedule choice and keep read-only folders',()=>{
 const context={capture:args=>({workspaceId:args.workspaceId||null,workspace:{cwd:args.workspaceId?'/synthetic/'+args.workspaceId:'/synthetic/root',additionalDirectories:[]},entries:[]})},permissions={describe:s=>({mode:s.context.workspaceId==='A'?'ask':'autopilot',workingFolders:[{path:s.workspace.cwd,access:'read'}],folders:[],rules:[]})};
 const schedule={workspace:{cwd:'/synthetic/root',additionalDirectories:[]},workspaceSources:[{workspaceId:'A',categories:['permissions']},{workspaceId:'B',categories:['permissions']}]};assert.throws(()=>resolveScheduleContext(schedule,context,permissions),/conflict/);
 const value=resolveScheduleContext({...schedule,executionPermissions:{mode:'custom'}},context,permissions);assert.equal(value.executionPermissions.mode,'custom');assert.equal(value.executionPermissions.folders.every(f=>f.access==='read'),true);
});
test('saved explicit schedule grants stay pinned when a chosen symlink is retargeted',()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-schedule-pin-'));
 try{
  const first=path.join(home,'first'),second=path.join(home,'second'),link=path.join(home,'chosen');fs.mkdirSync(first);fs.mkdirSync(second);fs.symlinkSync(first,link,'dir');
  const store=new ScheduleStore(path.join(home,'schedules')),schedule={schemaVersion:1,id:'pin',name:'Pin',prompt:'Synthetic',provider:'rehearsal',cron:'0 0 * * *',timezone:'UTC',enabled:false,misfire:'skip',workspace:{cwd:home,additionalDirectories:[]},executionPermissions:{folders:[{path:link,access:'read'}]}};
  store.save(schedule);fs.unlinkSync(link);fs.symlinkSync(second,link,'dir');
  assert.deepEqual(store.get('pin').executionPermissions.folders,[{path:fs.realpathSync(first),access:'read'}]);
 }finally{fs.rmSync(home,{recursive:true,force:true});}
});
test('themed error pages use observed browser categories, preserve fragment destinations and escape content',()=>{
 const url='https://portal.example/#@tenant/view/~/Permissions';const html=decodeURIComponent(browserErrorDocument(url,'net::ERR_NAME_NOT_RESOLVED <script>')).split(',').slice(1).join(',');
 assert.match(html,/DNS lookup failed/);assert.match(html,/#@tenant/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);assert.match(html,/Retry/);assert.throws(()=>browserErrorDocument('javascript:alert(1)',''),/Invalid/);
});
test('browser event bursts coalesce only projections and disposal prevents stale window sends',()=>{
 let callback,flushes=0,timers=0,cancelled=0;const batch=new BrowserStateBatch(()=>flushes++,{setTimer:fn=>{callback=fn;timers++;return 1;},clearTimer:()=>cancelled++});for(let i=0;i<1000;i++)batch.request();assert.equal(timers,1);assert.equal(flushes,0);callback();assert.equal(flushes,1);batch.request();batch.close();callback();assert.equal(flushes,1);assert.equal(cancelled,1);
});
