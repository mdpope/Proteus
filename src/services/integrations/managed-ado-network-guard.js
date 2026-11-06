import http from 'node:http';
import https from 'node:https';
import {syncBuiltinESMExports} from 'node:module';
import {urlToHttpOptions} from 'node:url';
const fail=()=>Object.assign(Error('Managed ADO destination is outside the configured organization.'),{code:'CONFIGURATION_MISMATCH'});
export function adoRequestTarget(input,organization){
 const url=new URL(input);if(!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,49}$/.test(organization)||url.protocol!=='https:'||url.username||url.password||url.hash||url.port||!['dev.azure.com','vssps.dev.azure.com','almsearch.dev.azure.com'].includes(url.hostname)||url.pathname.split('/')[1]?.toLowerCase()!==organization.toLowerCase())throw fail();return url;
}
// Runs only in the dedicated upstream child. The verified vendor server still
// owns tool behavior; this guard confines credential-bearing HTTP to its pinned
// organization and reports sanitized status, never headers or response bodies.
export function installAdoNetworkGuard(organization,notify){
 const originalFetch=globalThis.fetch,originalRequest=https.request,originalHttp=http.request,originalGet=https.get,originalHttpGet=http.get;
 const response=status=>{const code=status===401?'AUTH_EXPIRED':status===403?'ACCESS_DENIED':status===429?'RATE_LIMITED':null;if(code)notify({code});};
 globalThis.fetch=async(input,init={})=>{
  const url=adoRequestTarget(input instanceof Request?input.url:input,organization);
  const options=input instanceof Request?{method:input.method,headers:input.headers,body:input.body,duplex:'half',signal:input.signal,...init}:init;
  const result=await originalFetch(url,{...options,redirect:'manual'});response(result.status);
  if(result.redirected||result.status>=300&&result.status<400){await result.body?.cancel();throw fail();}return result;
 };
 https.request=function(input,options,callback){
  let opts,cb;
  if(typeof input==='string'||input instanceof URL){opts={...urlToHttpOptions(new URL(input)),...(typeof options==='object'?options:{})};cb=typeof options==='function'?options:callback;}
  else{opts={...input};cb=typeof options==='function'?options:callback;}
  if(opts.socketPath||opts.rejectUnauthorized===false||opts.createConnection||opts.lookup||opts.auth)throw fail();
  const hostname=opts.hostname||opts.host,port=opts.port?':'+opts.port:'',target=adoRequestTarget((opts.protocol||'https:')+'//'+hostname+port+(opts.path||'/'),organization);
  const request=originalRequest.call(https,{...opts,protocol:target.protocol,hostname:target.hostname,host:undefined,port:443},cb);
  request.prependListener('response',res=>{response(res.statusCode);if(res.statusCode>=300&&res.statusCode<400){res.destroy(fail());request.destroy(fail());}});return request;
 };
 https.get=function(...args){const request=https.request(...args);request.end();return request;};
 http.request=()=>{throw fail();};http.get=()=>{throw fail();};syncBuiltinESMExports();
 return ()=>{globalThis.fetch=originalFetch;https.request=originalRequest;https.get=originalGet;http.request=originalHttp;http.get=originalHttpGet;syncBuiltinESMExports();};
}
