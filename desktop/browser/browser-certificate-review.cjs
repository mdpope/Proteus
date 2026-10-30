const {randomUUID,X509Certificate}=require('node:crypto');
function identity(address,certificate,error){
 const url=new URL(address);if(url.protocol!=='https:'||url.username||url.password)throw Error('Invalid HTTPS address.');
 const cert=new X509Certificate(certificate.data);
 return {url:url.href,origin:url.origin,hostname:url.hostname,error:String(error).slice(0,200),fingerprint:cert.fingerprint256,subject:cert.subject,issuer:cert.issuer,validFrom:cert.validFrom,validTo:cert.validTo};
}
/** Certificate decisions originate on the exact owner-generated error page.
 * Chromium shares SSL decisions by profile, hostname and certificate, across
 * tabs/ports. Match that native scope and keep it transient until app restart.
 */
class BrowserCertificateReview {
 constructor(browser){this.browser=browser;this.states=new WeakMap();this.profiles=new WeakMap();}
 bind(tab,wc){
  let allowed=this.profiles.get(wc.session);if(!allowed){allowed=new Set();this.profiles.set(wc.session,allowed);}const state={allowed,failure:null,accepting:false};this.states.set(tab,state);
  wc.on('certificate-error',(event,url,error,certificate,callback,isMainFrame)=>{
   event.preventDefault();let current;try{current=identity(url,certificate,error);}catch{callback(false);return;}
   const key=JSON.stringify([current.hostname,current.fingerprint,current.error]);
   if(state.allowed.has(key)){callback(true);return;}
   if(isMainFrame)state.failure={...current,key,token:randomUUID()};
   callback(false);
  });
  wc.on('ipc-message',(event,channel,token)=>{if(channel==='proteus:certificate-accept'&&event.senderFrame===wc.mainFrame)void this.accept(tab,token).catch(error=>this.browser.actions?.send({type:'error',id:tab.id,message:error.message}));});
 }
 token(tab,url){const failure=this.states.get(tab)?.failure;return failure&&failure.url===url?failure.token:null;}
 async accept(tab,token){
  const state=this.states.get(tab),failure=state?.failure,wc=tab.view?.webContents,page=tab.errorPage;
  if(!failure||state.accepting||typeof token!=='string'||token!==this.token(tab,page?.url)||!wc||wc.isDestroyed()||wc.getURL()!==page?.documentURL)return false;
  state.accepting=true;
  try{
   state.allowed.add(failure.key);await this.browser.navigate(tab.id,failure.url);
  }finally{state.accepting=false;}
  return true;
 }
}
module.exports={BrowserCertificateReview,identity};
