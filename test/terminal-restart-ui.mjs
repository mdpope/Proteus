import {_electron as electron} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const home=fs.realpathSync(fs.mkdtempSync('/private/tmp/pterm-restore-')),workspace=path.join(home,'workspace');fs.mkdirSync(workspace);
fs.writeFileSync(path.join(home,'settings.json'),JSON.stringify({schemaVersion:1,provider:'rehearsal',model:'',timezone:'UTC',workspace:{cwd:workspace,additionalDirectories:[]},skillDirectories:[],mcpServers:{}}));
let app,page;const errors=[];
const launch=async()=>{app=await electron.launch({args:['.','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,PORT:'0'},timeout:60000});page=await app.firstWindow();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));await page.locator('#tab-add-menu summary').waitFor();};
const until=async check=>{for(let i=0;i<100;i++){const value=await check();if(value)return value;await new Promise(resolve=>setTimeout(resolve,100));}throw new Error('Timed out waiting for terminal lifecycle');};
try{
  await launch();
  await page.evaluate(async()=>{const state=await window.desktop.terminal({action:'state'}),profiles=state.profiles.profiles;profiles[0]={...profiles[0],shell:'/bin/sh',command:'printf STARTUP_MARKER\\n; exec /bin/sh'};await window.desktop.terminal({action:'save-profiles',profiles,expectedRevision:state.profiles.revision});});
  await page.locator('#tab-add-menu summary').click();await page.locator('#terminal').click();await page.locator('#terminal-session').selectOption('process');await page.locator('#dialog-submit').click();await page.locator('.terminal-canvas canvas').waitFor();
  const first=await until(async()=>{const state=await page.evaluate(()=>window.desktop.terminal({action:'state'}));return state.sessions.find(item=>item.status==='running');});
  await until(async()=>{const value=await page.evaluate(id=>window.desktop.terminal({action:'snapshot',id}),first.id);return value.data.includes('STARTUP_MARKER');});
  await app.close();app=null;
  await launch();await page.locator('[data-page="home"].active').waitFor();
  const state=await page.evaluate(()=>window.desktop.terminal({action:'state'}));assert.equal(state.sessions.filter(item=>item.status==='running').length,0,'cold start must not spawn an old process');
  await page.locator('[data-tab="terminal:'+first.id+'"]').click();await page.locator('.terminal-canvas canvas').waitFor();
  await page.locator('.terminal-canvas').click();await page.keyboard.type('echo RESTORE_OK\n',{delay:100});
  const resumed=await until(async()=>{const state=await page.evaluate(()=>window.desktop.terminal({action:'state'}));return state.sessions.find(item=>item.status==='running'&&item.id!==first.id);});
  const output=await until(async()=>{const value=await page.evaluate(id=>window.desktop.terminal({action:'snapshot',id}),resumed.id);return value.data.includes('RESTORE_OK')?value.data:null;});
  assert.equal(output.includes('STARTUP_MARKER'),false,'typed restore must not replay profile startup command');
  if((await page.evaluate(()=>window.desktop.terminal({action:'state'}))).tmux.available){
    await page.evaluate(async()=>{const state=await window.desktop.terminal({action:'state'}),profiles=state.profiles.profiles;profiles[0]={...profiles[0],command:'sleep 3; echo DETACHED_OUTPUT; exec /bin/sh'};await window.desktop.terminal({action:'save-profiles',profiles,expectedRevision:state.profiles.revision});});
    await page.locator('#tab-add-menu summary').click();await page.locator('#terminal').click();await page.locator('#terminal-session').selectOption('tmux');await page.locator('#dialog-submit').click();await page.locator('.terminal-canvas canvas').waitFor();
    const persistent=await until(async()=>{const state=await page.evaluate(()=>window.desktop.terminal({action:'state'}));return state.sessions.find(item=>item.persistence==='tmux'&&item.status==='running');});
    await app.close();app=null;await new Promise(resolve=>setTimeout(resolve,3500));
    await launch();await page.locator('[data-page="home"].active').waitFor();
    const detached=await page.evaluate(id=>window.desktop.terminal({action:'snapshot',id}),persistent.id);
    assert.equal(detached.live,false);assert.match(detached.detachedOutput?.data||'',/DETACHED_OUTPUT/,'managed tmux keeps output while app is closed');
    await page.locator('[data-tab="terminal:'+persistent.id+'"]').click();await page.locator('.terminal-canvas canvas').waitFor();
    const reattached=await until(async()=>{const state=await page.evaluate(()=>window.desktop.terminal({action:'state'}));return state.sessions.find(item=>item.persistence==='tmux'&&item.status==='running');});
    assert.equal(reattached.tmuxSessionId,persistent.tmuxSessionId);assert.equal(reattached.tmuxSessionTag,persistent.tmuxSessionTag);
    assert.match(await page.locator('.terminal-detached-output pre').textContent(),/DETACHED_OUTPUT/);
    await page.locator('[data-terminal-end]').click();
  }
  assert.deepEqual(errors,[]);console.log('Cold app restart opens Home; process restore starts one fresh shell without command replay; tagged tmux survives quit, captures detached output, and reattaches by identity.');
}finally{await app?.close();fs.rmSync(home,{recursive:true,force:true});}
