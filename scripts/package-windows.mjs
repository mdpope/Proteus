import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build,Platform,Arch} from 'electron-builder';
import {c as createTar} from 'tar';
import {prepareExtensions} from './prepare-extensions.mjs';
import {createDesktopSnapshot,verifyDesktopMetadata,fileDigest,desktopRuntimeRoots,desktopRuntimeFiles} from './desktop-build.mjs';

if(process.platform!=='win32'||process.arch!=='x64')throw new Error('Build this Windows x64 release on Windows x64.');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
await import('./build-terminal.mjs');
const metadata=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const snapshot=createDesktopSnapshot(root,['package.json','package-lock.json','scripts/package-windows.mjs','scripts/windows-installer.nsh','scripts/desktop-build.mjs','scripts/build-terminal.mjs','scripts/prepare-extensions.mjs']);
const {runtimeFiles,buildInputs,sourceFingerprint}=snapshot,buildRevision='windows.'+sourceFingerprint.slice(0,12);
const provenance={schemaVersion:1,version:metadata.version,buildRevision,sourceFingerprint,platform:'win32',arch:'x64',runtimeFiles,buildInputs};
const out=path.resolve(process.env.PROTEUS_PACKAGE_OUTPUT||path.join(root,'dist','windows'));
// This first release is intentionally unsigned; do not discover or use another
// application's signing identity from the build machine.
process.env.CSC_IDENTITY_AUTO_DISCOVERY='false';
// NSIS's bundled extractor does not round-trip 7-Zip's automatic ARM64
// filter. Pin its supported BCJ filter, including for foreign-architecture
// dependency files, so installation preserves every accepted payload byte.
process.env.ELECTRON_BUILDER_7Z_FILTER='BCJ';
const artifacts=await build({projectDir:root,targets:Platform.WINDOWS.createTarget(['nsis'],Arch.x64),publish:'never',config:{
  appId:'org.proteusapp.proteus.desktop',productName:'Proteus',electronVersion:metadata.devDependencies.electron,
  directories:{output:out,buildResources:path.join(root,'desktop')},asar:false,npmRebuild:false,
  files:[...desktopRuntimeRoots.map(name=>name+'/**/*'),...desktopRuntimeFiles,'package.json'],
  win:{target:['nsis'],icon:path.join(root,'desktop','icon.png'),executableName:'Proteus',artifactName:'Proteus-'+metadata.version+'-'+buildRevision+'-win-x64-setup.exe'},
  nsis:{oneClick:true,perMachine:false,allowElevation:false,runAfterFinish:false,deleteAppDataOnUninstall:false,createDesktopShortcut:false,createStartMenuShortcut:true,differentialPackage:false,include:path.join(root,'scripts','windows-installer.nsh')},
  afterPack:async context=>{
    snapshot.verifySource();const appRoot=path.join(context.appOutDir,'resources','app');
    // Builder excludes some dotfiles by default. Preserve the exact shared
    // source manifest while keeping tests, tools and private files out.
    for(const name of desktopRuntimeFiles)fs.copyFileSync(path.join(root,name),path.join(appRoot,name));
    const copied=Object.fromEntries(Object.entries(metadata).filter(([key])=>!['private','scripts','devDependencies','overrides'].includes(key)));
    copied.buildRevision=buildRevision;
    fs.writeFileSync(path.join(appRoot,'package.json'),JSON.stringify(copied,null,2)+'\n');
    fs.writeFileSync(path.join(appRoot,'build-source.json'),JSON.stringify(provenance,null,2)+'\n');
    prepareExtensions(appRoot);
    snapshot.verifyCopied(appRoot);verifyDesktopMetadata(appRoot,metadata,provenance);
  }
}});
snapshot.verifySource();
const appRoot=path.join(out,'win-unpacked','resources','app');snapshot.verifyCopied(appRoot);verifyDesktopMetadata(appRoot,metadata,provenance);
for(const file of artifacts.filter(file=>file.endsWith('.exe'))){
  const hash=fileDigest(file);fs.writeFileSync(file+'.sha256',hash+'  '+path.basename(file)+'\n');
  fs.copyFileSync(file,path.join(out,'win-unpacked','Proteus Setup.exe'));
  const archive=path.join(out,'Proteus-'+metadata.version+'-'+buildRevision+'-win-x64-update.tar.gz');
  await createTar({file:archive,cwd:path.join(out,'win-unpacked'),gzip:true,portable:true},['.']);
  console.log(JSON.stringify({installer:file,archive,archiveSha256:fileDigest(archive),executable:path.join(out,'win-unpacked','Proteus.exe'),version:metadata.version,buildRevision,sourceFingerprint,platform:'win32',arch:'x64',sha256:hash,signing:'unsigned',runtimeFiles:Object.keys(runtimeFiles).length}));
}
