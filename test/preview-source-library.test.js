import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {seedDesktopPreview,DesktopPreview} from '../src/desktop-preview.js';
import {ContextStore} from '../src/context.js';
import {SettingsStore} from '../src/settings.js';
import {workspaceCatalog,folderSourceModes} from '../public/workspace-ui.js';
function fixture(t){
 const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-preview-sources-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const home=path.join(root,'home'),a=path.join(root,'a'),b=path.join(root,'b');fs.mkdirSync(a);fs.mkdirSync(b);
 seedDesktopPreview({home,workFolders:[{path:a,name:'A'},{path:b,name:'B'}]});const context=new ContextStore(home,new SettingsStore(home,a),{skipRefresh:true}),preview=new DesktopPreview(home,context);
 const write=(relative,text)=>{const file=path.join(root,relative);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text);return file;};
 return {root,home,a,b,context,preview,write};
}
async function register(f,folder){return f.preview.sources({action:'add',path:folder,expectedRevision:f.preview.read().revision});}

test('registered root scans nested instructions, skills, agents and MCPs and appears in every workspace projection',async t=>{
 const f=fixture(t),folder=path.join(f.root,'repository');
 f.write('repository/AGENTS.md','# Repository instructions\nSynthetic instructions.');
 f.write('repository/apps/service/AGENTS.md','# Service instructions\nSynthetic nested instructions.');
 f.write('repository/plugins/example/skills/check/SKILL.md','---\nname: check\ndescription: Synthetic check\n---\n# Check\nSynthetic skill.');
 f.write('repository/.github/agents/helper.agent.md','---\nname: helper\ndescription: Synthetic helper\n---\nSynthetic agent.');
 f.write('repository/.mcp.json',JSON.stringify({mcpServers:{rootTool:{command:'synthetic-command'}}}));
 f.write('repository/apps/service/.vscode/mcp.json',JSON.stringify({servers:{nestedTool:{command:'synthetic-command'}}}));
 f.write('repository/node_modules/ignored/AGENTS.md','# Must not discover');
 const result=await register(f,folder),source=result.sourceLibrary.find(source=>source.path===folder);
 assert.equal(source.scan.status,'complete');assert.equal(source.scan.entryCount,6);assert.ok(source.scan.scannedFolders>=7);assert.equal(result.sourceEntries.length,6);
 const global=f.context.get();assert.deepEqual(global.sourceLibraryRoots,[folder]);
 for(const workspace of f.context.config().workspaces){const entries=workspaceCatalog(global,workspace.id).entries.filter(entry=>entry.roots.includes(folder));assert.equal(entries.length,6,workspace.name);assert.equal(entries.filter(entry=>entry.kind==='mcp').length,2);assert.ok(entries.filter(entry=>entry.kind==='mcp').every(entry=>entry.mode==='disabled'));assert.deepEqual(f.context.scope(workspace.id).additionalDirectories,[]);assert.deepEqual(f.context.scope(workspace.id).approvals.folders,[]);assert.deepEqual(f.context.capture({workspaceId:workspace.id}).entries,[]);}
 f.write('repository/new/SKILL.md','# Newly discovered');await f.context.refreshAsync({workspaceId:f.context.config().workspaces[1].id,root:folder});assert.equal(f.preview.get().sourceLibrary[0].scan.entryCount,7,'Workspace folder refresh routes to registered library root');
 // Production default discovery still reads MCP configs only at configured roots.
 const ordinary=new ContextStore(path.join(f.root,'ordinary'),new SettingsStore(path.join(f.root,'ordinary'),folder));assert.equal(ordinary.get().entries.filter(entry=>entry.kind==='mcp').length,1);
});

test('bulk loading writes one-time per-item modes for the full folder, preserving favorites, other modes, extensions and revisions',async t=>{
 const f=fixture(t),folder=path.join(f.root,'library');f.write('library/AGENTS.md','# One');f.write('library/skills/two/SKILL.md','# Two');f.write('library/.mcp.json',JSON.stringify({mcpServers:{tool:{command:'synthetic'}}}));await register(f,folder);
 const workspace=f.context.config().workspaces[1],other=f.context.config().workspaces[0],catalog=f.context.get(workspace.id),entries=catalog.entries;
 f.context.mutate(config=>{const target=config.workspaces.find(item=>item.id===workspace.id);target.modes.retained='disabled';target.favorites=[entries[0].id];target.extension={keep:true};},catalog.revision);
 const fresh=f.context.get(workspace.id),modes=folderSourceModes(fresh,workspace.id,folder,'universal');assert.equal(Object.keys(modes).length,4);assert.equal(modes.retained,'disabled');assert.ok(entries.every(entry=>modes[entry.id]==='universal'));
 f.context.mutate(config=>{config.workspaces.find(item=>item.id===workspace.id).modes=modes;},fresh.revision);
 const saved=f.context.scope(workspace.id);assert.deepEqual(saved.favorites,[entries[0].id]);assert.deepEqual(saved.extension,{keep:true});assert.deepEqual(f.context.scope(other.id).modes,{});
 assert.throws(()=>f.context.mutate(()=>{},fresh.revision),/changed/);
 f.context.mutate(config=>{config.workspaces.find(item=>item.id===workspace.id).modes[entries[0].id]='available';},f.context.config().revision);
 f.write('library/later/SKILL.md','# Later');await f.preview.sources({action:'refresh',id:f.preview.get().sourceLibrary[0].id,expectedRevision:f.preview.read().revision});
 assert.equal(f.context.get(workspace.id).entries.find(entry=>entry.id===entries[0].id).mode,'available','Individual changes stay editable');assert.equal(f.context.get(workspace.id).entries.find(entry=>entry.name==='Later').mode,'available','New entries do not inherit the past bulk action');
 const reloaded=new ContextStore(f.home,new SettingsStore(f.home,f.a),{skipRefresh:true});assert.deepEqual(reloaded.scope(workspace.id).extension,{keep:true});assert.deepEqual(reloaded.scope(workspace.id).favorites,[entries[0].id]);
});

test('source scan results distinguish empty, partial malformed definitions, and failed unavailable roots',async t=>{
 const f=fixture(t),folder=path.join(f.root,'empty');fs.mkdirSync(folder);let result=await register(f,folder),source=result.sourceLibrary[0];assert.equal(source.scan.status,'empty');assert.equal(source.scan.entryCount,0);
 f.write('empty/.mcp.json','{ broken');result=await f.preview.sources({action:'refresh',id:source.id,expectedRevision:result.revision});source=result.sourceLibrary[0];assert.equal(source.scan.status,'partial');assert.ok(source.scan.errors.length);assert.ok(f.context.get().errors.length);
 fs.rmSync(folder,{recursive:true,force:true});await assert.rejects(()=>f.preview.sources({action:'refresh',id:source.id,expectedRevision:result.revision}));source=f.preview.get().sourceLibrary[0];assert.equal(source.available,false);assert.equal(source.scan.status,'error');assert.ok(source.scan.errors[0].message);
});
