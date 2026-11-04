const runFields=['id','title','trigger','chatType','status','createdAt','updatedAt','lastActivityAt','archivedAt','archived','attentionRequired','unansweredQuestionCount','provider','workspaceId','workspaceName','projectId','projectName'];
const pick=(value,keys)=>Object.fromEntries(keys.filter(key=>value?.[key]!==undefined).map(key=>[key,value[key]]));

// Sidebar navigation uses the already-authenticated push state. Source bodies,
// provider catalogs and per-tool progress belong to explicit detail requests.
// Keep this in owner memory only; never persist another copy of remote context.
export function workspaceSnapshot(state){
 if(!state?.context||!Array.isArray(state.context.workspaces))return null;
 const {entries, ...context}=state.context;
 const {sourceEntries,sourceLibrary,...projects}=state.workspaceProjects||{};
 return {hostName:state.hostName,context:{...context,entries:[]},capabilities:state.capabilities||[],
  ...(state.workspaceProjects?{workspaceProjects:{...projects,sourceEntries:[],sourceLibrary:[]}}:{}),
  runs:(state.runs||[]).map(run=>pick(run,runFields))};
}
