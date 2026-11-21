import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';

const fixture=await sidebarFixture();
const name='file-tab-rehearsal.md';
fs.writeFileSync(path.join(fixture.studio.cwd,name),'# File tab rehearsal');
let app;
try {
  app=await electron.launch({args:['.','--use-mock-keychain','--user-data-dir='+fixture.locations.userData],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_AUTH:'none',PROTEUS_PREVIEW_HOME:fixture.locations.root,PROTEUS_HOME:fixture.locations.home,CODEX_HOME:fixture.auth,PORT:'0'}});
  const page=await app.firstWindow(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/app.js',async route=>{
    const response=await route.fetch();
    await route.fulfill({response,body:(await response.text())+'\nwindow.fileFixture={state,openFileBrowser,async refreshTabs(){await contentTabSync.sync(tabScope(state.tabs.find(tab=>tab.id===state.tab)));},get ready(){return workspaceReady&&!workspaceRestoring;}};'});
  });
  await page.reload();
  await page.waitForFunction(()=>window.fileFixture?.ready);
  await page.evaluate(id=>fileFixture.openFileBrowser(fileFixture.state.tabs.find(tab=>tab.id===id)),fixture.parentId);
  const browser=page.locator('.workspace-file-browser');
  const row=browser.getByRole('row').filter({hasText:name});
  await row.click();
  const toolbar=browser.getByRole('toolbar',{name:'File actions'});
  assert.deepEqual((await toolbar.getByRole('button').allTextContents()).slice(0,2),['Open in tab','New file']);
  assert.equal(await browser.locator('[data-count]').evaluate(count=>count.parentElement.className),'file-path-summary');
  const geometry=control=>control.evaluate(node=>{
    const {top,height}=node.getBoundingClientRect(),style=getComputedStyle(node);
    const contentHeight=height-['paddingTop','paddingBottom','borderTopWidth','borderBottomWidth'].reduce((total,key)=>total+parseFloat(style[key]),0);
    return {top,height,contentHeight,fontSize:parseFloat(style.fontSize)};
  });
  const filter=await geometry(browser.getByLabel('Filter'));
  const refresh=await geometry(browser.getByRole('button',{name:'Refresh files'}));
  const picker=browser.getByLabel('Workspace folder');
  const folder=await geometry(picker);
  assert.equal(refresh.height,filter.height);
  assert.equal(refresh.top,filter.top,'Refresh and Filter start on the same line.');
  assert.equal(folder.top,filter.top);
  assert.ok(folder.contentHeight>=folder.fontSize*1.25,'The folder path fits vertically inside its control.');
  assert.ok((await picker.getAttribute('title')).includes(fixture.studio.cwd),'The complete selected path is available on hover.');
  assert.equal(refresh.height,(await geometry(toolbar.getByRole('button',{name:'New file'}))).height);
  if(process.env.PROTEUS_FILE_CONTROLS_SCREENSHOT)await page.screenshot({path:process.env.PROTEUS_FILE_CONTROLS_SCREENSHOT});
  const divider=await browser.getByRole('separator',{name:'Resize file list'}).boundingBox();
  const width=await browser.getByRole('grid').evaluate(node=>node.parentElement.getBoundingClientRect().width);
  await page.mouse.move(divider.x+divider.width/2,divider.y+divider.height/2);
  await page.mouse.down();
  await page.mouse.move(divider.x-100,divider.y+divider.height/2,{steps:8});
  await page.mouse.up();
  assert.ok(await browser.getByRole('grid').evaluate(node=>node.parentElement.getBoundingClientRect().width)<width-50);
  await toolbar.getByRole('button',{name:'Open in tab'}).click();
  await page.locator('#main').getByRole('heading',{name:'File tab rehearsal',exact:true}).waitFor();
  await page.evaluate(()=>fileFixture.refreshTabs());
  const opened=await page.evaluate(parent=>{
    const siblings=fileFixture.state.tabs.filter(tab=>tab.parentId===parent);
    const at=siblings.findIndex(tab=>tab.type==='files');
    return {document:siblings[at+1],selected:fileFixture.state.tab};
  },fixture.parentId);
  assert.equal(opened.document?.label,name);
  assert.equal(opened.document?.id,opened.selected);
  assert.equal(opened.document?.parentId,fixture.parentId);
  await page.getByRole('button',{name:'Edit this file'}).click();
  const editor=page.locator('#main .cm-content');
  await editor.waitFor();
  await editor.evaluate(node=>{
    const lines=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>','<< /Length 0 >>\nstream\nendstream'];
    let pdf='%PDF-1.4\n';
    const offsets=[0];
    for(const [i,line] of lines.entries()){offsets.push(pdf.length);pdf+=(i+1)+' 0 obj\n'+line+'\nendobj\n';}
    const xref=pdf.length;
    pdf+='xref\n0 '+offsets.length+'\n0000000000 65535 f \n'+offsets.slice(1).map(offset=>String(offset).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Root 1 0 R /Size '+offsets.length+' >>\nstartxref\n'+xref+'\n%%EOF\n';
    const transfer=new DataTransfer();transfer.items.add(new File([pdf],'Preview.pdf',{type:'application/pdf'}));
    node.dispatchEvent(new ClipboardEvent('paste',{clipboardData:transfer,bubbles:true,cancelable:true}));
  });
  const save=page.getByRole('button',{name:'Save changes'});
  await page.waitForFunction(()=>document.querySelector('[aria-label="Save changes"]')?.disabled===false);
  await save.click();
  await page.getByRole('button',{name:'Show PDF'}).click();
  const frame=page.locator('iframe[title="Inline PDF"]');
  await frame.waitFor({timeout:8000});
  const source=await frame.getAttribute('src');
  assert.match(source,/^\/api\/workspace-explorer\/pdf\?/);
  const attachment=await page.request.get(new URL(source,page.url()).href);
  assert.equal(attachment.status(),200);
  assert.equal((await attachment.body()).subarray(0,8).toString(),'%PDF-1.4');
  assert.match(fs.readFileSync(path.join(fixture.studio.cwd,name),'utf8'),/!\[\[pasted-[a-f0-9]{64}\.pdf\]\]/);
  assert.deepEqual(errors,[]);
  console.log('Project Files toolbar, divider, adjacent document and inline PDF verified using an isolated Electron profile.');
} finally {
  await app?.close().catch(()=>{});
  await fixture.cleanup();
}
