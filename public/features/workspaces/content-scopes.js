// Membership follows open container views even when another project is selected.
// Presentation following still subscribes only to the visible project. A closed
// root is a saved layout, not an active subscription or permission to reopen it.
export function openContentScopes(tabs, visible = []) {
  const scopes = new Map();
  for (const scope of visible) scopes.set(JSON.stringify([scope.hostId || '', scope.scope, scope.id]), scope);
  for (const tab of tabs) {
    if (tab.type !== 'workspace' || tab.navigationClosed || tab.connectionPaused) continue;
    const scope = {scope: tab.projectId ? 'project' : 'workspace', id: tab.projectId || tab.workspaceId, ...(tab.hostId ? {hostId: tab.hostId} : {})};
    scopes.set(JSON.stringify([scope.hostId || '', scope.scope, scope.id]), scope);
  }
  return [...scopes.values()];
}
