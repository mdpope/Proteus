// Disposable source discovery and selection UI. No MCP process or provider turn is started.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const f=await sidebarFixture();let app;
fs.writeFileSync(path.join(f.locations.sourceRoot,'.mcp.json'),JSON.stringify({mcpServers:{syntheticIconConnection:{command:'never-start-this-synthetic-connection'}}}));
try{
 app=await electron.launch({...(process.env.PROTEUS_PREVIEW_EXECUTABLE?{executablePath:process.env.PROTEUS_PREVIEW_EXECUTABLE,args:[]}:{args:['.']}),env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:f.locations.root,CODEX_HOME:f.auth,PORT:'0'}});
 const page=await app.firstWindow();page.setDefaultTimeout(20000);await page.locator('body.window-design-preview').waitFor();
 await app.evaluate(({app},workspaceId)=>{const context=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService().context,catalog=context.get(workspaceId),mcp=catalog.entries.find(entry=>entry.kind==='mcp');if(!mcp)throw Error('Synthetic MCP was not discovered');context.favorite(mcp.id,true,catalog.revision,workspaceId);},f.studio.id);
 const expand=page.locator(`[data-preview-workspace-expand="${f.studio.id}"]`);if(await expand.getAttribute('aria-expanded')!=='true')await expand.click();await page.locator(`[data-preview-project="${f.project.id}"]`).first().click();await page.locator('[data-preview-new-chat]').click();await page.locator('#main [data-chat-setup] .context-picker>summary').click();await page.locator('#main [data-chat-setup] [data-chat-setup-prompt]').fill('Synthetic unsent icon review');
 const root=page.locator('#main [data-chat-setup] .context-picker');
 for(const kind of ['instruction','skill','agent','mcp'])assert.ok(await root.locator(`[data-source-kind-icon="${kind}"]`).count()>0,kind+' has a leading icon');
 const rows=await root.locator('[data-context-option]').evaluateAll(nodes=>nodes.map(node=>{const icon=node.querySelector('[data-source-kind-icon]'),text=node.querySelector('.context-option-copy'),box=icon.getBoundingClientRect();return {kind:icon.dataset.sourceKindIcon,width:box.width,beforeText:box.right<=text.getBoundingClientRect().left,decorative:icon.getAttribute('aria-hidden'),label:node.querySelector('.pill').textContent};}));
 assert.ok(rows.every(row=>row.width===28&&row.beforeText&&row.decorative==='true'&&row.kind===row.label));
 const mcp=root.locator('[data-context-option]').filter({has:page.locator('[data-source-kind-icon="mcp"]')});assert.equal(await mcp.locator('input').isDisabled(),true,'MCP stays disabled despite favorite icon');
 const skill=root.locator('[data-context-option]').filter({has:page.locator('[data-source-kind-icon="skill"]')}).first();await skill.locator('[data-favorite]').click();assert.ok(await root.locator('.favorite-options [data-source-kind-icon="skill"]').count()>0);assert.equal(await page.locator('#main [data-chat-setup] [data-chat-setup-prompt]').inputValue(),'Synthetic unsent icon review');
 const handle=await app.browserWindow(page);await handle.evaluate(win=>win.setSize(850,1000));
 assert.equal(await root.locator('[data-context-option]').evaluateAll(nodes=>nodes.every(node=>node.scrollWidth<=node.clientWidth+1)),true,'Source rows wrap within a narrow dialog');await root.screenshot({path:'/private/tmp/proteus-source-icons.png'});
 await page.locator('#main [data-chat-setup] [id$="-cancel"]').click();await page.locator(`[data-preview-workspace="${f.studio.id}"]`).click();await page.locator('[data-preview-page="configuration"]').click();await page.locator('[data-source-search]').waitFor();
 for(const kind of ['instruction','skill','agent','mcp'])assert.ok(await page.locator(`[data-config-section="sources"] [data-source-kind-icon="${kind}"]`).count()>0,kind+' icon in workspace table');
 const shared = await app.evaluate(({app},ids)=>{const context=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService().context;return ids.map(id=>context.get(id).favorites);},[f.studio.id,f.personal.id]);
 assert.ok(shared[0].length>=2);assert.deepEqual(shared[0],shared[1],'Favorites shared by owner across workspaces');
 await page.locator(`[data-preview-workspace="${f.personal.id}"]`).click();await page.locator('[data-preview-page="configuration"]').click();await page.locator('[data-source-search]').waitFor();
 for(const id of shared[0])assert.equal(await page.locator(`[data-source-favorite="${id}"]`).first().textContent(),'★','Other workspace renders the shared favorite');
 console.log('PASS distinct leading source icons in chat Favorites/Other and workspace tables, retained labels, disabled MCP, unsent draft and narrow row wrapping');
}finally{await app?.close();await f.cleanup();}
