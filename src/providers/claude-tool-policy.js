const nativeGroups={view:['Read'],grep:['Grep'],glob:['Glob'],rg:['Grep'],edit:['Edit','MultiEdit'],create:['Write'],apply_patch:['Write','Edit','MultiEdit'],bash:['Bash'],powershell:['Bash'],task:['Agent','Task'],web_fetch:['WebFetch'],web_search:['WebSearch']};
const core=new Set(['AskUserQuestion','ToolSearch']);
function mainTools(managed){return managed?.customAgents?.find(agent=>agent.name===managed.agent)?.tools??null;}
export function claudeToolAllowed(name,{managed,servers={}}={}){
 if(core.has(name))return true;
 const tools=mainTools(managed);
 if(name.startsWith('mcp__')){
  const server=Object.keys(servers).sort((a,b)=>b.length-a.length).find(server=>name.startsWith('mcp__'+server+'__'));
  if(!server)return false;
  const tool=name.slice(('mcp__'+server+'__').length),filter=servers[server].tools;
  if(filter&&!filter.includes('*')&&!filter.includes(tool))return false;
  if(tools===null)return true;
  if(server==='proteus_app')return tools.includes(tool)||tool==='proteus_exec'&&tools.some(value=>['bash','powershell'].includes(value))||['proteus_question_attachments','proteus_attachments','proteus_folder_access'].includes(tool);
  return tools.includes(server+'/'+tool)||tools.includes(server+'/*');
 }
 if(tools===null)return true;
 return tools.some(tool=>(nativeGroups[tool]||[tool]).includes(name));
}
