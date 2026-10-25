import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport,getDefaultEnvironment} from '@modelcontextprotocol/sdk/client/stdio.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {SSEClientTransport} from '@modelcontextprotocol/sdk/client/sse.js';
import {createHash} from 'node:crypto';
import path from 'node:path';

export const mcpFingerprint=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
/** Per-chat clients. Discovery may reconnect; a dispatched tools/call is never
 * retried or switched to another transport after an uncertain result. */
export class MtplxMcp {
  constructor(selected,{connect}={}){this.selected=selected;this.connectClient=connect;this.clients=new Map();this.closing=false;}
  async client(name,signal){
    signal?.throwIfAborted();if(this.closing)throw Error('MCP connection is closing.');
    const config=this.selected()[name];if(!config)throw Error('MCP server is not selected: '+name);
    const fingerprint=mcpFingerprint(config),old=this.clients.get(name);
    if(old){if(old.fingerprint!==fingerprint)throw Error('MCP selection changed. Continue in a new turn before calling tools.');return old.promise;}
    const entry={fingerprint};this.clients.set(name,entry);
    entry.promise=(async()=>{
      if(this.connectClient){const client=await this.connectClient(name,config,signal);entry.client=client;if(this.closing){await client.close();throw Error('MCP connection closed.');}return client;}
      const client=new Client({name:'Proteus MTPLX',version:'1.0.0'},{capabilities:{}});
      let transport;const type=config.type||'stdio';
      if(['stdio','local'].includes(type)){
        if(typeof config.command!=='string'||!config.command.trim()||/[\0\r\n]/.test(config.command))throw Error('Invalid MCP executable.');
        const cwd=config.workingDirectory;
        if(cwd&&(!path.isAbsolute(cwd)||cwd.includes('\0')))throw Error('MCP working directory must be absolute.');
        if(config.args&&(!Array.isArray(config.args)||config.args.some(x=>typeof x!=='string'||x.includes('\0'))))throw Error('Invalid MCP arguments.');
        if(config.env&&(!config.env||Array.isArray(config.env)||Object.entries(config.env).some(([k,v])=>! /^[A-Za-z_][A-Za-z0-9_]*$/.test(k)||typeof v!=='string'||v.includes('\0'))))throw Error('Invalid MCP environment.');
        transport=new StdioClientTransport({command:config.command,args:config.args||[],cwd,env:{...getDefaultEnvironment(),...config.env},stderr:'pipe'});
        transport.stderr?.on('data',()=>{});
      }else if(['http','sse'].includes(type)){
        const url=new URL(config.url);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('Invalid MCP URL.');
        const requestInit={headers:config.headers||{},redirect:'error'};
        transport=type==='sse'?new SSEClientTransport(url,{requestInit}):new StreamableHTTPClientTransport(url,{requestInit,reconnectionOptions:{maxRetries:0,initialReconnectionDelay:1000,maxReconnectionDelay:1000,reconnectionDelayGrowFactor:1}});
      }else throw Error('Unsupported MCP transport: '+type);
      entry.client=client;entry.transport=transport;
      const abort=()=>{void client.close();};signal?.addEventListener('abort',abort,{once:true});
      try{await client.connect(transport,{timeout:15000});signal?.throwIfAborted();if(this.closing)throw Error('MCP connection closed.');return client;}
      catch(error){await client.close().catch(()=>{});throw error;}
      finally{signal?.removeEventListener('abort',abort);}
    })();
    return entry.promise;
  }
  async tools(name,signal){
    const client=await this.client(name,signal),tools=[];let cursor;const seen=new Set();
    do {const result=await client.listTools(cursor?{cursor}:{},{signal,timeout:15000});tools.push(...result.tools);if(tools.length>512)throw Error('MCP tool catalog exceeds 512 entries.');cursor=result.nextCursor;if(cursor&&seen.has(cursor))throw Error('MCP returned a repeated catalog cursor.');seen.add(cursor);}while(cursor);
    const filter=this.selected()[name]?.tools;
    if(filter!==undefined&&(!Array.isArray(filter)||filter.some(t=>typeof t!=='string')))throw Error('Invalid selected MCP tool filter.');
    return tools.filter(t=>!filter||filter.includes('*')||filter.includes(t.name));
  }
  async call(name,tool,args,signal){const client=await this.client(name,signal);return client.callTool({name:tool,arguments:args},undefined,{signal,timeout:Math.min(this.selected()[name]?.timeout||120000,600000)});}
  async status(signal){return {servers:await Promise.all(Object.keys(this.selected()).map(async name=>{try{const tools=await this.tools(name,signal);return {name,status:'connected',scope:'selected-chat',observedAt:new Date().toISOString(),toolCount:tools.length};}catch(error){return {name,status:/401|unauthorized|authentication/i.test(error.message)?'needs-auth':'failed',scope:'selected-chat',observedAt:new Date().toISOString(),error:'MCP connection failed. Inspect the selected server configuration or sign in using its owning client.'};}}))};}
  async close(){this.closing=true;await Promise.allSettled([...this.clients.values()].map(async entry=>{await entry.client?.close();await entry.transport?.close();}));this.clients.clear();}
}
