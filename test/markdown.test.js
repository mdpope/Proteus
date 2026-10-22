import {privateTemporaryDirectory} from '../src/private-paths.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { render } from '../src/markdown-renderer.js';
import { readChatImage } from '../src/chat-images.js';

test('rich Markdown supports tables, task lists, code, links and inert image placeholders', () => {
  const html = render('# Heading\n\n**Bold** and *italic* ~~old~~\n\n|Name|State|\n|---|---|\n|Mac|Ready|\n\n- [x] Done\n- [ ] Next\n\n```js\nconst n = 42;\n```\n\n![diagram](./plot.png)\n\n[Docs](https://example.com)');
  for (const token of ['<h1>', '<strong>', '<em>', '<s>', '<table>', 'type="checkbox" disabled', 'checked', 'hljs-keyword', 'Copy code', 'data-image="./plot.png"', 'data-link="https://example.com"']) assert.ok(html.includes(token), token);
  assert.ok(!html.includes('<img')); // No automatic web requests during rendering.
});
test('HTML, event handlers, unsafe schemes, and script-looking fenced code remain inert', () => {
  const html = render('<script>alert(1)</script>\n<img src=x onerror=alert(1)>\n\n[x](javascript:alert(1))\n[x](data:text/html,boom)\n[x](//evil.test)\n![x](data:image/svg+xml,boom)\n\n```html\n<script>attack()</script>\n```');
  assert.ok(!/<script|<img|data-link="(?:javascript|data:|\/\/)/.test(html));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!render('[x](https://user:password@example.com)').includes('data-link="https://user:'));
});
test('image transport only reads referenced, bounded raster files within the captured workspace', t => {
  const home = privateTemporaryDirectory(path.join(os.tmpdir(), 'proteus-image-')); t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const workspace = path.join(home, 'workspace'); fs.mkdirSync(workspace);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zc6sAAAAASUVORK5CYII=', 'base64');
  fs.writeFileSync(path.join(workspace, 'plot.png'), png); fs.writeFileSync(path.join(home, 'private.png'), png);
  fs.symlinkSync(path.join(home, 'private.png'), path.join(workspace, 'escape.png'));
  fs.writeFileSync(path.join(workspace, 'fake.png'), '<svg onload="attack()"/>'); fs.writeFileSync(path.join(workspace, 'large.png'), Buffer.alloc(4_000_001));
  const run = { schedule: { workspace: { cwd: workspace, additionalDirectories: [] } }, events: [{ text: '![plot](plot.png) ![out](../private.png) ![link](escape.png) ![fake](fake.png) ![large](large.png)' }] };
  assert.equal(readChatImage(run, 'plot.png').dataURL, `data:image/png;base64,${png.toString('base64')}`);
  for (const source of ['not-referenced.png', '../private.png', 'escape.png', 'fake.png', 'large.png', 'https://example.com/image']) assert.throws(() => readChatImage(run, source));
});
