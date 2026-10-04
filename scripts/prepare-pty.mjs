import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
// node-pty 1.1.0's macOS prebuilt helper can arrive without its executable bit.
export function preparePty(root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')) {
 const directory=path.join(root,'node_modules/node-pty');
 for(const sub of ['prebuilds/darwin-arm64','prebuilds/darwin-x64','build/Release']){
  const helper=path.join(directory,sub,'spawn-helper');if(fs.existsSync(helper))fs.chmodSync(helper,0o755);
 }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))preparePty();
