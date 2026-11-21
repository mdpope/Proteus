const sections = new Map([
  ['browser', 'Browser tabs'], ['chat', 'Chats'], ['file', 'Files'], ['scratch', 'Scratches'],
  ['project', 'Projects'], ['workspace', 'Workspaces'], ['tab', 'Other tabs'],
  ['feature', 'Features'], ['setting', 'Settings'],
]);
const normalized = value => String(value ?? '').toLowerCase().normalize('NFKD').replace(/\p{Diacritic}/gu, '');
const compare = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});

export function searchGroups(entries, query, limit = 8) {
  const words = normalized(query).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const phrase = words.join(' '), matches = new Map();
  for (const entry of entries) {
    if (!sections.has(entry.kind) || !entry.title || matches.has(entry.key)) continue;
    const title = normalized(entry.title), fields = [title, normalized(entry.path), normalized(entry.keywords)];
    if (!words.every(word => fields.some(field => field.includes(word)))) continue;
    const rank = title === phrase ? 0 : title.startsWith(phrase) ? 1 : title.includes(phrase) ? 2 :
      words.every(word => title.includes(word)) ? 3 : 4;
    matches.set(entry.key, {entry, rank});
  }
  const buckets = new Map();
  for (const {entry,rank} of matches.values()) {
    if (!buckets.has(entry.kind)) buckets.set(entry.kind, []);
    buckets.get(entry.kind).push({entry,rank});
  }
  return Array.from(sections, ([kind,title]) => ({
    kind, title,
    entries: (buckets.get(kind) || []).sort((a,b) => a.rank-b.rank ||
      Number(!!b.entry.open) - Number(!!a.entry.open) ||
      (b.entry.activity || 0) - (a.entry.activity || 0) ||
      compare.compare(a.entry.title,b.entry.title)).slice(0,limit).map(match => match.entry),
  })).filter(group => group.entries.length);
}

export function createUniversalSearch({snapshot, findFiles, findChats, findScratches, onError}) {
  const dialog = document.createElement('dialog');
  dialog.id = 'universal-search';
  dialog.className = 'universal-search';
  dialog.setAttribute('aria-labelledby','universal-search-title');
  dialog.innerHTML = '<section><header><h2 id="universal-search-title">Search Proteus</h2><kbd>Esc</kbd></header>' +
    '<div class="universal-search-input"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg>' +
    '<input type="text" role="combobox" aria-autocomplete="list" aria-controls="universal-search-results" aria-label="Search Proteus" aria-expanded="false" placeholder="Find tabs, chats, files and settings…" autocomplete="off" spellcheck="false">' +
    '<button type="button" data-search-clear aria-label="Clear search" title="Clear search" hidden>×</button></div>' +
    '<div class="universal-search-status" role="status"></div><div id="universal-search-results" role="listbox" aria-label="Search results"></div></section>';
  document.body.append(dialog);
  const field = dialog.querySelector('input'), clear = dialog.querySelector('[data-search-clear]');
  const results = dialog.querySelector('#universal-search-results'), status = dialog.querySelector('[role=status]');
  let local = [], remote = [], rows = [], buttons = [], active = -1;
  let controller, timer, generation=0, launching=false;

  function focusResult(index, reveal = true) {
    if (!rows.length) return;
    active = Math.min(Math.max(index,0),rows.length-1);
    buttons.forEach((button,i)=>button.setAttribute('aria-selected',String(i===active)));
    const button = buttons[active];
    field.setAttribute('aria-activedescendant',button.id);
    if (reveal) button.scrollIntoView({block:'nearest'});
  }

  function paint(pending = false, partial = false) {
    const cursor = rows[active]?.key;
    const query = field.value.trim();
    const groups = searchGroups([...local,...remote],query);
    results.replaceChildren();
    rows = [];
    buttons = [];
    for (const group of groups) {
      const section = document.createElement('div');
      section.className = 'universal-search-group';
      section.setAttribute('role','group');
      section.setAttribute('aria-label',group.title);
      const heading = document.createElement('h3');
      heading.textContent = group.title;
      section.append(heading);
      for (const entry of group.entries) {
        const index = rows.length;
        rows.push(entry);
        const button = document.createElement('button');
        button.type = 'button';
        button.role = 'option';
        button.id = 'universal-search-option-'+index;
        button.tabIndex = -1;
        const label = document.createElement('span'), path = document.createElement('small');
        label.textContent = entry.title;
        path.textContent = entry.path || '';
        button.title = [entry.title,entry.path].filter(Boolean).join(' · ');
        button.append(label,path);
        button.addEventListener('mousedown',event=>event.preventDefault());
        button.onclick = () => void choose(index);
        buttons.push(button);
        section.append(button);
      }
      results.append(section);
    }
    clear.hidden = !field.value;
    field.setAttribute('aria-expanded',String(!!rows.length));
    field.removeAttribute('aria-activedescendant');
    const retained = rows.findIndex(entry=>entry.key===cursor);
    active = -1;
    if (rows.length) focusResult(retained<0?0:retained);
    status.hidden = !!rows.length && !pending && !partial;
    status.textContent = !query ? 'Type to find anything in Proteus.' :
      pending ? 'Searching connected computers…' :
      partial ? 'Some computers or folders could not be searched.' : !rows.length ? 'No matching results.' : '';
  }

  function update() {
    const request = ++generation;
    clearTimeout(timer);controller?.abort();controller = null;
    remote = [];
    const query = field.value.trim();
    const canSearch = query.length>=2 && (findFiles || findChats || findScratches);
    results.scrollTop = 0;
    paint(!!canSearch);
    if (!canSearch) return;
    controller = new AbortController();
    const {signal} = controller;
    timer = setTimeout(async()=>{
      const searches = [findFiles,findChats,findScratches].filter(Boolean);
      const found = await Promise.allSettled(searches.map(search=>search(query,signal)));
      if (request!==generation || signal.aborted || !dialog.open) return;
      remote = found.flatMap(result=>result.value?.entries || []);
      paint(false,found.some(result=>result.status==='rejected'||result.value?.partial));
    },180);
  }

  async function choose(index) {
    const entry=rows[index];
    if (!entry || launching) return;
    launching=true;
    dialog.close();
    try { await entry.openResult(); }
    catch(error) { onError(error); }
    finally { launching=false; }
  }

  field.addEventListener('input',update);
  clear.onclick=()=>{field.value='';field.focus();update();};
  dialog.addEventListener('keydown',event=>{
    if (event.isComposing) return;
    if (event.key==='ArrowDown' || event.key==='ArrowUp') {
      event.preventDefault();focusResult(active+(event.key==='ArrowDown'?1:-1));
    } else if (event.key==='Enter' && event.target===field) {
      event.preventDefault();void choose(active);
    }
  });
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  dialog.addEventListener('close',()=>{
    ++generation;clearTimeout(timer);controller?.abort();controller=null;
    local=[];remote=[];rows=[];buttons=[];results.replaceChildren();
  });
  return {open(){
    if (dialog.open) {field.focus();return;}
    local=snapshot();field.value='';active=-1;
    dialog.showModal();field.focus();update();
  }};
}
