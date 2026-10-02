import { contextPlan } from './context-plan.js';
let u;
const $ = selector => document.querySelector(selector);
const modes = { universal: 'Every chat', workspace: 'With workspace', available: 'Choose per chat', disabled: 'Disabled' };
const types = { instruction: 'Instructions', skill: 'Skills', agent: 'Agents', mcp: 'MCPs' };
export function initFeatures(ui) { u = ui; }
const esc = value => u.escape(value);
const act = async callback => { try { return await callback(); } catch (error) { u.toast(error.message); } };
const pathControl = (file, label) => `<div class="path-control"><label>${esc(label)}</label><div class="filepath">${esc(file || 'Not available yet')}</div>${file ? `<div class="actions"><button data-copy-path="${esc(file)}">Copy path</button><button data-open-path="${esc(file)}">Open ↗</button></div>` : ''}</div>`;
export function bindPaths() {
  document.querySelectorAll('[data-copy-path]').forEach(button => button.onclick = () => act(async () => { if (window.desktop) await window.desktop.copyText(button.dataset.copyPath); else await navigator.clipboard.writeText(button.dataset.copyPath); u.toast('Path copied.'); }));
  document.querySelectorAll('[data-open-path]').forEach(button => button.onclick = () => act(async () => window.desktop ? window.desktop.openPath(button.dataset.openPath) : u.toast(button.dataset.openPath)));
}
async function pick(options) {
  if (window.desktop?.choosePaths) return window.desktop.choosePaths(options);
  throw new Error('Use the desktop app to choose local files or folders.');
}
function contextAction(value) { return act(async () => { await u.api('/api/context', { ...value, expectedRevision: u.state.data.context.revision }); await u.refresh(true); }); }
export function renderContext() {
  const context = u.state.data.context;
  const profile = context.workspaces.find(w => w.id === u.state.contextWorkspace) || context.workspaces.find(w => w.id === context.defaultWorkspaceId);
  u.state.contextWorkspace = profile.id;
  const kind = u.state.contextKind || 'instruction';
  const query = (u.state.contextSearch || '').toLowerCase();
  const entries = context.entries.filter(entry => entry.kind === kind && (!query || (entry.name + ' ' + entry.path).toLowerCase().includes(query)));
  $('#main').innerHTML = `<div class="heading"><div><div class="eyebrow">Reusable context</div><h1>Workspaces & context.</h1><p class="muted">Choose what is available everywhere and what belongs to a particular chat.</p></div><div class="actions"><button id="import-workspace">Import VS Code</button><button class="primary" id="refresh-context">↻ Refresh</button></div></div><div class="grid"><section class="card"><div class="heading"><h2>Workspace folders</h2><button id="new-workspace">＋ Workspace</button></div><div class="field"><label>Workspace</label><select id="workspace-profile">${context.workspaces.map(w => `<option value="${esc(w.id)}" ${w.id === profile.id ? 'selected' : ''}>${esc(w.name)}${w.id === context.defaultWorkspaceId ? ' · default' : ''}</option>`).join('')}</select></div><div class="field"><label>Command starting folder</label><select id="workspace-cwd">${[profile.cwd, ...profile.additionalDirectories].map(folder => `<option ${folder === profile.cwd ? 'selected' : ''}>${esc(folder)}</option>`).join('')}</select></div><div class="actions"><button id="workspace-default">Use as default</button><button id="add-workspace-folder">＋ Add folder</button></div><ul class="folder-list">${[profile.cwd, ...profile.additionalDirectories].map(folder => `<li><span class="filepath">${esc(folder)}</span>${folder !== profile.cwd ? `<button aria-label="Remove ${esc(folder)}" data-remove-folder="${esc(folder)}">×</button>` : '<span class="pill">Command folder</span>'}</li>`).join('')}</ul></section><section class="card"><h2>Sources across workspaces</h2><p class="note">Add another source folder or an individual document. Mark any entry Every chat to include it regardless of the chosen workspace. Repositories stay where they are.</p><div class="actions"><button id="add-library-folder">＋ Source folder</button><button id="add-context-document">＋ Document</button></div><ul class="folder-list">${context.libraryFolders.map(folder => `<li><span class="filepath">${esc(folder)}</span><label class="sharelabel"><input type="checkbox" data-universal-folder="${esc(folder)}" ${context.universalFolders.includes(folder)?'checked':''}>Every chat</label><button data-remove-library="${esc(folder)}">×</button></li>`).join('')}</ul><p class="note">Refresh rescans instructions, skills, agents, and MCP definitions without restarting. New chats use current selections. Existing chats can refresh their context between turns; their previous conversation remains.</p><p class="note">Last refreshed: ${esc(new Date(context.refreshedAt).toLocaleString())}</p>${pathControl(context.file, 'Editable context configuration')}</section></div><section class="card context-card"><div class="heading"><div class="actions">${Object.entries(types).map(([key, title]) => `<button class="${key === kind ? 'primary' : ''}" data-context-kind="${key}">${title} <span class="count">${context.entries.filter(e => e.kind === key).length}</span></button>`).join('')}</div><input id="context-search" aria-label="Filter context" placeholder="Filter by name or path" value="${esc(u.state.contextSearch || '')}"></div><p class="note">Every chat is automatic. With workspace follows its source folder. Choose per chat appears in the chat picker. Disabled excludes automatic loading. Skills supply their instructions; agents are registered for use when needed. MCPs start disabled.</p><div class="context-table"><table><thead><tr><th>Source</th><th>Scope / status</th><th>Load in</th><th></th></tr></thead><tbody>${[true, false].map(favorite => `<tr class="context-group"><th colspan="4">${favorite ? '★ Favorites' : 'Other sources'}</th></tr>` + entries.filter(entry => (context.favorites || []).includes(entry.id) === favorite).map(entry => `<tr><td><strong>${esc(entry.name)}</strong><div class="filepath">${esc(entry.path)}</div>${entry.sources.length > 1 ? `<div class="note">${entry.sources.length} source aliases</div>` : ''}</td><td><span class="pill">${esc(entry.kind)}</span><div class="note">${esc(entry.scope)}</div><div class="note">${entry.missing ? 'Missing source' : entry.unsupportedAgentFields?.length ? 'Unavailable: ' + esc(entry.unsupportedAgentFields.join('; ')) : entry.kind === 'mcp' ? esc(entry.transport) + ' · connection not checked' : 'Discovered · see chat details for delivery'}</div></td><td><select aria-label="Load ${esc(entry.name)}" data-context-mode="${esc(entry.id)}">${Object.entries(modes).map(([mode, label]) => `<option value="${mode}" ${entry.mode === mode ? 'selected' : ''}>${label}</option>`).join('')}</select></td><td><button class="favorite-button subtle" data-catalog-favorite="${esc(entry.id)}" aria-label="${(context.favorites || []).includes(entry.id) ? 'Remove from' : 'Add to'} favorites: ${esc(entry.name)}">${(context.favorites || []).includes(entry.id) ? '★' : '☆'}</button><button data-open-context="${esc(entry.id)}">Open ↗</button></td></tr>`).join('') || '<tr><td colspan="4">No matching sources.</td></tr>').join('')}</tbody></table></div></section>${context.errors.length ? `<section class="banner"><strong>Discovery issues</strong>${context.errors.map(error => `<p>${esc(error.path)}<br>${esc(error.message)}</p>`).join('')}</section>` : ''}`;
  $('#workspace-profile').onchange = event => { u.state.contextWorkspace = event.target.value; renderContext(); };
  $('#workspace-cwd').onchange = event => contextAction({ action: 'workspace', workspaceId: profile.id, name: profile.name, cwd: event.target.value });
  $('#workspace-default').onclick = () => contextAction({ action: 'workspace', workspaceId: profile.id, name: profile.name, cwd: profile.cwd, makeDefault: true });
  $('#refresh-context').onclick = () => act(async () => { $('#refresh-context').disabled = true; await u.api('/api/context/refresh', {}); await u.refresh(true); u.toast('Context refreshed. No app restart needed.'); });
  $('#import-workspace').onclick = () => act(async () => { const files = await pick({ kind: 'workspace' }); if (files.length) await contextAction({ action: 'import', file: files[0] }); });
  const addFolders = library => act(async () => { const folders = await pick({ kind: 'folder', multiple: true }); if (folders.length) await contextAction({ action: 'add-folders', folders, library, workspaceId: profile.id }); });
  $('#add-workspace-folder').onclick = () => addFolders(false); $('#add-library-folder').onclick = () => addFolders(true);
  $('#add-context-document').onclick = () => act(async () => { const files = await pick({ kind: 'markdown' }); if (!files.length) return; u.showDialog('<h2>Add context document</h2><p class="filepath">' + esc(files[0]) + '</p><label>Use as</label><select id="document-kind"><option value="instruction">Instructions / reference</option><option value="skill">Skill</option><option value="agent">Agent</option></select><div class="actions"><button id="close-dialog">Cancel</button><button class="primary" id="dialog-submit">Add</button></div>', () => contextAction({ action: 'document', file: files[0], kind: $('#document-kind').value })); });
  $('#new-workspace').onclick = () => act(async () => { const folders = await pick({ kind: 'folder' }); if (!folders.length) return; u.showDialog('<h2>New workspace</h2><label>Name</label><input id="workspace-name" value="' + esc(folders[0].split('/').pop()) + '"><div class="actions"><button id="close-dialog">Cancel</button><button class="primary" id="dialog-submit">Create</button></div>', () => contextAction({ action: 'workspace', create: true, name: $('#workspace-name').value, cwd: folders[0] })); });
  document.querySelectorAll('[data-remove-folder]').forEach(button => button.onclick = () => contextAction({ action: 'remove-folder', workspaceId: profile.id, folder: button.dataset.removeFolder }));
  document.querySelectorAll('[data-universal-folder]').forEach(input => input.onchange = () => contextAction({ action: 'universal-folder', folder: input.dataset.universalFolder, enabled: input.checked }));
  document.querySelectorAll('[data-remove-library]').forEach(button => button.onclick = () => contextAction({ action: 'remove-folder', library: true, folder: button.dataset.removeLibrary }));
  document.querySelectorAll('[data-context-kind]').forEach(button => button.onclick = () => { u.state.contextKind = button.dataset.contextKind; renderContext(); });
  $('#context-search').oninput = event => { const position = event.target.selectionStart; u.state.contextSearch = event.target.value; renderContext(); $('#context-search').focus(); $('#context-search').setSelectionRange(position, position); };
  document.querySelectorAll('[data-context-mode]').forEach(select => select.onchange = () => contextAction({ action: 'mode', id: select.dataset.contextMode, mode: select.value }));
  document.querySelectorAll('[data-open-context]').forEach(button => button.onclick = () => act(async () => {
    const entry = context.entries.find(e => e.id === button.dataset.openContext);
    if (entry.kind === 'mcp') { if (window.desktop) await window.desktop.openPath(entry.path); else u.toast(entry.path); }
    else { const markdown = await u.api('/api/markdown', { file: entry.path }); u.openTab({ id: 'markdown-' + entry.id, type: 'markdown', label: entry.name, markdown }); }
  }));
  document.querySelectorAll('[data-catalog-favorite]').forEach(button => button.onclick = () => contextAction({ action: 'favorite', id: button.dataset.catalogFavorite, enabled: !(context.favorites || []).includes(button.dataset.catalogFavorite) }));
  bindPaths();
}
export function contextPicker(selected = [], prefix = 'chat', options = {}) {
  const context = u.state.data.context; const favorites = context.favorites || [];
  const entries = context.entries.filter(e => e.mode !== 'disabled' || favorites.includes(e.id));
  const row = entry => `<div class="context-option" data-context-option="${esc((entry.kind + ' ' + entry.name + ' ' + entry.path).toLowerCase())}" data-entry-id="${esc(entry.id)}"><label><input type="checkbox" data-select-context="${esc(entry.id)}"><span><strong>${esc(entry.name)}</strong> <span class="pill">${esc(entry.kind)}</span><br><span class="note" data-load-reason></span><br><span class="filepath">${esc(entry.path)}</span>${entry.unsupportedAgentFields?.length ? `<br><span class="note">Unavailable: ${esc(entry.unsupportedAgentFields.join('; '))}</span>` : ''}</span></label><button type="button" class="favorite-button subtle" data-favorite="${esc(entry.id)}" aria-label="${favorites.includes(entry.id) ? 'Remove from' : 'Add to'} favorites: ${esc(entry.name)}" aria-pressed="${favorites.includes(entry.id)}">${favorites.includes(entry.id) ? '★' : '☆'}</button></div>`;
  const agents = entries.filter(e => e.kind === 'agent' && e.mode !== 'disabled' && e.agent?.userInvocable !== false);
  const agentOptions = list => list.map(entry => `<option value="${esc(entry.id)}" ${entry.id === options.agentId ? 'selected' : ''} ${entry.unsupportedAgentFields?.length || entry.missing ? 'disabled' : ''}>${esc(entry.name)}${entry.unsupportedAgentFields?.length || entry.missing ? ' · unavailable' : ''}</option>`).join('');
  return `<details id="${prefix}-context" class="context-picker" data-selected="${esc(JSON.stringify(selected))}"><summary>Instructions, skills, agents & MCPs</summary><label>Source loading<select id="${prefix}-defaults"><option value="true" ${options.includeDefaults !== false ? 'selected' : ''}>Include every-chat and workspace defaults</option><option value="false" ${options.includeDefaults === false ? 'selected' : ''}>Only selected sources</option></select></label><p class="note">Folder access stays the same. Favorites do not load automatically. Disabled sources stay disabled.</p><div class="context-preview" aria-live="polite"></div><div class="context-favorites"><div class="heading"><h3>Favorites</h3><button type="button" data-check-favorites>Check all favorites</button></div><div class="favorite-options context-options">${entries.filter(e => favorites.includes(e.id)).map(row).join('')}</div><p class="note favorite-empty" ${entries.some(e => favorites.includes(e.id)) ? 'hidden' : ''}>Use ☆ to keep frequently used sources here.</p></div><label>Other sources<input id="${prefix}-context-filter" placeholder="Filter context" aria-label="Filter chat context"></label><div class="other-options context-options">${entries.filter(e => !favorites.includes(e.id)).map(row).join('') || '<p class="note context-empty">No other enabled sources.</p>'}</div><label>Main agent (optional)</label><select id="${prefix}-agent"><option value="">Default assistant</option><optgroup label="Favorites">${agentOptions(agents.filter(e => favorites.includes(e.id)))}</optgroup><optgroup label="Other agents">${agentOptions(agents.filter(e => !favorites.includes(e.id)))}</optgroup></select><button type="button" class="subtle" data-refresh-picker>↻ Refresh sources</button><p class="note">Only selected sources also excludes legacy skill-directory and MCP settings. Copilot's built-in instructions/tools, Proteus browser tool, conversation history, and later file/tool reads are additional context.</p></details>`;
}
export function contextSelection(prefix = 'chat') {
  const root = $('#' + prefix + '-context');
  const selectedIds = [...(root?._selection || JSON.parse(root?.dataset.selected || '[]'))];
  const agentId = $('#' + prefix + '-agent')?.value || null;
  if (agentId && !selectedIds.includes(agentId)) selectedIds.push(agentId);
  return { selectedIds, agentId, includeDefaults: $('#' + prefix + '-defaults')?.value !== 'false' };
}
export function bindContextPicker(prefix = 'chat', options = {}) {
  const root = $('#' + prefix + '-context'); if (!root) return;
  root._selection = new Set(JSON.parse(root.dataset.selected));
  const workspace = () => typeof options.workspace === 'function' ? options.workspace() : options.workspace;
  const update = (changed = false) => {
    const selection = contextSelection(prefix); const plan = contextPlan(u.state.data.context, { ...selection, workspace: workspace() });
    for (const row of root.querySelectorAll('[data-entry-id]')) {
      const entry = u.state.data.context.entries.find(e => e.id === row.dataset.entryId); const loaded = plan.entries.find(e => e.id === entry.id);
      const automatic = selection.includeDefaults && (entry.mode === 'universal' || loaded?.loadReason === 'Workspace');
      const checkbox = row.querySelector('input');
      checkbox.checked = !!loaded; checkbox.disabled = !!(automatic || entry.id === selection.agentId || entry.mode === 'disabled' || entry.missing || entry.unsupportedAgentFields?.length);
      row.querySelector('[data-load-reason]').textContent = entry.mode === 'disabled' ? 'Disabled — enable in Workspaces first' : entry.missing ? 'Missing source' : loaded ? 'Loads: ' + loaded.loadReason : modes[entry.mode];
    }
    const c = plan.counts;
    root.querySelector('.context-preview').innerHTML = `<strong>Will load: ${c.instruction} instructions · ${c.skill} skills · ${c.agent} agents · ${c.mcp} MCPs</strong><p class="note">Instruction/skill bodies: ~${plan.estimatedTextTokens.toLocaleString()} tokens (${plan.textCharacters.toLocaleString()} characters ÷ 4). Estimate excludes agent definitions, tool schemas, wrappers, provider prompt and conversation history.</p><details><summary>Sources and why they load</summary><ul class="loaded-context">${plan.entries.map(entry => `<li>${esc(entry.name)} · ${esc(entry.loadReason)}<div class="filepath">${esc(entry.path)}</div></li>`).join('') || '<li>No repository sources selected.</li>'}</ul></details>`;
    if (changed) options.onChange?.(selection);
  };
  root.updatePreview = () => update();
  root.querySelectorAll('[data-select-context]').forEach(input => input.onchange = () => { if (input.checked) root._selection.add(input.dataset.selectContext); else root._selection.delete(input.dataset.selectContext); update(true); });
  $('#' + prefix + '-defaults').onchange = () => update(true);
  $('#' + prefix + '-agent').onchange = () => update(true);
  const filter = $('#' + prefix + '-context-filter');
  filter.oninput = () => root.querySelectorAll('.other-options [data-context-option]').forEach(row => row.hidden = !row.dataset.contextOption.includes(filter.value.toLowerCase()));
  root.querySelector('[data-check-favorites]').onclick = () => {
    for (const entry of u.state.data.context.entries) if (u.state.data.context.favorites?.includes(entry.id) && entry.mode !== 'disabled' && !entry.missing && !entry.unsupportedAgentFields?.length) root._selection.add(entry.id);
    update(true);
  };
  const rebuild = () => {
    const selection = contextSelection(prefix); const open = root.open;
    const holder = document.createElement('div'); holder.innerHTML = contextPicker(selection.selectedIds.filter(id => root._selection.has(id)), prefix, selection);
    const replacement = holder.firstElementChild; root.replaceWith(replacement); replacement.open = open; bindContextPicker(prefix, options);
  };
  root.querySelectorAll('[data-favorite]').forEach(button => button.onclick = () => act(async () => {
    button.disabled = true;
    try { const context = u.state.data.context; u.state.data.context = await u.api('/api/context', { action: 'favorite', id: button.dataset.favorite, enabled: !context.favorites?.includes(button.dataset.favorite), expectedRevision: context.revision }); rebuild(); }
    finally { button.disabled = false; }
  }));
  root.querySelector('[data-refresh-picker]').onclick = () => act(async () => { u.state.data.context = await u.api('/api/context/refresh', {}); rebuild(); });
  update();
}
export function modelPicker(id, selected) {
  const models = u.state.data.providerStatus?.models || [];
  return `<select id="${id}" data-selected="${esc(selected)}" aria-label="Model">${models.map(model => `<option value="${esc(model.id)}" ${model.id === selected ? 'selected' : ''}>${esc(model.name || model.id)} · ${esc(model.id)}</option>`).join('') || '<option value="">Loading model catalog…</option>'}</select>`;
}
export async function refreshModels(id, providerId, force = false) {
  const select = $('#' + id); if (!select) return;
  if ($('#' + providerId)?.value === 'rehearsal') { select.disabled = true; return; }
  select.disabled = true;
  try {
    const current = select.dataset.selected || select.value;
    const data = !force && u.state.data.providerStatus?.models?.length ? u.state.data.providerStatus : await u.api('/api/provider', {});
    u.state.data.providerStatus = data;
    if ($('#' + id) !== select) return;
    if (!data.models?.length) throw new Error(data.error || 'No models available. Check the Copilot connection.');
    select.innerHTML = `<option value="">Choose a model</option>` + data.models.map(model => `<option value="${esc(model.id)}">${esc(model.name || model.id)} · ${esc(model.id)}</option>`).join('');
    select.value = data.models.some(model => model.id === current) ? current : '';
    select.disabled = $('#' + providerId)?.value === 'rehearsal';
    select.onchange = () => select.dataset.selected = select.value;
  } catch (error) { if ($('#' + id)) select.innerHTML = '<option value="">Model catalog unavailable</option>'; u.toast(error.message); }
}
export function sessionDetails(run) {
  const snapshot = run.schedule.context;
  return `<section class="card"><h2>Session files & context</h2><p class="note">Run ID: ${esc(run.id)}<br>Provider session: ${esc(run.providerSessionId || 'Not created yet')}</p>${pathControl(run.storage?.run, 'Proteus run record')}${pathControl(run.storage?.nativeSession, 'Provider session folder')}<div class="actions"><button data-export="markdown">Export Markdown</button><button data-export="json">Export JSON</button></div><hr class="divider"><h3>${esc(snapshot?.workspaceName || 'Saved workspace')}</h3><p class="filepath">Commands start in ${esc(run.schedule.workspace.cwd)}</p><p class="note">${snapshot?.suppliedAt ? 'Supplied to provider ' + esc(new Date(snapshot.suppliedAt).toLocaleString()) : snapshot ? 'Selected context captured; provider delivery not yet confirmed.' : 'This older session did not record individual context sources.'}</p><ul class="loaded-context">${(snapshot?.entries || []).map(entry => `<li><strong>${esc(entry.name)}</strong> · ${esc(entry.kind === 'agent' ? 'registered agent' : entry.kind === 'mcp' ? 'configured MCP' : entry.kind)}<div class="filepath">${esc(entry.path)}</div><span class="note">Version ${entry.hash.slice(0, 12)}${entry.kind === 'agent' && entry.agent ? '<br>Tools: ' + esc(entry.agent.tools === null ? 'All configured tools' : entry.agent.tools.join(', ') || 'None') : ''}</span></li>`).join('')}</ul>${run.explicitProviderContext ? `<details><summary>Explicit provider configuration</summary><p class="note">Configured MCPs: ${run.explicitProviderContext.mcpNames.map(esc).join(', ') || 'None'}<br>Schedule skill directories: ${run.explicitProviderContext.skillDirectories.map(esc).join(', ') || 'None'}<br>Disabled skills: ${run.explicitProviderContext.disabledSkills.map(esc).join(', ') || 'None'}</p></details>` : ''}<button id="refresh-run-context" ${['queued', 'running', 'awaiting_input'].includes(run.status) ? 'disabled' : ''}>↻ Refresh / choose context</button><p class="note">Updates apply to the next turn. They do not erase earlier conversation context.</p></section>`;
}
export function bindSessionDetails(run) {
  bindPaths();
  document.querySelectorAll('[data-export]').forEach(button => button.onclick = () => act(async () => { const result = await u.api('/api/export', { runId: run.id, format: button.dataset.export }); if (window.desktop) await window.desktop.openPath(result.file); u.toast('Exported ' + result.file); }));
  $('#refresh-run-context').onclick = () => act(async () => {
    await u.api('/api/context/refresh', {}); await u.refresh();
    u.showDialog(`<h2>Refresh chat context</h2>${contextPicker(run.schedule.context?.selectedIds || [], 'run', run.schedule.context || {})}<p class="note">Source changes and current universal selections apply to the next turn. Older context remains in conversation history.</p><div class="actions"><button id="close-dialog">Cancel</button><button class="primary" id="dialog-submit">Apply context</button></div>`, async () => { await u.api('/api/run-context', { runId: run.id, ...contextSelection('run') }); });
    $('#run-agent').value = run.schedule.context?.agentId || ''; bindContextPicker('run', { workspace: run.schedule.context?.baseWorkspace || run.schedule.workspace });
  });
}
export function renderStandup() {
  const value = u.state.data.standup; const current = value.current; const settings = u.state.standupTab === 'settings';
  $('#main').innerHTML = `<div class="heading"><div><div class="eyebrow">Team rhythm</div><h1>Standup.</h1><p class="muted">One current order, ready when you reopen the app.</p></div><div class="actions">${window.desktop?.standupPopout ? `<button id="popout-standup" ${current ? '' : 'disabled'}>↗ Floating standup</button>` : ''}<button class="primary" id="generate-standup">↻ ${current ? 'Regenerate' : 'Generate'} for today</button></div></div><div class="actions subtabs"><button id="standup-current" class="${settings ? '' : 'primary'}">Current order</button><button id="standup-settings" class="${settings ? 'primary' : ''}">Settings</button></div>${settings ? `<section class="card"><div class="row"><div><label>Randomized members · one per line</label><textarea id="standup-random" rows="9">${esc(value.random.join('\n'))}</textarea></div><div><label>Fixed order · appended after randomized members</label><textarea id="standup-fixed" rows="9">${esc(value.fixed.join('\n'))}</textarea></div></div><label>Agenda / instructions</label><textarea id="standup-instructions" rows="5">${esc(value.instructions)}</textarea><div class="field"><label>Time zone</label><input id="standup-timezone" value="${esc(value.timezone)}"></div><button class="primary" id="save-standup">Save settings</button><p class="note">Saving does not change the current order. Generate replaces the saved current result.</p></section>` : `<section class="card standup-order">${current ? `<div class="eyebrow">${esc(current.timezone)}</div><h2>${esc(current.date)} · Standup</h2><ol>${current.order.map(name => `<li>${esc(name)}</li>`).join('')}</ol><h3>Agenda</h3><div class="standup-instructions">${esc(current.instructions)}</div>` : '<p class="empty">Add members in Settings, then generate an order.</p>'}</section>`}`;
  $('#standup-current').onclick = () => { u.state.standupTab = 'current'; renderStandup(); }; $('#standup-settings').onclick = () => { u.state.standupTab = 'settings'; renderStandup(); };
  $('#save-standup')?.addEventListener('click', () => act(async () => { await u.api('/api/standup', { action: 'save', expectedRevision: value.revision, settings: { random: u.lines($('#standup-random').value), fixed: u.lines($('#standup-fixed').value), instructions: $('#standup-instructions').value, timezone: $('#standup-timezone').value } }); await u.refresh(true); u.toast('Standup settings saved.'); }));
  $('#popout-standup')?.addEventListener('click', () => act(() => window.desktop.standupPopout($('#sidebar').getBoundingClientRect().width)));
  $('#generate-standup').onclick = () => act(async () => { await u.api('/api/standup', { action: 'generate', expectedRevision: value.revision }); u.state.standupTab = 'current'; await u.refresh(true); });
}

