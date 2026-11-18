import {build} from 'esbuild';
import fs from 'node:fs';
const output=await build({entryPoints:['src/shared/scratch-markdown-editor.js'],outfile:'public/features/scratchpad/editor-runtime.js',bundle:true,format:'esm',minify:true,target:['safari16','chrome120'],legalComments:'eof',metafile:true});
await build({entryPoints:['src/shared/scratch-markdown-editor.js'],outfile:'public/markdown/scratch-editor-runtime.js',bundle:true,format:'iife',globalName:'ProteusScratchEditor',minify:true,target:['safari16'],legalComments:'eof'});
const packages=[...new Set(Object.keys(output.metafile.inputs).map(file=>file.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/)?.[1]).filter(Boolean))].sort();
const notices=packages.map(name=>{const folder='node_modules/'+name,file=fs.readdirSync(folder).find(name=>/^license/i.test(name));if(!file)throw Error('Missing bundled license: '+name);return name+'\n'+fs.readFileSync(folder+'/'+file,'utf8');}).join('\n\n');
fs.writeFileSync('public/features/scratchpad/EDITOR-NOTICES.txt',notices);
fs.writeFileSync('public/markdown/SCRATCH-EDITOR-NOTICES.txt',notices);
