// A workspace contains views of chats. Preview authority stays with the chat,
// while its tab is displayed inside the workspace navigation.
export function remotePreviewOwner(tabs,selectedId){
 const selected=tabs.find(tab=>tab.id===selectedId),container=tabs.find(tab=>tab.id===selected?.parentId);
 const run=selected?.type==='remote-run'?selected:container?.type==='remote-run'?container:selected?.type==='remote-document'&&selected.runId?selected:null;
 if(!run||run.connectionPaused||container?.connectionPaused)return null;
 return {run,parentId:container?.type==='workspace'?container.id:run.type==='remote-run'?run.id:run.parentId};
}
