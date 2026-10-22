const {X509Certificate}=require('node:crypto');
// Observe Chromium's verification result without accepting/rejecting certificates.
// -3 explicitly leaves Chromium's trust and Certificate Transparency checks intact.
class BrowserCertificates {
 constructor(){this.sessions=new WeakMap();}
 install(session){
  if(this.sessions.has(session))return;const hosts=new Map();this.sessions.set(session,hosts);
  session.setCertificateVerifyProc((request,callback)=>{
   try{
    const chain=[],seen=new Set();let current=request.validatedCertificate?.data?request.validatedCertificate:request.certificate;
    while(current?.data&&chain.length<12&&!seen.has(current.data)){seen.add(current.data);const cert=new X509Certificate(current.data);chain.push({subjectName:cert.toLegacyObject().subject?.CN||'',subject:cert.subject,issuer:cert.issuer,validFrom:cert.validFrom,validTo:cert.validTo,fingerprint256:cert.fingerprint256,subjectAltName:cert.subjectAltName});current=current.issuerCert;}
    const hostname=String(request.hostname).toLowerCase();if(hostname&&chain.length){hosts.delete(hostname);hosts.set(hostname,{chain,verified:request.errorCode===0,at:Date.now()});while(hosts.size>256)hosts.delete(hosts.keys().next().value);}
   }catch{/* Missing certificate metadata must never alter trust behavior. */}
   finally{callback(-3);}
  });
 }
 get(session,url,details){
  const host=new URL(url).hostname.toLowerCase(),value=this.sessions.get(session)?.get(host),leaf=value?.chain[0];
  if(!value?.verified||!leaf||!details)return null;
  // Bind the observed chain to the document's TLS metadata, not a subframe or a
  // later connection to the same host. Never fetch a replacement connection.
  if(leaf.subjectName!==details.subjectName||Date.parse(leaf.validFrom)!==details.validFrom*1000||Date.parse(leaf.validTo)!==details.validTo*1000)return null;
  return value;
 }
}
module.exports={BrowserCertificates};
