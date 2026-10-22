// Actual desktop renderer and disposable synthetic account. No provider or live data.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-narrow-layout-'));
const phase=process.env.PROTEUS_LAYOUT_PHASE==='before'?'before':'after';
let app;
try {
  app=await electron.launch({args:['test/account-queue-ui-host.cjs','--use-mock-keychain','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home}});
  const page=await app.firstWindow(),errors=[],measurements=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.locator('[data-page=runs]').first().click();
  await page.locator('.chat-index-row').filter({hasText:'Queue and account fixture'}).click();
  await page.locator('#followup').waitFor();
  for(const width of [1200,580,390]){
    await page.setViewportSize({width,height:900});
    await page.locator('#followup').fill('Synthetic narrow-window drafting check.');
    const measured=await page.evaluate(()=>{
      const main=document.querySelector('#main'),pane=document.querySelector('.chat-pane'),composer=document.querySelector('.composer');
      const bounds=main.getBoundingClientRect();
      return {width:innerWidth,mainWidth:main.clientWidth,mainScroll:main.scrollWidth,paneWidth:pane.clientWidth,paneScroll:pane.scrollWidth,composerWidth:composer.clientWidth,composerScroll:composer.scrollWidth,
        outside:[...main.querySelectorAll('*')].filter(node=>{const r=node.getBoundingClientRect();return r.width>0&&r.right>bounds.right+1;}).slice(0,12).map(node=>({tag:node.tagName,id:node.id,class:node.className,right:Math.round(node.getBoundingClientRect().right)})),
        controlsVisible:[...composer.querySelectorAll('.attachment-add,.composer-actions button')].every(node=>{const r=node.getBoundingClientRect();return r.left>=bounds.left&&r.right<=bounds.right&&r.bottom<=innerHeight&&node.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2));})};
    });
    measurements.push(measured);
    await page.screenshot({path:path.join(os.tmpdir(),`proteus-narrow-${phase}-${width}.png`)});
  }
  if(phase==='after'){
    await page.locator('.model-options').click();
    assert.equal(await page.locator('.model-options').getAttribute('aria-expanded'),'true');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.model-options').getAttribute('aria-expanded'),'false');
  }
  console.log(JSON.stringify({synthetic:true,phase,measurements}));
  assert.deepEqual(errors,[]);
  for(const value of measurements){assert.ok(value.mainScroll<=value.mainWidth+1,JSON.stringify(value));assert.ok(value.paneScroll<=value.paneWidth+1,JSON.stringify(value));assert.ok(value.composerScroll<=value.composerWidth+1,JSON.stringify(value));assert.ok(value.controlsVisible,JSON.stringify(value));}
}finally{await app?.close();fs.rmSync(home,{recursive:true,force:true});}
