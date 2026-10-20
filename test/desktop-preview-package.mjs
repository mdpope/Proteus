// Read-only acceptance of the packaged preview and its previously verified synthetic chat.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const executablePath=process.env.PROTEUS_PREVIEW_EXECUTABLE,root=process.env.PROTEUS_PREVIEW_TEST_ROOT;
if(!executablePath||!path.isAbsolute(executablePath)||!root||!path.isAbsolute(root))throw new Error('Provide the exact preview executable and private preview root.');
let app,page;const diagnostics={errors:[],consoleErrors:[],stage:'launch',snapshots:[]};
// Observe only: failure diagnostics must never change focus, scroll, selection or settings.
async function capture(label){
 const snapshot={label,at:new Date().toISOString()};
 snapshot.windows=await app?.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().map(window=>({visible:window.isVisible(),focused:window.isFocused(),minimized:window.isMinimized(),bounds:window.getBounds()}))).catch(error=>({error:String(error)}));
 snapshot.renderer=await page?.evaluate(title=>{const row=[...document.querySelectorAll('.chat-index-row')].find(node=>node.title===title),rect=row?.getBoundingClientRect();return{visibility:document.visibilityState,focused:document.hasFocus(),viewport:{width:innerWidth,height:innerHeight},heading:document.querySelector('#main h1')?.textContent,selectedTabs:[...document.querySelectorAll('[data-tab].active,[data-chat-subtab].selected')].map(node=>node.dataset.tab||node.dataset.chatSubtab),mainScroll:document.querySelector('#main')?.scrollTop,row:rect?{x:rect.x,y:rect.y,width:rect.width,height:rect.height}:null};},diagnostics.chatTitle).catch(error=>({error:String(error)}));
 diagnostics.snapshots.push(snapshot);
}
async function revealSidebar(){if(await page.locator('body').evaluate(node=>node.classList.contains('sidebar-minimized')))await page.locator('#sidebar').hover();}
async function groupColors(){
 return page.evaluate(()=>{
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
  const rgb=node=>{while(node&&['rgba(0, 0, 0, 0)','transparent'].includes(getComputedStyle(node).backgroundColor))node=node.parentElement;if(!node)return null;ctx.clearRect(0,0,1,1);ctx.fillStyle=getComputedStyle(node).backgroundColor;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data];};
  const probe=document.createElement('span');probe.style.color='var(--preview-sidebar-selected-ink)';document.body.append(probe);const selectedInk=getComputedStyle(probe).color;probe.remove();
  const token=name=>{const node=document.createElement('div');node.style.backgroundColor=`var(${name})`;document.body.append(node);const value=rgb(node);node.remove();return value;};
  const inset=(child,parent,label)=>{const a=child.getBoundingClientRect(),b=parent.getBoundingClientRect();return{label,left:a.left-b.left,right:b.right-a.right};};
  const insets=[...document.querySelectorAll('.preview-project-branches')].flatMap(list=>[inset(list,list.closest('[data-preview-workspace-group]'),'project list'),...[...list.querySelectorAll('.preview-project-group')].flatMap(panel=>[inset(panel,list.closest('[data-preview-workspace-group]'),'project panel'),...[...panel.querySelectorAll('.preview-recent-chats,.preview-tree-item')].map(child=>inset(child,panel,'project child'))])]).concat([...document.querySelectorAll('.preview-feature-group>.navchildren')].flatMap(list=>[inset(list,list.parentElement,'feature children'),...[...list.querySelectorAll('.preview-tree-item')].map(child=>inset(child,list,'feature row'))]));
  const workspaces=document.querySelector('[data-page=context].active'),leaf=document.querySelector('[data-preview-workspace-group] .preview-tree-item.active');
  return{selectedInk,insets,projectActive:token('--preview-sidebar-project'),workspaceActive:token('--preview-sidebar-group'),workspaces:workspaces&&rgb(workspaces),groups:[...document.querySelectorAll('[data-preview-workspace-group]')].map(node=>({active:node.classList.contains('active'),fill:rgb(node),header:rgb(node.querySelector('.preview-workspace-header'))})),projects:[...document.querySelectorAll('.preview-project-group')].map(node=>({fill:rgb(node),workspace:rgb(node.closest('[data-preview-workspace-group]')),header:rgb(node.querySelector('.preview-project-branch')),active:node.classList.contains('active'),expanded:node.classList.contains('expanded'),children:!!node.querySelector('.preview-recent-chats')})),counts:[...document.querySelectorAll('#sidebar .preview-tree-count')].map(node=>({border:getComputedStyle(node).borderTopWidth,background:getComputedStyle(node).backgroundColor})),leaf:leaf&&rgb(leaf),leafTitle:leaf&&getComputedStyle(leaf.querySelector('.preview-tree-title')).color};
 });
}

