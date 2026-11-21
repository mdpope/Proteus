// Real Electron shell and owner settings, with synthetic websites and OS handoff.
import { _electron as electron } from 'playwright';
import assert from 'node:assert/strict';
import { sidebarFixture } from './preview-sidebar-fixture.mjs';

const fixture = await sidebarFixture();
let app;
async function until(check,label) {
 for (let i=0;i<100;i++) {
  const value=await check();
  if (value) return value;
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 throw Error('Timed out: '+label);
}
try {
 app=await electron.launch({args:['.','--use-mock-keychain'],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,CODEX_HOME:fixture.auth,PORT:'0'}});
 const page=await app.firstWindow();
 page.setDefaultTimeout(15000);
 const session=()=>page.evaluate(()=>window.desktop.workspaceSession({action:'get'}));
 await page.locator('[data-page=engine]').click();
 // Use an inert HTTPS response and stub the OS launch in this disposable profile.
 await app.evaluate(({app,shell})=>{
  const browser=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();
  browser.sessionFor('default').protocol.handle('https',()=>new Response('<title>Account fixture</title>',{headers:{'Content-Type':'text/html'}}));
  globalThis.engineOpenedURLs=[];shell.openExternal=async url=>{globalThis.engineOpenedURLs.push(url);};
 });
 const account=page.locator('[data-engine-section=account]'),accountButton=page.locator('#engine-account-open');
 await account.click();await accountButton.click();
 const accountTab=await until(async()=>{const saved=await session();return saved.tabs.find(tab=>tab.id===saved.active&&tab.type==='browser'&&tab.url?.endsWith('/security'));},'account settings opens in the same window');
 assert.equal(accountTab.parentId??null,null);
 assert.deepEqual(await app.evaluate(()=>globalThis.engineOpenedURLs),[]);
 await page.locator('[data-page=engine]').click();await page.locator('[data-engine-section=preferences]').click();
 await page.getByText('Link Picker',{exact:true}).click();
 await page.locator('#clicked-link-browser').selectOption('system');
 await page.getByText('Saved for this computer.',{exact:true}).waitFor();
 await account.click();await accountButton.click();
 await until(async()=>(await app.evaluate(()=>globalThis.engineOpenedURLs)).length===1,'account settings honors system browser preference');
 assert.deepEqual(await app.evaluate(()=>globalThis.engineOpenedURLs),[accountTab.url]);
 assert.equal((await session()).tabs.filter(tab=>tab.url===accountTab.url).length,1);
 console.log('PASS Engine Room account link opens a top-level tab and honors System browser when selected');
} finally {
 if (app) {
  const timer=setTimeout(()=>app.process().kill('SIGKILL'),15000);
  try { await app.close(); } finally { clearTimeout(timer); }
 }
 await fixture.cleanup();
}
