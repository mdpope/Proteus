import {build} from 'esbuild';
import fs from 'node:fs';
// The entry plus one lazy chunk per language grammar. Only chunks for files the
// user actually opens are ever fetched.
const directory = 'public/shared/code-editor';
fs.rmSync(directory, {recursive: true, force: true});
const result = await build({entryPoints: {'code-editor': 'src/shared/code-editor.js'}, outdir: directory, bundle: true, splitting: true, format: 'esm', minify: true, target: ['safari16', 'chrome120'], legalComments: 'none', chunkNames: 'chunks/[name]-[hash]', metafile: true});
const packages = [...new Set(Object.keys(result.metafile.inputs).map(file => file.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/)?.[1]).filter(Boolean))].sort();
const notices = packages.map(name => {
  const folder = 'node_modules/' + name, file = fs.readdirSync(folder).find(entry => /^licen[sc]e/i.test(entry));
  if (!file) throw Error('Missing bundled license: ' + name);
  return name + '\n' + fs.readFileSync(folder + '/' + file, 'utf8');
}).join('\n\n');
fs.writeFileSync(directory + '/NOTICES.txt', notices);
const sizes = Object.entries(result.metafile.outputs).map(([file, value]) => [file, value.bytes]);
console.log(sizes.map(([file, bytes]) => (bytes / 1024).toFixed(1).padStart(8) + ' KB  ' + file).join('\n'));
