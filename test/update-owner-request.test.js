import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{ownerRequest}=require('../desktop/updates/owner-request.cjs'),{verifyRecovery}=require('../desktop/updates/recovery-verification.cjs');
const job={home:'/synthetic',id:'fixture',secret:'private-fixture-secret'},connection={origin:'http://127.0.0.1:4317',pid:42,token:'private-token'};
const options={readConnection:()=>connection,isAlive:()=>true};
const reason=async(extra,code)=>{
 const request=(job,route,body,budget)=>ownerRequest(job,route,body,{...options,...extra,...budget});
 await assert.rejects(verifyRecovery(job,{}, {timeout:0,request}),error=>{assert.match(error.message,new RegExp('last check: '+code+'$'));assert.doesNotMatch(error.message,/private-token|private-fixture-secret|sensitive|private.invalid/);return true;});
};
test('owner recovery diagnostics distinguish connection, process and transport failures without secrets',async()=>{
 await reason({readConnection:()=>{throw Object.assign(Error('sensitive'),{code:'ENOENT'});}},'owner-connection-missing');
 await reason({readConnection:()=>{throw Error('sensitive');}},'owner-connection-invalid');
 for(const bad of [{origin:'https://private.invalid'}, {pid:0},{token:''},{origin:'http://user:password@127.0.0.1/'}])await reason({readConnection:()=>({...connection,...bad})},'owner-connection-invalid');
 await reason({isAlive:()=>false},'owner-process-unavailable');
 await reason({fetch:async()=>{throw Error('sensitive');}},'owner-transport-failed');
 await reason({fetch:async()=>{throw Object.assign(Error('sensitive'),{name:'TimeoutError'});}},'owner-request-timeout');
});
test('owner recovery diagnoses malformed/HTTP responses and retains recognized preservation reasons',async()=>{
 await reason({fetch:async()=>({json:async()=>{throw Error('sensitive');}})},'owner-response-invalid');
 await reason({fetch:async()=>({ok:true,json:async()=>null})},'owner-response-invalid');
 await reason({fetch:async()=>({ok:false,status:401,json:async()=>({error:'sensitive https://private.invalid'})})},'owner-http-401');
 await reason({fetch:async()=>({ok:false,status:500,json:async()=>({error:'The restored app window is not ready.'})})},'window-not-ready');
 let sent;const value=await ownerRequest(job,'/api/updates/recovery',{action:'verify'},{...options,fetch:async(url,args)=>{sent=args;return {ok:true,json:async()=>({identity:{barrier:true}})};}});
 assert.equal(value.identity.barrier,true);assert.equal(sent.headers.Authorization,'Bearer private-token');assert.equal(sent.method,'POST');
});
test('untrusted diagnostic labels cannot enter recovery receipts',async()=>{
 await assert.rejects(verifyRecovery(job,{}, {timeout:0,request:async()=>{throw Object.assign(Error('sensitive'),{recoveryFailure:'owner-http-500-sensitive'});}}),/last check: owner-request-failed$/);
});
