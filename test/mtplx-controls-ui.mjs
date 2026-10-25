// Real desktop/catalog controls, without generated model turns.
import {_electron as electron} from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'mtplx-controls-'))),preview=path.join(root,'preview');let app,page;
const launch=async()=>{const executablePath=process.env.PROTEUS_MTPLX_LIVE_EXECUTABLE;app=await electron.launch({...(executablePath?{executablePath,args:[]}:{args:['.']}),env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:preview,PORT:'0'}});page=await app.firstWindow();page.setDefaultTimeout(30000);await page.locator('#topbar-home').waitFor();};
const close=async()=>{if(!app)return;const own=app;app=null;const timer=setTimeout(()=>own.process().kill('SIGKILL'),10000);try{await own.close();}finally{clearTimeout(timer);}};
try{
  await launch();await page.locator('[data-preview-open-project]').filter({hasText:'Design review'}).click();await page.locator('[data-preview-new-chat]').click();const provider=page.locator('.new-chat-main select[id$="-provider"]');await provider.waitFor();await provider.selectOption('mtplx');const prefix=(await provider.getAttribute('id')).replace(/-provider$/,''),mode=page.locator('#'+prefix+'-model-mode'),effort=page.locator('#'+prefix+'-model-effort');
  await page.waitForFunction(id=>document.getElementById(id)?.options.length>1,prefix+'-model-mode');
  assert.equal(await mode.locator('..').locator('label').textContent(),'Reasoning');assert.equal(await effort.locator('..').locator('label').textContent(),'Level');
  assert.deepEqual(await mode.locator('option').evaluateAll(nodes=>nodes.map(n=>n.value)),['','auto','on','off']);assert.ok((await effort.locator('option').evaluateAll(nodes=>nodes.map(n=>n.value))).includes('xhigh'));
  await effort.selectOption('xhigh');await mode.selectOption('off');assert.equal(await effort.isDisabled(),true);assert.equal(await effort.inputValue(),'xhigh');await mode.selectOption('on');assert.equal(await effort.isDisabled(),false);await page.locator('#'+prefix+'-prompt').fill('Synthetic unsent reasoning-control draft.');
  await page.screenshot({path:path.join(root,'reasoning-controls.png')});
  let saved=false;
  for(let attempt=0;attempt<50;attempt++){const session=await page.evaluate(()=>window.desktop.workspaceSession({action:'get'}));if(JSON.stringify(session).includes('Synthetic unsent reasoning-control draft.')){saved=true;break;}await new Promise(resolve=>setTimeout(resolve,100));}
  assert.equal(saved,true,'Wait for the host to accept the synthetic draft before quitting.');await close();await launch();const restoredMode=page.locator('.new-chat-main select[id$="-model-mode"]');await restoredMode.waitFor();await page.waitForFunction(()=>document.querySelector('.new-chat-main select[id$="-model-mode"]')?.options.length>1);
  assert.equal(await restoredMode.inputValue(),'on');assert.equal(await page.locator('.new-chat-main select[id$="-model-effort"]').inputValue(),'xhigh');assert.equal(await page.locator('.new-chat-main textarea[id$="-prompt"]').inputValue(),'Synthetic unsent reasoning-control draft.');console.log(JSON.stringify({passed:true,noModelTurns:true,reasoningControls:true,savedDraft:true,root}));
}catch(error){await page?.screenshot({path:path.join(root,'failure.png')}).catch(()=>{});throw error;}finally{await close();}
