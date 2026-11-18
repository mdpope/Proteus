export { findTextRanges } from '../../public/shared/ui/page-find.js';
import { parser, linkKind } from './markdown-parser.js';
import { humanTime, isoInstantPattern } from './human-time.js';
import hljs from 'highlight.js/lib/common';

const md = parser();
const escape = md.utils.escapeHtml;
md.renderer.rules.link_open = (tokens, index) => `<a href="#" data-link="${escape(tokens[index].attrGet('href'))}">`;
md.renderer.rules.table_open = () => '<div class="md-table" tabindex="0" role="region" aria-label="Table"><table>';
for (const tag of ['th', 'td']) md.renderer.rules[tag + '_open'] = (tokens, index) => {
  const align = tokens[index].attrGet('style')?.match(/text-align:(left|right|center)/)?.[1];
  return `<${tag}${align ? ` class="md-align-${align}"` : ''}>`;
};
md.renderer.rules.table_close = () => '</table></div>';
md.renderer.rules.image = (tokens, index) => {
  const token = tokens[index]; const source = token.attrGet('src');
  const label = token.content || 'Image';
  return `<span class="md-image" data-image="${escape(source)}"><button type="button" class="md-load-image">Load image · ${escape(label)}</button><span class="md-image-label">${escape(label)}</span></span>`;
};
// Streaming re-renders a growing message several times per second. Completed code blocks
// are unchanged between renders, so reuse their highlighted HTML (bounded LRU).
const highlights = new Map();
function highlighted(content, language) {
  const key = language + '\u0000' + content, cached = highlights.get(key);
  if (cached !== undefined) { highlights.delete(key); highlights.set(key, cached); return cached; }
  const value = hljs.highlight(content, { language, ignoreIllegals: true }).value;
  highlights.set(key, value); if (highlights.size > 200) highlights.delete(highlights.keys().next().value);
  return value;
}
md.renderer.rules.fence = (tokens, index) => {
  const token = tokens[index]; const language = token.info.trim().split(/\s+/)[0];
  let code = escape(token.content);
  if (token.content.length < 50_000 && hljs.getLanguage(language)) { try { code = highlighted(token.content, language); } catch { /* Plain code remains readable. */ } }
  return `<div class="md-code"><div class="md-codebar"><span>${escape(language || 'code')}</span><button type="button" class="md-copy">Copy code</button></div><pre><code class="hljs">${code}</code></pre></div>`;
};
// Read-only task lists. Do not accept raw HTML from a message or enable HTML plugins.
md.core.ruler.after('inline', 'tasks', state => {
  for (let i = 2; i < state.tokens.length; i++) {
    const token = state.tokens[i];
    if (token.type !== 'inline' || state.tokens[i - 2].type !== 'list_item_open' || token.children?.[0]?.type !== 'text') continue;
    const match = token.children[0].content.match(/^\[([ xX])\]\s+/); if (!match) continue;
    token.children[0].content = token.children[0].content.slice(match[0].length);
    const check = new state.Token('task_check', '', 0); check.meta = { checked: match[1] !== ' ' }; token.children.unshift(check);
  }
});
md.renderer.rules.task_check = (tokens, index) => `<input class="md-task" type="checkbox" disabled aria-label="Task"${tokens[index].meta.checked ? ' checked' : ''}>`;
// N11-19: ISO instants in prose render as readable local times; the exact value stays in the
// tooltip and datetime attribute. Code spans/blocks are left untouched.
let markdownTimeZone;
export function setTimeZone(zone) { markdownTimeZone = zone || undefined; }
md.core.ruler.push('human_times', state => {
  for (const block of state.tokens) {
    if (block.type !== 'inline' || !block.children) continue;
    const children = [];
    for (const token of block.children) {
      if (token.type !== 'text' || !isoInstantPattern.test(token.content)) { isoInstantPattern.lastIndex = 0; children.push(token); continue; }
      isoInstantPattern.lastIndex = 0; let last = 0;
      for (const match of token.content.matchAll(isoInstantPattern)) {
        if (match.index > last) { const text = new state.Token('text', '', 0); text.content = token.content.slice(last, match.index); children.push(text); }
        const time = new state.Token('human_time', '', 0); time.content = match[0]; children.push(time); last = match.index + match[0].length;
      }
      if (last < token.content.length) { const text = new state.Token('text', '', 0); text.content = token.content.slice(last); children.push(text); }
    }
    block.children = children;
  }
});
md.renderer.rules.human_time = (tokens, index) => { const value = tokens[index].content; return `<time datetime="${escape(value)}" title="${escape(value)}">${escape(humanTime(value, { timeZone: markdownTimeZone }))}</time>`; };
export function render(text) { return md.render(String(text ?? '')); }
export { linkKind };

