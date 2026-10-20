// A distinct Electron user-data directory and private host are enforced by preview-runtime.
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const root=fileURLToPath(new URL('..',import.meta.url));
const child=spawn(require('electron'),[root],{stdio:'inherit',env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1'}});
child.once('error',error=>{console.error(error.message);process.exitCode=1;});
child.once('exit',code=>{process.exitCode=code??1;});
