// Incoming owner descriptors must materialize as real desktop file tabs without
// recreating a source, changing its placement or storing preview bytes in navigation.
import {_electron as electron} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';

const fixture=await sidebarFixture();let app;
try{
 const file=path.join(fixture.studio.cwd,'Shared incoming.md');fs.writeFileSync(file,'# Shared file body\n\n[[Unique related|Follow related]]\n\n![[Images/pixel.png]]');
 fs.mkdirSync(path.join(fixture.studio.cwd,'References'),{recursive:true});fs.writeFileSync(path.join(fixture.studio.cwd,'References/Unique related.md'),'# Related body');
 fs.mkdirSync(path.join(fixture.studio.cwd,'Images'),{recursive:true});fs.writeFileSync(path.join(fixture.studio.cwd,'Images/pixel.png'),Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=','base64'));
 app=await electron.launch({args:['.','--use-mock-keychain','--user-data-dir='+fixture.locations.userData],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,PROTEUS_HOME:fixture.locations.home,CODEX_HOME:fixture.auth,PORT:'0'},timeout:60000});
 const page=await app.firstWindow();page.setDefaultTimeout(20000);
 await page.locator('[data-preview-workspace]').first().waitFor();
 const expand=page.locator('[data-preview-workspace-expand="'+fixture.studio.id+'"]');if(await expand.getAttribute('aria-expanded')!=='true')await expand.click();
 await page.locator('[data-preview-project="'+fixture.project.id+'"]').first().click();
 const tab=await app.evaluate(async({app},value)=>{
  const service=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService();
  const preview=service.workspaceExplorer.preview({workspaceId:value.workspaceId,rootId:service.workspaceExplorer.roots({workspaceId:value.workspaceId}).roots.find(root=>value.file.startsWith(root.path+'/')).id,file:'Shared incoming.md'});
  const tab=service.contentTabs.registerWorkspaceDocument({scope:'project',id:value.projectId,workspaceId:value.workspaceId,file:value.file,title:'Shared incoming.md',mediaType:preview.mediaType});
  const current=service.contentTabs.get('project',value.projectId);
  await service.mutateContentTabs({scope:'project',id:value.projectId,expectedRevision:current.revision,operations:[{action:'open',tab}]});return tab;
 },{workspaceId:fixture.studio.id,projectId:fixture.project.id,file});
 await page.getByText('Shared incoming.md',{exact:true}).first().click();
 await page.getByRole('heading',{name:'Shared file body',exact:true}).waitFor();
 await page.locator('.markdown-preview img').waitFor();
 const session=await page.evaluate(()=>window.desktop.workspaceSession({action:'get'}));
 const materialized=session.tabs.find(row=>row.contentTabId===tab.id);
 assert.ok(materialized);assert.equal(materialized.type,'markdown');assert.equal(materialized.file,file);assert.equal(materialized.parentId,fixture.parentId);
 assert.equal(session.tabs.filter(row=>row.contentTabId===tab.id).length,1);
 await page.getByRole('link',{name:'Follow related',exact:true}).click();await page.getByRole('heading',{name:'Related body',exact:true}).waitFor();
 const updated=await page.evaluate(()=>window.desktop.workspaceSession({action:'get'}));
 assert.ok(updated.tabs.some(row=>row.type==='markdown'&&row.parentId===fixture.parentId&&(row.file||row.markdown?.file)===path.join(fixture.studio.cwd,'References/Unique related.md')));
 assert.equal(JSON.stringify(updated.tabs.filter(row=>row.type==='markdown')).includes('data:image/'),false,'Inline image bytes must not enter file navigation records; browser favicons are separate metadata');
 console.log('Passed actual Electron incoming shared file tab, source binding, project placement and document rendering.');
}finally{await app?.close();await fixture.cleanup();}