// Replace only top-level blocks that differ from the previous render. A streamed reply
// usually changes just its last block; earlier blocks keep their nodes, so they need no new
// style/layout work and keep loaded images, copy feedback and the reader's text selection.
// Comparison uses the HTML this function produced, never the live (possibly modified) DOM.
function replaceBlocks(element, html) {
  const template = document.createElement('template'); template.innerHTML = html;
  const incoming = [...template.content.childNodes], markup = incoming.map(node => node.nodeType === 1 ? node.outerHTML : '#' + node.nodeType + ':' + node.nodeValue);
  const previous = element._markdownBlocks, current = [...element.childNodes];
  if (!previous || previous.length !== current.length) { element.replaceChildren(...incoming); element._markdownBlocks = markup; return; }
  let same = 0; while (same < previous.length && same < markup.length && previous[same] === markup[same]) same++;
  for (const node of current.slice(same)) node.remove();
  element.append(...incoming.slice(same)); element._markdownBlocks = markup;
}

// The same interaction layer runs inside Electron and the bundled iOS WKWebView.
export function mount(element, text, options = {}) {
  if (element._markdownText === text) return;
  element._markdownText = text; if (!element.classList.contains('rich-text')) element.classList.add('rich-text'); replaceBlocks(element, render(text));
  element._images ??= new Map();
  element.onclick = async event => {
    const target = event.target.closest('button,a'); if (!target || !element.contains(target)) return;
    if (target.matches('[data-link]')) { event.preventDefault(); const source=target.dataset.link; if(source.startsWith('#')){const name=decodeURIComponent(source.slice(1)).toLowerCase();[...element.querySelectorAll('h1,h2,h3,h4,h5,h6')].find(node=>node.textContent.toLowerCase()===name)?.scrollIntoView({block:'start'});}else options.link?.(source); }
    if (target.matches('.md-copy')) {
      try { await options.copy?.(target.closest('.md-code').querySelector('code').textContent); target.textContent = 'Copied'; } catch { target.textContent = 'Copy failed'; }
    }
    if (target.matches('.md-load-image')) await loadImage(target.closest('[data-image]'));
  };
  async function loadImage(holder) {
    const source = holder.dataset.image; const button = holder.querySelector('button'); if (!button || button.disabled) return;
    if (linkKind(source) === 'web' && options.allowExternalImages === false) { button.disabled = true; button.textContent = 'External image blocked'; return; }
    button.disabled = true; button.textContent = 'Loading image…';
    try {
      let value = element._images.get(source);
      if (!value) {
        value = linkKind(source) === 'web' ? source : await options.image?.(source);
        if (typeof value !== 'string' || !(value.startsWith('blob:') && linkKind(source) !== 'web' || /^(https?:\/\/|data:image\/(png|jpeg|gif|webp);base64,)/i.test(value))) throw new Error('Image unavailable');
        element._images.set(source, value);
      }
      const img = document.createElement('img'); img.alt = holder.querySelector('.md-image-label').textContent; img.referrerPolicy = 'no-referrer'; img.decoding = 'async';
      img.onload = () => { button.remove(); options.resize?.(); };
      img.onerror = () => { img.remove(); element._images.delete(source); button.disabled = false; button.textContent = 'Image unavailable · retry'; options.resize?.(); };
      holder.append(img); img.src = value;
    } catch { button.disabled = false; button.textContent = 'Image unavailable · retry'; }
    options.resize?.();
  }
  for (const holder of element.querySelectorAll('[data-image]')) {
    // External URLs load only after a tap; workspace images stay on the authorized computer/relay path.
    if (linkKind(holder.dataset.image) === 'file' || element._images.has(holder.dataset.image)) void loadImage(holder);
  }
  options.resize?.();
}
