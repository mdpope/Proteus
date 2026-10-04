import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { WorkspaceFiles } from '../src/workspace-files.js';

function fixture(t) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(),'proteus-workspace-picker-'));
  t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
  const root=path.join(home,'workspace'),other=path.join(home,'other'),outside=path.join(home,'outside');for(const p of [root,other,outside])fs.mkdirSync(p);
  let workspaces=[{id:'primary',name:'Personal',cwd:root,additionalDirectories:[other]}];
  const files=new WorkspaceFiles(()=>workspaces);
  return {home,root,other,outside,files,id:files.roots().roots[0].id,replace:value=>{workspaces=value;}};
}

test('picker exposes configured workspace roots and lists sorted folders plus Markdown',t=>{
 const f=fixture(t);fs.mkdirSync(path.join(f.root,'Zoo'));fs.mkdirSync(path.join(f.root,'alpha'));fs.mkdirSync(path.join(f.root,'.git'));fs.writeFileSync(path.join(f.root,'b.md'),'B');fs.writeFileSync(path.join(f.root,'A.MD'),'A');fs.writeFileSync(path.join(f.root,'private.json'),'not listed');
 const roots=f.files.roots().roots;assert.equal(roots.length,2);assert.ok(roots.every(root=>root.available));assert.equal(roots[0].primary,true);assert.equal(roots[1].primary,false);
 const listing=f.files.list({rootId:f.id});assert.deepEqual(listing.entries.map(e=>e.name),['alpha','Zoo','A.MD','b.md']);assert.equal(listing.parent,null);
 assert.equal(f.files.list({rootId:f.id,directory:'alpha'}).parent,'');
});
test('new nested folders and Markdown use selected directory without overwriting',t=>{
 const f=fixture(t);const folder=f.files.createFolder({rootId:f.id,name:'Notes'});assert.equal(folder.directory,'Notes');
 const nested=f.files.createFolder({rootId:f.id,directory:'Notes',name:'Trips'});assert.equal(nested.directory,'Notes/Trips');
 const created=f.files.createMarkdown({rootId:f.id,directory:nested.directory,name:'Plans',content:'# Plans\n\nDraft'});
 assert.equal(created.relativePath,'Notes/Trips/Plans.md');assert.equal(created.content,'# Plans\n\nDraft');assert.equal(fs.statSync(created.file).mode&0o777,0o600);
 assert.equal(f.files.read({rootId:f.id,file:created.relativePath}).content,created.content);
 assert.throws(()=>f.files.createMarkdown({rootId:f.id,directory:nested.directory,name:'Plans.md',content:'overwrite'}),/already exists/);
 assert.equal(fs.readFileSync(created.file,'utf8'),created.content);assert.throws(()=>f.files.createFolder({rootId:f.id,name:'Notes'}),/already exists/);
});
test('picker rejects absolute paths, traversal, separators and non-Markdown filenames',t=>{
 const f=fixture(t);
 for(const directory of ['..','../outside','Notes/../../outside','/tmp','Notes\\..','a//b','./','x\0y'])assert.throws(()=>f.files.list({rootId:f.id,directory}));
 for(const name of ['..','../escape','/absolute','a/b','a\\b',' bad','bad ','','x\0y']){assert.throws(()=>f.files.createFolder({rootId:f.id,name}));assert.throws(()=>f.files.createMarkdown({rootId:f.id,name}));}
 assert.throws(()=>f.files.createMarkdown({rootId:f.id,name:'script.js'}),/Markdown/);assert.throws(()=>f.files.read({rootId:f.id,file:'config.json'}),/Markdown/);
 assert.throws(()=>f.files.list({rootId:f.root}),/unavailable/);assert.equal(fs.readdirSync(f.outside).length,0);
});
test('links outside selected root are hidden and blocked for read/create/browse',t=>{
 const f=fixture(t);fs.writeFileSync(path.join(f.outside,'private.md'),'outside private');fs.symlinkSync(f.outside,path.join(f.root,'escape'));fs.symlinkSync(path.join(f.outside,'private.md'),path.join(f.root,'private.md'));
 assert.equal(f.files.list({rootId:f.id}).entries.length,0);
 assert.throws(()=>f.files.list({rootId:f.id,directory:'escape'}),/leaves/);assert.throws(()=>f.files.read({rootId:f.id,file:'private.md'}),/leaves/);
 assert.throws(()=>f.files.createMarkdown({rootId:f.id,directory:'escape',name:'not-created'}),/leaves/);assert.throws(()=>f.files.createFolder({rootId:f.id,directory:'escape',name:'not-created'}),/leaves/);
 assert.deepEqual(fs.readdirSync(f.outside),['private.md']);
});
test('safe internal links work but exclusive creation never follows an existing link',t=>{
 const f=fixture(t);fs.mkdirSync(path.join(f.root,'Notes'));fs.writeFileSync(path.join(f.root,'Notes/original.md'),'unchanged');fs.symlinkSync(path.join(f.root,'Notes'),path.join(f.root,'alias'));fs.symlinkSync(path.join(f.root,'Notes/original.md'),path.join(f.root,'linked.md'));
 assert.equal(f.files.read({rootId:f.id,file:'linked.md'}).content,'unchanged');assert.equal(f.files.list({rootId:f.id,directory:'alias'}).entries[0].name,'original.md');
 assert.throws(()=>f.files.createMarkdown({rootId:f.id,name:'linked.md',content:'replace'}),/already exists/);assert.equal(fs.readFileSync(path.join(f.root,'Notes/original.md'),'utf8'),'unchanged');
 assert.equal(f.files.createMarkdown({rootId:f.id,directory:'alias',name:'safe.md'}).content,'');
});
test('removed roots and retargeted root links invalidate previously selected root IDs',t=>{
 const f=fixture(t);f.replace([]);assert.throws(()=>f.files.list({rootId:f.id}),/unavailable/);
 const link=path.join(f.home,'root-link');fs.symlinkSync(f.root,link);f.replace([{id:'linked',name:'Linked',cwd:link,additionalDirectories:[]}]);const previous=f.files.roots().roots[0].id;
 fs.unlinkSync(link);fs.symlinkSync(f.outside,link);assert.notEqual(f.files.roots().roots[0].id,previous);assert.throws(()=>f.files.createFolder({rootId:previous,name:'unsafe'}),/unavailable/);assert.equal(fs.readdirSync(f.outside).length,0);
});
test('listing pages are bounded and sorted; Markdown reads and writes reject oversized content',t=>{
 const f=fixture(t);for(let n=220;n>=1;n--)fs.writeFileSync(path.join(f.root,`note-${n}.md`),'');
 const first=f.files.list({rootId:f.id});assert.equal(first.entries.length,200);assert.equal(first.entries[0].name,'note-1.md');assert.equal(first.nextOffset,200);
 const second=f.files.list({rootId:f.id,offset:first.nextOffset});assert.equal(second.entries.length,20);assert.equal(second.entries[0].name,'note-201.md');assert.equal(second.nextOffset,null);
 assert.throws(()=>f.files.list({rootId:f.id,offset:-1}),/page/);assert.throws(()=>f.files.createMarkdown({rootId:f.id,name:'large',content:'x'.repeat(1_000_001)}),/1 MB/);
 fs.writeFileSync(path.join(f.root,'large.md'),'x'.repeat(1_000_001));assert.throws(()=>f.files.read({rootId:f.id,file:'large.md'}),/1 MB/);
 fs.writeFileSync(path.join(f.root,'binary.md'),'nul\0binary');assert.throws(()=>f.files.read({rootId:f.id,file:'binary.md'}),/text/);
});

