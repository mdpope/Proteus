import {_electron as electron} from 'playwright';
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const fixture=await sidebarFixture();let app;const errors=[];
try{
 const file=path.join(fixture.studio.cwd,'docs','properties.md');
 fs.writeFileSync(file,'---\ntitle: Synthetic properties\ntags: [release, preview]\n---\n# Document\n\n[[sidebar-fixture|Related note]]');
 fs.writeFileSync(path.join(fixture.studio.cwd,'docs','pixel.png'),Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=','base64'));
 const saved=path.join(fixture.locations.home,'desktop-workspace.json'),session=JSON.parse(fs.readFileSync(saved));
 session.tabs.push({id:'files:'+fixture.studio.id,type:'files',workspaceId:fixture.studio.id,label:'Workspace files'});session.active='files:'+fixture.studio.id;fs.writeFileSync(saved,JSON.stringify(session));
 app=await electron.launch({args:['.','--use-mock-keychain','--user-data-dir='+fixture.locations.userData],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,PROTEUS_HOME:fixture.locations.home,CODEX_HOME:fixture.auth,PORT:'0'},timeout:60000});
 const page=await app.firstWindow();page.on('pageerror',error=>errors.push(error.message));
 await page.locator('.workspace-file-browser tbody button').first().waitFor({timeout:30000});
 await page.locator('[data-filter]').fill('properties');
 await page.getByRole('button',{name:'properties.md',exact:true}).click();
 await page.locator('.md-properties').waitFor();if(process.env.PROTEUS_UI_ARTIFACTS){fs.mkdirSync(process.env.PROTEUS_UI_ARTIFACTS,{recursive:true});await page.screenshot({path:path.join(process.env.PROTEUS_UI_ARTIFACTS,'files-desktop.png')});}assert.match(await page.locator('.md-properties').innerText(),/release, preview/);
 await page.getByRole('button',{name:'Open in tab',exact:true}).click();
 await page.locator('.markdown-preview .md-properties').waitFor();
 await page.getByRole('link',{name:'Related note',exact:true}).click();
 await page.getByRole('heading',{name:'Synthetic sidebar document',exact:true}).waitFor();
 // Open image through the actual workspace tab, then verify no bytes in saved navigation.
 await page.locator('[data-tab]').filter({hasText:'Workspace files'}).first().click();
 await page.locator('[data-filter]').fill('pixel');
 await page.getByRole('button',{name:'pixel.png',exact:true}).click();
 await page.locator('aside img').waitFor();
 await page.getByRole('button',{name:'Open in tab',exact:true}).click();
 await page.locator('.file-image-preview').waitFor();
 const state=await page.evaluate(()=>window.desktop.workspaceSession({action:'get'}));assert.ok(state.tabs.filter(tab=>tab.type==='markdown').every(tab=>!tab.markdown&&!tab.dataURL&&!tab.content));
 assert.ok(state.tabs.some(tab=>tab.type==='files'&&tab.workspaceId===fixture.studio.id));
 await page.reload();await page.locator('.file-image-preview').waitFor({timeout:30000});
 await page.keyboard.press('Meta+Shift+Backslash');await page.locator('.browser-overview').waitFor();const overview=await page.locator('.browser-overview').boundingBox(),viewport=await page.evaluate(()=>({width:innerWidth,height:innerHeight}));assert.ok(overview.width>=viewport.width*.85);assert.ok(overview.height>=viewport.height*.85);await page.keyboard.press('Escape');
 await page.locator('#tab-add-menu > summary').click();await page.locator('[data-new-tab-action]').filter({hasText:'Workspace files'}).click();await page.locator('.workspace-file-browser').waitFor();
 await page.waitForFunction(async()=>{const session=await window.desktop.workspaceSession({action:'get'});return !session.tabs.some(tab=>tab.type==='browser'&&!tab.url&&!tab.hidden);});
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,synthetic:true,properties:true,wikiLink:true,imageTab:true,fileBrowser:true,savedBytes:false}));
}finally{if(app)await app.close();await fixture.cleanup();}
