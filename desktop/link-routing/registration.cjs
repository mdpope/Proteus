const path=require('node:path');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const run=promisify(execFile);
const lsregister='/System/Library/Frameworks/CoreServices.framework/Versions/Current/Frameworks/LaunchServices.framework/Versions/Current/Support/lsregister';
class BrowserRegistration{
  constructor(app,{platform=process.platform,execute=run,preview=false}={}){this.app=app;this.platform=platform;this.execute=execute;this.preview=preview;}
  status(){
    const supported=this.platform==='darwin',available=supported&&this.app.isPackaged&&!this.preview;
    const schemes=Object.fromEntries(['http','https'].map(scheme=>[scheme,{isDefault:supported&&this.app.isDefaultProtocolClient(scheme),name:supported?this.app.getApplicationNameForProtocol(scheme+':')||null:null}]));
    return {supported,available,schemes,isDefault:schemes.http.isDefault&&schemes.https.isDefault};
  }
  async act(action){
    if(!this.status().available)throw Error('Browser registration requires the installed macOS Proteus app. Development and design-preview copies cannot change it.');
    if(action==='register'){
      const bundle=path.resolve(this.app.getAppPath(),'../../..');if(!bundle.endsWith('.app'))throw Error('The installed application bundle could not be identified.');
      // Register only this copy. Never reset LaunchServices or unregister other apps.
      await this.execute(lsregister,['-f','-R','-trusted',bundle],{timeout:15000,maxBuffer:65536});
    }else if(action==='make-default'){
      // LaunchServices owns confirmation. Verify both schemes instead of trusting
      // a setter return value or assuming appearance in System Settings' menu.
      for(const scheme of ['http','https'])this.app.setAsDefaultProtocolClient(scheme);
    }else throw Error('Choose a browser registration action.');
    return this.status();
  }
}
module.exports={BrowserRegistration};
