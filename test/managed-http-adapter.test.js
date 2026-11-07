import test from 'node:test';
import assert from 'node:assert/strict';
import {managedHttpAdapter} from '../src/services/integrations/managed-http-adapter.js';
const definition={transport:{type:'http',endpoint:'https://mcp.example.test/mcp'},policy:{requestTimeoutMs:1000}};
function fixture(overrides={}){
 const requests=[];let responseStatus=200,invalidations=0;
 const adapter=managedHttpAdapter({qualify:async()=>{},withToken:async(_d,consume)=>consume('synthetic-in-memory-token'),invalidate:async()=>{invalidations++;},verify:async(_d,{call})=>call('read',{}),fetchFn:async(url,init)=>{
  requests.push({url:String(url),method:init.method,headers:Object.fromEntries(init.headers),redirect:init.redirect});
  if(responseStatus!==200)return new Response('private remote failure',{status:responseStatus,headers:{location:'https://wrong.test','retry-after':'7'}});
  const message=JSON.parse(init.body);if(message.id===undefined)return new Response(null,{status:202});
  const result=message.method==='initialize'?{protocolVersion:'2025-03-26',capabilities:{tools:{}},serverInfo:{name:'fixture',version:'1'}}:message.method==='tools/list'?{tools:[{name:'read',inputSchema:{type:'object'},annotations:{readOnlyHint:true}}]}:{content:[{type:'text',text:'synthetic'}]};
  return Response.json({jsonrpc:'2.0',id:message.id,result},{headers:{'mcp-session-id':'synthetic-session'}});
 },...overrides});
 return {adapter,requests,status:value=>{responseStatus=value;},invalidations:()=>invalidations};
}
test('managed HTTP injects credentials only at the exact owner transport and preserves catalog annotations',async t=>{
 const f=fixture(),connection=await f.adapter.connect(definition,{});t.after(()=>connection.close());
 assert.equal((await connection.listTools())[0].annotations.readOnlyHint,true);
 assert.equal((await connection.callTool('read',{},{})).content[0].text,'synthetic');
 assert.ok(f.requests.every(r=>r.url===definition.transport.endpoint&&r.redirect==='manual'&&r.headers.authorization==='Bearer synthetic-in-memory-token'));
});
test('SDK path never replays an uncertain write, follows redirects or broadens OAuth scopes',async t=>{
 for(const [status,code]of [[401,'AUTH_EXPIRED'],[403,'ACCESS_DENIED'],[302,'CONFIGURATION_MISMATCH'],[429,'RATE_LIMITED'],[404,'SESSION_EXPIRED']]){
  const f=fixture(),connection=await f.adapter.connect(definition,{});t.after(()=>connection.close());
  await new Promise(r=>setImmediate(r));const before=f.requests.length;f.status(status);
  await assert.rejects(connection.callTool('write',{},{}),e=>e.code===code&&!e.message.includes('private')&&(status!==429||e.retryAfterMs===7000));
  assert.equal(f.requests.length,before+1,'only the original mutation is transmitted');assert.equal(f.invalidations(),status===401?1:0);
 }
});
test('qualification and exact HTTPS endpoint checks precede credential access',async()=>{
 let accesses=0;
 const f=fixture({withToken:async()=>{accesses++;throw Error('must not access');}});
 await assert.rejects(f.adapter.connect({...definition,transport:{type:'http',endpoint:'http://wrong.test'}},{}),{code:'CONFIGURATION_MISMATCH'});assert.equal(accesses,0);
 const mismatch=fixture({qualify:async()=>{throw Object.assign(Error('not approved'),{code:'CONFIGURATION_MISMATCH'});},withToken:async()=>{accesses++;}});
 await assert.rejects(mismatch.adapter.connect(definition,{}),{code:'CONFIGURATION_MISMATCH'});assert.equal(accesses,0);
});
