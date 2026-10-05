import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Engine} from '../src/engine.js';

const home=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-chat-lifecycle-ui-'))),workspace=path.join(home,'workspace');fs.mkdirSync(workspace);
fs.writeFileSync(path.join(home,'settings.json'),JSON.stringify({schemaVersion:1,provider:'rehearsal',model:'',timezone:'UTC',workspace:{cwd:workspace,additionalDirectories:[]},skillDirectories:[],mcpServers:{}}));
const generated=path.join(workspace,'generated.md');fs.writeFileSync(generated,'# Synthetic generated file');
const engine=new Engine(home);const schedule={schemaVersion:1,id:'synthetic-chat',name:'Synthetic archive chat',enabled:false,cron:'0 9 * * 1-5',timezone:'UTC',provider:'rehearsal',model:'',workspace:{cwd:workspace,additionalDirectories:[]},misfire:'skip',prompt:'Synthetic prompt'};
const run=engine.createRun(schedule,'chat',null,{deferStart:true});run.deferredStart=false;run.status='completed';engine.persist(run);await engine.close();
let app;const errors=[];
try{
  app=await electron.launch({args:['.','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,PORT:'0'},timeout:60000});
  const page=await app.firstWindow();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
  await page.locator('#tab-add-menu').waitFor();await page.locator('[data-page="runs"]').first().click();await page.locator('[data-chat-index="0"]').waitFor();
  const row=page.locator('[data-chat-index="0"]');await row.click({button:'right'});await page.locator('#chat-context-menu [data-chat-action="archive"]').click();
  await page.locator('[data-chat-index="0"]').waitFor({state:'detached'});
  await page.locator('#chat-index-show-archived').check();await page.locator('[data-chat-index="0"]').waitFor();
  assert.match(await page.locator('[data-chat-index="0"]').innerText(),/Archived/);
  await page.locator('[data-chat-index="0"]').focus();await page.keyboard.press('Shift+F10');await page.locator('#chat-context-menu [data-chat-action="unarchive"]').waitFor();
  await page.keyboard.press('Escape');assert.equal(await page.locator('#chat-context-menu').count(),0);
  await page.locator('[data-chat-index="0"]').click();
  assert.equal(await page.locator('[data-chat-add="browser"] svg').innerHTML(),await page.locator('#browser svg').innerHTML(),'Chat and main add menus use the same browser icon');
  await page.locator('#chat-archive').click();await page.locator('#chat-archive').filter({hasText:'Archive'}).waitFor();
  await page.locator('#chat-delete').click();await page.locator('#dialog').getByText('Generated files and the provider').waitFor();
  await page.locator('#close-dialog').click();assert.equal(fs.existsSync(path.join(home,'runs',run.id+'.json')),true);
  await page.locator('#chat-delete').click();await page.locator('#dialog-submit').click();
  await page.getByRole('heading',{name:'Chats'}).waitFor();assert.equal(fs.existsSync(path.join(home,'runs',run.id+'.json')),false);assert.equal(fs.readFileSync(generated,'utf8'),'# Synthetic generated file');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,checks:10}));
}finally{await app?.close();fs.rmSync(home,{recursive:true,force:true});}
