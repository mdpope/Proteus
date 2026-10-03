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
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'proteus-package-test-'));
let app;
try {
 app=await electron.launch({executablePath:path.join(bundle,'Contents/MacOS/Proteus'),args:['--user-data-dir='+path.join(home,'browser')],env:{...process.env,PATH:'/usr/bin:/bin:/usr/sbin:/sbin',PROTEUS_HOME:home,PORT:'0'},timeout:60000});
 const page=await app.firstWindow();await page.getByRole('heading',{name:'Work that keeps moving.'}).waitFor();
 const state=await app.evaluate(async ({app})=>{const {getService}=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs');const status=await getService().catalog.get();return {name:app.getName(),models:status.models?.length,available:status.available,error:status.error};});
 assert.equal(state.name,'Proteus');assert.ok(state.available,state.error);assert.ok(state.models>0);
 console.log(JSON.stringify({passed:true,checks:['bundle identity','shared iOS artwork','valid local signature','GitHub Copilot signatures preserved','window launches','bundled Copilot runtime lists live models'],models:state.models}));
} finally {if(app)await app.close();fs.rmSync(home,{recursive:true,force:true});}
