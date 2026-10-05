let ui;
export function initMarkdownPicker(value) { ui = value; }
const $ = selector => document.querySelector(selector);
export async function openMarkdownPicker(initialMode = 'open', parentId = null, onOpened = null) {
  const esc = ui.escape;
  let mode = initialMode === 'new' ? 'new' : 'open', rootId = '', directory = '', selected = '', offset = 0, generation = 0, listing, busy = false, roots = [];
  ui.showDialog(`<div id="markdown-picker"><h2>Markdown</h2><div class="md-picker-modes" role="tablist" aria-label="Markdown action"><button type="button" id="md-mode-open" role="tab">Open existing</button><button type="button" id="md-mode-new" role="tab">New file</button></div><label class="field">Workspace folder<select id="md-root" aria-label="Workspace folder"><option>Loading workspaces…</option></select></label><p id="md-root-path" class="filepath note"></p><nav id="md-breadcrumb" class="md-picker-breadcrumb" aria-label="Current folder"></nav><div id="md-picker-list" class="md-picker-list" role="group" aria-label="Folders and Markdown files"></div><div id="md-pagination" class="actions"></div><div class="md-new-folder"><label>New folder<input id="md-folder-name" placeholder="Folder name" autocomplete="off"></label><button type="button" id="md-create-folder">Create folder here</button></div><div id="md-new-fields"><label class="field">Filename<input id="md-file-name" placeholder="Notes.md" autocomplete="off"></label><details><summary>Initial content (optional)</summary><textarea id="md-content" rows="5" aria-label="Initial Markdown content"></textarea></details></div><p id="md-selection" class="note"></p><p id="md-picker-status" class="note" role="status"></p><div class="actions"><button id="close-dialog">Cancel</button><button class="primary" id="dialog-submit">Open tab</button></div></div>`, async () => {
    if (busy || !rootId) throw new Error('Wait for the selected workspace folder to load.');
    let document;
    if (mode === 'new') document = await ui.api('/api/workspace-files/create', { rootId, directory, name: $('#md-file-name').value, content: $('#md-content').value });
    else { if (!selected) throw new Error('Choose a Markdown file to open.'); document = await ui.api('/api/workspace-files/read', { rootId, file: selected }); }
    const tab = { id: 'markdown:' + document.file, type: 'markdown', label: document.file.split('/').pop(), markdown: document, ...(parentId?{parentId}:{}) };
    if (onOpened) onOpened(tab); else ui.openTab(tab);
  });
  const host = $('#markdown-picker'), dialog = $('#dialog');
  const alive = () => $('#markdown-picker') === host && dialog.open;
  const status = message => { if (alive()) $('#md-picker-status').textContent = message; };
  const fail = error => { status(error.message); ui.toast(error.message); };
  const update = () => {
    if (!alive()) return;
    $('#md-mode-open').setAttribute('aria-selected', String(mode === 'open')); $('#md-mode-new').setAttribute('aria-selected', String(mode === 'new'));
    $('#md-new-fields').hidden = mode !== 'new'; $('#dialog-submit').textContent = mode === 'new' ? 'Create & open' : 'Open tab';
    $('#dialog-submit').disabled = busy || !rootId || (mode === 'open' && !selected);
    $('#md-create-folder').disabled = busy || !rootId;
    $('#md-selection').textContent = mode === 'open' ? selected ? 'Selected: ' + selected : 'Choose a file, or open a folder to browse inside it.' : 'Create in: ' + (directory || 'Workspace root') + '. Existing files are never overwritten.';
  };
  const selectMode = value => { mode = value; update(); if (value === 'new') $('#md-file-name').focus(); };
  $('#md-mode-open').onclick = () => selectMode('open'); $('#md-mode-new').onclick = () => selectMode('new');
  function drawList() {
    const parts = directory ? directory.split('/') : [];
    $('#md-root-path').textContent = listing.root.path;
    $('#md-breadcrumb').innerHTML = `<button type="button" id="md-all-roots">All folders</button><span aria-hidden="true">/</span><button type="button" data-md-folder="">${esc(listing.root.name)}</button>${parts.map((part,index)=>`<span aria-hidden="true">/</span><button type="button" data-md-folder="${esc(parts.slice(0,index+1).join('/'))}">${esc(part)}</button>`).join('')}`;
    $('#md-picker-list').innerHTML = listing.entries.length ? listing.entries.map(entry => `<button type="button" class="md-picker-entry" data-md-kind="${entry.kind}" data-md-path="${esc(entry.path)}" aria-pressed="${entry.kind === 'markdown' && entry.path === selected}"><span aria-hidden="true">${entry.kind === 'folder' ? '▸' : '▤'}</span><span>${esc(entry.name)}</span><span class="note">${entry.kind === 'folder' ? 'Folder' : entry.size > 1_000_000 ? 'Too large to preview' : 'Markdown'}${entry.symlink ? ' · link' : ''}</span></button>`).join('') : '<p class="note">No folders or Markdown files here. Create a file or folder in this location.</p>';
    $('#md-pagination').innerHTML = `${offset > 0 ? '<button type="button" id="md-previous">Previous page</button>' : ''}${listing.nextOffset !== null ? '<button type="button" id="md-next">Next page</button>' : ''}`;
    $('#md-all-roots').onclick = drawRoots;
    host.querySelectorAll('[data-md-folder]').forEach(button => button.onclick = () => navigate(button.dataset.mdFolder));
    host.querySelectorAll('[data-md-kind]').forEach(button => button.onclick = () => {
      if (button.dataset.mdKind === 'folder') return navigate(button.dataset.mdPath);
      selected = button.dataset.mdPath;
      if (mode === 'new') { $('#md-file-name').value = selected.split('/').pop(); status('This file exists. Use Open existing to read it, or choose a different filename.'); }
      else status('');
      drawList(); update();
    });
    $('#md-previous')?.addEventListener('click', () => { offset = Math.max(0,offset-listing.pageSize); void load().catch(fail); });
    $('#md-next')?.addEventListener('click', () => { offset = listing.nextOffset; void load().catch(fail); });
    if (listing.scanLimited) status('Only the first 10,000 entries were scanned. Add a more specific workspace folder in Workspaces if needed.');
  }
  function drawRoots() {
    generation++;busy=false;rootId='';directory='';selected='';offset=0;listing=null;
    $('#md-root').value='';$('#md-root-path').textContent='All configured workspaces, shared repositories and every-chat folders.';
    $('#md-breadcrumb').innerHTML='<span>All folders</span>';
    $('#md-picker-list').innerHTML=roots.map(root=>`<button type="button" class="md-picker-entry" data-md-root-id="${esc(root.id)}" ${root.available?'':'disabled'}><span aria-hidden="true">▸</span><span>${esc(root.name)}<small class="filepath">${esc(root.path)}</small></span><span class="note">${esc(root.workspaceName)}${root.available?'':' · unavailable'}</span></button>`).join('')||'<p>No folders configured. Add a folder in Workspaces.</p>';
    $('#md-pagination').innerHTML='';status('Choose any configured folder to browse its subfolders.');
    host.querySelectorAll('[data-md-root-id]').forEach(button=>button.onclick=()=>{rootId=button.dataset.mdRootId;$('#md-root').value=rootId;void load().catch(fail);});update();
  }
  async function load() {
    const request = ++generation; busy = true; selected = ''; update(); status('Loading folder…');
    try {
      const result = await ui.api('/api/workspace-files/list', { rootId, directory, offset });
      if (!alive() || request !== generation) return;
      listing = result; directory = result.directory; status(''); drawList();
    } finally { if (alive() && request === generation) { busy = false; update(); } }
  }
  function navigate(next) { directory = next; offset = 0; void load().catch(fail); }
  $('#md-root').onchange = event => { if(!event.target.value)return drawRoots();rootId = event.target.value; directory = ''; offset = 0; void load().catch(fail); };
  $('#md-create-folder').onclick = async () => {
    if (busy) return; const selectedRoot = rootId, selectedDirectory = directory; busy = true; update();
    try {
      const value = await ui.api('/api/workspace-files/folder', { rootId: selectedRoot, directory: selectedDirectory, name: $('#md-folder-name').value });
      if (!alive()) return;
      $('#md-folder-name').value = '';
      if (rootId === selectedRoot && directory === selectedDirectory) { directory = value.directory; offset = 0; await load(); status('Folder created. New files will be saved here.'); }
      else status('Folder created in the previously selected location.');
    } catch (error) { fail(error); }
    finally { if (alive()) { busy = false; update(); } }
  };
  update();
  try {
    const value = await ui.api('/api/workspace-files/roots'); if (!alive()) return;
    roots = value.roots; const available = value.roots.filter(root => root.available); const preferred = ui.defaultWorkspaceId?.();
    rootId = (available.find(root => root.workspaceId === preferred && root.primary) || available[0])?.id || '';
    $('#md-root').innerHTML = '<option value="">All configured folders</option>' + value.roots.map(root => `<option value="${esc(root.id)}" ${root.id === rootId ? 'selected' : ''} ${!root.available ? 'disabled' : ''}>${esc(root.workspaceName)} · ${esc(root.name)}${root.scope && root.scope!=='workspace' ? '' : root.primary ? '' : ' (additional folder)'}${root.available ? '' : ' — unavailable'}</option>`).join('') || '<option>No workspace folders configured</option>';
    if (rootId) await load(); else { status('Add an available workspace in Workspaces & context first.'); update(); }
  } catch (error) { fail(error); }
}
