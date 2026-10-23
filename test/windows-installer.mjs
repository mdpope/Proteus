// Disposable real-NSIS acceptance. Refuse to touch an existing Proteus installation.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {_electron} from 'playwright';
import windows from '../desktop/updates/windows-installation.cjs';
import packages from '../desktop/updates/update-package.cjs';
import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
if(process.platform!=='win32'||!process.argv[2]||!process.argv[3])throw Error('Supply exact setup and unpacked application paths.');
let existing;try{existing=windows.registration();}catch{}
if(existing)throw Error('A live Windows installation is registered. Use a disposable test account for installer acceptance.');
const installer=fs.realpathSync(process.argv[2]),candidate=packages.inspectPackage(process.argv[3]);
assert.equal(packages.fileDigest(installer),candidate.installer.sha256);
const root=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-installer-test-')),installation=path.join(root,'Application with spaces'),home=path.join(root,'data'),browser=path.join(root,'browser');
const execute=(file,args)=>new Promise((resolve,reject)=>{const child=spawn(file,args,{windowsHide:true,stdio:'ignore'});child.once('error',reject);child.once('exit',resolve);});
let app;const checks=[];
const until=async check=>{const end=Date.now()+60000;while(!await check()){if(Date.now()>end)throw Error('Timed out waiting for the installer child process to finish.');await new Promise(resolve=>setTimeout(resolve,250));}};
try{
 assert.equal(await execute(installer,['/S','/currentuser','/D='+installation]),0);
 windows.verifyRegistration(installation,candidate.version);
 for(const scheme of ['proteus','proteus-desktop']){
  const command=execFileSync(path.join(process.env.SystemRoot,'System32/reg.exe'),['query','HKCU\\Software\\Classes\\'+scheme+'\\shell\\open\\command','/ve'],{encoding:'utf8',windowsHide:true});
  assert.ok(command.toLowerCase().includes(path.join(installation,'Proteus.exe').toLowerCase()));assert.ok(command.includes('"%1"'));
 }
 checks.push('per-user chat and sign-in URI handlers target the installed executable');
 const installed=packages.inspectPackage(installation);
 if(installed.hash!==candidate.hash){
  const inventory=base=>{const rows=new Map(),walk=relative=>{for(const item of fs.readdirSync(path.join(base,relative),{withFileTypes:true})){if(!relative&&windows.installationFiles.includes(item.name))continue;const name=path.join(relative,item.name),file=path.join(base,name);if(item.isDirectory())walk(name);else rows.set(name,JSON.stringify([fs.statSync(file).mode&0o777,packages.fileDigest(file)]));}};walk('');return rows;};
  const wanted=inventory(candidate.bundle),actual=inventory(installation);console.error('Payload differences:',[...new Set([...wanted.keys(),...actual.keys()])].filter(name=>wanted.get(name)!==actual.get(name)).slice(0,20));
 }
 assert.equal(installed.hash,candidate.hash);
 assert.equal(packages.fileDigest(path.join(installation,windows.setupName)),candidate.installer.sha256);
 checks.push('NSIS registers a per-user installation with the exact payload and recovery installer');
 console.log(checks.at(-1));
 app=await _electron.launch({executablePath:path.join(installation,'Proteus.exe'),args:['--user-data-dir='+browser],env:{...process.env,PROTEUS_HOME:home,PORT:'0'},timeout:60000});
 const page=await app.firstWindow();await page.locator('#topbar-home').waitFor({timeout:30000});
 const state=await app.evaluate(({app})=>{const service=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService();return {home:service.home,policy:service.updates.readRecoveryPolicy(),status:service.updates.status()};});
 assert.equal(state.policy.generations.length,0);assert.equal(state.policy.audit.kind,'new-windows-data-home');
 checks.push('first registered launch initializes the fresh data-home recovery inventory');
 await page.locator('[data-page="engine"]').click();
 await page.locator('[data-engine-section="updates"]').click();
 await page.locator('[data-update-check]').waitFor();assert.equal(await page.locator('[data-update-handoff]').isDisabled(),true);
 if(process.argv[4]){
  const manifest=fs.realpathSync(process.argv[4]);
  await app.evaluate(async({app},manifest)=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService().updates.handle({action:'import-release',manifest,channel:'stable'}),manifest);
  await until(async()=>!await page.locator('[data-update-cancel]').isDisabled());
  await page.locator('[data-update-cancel]').click();
  await page.locator('[data-update-status]').getByText('cancelled',{exact:true}).waitFor();
  await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,100)));
  assert.equal(await page.locator('[data-update-cancel]').isDisabled(),true);
  assert.equal(await page.locator('[data-update-handoff]').isDisabled(),true);
  checks.push('offline signed release prepares in the installed app and cancellation keeps restart controls disabled');
 }
 if(process.env.PROTEUS_SCREENSHOT)await page.screenshot({path:path.resolve(process.env.PROTEUS_SCREENSHOT)});
 checks.push('installed Updates panel exposes published and offline releases with restart gated on preparation');
 const refusal=await execute(installer,['/S','/currentuser','/D='+installation]);
 assert.equal(refusal,1618,'The installer must refuse to replace a running installation.');
 assert.equal(await page.locator('#topbar-home').isVisible(),true);assert.equal(packages.inspectPackage(installation).hash,candidate.hash);
 checks.push('installer refuses active target without terminating or changing its application');
 fs.writeFileSync(path.join(home,'synthetic-retry-receipt'),'REHEARSAL ONLY');
 await app.close();app=null;
 assert.equal(await execute(path.join(installation,'Uninstall Proteus.exe'),['/S','/currentuser']),0);
 await until(()=>{try{return !windows.registration();}catch{return true;}});
 for(const scheme of ['proteus','proteus-desktop'])assert.throws(()=>execFileSync(path.join(process.env.SystemRoot,'System32/reg.exe'),['query','HKCU\\Software\\Classes\\'+scheme],{windowsHide:true,stdio:'ignore'}),error=>error.status===1);
 assert.equal(fs.readFileSync(path.join(home,'synthetic-retry-receipt'),'utf8'),'REHEARSAL ONLY');
 checks.push('conventional uninstall preserves the separate application data');
 console.log(JSON.stringify({passed:true,buildRevision:candidate.buildRevision,checks,scope:'disposable Windows installer acceptance; no live installation or data'}));
}catch(error){console.error(error);throw error;}finally{
 if(app)await app.close().catch(()=>{});
 if(fs.existsSync(path.join(installation,'Uninstall Proteus.exe')))await execute(path.join(installation,'Uninstall Proteus.exe'),['/S','/currentuser']);
 await until(()=>{try{return !windows.registration();}catch{return true;}});
 // NSIS's copied uninstaller can release its registry key before its process
 // releases the disposable parent directory on Windows.
 await until(()=>{try{fs.rmSync(root,{recursive:true,force:true,maxRetries:2,retryDelay:100});return true;}catch(error){if(!['EPERM','EBUSY','ENOTEMPTY'].includes(error.code))throw error;return false;}});
}
