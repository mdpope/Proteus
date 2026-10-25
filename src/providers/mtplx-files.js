import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {canonicalPath} from '../services/settings/permissions.js';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const inside=(target,root)=>{const rel=path.relative(root,target);return rel===''||rel!=='..'&&!rel.startsWith('..'+path.sep)&&!path.isAbsolute(rel);};
export function mtplxFileTools(run,permissionProfile){
  const resolve=async(file,write=false)=>{
    const target=canonicalPath(file,run.schedule.workspace.cwd);if(!target)throw Error('Path is unavailable.');
    const profile=permissionProfile?.(),roots=[run.schedule.workspace.cwd,...run.schedule.workspace.additionalDirectories,...(profile?.folders||[]).filter(f=>!write||f.access==='read-write').map(f=>f.path)].map(p=>canonicalPath(p,run.schedule.workspace.cwd)).filter(Boolean);
    if(!roots.some(root=>inside(target,root)))throw Error('Path is outside this chat’s configured or explicitly granted folders.');
    // Protected native credential/configuration metadata is never writable by this helper.
    if(write&&target.split(path.sep).some(p=>['.git','.codex','.agents','.aws','.ssh','.config'].includes(p)))throw Error('Protected metadata is not writable through this tool.');
    return target;
  };
  return [{name:'read_file',description:'Read a UTF-8 text file in the chat’s authorized folders, or list a directory. Returns sha256 for safe edits. Does not automatically load unrelated instructions.',parameters:{type:'object',properties:{path:{type:'string'}},required:['path'],additionalProperties:false},permission:async args=>({kind:'read',path:await resolve(args.path),intention:'Read '+args.path}),handler:async args=>{
    const target=await resolve(args.path),stat=await fs.stat(target);
    if(stat.isDirectory())return JSON.stringify({path:target,entries:(await fs.readdir(target,{withFileTypes:true})).slice(0,500).map(e=>({name:e.name,type:e.isDirectory()?'directory':e.isSymbolicLink()?'symlink':'file'}))});
    if(!stat.isFile()||stat.size>256000)throw Error('Read one regular UTF-8 text file up to 256 KB.');
    const bytes=await fs.readFile(target),text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);if(text.includes('\0'))throw Error('Binary files are not supported.');
    return JSON.stringify({path:target,sha256:digest(bytes),text});
  }},{name:'write_file',description:'Create or replace a UTF-8 file in authorized folders. For an existing file, first read it and provide its exact sha256 to prevent overwriting concurrent edits. Empty expectedSha256 requires a new file.',parameters:{type:'object',properties:{path:{type:'string'},content:{type:'string',maxLength:256000},expectedSha256:{type:'string',pattern:'^(?:[a-f0-9]{64})?$'}},required:['path','content','expectedSha256'],additionalProperties:false},permission:async args=>({kind:'write',fileName:await resolve(args.path,true),intention:'Write '+args.path}),handler:async args=>{
    const target=await resolve(args.path,true);let previous=null;try{previous=await fs.readFile(target);}catch(error){if(error.code!=='ENOENT')throw error;}
    if((previous?digest(previous):'')!==args.expectedSha256)throw Error('File changed or already exists. Read its current contents before editing.');
    const temp=path.join(path.dirname(target),'.proteus-edit-'+randomUUID());
    try{
      await fs.writeFile(temp,args.content,{flag:'wx',mode:previous?(await fs.stat(target)).mode&0o777:0o600});
      // Re-resolve after permission and immediately before replacement.
      if(await resolve(args.path,true)!==target)throw Error('File path changed.');
      const now=await fs.readFile(target).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
      if((now?digest(now):'')!==args.expectedSha256)throw Error('File changed during this edit.');
      if(previous)await fs.rename(temp,target);else {await fs.link(temp,target);await fs.unlink(temp);}
      return JSON.stringify({written:true,path:target,sha256:digest(Buffer.from(args.content))});
    }finally{await fs.rm(temp,{force:true});}
  }}];
}
