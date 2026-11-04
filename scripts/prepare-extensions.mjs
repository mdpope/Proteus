import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
// A reproducible, fail-closed patch of the pinned dependency. Packaging invokes
// this on the copied dependency too; npm install must not lose the pipe repair.
export function prepareExtensions(root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')){
 const base=path.join(root,'node_modules/electron-chrome-extensions');
 const pkg=JSON.parse(fs.readFileSync(path.join(base,'package.json'),'utf8'));
 if(pkg.version!=='4.9.0')throw Error('Review Proteus native messaging patch for the new adapter version.');
 const file=path.join(base,'dist/cjs/index.js');let text=fs.readFileSync(file,'utf8');
 const marker='// Proteus native messaging lifecycle v1';
 const hostRequire="require('../../../../desktop/services/native-messaging-host.cjs')";
 // Existing installs may already contain v1 with the pre-organization path.
 // Migrate the copied dependency, without modifying a shared source dependency.
 if(text.includes(marker)){
  text=text.replace("require('../../../../desktop/native-messaging-host.cjs')",hostRequire);
  if(!text.includes(hostRequire))throw Error('Native messaging patch host path changed.');
 }
 if(!text.includes(marker)){
  const start=text.indexOf('var NativeMessagingHost = class {'),end=text.indexOf('// src/browser/api/runtime.ts',start);
  if(start<0||end<start)throw Error('Native messaging patch target changed.');
  text=text.slice(0,start)+marker+"\nvar NativeMessagingHost = require('../../../../desktop/services/native-messaging-host.cjs').createNativeMessagingHost({readConfig:readNativeMessagingHostConfig,spawn:import_node_child_process.spawn});\n\n"+text.slice(end);
 }
 const preloadFile=path.join(base,'dist/chrome-extension-api.preload.js');let preload=fs.readFileSync(preloadFile,'utf8');
 const contextsMarker='// Proteus extension contexts v1';
 if(!preload.includes(contextsMarker)){
  const needle='              openOptionsPage: invokeExtension2("runtime.openOptionsPage"),';
  if(!preload.includes(needle))throw Error('Extension runtime context patch target changed.');
  preload=preload.replace(needle,`              ${contextsMarker}
              getContexts: async (filter = {}, callback) => {
                const native = typeof base?.getContexts === "function" ? await base.getContexts(filter) : [];
                const owned = await invokeExtension2("runtime.getContexts")(filter);
                const contexts = [...(native || []), ...(owned || [])];
                if (callback) callback(contexts);
                return contexts;
              },
${needle}`);
 }
 // The vendor development bundle logs every API argument/result by default.
 // Extension messages can contain vault material; never send it to the console.
 preload=preload.replaceAll('if (true) {','if (false) {');
 fs.writeFileSync(file,text);
 fs.writeFileSync(preloadFile,preload);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))prepareExtensions();
