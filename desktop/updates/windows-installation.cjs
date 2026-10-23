const fs=require('node:fs'),path=require('node:path');
const {execFileSync,spawn}=require('node:child_process');
const systemTool=name=>path.join(process.env.SystemRoot||'C:\\Windows','System32',name);
const registryKey='HKCU\\Software\\proteus\\Proteus';
const setupName='Proteus Setup.exe';
const installationFiles=[setupName,'Uninstall Proteus.exe','uninstallerIcon.ico'];

function registration() {
  const read=name=>{
    const output=execFileSync(systemTool('reg.exe'),['query',registryKey,'/v',name],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','ignore']});
    const value=output.match(/REG_SZ\s+(.+)/)?.[1]?.trim();if(!value)throw new Error('The Windows installation registration is incomplete.');return value;
  };
  return {installation:read('InstallLocation'),version:read('Version')};
}
function sameLocation(a,b){return path.resolve(a).toLowerCase()===path.resolve(b).toLowerCase();}
function verifyRegistration(installation,version) {
  const saved=registration();
  if(!sameLocation(saved.installation,installation)||saved.version!==version)throw new Error('The Windows installer registration does not match this application.');
  return saved;
}
function processPaths() {
  const script=`$ErrorActionPreference='Stop'; $rows=@(); foreach($p in [System.Diagnostics.Process]::GetProcesses()){try{$rows+=@{pid=$p.Id;file=$p.MainModule.FileName}}catch{}}; ConvertTo-Json -InputObject $rows -Compress`;
  const env={...process.env,PSModulePath:path.join(process.env.SystemRoot,'System32','WindowsPowerShell','v1.0','Modules')};
  return JSON.parse(execFileSync(systemTool('WindowsPowerShell\\v1.0\\powershell.exe'),['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{env,encoding:'utf8',windowsHide:true,timeout:10000}));
}
function inUse(directory) {
  const root=path.resolve(directory).toLowerCase()+path.sep;
  return processPaths().some(row=>row.file&&path.resolve(row.file).toLowerCase().startsWith(root));
}
async function runInstaller(file,installation) {
  if(!path.isAbsolute(file)||!path.isAbsolute(installation)||fs.lstatSync(file).isSymbolicLink())throw new Error('Use the verified local Windows installer.');
  if(inUse(installation))throw new Error('This Windows installation is still running. Active work was preserved.');
  await new Promise((resolve,reject)=>{
    const child=spawn(file,['/S','/currentuser','/D='+installation],{windowsHide:true,stdio:'ignore',shell:false});
    child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(new Error('Windows installer failed with exit code '+code+'.')));
  });
}
function installerFor(identity) {
  const file=path.join(identity.bundle,setupName),{fileDigest}=require('./update-package.cjs');
  if(!identity.installer?.sha256||fileDigest(file)!==identity.installer.sha256)throw new Error('The exact Windows recovery installer is unavailable or changed.');
  return file;
}
module.exports={setupName,installationFiles,registration,verifyRegistration,inUse,runInstaller,installerFor};
