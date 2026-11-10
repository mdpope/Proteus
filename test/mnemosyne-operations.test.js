import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import {OmiIntegration} from '../src/services/tools/omi.js';
import {MnemosyneOperations} from '../src/services/mnemosyne/operations.js';
import {RemoteHost} from '../src/services/remote/remote.js';
function fixture(t){
 const root=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-mnemosyne-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const omi=new OmiIntegration(root,{launchdProbe:async()=>({state:'loaded'})});
 omi.getSettings=()=>({...omi.defaults,pipelineRoot:root,revision:'fixture'});
 const schedules=[{id:'omi-transcript-intake',name:'PRIVATE TITLE',integration:{type:'omi',job:'intake'},provider:'codex',enabled:true,cron:'15 * * * *',revision:'one'},{id:'omi-audio-worker',integration:{type:'omi',job:'audio'},provider:'local-process',enabled:false,cron:'* * * * *',revision:'two'}];
 const engine={schedules:{list:()=>schedules},listRuns:()=>[{id:'run-fixture',createdAt:'2026-11-01T02:00:00Z',status:'completed',schedule:schedules[0],events:[{text:'PRIVATE TRANSCRIPT'}]}]};
 const operations=new MnemosyneOperations({omi,engine,clock:()=>new Date('2026-11-06T00:00:00Z')});
 const write=(file,value)=>{fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.writeFileSync(path.join(root,file),JSON.stringify(value));};
 return {root,omi,engine,operations,write};
}
test('independent observer distinguishes native receipts, model completion, delegated effects and event lineage without private contents',async t=>{
 const f=fixture(t),id='claim-000001',prefix='semantic/work/'+id;
 f.write(prefix+'/state.json',{record_id:id,kind:'new_jobs',status:'completed',input_sha256:'a'.repeat(64),message:'PRIVATE',request:{source:'PRIVATE'}});
 f.write(prefix+'/execution-receipt.json',{model:'gpt-6.1-sol',elapsed_seconds:12,usage:[{input_tokens:100,cached_input_tokens:20,output_tokens:5}],cli:'PRIVATE'});
 f.write(prefix+'/completion.json',{status:'completed',result:{status:'filed',outputs:[{path:'PRIVATE'}]}});
 f.write(prefix+'/context-effects.json',{record_id:id,status:'verified',effects:[{area:'people',status:'applied',evidence:'PRIVATE',paths:['PRIVATE']},{area:'filing',status:'delegated_hcos'},{area:'projects',status:'not_applicable'}]});
 f.write('intake/'+id+'/source-map.json',{record_id:id,spec_sha256:'b'.repeat(64),outputs:[{record_id:'different-event',path:'PRIVATE'},{record_id:'later-contribution',canonical_event_id:'different-event'}]});
 const before=fs.readFileSync(path.join(f.root,prefix,'state.json'));
 const result=await f.operations.snapshot(),native=result.activity.find(row=>row.origin==='native'),run=result.activity.find(row=>row.origin==='proteus');
 assert.equal(native.filing,'native_receipt');assert.equal(run.filing,'unverified');
 assert.equal(native.eventRefs[0],native.eventRefs[1]);assert.notEqual(native.claim,native.eventRefs[0]);assert.equal(native.sourceMapRevision,'b'.repeat(64));
 assert.deepEqual(native.effects.map(item=>item.outcome),['applied','delegated_hcos','not_applicable']);assert.equal(native.usage.cached_input_tokens,20);
 assert.equal(result.services[0].state,'loaded');assert.equal(result.services[0].heartbeat,'unknown');
 assert.equal(result.schedules[1].owner,'Prepared alternative');assert.equal(result.schedules[1].enabled,false);
 assert.doesNotMatch(JSON.stringify(result),/PRIVATE|different-event|claim-000001|pipelineRoot|pythonPath|semantic\/work/);
 assert.deepEqual(fs.readFileSync(path.join(f.root,prefix,'state.json')),before);assert.equal(fs.existsSync(f.omi.file),false);
});
test('missing receipts and boundary-only completion never become verified filing',async t=>{
 const f=fixture(t);f.write('semantic/work/claim-000002/state.json',{record_id:'claim-000002',kind:'session_boundary',status:'completed'});f.write('semantic/work/claim-000002/completion.json',{status:'completed',boundary_checked:true});
 const row=(await f.operations.snapshot()).activity.find(item=>item.origin==='native');assert.equal(row.filing,'not_applicable');assert.equal(row.model,null);assert.deepEqual(row.usage,{});assert.equal(row.stages[3].state,'No publication by design');
});
test('unavailable native runtime is honest, reads coalesce, and logs remove local paths',async t=>{
 const f=fixture(t);let count=0;const status=f.omi.status.bind(f.omi);f.omi.status=async()=>{count++;return status();};
 const [a,b]=await Promise.all([f.operations.snapshot(),f.operations.snapshot()]);assert.deepEqual(a,b);assert.equal(count,1);assert.equal(a.nativeHistory.available,false);
 f.write('logs/launchd.out.log',{pending:3,transcript:'PRIVATE'});const log=f.operations.logs('audio');assert.equal(log.available,true);assert.equal(log.records[0].pending,3);assert.equal(log.localPath,undefined);assert.doesNotMatch(JSON.stringify(log),/PRIVATE/);assert.throws(()=>f.operations.logs('../secret'));
});
test('native receipts reject outside symlinks, mismatched claims and oversized files',async t=>{
 const f=fixture(t);f.write('semantic/work/claim-000003/state.json',{record_id:'wrong-claim',status:'completed'});
 fs.mkdirSync(path.join(f.root,'semantic/work/claim-000004'));fs.symlinkSync('/etc/passwd',path.join(f.root,'semantic/work/claim-000004/state.json'));
 fs.mkdirSync(path.join(f.root,'semantic/work/claim-000005'));fs.writeFileSync(path.join(f.root,'semantic/work/claim-000005/state.json'),'x'.repeat(262145));
 assert.equal((await f.operations.snapshot()).activity.filter(row=>row.origin==='native').length,0);
});
test('remote observer uses only sanitized read operations; no configuration/control command exists',async t=>{
 const f=fixture(t),remote={service:{mnemosyne:f.operations,engine:f.engine}};
 const value=await RemoteHost.prototype.execute.call(remote,{},'mnemosyne.snapshot',{});assert.equal(value.configuration.desktopOnly,true);assert.equal(value.settings,undefined);
 await assert.rejects(RemoteHost.prototype.execute.call(remote,{},'mnemosyne.settings',{enabled:true}),/Unknown|Unsupported/);
});