test('full context includes shared repositories and every-chat folders with live revocation',t=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-all-roots-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
 const primary=path.join(home,'primary'),shared=path.join(home,'shared'),universal=path.join(home,'universal');for(const p of [primary,shared,universal])fs.mkdirSync(p);
 fs.mkdirSync(path.join(shared,'Nested'));fs.writeFileSync(path.join(shared,'Nested','Shared.md'),'# Shared');
 let config={workspaces:[{id:'default',name:'Default',cwd:primary,additionalDirectories:[]}],libraryFolders:[shared],universalFolders:[shared,universal]};
 const files=new WorkspaceFiles(()=>config),roots=files.roots().roots;assert.equal(roots.length,3);const library=roots.find(r=>r.path===shared);assert.equal(library.scope,'library');assert.equal(roots.find(r=>r.path===universal).scope,'universal');assert.equal(files.read({rootId:library.id,file:'Nested/Shared.md'}).content,'# Shared');
 const folder=files.createFolder({rootId:library.id,directory:'Nested',name:'Child'});assert.equal(folder.directory,'Nested/Child');
 config={...config,libraryFolders:[],universalFolders:[universal]};assert.throws(()=>files.createMarkdown({rootId:library.id,directory:'Nested',name:'Revoked'}),/unavailable/);assert.equal(fs.existsSync(path.join(shared,'Nested','Revoked.md')),false);
});
