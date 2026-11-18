// Disposable root and synthetic project; no real vault or paired device.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const fixture=await sidebarFixture();let app,page;const errors=[];
try {
 app=await electron.launch({args:['.'],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,CODEX_HOME:fixture.auth,PORT:'0'}});
 page=await app.firstWindow();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 await page.locator('[data-page=scratchpad]').click();await page.getByRole('textbox',{name:'Scratchpad storage folder',exact:true}).fill(fixture.studio.cwd);
 await page.getByRole('button',{name:'Use this folder',exact:true}).click();await page.getByRole('button',{name:'New scratch',exact:true}).click();
 await page.getByRole('textbox',{name:'Scratch title',exact:true}).fill('Synthetic scratch');await page.getByRole('textbox',{name:'Scratch content',exact:true}).fill('# Persistent note\n\nPlain Markdown.');
 await page.locator('.scratchpad-editor .note').filter({hasText:/^Saved$/}).waitFor();
 const owner=args=>app.evaluate(({app},args)=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService().scratchpad.handle(args),args);
 let row=(await owner({action:'list'})).items.find(row=>row.title==='Synthetic scratch');assert.ok(row);assert.equal((await owner({action:'read',id:row.id})).body,'# Persistent note\n\nPlain Markdown.');
 await page.getByRole('combobox',{name:'Scratch project',exact:true}).selectOption(fixture.project.id);
 await page.waitForFunction(()=>document.querySelector('[aria-label="Scratch project"]')?.value!==''&&document.querySelector('.scratchpad-editor .note')?.textContent==='Saved');
 await page.getByRole('button',{name:'Preview',exact:true}).click();await page.locator('.scratchpad-editor .rich-text h1').filter({hasText:'Persistent note'}).waitFor();
 await page.getByRole('button',{name:'Edit',exact:true}).click();await page.locator('[data-page=home]').click();await page.locator('[data-page=scratchpad]').click();
 assert.equal(await page.getByRole('textbox',{name:'Scratch content',exact:true}).inputValue(),'# Persistent note\n\nPlain Markdown.');
 await page.evaluate(async project=>{const {openPreviewProject}=await import('/shared/navigation/desktop-preview.js');openPreviewProject(project);},fixture.project);
 await page.locator('[data-preview-project-page=scratches]').click();await page.locator('.scratchpad-row').filter({hasText:'Synthetic scratch'}).waitFor();
 await page.locator('.scratchpad-row').filter({hasText:'Synthetic scratch'}).click();
 await page.getByRole('textbox',{name:'Scratch content',exact:true}).fill('Edited from the project');await page.locator('.scratchpad-editor .note').filter({hasText:/^Saved$/}).waitFor();
 assert.equal((await owner({action:'read',id:row.id})).body,'Edited from the project');
 await page.getByRole('button',{name:'Close Synthetic scratch',exact:true}).click();assert.equal((await owner({action:'read',id:row.id})).body,'Edited from the project','Closing the editor never deletes the scratch');
 fs.writeFileSync(path.join(fixture.studio.cwd,'Scratchpad','Manual.md'),'# External note\n');
 await page.locator('[data-page=scratchpad]').click();await page.getByRole('navigation',{name:'Scratchpad tabs'}).getByRole('button',{name:'Scratchpad',exact:true}).click();await page.getByRole('button',{name:'Synchronize files',exact:true}).click();await page.locator('.scratchpad-row').filter({hasText:'Manual'}).waitFor();
 assert.match(fs.readFileSync(path.join(fixture.studio.cwd,'Scratchpad','Manual.md'),'utf8'),/scratch_id:/);
 await page.screenshot({path:process.cwd()+'/.runtime-tests/scratchpad-ui.png'});assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,synthetic:true,folderSetup:true,autosave:true,projectAssociation:true,markdownPreview:true,manualSync:true,closePreservesFile:true}));
} catch(error){await page?.screenshot({path:process.cwd()+'/.runtime-tests/scratchpad-failure.png'}).catch(()=>{});throw error;}finally{await app?.close();await fixture.cleanup();}
