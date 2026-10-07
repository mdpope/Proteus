import { _electron as electron } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
const bundle = path.resolve(process.argv[2] || `dist/Proteus-darwin-${process.arch}/Proteus.app`);
execFileSync('codesign', ['--verify', '--deep', '--strict', bundle]);
const plist = JSON.parse(execFileSync('plutil', ['-convert', 'json', '-o', '-', path.join(bundle, 'Contents/Info.plist')], { encoding:'utf8' }));
assert.equal(plist.CFBundleDisplayName, 'Proteus');assert.equal(plist.CFBundleIdentifier, 'org.proteusapp.proteus.desktop');
assert.equal(plist.CFBundleExecutable, 'Proteus');
assert.deepEqual(fs.readFileSync(path.join(bundle,'Contents/Resources',plist.CFBundleIconFile)),fs.readFileSync('dist/Proteus.icns'));
for (const name of ['copilot-runtime','runtime.node']) {
 const relative=`node_modules/@github/copilot-sdk-darwin-${process.arch}/prebuilds/darwin-${process.arch}/${name}`;
 const embedded=path.join(bundle,'Contents/Resources/app',relative);
 assert.deepEqual(fs.readFileSync(embedded),fs.readFileSync(relative),'Vendor binary/signature preserved');
 execFileSync('codesign',['--verify','--strict','-R','=anchor apple generic and certificate leaf[subject.OU] = "VEKTX9H2N7"',embedded]);
}
// Temporary profiles alone still request the user's Proteus Safe Storage key.
// Electron's own macOS tests use this upstream switch (backported in 44.4.0).
// Only synthetic data belongs in this disposable profile; this is not Keychain validation.
const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'proteus-package-test-')));
let app;
try {
 app=await electron.launch({executablePath:path.join(bundle,'Contents/MacOS/Proteus'),args:['--use-mock-keychain','--user-data-dir='+path.join(home,'browser')],env:{...process.env,PATH:'/usr/bin:/bin:/usr/sbin:/sbin',PROTEUS_HOME:home,PORT:'0'},timeout:60000});
 const isolation=await app.evaluate(async ({app,session})=>{
  if(!app.commandLine.hasSwitch('use-mock-keychain'))throw new Error('Packaged test requires a mock Keychain');
  await session.defaultSession.cookies.set({url:'https://proteus-package-test.invalid',name:'synthetic',value:'mock-keychain-test',expirationDate:Date.now()/1000+60});
  await session.defaultSession.cookies.flushStore();
  const cookies=await session.defaultSession.cookies.get({name:'synthetic'});
  return {home:process.env.PROTEUS_HOME,userData:app.getPath('userData'),electron:process.versions.electron,cookie: cookies[0]?.value};
 });
 assert.equal(isolation.home,home);assert.equal(isolation.userData,path.join(home,'browser'));assert.equal(isolation.cookie,'mock-keychain-test');
 const page=await app.firstWindow();await page.locator('#topbar-home').waitFor();
 const state=await app.evaluate(async ({app})=>{const {getService}=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs');const status=await getService().catalog.get();return {name:app.getName(),models:status.models?.length,available:status.available,error:status.error};});
 assert.equal(state.name,'Proteus');assert.ok(state.available,state.error);assert.ok(state.models>0);
 console.log(JSON.stringify({passed:true,checks:['bundle identity','shared iOS artwork','valid local signature','GitHub Copilot signatures preserved','window launches','mock Keychain synthetic cookie persistence','bundled Copilot runtime lists live models'],models:state.models,electron:isolation.electron,keychain:'mock; real Keychain access not verified'}));
} finally {
 if(app){
  const child=app.process();
  const graceful=app.close().then(()=>true,()=>false);
  const closed=await Promise.race([graceful,new Promise(resolve=>setTimeout(()=>resolve(false),10000))]);
  if(!closed&&!child.killed)child.kill('SIGKILL');
 }
 fs.rmSync(home,{recursive:true,force:true});
}
