// Per-turn native-provider MCP client. Upstream credentials stay in the owner.
import {Server} from '@modelcontextprotocol/sdk/server/index.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {ListToolsRequestSchema,CallToolRequestSchema} from '@modelcontextprotocol/sdk/types.js';
const endpoint=process.env.PROTEUS_MANAGED_MCP_ENDPOINT,capability=process.env.PROTEUS_MANAGED_MCP_CAPABILITY,connection=process.env.PROTEUS_MANAGED_MCP_CONNECTION;
let url;try{url=new URL(endpoint);}catch{throw Error('Managed connection endpoint is unavailable.');}
if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||url.username||url.password||url.search||url.hash||url.pathname!=='/'||! /^[a-f0-9]{64}$/.test(capability||'')||! /^[a-z][a-z0-9-]{0,63}$/.test(connection||''))throw Error('Invalid managed connection capability.');
async function call(body,signal){
 const response=await fetch(endpoint,{method:'POST',headers:{authorization:capability,'content-type':'application/json'},redirect:'error',body:JSON.stringify({...body,connection}),signal});
 if(!response.ok){await response.body?.cancel();throw Error('The owner could not complete this managed connection request. Check its connection status.');}
 const reader=response.body.getReader();let bytes=0;const chunks=[];
 try{for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>16000000)throw Error('Managed tool result is too large.');chunks.push(Buffer.from(value));}}
 finally{await reader.cancel().catch(()=>{});}
 return JSON.parse(Buffer.concat(chunks).toString());
}
const server=new Server({name:'Proteus managed connection',version:'1.0.0'},{capabilities:{tools:{}}});
server.setRequestHandler(ListToolsRequestSchema,(_request,extra)=>call({action:'list'},extra.signal));
server.setRequestHandler(CallToolRequestSchema,(request,extra)=>call({action:'call',name:request.params.name,arguments:request.params.arguments},extra.signal));
await server.connect(new StdioServerTransport());
