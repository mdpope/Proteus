// Trusted local stdio MCP adapter. The private connection token never appears in tools/results.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createInterface}=require('node:readline');
const home=import('./shared/files.js').then(({defaultHome})=>process.env.PROTEUS_HOME||defaultHome());
async function api(value,route='/api/tabs/manage'){
 const connection=JSON.parse(fs.readFileSync(path.join(await home,'connection.json'),'utf8')),url=new URL(connection.origin);
 if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||url.username||url.password||url.pathname!=='/'||!url.port||!connection.token)throw new Error('Proteus local service is unavailable.');
 const response=await fetch(new URL(route,url),{method:'POST',headers:{authorization:'Bearer '+connection.token,'content-type':'application/json'},body:JSON.stringify(value),signal:AbortSignal.timeout(120000)});
 const result=await response.json();if(!response.ok)throw new Error(result.error||'Proteus operation failed.');return result;
}
const registrations=Promise.all([import('./services/workspaces/tab-management.js'),import('./services/remote/desktop-control.js'),import('./shared/tool-results.js'),import('./services/updates/updates.js'),import('./services/chats/chat-control-tools.js'),import('./services/tools/terminal-agent.js')]).then(([{tabTools},{desktopTools},results,{updateTools},{chatControlTools},{terminalTools}])=>({tools:[...tabTools(api),...terminalTools(args=>api(args,'/api/terminal-agent')),...desktopTools({handle:args=>api(args,'/api/desktop-control')}),...updateTools({handle:args=>api(args,'/api/updates')}),...chatControlTools({handle:args=>api(args,'/api/chat-control')})],results}));
const tools=registrations.then(({tools})=>tools.map(({name,description,parameters})=>({name,description,inputSchema:parameters})));
let inflight=0;
createInterface({input:process.stdin}).on('line',async line=>{
 let message,counted=false;try{
  if(line.length>64000)throw new Error('MCP request exceeds the supported limit.');
  message=JSON.parse(line);if(message.id===undefined)return;if(inflight>=32)throw new Error('Too many concurrent MCP requests.');inflight++;counted=true;let result;
  if(message.method==='initialize')result={protocolVersion:message.params?.protocolVersion||'2024-11-05',capabilities:{tools:{}},serverInfo:{name:'Proteus tab service',version:'1.0.0'}};
  else if(message.method==='ping')result={};
  else if(message.method==='tools/list')result={tools:await tools};
  else if(message.method==='tools/call'){
   const {tools,results}=await registrations,tool=tools.find(tool=>tool.name===message.params?.name);if(!tool)throw new Error('Unknown Proteus tool.');
   try{result=results.mcpToolResult(await tool.handler(message.params.arguments));}catch(error){result={isError:true,content:[{type:'text',text:error.message}]};}
  }else throw new Error('Unsupported MCP method.');
  process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:message.id,result})+'\n');
 }catch(error){if(message?.id!==undefined)process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:message.id,error:{code:-32603,message:error.message}})+'\n');}
 finally{if(counted)inflight=Math.max(0,inflight-1);}
});
