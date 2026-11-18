// Display-first code editor for the Files tab, full file tabs and remote clients.
// It follows the pattern used by VS Code's lighter relatives: an incremental
// parser per language (Lezer/CodeMirror 6 here, rather than Monaco + TextMate
// grammars) so only the files you open pay for their grammar. Each language is a
// separate lazily loaded chunk; unknown languages display as clean plain text.
import {EditorView, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, keymap, highlightSpecialChars} from '@codemirror/view';
import {EditorState, Compartment} from '@codemirror/state';
import {defaultKeymap, history, historyKeymap, indentWithTab} from '@codemirror/commands';
import {searchKeymap, highlightSelectionMatches} from '@codemirror/search';
import {HighlightStyle, syntaxHighlighting, bracketMatching, indentOnInput, foldGutter, foldKeymap, StreamLanguage} from '@codemirror/language';
import {tags as t} from '@lezer/highlight';

const legacy = load => load.then(module => StreamLanguage.define(Object.values(module).find(value => value && typeof value.token === 'function')));
const languages = {
  javascript: () => import('@codemirror/lang-javascript').then(m => m.javascript()),
  jsx: () => import('@codemirror/lang-javascript').then(m => m.javascript({jsx: true})),
  typescript: () => import('@codemirror/lang-javascript').then(m => m.javascript({typescript: true})),
  tsx: () => import('@codemirror/lang-javascript').then(m => m.javascript({typescript: true, jsx: true})),
  json: () => import('@codemirror/lang-json').then(m => m.json()),
  python: () => import('@codemirror/lang-python').then(m => m.python()),
  css: () => import('@codemirror/lang-css').then(m => m.css()),
  html: () => import('@codemirror/lang-html').then(m => m.html()),
  xml: () => import('@codemirror/lang-xml').then(m => m.xml()),
  yaml: () => import('@codemirror/lang-yaml').then(m => m.yaml()),
  php: () => import('@codemirror/lang-php').then(m => m.php()),
  java: () => import('@codemirror/lang-java').then(m => m.java()),
  c: () => import('@codemirror/lang-cpp').then(m => m.cpp()),
  cpp: () => import('@codemirror/lang-cpp').then(m => m.cpp()),
  rust: () => import('@codemirror/lang-rust').then(m => m.rust()),
  go: () => import('@codemirror/lang-go').then(m => m.go()),
  sql: () => import('@codemirror/lang-sql').then(m => m.sql()),
  markdown: () => import('@codemirror/lang-markdown').then(m => m.markdown()),
  swift: () => legacy(import('@codemirror/legacy-modes/mode/swift')),
  shell: () => legacy(import('@codemirror/legacy-modes/mode/shell')),
  ruby: () => legacy(import('@codemirror/legacy-modes/mode/ruby')),
  toml: () => legacy(import('@codemirror/legacy-modes/mode/toml')),
  properties: () => legacy(import('@codemirror/legacy-modes/mode/properties')),
  dockerfile: () => legacy(import('@codemirror/legacy-modes/mode/dockerfile')),
  lua: () => legacy(import('@codemirror/legacy-modes/mode/lua')),
  perl: () => legacy(import('@codemirror/legacy-modes/mode/perl')),
  powershell: () => legacy(import('@codemirror/legacy-modes/mode/powershell')),
  diff: () => legacy(import('@codemirror/legacy-modes/mode/diff')),
  r: () => legacy(import('@codemirror/legacy-modes/mode/r')),
};
export const supportedLanguages = Object.keys(languages);

