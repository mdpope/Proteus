import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const fixture=await sidebarFixture();let app,page;
try{
 app=await electron.launch({args:['.'],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,PROTEUS_PREVIEW_AUTH:'none',PORT:'0'}});
 page=await app.firstWindow();page.setDefaultTimeout(20000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.locator('[data-page=scratchpad]').click();await page.getByLabel('Scratchpad storage folder',{exact:true}).fill(fixture.studio.cwd);await page.getByRole('button',{name:'Use this folder',exact:true}).click();
 await page.getByRole('button',{name:'New scratch',exact:true}).click();await page.getByRole('navigation',{name:'Scratchpad tabs',exact:true}).getByRole('button',{name:'Scratchpad',exact:true}).waitFor();await page.getByLabel('Scratch title',{exact:true}).fill('Markdown tab test');
 const editor=page.locator('.cm-content');await editor.waitFor();assert.equal(await page.locator('.cm-editor').evaluate(node=>getComputedStyle(node).display),'flex','CodeMirror styles are accepted by CSP');await page.getByRole('button',{name:'Source',exact:true}).click();await editor.fill('# Source heading\n\n**Bold content**');
 await page.locator('.scratchpad-document .note').filter({hasText:/^Saved$/}).waitFor();
 await page.getByRole('button',{name:'Live Preview',exact:true}).click();assert.equal(await page.locator('.cm-foldPlaceholder').count(),0);
 await page.getByRole('button',{name:'Bold',exact:true}).click();await page.keyboard.press('Meta+z');
 await page.locator('.scratchpad-document .note').filter({hasText:/^Saved$/}).waitFor();
 const savedBody=await app.evaluate(async({app})=>{const owner=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService().scratchpad;const row=(await owner.handle({action:'list'})).items.find(r=>r.title==='Markdown tab test');return (await owner.handle({action:'read',id:row.id})).body;});
 assert.equal(savedBody,'# Source heading\n\n**Bold content**','Formatting and undo preserve the complete Markdown');
 await page.getByLabel('Scratch workspace',{exact:true}).selectOption(fixture.studio.id);await page.getByLabel('Scratch project',{exact:true}).selectOption(fixture.project.id);
 await page.getByRole('button',{name:'Preview',exact:true}).click();await page.locator('.scratchpad-document>.rich-text h1').filter({hasText:'Source heading'}).waitFor();
 assert.ok(await page.getByRole('complementary',{name:'Scratch folder browser'}).locator('.workspace-file-browser,.file-browser-list').count());
 await page.screenshot({path:process.cwd()+'/.runtime-tests/scratch-code-editor.png'});
 await page.evaluate(async project=>{const {openPreviewProject}=await import('/shared/navigation/desktop-preview.js');openPreviewProject(project);},fixture.project);
 await page.locator('[data-chat-subtab="'+fixture.parentId+':chat:'+fixture.user[0].id+'"]').click();const selected=await page.locator('#chat-subtabs .chat-subtab.selected [data-chat-subtab]').first().getAttribute('data-chat-subtab');
 await page.locator('[data-page=home]').click();await page.evaluate(async project=>{const {openPreviewProject}=await import('/shared/navigation/desktop-preview.js');openPreviewProject(project);},fixture.project);
 assert.equal(await page.locator('#chat-subtabs .chat-subtab.selected [data-chat-subtab]').getAttribute('data-chat-subtab'),selected);
 await page.locator('#chat-subtabs .chat-subtab.selected [data-chat-subtab]').hover();await page.getByRole('tooltip').waitFor();assert.match(await page.getByRole('tooltip').innerText(),/Synthetic/);
 await page.locator('#tab-add-menu summary').click();await page.locator('[data-new-tab-action]').filter({hasText:/^Scratch$/}).click();await page.getByLabel('Scratch title',{exact:true}).fill('Root scratch placement');await page.getByLabel('Scratch workspace',{exact:true}).selectOption(fixture.studio.id);await page.getByLabel('Scratch project',{exact:true}).selectOption(fixture.project.id);await page.locator('.scratchpad-document>.note').filter({hasText:/^Saved$/}).waitFor();assert.equal(await page.locator('#tabs [data-tab]').filter({hasText:'Root scratch placement'}).isVisible(),true,'Project association does not move a root scratch out of its navigation strip');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,synthetic:true,codeMirror:true,markdownPreview:true,workspaceProject:true,projectRecall:true}));
}catch(error){console.error(error);await page?.screenshot({path:process.cwd()+'/.runtime-tests/scratch-editor-failure.png'}).catch(()=>{});throw error;}finally{await app?.context().request.dispose();await app?.close();await fixture.cleanup();}
process.exit(0);
