const {execFileSync}=require('node:child_process');

// LaunchServices attributes the new app and its Chromium helpers to the
// installed bundle. NSWorkspace also returns the actual app PID for rollback.
const launchScript=`
ObjC.import('AppKit');
function run() {
  const data=$.NSFileHandle.fileHandleWithStandardInput.readDataToEndOfFile;
  const config=JSON.parse(ObjC.unwrap($.NSString.alloc.initWithDataEncoding(data,$.NSUTF8StringEncoding)));
  const options=$.NSDictionary.dictionaryWithObjectsForKeys(
    $([config.args,config.environment]),
    $([$.NSWorkspaceLaunchConfigurationArguments,$.NSWorkspaceLaunchConfigurationEnvironment])
  );
  const error=Ref();
  const application=$.NSWorkspace.sharedWorkspace.launchApplicationAtURLOptionsConfigurationError(
    $.NSURL.fileURLWithPath(config.bundle),0,options,error
  );
  if(!application || application.isNil() || application.terminated)
    throw Error('LaunchServices could not open the installed Proteus bundle.');
  const launchedURL=application.bundleURL;
  if(!launchedURL || launchedURL.isNil() || ObjC.unwrap(launchedURL.URLByResolvingSymlinksInPath.path)!==config.bundle)
    throw Error('LaunchServices returned another application bundle.');
  return String(application.processIdentifier);
}
`;

function relaunchMac(bundle,args,environment,{run=execFileSync}={}){
 let receipt;
 try{
  // LaunchServices may inherit the launching process environment. The updater's
  // Electron runtime runs as Node, so give osascript the same clean app environment.
  receipt=run('/usr/bin/osascript',['-l','JavaScript','-e',launchScript],{
   env:environment,input:JSON.stringify({bundle,args,environment}),encoding:'utf8',timeout:30000,
   stdio:['pipe','pipe','pipe'],
  });
 }catch(error){
  const detail=error.stderr?.trim()||error.code||'No launch receipt.';
  throw Error('Could not relaunch Proteus through LaunchServices. '+detail,{cause:error});
 }
 const pid=Number(receipt.trim());
 if(!Number.isSafeInteger(pid)||pid<=0)throw Error('LaunchServices did not return the Proteus process ID.');
 return {pid};
}

module.exports={relaunchMac};
