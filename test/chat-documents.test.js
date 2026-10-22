import {privateTemporaryDirectory} from '../src/private-paths.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ChatDocumentApprovals } from '../src/chat-documents.js';

test('one approved document version is readable only by its requesting device', t=>{
  const root=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-chat-docs-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const file=path.join(root,'brief.md');fs.writeFileSync(file,'# First version\n');
  const run={id:'chat-1',schedule:{workspace:{cwd:root,additionalDirectories:[]}},events:[{role:'assistant',text:'Open [brief](brief.md) when ready.'}]};
  const engine={getRun:id=>{assert.equal(id,run.id);return run;}};
  const approvals=new ChatDocumentApprovals();
  const {requestId,version}=approvals.request(run,{id:'device-a',name:'iPad'},'brief.md');
  assert.equal(approvals.list()[0].version,version);
  assert.throws(()=>approvals.read(requestId,'device-a',engine),/not been approved/);
  approvals.review(requestId,true,engine);
  assert.throws(()=>approvals.read(requestId,'device-b',engine),/not been approved/);
  assert.equal(approvals.read(requestId,'device-a',engine).content,'# First version\n');
  fs.writeFileSync(file,'# Changed after approval\n');
  assert.throws(()=>approvals.read(requestId,'device-a',engine),/changed/);
  assert.throws(()=>approvals.request(run,{id:'device-a',name:'iPad'},'other.md'),/not linked/);
});

test('stable document ID re-requests a fresh approval after viewer restore',t=>{
  const root=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-doc-stable-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.writeFileSync(path.join(root,'brief.md'),'# First\n');
  const run={id:'chat-stable',schedule:{workspace:{cwd:root,additionalDirectories:[]}},events:[{role:'assistant',text:'[brief](brief.md) and [section](brief.md#part)'}]};
  const engine={getRun:()=>run},approvals=new ChatDocumentApprovals({currentRoots:()=>[root]});
  const first=approvals.request(run,{id:'device-a',name:'iPad'},'brief.md');
  const linkedAnchor=approvals.request(run,{id:'device-a',name:'iPad'},'brief.md#part');
  assert.equal(first.documentId,linkedAnchor.documentId);
  approvals.review(first.requestId,true,engine);
  fs.writeFileSync(path.join(root,'brief.md'),'# Second\n');
  const restored=approvals.request(run,{id:'device-a',name:'iPad'},undefined,first.documentId);
  assert.equal(restored.documentId,first.documentId);assert.notEqual(restored.requestId,first.requestId);assert.notEqual(restored.version,first.version);
  assert.throws(()=>approvals.read(restored.requestId,'device-a',engine),/not been approved/);
  approvals.review(restored.requestId,true,engine);assert.equal(approvals.read(restored.requestId,'device-a',engine).content,'# Second\n');
});

test('linked anchors resolve to the same bounded file and grant revocation clears approvals',t=>{
  const root=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-doc-anchor-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.writeFileSync(path.join(root,'guide.md'),'# Guide\n');
  const run={id:'chat-2',schedule:{workspace:{cwd:root,additionalDirectories:[]}},events:[{role:'assistant',text:'See [section](guide.md#section).'}]};
  const engine={getRun:()=>run},approvals=new ChatDocumentApprovals();
  const {requestId}=approvals.request(run,{id:'device-a',name:'iPad'},'guide.md#section');
  approvals.review(requestId,true,engine);
  assert.equal(approvals.read(requestId,'device-a',engine).content,'# Guide\n');
  approvals.revokeDevice('device-a');
  assert.throws(()=>approvals.read(requestId,'device-a',engine),/not been approved/);
});

test('deleting a chat revokes its pending and approved document requests only',t=>{
  const root=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-doc-revoke-chat-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.writeFileSync(path.join(root,'brief.md'),'# Brief\n');
  const run=id=>({id,schedule:{workspace:{cwd:root,additionalDirectories:[]}},events:[{role:'assistant',text:'[brief](brief.md)'}]});
  const engine={getRun:id=>run(id)},approvals=new ChatDocumentApprovals();
  const first=approvals.request(run('chat-1'),{id:'device-a',name:'iPad'},'brief.md');
  const second=approvals.request(run('chat-2'),{id:'device-a',name:'iPad'},'brief.md');
  approvals.review(first.requestId,true,engine);
  approvals.revokeChat('chat-1');
  assert.throws(()=>approvals.status(first.requestId,'device-a'),/unavailable/);
  assert.equal(approvals.status(second.requestId,'device-a').status,'pending');
});

