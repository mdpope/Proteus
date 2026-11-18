import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {atomicJSON, readJSON} from '../../shared/files.js';
import {revision} from '../scheduling/schedules.js';
import {RemoteCommandJournal} from '../remote/remote-command-journal.js';
import {assertScratchAccess, requestScratchAccess, scratchActions, scratchTurn} from './scratch-access.js';

// One owner boundary serves UI, remote devices and agents. Only the operator UI
// selects a filesystem root. Worker calls own all file/index I/O; agents cannot
// submit paths, directory names, or another chat's authority.
export class Scratchpad {
 constructor(home, {projects, engine, memoryLocations = () => []} = {}) {
  this.home = path.join(home, 'scratchpad'); this.file = path.join(home, 'scratchpad.json');
  this.projects = projects; this.engine = engine; this.memoryLocations = memoryLocations;
  this.config = readJSON(this.file, {version: 1, root: null, rootId: null});
 }
 settings() {
  return {...this.config, revision: revision(this.config), configured: !!this.config.root,
   suggestions: this.memoryLocations().filter(value => typeof value === 'string' && path.isAbsolute(value)).map(folder => ({folder, root: path.join(folder, 'Scratchpad')}))};
 }
 async configure({folder, expectedRevision}) {
  if (this.configuring) throw Error('Scratchpad configuration is already changing.');
  if (expectedRevision !== revision(this.config)) throw Error('Scratchpad settings changed. Reload before selecting a directory.');
  if (typeof folder !== 'string' || !path.isAbsolute(folder) || /[\x00-\x1f\x7f]/.test(folder)) throw Error('Choose an existing storage folder on this computer.');
  this.configuring = true; let client;
  try {
   const parent = await fs.promises.realpath(folder);
   if (!(await fs.promises.stat(parent)).isDirectory()) throw Error('Choose a directory.');
   const root = path.basename(parent) === 'Scratchpad' ? parent : path.join(parent, 'Scratchpad');
   await fs.promises.mkdir(root, {recursive: false, mode: 0o700}).catch(error => {if (error.code !== 'EEXIST') throw error;});
   const stat = await fs.promises.lstat(root);
   if (!stat.isDirectory() || stat.isSymbolicLink()) throw Error('Scratchpad must be an ordinary directory, not a link.');
   const identity = stat.dev + ':' + stat.ino;
   if (root === this.config.root && identity === this.config.identity) return this.settings();
   client = this.createClient({root, identity}); await client.request('setup');
   await this.client?.close(); this.client = null;
   const next = {version: 1, root, identity, rootId: randomUUID()}; atomicJSON(this.file, next); this.config = next; this.client = client; client = null;
   const binding=this.bindingForRebuild();
   this.rebuild=binding.client.request('rebuild',binding.associations).catch(error=>{this.indexError=error.message;}).finally(()=>{this.rebuild=null;});
   return this.settings();
  } finally {await client?.close(); this.configuring = false;}
 }
 createClient(config) {return new RemoteCommandJournal(this.home, {workerURL: new URL('./scratch-worker.js', import.meta.url), workerOptions: {root: config.root, identity: config.identity}, maxRequests: 32});}
 bindingForRebuild() {
  const snapshot=this.projects.snapshot(),{catalog,config}=snapshot;
  const workspaces=config.workspaces.filter(row=>!row.deletedAt),available=new Set(workspaces.map(row=>row.id));
  // Historical projects may outlive their workspace. They are not new-note
  // destinations; existing files still come from the worker's real folder tree.
  return {client:this.client,associations:[...workspaces.map(row=>this.association({workspaceId:row.id},snapshot)),...catalog.projects.filter(row=>!row.deletedAt&&available.has(row.workspaceId)).map(row=>this.association({projectId:row.id},snapshot))]};
 }
 binding() {
  if (this.configuring) throw Error('Scratchpad configuration is changing. Retry after it finishes.');
  if (!this.config.root) throw Error('Choose a Scratchpad storage folder on the owning computer first.');
  this.client ??= this.createClient(this.config); return {client: this.client, rootId: this.config.rootId};
 }
 association({projectId = null, workspaceId = null} = {}, snapshot = this.projects.snapshot()) {
  const {catalog, config} = snapshot;
  const project = projectId ? catalog.projects.find(row => row.id === projectId && !row.deletedAt) : null;
  if (projectId && !project) throw Error('Project is unavailable.');
  if (project && workspaceId && project.workspaceId !== workspaceId) throw Error('Project belongs to another workspace.');
  workspaceId = project?.workspaceId ?? workspaceId;
  const workspace = workspaceId ? config.workspaces.find(row => row.id === workspaceId && !row.deletedAt) : null;
  if (workspaceId && !workspace) throw Error('Workspace is unavailable.');
  return {projectId, workspaceId, projectName: project?.name, workspaceName: workspace?.name,
   scope: projectId ? 'project:' + projectId : workspaceId ? 'workspace:' + workspaceId : 'unassigned', label: project?.name ?? workspace?.name ?? 'Unassigned scratches'};
 }
 async handle(args, {runId, remote = false} = {}) {
  if (!args || typeof args !== 'object' || Array.isArray(args)) throw Error('Choose a Scratchpad action.');
  if (Object.keys(args).some(key => !['action','rootId','projectId','workspaceId','id','expectedRevision','operationId','title','body','format','category','path','search','workspaceFilter','sort','offset','deleted','actions','reason'].includes(key))) throw Error('Unsupported Scratchpad field.');
  const agent = !!runId && runId !== 'operator', turn = agent ? scratchTurn(this.engine, runId) : null;
  if (args.action === 'status') return {configured: !!this.config.root, rootId:this.config.rootId, ...(!agent&&this.client?{indexing:await this.client.request('indexStatus')}:{}), ...(agent ? {capturedProjectId: turn.scratchProjectId} : {})};
  if(args.rootId&&args.rootId!==this.config.rootId)throw Error('Scratchpad storage changed. Reopen the note from the current root before editing.');
  const binding = this.binding(), check = () => {
   if (this.config.rootId !== binding.rootId || this.configuring) throw Error('Scratchpad configuration changed. Reload.');
   if (agent && scratchTurn(this.engine, runId) !== turn) throw Error('The requesting chat turn ended.');
  };
  if(['tree','asset'].includes(args.action)){if(agent)throw Error('Use project-scoped Scratchpad list/read actions from chats.');const result=await binding.client.request(args.action,{path:args.path,...(args.action==='tree'?{associations:this.bindingForRebuild().associations}:{})});check();return result;}
  const target = this.association({projectId: Object.hasOwn(args, 'projectId') ? args.projectId : agent ? turn.scratchProjectId : null, workspaceId: args.workspaceId});
  if (args.action === 'request-access') {
   if (!agent) throw Error('Scratchpad access requests belong to active chats.');
   return requestScratchAccess(this.engine, runId, binding.rootId, target, args, () => this.config.rootId === binding.rootId && !this.configuring);
  }
  if (!scratchActions.includes(args.action)) throw Error('Unknown Scratchpad action.');
  const authorize = (scope, action = args.action) => {check(); if (agent) assertScratchAccess(this.engine, runId, binding.rootId, scope, action);};
  const scoped = agent || Object.hasOwn(args, 'projectId') || Object.hasOwn(args, 'workspaceId');
  let row;
  if (['read','update','rename','move','delete'].includes(args.action)) {
   row = await binding.client.request('row', args.id); authorize(row);
  } else authorize(target);
  let result;
  if (args.action === 'read') result = await binding.client.request('read', {id: args.id});
  else if (args.action === 'list') result = await binding.client.request('list', {scope: scoped ? target.scope : undefined, workspaceFilter:args.workspaceFilter, search: args.search, category: args.category, sort: args.sort, offset: args.offset, deleted: args.deleted});
  else if (args.action === 'sync') {
   // An agent sync cannot scan another project's tree, even when a manually
   // supplied file claims its identity. Operator sync covers registered trees.
   if (scoped) await binding.client.request('directory', target);
   check(); result = await binding.client.request('sync', {scope: scoped ? target.scope : undefined});
  } else {
   if (args.action === 'move') {authorize(target, 'create'); authorize(row, 'delete');}
   const mutation = Object.fromEntries(['action','id','expectedRevision','operationId','title','body','format','category'].filter(key => Object.hasOwn(args, key)).map(key => [key, args[key]]));
   if (['create','move'].includes(args.action)) mutation.association = target;
   check(); result = await binding.client.request('mutate', mutation);
  }
  check();
  // No absolute storage path, SQLite filename, or grant travels to a peer/tool.
  return result;
 }
 async close() {await this.client?.close(); this.client = null;}
}
