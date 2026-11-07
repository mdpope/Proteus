// Ask the selected native thread's actual connected server for annotations.
// Never infer read-only status from a tool name or from model-supplied metadata.
export async function codexMcpReadOnly(client,threadId,serverName,toolName){
 try{
  let cursor;const seen=new Set();
  for(let page=0;page<8;page++){
   const result=await client.request('mcpServerStatus/list',{threadId,serverName,detail:'toolsAndAuthOnly',limit:100,...(cursor?{cursor}:{})});
   for(const server of result.data||[])if(server.name===serverName&&server.runtimeStatus==='connected'&&!server.toolsError){
    const matches=Object.values(server.tools||{}).filter(tool=>tool?.name===toolName);
    if(matches.length===1)return matches[0].annotations?.readOnlyHint===true&&matches[0].annotations?.destructiveHint!==true;
   }
   if(!result.nextCursor||seen.has(result.nextCursor))return false;cursor=result.nextCursor;seen.add(cursor);
  }
 }catch{/* Missing/older runtime discovery cannot authorize a tool. */}
 return false;
}
