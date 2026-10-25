// Synthetic MCP used by local adapter and opt-in model/UI acceptance tests.
import {Server} from '@modelcontextprotocol/sdk/server/index.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {ListToolsRequestSchema,CallToolRequestSchema} from '@modelcontextprotocol/sdk/types.js';
const server=new Server({name:'Proteus synthetic MCP',version:'1.0.0'},{capabilities:{tools:{}}});
server.setRequestHandler(ListToolsRequestSchema,async()=>({tools:[{name:'echo',description:'Return the supplied value exactly. Use to verify the selected MCP connection.',inputSchema:{type:'object',properties:{value:{type:'string'}},required:['value'],additionalProperties:false},annotations:{readOnlyHint:true}},{name:'pilot_token',description:'Return the synthetic verification token for this test. Call this when asked for the MCP pilot token; do not guess.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true}}]}));
server.setRequestHandler(CallToolRequestSchema,async request=>{if(!['echo','pilot_token'].includes(request.params.name))throw Error('Unknown fixture tool');return {content:[{type:'text',text:request.params.name==='pilot_token'?(process.env.PROTEUS_SYNTHETIC_TOKEN||'SYNTHETIC_ONLY'):String(request.params.arguments.value)}]};});
await server.connect(new StdioServerTransport());
