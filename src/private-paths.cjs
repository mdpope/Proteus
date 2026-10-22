const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

let userSid;
function systemTool(name) {
  return path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', name);
}
function currentUserSid() {
  if (!userSid) {
    const output = execFileSync(systemTool('whoami.exe'), ['/user', '/fo', 'csv', '/nh'], {encoding:'utf8', windowsHide:true});
    userSid = output.match(/S-\d-\d+(?:-\d+)+/)?.[0];
    if (!userSid) throw new Error('Cannot identify the Windows user for private storage.');
  }
  return userSid;
}

// Windows chmod ignores Unix group/other bits. Private inputs must instead have
// a DACL granting access only to this user, SYSTEM and local administrators.
function hasPrivatePermissions(file, info = fs.lstatSync(file)) {
  if (info.isSymbolicLink()) return false;
  if (process.platform !== 'win32') return !(info.mode & 0o077) && (!process.getuid || info.uid === process.getuid());
  const script = `$ErrorActionPreference='Stop'; $acl=[System.IO.File]::GetAccessControl($env:PROTEUS_ACL_PATH); $sid=$env:PROTEUS_ACL_SID; if($acl.GetOwner([System.Security.Principal.SecurityIdentifier]).Value -ne $sid){exit 1}; foreach($rule in $acl.GetAccessRules($true,$true,[System.Security.Principal.SecurityIdentifier])){if($rule.AccessControlType -eq 'Allow' -and $rule.FileSystemRights -ne 0 -and $rule.IdentityReference.Value -notin @($sid,'S-1-5-18','S-1-5-32-544')){exit 1}}`;
  try {
    execFileSync(systemTool('WindowsPowerShell\\v1.0\\powershell.exe'), ['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')], {windowsHide:true,stdio:'ignore',timeout:10000,env:{...process.env,PROTEUS_ACL_PATH:path.resolve(file),PROTEUS_ACL_SID:currentUserSid()}});
    return true;
  } catch { return false; }
}

function protectNewDirectory(directory) {
  if (process.platform !== 'win32') { fs.chmodSync(directory,0o700); return; }
  const sid=currentUserSid();
  execFileSync(systemTool('icacls.exe'), [directory,'/inheritance:r','/grant:r',`*${sid}:(OI)(CI)F`,'*S-1-5-18:(OI)(CI)F','*S-1-5-32-544:(OI)(CI)F'], {stdio:'ignore',windowsHide:true,timeout:10000});
}

function privateTemporaryDirectory(prefix) {
  const directory=fs.mkdtempSync(prefix);
  try { protectNewDirectory(directory); return directory; }
  catch (error) { fs.rmdirSync(directory); throw error; }
}

// Never repair permissions on an existing user-selected directory implicitly.
// New application homes inherit private ACLs before credentials are written.
function ensurePrivateHome(directory) {
  try { fs.mkdirSync(directory,{mode:0o700}); protectNewDirectory(directory); }
  catch (error) { if(error.code!=='EEXIST')throw error; }
  const info=fs.lstatSync(directory);
  if(!info.isDirectory()||!hasPrivatePermissions(directory,info))throw new Error('Proteus needs a private application-data directory owned by the current user. Restrict its permissions before starting.');
}

module.exports={hasPrivatePermissions,privateTemporaryDirectory,ensurePrivateHome};
