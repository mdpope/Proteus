// Content-based file typing. A file name is only a hint: names such as
// `.gitignore`, `Package.resolved`, `LICENSE` or an unnamed script have no useful
// extension, and an extension can lie. Detection therefore inspects the first
// bytes the way `file(1)`, VS Code and git do: known binary signatures first,
// then NUL bytes / invalid UTF-8 / control characters, then a shebang or
// well-known marker to choose a display language.

const byExtension = {
  md: 'markdown', markdown: 'markdown', mdx: 'markdown',
  js: 'javascript', mjs: 'javascript', cjs: 'javascript', jsx: 'jsx', ts: 'typescript', mts: 'typescript', cts: 'typescript', tsx: 'tsx',
  json: 'json', jsonc: 'json', json5: 'json', geojson: 'json', resolved: 'json', webmanifest: 'json', ipynb: 'json', lock: 'text',
  py: 'python', pyw: 'python', pyi: 'python', swift: 'swift', css: 'css', scss: 'css', less: 'css', html: 'html', htm: 'html', xhtml: 'html', vue: 'html', svelte: 'html',
  xml: 'xml', plist: 'xml', svg: 'xml', xsd: 'xml', xsl: 'xml', xib: 'xml', storyboard: 'xml', csproj: 'xml', props: 'xml', targets: 'xml', entitlements: 'xml',
  yml: 'yaml', yaml: 'yaml', toml: 'toml', ini: 'properties', cfg: 'properties', conf: 'properties', properties: 'properties', env: 'properties', editorconfig: 'properties',
  sh: 'shell', bash: 'shell', zsh: 'shell', fish: 'shell', ksh: 'shell', command: 'shell', ps1: 'powershell', psm1: 'powershell', bat: 'shell', cmd: 'shell',
  c: 'c', h: 'c', cc: 'cpp', cpp: 'cpp', cxx: 'cpp', hpp: 'cpp', hh: 'cpp', hxx: 'cpp', m: 'c', mm: 'cpp',
  rs: 'rust', go: 'go', java: 'java', kt: 'java', kts: 'java', scala: 'java', cs: 'java', php: 'php', phtml: 'php', rb: 'ruby', rake: 'ruby', gemspec: 'ruby',
  sql: 'sql', lua: 'lua', pl: 'perl', pm: 'perl', r: 'r', dockerfile: 'dockerfile', diff: 'diff', patch: 'diff',
  txt: 'text', text: 'text', log: 'text', csv: 'text', tsv: 'text', rtf: 'text', tex: 'text', rst: 'text', adoc: 'text', gitignore: 'text', gitattributes: 'text',
};
const byName = {
  dockerfile: 'dockerfile', makefile: 'shell', gnumakefile: 'shell', gemfile: 'ruby', rakefile: 'ruby', podfile: 'ruby', fastfile: 'ruby', brewfile: 'ruby', vagrantfile: 'ruby',
  'package.resolved': 'json', '.babelrc': 'json', '.eslintrc': 'json', '.prettierrc': 'json', '.gitignore': 'text', '.gitattributes': 'text', '.gitmodules': 'properties',
  '.npmrc': 'properties', '.env': 'properties', '.editorconfig': 'properties', '.zshrc': 'shell', '.bashrc': 'shell', '.profile': 'shell', '.zprofile': 'shell', '.bash_profile': 'shell',
  license: 'text', licence: 'text', readme: 'text', notice: 'text', authors: 'text', changelog: 'text', copying: 'text', 'cmakelists.txt': 'shell',
};
const shebang = [[/\b(?:python|pypy)[0-9.]*\b/, 'python'], [/\b(?:node|deno|bun)\b/, 'javascript'], [/\b(?:ba|z|k|da|fi)?sh\b|\bsh\b/, 'shell'], [/\bruby\b/, 'ruby'], [/\bphp\b/, 'php'], [/\bperl\b/, 'perl'], [/\bswift\b/, 'swift'], [/\blua\b/, 'lua']];
const binarySignatures = [
  ['image/png', [137, 80, 78, 71, 13, 10, 26, 10]], ['image/jpeg', [255, 216, 255]], ['image/gif', [71, 73, 70, 56]], ['application/pdf', [37, 80, 68, 70, 45]],
  ['application/zip', [80, 75, 3, 4]], ['application/gzip', [31, 139]], ['application/x-mach-o', [207, 250, 237, 254]], ['application/x-mach-o', [254, 237, 250, 207]], ['application/x-mach-o', [202, 254, 186, 190]],
  ['application/x-elf', [127, 69, 76, 70]], ['application/x-sqlite3', [83, 81, 76, 105, 116, 101, 32, 102]], ['application/wasm', [0, 97, 115, 109]], ['application/x-executable', [77, 90]],
  ['application/x-bplist', [98, 112, 108, 105, 115, 116]], ['font/otf', [79, 84, 84, 79]], ['font/ttf', [0, 1, 0, 0]], ['application/x-7z-compressed', [55, 122, 188, 175]],
];