test('storage measures configured roots and extensions once, bounds scans and skips symlinks',async t=>{
 const {storageUsage}=await import('../src/services/mnemosyne/storage.js');const f=fixture(t);
 f.write('config.json',{});fs.writeFileSync(path.join(f.root,'recording.wav'),Buffer.alloc(4096));fs.linkSync(path.join(f.root,'recording.wav'),path.join(f.root,'duplicate.wav'));fs.symlinkSync('/etc',path.join(f.root,'outside'));
 const value=await storageUsage({pipelineRoot:f.root,configPath:path.join(f.root,'config.json')});
 assert.equal(value.byType.find(row=>row.type==='.wav').bytes,4096);assert.equal(value.byType.find(row=>row.type==='.wav').files,1);assert.equal(value.skippedLinks,1);assert.equal(value.complete,false);assert.doesNotMatch(JSON.stringify(value),/recording\.wav|duplicate\.wav|\/etc/);
 const bounded=await storageUsage({pipelineRoot:f.root,configPath:path.join(f.root,'config.json')},{maxEntries:1});assert.equal(bounded.complete,false);
});

test('native controls validate revision and installed contract, bound arguments and sanitized results',async t=>{
 const f=fixture(t);f.omi.verifyRuntime=()=>{};f.omi.getSettings=()=>({...f.omi.defaults,pipelineRoot:f.root,workerPath:path.join(f.root,'worker.py'),revision:'configuration-fixture'});fs.writeFileSync(path.join(f.root,'service_control.py'),'# installed contract fixture');
 let called;f.omi.nativeControlExecute=async(command,args)=>{called={command,args};return {stdout:JSON.stringify({schemaVersion:1,state:'paused',desired:'paused',revision:'12345678-1234-1234-1234-123456789abc',active:false,privatePath:'PRIVATE'})};};
 const status=await f.omi.serviceControl();assert.equal(status.available,true);assert.doesNotMatch(JSON.stringify(status),/PRIVATE/);
 const result=await f.operations.control({action:'pause',expectedRevision:'initial',expectedSettingsRevision:'configuration-fixture'});assert.equal(result.state,'paused');assert.deepEqual(called.args.slice(-4),['--control-action','pause','--expected-revision','initial']);
 await assert.rejects(f.omi.serviceControl('resume','initial','stale'),/configuration changed/);await assert.rejects(f.omi.serviceControl('kill'),/action/);
 f.omi.nativeControlExecute=async()=>{throw Error('PRIVATE native traceback');};await assert.rejects(f.omi.serviceControl('restart','initial','configuration-fixture'),error=>/could not be confirmed/.test(error.message)&&!error.message.includes('PRIVATE'));
 const remote={service:{mnemosyne:f.operations,engine:f.engine}};await assert.rejects(RemoteHost.prototype.execute.call(remote,{},'mnemosyne.control',{agentControl:true,action:'pause'}),/human operations/);
});

test('library observes published phone index counts separately from wake deltas without private records',async t=>{
 const f=fixture(t);fs.mkdirSync(path.join(f.root,'cloud','Recordings'),{recursive:true});
 f.omi.getSettings=()=>({...f.omi.defaults,pipelineRoot:f.root,configPath:path.join(f.root,'config.json')});
 f.write('config.json',{source_dir:path.join(f.root,'cloud','Recordings')});
 f.write('library/status.json',{packaged:0,checked_at:'2026-11-09T00:00:00Z'});
 f.write('cloud/Control/Index/library.json',{items:[{kept:true,title:'PRIVATE',review_pending:true},{kept:false,audio_path:'PRIVATE'}]});
 const value=(await f.omi.status()).status.metadata.library;
 assert.deepEqual(value.inventory,{indexed:2,kept:1,review_pending:1});assert.equal(value.packaged,0);assert.doesNotMatch(JSON.stringify(value),/PRIVATE|audio_path|cloud|Recordings/);
 fs.unlinkSync(path.join(f.root,'cloud/Control/Index/library.json'));assert.equal((await f.omi.status()).status.metadata.library.inventoryUnavailable,true);
});
