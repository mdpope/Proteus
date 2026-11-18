import fs from 'node:fs';
import path from 'node:path';
import {createHash, randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {normalizeScratch} from './scratch-format.js';

const hash = value => createHash('sha256').update(value).digest('hex');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const name = value => String(value || 'Untitled').normalize('NFKC').replace(/[\x00-\x1f<>:"/\\|?*]/g, '-').replace(/^[. ]+|[. ]+$/g, '').slice(0,70) || 'Untitled';
const limit = 2 * 1024 * 1024;
const warning = '# Proteus Scratchpad\n\nThis directory is managed by Proteus. Markdown files remain editable in Obsidian and other editors. Keep scratch_id stable; workspace/project association follows the registered directory, not edited frontmatter. Use Synchronize in Scratchpad after external file changes. There is no automatic filesystem watcher. Do not edit files while their sync/save is in progress. Deleted app items are moved to .Trash; the SQLite search index and command receipts live in Proteus application data.\n';

// Synchronous SQLite and filesystem operations run only in scratch-worker.js.
// Files are canonical. The database indexes metadata and retains an interrupted
// mutation until the same operation can reconcile it without overwriting edits.
export class ScratchStore {
 constructor({home,root,identity}) {
  this.root=fs.realpathSync(root);const stat=fs.lstatSync(root);if(!stat.isDirectory()||stat.isSymbolicLink())throw Error('Choose an existing Scratchpad directory.');
  this.identity=identity??stat.dev+':'+stat.ino;if(this.identity!==stat.dev+':'+stat.ino)throw Error('Scratchpad root changed. Reconfigure it.');
  fs.mkdirSync(home,{recursive:true,mode:0o700});const file=path.join(home,hash(this.root)+'.sqlite');
  fs.closeSync(fs.openSync(file,'a',0o600));this.db=new DatabaseSync(file);
  this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
   CREATE TABLE IF NOT EXISTS directories(scope TEXT PRIMARY KEY,relative TEXT UNIQUE NOT NULL,workspace TEXT,project TEXT);
   CREATE TABLE IF NOT EXISTS scratches(id TEXT PRIMARY KEY,relative TEXT UNIQUE NOT NULL,scope TEXT NOT NULL,title TEXT NOT NULL,category TEXT NOT NULL,format TEXT NOT NULL,created TEXT NOT NULL,updated TEXT NOT NULL,revision TEXT NOT NULL,deleted INTEGER NOT NULL DEFAULT 0);
   CREATE TABLE IF NOT EXISTS scratch_metadata(id TEXT PRIMARY KEY,text TEXT NOT NULL);
   CREATE INDEX IF NOT EXISTS scratch_scope ON scratches(scope,deleted,updated DESC,id);
   CREATE INDEX IF NOT EXISTS scratch_category ON scratches(category,deleted,title,id);
   CREATE TABLE IF NOT EXISTS operations(id TEXT PRIMARY KEY,digest TEXT NOT NULL,status TEXT NOT NULL,payload TEXT,result TEXT);
  `);
  for(const suffix of ['', '-wal','-shm'])if(fs.existsSync(file+suffix))fs.chmodSync(file+suffix,0o600);
 }
 close(){this.db.close();}
 setup(){const file=this.file('README.md');if(!fs.existsSync(file))this.replace('README.md',warning,null);this.directory();return {root:this.root};}
 file(relative,{mkdir=false}={}) {
  if(typeof relative!=='string'||path.isAbsolute(relative)||relative.includes('\\')||relative!==''&&relative.split('/').some(part=>!part||['.','..'].includes(part)))throw Error('Invalid scratch path.');
  // Recheck the root too: a replaced root must not redirect a configured grant.
  const rootStat=fs.lstatSync(this.root);if(fs.realpathSync(this.root)!==this.root||rootStat.isSymbolicLink()||this.identity!==rootStat.dev+':'+rootStat.ino)throw Error('Scratchpad root changed. Reconfigure it.');
  if(relative==='')return this.root;
  let current=this.root;const parts=relative.split('/');
  for(let i=0;i<parts.length;i++){
   current=path.join(current,parts[i]);
   try{const stat=fs.lstatSync(current);if(stat.isSymbolicLink()||i<parts.length-1&&!stat.isDirectory())throw Error('Scratchpad paths cannot traverse links or files.');}
   catch(error){if(error.code!=='ENOENT')throw error;if(i<parts.length-1&&mkdir)fs.mkdirSync(current,{mode:0o700});else if(i<parts.length-1)throw error;}
  }
  return current;
 }
 readFile(relative) {
  const file=this.file(relative),fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
  try{const stat=fs.fstatSync(fd);if(!stat.isFile()||stat.size>limit)throw Error('Choose a text scratch no larger than 2 MiB.');const bytes=Buffer.alloc(limit+1);let length=0,count;while(length<bytes.length&&(count=fs.readSync(fd,bytes,length,bytes.length-length,null))>0)length+=count;if(length>limit)throw Error('Scratch grew beyond 2 MiB.');const data=bytes.subarray(0,length),text=new TextDecoder('utf-8',{fatal:true}).decode(data);return {text,revision:hash(data)};}finally{fs.closeSync(fd);}
 }
 current(relative){try{return this.readFile(relative);}catch(error){if(error.code==='ENOENT')return null;throw error;}}
 replace(relative,text,expected) {
  const file=this.file(relative,{mkdir:true}),current=this.current(relative);
  if((current?.revision??null)!==expected)throw Error('Scratch changed on disk. Synchronize and review the conflict before saving.');
  const temp=path.join(path.dirname(file),'.proteus-'+randomUUID()+'.tmp'),fd=fs.openSync(temp,'wx',0o600);
  try{fs.writeFileSync(fd,text);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
  try{
   if((this.current(relative)?.revision??null)!==expected)throw Error('Scratch changed while saving. Your existing file was preserved.');
   fs.renameSync(temp,file);
   // Node cannot flush a directory handle on Windows. File data was flushed
   // above; retain the additional directory durability step on POSIX systems.
   if(process.platform!=='win32'){
    const directory=fs.openSync(path.dirname(file),'r');try{fs.fsyncSync(directory);}finally{fs.closeSync(directory);}
   }
  }finally{fs.rmSync(temp,{force:true});}
 }
 directory({workspaceId=null,projectId=null,workspaceName,projectName}={}) {
  for(const id of [workspaceId,projectId])if(id!==null&&(typeof id!=='string'||!/^[a-zA-Z0-9_-]{1,128}$/.test(id)))throw Error('Invalid workspace or project identity.');
  if(projectId&&!workspaceId)throw Error('A project must have its owning workspace.');
  const scope=projectId?'project:'+projectId:workspaceId?'workspace:'+workspaceId:'unassigned';
  const prior=this.db.prepare('SELECT * FROM directories WHERE scope=?').get(scope);
  if(prior){if(prior.workspace!==workspaceId||prior.project!==projectId)throw Error('Project association changed. Reconcile its directory first.');if(!projectId&&prior.relative.endsWith('/Unassigned')){prior.relative=prior.relative.slice(0,-11);this.db.prepare('UPDATE directories SET relative=? WHERE scope=?').run(prior.relative,scope);}return prior;}
  const relative=workspaceId?name(workspaceName)+'--'+workspaceId+(projectId?'/'+name(projectName)+'--'+projectId:''):'';
  this.db.prepare('INSERT INTO directories VALUES(?,?,?,?)').run(scope,relative,workspaceId,projectId);return {scope,relative,workspace:workspaceId,project:projectId};
 }
 index(value,relative,directory,revision,deleted=0){
  this.db.prepare('INSERT INTO scratch_metadata VALUES(?,?) ON CONFLICT(id) DO UPDATE SET text=excluded.text').run(value.id,value.text.slice(0,value.text.length-value.body.length));
  this.db.prepare(`INSERT INTO scratches VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET relative=excluded.relative,scope=excluded.scope,title=excluded.title,category=excluded.category,format=excluded.format,created=excluded.created,updated=excluded.updated,revision=excluded.revision,deleted=excluded.deleted`).run(value.id,relative,directory.scope,value.title,value.category,value.format,value.created,value.updated,revision,deleted);
 }
 row(id){const row=this.db.prepare('SELECT s.*,d.workspace AS workspaceId,d.project AS projectId FROM scratches s JOIN directories d ON d.scope=s.scope WHERE s.id=?').get(id);if(!row)throw Error('Scratch not found. Synchronize externally created files first.');return {...row};}
 list({scope,workspaceFilter,search='',category,sort='updated',offset=0,deleted=false}={}) {
  const where=['deleted=?'],args=[deleted?1:0];if(scope){where.push('scope=?');args.push(scope);}if(workspaceFilter){where.push('scope IN (SELECT scope FROM directories WHERE workspace=?)');args.push(workspaceFilter);}if(category!==undefined){where.push('category=?');args.push(category);}if(search){where.push(`(instr(lower(title),lower(?))>0 OR instr(lower(category),lower(?))>0 OR instr(lower(relative),lower(?))>0 OR instr(lower(COALESCE((SELECT text FROM scratch_metadata WHERE id=scratches.id),'')),lower(?))>0)`);args.push(...Array(4).fill(String(search).slice(0,500)));}
  const order={updated:'updated DESC,id',created:'created DESC,id',title:'title COLLATE NOCASE,id',category:'category COLLATE NOCASE,title COLLATE NOCASE,id'}[sort];if(!order)throw Error('Unknown scratch sort.');
  const rows=this.db.prepare('SELECT scratches.*,(SELECT workspace FROM directories WHERE directories.scope=scratches.scope) AS workspaceId,(SELECT project FROM directories WHERE directories.scope=scratches.scope) AS projectId FROM scratches WHERE '+where.join(' AND ')+' ORDER BY '+order+' LIMIT 101 OFFSET ?').all(...args,Math.max(0,Math.min(1000000,Math.floor(Number(offset)||0))));
  return {items:rows.slice(0,100),hasMore:rows.length>100,categories:this.db.prepare('SELECT DISTINCT category FROM scratches WHERE deleted=0'+(scope?' AND scope=?':'')+' ORDER BY category').all(...(scope?[scope]:[])).map(row=>row.category)};
 }

 tree({associations=[]}={}){
  for(const association of associations)this.directory(association);
  const rows=[];const walk=(relative,depth=0)=>{if(depth>32||rows.length>=10000)return;for(const entry of fs.readdirSync(this.file(relative),{withFileTypes:true})){if(entry.name.startsWith('.')||entry.isSymbolicLink())continue;const child=(relative?relative+'/':'')+entry.name;if(entry.isDirectory()){rows.push({path:child,kind:'directory'});walk(child,depth+1);}else{const scratch=this.db.prepare('SELECT id,title FROM scratches WHERE relative=? AND deleted=0').get(child);rows.push({path:child,kind:'file',scratchId:scratch?.id,scratchTitle:scratch?.title});}if(rows.length>=10000)break;}};walk('');
  // Registered destinations are UI paths until the first atomic note save.
  // Merge them with real user folders without creating anything on disk.
  const paths=new Set(rows.map(row=>row.path));
  for(const directory of this.db.prepare('SELECT relative FROM directories').all()){
   const parts=directory.relative.split('/').filter(Boolean);
   for(let i=1;i<=parts.length;i++){const path=parts.slice(0,i).join('/');if(!paths.has(path)){rows.push({path,kind:'directory',virtual:true});paths.add(path);}}
  }
  return {items:rows};
 }
 asset({path:relative}){
  if(/\.(md|markdown)$/i.test(relative||'')){const file=this.readFile(relative);return {path:relative,mediaType:'text/markdown',content:file.text};}
  const type={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp','.pdf':'application/pdf','.mp3':'audio/mpeg','.mp4':'video/mp4'}[path.extname(relative||'').toLowerCase()];if(!type)throw Error('Choose an indexed Markdown scratch or a supported image, PDF, audio or video.');
  const fd=fs.openSync(this.file(relative),fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
  try{const stat=fs.fstatSync(fd);if(!stat.isFile()||stat.size>12*1024*1024)throw Error('Attachment exceeds the 12 MiB inline viewer limit.');const data=Buffer.alloc(stat.size);let count=0,n;while(count<data.length&&(n=fs.readSync(fd,data,count,data.length-count,null)))count+=n;if(count!==data.length)throw Error('Attachment changed while reading.');return {path:relative,mediaType:type,data:data.toString('base64')};}finally{fs.closeSync(fd);}
 }
 read({id}) {const row=this.row(id);if(row.deleted)throw Error('This scratch was deleted.');const value=this.readFile(row.relative);if(value.revision!==row.revision)throw Error('Scratch changed outside Proteus. Synchronize before opening this indexed version.');const normalized=normalizeScratch(value.text,{id,workspaceId:row.workspaceId,projectId:row.projectId});return {...row,body:normalized.body,text:value.text};}
 mutate(args) {
  try{return this.mutateValidated(args);}catch(error){
   // Only an operation with no intent journal can be safely abandoned. An
   // interrupted file/index commit always keeps its original retry identity.
   if(uuid.test(args.operationId||'')&&!this.db.prepare('SELECT 1 FROM operations WHERE id=?').get(args.operationId))error.code='SCRATCH_REJECTED';
   throw error;
  }
 }
 mutateValidated(args) {
  if(!uuid.test(args.operationId||''))throw Error('A stable UUID operationId is required.');
  const digest=hash(JSON.stringify(args)),old=this.db.prepare('SELECT * FROM operations WHERE id=?').get(args.operationId);
  if(old){if(old.digest!==digest)throw Error('This operationId belongs to different scratch changes.');if(old.status==='complete')return JSON.parse(old.result);return this.apply(args.operationId,JSON.parse(old.payload));}
  const action=args.action;if(!['create','update','rename','move','delete'].includes(action))throw Error('Unsupported scratch mutation.');
  const row=action==='create'?null:this.row(args.id);
  if(row&&(row.deleted||row.revision!==args.expectedRevision))throw Error('Scratch revision changed. Reload before editing.');
  const before=row?this.readFile(row.relative):null;if(row&&before.revision!==row.revision)throw Error('Scratch changed on disk. Synchronize before editing.');
  const directory=action==='create'||action==='move'?this.directory(args.association):this.db.prepare('SELECT * FROM directories WHERE scope=?').get(row.scope);
  const first=normalizeScratch(before?.text??args.body??'',{id:row?.id,title:args.title,workspaceId:directory.workspace,projectId:directory.project});
  if(action==='create'&&this.db.prepare('SELECT 1 FROM scratches WHERE id=?').get(first.id))throw Error('This scratch identity already exists. Use its authorized update operation.');
  const source=args.body!==undefined&&action!=='create'?first.text.slice(0,first.text.length-first.body.length)+args.body:first.text;
  const value=normalizeScratch(source,{id:first.id,workspaceId:directory.workspace,projectId:directory.project,changes:{...(args.title!==undefined?{title:args.title}:{}),...(args.category!==undefined?{category:args.category}:{}),...(args.format!==undefined?{format:args.format}:{}),updated:new Date().toISOString()}});
  if(Buffer.byteLength(value.text)>limit)throw Error('Scratch exceeds the 2 MiB text limit.');
  const relative=action==='delete'?'.Trash/'+value.id+'--'+args.operationId+'.md':action==='update'?row.relative:(directory.relative?directory.relative+'/':'')+name(value.title)+'--'+value.id+'.md';
  const payload={value,directory,relative,oldRelative:row?.relative??null,oldRevision:before?.revision??null,deleted:action==='delete'?1:0};
  this.db.prepare('INSERT INTO operations VALUES(?,?,?, ?,NULL)').run(args.operationId,digest,'pending',JSON.stringify(payload));return this.apply(args.operationId,payload);
 }
 apply(operationId,payload) {
  const {value,directory,relative,oldRelative,oldRevision,deleted}=payload,next=hash(value.text),existing=this.current(relative);
  if(existing?.revision!==next)this.replace(relative,value.text,relative===oldRelative?oldRevision:null);
  if(oldRelative&&oldRelative!==relative){const old=this.current(oldRelative);if(old){if(old.revision!==oldRevision)throw Error('Original scratch changed during a move. Both copies are preserved; resolve the conflict before retrying.');fs.unlinkSync(this.file(oldRelative));}}
  this.db.exec('BEGIN IMMEDIATE');
  try{this.index(value,relative,directory,next,deleted);const result=this.row(value.id);this.db.prepare('UPDATE operations SET status=?,payload=NULL,result=? WHERE id=?').run('complete',JSON.stringify(result),operationId);this.db.exec('COMMIT');return result;}catch(error){this.db.exec('ROLLBACK');throw error;}
 }
 sync(args={}) {
  const steps=this.syncSteps(args);let step;do{step=steps.next();}while(!step.done);return step.value;
 }
 *syncSteps({scope}={}) {
  const allDirectories=this.db.prepare('SELECT * FROM directories').all(),directories=allDirectories.filter(row=>!scope||row.scope===scope);
  const report={added:0,updated:0,removed:0,unchanged:0,errors:[]};
  // Duplicate IDs are an explicit conflict; do not let traversal order choose a winner.
  const found=[],identities=new Map();let scanned=0,bytes=0;
  for(const directory of directories){
   const walk=function*(relative,depth=0){let entries;try{if(depth>32||scanned>=10000||bytes>=64*1024*1024)throw Error('Synchronization reached its bounded scan limit. Synchronize an individual project next.');entries=fs.readdirSync(this.file(relative),{withFileTypes:true});}catch(error){if(error.code!=='ENOENT')report.errors.push({relative,error:error.message});return;}
    for(const entry of entries){if(entry.name.startsWith('.')||relative===''&&entry.name==='README.md')continue;const child=(relative?relative+'/':'')+entry.name;
     if(++scanned>10000||bytes>=64*1024*1024){report.errors.push({relative:child,error:'Synchronization reached its bounded scan limit. Synchronize an individual project next.'});break;}
     try{
     if(allDirectories.some(other=>other.scope!==directory.scope&&other.relative===child))continue;
     if(entry.isSymbolicLink())throw Error('Symbolic links are not synchronized.');
     if(entry.isDirectory()){yield* walk.call(this,child,depth+1);continue;}if(!entry.isFile()||! /\.(md|markdown|txt)$/i.test(entry.name))continue;
     const file=this.readFile(child),value=normalizeScratch(file.text,{title:path.basename(entry.name,path.extname(entry.name)),workspaceId:directory.workspace,projectId:directory.project});
     bytes+=Buffer.byteLength(file.text);
     found.push({relative:child,file,value,directory});identities.set(value.id,(identities.get(value.id)||0)+1);
    }catch(error){report.errors.push({relative:child,error:error.message});}yield {...report,scanned};}
   };yield* walk.call(this,directory.relative);
  }
  for(const item of found){const {relative,file,value,directory}=item;try{
   if(identities.get(value.id)!==1)throw Error('Duplicate scratch_id. Keep one identity per file and synchronize again.');
   const prior=this.db.prepare('SELECT scratches.*,(SELECT workspace FROM directories WHERE directories.scope=scratches.scope) AS workspaceId,(SELECT project FROM directories WHERE directories.scope=scratches.scope) AS projectId FROM scratches WHERE id=?').get(value.id);
   if(prior&&scope&&prior.scope!==scope)throw Error('Reassociation across projects needs a full authorized synchronization.');
   if(prior&&prior.relative!==relative&&this.current(prior.relative))throw Error('This scratch ID already exists in another file.');
   if(this.db.prepare("SELECT 1 FROM operations WHERE status='pending' AND json_extract(payload,'$.value.id')=?").get(value.id))throw Error('An interrupted save needs its original operation reconciled first.');
   if(file.text!==value.text)this.replace(relative,value.text,file.revision);
   const revision=hash(value.text);this.index(value,relative,directory,revision);
   if(!prior)report.added++;else if(prior.revision!==revision||prior.relative!==relative||prior.deleted)report.updated++;else report.unchanged++;
  }catch(error){report.errors.push({relative,error:error.message});}yield {...report,scanned};}
  for(const row of this.db.prepare('SELECT scratches.*,(SELECT workspace FROM directories WHERE directories.scope=scratches.scope) AS workspaceId,(SELECT project FROM directories WHERE directories.scope=scratches.scope) AS projectId FROM scratches WHERE deleted=0'+(scope?' AND scope=?':'')).all(...(scope?[scope]:[]))){try{if(this.db.prepare("SELECT 1 FROM operations WHERE status='pending' AND json_extract(payload,'$.value.id')=?").get(row.id))continue;if(!this.current(row.relative)){this.db.prepare('UPDATE scratches SET deleted=1 WHERE id=?').run(row.id);report.removed++;}}catch(error){report.errors.push({relative:row.relative,error:error.message});}}
  return report;
 }
}
