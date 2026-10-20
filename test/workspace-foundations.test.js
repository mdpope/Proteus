import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ContextStore } from '../src/context.js';
import { SettingsStore } from '../src/settings.js';
import { PermissionStore, permissionContext } from '../src/permissions.js';
import { Engine } from '../src/engine.js';
import { ContentTabs } from '../src/content-tabs.js';

function setup(t, beforeRemove) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-workspaces-')));
  t.after(async () => { await beforeRemove?.(); fs.rmSync(root,{recursive:true,force:true}); });
  const home = path.join(root,'app'), one = path.join(root,'one'), two = path.join(root,'two');
  fs.mkdirSync(one);fs.mkdirSync(two);
  fs.writeFileSync(path.join(one,'AGENTS.md'),'# Workspace instruction');
  fs.writeFileSync(path.join(two,'AGENTS.md'),'# Other instruction');
  const settings = new SettingsStore(home,one), context = new ContextStore(home,settings);
  const schedule = (id='default') => ({schemaVersion:1,id:'fixture',name:'Fixture',enabled:false,cron:'0 9 * * 1-5',timezone:'UTC',provider:'copilot',model:'fixture',workspace:{cwd:one,additionalDirectories:[]},context:{workspaceId:id,entries:[]},prompt:'Fixture',misfire:'skip'});
  return {root,home,one,two,settings,context,schedule};
}

test('workspace migration preserves IDs and captures global selections independently with recovery copy',t=>{
 const f=setup(t); const disk=JSON.parse(fs.readFileSync(f.context.file));delete disk.workspaceConfigurationVersion;
 disk.workspaces=[{id:'default',name:'First',cwd:f.one,additionalDirectories:[]},{id:'second',name:'Second',cwd:f.two,additionalDirectories:[]}];disk.favorites=['old-source'];disk.modes={'old-source':'available'};fs.writeFileSync(f.context.file,JSON.stringify(disk));
 const store=new ContextStore(f.home,f.settings);assert.ok(fs.existsSync(store.file+'.before-workspaces'));
 assert.equal(store.scope('second').modes['old-source'],'available');
 store.mutate(config=>{config.workspaces.find(w=>w.id==='second').modes['old-source']='disabled';},store.config().revision);
 assert.equal(store.scope('default').modes['old-source'],'available');assert.equal(store.scope('second').modes['old-source'],'disabled');
});

test('local copy preserves complete configuration and approvals but owns a separate identity',t=>{
 const f=setup(t),entry=f.context.get().entries[0];
 f.context.mutate(c=>{const w=c.workspaces[0];w.modes[entry.id]='universal';w.favorites=[entry.id];w.defaults={includeDefaults:true,selectedIds:[entry.id]};w.approvals={mode:'custom',readOnlyTools:false,folders:[{path:f.one,access:'read-write'}],rules:[{kind:'shell',command:'npm test'}]};},f.context.config().revision);
 const copy=f.context.copyWorkspace('default','Copied',f.context.config().revision),id=copy.copiedWorkspaceId;
 assert.notEqual(id,'default');assert.deepEqual(f.context.scope(id).approvals,f.context.scope('default').approvals);
 assert.equal(f.context.capture({workspaceId:id}).entries[0].id,entry.id);
 f.context.mutate(c=>{c.workspaces.find(w=>w.id===id).modes[entry.id]='disabled';},f.context.config().revision);
 assert.equal(f.context.capture({workspaceId:id}).entries.length,0);assert.equal(f.context.capture({workspaceId:'default'}).entries.length,1);
 const permissions=new PermissionStore(f.home);permissions.setMode(f.schedule(),'trusted');permissions.copyWorkspace('default',id);
 assert.equal(permissions.describe(f.schedule(id)).mode,'trusted');assert.notEqual(permissionContext(f.schedule()).id,permissionContext(f.schedule(id)).id);
 permissions.revoke(permissionContext(f.schedule(id)).id,permissions.get().revision);assert.equal(permissions.describe(f.schedule()).mode,'trusted');assert.equal(permissions.describe(f.schedule(id)).mode,'ask');
});

