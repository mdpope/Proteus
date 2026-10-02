import { parser, linkKind } from './markdown-parser.js';
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
md.renderer.rules.fence = (tokens, index) => {
  const token = tokens[index]; const language = token.info.trim().split(/\s+/)[0];
  let code = escape(token.content);
  if (token.content.length < 50_000 && hljs.getLanguage(language)) { try { code = hljs.highlight(token.content, { language, ignoreIllegals: true }).value; } catch { /* Plain code remains readable. */ } }
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
export function render(text) { return md.render(String(text ?? '')); }
export { linkKind };

// The same interaction layer runs inside Electron and the bundled iOS WKWebView.
export function mount(element, text, options = {}) {
  if (element._markdownText === text) return;
  element._markdownText = text; element.classList.add('rich-text'); element.innerHTML = render(text);
  element._images ??= new Map();
  element.onclick = async event => {
    const target = event.target.closest('button,a'); if (!target || !element.contains(target)) return;
    if (target.matches('[data-link]')) { event.preventDefault(); options.link?.(target.dataset.link); }
    if (target.matches('.md-copy')) {
      try { await options.copy?.(target.closest('.md-code').querySelector('code').textContent); target.textContent = 'Copied'; } catch { target.textContent = 'Copy failed'; }
    }
    if (target.matches('.md-load-image')) await loadImage(target.closest('[data-image]'));
  };
  async function loadImage(holder) {
    const source = holder.dataset.image; const button = holder.querySelector('button'); if (!button || button.disabled) return;
    button.disabled = true; button.textContent = 'Loading image…';
    try {
      let value = element._images.get(source);
      if (!value) {
        value = linkKind(source) === 'web' ? source : await options.image?.(source);
        if (typeof value !== 'string' || !(/^(https?:\/\/|data:image\/(png|jpeg|gif|webp);base64,)/i.test(value))) throw new Error('Image unavailable');
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
    // External URLs load only after a tap; workspace images stay on the authorized Mac/relay path.
    if (linkKind(holder.dataset.image) === 'file' || element._images.has(holder.dataset.image)) void loadImage(holder);
  }
  options.resize?.();
}
