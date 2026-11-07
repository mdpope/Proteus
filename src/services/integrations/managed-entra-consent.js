import http from 'node:http';
import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
const fail=()=>Object.assign(Error('Corporate sign-in did not complete. Return to the owning computer.'),{code:'SIGN_IN_REQUIRED'});
const same=(a,b)=>typeof a==='string'&&a.length===b.length&&/^[a-f0-9]+$/.test(a)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));

// MSAL's public auth-code APIs own protocol requests and cache handling. The
// owner owns a bounded loopback receiver so shutdown/expiry closes the listener;
// consent always follows the configured browser-opening boundary.
export async function managedEntraConsent(client,{authority,clientId,scopes,openExternal,signal}){
 const state=randomBytes(32).toString('hex'),nonce=randomBytes(32).toString('hex'),verifier=randomBytes(48).toString('base64url'),challenge=createHash('sha256').update(verifier).digest('base64url');
 let complete,rejectCode,consumed=false;
 const codePromise=new Promise((resolve,reject)=>{complete=resolve;rejectCode=reject;});codePromise.catch(()=>{});
 const server=http.createServer(async(req,res)=>{
  const answer=(status,text)=>{res.writeHead(status,{'content-type':'text/plain; charset=utf-8','cache-control':'no-store','referrer-policy':'no-referrer'});res.end(text);};
  if(req.method!=='POST'||req.url!=='/'||req.headers.host!=='localhost:'+server.address()?.port||req.headers['content-type']?.split(';')[0]!=='application/x-www-form-urlencoded'||consumed){answer(400,'Invalid sign-in callback.');return;}
  try{
   let body='';for await(const chunk of req){body+=chunk.toString('utf8');if(Buffer.byteLength(body)>16000)throw fail();}
   const form=new URLSearchParams(body);if(form.getAll('state').length!==1||!same(form.get('state'),state)||form.getAll('code').length>1)throw fail();
   consumed=true;if(form.has('error')||!form.get('code')||form.get('code').length>10000){rejectCode(fail());answer(400,'Sign-in failed. Return to Proteus.');return;}
   complete({code:form.get('code'),clientInfo:form.get('client_info')||''});answer(200,'Sign-in received. Return to Proteus for account and resource verification.');
  }catch{answer(400,'Invalid sign-in callback.');}
 });
 server.headersTimeout=10000;server.requestTimeout=15000;
 const abort=()=>{rejectCode(fail());server.close();server.closeAllConnections();};signal?.addEventListener('abort',abort,{once:true});
 try{
  signal?.throwIfAborted();await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const redirectUri='http://localhost:'+server.address().port;
  const request={scopes,authority,redirectUri,responseMode:'form_post',codeChallenge:challenge,codeChallengeMethod:'S256',state,nonce,prompt:'select_account'};
  const url=await client.getAuthCodeUrl(request),target=new URL(url);
  if(target.origin!=='https://login.microsoftonline.com'||target.pathname.toLowerCase()!==new URL(authority+'/oauth2/v2.0/authorize').pathname.toLowerCase()||target.searchParams.get('client_id')!==clientId||target.searchParams.get('redirect_uri')!==redirectUri||target.searchParams.get('response_mode')!=='form_post'||target.searchParams.get('state')!==state||target.searchParams.get('nonce')!==nonce||target.searchParams.get('code_challenge')!==challenge)throw fail();
  signal?.throwIfAborted();await openExternal(url);const code=await codePromise;signal?.throwIfAborted();
  const result=await client.acquireTokenByCode({...request,...code,codeVerifier:verifier});signal?.throwIfAborted();
  if(result?.idTokenClaims?.nonce!==nonce)throw fail();return result;
 }finally{signal?.removeEventListener('abort',abort);server.close();server.closeAllConnections();}
}
