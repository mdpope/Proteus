// Reads and mutation acknowledgements can finish behind a newer owner push.
export function acceptWebTabs(view, tabs) {
    if ((tabs?.revision || 0) < (view.tabs?.revision || 0)) return false;
    const existing = new Map((view.tabs?.tabs || []).map(tab => [tab.id, tab]));
    if ((tabs.tabs || []).some(tab => (tab.history?.revision || 0) < (existing.get(tab.id)?.history?.revision || 0))) return false;
    const changed = JSON.stringify(view.tabs) !== JSON.stringify(tabs);
    view.tabs = tabs;
    return changed;
}
