import { build } from 'esbuild';
import fs from 'node:fs';
await build({ entryPoints: ['src/markdown-renderer.js'], outfile: 'public/markdown/runtime.js', bundle: true, format: 'iife', globalName: 'ProteusMarkdown', minify: true, target: ['safari16', 'chrome120'], legalComments: 'eof' });
const packages = ['markdown-it', 'highlight.js', 'linkify-it', 'mdurl', 'punycode.js', 'uc.micro', 'entities'];
fs.writeFileSync('public/markdown/NOTICES.txt', packages.map(name => {
  const root = `node_modules/${name}`; const file = fs.readdirSync(root).find(file => /^licen[sc]e/i.test(file));
  return `${name}\n${file ? fs.readFileSync(`${root}/${file}`, 'utf8') : 'See package license.'}`;
}).join('\n\n'));
