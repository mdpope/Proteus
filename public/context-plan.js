// Shared by the host and desktop preview. Folder access is independent of loaded sources.
export function contextPlan(catalog, { workspace, workspaceId, selectedIds = [], agentId = null, includeDefaults = true } = {}) {
  const profile = catalog.workspaces.find(w => w.id === (workspaceId || catalog.defaultWorkspaceId));
  const base = workspace || profile || { cwd: '', additionalDirectories: [] };
  const roots = [...new Set([base.cwd, ...(base.additionalDirectories || []), ...(catalog.universalFolders || [])])];
  const entries = catalog.entries.flatMap(entry => {
    if (entry.mode === 'disabled') return [];
    const reason = entry.id === agentId ? 'Main agent' : selectedIds.includes(entry.id) ? 'Selected' : includeDefaults && entry.mode === 'universal' ? 'Every chat' : includeDefaults && entry.mode === 'workspace' && entry.roots.some(root => roots.includes(root)) ? 'Workspace' : null;
    return reason ? [{ ...entry, loadReason: reason }] : [];
  });
  const counts = Object.fromEntries(['instruction', 'skill', 'agent', 'mcp'].map(kind => [kind, entries.filter(e => e.kind === kind).length]));
  const textCharacters = entries.filter(e => ['instruction', 'skill'].includes(e.kind)).reduce((sum, e) => sum + (e.characters || 0), 0);
  return { entries, counts, roots, textCharacters, estimatedTextTokens: Math.ceil(textCharacters / 4) };
}
