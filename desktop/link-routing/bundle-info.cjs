// Explicit LaunchServices declarations. Apple browser/passkey entitlements are
// independently reviewed and must never be inferred from URL registration.
function browserBundleInfo({preview=false}={}){
 const privacy={NSLocalNetworkUsageDescription:'Proteus connects to websites, services and paired computers on your local network when you use them.'};
 if(preview)return privacy;
 return {...privacy,CFBundleURLTypes:[
  ...['http','https'].map(scheme=>({CFBundleTypeRole:'Viewer',CFBundleURLName:scheme+' website',CFBundleURLSchemes:[scheme],LSHandlerRank:'Owner'})),
  {CFBundleTypeRole:'Viewer',CFBundleURLName:'Proteus links and sign-in',CFBundleURLSchemes:['proteus','proteus-desktop']}
 ]};
}
module.exports={browserBundleInfo};
