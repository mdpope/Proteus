// Package the review page for Proteus's existing encrypted HTML document transport.
// Run: node docs/design/2026-10-09/build-shared-preview.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';

const directory = path.dirname(fileURLToPath(import.meta.url));
let html = await readFile(path.join(directory, 'desktop-web-composer.html'), 'utf8');
for (const match of [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)]) {
  const href = match[0].match(/href="([^"]+)"/)[1];
  const result = await build({ entryPoints: [path.resolve(directory, href)], bundle: true, write: false, logLevel: 'silent' });
  const css = result.outputFiles[0].text;
  if (/<\/style/i.test(css)) throw new Error('Unexpected style closing tag');
  html = html.replace(match[0], `<style${match[0].includes('id="web-styles"') ? ' id="web-styles"' : ''}>\n${css}\n</style>`);
}
const source = (await readFile(path.join(directory, 'desktop-web-composer.js'), 'utf8'))
  .replace("$('#web-styles').disabled = !web;", "$('#web-styles').sheet.disabled = !web;");
const result = await build({
  stdin: { contents: source, resolveDir: directory, sourcefile: 'desktop-web-composer.js', loader: 'js' },
  bundle: true, format: 'iife', platform: 'browser', write: false, logLevel: 'silent',
});
html = html.replace('<script type="module" src="desktop-web-composer.js"></script>',
  `<script>\n${result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script')}\n</script>`);
if (/<(?:script|link)\b[^>]*(?:src|href)=/i.test(html) || /@import\s/i.test(html)) {
  throw new Error('Shared preview still has an external code or style dependency');
}
if (Buffer.byteLength(html) > 1024 * 1024) throw new Error('Shared preview exceeds the document limit');
await writeFile(path.join(directory, 'desktop-web-composer.shared.html'), html);
console.log(`Shared desktop/web preview: ${Buffer.byteLength(html)} bytes`);
