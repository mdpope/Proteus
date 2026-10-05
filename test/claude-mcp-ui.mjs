import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Engine} from '../src/engine.js';

const home=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-claude-mcp-ui-'))),workspace=path.join(home,'workspace');fs.mkdirSync(workspace);
fs.writeFileSync(path.join(home,'settings.json'),JSON.stringify({schemaVersion:1,provider:'rehearsal',model:'',timezone:'UTC',workspace:{cwd:workspace,additionalDirectories:[]},skillDirectories:[],mcpServers:{}}));
const engine=new Engine(home),schedule={schemaVersion:1,id:'claude-synthetic',name:'Synthetic Claude MCP chat',enabled:false,cron:'0 9 * * 1-5',timezone:'UTC',provider:'claude',model:'claude-sonnet-4-5',workspace:{cwd:workspace,additionalDirectories:[]},misfire:'skip',prompt:'Synthetic prompt'};
const run=engine.createRun(schedule,'chat',null,{deferStart:true});run.deferredStart=false;run.status='failed';run.usage={inputTokens:0,outputTokens:0,observed:false};engine.persist(run);await engine.close();
let app;const errors=[];
try{
  app=await electron.launch({args:['.','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,PORT:'0'},timeout:60000});
  const page=await app.firstWindow();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/api/mcp',route=>route.fulfill({json:{servers:[{name:'synthetic-selected',status:'needs-auth',scope:'selected-chat'}]}}));
  await page.locator('#tab-add-menu').waitFor();await page.locator('[data-page="runs"]').first().click();await page.locator('[data-chat-index="0"]').click();
  await page.locator('#mcp-connections').waitFor();assert.match(await page.locator('[data-usage-note]').innerText(),/did not report turn usage/);assert.doesNotMatch(await page.locator('[data-usage-note]').innerText(),/Rehearsals/);
  await page.locator('#mcp-connections').click();await page.locator('#mcp-list').getByText('synthetic-selected').waitFor();
  assert.match(await page.locator('#dialog').innerText(),/Connection status only/);assert.equal(await page.locator('[data-connect-mcp]').count(),0);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,checks:4}));
}finally{await app?.close();fs.rmSync(home,{recursive:true,force:true});}