test('removing a current workspace root or retargeting its symlink revokes reads',t=>{
  const base=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-doc-root-'));t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
  const first=path.join(base,'first'),second=path.join(base,'second'),root=path.join(base,'workspace');fs.mkdirSync(first);fs.mkdirSync(second);fs.symlinkSync(first,root);
  fs.writeFileSync(path.join(first,'brief.md'),'# Brief\n');fs.writeFileSync(path.join(second,'brief.md'),'# Brief\n');
  const run={id:'chat-root',schedule:{workspace:{cwd:root,additionalDirectories:[]}},events:[{role:'assistant',text:'See [brief](brief.md).'}]};
  const engine={getRun:()=>run};let current=[root];const approvals=new ChatDocumentApprovals({currentRoots:()=>current});
  const {requestId}=approvals.request(run,{id:'device-a',name:'iPad'},'brief.md');approvals.review(requestId,true,engine);
  assert.equal(approvals.read(requestId,'device-a',engine).content,'# Brief\n');
  current=[];assert.throws(()=>approvals.read(requestId,'device-a',engine),/currently authorized/);
  current=[root];fs.unlinkSync(root);fs.symlinkSync(second,root);
  assert.throws(()=>approvals.read(requestId,'device-a',engine),/changed/);
});

test('linked HTML is bounded and exact-version approved without granting script execution',t=>{
  const root=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-doc-html-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const file=path.join(root,'preview.html');fs.writeFileSync(file,'<h1>Preview</h1><script>location.href="https://example.com"</script>');
  const run={id:'chat-html',schedule:{workspace:{cwd:root,additionalDirectories:[]}},events:[{role:'assistant',text:'Open [preview](preview.html).'}]};
  const engine={getRun:()=>run},approvals=new ChatDocumentApprovals({currentRoots:()=>[root]});
  const pending=approvals.request(run,{id:'device-a',name:'iPad'},'preview.html');
  assert.equal(pending.mediaType,'text/html');
  assert.throws(()=>approvals.read(pending.requestId,'device-a',engine),/not been approved/);
  approvals.review(pending.requestId,true,engine);
  const read=approvals.read(pending.requestId,'device-a',engine);
  assert.equal(read.mediaType,'text/html');assert.match(read.content,/<script>/);
  fs.appendFileSync(file,'<!-- new version -->');
  assert.throws(()=>approvals.read(pending.requestId,'device-a',engine),/changed/);
});

test('HTML manifest ignores fake image tags in script, comments and quoted attributes',t=>{
  const root=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-doc-html-refs-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.writeFileSync(path.join(root,'preview.html'),`<!-- <img src="secret.png"> --><script>const fake = '<img src="secret.png">';</script><div data-fake='<img src="secret.png">'></div><p>Safe.</p>`);
  const run={id:'chat-html-refs',schedule:{workspace:{cwd:root,additionalDirectories:[]}},events:[{role:'assistant',text:'[preview](preview.html)'}]};
  const approvals=new ChatDocumentApprovals({currentRoots:()=>[root]});
  assert.deepEqual(approvals.request(run,{id:'device-a',name:'iPad'},'preview.html').assets,[]);
});

test('approved raster manifest binds exact image bytes, device and composite version',t=>{
  const root=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-doc-assets-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const png=Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000b49444154789c636000020000050001a5f645400000000049454e44ae426082','hex');
  fs.writeFileSync(path.join(root,'chart.png'),png);fs.writeFileSync(path.join(root,'brief.md'),'# Brief\n![Chart](chart.png)\n');
  const run={id:'chat-images',schedule:{workspace:{cwd:root,additionalDirectories:[]}},events:[{role:'assistant',text:'[brief](brief.md)'}]},engine={getRun:()=>run};
  const approvals=new ChatDocumentApprovals({currentRoots:()=>[root]});
  const pending=approvals.request(run,{id:'device-a',name:'iPad'},'brief.md');
  assert.equal(pending.assets.length,1);assert.equal(pending.assets[0].mediaType,'image/png');
  assert.equal(approvals.list()[0].assets[0].source,'chart.png');
  assert.throws(()=>approvals.asset(pending.requestId,pending.assets[0].assetId,'device-a',engine),/not been approved/);
  approvals.review(pending.requestId,true,engine);
  assert.throws(()=>approvals.asset(pending.requestId,pending.assets[0].assetId,'device-b',engine),/not been approved/);
  const image=approvals.asset(pending.requestId,pending.assets[0].assetId,'device-a',engine);
  assert.deepEqual(Buffer.from(image.dataBase64,'base64'),png);assert.equal(image.version,pending.version);
  fs.writeFileSync(path.join(root,'chart.png'),Buffer.concat([png,Buffer.from([0])]));
  assert.throws(()=>approvals.read(pending.requestId,'device-a',engine),/changed/);
  assert.throws(()=>approvals.asset(pending.requestId,pending.assets[0].assetId,'device-a',engine),/changed/);
});

