import { _electron as electron } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-permission-ui-'));let app;
try {
  app=await electron.launch({args:['test/permission-ui-host.cjs',`--user-data-dir=${path.join(home,'electron')}`],env:{...process.env,PROTEUS_HOME:home}});
  const page=await app.firstWindow();await page.getByText('Permission UI fixture',{exact:true}).click();await page.locator('#run-now').click();
  await page.locator('[data-permission-answer="trust-workspace"]').waitFor();
  if(process.env.PROTEUS_SCREENSHOT)await page.screenshot({path:process.env.PROTEUS_SCREENSHOT});
  await page.locator('[data-permission-mode]').selectOption('trusted');
  await page.locator('[data-save-permissions]').click();
  await page.getByText('Synthetic command',{exact:true}).waitFor();await page.locator('[data-permission-answer="always-tool"]').click();
  await page.locator('#answer').waitFor();assert.equal(await page.getByText('Which fixture result should be kept?',{exact:true}).count(),1);
  await page.locator('#answer').fill('Keep the reviewed result');await page.locator('#reply').click();await page.getByText('Turn complete',{exact:true}).waitFor();
  const run=JSON.parse(fs.readFileSync(path.join(home,'runs',fs.readdirSync(path.join(home,'runs'))[0])));
  assert.equal(run.automaticApprovals,3);assert.ok(run.events.some(event=>event.text==='Rehearsal: Keep the reviewed result'));
  await page.locator('[data-permission-mode]').selectOption('autopilot');await page.locator('[data-save-permissions]').click();await page.getByText('Permissions saved.',{exact:true}).waitFor();
  await page.locator('#followup').fill('Continue the fixture');await page.locator('#continue').click();await page.locator('#answer').waitFor();
  assert.equal(await page.locator('#approve').count(),0);
  await page.locator('#answer').fill('Final fixture result');await page.locator('#reply').click();await page.getByText('Turn complete',{exact:true}).waitFor();
  const resumed=JSON.parse(fs.readFileSync(path.join(home,'runs',`${run.id}.json`)));assert.equal(resumed.automaticApprovals,7);
  console.log(JSON.stringify({passed:true,checks:['one-click workspace trust','always allow exact operation','queued request recheck','real questions remain interactive','saved auto-approval on resume'],automaticApprovals:resumed.automaticApprovals}));
} finally {if(app)await app.close();fs.rmSync(home,{recursive:true,force:true});}