test('one exhausted root does not block later roots and per-root refresh retains unrelated results',async t=>{
 const f=setup(t);fs.mkdirSync(path.join(f.one,'a'));fs.mkdirSync(path.join(f.one,'a','b'));
 f.context.mutate(c=>{c.workspaces[0].additionalDirectories=[f.two];c.workspaces[0].discovery={exclusions:[],maxFolders:2};},f.context.config().revision);
 const before=f.context.get();assert.equal(before.rootStatus[f.one].partial,true);assert.equal(before.rootStatus[f.two].partial,false);assert.ok(before.entries.some(e=>e.path===path.join(f.two,'AGENTS.md')));
 const old=before.rootStatus[f.one].refreshedAt;fs.writeFileSync(path.join(f.two,'CLAUDE.md'),'# Added later');
 const result=await f.context.refreshAsync({workspaceId:'default',root:f.two});assert.equal(result.rootStatus[f.one].refreshedAt,old);assert.ok(result.errors.some(e=>e.path===f.one));assert.ok(result.entries.some(e=>e.path===path.join(f.two,'CLAUDE.md')));
});

test('exclusions prune dependency trees and selection saves do not rescan',t=>{
 const f=setup(t);fs.mkdirSync(path.join(f.one,'vendor'));fs.writeFileSync(path.join(f.one,'vendor','AGENTS.md'),'# Dependency');
 const scanned=f.context.refresh();assert.ok(!scanned.entries.some(e=>e.path.includes('/vendor/')));const timestamp=scanned.refreshedAt;
 f.context.mutate(c=>{c.modes[scanned.entries[0].id]='available';},f.context.config().revision);assert.equal(f.context.get().refreshedAt,timestamp);
 f.context.mutate(c=>{c.workspaces[0].discovery.exclusions=[];},f.context.config().revision);assert.ok(f.context.get().entries.some(e=>e.path.includes('/vendor/')));
});

test('cross-computer import maps source IDs and resets host-local grants',t=>{
 const f=setup(t),source=f.context.scope(),entry=f.context.get().entries[0];source.modes[entry.id]='universal';source.favorites=[entry.id];source.approvals.mode='autopilot';
 const copied=f.context.importConfiguration({name:'Target',configuration:source,entries:f.context.get().entries,pathMappings:[{from:f.one,to:f.two}]},f.context.config().revision),id=copied.copiedWorkspaceId;
 assert.equal(f.context.scope(id).cwd,f.two);assert.equal(f.context.scope(id).approvals.mode,'ask');assert.equal(f.context.capture({workspaceId:id}).entries[0].path,path.join(f.two,'AGENTS.md'));
 assert.notEqual(f.context.get(id).favorites[0],entry.id);
 assert.throws(()=>f.context.importConfiguration({name:'Unmapped',configuration:source,entries:[],pathMappings:[]},f.context.config().revision),/Map every/);
});

test('chat folder grants persist only in that chat, respect read-only and revoke',t=>{
 const f=setup(t),engine=new Engine(f.home,{copilot:{async run(){}}});engine.drain=async()=>{};
 const a=engine.createRun(f.schedule(),'chat'),b=engine.createRun({...f.schedule(),id:'another'},'chat');
 const id=engine.permissions.describe(a.schedule).id;
 engine.setChatFolder(a.id,f.two,'read',false,id,a.chatPermissionRevision||null);
 assert.equal(engine.decidePermission(a,{kind:'read',path:path.join(f.two,'AGENTS.md')}).allowed,true);
 assert.equal(engine.decidePermission(a,{kind:'write',fileName:path.join(f.two,'new.md')}).allowed,false);
 assert.equal(engine.decidePermission(b,{kind:'read',path:path.join(f.two,'AGENTS.md')}).allowed,false);
 const restored=new Engine(f.home,{copilot:{async run(){}}}),stored=restored.getRun(a.id);
 assert.equal(restored.decidePermission(stored,{kind:'read',path:f.two}).allowed,true);
 restored.setChatFolder(a.id,f.two,null,true,id,stored.chatPermissionRevision);
 assert.equal(restored.decidePermission(stored,{kind:'read',path:f.two}).allowed,false);
});

test('workspace descriptors deduplicate chat identity and never store terminal commands',t=>{
 const f=setup(t),tabs=new ContentTabs(f.home);let result=tabs.mutate({scope:'workspace',id:'default',expectedRevision:0,operations:[{action:'open',tab:{id:'first',type:'chat',chatId:'same',title:'Chat'}},{action:'open',tab:{id:'second',type:'chat',chatId:'same',title:'Updated'}},{action:'open',tab:{id:'terminal',type:'terminal',terminalId:'session',command:'never replay',title:'Terminal'}}]});
 assert.equal(result.tabs.length,2);assert.equal(result.tabs[0].id,'chat:same');assert.equal(result.tabs[1].command,undefined);
 assert.deepEqual(new ContentTabs(f.home).get('workspace','default'),result);
});