test('relative document links require an approved parent and separate child approval',t=>{
  const root=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-doc-links-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.writeFileSync(path.join(root,'index.md'),'[Details](details.md)');fs.writeFileSync(path.join(root,'details.md'),'# Private details');
  const run={id:'chat-links',schedule:{workspace:{cwd:root,additionalDirectories:[]}},events:[{role:'assistant',text:'[index](index.md)'}]},engine={getRun:()=>run};
  const approvals=new ChatDocumentApprovals({currentRoots:()=>[root]});
  const parent=approvals.request(run,{id:'device-a',name:'iPad'},'index.md');
  assert.equal(parent.links[0].source,'details.md');
  assert.throws(()=>approvals.request(run,{id:'device-a',name:'iPad'},undefined,undefined,parent.requestId,'details.md'),/approve the parent/);
  approvals.review(parent.requestId,true,engine);
  assert.throws(()=>approvals.request(run,{id:'device-b',name:'iPhone'},undefined,undefined,parent.requestId,'details.md'),/approve the parent/);
  assert.throws(()=>approvals.request(run,{id:'device-a',name:'iPad'},undefined,undefined,parent.requestId,'not-linked.md'),/not linked/);
  const child=approvals.request(run,{id:'device-a',name:'iPad'},undefined,undefined,parent.requestId,'details.md');
  assert.equal(child.documentId,parent.links[0].documentId);
  assert.throws(()=>approvals.read(child.requestId,'device-a',engine),/not been approved/);
  approvals.review(child.requestId,true,engine);
  assert.equal(approvals.read(child.requestId,'device-a',engine).content,'# Private details');
});

test('retargeting a relative link invalidates the approved parent manifest',t=>{
  const root=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-doc-retarget-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.writeFileSync(path.join(root,'index.md'),'[Details](details.md)');
  fs.writeFileSync(path.join(root,'first.md'),'# First');fs.writeFileSync(path.join(root,'second.md'),'# Second');
  fs.symlinkSync('first.md',path.join(root,'details.md'));
  const run={id:'chat-retarget',schedule:{workspace:{cwd:root,additionalDirectories:[]}},events:[{role:'assistant',text:'[index](index.md)'}]},engine={getRun:()=>run};
  const approvals=new ChatDocumentApprovals({currentRoots:()=>[root]});
  const parent=approvals.request(run,{id:'device-a',name:'iPad'},'index.md');approvals.review(parent.requestId,true,engine);
  fs.unlinkSync(path.join(root,'details.md'));fs.symlinkSync('second.md',path.join(root,'details.md'));
  assert.throws(()=>approvals.request(run,{id:'device-a',name:'iPad'},undefined,undefined,parent.requestId,'details.md'),/changed/);
  assert.throws(()=>approvals.read(parent.requestId,'device-a',engine),/changed/);
});

test('traversal, symlink escape, forged raster and image count fail before approval',t=>{
  const base=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-doc-reject-'));t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
  const root=path.join(base,'root');fs.mkdirSync(root);fs.writeFileSync(path.join(base,'outside.png'),Buffer.from('89504e470d0a1a0a','hex'));
  const run={id:'chat-reject',schedule:{workspace:{cwd:root,additionalDirectories:[]}},events:[{role:'assistant',text:'[doc](doc.md)'}]};
  const approvals=new ChatDocumentApprovals({currentRoots:()=>[root]});
  const request=()=>approvals.request(run,{id:'device-a',name:'iPad'},'doc.md');
  fs.writeFileSync(path.join(root,'doc.md'),'![Outside](../outside.png)');assert.throws(request,/safe relative|approved folder/);
  fs.writeFileSync(path.join(root,'doc.md'),'![Outside](%2e%2e/outside.png)');assert.throws(request,/safe relative|approved folder/);
  fs.symlinkSync(path.join(base,'outside.png'),path.join(root,'alias.png'));
  fs.writeFileSync(path.join(root,'doc.md'),'![Outside](alias.png)');assert.throws(request,/approved folder/);
  fs.writeFileSync(path.join(root,'alias.png.txt'),'not a raster');fs.writeFileSync(path.join(root,'doc.md'),'![Fake](alias.png.txt)');assert.throws(request,/supported/);
  fs.writeFileSync(path.join(root,'forged.png'),'<script>fetch("https://example.test")</script>');fs.writeFileSync(path.join(root,'doc.md'),'![Fake](forged.png)');assert.throws(request,/raster type/);
  for(let n=0;n<9;n++)fs.writeFileSync(path.join(root,`image${n}.png`),Buffer.from('89504e470d0a1a0a','hex'));
  fs.writeFileSync(path.join(root,'doc.md'),Array.from({length:9},(_,n)=>`![${n}](image${n}.png)`).join('\n'));
  assert.throws(request,/at most eight/);
});
