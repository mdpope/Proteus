// Isolated preview bootstrap. Production project migration lives in workspace-projects.js.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { atomicJSON, readJSON } from './shared/files.js';
import { revision } from './services/scheduling/schedules.js';
import { SettingsStore } from './services/settings/settings.js';
import { ContextStore, discoveryExclusions } from './services/workspaces/context.js';
import { WorkspaceProjects } from './services/workspaces/workspace-projects.js';

const markerName = 'desktop-preview.json';
const scope = () => ({libraryFolders:[],universalFolders:[],documents:[],modes:{},favorites:[],workspaceFiles:[],defaults:{includeDefaults:false,selectedIds:[]},discovery:{exclusions:[...discoveryExclusions],inclusions:[],maxFolders:60000},approvals:{mode:'ask',folders:[],rules:[],readOnlyTools:false}});
const canonicalFolder = value => {
  if (typeof value !== 'string' || !path.isAbsolute(value) || !fs.statSync(value).isDirectory()) throw new Error('Choose an existing absolute folder.');
  return fs.realpathSync(value);
};
const validName = value => { if (typeof value !== 'string' || !value.trim() || value.length > 200) throw new Error('Choose a name of 1–200 characters.'); return value.trim(); };

export function assertDesktopPreviewHome(home) {
  const marker = readJSON(path.join(home,markerName),null);
  if (!marker || marker.schemaVersion !== 1 || marker.isolatedDesktopPreview !== true || marker.home !== fs.realpathSync(home)) throw new Error('Desktop preview requires an explicitly seeded isolated preview home.');
  return marker;
}

// Resolve missing leaf directories through their existing ancestors before any write.
function prospectiveCanonical(folder) {
  let ancestor=folder;const suffix=[];
  while(!fs.existsSync(ancestor)){
    // A dangling symlink must not become a newly created runtime directory.
    try{if(fs.lstatSync(ancestor).isSymbolicLink())throw new Error('Preview Codex home cannot be a dangling symbolic link.');}catch(error){if(error.code!=='ENOENT')throw error;}
    const parent=path.dirname(ancestor);if(parent===ancestor)throw new Error('Preview Codex home has no existing parent.');
    suffix.unshift(path.basename(ancestor));ancestor=parent;
  }
  return path.join(fs.realpathSync(ancestor),...suffix);
}
export function desktopPreviewCodexHome(home,requested) {
  const marker=assertDesktopPreviewHome(home),canonicalHome=marker.home;
  const candidate=requested===undefined?path.join(canonicalHome,'preview-codex'):requested;
  if(typeof candidate!=='string'||!path.isAbsolute(candidate))throw new Error('Preview Codex home must be an absolute isolated directory.');
  const actual=prospectiveCanonical(path.resolve(candidate));
  const sourceRoot=fs.realpathSync(fileURLToPath(new URL('..',import.meta.url)));
  const forbidden=[sourceRoot,path.join(os.homedir(),'.codex'),path.join(os.homedir(),'Library/Application Support/Proteus')].map(folder=>prospectiveCanonical(folder));
  if(forbidden.some(folder=>actual===folder||actual.startsWith(folder+path.sep)))throw new Error('Preview Codex home cannot use source, global Codex or production data.');
  let allowed=actual===path.join(canonicalHome,'preview-codex');
  const previewRoot=path.dirname(canonicalHome),rootMarker=path.join(previewRoot,'.proteus-design-preview.json');
  if(!allowed&&path.basename(canonicalHome)==='app-data'&&actual===path.join(previewRoot,'codex')&&fs.existsSync(rootMarker)){
    const stat=fs.lstatSync(rootMarker);
    if(stat.isSymbolicLink()||!stat.isFile())throw new Error('Preview root marker must be a regular file.');
    const value=readJSON(rootMarker);
    allowed=value.schemaVersion===1&&value.purpose==='proteus-isolated-desktop-design-preview';
  }
  if(!allowed)throw new Error('Preview Codex home must stay in its initialized preview data root.');
  fs.mkdirSync(actual,{recursive:true,mode:0o700});
  if(!fs.statSync(actual).isDirectory()||fs.realpathSync(actual)!==actual)throw new Error('Preview Codex home must remain a canonical directory.');
  return actual;
}

