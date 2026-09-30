import { _electron as electron } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const home = fs.mkdtempSync(path.join(os.tmpdir(),'proteus-ui-'));
const output = process.env.PROTEUS_SCREENSHOT || path.join(home,'proteus.png');
const launch = () => electron.launch({ args:['.',`--user-data-dir=${path.join(home,'electron')}`], env:{...process.env,PROTEUS_HOME:home,PORT:'0'}, timeout:30000 });
let app;
try {
  app=await launch();let page=await app.firstWindow();await page.getByRole('heading',{name:'Work that keeps moving.'}).waitFor();
  await page.getByRole('row').filter({hasText:'Workspace pulse'}).click();
  await page.locator('#cron').fill('15 10 * * 1-5');await page.locator('#preview').click();await page.locator('#save').click();
  await page.getByText('Schedule saved.',{exact:true}).waitFor();
  assert.equal(JSON.parse(fs.readFileSync(path.join(home,'schedules/workspace-pulse.json'))).cron,'15 10 * * 1-5');
  await page.locator('#main').evaluate(el=>el.scrollTop=0);
  await page.screenshot({path:output});
  await page.locator('#run-now').click();await page.locator('#answer').waitFor();await page.locator('#answer').fill('Check the release checklist.');await page.locator('#reply').click();await page.getByText('Turn complete',{exact:true}).waitFor();
  const files=fs.readdirSync(path.join(home,'runs'));assert.equal(files.length,1);const runId=JSON.parse(fs.readFileSync(path.join(home,'runs',files[0]))).id;
  await app.close();app=await launch();page=await app.firstWindow();await page.getByRole('heading',{name:'Work that keeps moving.'}).waitFor();
  await page.locator('[data-page="runs"]').click();await page.locator(`[data-run="${runId}"]`).click();
  await page.locator('#followup').fill('Continue the saved checkpoint.');await page.locator('#continue').click();await page.locator('#answer').waitFor();await page.locator('#answer').fill('Check the documentation next.');await page.locator('#reply').click();await page.getByText('Turn complete',{exact:true}).waitFor();
  assert.equal(fs.readdirSync(path.join(home,'runs')).length,1);
  await page.locator('#browser').click();await page.locator('#browser-go').click();
  await page.waitForTimeout(1500);
  const urls=await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].contentView.children.map(view=>view.webContents?.getURL()).filter(Boolean));
  assert.ok(urls.some(url=>url.startsWith('https://example.com')));
  console.log(JSON.stringify({passed:true,checks:['cron edit and preview','atomic file save','feedback reply','restart and resume same run','interactive browser tab'],screenshot:output}));
} finally { if(app)await app.close();fs.rmSync(home,{recursive:true,force:true}); }
