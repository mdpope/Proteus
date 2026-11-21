// Real Electron renderer, disposable records; API semantics are qualified in PHP tests.
import {_electron as electron} from 'playwright';
import {closeTestElectron} from './electron-cleanup.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {publicAssets} from '../src/shared/public-assets.js';
const root=path.resolve(import.meta.dirname,'..'),home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-reminders-ui-'));
const html=`<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/life.css"><main id="main"></main><script type="module">
import {mountReminders} from '/features/tools/life-reminders.js';
window.rows=[];window.calls=[];window.current=true;window.fail=true;let importFail=true;const results=new Map();
window.view=mountReminders(document.querySelector('main'),{
 isCurrent:()=>current,
 read:async query=>({record:query.id?rows.find(row=>row.id===query.id):undefined,inboxId:'inbox',timeZone:'America/Denver',lists:[{id:'inbox',name:'Inbox'}],items:rows.filter(x=>!!x.deletedAt===!!query.deleted).filter(x=>query.completed==='all'||(query.completed==='completed'?x.completedAt:!x.completedAt)),page:1,total:rows.filter(x=>!!x.deletedAt===!!query.deleted&&(query.completed==='all'||(query.completed==='completed'?x.completedAt:!x.completedAt))).length}),
 write:async(action,input,id)=>{
   calls.push({action,input,id});
   if(action==='import.preview')return {digest:'fixture',createdLists:1,createdItems:1,lists:[{source:'Work',destination:'Work',open:0,completed:1,skipped:0,withExtras:0,timed:0}]};
   if(action==='import.apply'){if(importFail){importFail=false;throw Error('Synthetic lost import response.');}return {createdLists:1,createdItems:1};}
   if(!results.has(id)){let row;if(action==='create'){row={...input,id:crypto.randomUUID(),revision:1,completedAt:null,deletedAt:null};rows.push(row);}else{row=rows.find(x=>x.id===input.id);Object.assign(row,input,{revision:row.revision+1});if(action==='complete')row.completedAt=new Date().toISOString();}results.set(id,{record:row});}if(fail){fail=false;throw Error('Synthetic lost response.');}return results.get(id);
 }
});
</script>`;
const assets=publicAssets(path.join(root,'public'));
const server=http.createServer((req,res)=>{
 if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}
 const asset=assets[req.url];
 if(!asset){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',asset[1]);res.end(fs.readFileSync(path.join(root,'public',asset[0])));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url='http://127.0.0.1:'+server.address().port;
fs.writeFileSync(path.join(home,'main.cjs'),`const {app,BrowserWindow}=require('electron');app.whenReady().then(()=>{const win=new BrowserWindow({width:1200,height:1000});win.loadURL(${JSON.stringify(url)});});app.on('window-all-closed',()=>app.quit());`);
let app;
try{
 app=await electron.launch({args:[path.join(home,'main.cjs'),'--user-data-dir='+path.join(home,'data')],cwd:root});
 const page=await app.firstWindow(),errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(10000);page.on('dialog',dialog=>dialog.accept().catch(()=>{}));
 await page.getByRole('button',{name:'Import reminders',exact:true}).click();
 const importer=page.locator('dialog.reminder-import'),file=importer.locator('[data-file]');
 const account=(sourceName,lists)=>({format:'proteus-reminders-1',sourceId:sourceName,sourceName,lists});
 const exportData={accounts:[account('Personal',[{id:'home',name:'Home',items:[]}]),account('Work account',[{id:'work',name:'Work',items:[{id:'done'}]},{id:'other',name:'Other',items:[]}])]};
 await file.setInputFiles({name:'synthetic-reminders.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exportData))});
 await importer.getByLabel('Source account').selectOption({label:'Work account'});
 await importer.getByRole('checkbox',{name:'Other (0)'}).uncheck();
 assert.deepEqual(await page.evaluate(()=>calls),[]);
 await importer.getByRole('button',{name:'Preview import'}).click();
 await importer.getByText(/1 completed/).waitFor();
 await importer.getByRole('button',{name:'Import reminders',exact:true}).click();
 await importer.getByRole('button',{name:'Retry same import'}).click();
 await importer.getByText('Imported 1 reminder. Created 1 list.').waitFor();
 const importCalls=await page.evaluate(()=>calls.splice(0,calls.length));
 assert.deepEqual(JSON.parse(importCalls[0].input.source).lists.map(list=>list.id),['work']);
 assert.deepEqual(importCalls[1],importCalls[2]);
 await importer.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('button',{name:'All Items',exact:true}).click();await page.getByRole('button',{name:'New reminder',exact:true}).click();
 await page.getByLabel('Title',{exact:true}).fill('Water plants');await page.locator('[name=dueKind]').selectOption('date');await page.getByLabel('Date',{exact:true}).fill('2026-11-14');
 await page.getByRole('button',{name:'Save',exact:true}).click();await page.getByRole('button',{name:'Retry save',exact:true}).click();
 await page.locator('.reminder-main').getByRole('button',{name:'Water plants',exact:true}).waitFor();
 let state=await page.evaluate(()=>({rows,calls}));assert.equal(state.rows.length,1);assert.equal(state.calls[0].id,state.calls[1].id);assert.equal(state.rows[0].dueAt,null);assert.equal(state.rows[0].dueDate,'2026-11-14');
 const writesBeforeCard=await page.evaluate(()=>calls.length);await page.locator('.reminder-card').first().click({position:{x:250,y:65}});assert.equal(await page.evaluate(()=>calls.length),writesBeforeCard,'Whole-card selection does not complete it');
 await page.locator('[name=dueKind]').selectOption('datetime');await page.getByRole('button',{name:'Choose date and time',exact:true}).click();await page.getByRole('button',{name:'2026-11-14',exact:true}).click();await page.getByLabel('Hour',{exact:true}).fill('9');await page.getByLabel('Minute',{exact:true}).fill('0');await page.getByRole('button',{name:'PM',exact:true}).click();assert.match(await page.getByLabel('Date and time',{exact:true}).inputValue(),/T21:00$/);await page.getByLabel('Hour',{exact:true}).fill('12');assert.match(await page.getByLabel('Date and time',{exact:true}).inputValue(),/T12:00$/);await page.getByRole('button',{name:'AM',exact:true}).click();assert.match(await page.getByLabel('Date and time',{exact:true}).inputValue(),/T00:00$/);await page.getByLabel('Hour',{exact:true}).fill('9');for(const preset of ['emerald-canopy','daylight','custom']){await page.evaluate(async name=>{const {applyPalette,palettePresets}=await import('/shared/ui/palette.js');const colors=name==='custom'?{...palettePresets.daylight.colors,panel:'#eee1f4',accent:'#7d268a',input:'#fbf5ff'}:palettePresets[name].colors;applyPalette({version:1,name,colors,brightness:0,saturation:0});},preset);const colors=await page.locator('.proteus-date-picker').evaluate(node=>{const probe=document.createElement('span');probe.style.background='var(--proteus-panel)';node.append(probe);const expected=getComputedStyle(probe).backgroundColor;probe.remove();return {actual:getComputedStyle(node).backgroundColor,expected};});assert.equal(colors.actual,colors.expected,preset+' picker follows palette');await page.screenshot({path:root+'/.runtime-tests/reminder-calendar-'+preset+'.png'});}
 await page.evaluate(async()=>{const {applyPalette,presetPalette}=await import('/shared/ui/palette.js');applyPalette(presetPalette('emerald-canopy'));});await page.getByRole('button',{name:'Done',exact:true}).click();assert.equal(await page.getByLabel('Date and time',{exact:true}).inputValue(),'2026-11-14T09:00');
 await page.getByRole('button',{name:'Save',exact:true}).click();await page.locator('.reminder-detail').getByRole('button',{name:'Complete',exact:true}).waitFor();
 state=await page.evaluate(()=>({rows,calls}));assert.equal(state.rows[0].dueAt,'2026-11-14T16:00:00+00:00');assert.equal(state.calls.at(-1).input.expectedRevision,1);
 await page.locator('.reminder-detail').getByRole('button',{name:'Complete',exact:true}).click();await page.locator('.reminder-detail').getByRole('button',{name:'Reopen',exact:true}).waitFor();await page.locator('[data-status=completed]').click();await page.locator('[data-status=open]').click();await page.locator('.reminder-detail').getByRole('button',{name:'Reopen',exact:true}).waitFor();
 await page.locator('[data-status=open]').click();assert.equal(await page.locator('[data-status=open]').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('[data-status=completed]').getAttribute('aria-pressed'),'true');
 await page.evaluate(()=>rows.push({...rows[0],id:crypto.randomUUID(),title:'Deleted test reminder',deletedAt:new Date().toISOString()}));await page.locator('[data-status=deleted]').click();assert.equal(await page.locator('[data-status=deleted]').getAttribute('aria-pressed'),'true');
 await page.locator('.reminder-main').getByRole('button',{name:'Deleted test reminder',exact:true}).waitFor();
 const footerGap=await page.getByRole('button',{name:'Choose date and time',exact:true}).evaluate(node=>node.tagName);assert.equal(footerGap,'BUTTON');
 const geometry=()=>page.locator('.reminders-layout').evaluate(node=>{const [lists,items,detail]=['.reminder-lists','.reminder-main','.reminder-detail'].map(selector=>node.querySelector(selector).getBoundingClientRect().width);return {lists,items,detail};});const wide=await geometry();await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(1450,1000));await page.waitForTimeout(100);const wider=await geometry();assert.equal(wide.lists,wider.lists);assert.ok(wider.items>wide.items);assert.ok(wider.detail>wide.detail);assert.ok(Math.abs(wider.items/(wider.items+wider.detail)-.46)<.03);
 const bottoms=await page.locator('.reminders-layout').evaluate(node=>['.reminder-lists','.reminder-main','.reminder-detail'].map(selector=>({bottom:node.querySelector(selector).getBoundingClientRect().bottom,view:innerHeight,overflow:getComputedStyle(node.querySelector(selector)).overflowY})));for(const column of bottoms){assert.ok(Math.abs(column.bottom-column.view)<3);assert.equal(column.overflow,'auto');}
 const resizer=page.getByRole('separator',{name:'Resize lists column'});const before=await page.locator('.reminder-lists').evaluate(node=>node.getBoundingClientRect().width);await resizer.press('ArrowRight');assert.ok(await page.locator('.reminder-lists').evaluate(node=>node.getBoundingClientRect().width)>before);
 assert.equal(await page.locator('.reminder-editor-heading [role=status]').count(),1);
 assert.ok(await page.locator('[name=title]').evaluate(node=>parseFloat(getComputedStyle(node).fontSize))>=19);
 assert.equal(await page.getByLabel('Timezone',{exact:true}).count(),0);
 await page.getByLabel('Title',{exact:true}).fill('Unsaved title');const writesBeforeCancel=await page.evaluate(()=>calls.length);await page.getByRole('button',{name:'Cancel edits',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[name=title]')?.value==='Water plants');assert.equal(await page.evaluate(()=>calls.length),writesBeforeCancel);
 assert.equal(await page.locator('[data-reminder-form] .actions [data-action]').count(),1);

 await page.getByRole('button',{name:'New reminder',exact:true}).click();await page.getByLabel('Title',{exact:true}).fill('Draft remains');await page.getByRole('button',{name:'Refresh reminders',exact:true}).click();assert.equal(await page.getByLabel('Title',{exact:true}).inputValue(),'Draft remains');
 await page.getByRole('navigation',{name:'Reminder tabs'}).getByRole('button',{name:'Reminders',exact:true}).click();
 await page.getByRole('navigation',{name:'Reminder tabs'}).getByRole('button',{name:'Draft remains',exact:true}).click();assert.equal(await page.getByLabel('Title',{exact:true}).inputValue(),'Draft remains');
 await page.evaluate(()=>view.open(rows[0].id));await page.getByLabel('Title',{exact:true}).waitFor();await page.evaluate(()=>view.open(rows[0].id));assert.equal(await page.locator('[data-reminder-tab]').count(),2,'Reopening an existing ID never duplicates its tab');
 assert.equal(await page.getByLabel('Title',{exact:true}).inputValue(),'Water plants');
 const beforeClose=await page.evaluate(()=>calls.length);await page.getByRole('button',{name:'Close Water plants',exact:true}).click();assert.equal(await page.evaluate(()=>calls.length),beforeClose,'Closing a reminder tab does not mutate the reminder');
 await page.getByRole('navigation',{name:'Reminder tabs'}).getByRole('button',{name:'Draft remains',exact:true}).click();
 await page.evaluate(()=>{current=false;});await page.getByRole('button',{name:'Save',exact:true}).click();assert.equal(await page.evaluate(()=>rows.length),2);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,checks:['selected account and lists only','preview before import','lost import response retries same operation','lost save response retries same operation','date-only','timed timezone','revision edit','complete/filter','draft refresh','account switch stops save']}));
}finally{await closeTestElectron(app);server.closeAllConnections();await new Promise(resolve=>server.close(resolve));fs.rmSync(home,{recursive:true,force:true});}