// Caller creates the sample folders. Refuse even partially populated homes; retries reuse
// an accepted marker instead of overwriting state, transcripts or credentials.
export function seedDesktopPreview({home,workFolders,sourceFolders=[]} = {}) {
  if (!path.isAbsolute(home || '') || !Array.isArray(workFolders) || !workFolders.length) throw new Error('A fresh preview home and sample work folders are required.');
  if (fs.existsSync(home) && fs.readdirSync(home).length) throw new Error('Preview seeding requires an empty data home.');
  const folders = workFolders.map((folder,index)=>({id:`preview-workspace-${index+1}`,name:validName(folder.name || `Sample workspace ${index+1}`),cwd:canonicalFolder(folder.path || folder.cwd)}));
  const sources = [...new Set(sourceFolders.map(folder=>canonicalFolder(typeof folder === 'string'?folder:folder.path)))];
  fs.mkdirSync(home,{recursive:true,mode:0o700}); home=fs.realpathSync(home);
  const settings = new SettingsStore(home,folders[0].cwd);
  settings.save({...settings.get(),provider:'rehearsal',model:'',workspace:{cwd:folders[0].cwd,additionalDirectories:[]}},settings.get().revision);
  const workspaces=folders.map(folder=>({...folder,...scope(),additionalDirectories:[],synthetic:true}));
  atomicJSON(path.join(home,'context.json'),{schemaVersion:1,workspaceConfigurationVersion:1,defaultWorkspaceId:workspaces[0].id,workspaces,...scope()});
  const projects=workspaces.flatMap(workspace=>[{id:randomUUID(),workspaceId:workspace.id,name:'General',createdAt:new Date().toISOString(),synthetic:true},{id:randomUUID(),workspaceId:workspace.id,name:workspace===workspaces[0]?'Design review':'Research',createdAt:new Date().toISOString(),synthetic:true}]);
  atomicJSON(path.join(home,'preview-projects.json'),{schemaVersion:1,projects,defaultProjectIds:Object.fromEntries(workspaces.map(workspace=>[workspace.id,projects.find(project=>project.workspaceId===workspace.id).id])),sourceLibrary:sources.map(folder=>({id:randomUUID(),path:folder,available:true,entryIds:[],createdAt:new Date().toISOString()}))});
  const context=new ContextStore(home,settings,{skipRefresh:true});
  for(const [index,workspace] of workspaces.entries()){
    const project=projects.find(item=>item.workspaceId===workspace.id&&item.name!=='General');
    const at=new Date(Date.now()-((index+1)*3600000)).toISOString(),id=randomUUID();
    const snapshot=context.capture({workspaceId:workspace.id,selectedIds:[],includeDefaults:false});
    const schedule={schemaVersion:1,id:'synthetic-'+id,name:'Synthetic design notes',chatType:'user',enabled:false,cron:'0 9 * * 1-5',timezone:'UTC',provider:'rehearsal',model:'',workspace:snapshot.workspace,context:snapshot,skillDirectories:[],mcpServers:{},misfire:'skip',prompt:'Synthetic preview fixture; no provider execution.'};
    atomicJSON(path.join(home,'runs',id+'.json'),{id,synthetic:true,title:'Synthetic · '+workspace.name+' notes',titleKind:'manual',titleRevision:randomUUID(),chatType:'user',trigger:'chat',status:'completed',createdAt:at,updatedAt:at,workspaceId:workspace.id,workspaceName:workspace.name,projectId:project.id,projectName:project.name,schedule,scheduleRevision:revision(schedule),events:[{role:'system',text:'Synthetic design fixture. No provider turn, external action or usage occurred. New chats use the live provider selected in the composer.',at}],pending:null,providerSessionId:null,usage:{observed:false},turns:[]});
  }
  atomicJSON(path.join(home,markerName),{schemaVersion:1,isolatedDesktopPreview:true,home,createdAt:new Date().toISOString(),label:'Isolated desktop preview · synthetic workspaces; new Codex chats are real'});
  return {home,workspaces,projects};
}

export class DesktopPreview extends WorkspaceProjects {
  constructor(home,context){super(home,context,{isolatedPreview:true,marker:assertDesktopPreviewHome(home)});}
  initializeProviderDefaults(settings,catalog){
    if(this.marker.providerDefaultsInitialized||!catalog?.available||catalog.stale||catalog.error)return false;
    const models=catalog.models.filter(model=>model.policy?.state!=='disabled'),model=models.find(model=>model.isDefault)||models[0];if(!model)return false;
    const current=settings.get();
    if(current.provider==='rehearsal'){
      const next={...current,provider:'codex',model:model.id};
      for(const key of ['reasoningEffort','contextTier','serviceTier'])delete next[key];
      const effort=model.controls?.defaultReasoningEffort;if(effort&&model.controls.reasoningEfforts?.includes(effort))next.reasoningEffort=effort;
      settings.save(next,current.revision);
    }
    this.marker={...this.marker,providerDefaultsInitialized:true};atomicJSON(path.join(this.home,markerName),this.marker);return true;
  }
}