/** Display language from the file name alone; `null` when the name is not informative. */
export function languageForName(name) {
  const lower = String(name || '').toLowerCase();
  if (byName[lower]) return byName[lower];
  const dot = lower.lastIndexOf('.');
  if (dot > 0 || (dot === 0 && lower.length > 1 && !byName[lower])) {
    const extension = lower.slice(dot + 1);
    if (byExtension[extension]) return byExtension[extension];
  }
  return null;
}

/** First line markers (`#!`, `<?php`, `<?xml`, JSON) choose a language for extensionless text. */
export function languageForContent(text) {
  const head = String(text || '').slice(0, 2048), first = head.split('\n', 1)[0];
  if (first.startsWith('#!')) for (const [pattern, language] of shebang) if (pattern.test(first)) return language;
  if (/^\s*<\?php/i.test(head)) return 'php';
  if (/^\s*<\?xml|^\s*<!DOCTYPE\s+(?:plist|svg)/i.test(head)) return 'xml';
  if (/^\s*<!doctype\s+html|^\s*<html[\s>]/i.test(head)) return 'html';
  if (/^\s*[{[]/.test(head)) { try { JSON.parse(text); return 'json'; } catch { /* Not whole-document JSON. */ } }
  if (/^---\s*$/m.test(head) && /^[\w-]+:\s/m.test(head)) return 'yaml';
  return null;
}

function validUtf8(bytes) {
  try { new TextDecoder('utf-8', { fatal: true }).decode(bytes); return true; } catch { return false; }
}

/**
 * Classify a leading byte sample. `complete` states that the sample is the whole
 * file; otherwise a truncated final multibyte character is tolerated.
 * Returns `{text:true,encoding}` or `{text:false,type}`.
 */
export function classifyBytes(sample, { complete = true } = {}) {
  const bytes = sample instanceof Uint8Array ? sample : new Uint8Array(sample);
  if (!bytes.length) return { text: true, encoding: 'utf-8' };
  for (const [type, signature] of binarySignatures) if (signature.every((value, index) => bytes[index] === value)) return { text: false, type };
  if (bytes.length > 11 && String.fromCharCode(...bytes.subarray(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.subarray(8, 12)) === 'WEBP') return { text: false, type: 'image/webp' };
  if (bytes[0] === 0xff && bytes[1] === 0xfe && bytes.length % 2 === 0 || bytes[0] === 0xfe && bytes[1] === 0xff) return { text: true, encoding: bytes[0] === 0xff ? 'utf-16le' : 'utf-16be' };
  let trimmed = bytes;
  if (!complete) { let cut = bytes.length; while (cut > 0 && cut > bytes.length - 4 && (bytes[cut - 1] & 0xc0) === 0x80) cut--; if (cut > 0 && bytes[cut - 1] >= 0xc0) cut--; trimmed = bytes.subarray(0, cut); }
  if (trimmed.includes(0)) return { text: false, type: 'application/octet-stream' };
  let control = 0;
  for (const value of trimmed) if (value < 32 && value !== 9 && value !== 10 && value !== 13 && value !== 12 && value !== 27) control++;
  if (control > trimmed.length * 0.02 + 1) return { text: false, type: 'application/octet-stream' };
  if (validUtf8(trimmed)) return { text: true, encoding: 'utf-8' };
  // Legacy single-byte text (Latin-1/Windows-1252) has no NUL bytes and few controls.
  return { text: true, encoding: 'windows-1252' };
}

export function decodeText(buffer, encoding) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (encoding === 'utf-16le' || encoding === 'utf-16be') return new TextDecoder(encoding).decode(bytes.subarray(2));
  const text = new TextDecoder(encoding || 'utf-8').decode(bytes);
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}
