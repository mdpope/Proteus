// Crashpad pipes belong to their original Electron process. Passing one to an
// Electron-as-Node helper can make Chromium write debug.log beside the signed
// executable before our readiness check runs. Never mutate the source context.
function withoutCrashpadEnvironment(source){
 return Object.fromEntries(Object.entries(source).filter(([name])=>!/^(?:CHROME|CHROMIUM|ELECTRON)_CRASHPAD_/i.test(name)));
}
function helperEnvironment(source=process.env){return {...withoutCrashpadEnvironment(source),ELECTRON_RUN_AS_NODE:'1'};}
module.exports={withoutCrashpadEnvironment,helperEnvironment};
