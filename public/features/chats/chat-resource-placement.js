// Display placement is independent of the chat's captured file/approval context.
export function chatResourcePlacement(runId,session,{workspaceId}={}){
 const tabs=session?.tabs||[],views=tabs.filter(tab=>tab.type==='run'&&!tab.hostId&&(tab.runId||tab.id)===runId);
 for(const view of views){const parent=tabs.find(tab=>tab.id===view.parentId&&tab.type==='workspace'&&!tab.hostId);if(parent&&(!workspaceId||parent.workspaceId===workspaceId))return {scope:'workspace',id:parent.workspaceId,parentId:parent.id,afterId:view.id};}
 const standalone=views.find(view=>!view.parentId);if(standalone)return {scope:'chat',id:runId,parentId:standalone.id};
 const workspace=workspaceId&&tabs.find(tab=>tab.type==='workspace'&&!tab.hostId&&tab.workspaceId===workspaceId);
 return workspace?{scope:'workspace',id:workspaceId,parentId:workspace.id}:{scope:'chat',id:runId,parentId:runId};
}
