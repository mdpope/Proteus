import { _electron as electron } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'proteus-shutdown-'));
let app, exited = false;
try {
  app = await electron.launch({args:[process.cwd(),'--user-data-dir='+path.join(home,'browser')],env:{...process.env,PROTEUS_HOME:home,PORT:'0'},timeout:60000});
  const page = await app.firstWindow();
  await page.getByRole('heading',{name:'Work that keeps moving.'}).waitFor();
  await app.evaluate(({app}) => {
    const service = process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService();
    const close = service.close.bind(service);
    service.close = async () => { await close(); throw new Error('Synthetic denied provider cleanup'); };
  });
  app.process().once('exit', () => { exited = true; });
  await app.close();
  assert.equal(exited,true,'Cleanup failure must not leave a native error dialog blocking shutdown');
  app = null;
  console.log('Desktop shutdown contains provider cleanup rejection and exits.');
} finally { if(app) await app.close(); fs.rmSync(home,{recursive:true,force:true}); }
