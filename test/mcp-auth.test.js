import test from 'node:test';
import assert from 'node:assert/strict';
import {CopilotProvider} from '../src/copilot.js';
const run={id:'test',providerSessionId:'session',schedule:{mcpServers:{atlassian:{type:'http',url:'https://example.test/mcp'}}}};
const fixture=()=>{const calls=[];const provider=new CopilotProvider();provider.sessions.set('test',{rpc:{mcp:{list:async()=>({servers:[{name:'atlassian',status:'needs-auth',config:{headers:{Authorization:'secret'}}}]}),oauth:{login:async params=>{calls.push(params);return {authorizationUrl:'https://example.test/oauth?state=private'};}}}}});return {provider,calls};};
test('MCP status exposes selected connection metadata without server credentials',async()=>{const {provider}=fixture();const result=await provider.mcpStatus(run);assert.equal(result.servers[0].status,'needs-auth');assert.ok(!JSON.stringify(result).includes('secret'));assert.equal(result.servers.length,1);});
test('OAuth uses native runtime login and rejects unselected servers and unsafe links',async()=>{const {provider,calls}=fixture();const value=await provider.mcpLogin(run,'atlassian');assert.equal(value.status,'sign-in-required');assert.equal(calls[0].clientName,'Proteus');assert.equal(calls[0].forceReauth,undefined);await assert.rejects(provider.mcpLogin(run,'unselected'),/selected remote/);provider.sessions.get('test').rpc.mcp.oauth.login=async()=>({authorizationUrl:'file:///private/token'});await assert.rejects(provider.mcpLogin(run,'atlassian'),/unsafe/);assert.equal(run.events,undefined);});

test('Mac OAuth endpoint and chat command open sign-in without persisting authorization URLs',async()=>{
 const fs=await import('node:fs');const os=await import('node:os');const path=await import('node:path');const {startServer}=await import('../src/server.js');
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-auth-api-'));const opened=[];let logins=0;
 const adapter={run:async()=>{},selectedMcp:()=>({atlassian:{type:'http'}}),mcpStatus:async()=>({servers:[{name:'atlassian',status:'needs-auth',remote:true}]}),mcpLogin:async()=>{logins++;return {server:'atlassian',status:'sign-in-required',authorizationUrl:'https://example.test/auth?state=PRIVATE_OAUTH_STATE'};}};
 const app=await startServer({home,port:0,timers:false,withSeed:false,providers:{copilot:adapter},openExternal:async url=>opened.push(url)});
 const post=async(route,value)=>{const res=await fetch(app.origin+route,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${app.token}`},body:JSON.stringify(value)});const body=await res.json();assert.equal(res.status,200,body.error);return body;};
 try {const run=app.engine.createRun({schemaVersion:1,id:'mcp-auth',name:'MCP Auth',enabled:false,provider:'copilot',model:'synthetic',cron:'0 9 * * *',timezone:'UTC',workspace:{cwd:home,additionalDirectories:[]},prompt:'Synthetic auth fixture',misfire:'skip'});await new Promise(r=>setTimeout(r,10));
 const login=await post('/api/mcp',{runId:run.id,action:'login',server:'atlassian',openOnMac:true});assert.equal(login.openedOnMac,true);assert.equal(login.authorizationUrl,undefined);
 await post(`/api/runs/${run.id}/send`,{prompt:'/mcp auth atlassian',messageId:'auth-command'});await post(`/api/runs/${run.id}/send`,{prompt:'/mcp auth atlassian',messageId:'auth-command'});assert.equal(logins,2);assert.equal(opened.length,2);assert.ok(!fs.readFileSync(path.join(home,'runs',run.id+'.json'),'utf8').includes('PRIVATE_OAUTH_STATE'));
 }finally{await app.close();fs.rmSync(home,{recursive:true,force:true});}
});
