#!/usr/bin/env node
// A separate simulator-only app and synthetic owner. Never installs on physical devices.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {fileURLToPath} from 'node:url';
import {execFileSync,spawn} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
let requested,buildOnly=false,ipad=false,reuseFixture=false;
while(args.length){const flag=args.shift();if(flag==='--build-only')buildOnly=true;else if(flag==='--ipad')ipad=true;else if(flag==='--reuse-fixture')reuseFixture=true;else if(flag==='--device'&&args[0]&&!args[0].startsWith('--'))requested=args.shift();else throw new Error('Usage: npm run ios:preview:phone -- [--device SIMULATOR_UUID] [--ipad] [--reuse-fixture] [--build-only]');}
const env={...process.env,DEVELOPER_DIR:process.env.DEVELOPER_DIR||'/Applications/Xcode.app/Contents/Developer'};
const run=(command,argv,options={})=>execFileSync(command,argv,{cwd:root,env,encoding:'utf8',...options});
const devices=Object.entries(JSON.parse(run('xcrun',['simctl','list','devices','available','--json'])).devices).filter(([runtime])=>runtime.includes('.iOS-')).flatMap(([,list])=>list).filter(d=>d.name.startsWith(ipad?'iPad':'iPhone'));
const device=requested?devices.find(d=>d.udid===requested):devices.find(d=>d.state==='Booted')||devices[0];
if(!device)throw new Error('Choose an available '+(ipad?'iPad':'iPhone')+' simulator. Physical devices are outside this preview.');
const previewBundle=ipad?'org.proteusapp.review.proteus.ipad-preview':'org.proteusapp.review.proteus.iphone-preview';
const output=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-phone-preview-'));
const info=path.join(output,'Info.plist');fs.copyFileSync(path.join(root,'ios/Proteus/Info.plist'),info);
run('/usr/libexec/PlistBuddy',['-c','Add :CFBundleDisplayName string Proteus Preview',info]);
const log=path.join(output,'build.log');const fd=fs.openSync(log,'w');
console.log(`Building Proteus Preview for ${device.name}. Logs: ${output}`);
try{run('xcodebuild',['-project','ios/Proteus.xcodeproj','-scheme','Proteus','-configuration','Debug','-destination',`platform=iOS Simulator,id=${device.udid}`,'-derivedDataPath',path.join(output,'DerivedData'),'-parallel-testing-enabled','NO','ONLY_ACTIVE_ARCH=YES',`PRODUCT_BUNDLE_IDENTIFIER=${previewBundle}`,`INFOPLIST_FILE=${info}`,'CODE_SIGNING_ALLOWED=YES','CODE_SIGN_IDENTITY=-','build'],{stdio:['ignore',fd,fd]});}catch(error){throw new Error(`Preview build failed; inspect ${log}`,{cause:error});}finally{fs.closeSync(fd);}
const app=path.join(output,'DerivedData/Build/Products/Debug-iphonesimulator/Proteus.app');
const bundle=run('/usr/libexec/PlistBuddy',['-c','Print :CFBundleIdentifier',path.join(app,'Info.plist')]).trim();
if(bundle!==previewBundle)throw new Error('Refusing to install an app with the production identity.');
fs.writeFileSync(path.join(output,'receipt.json'),JSON.stringify({kind:'synthetic-native-design-preview',bundle,device:device.udid,app,buildOnly},null,2)+'\n');
if(buildOnly){console.log(`Built simulator preview: ${app}`);process.exit(0);}
let fixture,fixtureLog;
if(reuseFixture){
 const response=await fetch('http://127.0.0.1:4329/native-app');const value=await response.json();
 if(value.identity?.accountId!=='synthetic-service-account')throw new Error('Only the named synthetic mobile fixture may be reused.');
}else{
 for(const port of [4328,4329])await new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',()=>reject(new Error(`Local fixture port ${port} is occupied. Keep the existing owner intact; use --reuse-fixture for the same synthetic owner or --build-only.`)));server.listen(port,'127.0.0.1',()=>server.close(resolve));});
 fixtureLog=path.join(output,'fixture.log');const fixtureFD=fs.openSync(fixtureLog,'a');
 fixture=spawn(process.execPath,['test/mobile-host.mjs'],{cwd:root,env:{...env,PROTEUS_TEST_CONTAINER:'0'},detached:true,stdio:['ignore',fixtureFD,fixtureFD]});fixture.unref();fs.closeSync(fixtureFD);
}
try{
 const deadline=Date.now()+30000;
 while(fixtureLog&&!fs.readFileSync(fixtureLog,'utf8').includes('Synthetic mobile test host ready.')){if(Date.now()>deadline)throw new Error(`Fixture did not start; inspect ${fixtureLog}`);await new Promise(resolve=>setTimeout(resolve,200));}
 if(device.state!=='Booted')run('xcrun',['simctl','boot',device.udid]);
 run('xcrun',['simctl','bootstatus',device.udid,'-b']);
 run('xcrun',['simctl','install',device.udid,app]);
 run('xcrun',['simctl','launch',device.udid,bundle,'--native-design-preview','--phone-preview-fixture','--synthetic-browser-workspace','--native-app-fixture','--reset-pairing']);
 const simulatorApp=path.join(env.DEVELOPER_DIR,'Applications/Simulator.app');
 if(fs.existsSync(simulatorApp))run('open',[simulatorApp,'--args','-CurrentDeviceUDID',device.udid]);
 else {
  const deviceHub=path.resolve(env.DEVELOPER_DIR,'../Applications/DeviceHub.app');
  if(fs.existsSync(deviceHub)){run('open',[deviceHub]);console.log(`Select ${device.name} in Device Hub to use the preview.`);}
  else console.log('The native preview is running, but no Simulator or Device Hub application was found in this Xcode installation.');
 }
 fs.writeFileSync(path.join(output,'receipt.json'),JSON.stringify({kind:'synthetic-native-design-preview',bundle,device:device.udid,app,fixturePID:fixture?.pid,fixtureLog,reuseFixture},null,2)+'\n');
 console.log(`Preview installed and launched. Synthetic owner ${fixture?.pid||'reused'}; receipt ${path.join(output,'receipt.json')}`);
}catch(error){if(fixture?.pid)try{process.kill(fixture.pid,'SIGTERM');}catch{}throw error;}
