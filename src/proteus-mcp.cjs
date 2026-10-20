// Trusted local stdio MCP adapter. The private connection token never appears in tools/results.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createInterface}=require('node:readline');
const home=process.env.PROTEUS_HOME||path.join(os.homedir(),'Library','Application Support','Proteus');
async function api(value){
 const connection=JSON.parse(fs.readFileSync(path.join(home,'connection.json'),'utf8')),url=new URL(connection.origin);
 if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||url.username||url.password||url.pathname!=='/'||!url.port||!connection.token)throw new Error('Proteus local service is unavailable.');
 const response=await fetch(new URL('/api/tabs/manage',url),{method:'POST',headers:{authorization:'Bearer '+connection.token,'content-type':'application/json'},body:JSON.stringify(value),signal:AbortSignal.timeout(30000)});
 const result=await response.json();if(!response.ok)throw new Error(result.error||'Proteus operation failed.');return result;
}
const tools=import('./tab-management.js').then(({tabTools})=>tabTools(api).map(({name,description,parameters})=>({name,description,inputSchema:parameters})));
let requests=Promise.resolve();
createInterface({input:process.stdin}).on('line',line=>{requests=requests.then(async()=>{
 let message;try{
  if(line.length>64000)throw new Error('MCP request exceeds the supported limit.');
  message=JSON.parse(line);if(message.id===undefined)return;let result;
  if(message.method==='initialize')result={protocolVersion:message.params?.protocolVersion||'2024-11-05',capabilities:{tools:{}},serverInfo:{name:'Proteus tab service',version:'1.0.0'}};
  else if(message.method==='ping')result={};
  else if(message.method==='tools/list')result={tools:await tools};
  else if(message.method==='tools/call'){
   if(message.params?.name!=='proteus_tabs')throw new Error('Unknown Proteus tool.');
   try{result={content:[{type:'text',text:JSON.stringify(await api(message.params.arguments))}]};}catch(error){result={isError:true,content:[{type:'text',text:error.message}]};}
  }else throw new Error('Unsupported MCP method.');
  process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:message.id,result})+'\n');
 }catch(error){if(message?.id!==undefined)process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:message.id,error:{code:-32603,message:error.message}})+'\n');}
 }).catch(()=>{});});
