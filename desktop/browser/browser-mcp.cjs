const fs=require('node:fs'),path=require('node:path');
class InProcessMCP {
 constructor(server,outputDir){this.server=server;this.outputDir=outputDir;this.sequence=0;this.pending=new Map();this.transport={start:async()=>{},close:async()=>{},send:async message=>{
  if(message.method&&message.id!==undefined){this.transport.onmessage?.({jsonrpc:'2.0',id:message.id,...(message.method==='roots/list'?{result:{roots:[{uri:require('node:url').pathToFileURL(outputDir).href,name:'Proteus browser artifacts'}]}}:{error:{code:-32601,message:'Client feature unavailable.'}})});return;}
  const pending=this.pending.get(message.id);if(!pending)return;clearTimeout(pending.timer);this.pending.delete(message.id);if(message.error)pending.reject(new Error(message.error.message));else pending.resolve(message.result);
 }};}
 async initialize(){await this.server.connect(this.transport);await this.request('initialize',{protocolVersion:'2025-03-26',capabilities:{roots:{listChanged:false}},clientInfo:{name:'Proteus embedded browser',version:'1.0.0'}});this.transport.onmessage?.({jsonrpc:'2.0',method:'notifications/initialized'});return this;}
 request(method,params={}){return new Promise((resolve,reject)=>{const id=++this.sequence,timer=setTimeout(()=>{this.pending.delete(id);reject(new Error('Browser MCP request timed out.'));},60000);this.pending.set(id,{resolve,reject,timer});try{this.transport.onmessage?.({jsonrpc:'2.0',id,method,params});}catch(error){clearTimeout(timer);this.pending.delete(id);reject(error);}});}
 async close(){for(const request of this.pending.values()){clearTimeout(request.timer);request.reject(new Error('Browser access revoked.'));}this.pending.clear();await this.server.close();}
}
async function playwrightMCP(page,home){
 const outputDir=path.join(home,'browser-artifacts');fs.mkdirSync(outputDir,{recursive:true,mode:0o700});
 const {createConnection}=require('@playwright/mcp');
 const server=await createConnection({capabilities:['core','vision'],imageResponses:'allow',saveSession:false,outputDir},async()=>page.context());
 return new InProcessMCP(server,outputDir).initialize();
}
async function developerMCP(endpoint,home){
 const outputDir=path.join(home,'browser-artifacts');fs.mkdirSync(outputDir,{recursive:true,mode:0o700});
 const {McpServer}=await import('chrome-devtools-mcp/build/src/index.js');
 const {BrowserManager}=await import('chrome-devtools-mcp/build/src/BrowserManager.js');
 const args={wsEndpoint:endpoint,usageStatistics:false,performanceCrux:false,allowUnrestrictedPaths:false,filesystemRoot:[outputDir],categoryExtensions:false,categoryNetwork:true,categoryPerformance:true,categoryNavigation:true,categoryInput:true,categoryDebugging:true,sourceMaps:true};
 const manager=new BrowserManager(args),server=await McpServer.from(args,{browserManager:manager});
 return new InProcessMCP(server,outputDir).initialize();
}
function allowedMCPTool(name,backend){return backend==='playwright'?!['browser_close','browser_tabs','browser_install','browser_file_upload','browser_run_code','browser_evaluate','browser_cookie_list','browser_cookie_set','browser_cookie_delete','browser_storage_state'].includes(name):!['new_page','close_page','emulate','resize_page','upload_file','take_memory_snapshot'].includes(name);}
async function mcpCommand(client,value,onInteraction){const catalog=await client.request('tools/list'),tools=catalog.tools.filter(tool=>allowedMCPTool(tool.name,value.backend));if(value.action==='mcp-list')return {backend:value.backend,tools};if(!tools.some(tool=>tool.name===value.tool))throw new Error('Choose a tool from this tab’s current MCP catalog.');const result=await client.request('tools/call',{name:value.tool,arguments:value.arguments||{}});if(!result.isError&&tools.find(tool=>tool.name===value.tool)?.annotations?.readOnlyHint!==true)onInteraction?.();return result;}
module.exports={InProcessMCP,playwrightMCP,developerMCP,mcpCommand};
