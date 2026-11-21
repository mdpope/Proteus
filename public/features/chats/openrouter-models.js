const storageKey = 'proteus.openrouter.favorites';
const browseValue = ':proteus-openrouter-browse';
const browseBindings = new WeakMap();

// Keep the browser action out of form data and next-turn model state.
export function bindOpenRouterModelBrowse(select, open) {
  browseBindings.get(select)?.abort();
  select.querySelector('[data-openrouter-browse-option]')?.remove();
  if (!open) return;

  const browse = new Option('Browse models…', browseValue);
  browse.dataset.openrouterBrowseOption = '';
  select.add(browse);

  const binding = new AbortController();
  browseBindings.set(select, binding);
  select.dataset.selected = select.value;
  const options = {capture: true, signal: binding.signal};
  select.addEventListener('input', event => {
    if (select.value === browseValue) event.stopImmediatePropagation();
    else select.dataset.selected = select.value;
  }, options);
  select.addEventListener('change', event => {
    if (select.value !== browseValue) {
      select.dataset.selected = select.value;
      return;
    }
    event.stopImmediatePropagation();
    select.value = select.dataset.selected;
    open(select.value);
  }, options);
}

export function openRouterFavorites() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return new Set(Array.isArray(saved) ? saved.filter(id => typeof id === 'string') : []);
  } catch { return new Set(); }
}

export function openRouterQuickModels(models, selected, favorites = openRouterFavorites()) {
  return models.filter(model => model.id === selected || favorites.has(model.id));
}

const dollars = new Intl.NumberFormat(undefined, {style: 'currency', currency: 'USD', maximumFractionDigits: 8});
export const formatOpenRouterUSD = amount => amount > 0 && amount < 1e-8 ? '<'+dollars.format(1e-8) : dollars.format(amount);

export function openRouterCostText(cost, status) {
  if (!cost?.reportedRequests) return cost?.requests ? (['running','awaiting_input'].includes(status) ? 'Awaiting reported cost' : 'Cost unavailable') : '—';
  const value = formatOpenRouterUSD(cost.usd) + ' USD';
  return cost.reportedRequests < cost.requests ? value + ' · partial' : value;
}

function rateText(model) {
  const {input, output} = model.pricing || {};
  return input != null && output != null ? `${formatOpenRouterUSD(input * 1e6)} input · ${formatOpenRouterUSD(output * 1e6)} output per 1M tokens` : 'Token rates unavailable';
}

function node(tag, content, className) {
  const el = document.createElement(tag);
  if (content) el.textContent = content;
  if (className) el.className = className;
  return el;
}

export function showOpenRouterModels({models, selected, onChoose, onFavorites}) {
  const dialog = node('dialog', '', 'openrouter-model-dialog');
  const title = node('h2', 'OpenRouter models');
  title.id = 'openrouter-model-heading';
  dialog.setAttribute('aria-labelledby', title.id);
  const search = node('input');
  search.type = 'search';
  search.placeholder = 'Search names or model IDs';
  search.setAttribute('aria-label', 'Search OpenRouter models');
  const results = node('div', '', 'openrouter-model-results');
  const footer = node('div', '', 'actions');
  const close = node('button', 'Done');
  close.type = 'button';
  close.onclick = () => dialog.close();
  footer.append(close);
  dialog.append(title, search, results, footer);
  let favorites = openRouterFavorites();
  function draw() {
    const tokens = search.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const matches = models.filter(model => tokens.every(token => (model.name+' '+model.id).toLowerCase().includes(token)));
    matches.sort((a, b) => Number(favorites.has(b.id)) - Number(favorites.has(a.id)) || (a.name || a.id).localeCompare(b.name || b.id));
    results.replaceChildren();
    results.append(node('p', matches.length ? `Showing ${Math.min(50, matches.length)} of ${matches.length} models. Star models to add them to the quick picker.` : 'No matching models.', 'note'));
    for (const model of matches.slice(0, 50)) {
      const row = node('div', '', 'openrouter-model-row');
      const choose = node(onChoose ? 'button' : 'div', '', 'openrouter-model-choice');
      if (onChoose) {
        choose.type = 'button';
        choose.onclick = () => { onChoose(model); dialog.close(); };
      }
      choose.append(node('strong', model.name || model.id), node('span', model.id, 'note'), node('span', rateText(model), 'note'));
      if (selected === model.id) choose.append(node('span', 'Selected', 'note'));
      const favorite = node('button', '', 'openrouter-model-star');
      favorite.type = 'button';
      const paintFavorite = () => {
        const saved = favorites.has(model.id);
        favorite.textContent = saved ? '★' : '☆';
        favorite.setAttribute('aria-label', (saved ? 'Remove favorite ' : 'Favorite ') + model.name);
        favorite.setAttribute('aria-pressed', String(saved));
      };
      paintFavorite();
      favorite.onclick = () => {
        favorites = openRouterFavorites();
        if (favorites.has(model.id)) favorites.delete(model.id);
        else favorites.add(model.id);
        try { localStorage.setItem(storageKey, JSON.stringify([...favorites])); }
        catch { return; }
        paintFavorite();
        onFavorites?.();
      };
      row.append(choose, favorite);
      results.append(row);
    }
  }
  dialog.onclose = () => dialog.remove();
  search.oninput = draw;
  draw();
  document.body.append(dialog);
  dialog.showModal();
  search.focus();
}