// Colors come from CSS custom properties so every Proteus theme can restyle code.
const color = (name, fallback) => `var(--code-${name},${fallback})`;
const highlight = HighlightStyle.define([
  {tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.operatorKeyword, t.definitionKeyword], color: color('keyword', '#c79bff')},
  {tag: [t.variableName, t.name], color: color('variable', '#f0c987')},
  {tag: [t.definition(t.variableName), t.function(t.variableName), t.function(t.propertyName)], color: color('function', '#8ec9ff')},
  {tag: [t.propertyName, t.attributeName], color: color('property', '#9ad7c3')},
  {tag: [t.typeName, t.className, t.namespace, t.tagName], color: color('type', '#7fd6d1')},
  {tag: [t.string, t.special(t.string), t.regexp, t.character, t.inserted], color: color('string', '#b9d98d')},
  {tag: [t.number, t.bool, t.null, t.atom, t.constant(t.name)], color: color('number', '#f2a679')},
  {tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: color('comment', '#7f8d85'), fontStyle: 'italic'},
  {tag: [t.operator, t.punctuation, t.separator, t.bracket], color: color('operator', '#c3cec6')},
  {tag: [t.heading], color: color('type', '#7fd6d1'), fontWeight: '700'},
  {tag: [t.link, t.url], color: color('function', '#8ec9ff'), textDecoration: 'underline'},
  {tag: [t.emphasis], fontStyle: 'italic'}, {tag: [t.strong], fontWeight: '700'},
  {tag: [t.deleted, t.invalid], color: color('invalid', '#f28b82')},
  {tag: [t.meta, t.processingInstruction], color: color('meta', '#9aa7a0')},
]);
const theme = EditorView.theme({
  '&': {height: '100%', background: 'transparent', color: 'var(--proteus-ink,#edf2ec)', fontSize: '13px'},
  '&.cm-focused': {outline: 'none'},
  '.cm-scroller': {overflow: 'auto', fontFamily: 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace', lineHeight: '1.55', overscrollBehavior: 'contain'},
  '.cm-content': {caretColor: 'var(--proteus-accent,#c2e8a0)', padding: '8px 0'},
  '.cm-gutters': {background: 'transparent', color: 'var(--proteus-muted,#8e9e95)', border: 'none'},
  '.cm-lineNumbers .cm-gutterElement': {padding: '0 10px 0 14px', minWidth: '3ch'},
  '.cm-activeLine': {background: 'rgba(255,255,255,.04)'}, '.cm-activeLineGutter': {background: 'rgba(255,255,255,.04)', color: 'var(--proteus-ink,#edf2ec)'},
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {background: 'rgba(131,167,110,.35)'},
  '.cm-cursor': {borderLeftColor: 'var(--proteus-accent,#c2e8a0)'},
  '.cm-searchMatch': {background: 'rgba(238,203,135,.3)'}, '.cm-selectionMatch': {background: 'rgba(194,232,160,.18)'},
  '.cm-matchingBracket': {background: 'rgba(194,232,160,.25)', outline: '1px solid rgba(194,232,160,.5)'},
  '.cm-panels': {background: 'var(--proteus-panel,#19201e)', color: 'var(--proteus-ink,#edf2ec)', borderColor: 'var(--proteus-line,#303b36)'},
  '.cm-panel input, .cm-panel button': {font: 'inherit', fontSize: '12px'},
  '.cm-foldGutter span': {cursor: 'pointer'},
}, {dark: true});

/**
 * Mount a code editor. Resolves once the editor exists; language grammar loads in
 * the background. `readOnly` is toggleable so the same view serves reading and editing.
 */
export function mount(parent, {value = '', language = 'text', readOnly = true, wrap = false, onChange = () => {}, onSave = () => {}, label = 'Code editor', state}) {
  const languageSlot = new Compartment(), editable = new Compartment(), wrapping = new Compartment();
  let view, token = 0, loaded = 'text';
  const save = () => { onSave(view.state.doc.toString()); return true; };
  view = new EditorView({
    parent,
    doc: value,
    selection: state?.anchor !== undefined ? {anchor: Math.min(state.anchor, value.length), head: Math.min(state.head ?? state.anchor, value.length)} : undefined,
    extensions: [
      EditorView.cspNonce.of(document.querySelector('meta[name=proteus-style-nonce]')?.content || ''),
      lineNumbers(), highlightActiveLineGutter(), highlightSpecialChars(), history(), foldGutter(), drawSelection(), indentOnInput(), bracketMatching(),
      highlightActiveLine(), highlightSelectionMatches(), syntaxHighlighting(highlight),
      keymap.of([{key: 'Mod-s', run: save, preventDefault: true}, indentWithTab, ...foldKeymap, ...searchKeymap, ...historyKeymap, ...defaultKeymap]),
      languageSlot.of([]), wrapping.of(wrap ? EditorView.lineWrapping : []),
      editable.of([EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)]),
      EditorView.contentAttributes.of({'aria-label': label, spellcheck: 'false'}),
      EditorView.updateListener.of(update => { if (update.docChanged) onChange(update.state.doc.toString()); }),
      theme,
    ],
  });
  async function setLanguage(name) {
    const mine = ++token, load = languages[name];
    if (!load) { loaded = 'text'; view.dispatch({effects: languageSlot.reconfigure([])}); return; }
    try { const support = await load(); if (mine === token) { loaded = name; view.dispatch({effects: languageSlot.reconfigure(support)}); } }
    catch { if (mine === token) view.dispatch({effects: languageSlot.reconfigure([])}); }
  }
  const ready = setLanguage(language);
  if (state?.top !== undefined) requestAnimationFrame(() => { view.scrollDOM.scrollTop = state.top; view.scrollDOM.scrollLeft = state.left || 0; });
  return {
    view, ready,
    value: () => view.state.doc.toString(),
    setValue(text) { view.dispatch({changes: {from: 0, to: view.state.doc.length, insert: text}}); },
    setReadOnly(flag) { view.dispatch({effects: editable.reconfigure([EditorState.readOnly.of(flag), EditorView.editable.of(!flag)])}); },
    setWrap(flag) { view.dispatch({effects: wrapping.reconfigure(flag ? EditorView.lineWrapping : [])}); },
    setLanguage,
    language: () => loaded,
    focus: () => view.focus(),
    /** Scroll offset and caret so a tab can restore exactly where the reader was. */
    position: () => ({top: view.scrollDOM.scrollTop, left: view.scrollDOM.scrollLeft, anchor: view.state.selection.main.anchor, head: view.state.selection.main.head}),
    destroy: () => { token++; view.destroy(); },
  };
}
