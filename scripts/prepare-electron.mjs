// Resolve Electron once before parallel test workers can trigger its lazy installer.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {helperEnvironment} from '../desktop/updates/helper-environment.cjs';

export function prepareElectron(root=path.resolve(fileURLToPath(new URL('..',import.meta.url)))){
 const require=createRequire(path.join(root,'package.json'));
 const expected=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).devDependencies.electron;
 const metadata=require('electron/package.json');
 if(metadata.version!==expected)throw Error('Installed Electron differs from the pinned build dependency.');
 const packageRoot=fs.realpathSync(path.dirname(require.resolve('electron/package.json')));
 // require completes any missing binary installation synchronously, before npm test.
 const executable=fs.realpathSync(require('electron'));
 const relative=path.relative(packageRoot,executable);
 if(path.isAbsolute(relative)||relative==='..'||relative.startsWith('..'+path.sep)||!fs.statSync(executable).isFile())throw Error('Electron executable escaped its installed package.');
 const actual=JSON.parse(execFileSync(executable,['-p','JSON.stringify({version:process.versions.electron,arch:process.arch})'],{cwd:root,env:helperEnvironment(),windowsHide:true,encoding:'utf8',timeout:30000}));
 if(actual.version!==expected||actual.arch!==process.arch)throw Error('Electron binary version or architecture differs from this native builder.');
 return {prepared:true,version:actual.version,arch:actual.arch};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)console.log(JSON.stringify(prepareElectron()));
