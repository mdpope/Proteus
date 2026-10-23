// Organization is independent of the captured execution/approval context.
export function chatMembership(run){
 const captured={...run?.context,...run?.schedule?.context};
 return Object.hasOwn(run||{},'workspaceId')?{workspaceId:run.workspaceId||null,workspaceName:run.workspaceName||''}:{workspaceId:captured.workspaceId||null,workspaceName:captured.workspaceName||captured.workspaceId||''};
}
