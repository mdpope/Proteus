import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const home=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-attention-ui-')));
let app;
try{
 app=await electron.launch({args:['.','--use-mock-keychain',`--user-data-dir=${path.join(home,'browser')}`],env:{...process.env,PROTEUS_HOME:home,PORT:'0'},timeout:30000});
 const page=await app.firstWindow();page.setDefaultTimeout(15000);
 page.on('pageerror',error=>console.error(error.message));
 await page.locator('#topbar-home').waitFor();
 await app.evaluate(({app})=>{
  const service=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService();
  service.activity.preferences({inAppEnabled:false,systemEnabled:false});
  service.activity.browserIssue({windowId:'test-window',kind:'history-conflict',scope:{scope:'project',id:'fixture-project'},title:'General · Browser history needs attention',body:'The pending page can be preserved in a new tab.'});
  for(let i=0;i<75;i++)service.activity.add('chat.completed',{chatTitle:'Synthetic completion '+i});
  service.notify();
 });
 await page.reload();await page.locator('#topbar-home').waitFor();
 await page.locator('[data-page=attention]').click();
 await page.locator('[data-attention-tab=notifications]').click();
 const cards=page.locator('.attention-notification');
 await cards.first().waitFor();
 assert.equal(await cards.count(),60);
 const browser=page.locator('.ops-categories [data-id=browser]');
 assert.match(await browser.innerText(),/Browser\s*1/);
 await browser.click();
 assert.equal(await cards.count(),1);
 assert.match(await cards.first().innerText(),/General · Browser history needs attention/);
 assert.equal(await cards.first().getByRole('button',{name:'Open pending page in new tab'}).count(),1);
 const field=page.getByRole('searchbox',{name:'Search',exact:true});
 await field.fill('general saved');
 assert.equal(await cards.count(),0);
 await field.fill('general pending');
 assert.equal(await cards.count(),1);
 assert.equal(await field.evaluate(node=>document.activeElement===node),true);
 if(process.env.PROTEUS_SCREENSHOT)await page.screenshot({path:process.env.PROTEUS_SCREENSHOT});
 await page.getByRole('button',{name:'Clear filters',exact:true}).click();
 await page.getByRole('button',{name:'Load more',exact:true}).click();
 assert.equal(await cards.count(),76);
 console.log('PASS desktop notification counts, older browser conflict discovery, exact recovery controls, search and paging');
}finally{await app?.close();fs.rmSync(home,{recursive:true,force:true});}
