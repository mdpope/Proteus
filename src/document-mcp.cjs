// Narrow stdio MCP client; capability and endpoint exist only during the owning turn.
const {createInterface}=require('node:readline');
const endpoint=process.env.PROTEUS_DOCUMENT_ENDPOINT,capability=process.env.PROTEUS_DOCUMENT_CAPABILITY;
const resultHelpers=import('./shared/tool-results.js');
async function call(body){const response=await fetch(endpoint,{method:'POST',headers:{authorization:capability,'content-type':'application/json'},body:JSON.stringify(body)});const result=await response.json();if(!response.ok)throw new Error(result.error||'Document operation failed.');return result;}
createInterface({input:process.stdin}).on('line',async line=>{let message;try{message=JSON.parse(line);if(message.id===undefined)return;let result;
 if(message.method==='initialize')result={protocolVersion:message.params.protocolVersion,capabilities:{tools:{}},serverInfo:{name:'Proteus documents',version:'1.0'}};
 else if(message.method==='ping')result={};
 else if(message.method==='tools/list')result={tools:await call({action:'list'})};
 else if(message.method==='tools/call'){if(!(await call({action:'list'})).some(tool=>tool.name===message.params?.name))throw new Error('Unknown tool.');try{result=(await resultHelpers).mcpToolResult(await call({action:'call',name:message.params.name,arguments:message.params.arguments}));}catch(error){result={isError:true,content:[{type:'text',text:error.message}]};}}
 else throw new Error('Unsupported method.');process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:message.id,result})+'\n');
 }catch(error){if(message?.id!==undefined)process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:message.id,error:{code:-32603,message:error.message}})+'\n');}});
