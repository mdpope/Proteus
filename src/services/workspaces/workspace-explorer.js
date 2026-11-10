import {imageSources} from '../../shared/markdown-parser.js';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {WorkspaceFiles} from './workspace-files.js';
import {fileDates} from '../../shared/file-metadata.js';
import {readFilePreview} from './workspace-preview.js';

const identity=s=>[s.dev,s.ino,s.size,s.mtimeMs].join(':');
const fileTypes={md:['text/markdown','markdown'],png:['image/png','image'],jpg:['image/jpeg','image'],jpeg:['image/jpeg','image'],gif:['image/gif','image'],webp:['image/webp','image'],pdf:['application/pdf','pdf'],json:['application/json','code'],js:['text/javascript','code'],jsx:['text/jsx','code'],ts:['text/typescript','code'],tsx:['text/tsx','code'],py:['text/x-python','code'],swift:['text/x-swift','code'],sh:['text/x-shellscript','code'],c:['text/x-c','code'],cpp:['text/x-c++','code'],rs:['text/x-rust','code'],go:['text/x-go','code'],php:['text/x-php','code'],rb:['text/x-ruby','code'],java:['text/x-java-source','code'],html:['text/html','code'],css:['text/css','code'],xml:['application/xml','code'],yaml:['application/yaml','code'],yml:['application/yaml','code'],txt:['text/plain','file'],log:['text/plain','file'],csv:['text/csv','file'],mp3:['audio/mpeg','audio'],wav:['audio/wav','audio'],m4a:['audio/mp4','audio'],flac:['audio/flac','audio'],mp4:['video/mp4','video'],mov:['video/quicktime','video'],webm:['video/webm','video']};
const fileType=name=>fileTypes[path.extname(name).slice(1).toLowerCase()]||['application/octet-stream','file'];
const mime=name=>fileType(name)[0];
const kind=(name,directory)=>directory?'folder':fileType(name)[1];
const within=(file,root)=>{const r=path.relative(root,file);return r===''||r!=='..'&&!r.startsWith('..'+path.sep)&&!path.isAbsolute(r);};
// Human file browsing uses only the selected workspace's configured roots. No
// watcher, pre-index or background crawl survives the bounded request.
export class WorkspaceExplorer {
 constructor(configuration){this.configuration=configuration;}
 files(workspaceId){
  const config=this.configuration(),workspace=config.workspaces.find(w=>w.id===workspaceId);
  if(!workspace)throw Error('Choose an existing workspace.');
  return new WorkspaceFiles(()=>({...config,workspaces:[workspace]}));
 }
 roots({workspaceId}={}){return this.files(workspaceId).roots();}
 reference({workspaceId,file}={}){
  if(typeof file!=='string'||!path.isAbsolute(file))throw Error('Choose an owner file.');
  const root=this.roots({workspaceId}).roots.filter(root=>root.available&&within(file,root.path)&&file!==root.path).sort((a,b)=>b.path.length-a.path.length)[0];
  if(!root)throw Error('This document is outside the shared workspace folders.');
  // This is navigation metadata only. Preview re-resolves the real file and
  // checks root/link identity under the current device grant before reading.
  return {workspaceId,rootId:root.id,file:path.relative(root.path,file).split(path.sep).join('/')};
 }
 async browse({workspaceId,rootId,directory='',offset=0,query='',sort='name',direction='asc',foldersOnly=false}={}, {signal}={}){
  if(!Number.isSafeInteger(offset)||offset<0||offset>5000||typeof query!=='string'||query.length>160)throw Error('Invalid file search or page.');
  const files=this.files(workspaceId),base=files.resolve(rootId,directory,true),pending=[{file:base.resolved,relative:base.relative,depth:0}],seen=new Set(),entries=[];
  let scanned=0,limited=false;const needle=query.trim().toLocaleLowerCase();
  while(pending.length){
   signal?.throwIfAborted();const current=pending.shift();if(seen.has(current.file))continue;seen.add(current.file);
   // Resolve again immediately before opening, including every search child.
   const checked=files.resolve(rootId,current.relative,true);const handle=await fs.opendir(checked.resolved);
   try{for await(const entry of handle){
    signal?.throwIfAborted();if(++scanned>5000){limited=true;break;}if(entry.name==='.git')continue;
    const relative=current.relative?current.relative+'/'+entry.name:entry.name;
    try{
     const actual=await fs.realpath(path.join(current.file,entry.name));if(!within(actual,base.canonicalRoot))continue;
     const stat=await fs.stat(actual);if(!stat.isFile()&&!stat.isDirectory())continue;
     const type=kind(entry.name,stat.isDirectory());
     if((!foldersOnly||stat.isDirectory())&&(!needle||entry.name.toLocaleLowerCase().includes(needle)))entries.push({name:entry.name,path:relative,kind:type,identity:identity(stat),type:type==='folder'?'folder':mime(entry.name),size:stat.isFile()?stat.size:null,...fileDates(stat),symlink:entry.isSymbolicLink()});
     if(needle&&stat.isDirectory()){if(current.depth<12)pending.push({file:actual,relative,depth:current.depth+1});else limited=true;}
    }catch(error){if(error.name==='AbortError')throw error;/* Changing/unreadable entries are skipped, never followed elsewhere. */}
   }}finally{await handle.close().catch(()=>{});}
   if(scanned>5000)break;
  }
  signal?.throwIfAborted();this.files(workspaceId).resolve(rootId,directory,true);
  if(!['name','type','size','fileCreatedAt','fileModifiedAt'].includes(sort)||!['asc','desc'].includes(direction))throw Error('Invalid sort.');
  entries.sort((a,b)=>{const x=a[sort]??'',y=b[sort]??'';return (sort==='name'?(a.kind==='folder'?0:1)-(b.kind==='folder'?0:1):0)||(typeof x==='number'?x-y:String(x).localeCompare(String(y),undefined,{numeric:true}))*(direction==='desc'?-1:1)||a.path.localeCompare(b.path);});
  return {root:base.root,directory:base.relative,entries:entries.slice(offset,offset+200),nextOffset:offset+200<entries.length?offset+200:null,offset,scanLimited:limited,scanned};
 }
 async mutate({workspaceId,rootId,action,items=[],directory='',name=''}={}){
  const files=this.files(workspaceId);
  if(directory.split('/').some(p=>['.git','.agents','.codex','.aws'].includes(p)))throw Error('Protected metadata cannot be changed.');
  const leaf=value=>{if(typeof value!=='string'||!value.trim()||value!==value.trim()||value.length>200||/[\\/\x00-\x1f]/.test(value)||['.','..','.git','.agents','.codex','.aws'].includes(value))throw Error('Choose one valid file name.');return value;};
  if(!['create','mkdir','rename','move','duplicate','trash'].includes(action))throw Error('Unknown file action.');
  if(!Array.isArray(items)||items.length>200)throw Error('Select at most 200 items.');
  const targets=items.map(item=>{if(!item.path||item.path.split('/').some(p=>['.git','.agents','.codex','.aws'].includes(p)))throw Error('Protected metadata cannot be changed.');const target=files.resolve(rootId,item.path),stat=fsSync.lstatSync(target.resolved);if(stat.isSymbolicLink()||fsSync.realpathSync(path.join(target.canonicalRoot,item.path))!==path.join(target.canonicalRoot,item.path))throw Error('Linked paths cannot be modified.');if(identity(stat)!==item.identity)throw Error('File changed; refresh before changing it.');return {...target,stat};});
  if(new Set(targets.map(t=>t.resolved)).size!==targets.length)throw Error('Duplicate selection.');
  if(targets.some(a=>targets.some(b=>a!==b&&within(b.resolved,a.resolved))))throw Error('Select a folder or its children, not both.');
  if(['rename','duplicate'].includes(action)&&targets.length!==1)throw Error('Select exactly one item.');
  if(!['create','mkdir'].includes(action)&&!targets.length)throw Error('Select an item.');
  const destination=files.resolve(rootId,directory,true);
  const plans=targets.map(t=>({source:t.resolved,target:path.join(action==='rename'?path.dirname(t.resolved):destination.resolved,action==='rename'||action==='duplicate'?leaf(name):path.basename(t.resolved))}));
  if(action==='create'||action==='mkdir')plans.push({target:path.join(destination.resolved,leaf(name))});
  for(const plan of plans)if(action!=='trash'){if(plan.source&&within(plan.target,plan.source))throw Error('Cannot move a folder into itself.');try{await fs.lstat(plan.target);throw Error('Destination already exists; nothing was overwritten.');}catch(error){if(error.code!=='ENOENT')throw error;}}
  // Human actions never become agent grants. Fail before changing anything when
  // this owner has no native recycling boundary. Each result is reconciled in UI.
  if(action==='trash'&&!this.trash)throw Error('System trash is unavailable on this owner.');
  const results=[];
  for(const plan of plans){try{if(action==='create')await fs.writeFile(plan.target,'',{flag:'wx'});else if(action==='mkdir')await fs.mkdir(plan.target);else if(action==='duplicate')await fs.cp(plan.source,plan.target,{recursive:true,errorOnExist:true,force:false,dereference:false});else if(action==='trash')await this.trash(plan.source);else await fs.rename(plan.source,plan.target);results.push({path:plan.source||plan.target,ok:true});}catch(error){results.push({path:plan.source||plan.target,ok:false,error:error.message});break;}}
  return {results};
 }
 async resolveLink({workspaceId,rootId,file,source,image=false}={}){
  if(typeof source!=='string'||source.length>4096)throw Error('Invalid document link.');
  if(/^https?:\/\//i.test(source)){if(image)throw Error('External image requires separate consent.');return {external:source};}
  if(/^[a-z][a-z0-9+.-]*:/i.test(source)||source.startsWith('//'))throw Error('Unsupported link.');
  const name=decodeURIComponent(source.split('#')[0]),files=this.files(workspaceId),relative=path.posix.normalize(path.posix.join(path.posix.dirname(file),name));
  let target;
  try{target=files.resolve(rootId,relative);}catch(error){
   if(name.startsWith('.')||relative.startsWith('..'))throw error;
   try{target=files.resolve(rootId,name);}catch(rootError){
    if(name.includes('/')||name.includes('\\')||!name)throw rootError;
    // Obsidian basename links are resolved on demand, never by a background
    // index. Ambiguity and bounded-search exhaustion require an explicit path.
    const pending=[''],seen=new Set(),matches=[];let scanned=0;
    while(pending.length){
     const directory=pending.shift(),checked=files.resolve(rootId,directory,true);
     if(seen.has(checked.resolved))continue;seen.add(checked.resolved);
     for await(const entry of await fs.opendir(checked.resolved)){
      if(++scanned>5000)throw Error('Link search limit reached. Use the folder path in this link.');
      if(['.git','.agents','.codex','.aws','node_modules','vendor','.venv'].includes(entry.name)||entry.isSymbolicLink())continue;
      const child=directory?directory+'/'+entry.name:entry.name;
      if(entry.isDirectory()&&child.split('/').length<13)pending.push(child);
      else if(entry.isFile()&&entry.name.toLocaleLowerCase()===name.toLocaleLowerCase())matches.push(child);
      if(matches.length>1)throw Error('More than one file matches this link. Include its folder path.');
     }
    }
    if(!matches.length)throw rootError;target=files.resolve(rootId,matches[0]);
   }
  }
  target=this.files(workspaceId).resolve(rootId,target.relative);const stat=await fs.stat(target.resolved);
  if(image)return readFilePreview(target.resolved,[target.canonicalRoot]);
  return {name:path.basename(target.relative),path:target.relative,kind:kind(target.relative,stat.isDirectory()),type:mime(target.relative),identity:identity(stat)};
 }

 pdf({workspaceId,rootId,file}={}){const t=this.files(workspaceId).resolve(rootId,file);const fd=fsSync.openSync(t.resolved,fsSync.constants.O_RDONLY|fsSync.constants.O_NOFOLLOW);try{const stat=fsSync.fstatSync(fd);if(!stat.isFile()||stat.size>32*1024*1024)throw Error('PDF limit is 32 MB.');const bytes=fsSync.readFileSync(fd);if(bytes.subarray(0,5).toString()!=='%PDF-')throw Error('Invalid PDF.');return bytes;}finally{fsSync.closeSync(fd);}}
 preview({workspaceId,rootId,file}={}){const target=this.files(workspaceId).resolve(rootId,file);const value=readFilePreview(target.resolved,[target.canonicalRoot]);return {...value,imageSources:value.mediaType==='text/markdown'?imageSources(value.content).slice(0,32):[],rootId,relativePath:target.relative};}
}
