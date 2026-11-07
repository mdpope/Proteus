import {createServer} from 'node:http';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {fileURLToPath} from 'node:url';

// An ephemeral host capability binds a provider's stdio client to one run lease.
// It is not an upstream OAuth credential, and is never written to a schedule.
export async function managedMcpBridge(manager,options){
 const lease=manager.lease(options),capability=randomBytes(32).toString('hex');
 let endpoint,closing=false;const controllers=new Set();
 const server=createServer(async(req,res)=>{
  const supplied=Buffer.from(String(req.headers.authorization||''));
  if(closing||req.method!=='POST'||req.url!=='/'||req.headers.origin||req.headers.host!==new URL(endpoint).host||supplied.length!==capability.length||!timingSafeEqual(supplied,Buffer.from(capability))){res.writeHead(403);res.end();return;}
  const controller=new AbortController();controllers.add(controller);
  const disconnected=()=>{if(!res.writableEnded)controller.abort();};res.on('close',disconnected);
  try{
   if(!String(req.headers['content-type']||'').startsWith('application/json'))throw Error('Unsupported request.');
   let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>1100000)throw Error('Request too large.');}
   const value=JSON.parse(body);let result;
   if(value.action==='list')result={tools:await lease.catalog(value.connection)};
   else if(value.action==='call')result=await lease.call(value.connection,value.name,value.arguments,{signal:controller.signal});
   else throw Error('Unknown operation.');
   const bytes=JSON.stringify(result);if(Buffer.byteLength(bytes)>16000000)throw Error('Result too large.');
   if(!res.destroyed){res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});res.end(bytes);}
  }catch(error){
   if(!res.destroyed){res.writeHead(400,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify({error:'Managed MCP operation failed.',code:typeof error?.code==='string'&&/^[A-Z_]{1,60}$/.test(error.code)?error.code:'FAILED'}));}
  }finally{controllers.delete(controller);res.off('close',disconnected);}
 });
 server.requestTimeout=30000;server.headersTimeout=10000;
 try{await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});}
 catch(error){lease.close();throw error;}
 endpoint='http://127.0.0.1:'+server.address().port+'/';
 const servers=Object.fromEntries(options.bindings.map(binding=>[binding.name,{
  type:'stdio',command:process.execPath,args:[fileURLToPath(new URL('../../managed-mcp-client.mjs',import.meta.url))],
  env:{ELECTRON_RUN_AS_NODE:'1',PROTEUS_MANAGED_MCP_ENDPOINT:endpoint,PROTEUS_MANAGED_MCP_CAPABILITY:capability,PROTEUS_MANAGED_MCP_CONNECTION:binding.name}
 }]));
 return {servers,close:async()=>{
  if(closing)return;closing=true;lease.close();for(const controller of controllers)controller.abort();
  server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
 }};
}
