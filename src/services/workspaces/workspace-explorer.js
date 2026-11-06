import fs from 'node:fs/promises';
import path from 'node:path';
import {WorkspaceFiles} from './workspace-files.js';
import {fileDates} from '../../shared/file-metadata.js';
import {readFilePreview} from './workspace-preview.js';

const kind = (name,directory) => directory?'folder':/\.md$/i.test(name)?'markdown':/\.(png|jpe?g|gif|webp)$/i.test(name)?'image':'file';
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
 async browse({workspaceId,rootId,directory='',offset=0,query=''}={}, {signal}={}){
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
     if(!needle||entry.name.toLocaleLowerCase().includes(needle))entries.push({name:entry.name,path:relative,kind:type,type:type==='file'?(path.extname(entry.name).slice(1).toUpperCase()||'File'):type,size:stat.isFile()?stat.size:null,...fileDates(stat),symlink:entry.isSymbolicLink()});
     if(needle&&stat.isDirectory()){if(current.depth<12)pending.push({file:actual,relative,depth:current.depth+1});else limited=true;}
    }catch(error){if(error.name==='AbortError')throw error;/* Changing/unreadable entries are skipped, never followed elsewhere. */}
   }}finally{await handle.close().catch(()=>{});}
   if(scanned>5000)break;
  }
  signal?.throwIfAborted();this.files(workspaceId).resolve(rootId,directory,true);
  entries.sort((a,b)=>(a.kind==='folder'?0:1)-(b.kind==='folder'?0:1)||a.name.localeCompare(b.name,undefined,{numeric:true})||a.path.localeCompare(b.path));
  return {root:base.root,directory:base.relative,entries:entries.slice(offset,offset+200),nextOffset:offset+200<entries.length?offset+200:null,offset,scanLimited:limited,scanned};
 }
 preview({workspaceId,rootId,file}={}){const target=this.files(workspaceId).resolve(rootId,file);return {...readFilePreview(target.resolved,[target.canonicalRoot]),rootId,relativePath:target.relative};}
}