try{
 app=await electron.launch({executablePath,args:[],env:{...process.env,PROTEUS_PREVIEW_HOME:root},timeout:90000});
 const identity=await app.evaluate(({app})=>({name:app.getName(),userData:app.getPath('userData'),sessionData:app.getPath('sessionData'),appPath:app.getAppPath(),packaged:app.isPackaged}));
 assert.equal(identity.name,'Proteus Design Preview');assert.equal(identity.packaged,true);assert.equal(identity.userData,path.join(root,'electron'));assert.equal(identity.sessionData,identity.userData);
 const meta=JSON.parse(fs.readFileSync(path.join(identity.appPath,'package.json'),'utf8'));assert.equal(meta.desktopPreview,true);
 page=await app.firstWindow();page.on('pageerror',error=>diagnostics.errors.push(error.message));page.on('console',message=>{if(message.type()==='error')diagnostics.consoleErrors.push(message.text());});page.setDefaultTimeout(30000);await page.locator('[data-preview-workspace]').first().waitFor();
 const state=await page.evaluate(async()=>{const r=await fetch('/api/state');if(!r.ok)throw new Error('Preview state unavailable');return r.json();});
 const resizer=page.locator('#preview-sidebar-resizer');assert.equal(await resizer.getAttribute('role'),'separator');assert.equal(await resizer.getAttribute('aria-orientation'),'vertical');
 const storedWidth=state.settings.appearance?.sidebarWidth??230;const effectiveWidth=await resizer.getAttribute('aria-valuenow');assert.equal(Number(effectiveWidth),Math.min(storedWidth,Math.min(520,Math.max(80,await page.evaluate(()=>innerWidth)-56),Math.max(220,await page.evaluate(()=>innerWidth)-320))));
 assert.equal(state.desktopPreview.enabled,true);assert.equal(state.schedules.length,0);assert.equal(state.providerStatuses.codex.available,true);
 assert.equal(await page.locator('[data-preview-workspace-group]').count(),state.desktopPreview.workspaces.length);
 assert.equal(await page.locator('[data-preview-workspace-expand]').count(),state.desktopPreview.workspaces.length);
 const workspaceGroups=await page.locator('[data-preview-workspace-group]').evaluateAll(nodes=>nodes.map(node=>({id:node.dataset.previewWorkspaceGroup,count:Number(node.querySelector('[data-preview-workspace-count]').textContent),computer:node.querySelector('.preview-workspace-link>.preview-tree-computer')?.textContent,computerTitle:node.querySelector('.preview-workspace-link>.preview-tree-computer')?.title,border:getComputedStyle(node).borderTopWidth})));
 for(const group of workspaceGroups){assert.equal(group.count,state.desktopPreview.projects.filter(project=>project.workspaceId===group.id).length);assert.ok(group.computer?.trim());assert.ok(group.computerTitle?.trim());assert.equal(group.border,'1px');}
 assert.equal(await page.locator('[data-preview-feature-expand]').count(),0,'Top-level features have no added expander control.');
 assert.equal(await page.locator('#sidebar nav.preview-sidebar-scroll [data-page=context]').count(),1);
 assert.equal(await page.locator('.preview-sidebar-footer').count(),0);
 assert.equal(await page.locator('#sidebar nav.preview-sidebar-scroll [data-page=engine]').count(),1);
 assert.equal(await page.locator('[data-preview-collapse-all]').count(),1);
 const footer=await page.evaluate(()=>({navBottom:document.querySelector('nav.preview-sidebar-scroll').getBoundingClientRect().bottom,allowanceTop:document.querySelector('.sidebottom').getBoundingClientRect().top}));assert.ok(footer.allowanceTop>=footer.navBottom-1);
 const run=state.runs.find(r=>r.title.startsWith('Synthetic live verification'));assert.ok(run);assert.equal(run.status,'completed');assert.ok(run.events.some(e=>{const decision=e.permission||e.data?.permission;return decision?.automatic===false&&decision.decision==='approve';}));
 const studio=state.context.workspaces.find(workspace=>workspace.name==='Studio');assert.ok(studio);
 const project=state.desktopPreview.projects.find(project=>project.workspaceId===studio.id&&project.name==='Design review');assert.ok(project);
 const studioButton=page.locator(`[data-preview-workspace=${JSON.stringify(studio.id)}]`);
 diagnostics.stage='open workspace';await revealSidebar();await studioButton.click();await page.locator('[data-preview-new-project]').waitFor();
 diagnostics.stage='open project';await page.locator(`[data-preview-open-project=${JSON.stringify(project.id)}]`).click();await page.getByRole('heading',{name:project.name,exact:true}).waitFor();
 // A single normal click keeps Playwright's visibility, stability and hit-target checks.
 // The prior failure involved concurrent window resizing/navigation; artificial sampling
 // delays or forced clicks would hide that interference rather than verify navigation.
 diagnostics.stage='open retained chat';diagnostics.chatTitle=run.title;await capture('before chat click');
 const chatRow=page.locator(`.chat-index-row[title=${JSON.stringify(run.title)}]`);await chatRow.waitFor();assert.equal(await chatRow.count(),1);await chatRow.click();
 await page.locator('#followup').waitFor();await page.getByRole('heading',{name:run.title,exact:true}).waitFor();
 await page.waitForFunction(async runId=>{const placement=await window.desktop.workspaceSession({action:'get'});return placement.tabs.find(tab=>tab.id===placement.active)?.runId===runId;},run.id,{timeout:10000});
 // Expansion is navigation state only; no preference, grant, resource or fixture changes.
 await revealSidebar();
 for(const selector of [`[data-preview-workspace-expand=${JSON.stringify(studio.id)}]`,`[data-preview-expand=${JSON.stringify(project.id)}]`]){const expander=page.locator(selector);if(await expander.getAttribute('aria-expanded')!=='true')await expander.click();}
 const activeLeaf=page.locator(`[data-preview-chat=${JSON.stringify(run.id)}].active`);await activeLeaf.waitFor();
 await page.mouse.move(700,120);const colors=await groupColors();diagnostics.colors=colors;
 assert.ok(colors.workspaces,'Workspaces is active for the project chat.');assert.equal(colors.groups.filter(group=>group.active).length,1);
 for(const group of colors.groups){assert.deepEqual(group.header,group.fill,'Workspace header shares its group surface.');if(group.active)assert.deepEqual(group.fill,colors.workspaceActive,'Active workspace uses the reference surface.');else assert.notDeepEqual(group.fill,colors.workspaces,'Inactive workspace groups have a distinct surface.');}
 assert.ok(colors.projects.length&&colors.projects.some(project=>project.active&&project.expanded));
 for(const project of colors.projects){assert.deepEqual(project.header,project.fill,'Each project header shares its full panel surface.');assert.deepEqual(project.fill,project.active&&project.expanded?colors.projectActive:project.workspace,'Only the active expanded project has the lighter panel.');assert.equal(project.expanded,project.children);}
 assert.ok(colors.insets.length);for(const pair of colors.insets)assert.ok(pair.left>=0&&pair.right>=0&&Math.abs(pair.left-pair.right)<=1,'Equal horizontal sidebar insets: '+JSON.stringify(pair));
 assert.ok(colors.counts.every(count=>count.border==='0px'&&count.background==='rgba(0, 0, 0, 0)'),'Counts render without badge outlines or fills.');
 assert.ok(colors.leaf&&colors.leaf[3]===255,'Selected leaf has an opaque fill.');const brightness=rgb=>rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
 assert.ok(brightness(colors.leaf)>brightness(colors.projects.find(project=>project.active).fill),'Selected leaf fill is lighter than its project panel.');assert.ok(colors.leaf[1]>colors.leaf[0]&&colors.leaf[1]>colors.leaf[2],'Selected leaf fill is green.');assert.equal(colors.leafTitle,colors.selectedInk,'Selected sidebar leaf text uses pale green; tab titles remain white.');
 if(await page.locator('body').evaluate(node=>node.classList.contains('preview-sidebar-overlay-open')))await page.keyboard.press('Escape');
 diagnostics.stage='permissions';
 const matchedSurfaces=await page.evaluate(()=>{
  const surface=node=>{while(node){const fill=getComputedStyle(node).backgroundColor;if(!['transparent','rgba(0, 0, 0, 0)'].includes(fill))return fill;node=node.parentElement;}return null;};
  const user=document.querySelector('#main .message.user'),assistant=document.querySelector('#main .message.assistant');
  return{main:surface(document.querySelector('#main')),sidebar:surface(document.querySelector('#sidebar')),chatCard:surface(user?.closest('.card')),workspace:surface(document.querySelector('.preview-workspace-tree.active')),button:surface(document.querySelector('[data-page=context].active')),assistant:surface(assistant),project:surface(document.querySelector('.preview-project-group.active.expanded')),user:surface(user),selected:surface(document.querySelector('.preview-workspace-tree .preview-tree-item.active'))};
 });
 assert.ok(Object.values(matchedSurfaces).every(Boolean),'All chat/sidebar comparison surfaces exist.');
 for(const [name,color] of Object.entries({sidebar:'rgb(18, 21, 18)',workspace:'rgb(24, 29, 25)',button:'rgb(29, 35, 30)',project:'rgb(29, 35, 30)',selected:'rgb(49, 57, 44)'}))assert.equal(matchedSurfaces[name],color,`${name} matches the supplied reference`);
 const selectionEdge=await activeLeaf.evaluate(node=>{const css=getComputedStyle(node);return{width:css.borderLeftWidth,color:css.borderLeftColor,radius:css.borderTopLeftRadius};});assert.deepEqual(selectionEdge,{width:'2px',color:'rgb(190, 220, 147)',radius:'8px'});
 for(const icon of ['#tabs .selected>[data-tab]>.preview-tab-icon','#chat-subtabs .selected>[data-chat-subtab]>.preview-tab-icon'])assert.equal(await page.locator(icon).evaluate(node=>getComputedStyle(node).color),'rgb(190, 220, 147)');
 diagnostics.matchedSurfaces=matchedSurfaces;
 assert.ok(!(await page.locator('.run-status').allTextContents()).some(t=>/Running/.test(t)));
 assert.equal(await page.locator('#preview-composer-permissions').count(),0);assert.equal(await page.locator('#dialog').evaluate(el=>el.open),false);
 assert.equal(await page.locator('[data-preview-permissions]').isVisible(),true);
 assert.match(await page.locator('[data-preview-permissions]').innerText(),/Studio defaults/);
 assert.equal(await page.locator('[data-preview-permissions] details').count(),0);assert.equal(await page.locator('[data-preview-permission-dialog]').count(),0);
 const evidence=path.join(root,'live-verification');await page.screenshot({path:path.join(evidence,'packaged-permissions.png')});
 diagnostics.stage='workspace tabs';await revealSidebar();await studioButton.click();await page.locator('[data-preview-new-project]').waitFor();
 assert.deepEqual(await page.locator('[data-preview-page]').evaluateAll(nodes=>nodes.map(node=>{const copy=node.cloneNode(true);copy.querySelector('[data-preview-tab-icon]')?.remove();return copy.textContent.trim();})),['Projects','Chats','Tabs','Configuration']);
 const placement=await page.evaluate(()=>window.desktop.workspaceSession({action:'get'}));
 // Inspect any already-expanded project without opening, creating or reordering retained resources.
 const projectGroups=await page.locator('[data-preview-project-count]').evaluateAll(nodes=>nodes.map(node=>({id:node.dataset.previewProjectCount,count:Number(node.textContent),description:node.getAttribute('aria-label'),children:node.parentElement.parentElement.querySelectorAll('.preview-tree-item').length,computers:node.parentElement.parentElement.querySelectorAll('.preview-tree-item .preview-tree-computer').length})));
 for(const group of projectGroups){assert.match(group.description,/\d+ chats and \d+ resource tabs/);const parts=group.description.match(/\d+/g).map(Number);assert.equal(group.count,parts[0]+parts[1]);assert.ok(group.count>=group.children);assert.equal(group.computers,0);}
 const childMarkup=await page.locator('#sidebar .preview-tree-item').evaluateAll(nodes=>nodes.map(node=>({title:!!node.querySelector('.preview-tree-title'),icon:!!node.querySelector('.preview-tree-icon'),age:!!node.querySelector('.preview-tree-age'),clamp:getComputedStyle(node.querySelector('.preview-tree-title')).webkitLineClamp})));
 assert.ok(childMarkup.every(row=>row.title&&row.icon&&row.age&&row.clamp==='2'));
 const chatIds=placement.tabs.filter(tab=>['run','remote-run'].includes(tab.type)).map(tab=>tab.id);
 const visibleChildren=await page.locator('#chat-subtabs [data-chat-subtab]').evaluateAll(buttons=>buttons.map(button=>button.dataset.chatSubtab));
 assert.ok(!visibleChildren.some(id=>chatIds.includes(id)),'No project chat alias should appear directly under the workspace. Existing browser/resource tabs are retained.');
 assert.ok((await page.locator('[data-preview-page]').evaluateAll(buttons=>buttons.map(button=>getComputedStyle(button).borderRightWidth))).every(width=>width==='1px'));
 const fixedFeatures=await page.locator('[data-preview-page]').evaluateAll(buttons=>buttons.map(button=>{
  const icon=button.querySelector('[data-preview-tab-icon]'),title=button.querySelector('span:last-child');
  return {page:button.dataset.previewPage,icon:icon?.dataset.previewTabIcon,iconCount:button.querySelectorAll('[data-preview-tab-icon]').length,paths:[...icon.querySelectorAll('svg path')].map(node=>node.getAttribute('d')),glyph:icon.textContent.trim(),selected:button.classList.contains('selected'),titleColor:getComputedStyle(title).color,iconColor:getComputedStyle(icon).color};
 }));
 assert.deepEqual(fixedFeatures.map(item=>[item.page,item.icon,item.iconCount]),['projects','chats','tabs','configuration'].map(key=>[key,key,1]),'Each fixed feature has its own icon.');
 assert.equal(fixedFeatures[0].paths.length,1);assert.match(fixedFeatures[0].paths[0],/^M3 7V5/,'Projects uses the folder icon.');
 assert.equal(fixedFeatures[1].paths.length,2);assert.match(fixedFeatures[1].paths[0],/^M3 4h10/);assert.match(fixedFeatures[1].paths[1],/^M17 8h3/,'Chats uses the paired bubbles.');
 assert.equal(fixedFeatures[2].glyph,'▦','Tabs uses the tab overview icon.');assert.equal(fixedFeatures[3].glyph,'⚙','Configuration uses the Engine Room gear.');
 assert.deepEqual(fixedFeatures.filter(item=>item.selected).map(item=>item.page),['projects']);
 assert.equal(fixedFeatures[0].iconColor,'rgb(190, 220, 147)');
 assert.equal(fixedFeatures[0].titleColor,'rgb(255, 255, 255)','The selected fixed title is white.');
 assert.ok(fixedFeatures.filter(item=>!item.selected).every(item=>item.titleColor==='rgb(185, 197, 189)'),'Inactive fixed titles use the brighter muted color.');
 await page.screenshot({path:path.join(evidence,'packaged-projects.png')});
 const receipt={passed:true,packaged:true,buildRevision:meta.buildRevision,workspaces:state.desktopPreview.workspaces.length,projects:state.desktopPreview.projects.length,codexAvailable:true,retainedLiveChat:true,retainedApproval:true,permissionsSidebar:true,workspaceNavigation:true,groupedSidebar:true,workspaceComputerLabels:true,groupCounts:true,scrollingEngineMenu:true,fixedFeatureIcons:true,fixedTabTitleContrast:true,referenceNavigationPalette:true,continuousProjectPanels:true,activeExpandedProjectContrast:true,equalSidebarInsets:true,bareSidebarCounts:true,selectedLeafLighterGreen:true,privateIdentityVerified:true};
 fs.writeFileSync(path.join(evidence,'packaged.json'),JSON.stringify(receipt,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(receipt));
}catch(error){diagnostics.failure=String(error);await capture('failure');fs.writeFileSync('/private/tmp/proteus-preview-packaged-diagnostics.json',JSON.stringify(diagnostics,null,2),{mode:0o600});await page?.screenshot({path:'/private/tmp/proteus-preview-packaged-failure.png',timeout:5000}).catch(()=>{});throw error;}finally{await app?.close();}
