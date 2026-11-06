import MarkdownIt from 'markdown-it';
import {installObsidianMarkdown} from './obsidian-markdown.js';

export function linkKind(value) {
  if (typeof value !== 'string' || /[\u0000-\u0020\u007f]/.test(value)) return null;
  if (/^https?:\/\//i.test(value)) { try { const url = new URL(value); return url.username || url.password ? null : 'web'; } catch { return null; } }
  if (/^mailto:[^?]+$/i.test(value)) return 'mail';
  if (/^file:\/\/\//i.test(value)) return 'file';
  if (!/^[a-z][a-z0-9+.-]*:/i.test(value) && !value.startsWith('//') && !value.startsWith('#')) return 'file';
  return null;
}
export function parser() {
  const md = new MarkdownIt({ html: false, linkify: true, breaks: true });
  md.validateLink = value => !!linkKind(value);
  installObsidianMarkdown(md);
  return md;
}
const md = parser();
export function imageSources(text) {
  const images = [];
  const visit = tokens => { for (const token of tokens) { if (token.type === 'image') images.push(token.attrGet('src')); if (token.children) visit(token.children); } };
  visit(md.parse(String(text || ''), {})); return images;
}
