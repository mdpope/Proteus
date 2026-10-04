import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {preparePty} from './prepare-pty.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const target=path.join(root,'public/terminal');fs.mkdirSync(target,{recursive:true});
await build({entryPoints:[path.join(root,'node_modules/ghostty-web/dist/ghostty-web.js')],outfile:path.join(target,'ghostty.js'),bundle:true,format:'esm',platform:'browser',target:'chrome120',minify:true});
fs.copyFileSync(path.join(root,'node_modules/ghostty-web/dist/ghostty-vt.wasm'),path.join(target,'ghostty-vt.wasm'));
for(const name of ['LICENSE','NOTICE']){const file=path.join(root,'node_modules/ghostty-web',name);if(fs.existsSync(file))fs.copyFileSync(file,path.join(target,name));}
preparePty(root);