export async function renderCredentials() {
  if (!window.desktop?.credentials) { $('#main').innerHTML = '<h1>Credentials</h1><p>Credential providers are available in the desktop app.</p>'; return; }
  $('#main').innerHTML = '<h1>Credentials</h1><p class="note">Loading local provider configuration…</p>';
  await act(async () => {
    const config = await window.desktop.credentials({ action: 'get' });
    if (u.state.page !== 'credentials') return;
    $('#main').innerHTML = `<div class="heading"><div><div class="eyebrow">User-controlled sign-in</div><h1>Credential providers.</h1><p class="muted">Fill a login in your browser tab. Finish passkeys and verification yourself.</p></div><button class="primary" id="add-credential-provider">＋ Bitwarden provider</button></div><section class="card"><h2>Providers</h2><p class="note">Use an authenticated official Bitwarden CLI. Proteus keeps the unlock session in memory for up to 15 minutes. Login bindings use exact item and collection IDs. Passwords never enter chat messages or configuration files.</p>${config.providers.map(provider => `<div class="credential-provider"><h3>${esc(provider.name)}</h3><div class="filepath">${esc(provider.command)}<br>${esc(provider.appDataDirectory || 'CLI default data folder')}</div><p class="note" id="credential-status-${esc(provider.id)}">Not checked</p><div class="actions"><button data-credential-login="${esc(provider.id)}">Copy sign-in command</button><button data-credential-status="${esc(provider.id)}">Check connection</button><button data-credential-unlock="${esc(provider.id)}">Unlock</button><button data-credential-lock="${esc(provider.id)}">Lock</button></div></div>`).join('') || '<p class="note">No credential provider configured.</p>'}</section><section class="card context-card"><div class="heading"><h2>Login bindings</h2><button id="add-login-binding" ${config.providers.length ? '' : 'disabled'}>＋ Login binding</button></div><p class="note">A binding authorizes one vault item for exact HTTPS login sites. The same site must be listed on the Bitwarden item. Browser Fill login makes the tab private and never submits the form.</p>${config.bindings.map(binding => `<div class="credential-provider"><h3>${esc(binding.name)}</h3><p class="filepath">${binding.origins.map(esc).join('<br>')}</p><p class="note">${esc(binding.providerId)} · ${esc(binding.scope)} item ${esc(binding.itemId)}</p><button data-remove-binding="${esc(binding.id)}">Remove binding</button></div>`).join('') || '<p class="note">No login bindings yet.</p>'}${pathControl(config.file, 'Nonsecret provider and binding settings')}</section><p class="note">The embedded browser does not currently run the Bitwarden browser extension. This integration uses the official CLI through a separate desktop credential provider. Existing website login sessions remain in the browser profile.</p>`;
    const save = async next => { await window.desktop.credentials({ action: 'save', config: next, expectedRevision: config.revision }); await renderCredentials(); };
    $('#add-credential-provider').onclick = () => u.showDialog(`<h2>Bitwarden provider</h2><div class="credential-fields"><label>Name<input id="credential-provider-name" value="Bitwarden"></label><label>CLI executable<input id="credential-provider-command" value="bw"></label><label>CLI data folder (optional)<input id="credential-provider-data" placeholder="Existing authenticated CLI profile"></label></div><p class="note">Authenticate the CLI with Bitwarden's login flow first. This form stores paths, not passwords or API keys.</p><div class="actions"><button id="close-dialog">Cancel</button><button class="primary" id="dialog-submit">Save provider</button></div>`, async () => {
      const next = structuredClone(config); next.providers.push({ id: 'bitwarden-' + Date.now().toString(36), name: $('#credential-provider-name').value, type: 'bitwarden-cli', command: $('#credential-provider-command').value, appDataDirectory: $('#credential-provider-data').value }); await save(next);
    });
    document.querySelectorAll('[data-credential-login]').forEach(button => button.onclick = () => act(async () => {
      const provider = config.providers.find(p => p.id === button.dataset.credentialLogin);
      const quote = value => "'" + value.replaceAll("'", "'\"'\"'") + "'";
      const command = (provider.appDataDirectory ? 'env BITWARDENCLI_APPDATA_DIR=' + quote(provider.appDataDirectory) + ' ' : '') + quote(provider.command) + ' login';
      await window.desktop.copyText(command); u.toast('Sign-in command copied. Run it in Terminal, finish Bitwarden verification, then Check connection.');
    }));
    document.querySelectorAll('[data-credential-status]').forEach(button => button.onclick = () => act(async () => { const status = await window.desktop.credentials({ action: 'status', providerId: button.dataset.credentialStatus }); $('#credential-status-' + button.dataset.credentialStatus).textContent = [status.status, status.serverUrl, status.userEmail].filter(Boolean).join(' · '); }));
    document.querySelectorAll('[data-credential-unlock]').forEach(button => button.onclick = () => {
      u.showDialog('<h2>Unlock Bitwarden</h2><label>Vault master password<input id="credential-password" type="password" autocomplete="off"></label><p class="note">Used only by the local CLI to unlock this provider. The session expires from Proteus memory after 15 minutes.</p><div class="actions"><button id="close-dialog">Cancel</button><button class="primary" id="dialog-submit">Unlock</button></div>', async () => {
        const password = $('#credential-password').value; $('#credential-password').value = '';
        await window.desktop.credentials({ action: 'unlock', providerId: button.dataset.credentialUnlock, password }); u.toast('Bitwarden unlocked for this Proteus session.');
      });
      $('#dialog').addEventListener('close', () => { const input = $('#credential-password'); if (input) input.value = ''; }, { once: true });
    });
    document.querySelectorAll('[data-credential-lock]').forEach(button => button.onclick = () => act(async () => { await window.desktop.credentials({ action: 'lock', providerId: button.dataset.credentialLock }); u.toast('Bitwarden locked.'); }));
    $('#add-login-binding').onclick = () => u.showDialog(`<h2>Login binding</h2><div class="credential-fields"><label>Name<input id="binding-name" placeholder="Work sign-in"></label><label>Provider<select id="binding-provider">${config.providers.map(provider => `<option value="${esc(provider.id)}">${esc(provider.name)}</option>`).join('')}</select></label><label>Bitwarden item ID<input id="binding-item"></label><label>Vault scope<select id="binding-scope"><option value="organization">Organization and collection</option><option value="personal">Personal vault</option></select></label><label>Organization ID<input id="binding-org"></label><label>Collection ID<input id="binding-collection"></label><label>Exact HTTPS login origins · one per line<textarea id="binding-origins" rows="3" placeholder="https://login.example.com"></textarea></label></div><div class="actions"><button id="close-dialog">Cancel</button><button class="primary" id="dialog-submit">Save binding</button></div>`, async () => {
      const next = structuredClone(config); next.bindings.push({ id: 'login-' + Date.now().toString(36), name: $('#binding-name').value, providerId: $('#binding-provider').value, itemId: $('#binding-item').value, scope: $('#binding-scope').value, organizationId: $('#binding-org').value, collectionId: $('#binding-collection').value, origins: u.lines($('#binding-origins').value) }); await save(next);
    });
    document.querySelectorAll('[data-remove-binding]').forEach(button => button.onclick = () => act(async () => { const next = structuredClone(config); next.bindings = next.bindings.filter(binding => binding.id !== button.dataset.removeBinding); await save(next); }));
    bindPaths();
  });
}
export async function fillBrowserLogin(tabId) {
  await act(async () => {
    const tabs = await window.desktop.browser({ action: 'list' }); const tab = tabs.find(item => item.id === tabId);
    const origin = new URL(tab.url).origin; const config = await window.desktop.credentials({ action: 'get' });
    const bindings = config.bindings.filter(binding => binding.origins.includes(origin));
    if (!bindings.length) throw new Error('Add a login binding for ' + origin + ' in Credentials first.');
    await window.desktop.browser({ action: 'hide' });
    u.showDialog(`<h2>Fill login</h2><p>${esc(origin)}</p><label>Saved login<select id="browser-login-binding">${bindings.map(binding => `<option value="${esc(binding.id)}">${esc(binding.name)}</option>`).join('')}</select></label><p class="note">This tab becomes private. Proteus fills the fields; you submit the form and complete MFA. Agent access stays off until you enable it.</p><div class="actions"><button id="close-dialog">Cancel</button><button class="primary" id="dialog-submit">Fill fields</button></div>`, async () => { await window.desktop.credentials({ action: 'fill', tabId, bindingId: $('#browser-login-binding').value }); u.toast('Login fields filled. Continue sign-in in the private tab.'); });
    $('#dialog').addEventListener('close', () => u.restoreBrowser(), { once: true });
  });
}