test('chat folder exception does not reactivate paused workspace grants or commands',t=>{
 const f=setup(t),store=new PermissionStore(f.home),s=f.schedule();
 store.remember(s,{kind:'shell',fullCommandText:'npm test'},'always-tool');store.setMode(s,'trusted');store.setMode(s,'ask');
 const run={schedule:s,chatPermission:{contextId:store.describe(s).id,mode:'inherit',folders:[{path:f.two,access:'read'}]}};
 const effective=store.describeRun(run);
 assert.equal(store.decide(s,{kind:'read',path:f.two},effective).allowed,true);
 assert.equal(store.decide(s,{kind:'read',path:f.one},effective).allowed,false);
 assert.equal(store.decide(s,{kind:'shell',fullCommandText:'npm test'},effective).allowed,false);
});

test('scoped API mode changes, defaults, copy and chat index keep one owner and stable workspace identity',async t=>{
 let app;const f=setup(t,()=>app?.close()),{startServer}=await import('../src/server.js');
 app=await startServer({home:f.home,port:0,timers:false,withSeed:false,providers:{copilot:{async run(){}}}});
 const request=async(route,body)=>{const response=await fetch(app.origin+route,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+app.token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const value=await response.json();assert.equal(response.status,200,JSON.stringify(value));return value;};
 let state=await request('/api/context');const entry=state.entries[0];
 const copied=await request('/api/context',{action:'copy-workspace',workspaceId:'default',name:'Independent',expectedRevision:state.revision});
 const id=copied.copiedWorkspaceId;
 state=await request('/api/context',{action:'mode',workspaceId:id,id:entry.id,mode:'disabled',expectedRevision:copied.revision});
 assert.equal(state.workspaceId,id);assert.equal(app.context.get().entries[0].mode,'workspace');
 state=await request('/api/context',{action:'save-workspace',workspaceId:id,configuration:{defaults:{includeDefaults:false,selectedIds:[]},approvals:{mode:'custom',readOnlyTools:false,folders:[{path:f.two,access:'read'}],rules:[]}},expectedRevision:state.revision});
 const run=await request('/api/chat',{workspaceId:id,prompt:'Synthetic task',provider:'copilot'});
 assert.equal(run.schedule.context.workspaceId,id);assert.equal(run.schedule.context.entries.length,0);assert.equal(app.engine.permissions.decide(run.schedule,{kind:'read',path:f.two}).allowed,true);
 const index=await request('/api/chats/index');assert.equal(index.items.find(item=>item.id===run.id).workspaceId,id);
});

test('inclusion paths traverse excluded parents while sibling dependencies remain excluded',t=>{
 const f=setup(t);for(const folder of ['vendor/owned','vendor/dependency']){fs.mkdirSync(path.join(f.one,folder),{recursive:true});fs.writeFileSync(path.join(f.one,folder,'AGENTS.md'),'# '+folder);}
 f.context.mutate(config=>{config.workspaces[0].discovery.inclusions=['vendor/owned'];},f.context.config().revision);
 assert.ok(f.context.get().entries.some(entry=>entry.path.includes('/vendor/owned/')));assert.ok(!f.context.get().entries.some(entry=>entry.path.includes('/vendor/dependency/')));
});

test('workspace approval mode changes preserve fingerprint-specific rules and trusted grants',async t=>{
 let app;const f=setup(t,()=>app?.close()),{startServer}=await import('../src/server.js');app=await startServer({home:f.home,port:0,timers:false,withSeed:false,providers:{copilot:{async run(){}}}});
 const s=f.schedule();app.engine.permissions.remember(s,{kind:'shell',fullCommandText:'npm test'},'always-tool');
 app.engine.permissions.remember(s,{kind:'read',path:f.two},'trust-folder');
 const response=await fetch(app.origin+'/api/context',{method:'POST',headers:{Authorization:'Bearer '+app.token,'Content-Type':'application/json'},body:JSON.stringify({action:'save-workspace',workspaceId:'default',expectedRevision:app.context.config().revision,configuration:{approvals:{mode:'trusted',readOnlyTools:false,folders:[],rules:[]}}})});
 assert.equal(response.status,200);const result=await response.json();assert.equal(result.approvals.readOnlyTools,false);assert.deepEqual(result.approvals.folders,[]);
 const effective=app.engine.permissions.describe(s);assert.equal(effective.mode,'custom');assert.ok(effective.rules.some(rule=>rule.command==='npm test'));assert.ok(effective.folders.some(folder=>folder.path===f.two));assert.ok(result.approvalProfiles.length);
 app.engine.permissions.configureWorkspace('default',{mode:'custom',folders:[],rules:[]},{replaceFolders:true,replaceRules:true});assert.equal(app.engine.permissions.describe(s).rules.length,0);assert.equal(app.engine.permissions.describe(s).folders.length,0);
});
