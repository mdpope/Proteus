import {_electron as electron} from 'playwright';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
// Exercises the shared text/code/Markdown viewer and Files-tab memory in a real Electron renderer.
const home=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-editor-ui-')));let app;
try{
 app=await electron.launch({args:['.','--use-mock-keychain','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,PORT:'0'}});
 const page=await app.firstWindow();await page.locator('#topbar-home').waitFor();
 await page.evaluate(async()=>{
  const {mountFileBrowser}=await import('/features/workspaces/file-browser.js');
  window.mountFixture=state=>{
   document.querySelector('#file-test')?.remove();const root=document.createElement('div');root.id='file-test';root.style.cssText='position:fixed;inset:0;z-index:999;background:#18251c;display:flex;flex-direction:column';document.body.append(root);
   const files={'src/app.py':{mediaType:'text/plain',language:'python',content:'import os\n\ndef greet(name):\n    # say hi\n    return "hi " + name\n'+'x = 1\n'.repeat(120),identity:'a1'},'notes.txt':{mediaType:'text/plain',language:'text',content:'plain notes\nsecond line',identity:'t1'},'README.md':{mediaType:'text/markdown',language:'markdown',content:'# Title\n\nBody text.',identity:'m1',editable:true}};
   const entries={'':[{name:'src',path:'src',kind:'folder',type:'folder',identity:'f'},{name:'notes.txt',path:'notes.txt',kind:'code',type:'text/plain',identity:'t1',size:22},{name:'README.md',path:'README.md',kind:'markdown',type:'text/markdown',identity:'m1',size:18}],src:[{name:'inner',path:'src/inner',kind:'folder',type:'folder',identity:'g'},{name:'app.py',path:'src/app.py',kind:'code',type:'text/x-python',identity:'a1',size:100}],'src/inner':[{name:'deep.txt',path:'src/inner/deep.txt',kind:'code',type:'text/plain',identity:'d'}]};
   window.calls=[];
   window.fileDispose=mountFileBrowser(root,{workspaceId:'fixture',state,escape:t=>String(t).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),request:async(action,args)=>{window.calls.push({action,args});
    if(action==='roots')return {roots:[{id:'root',path:'/x',name:'Fixture',available:true}]};
    if(action==='browse')return {root:{name:'Fixture'},entries:entries[args.directory||'']||[],nextOffset:null};
    if(action==='preview'){const f=files[args.file];return {file:'/x/'+args.file,relativePath:args.file,rootId:'root',title:args.file.split('/').pop(),size:f.content.length,...f};}
    if(action==='save'){files[args.file].content=args.content;files[args.file].identity='new'+Date.now();return {identity:files[args.file].identity,size:args.content.length};}
    return {results:[]};},open:()=>{}});
  };
  window.state={};window.mountFixture(window.state);
 });
 const p=page;
 // Code file: whole column, highlighted, read-only.
 await p.locator('[data-row]').first().waitFor();await p.locator('[data-expand="0"]').click();await p.locator('[data-expand="1"]').click();await p.getByText('deep.txt',{exact:true}).waitFor();
 page.on('pageerror',e=>{throw e;});await p.getByText('app.py',{exact:true}).click();await p.locator('.cm-editor').waitFor({timeout:8000});await p.waitForFunction(()=>document.querySelector('.cm-line span[class]'));
 const geometry=await p.evaluate(()=>{const aside=document.querySelector('#file-test aside').getBoundingClientRect(),editor=document.querySelector('.cm-editor').getBoundingClientRect();return {asideBottom:aside.bottom,editorBottom:editor.bottom,editorWidth:editor.width,asideWidth:aside.width};});
 assert.ok(geometry.asideBottom-geometry.editorBottom<16,'editor fills the column to its bottom edge '+JSON.stringify(geometry));assert.ok(geometry.asideWidth-geometry.editorWidth<24,'editor fills the column width');
 if(process.env.SHOT)await p.screenshot({path:process.env.SHOT});
 assert.equal(await p.locator('.cm-content').getAttribute('contenteditable'),'false');
 const colors=await p.evaluate(()=>new Set([...document.querySelectorAll('.cm-line span')].map(s=>getComputedStyle(s).color)).size);assert.ok(colors>=3,'python source has distinct token colors');
 assert.equal(await p.locator('.file-doc-kind').textContent(),'Python');
 // Plain text opens too.
 await p.getByText('notes.txt',{exact:true}).click();await p.locator('.file-doc-kind').filter({hasText:'Plain text'}).waitFor();
 // Markdown: rendered read-only, Edit is explicit, Save writes through the owner.
 await p.getByText('README.md',{exact:true}).click();await p.locator('.file-doc-markdown h1').waitFor();assert.equal(await p.locator('.cm-editor').count(),0);
 await p.getByRole('button',{name:'Edit this file'}).click();await p.locator('.cm-editor').waitFor();await p.locator('.cm-content').click();await p.keyboard.press('End');await p.keyboard.type(' more');
 await p.getByText('Unsaved changes').waitFor();await p.getByRole('button',{name:'Save changes'}).click();await p.locator('.file-doc-status').filter({hasText:'Saved'}).waitFor();
 const save=(await p.evaluate(()=>window.calls)).find(c=>c.action==='save');assert.equal(save.args.file,'README.md');assert.equal(save.args.identity,'m1');assert.match(save.args.content,/more/);
 await p.locator('.file-doc-markdown').waitFor();
 // Memory: reopen app.py, scroll, remount with the same persisted state.
 await p.getByText('app.py',{exact:true}).click();await p.locator('.file-doc-kind').filter({hasText:'Python'}).waitFor();await p.locator('.cm-scroller').evaluate(el=>{el.scrollTop=240;});await p.waitForTimeout(150);
 await p.locator('.file-browser-list').evaluate(el=>{el.scrollTop=0;});
 await p.evaluate(()=>{window.fileDispose();});
 const kept=await p.evaluate(()=>JSON.parse(JSON.stringify(window.state)));assert.deepEqual(kept.expanded.sort(),['src','src/inner']);assert.equal(kept.selectedFile,'src/app.py');assert.ok(kept.doc.top>=200,'scroll position retained '+JSON.stringify(kept.doc));
 await p.evaluate(()=>window.mountFixture(window.state));
 await p.getByText('deep.txt',{exact:true}).waitFor();await p.locator('.cm-editor').waitFor();await p.waitForFunction(()=>document.querySelector('.cm-scroller').scrollTop>=200);
 assert.equal(await p.locator('tr[aria-selected="true"]').count(),1);
 console.log('Passed code highlighting, whole-column editor, plain text, Markdown explicit edit/save, and Files tab memory.');
}finally{await app?.close();fs.rmSync(home,{recursive:true,force:true});}
