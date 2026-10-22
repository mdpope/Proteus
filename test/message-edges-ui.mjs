import {_electron as electron} from 'playwright';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import assert from 'node:assert/strict';
const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-message-edges-'));let app;
try{
 app=await electron.launch({args:['test/account-queue-ui-host.cjs','--use-mock-keychain','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home}});
 const page=await app.firstWindow();await page.locator('[data-page=runs]').first().click();await page.locator('.chat-index-row').filter({hasText:'Queue and account fixture'}).click();await page.locator('#followup').waitFor();
 // Add an assistant event through the disposable host, then let the actual chat renderer update.
 await app.evaluate((_,fixture)=>{const service=process.mainModule.require(fixture).service(),run=service.engine.runs.get(service.engine.listRuns()[0].id);service.engine.event(run,'assistant','Synthetic message styling check.');},path.resolve('test/account-queue-ui-host.cjs'));
 await page.getByText('Synthetic message styling check.',{exact:true}).waitFor();
 for(const role of ['user','assistant']){const style=await page.locator('.message.'+role).first().evaluate(node=>{const s=getComputedStyle(node);return {left:s.borderLeftWidth,color:s.borderLeftColor,top:s.borderTopColor,right:s.borderRightColor,bottom:s.borderBottomColor};});assert.equal(style.left,'3px');assert.notEqual(style.color,'rgba(0, 0, 0, 0)');for(const edge of ['top','right','bottom'])assert.equal(style[edge],'rgba(0, 0, 0, 0)',JSON.stringify(style));}
 await page.screenshot({path:'/private/tmp/proteus-oct22-desktop-message-edges.png'});console.log('PASS: actual desktop messages use colored left edges only.');
}finally{if(app)await app.close();fs.rmSync(home,{recursive:true,force:true});}
