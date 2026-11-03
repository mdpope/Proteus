// Two actual Electron windows, isolated owner/data and synthetic provider only.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const fixture=await sidebarFixture(),errors=[];let app;
const until=async(fn,label)=>{for(let n=0;n<300;n++){const value=await fn();if(value)return value;await new Promise(resolve=>setTimeout(resolve,100));}throw Error('Timed out: '+label);};
const native=(fn,value)=>app.evaluate(({app},{code,value})=>new Function('main','value','return ('+code+')(main,value)')(process.mainModule.require(app.getAppPath()+'/desktop/main.cjs'),value),{code:fn.toString(),value});
const session=page=>page.evaluate(()=>window.desktop.workspaceSession({action:'get'}));
async function project(page){page.on('pageerror',error=>errors.push(error.message));await page.locator('#topbar-home').waitFor();const expand=page.locator('[data-preview-workspace-expand="'+fixture.studio.id+'"]');if(await expand.getAttribute('aria-expanded')!=='true')await expand.click();await page.locator('[data-preview-project="'+fixture.project.id+'"]').first().click();}
async function choose(page,id){const tab=await until(async()=>(await session(page)).tabs.find(tab=>tab.parentId===fixture.parentId&&[tab.contentTabId,tab.runId,tab.id].includes(id)),'shared tab hydration');await page.locator('[data-chat-subtab="'+tab.id+'"]').click();return tab;}
try{
 app=await electron.launch({...(process.env.PROTEUS_PREVIEW_EXECUTABLE?{executablePath:process.env.PROTEUS_PREVIEW_EXECUTABLE,args:['--use-mock-keychain']}:{args:['.','--use-mock-keychain']}),env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,CODEX_HOME:fixture.auth,PORT:'0'}});
 assert.equal(await until(()=>native(main=>main.getService()?.home),'isolated owner'),fixture.locations.home);
 await native(main=>{const service=main.getService(),status={available:true,models:[{id:'synthetic-draft-model',name:'Synthetic draft model',controls:{}}]};service.catalogs.codex.load=async()=>status;service.catalogs.codex.value=status;service.catalogs.codex.lastAttempt=Date.now();service.engine.providers.codex.run=async({emit})=>emit('assistant','Synthetic draft provider only.');service.notify();});
 const first=await app.firstWindow();await project(first);const opening=app.waitForEvent('window');await native(main=>main.createWindow());const second=await opening;await project(second);
 const id=randomUUID();await native((main,{id,projectId})=>{const tabs=main.getService().contentTabs,snapshot=tabs.get('project',projectId);tabs.mutate({scope:'project',id:projectId,expectedRevision:snapshot.revision,operations:[{action:'open',tab:{id,type:'browser',title:'New chat',url:'',setup:{kind:'chat'}}}]});},{id,projectId:fixture.project.id});
 await choose(first,id);await choose(second,id);
 const input=page=>page.locator('#main .new-chat-tab-panel textarea[id$="-prompt"]');await input(first).waitFor();await input(second).waitFor();
 await input(first).fill('Draft started on the phone, finished on desktop.');await until(async()=>(await input(second).inputValue())==='Draft started on the phone, finished on desktop.','setup text crosses windows');
 for(const page of [first,second]){assert.equal(await page.locator('.new-chat-tab-panel > .shared-draft-status').count(),1);assert.equal(await page.locator('.new-chat-composer .shared-draft-status').count(),0);}
 const inventory=await native((main,id)=>main.getService().contentTabs.get('project',id),fixture.project.id);assert.doesNotMatch(JSON.stringify(inventory),/Draft started on the phone/);
 await input(first).fill('First concurrent edit');await input(second).fill('Second concurrent edit');
 const conflictPage=await until(async()=>{for(const page of [first,second])if(await page.getByRole('button',{name:'Use other draft',exact:true}).count())return page;},'conflicting edit is retained');
 const retained=await input(conflictPage).inputValue();await conflictPage.getByRole('button',{name:'Use other draft',exact:true}).click();await until(async()=>(await input(first).inputValue())===(await input(second).inputValue()),'explicit conflict choice converges');assert.ok(await conflictPage.locator('.shared-draft-status').textContent().then(text=>text.includes(retained)));
 for(const page of [first,second])await choose(page,fixture.user[0].id);
 await first.locator('#followup').fill('Unsent reply continued on another device');await until(async()=>(await second.locator('#followup').inputValue())==='Unsent reply continued on another device','existing chat reply crosses windows');
 for(const page of [first,second]){assert.equal(await page.locator('#main > .heading .shared-draft-status').count(),1);assert.equal(await page.locator('.composer .shared-draft-status').count(),0);}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,actualWindows:2,emptySetupMembership:true,setupText:true,replyText:true,conflictsRetained:true,draftTextAbsentFromInventory:true,noProviderExecution:true}));
}catch(error){console.error(JSON.stringify({errors}));throw error;}
finally{await app?.close().catch(()=>{});await fixture.cleanup();}
