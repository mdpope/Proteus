import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
import {publicAssets} from '../src/shared/public-assets.js';
test('nested public modules are served through an exact allowlist without symlink or private-file exposure',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-assets-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const publicRoot=path.join(root,'public');fs.mkdirSync(path.join(publicRoot,'features','chats'),{recursive:true});fs.writeFileSync(path.join(publicRoot,'features','chats','view.js'),'export {}');fs.writeFileSync(path.join(root,'private.js'),'private');fs.writeFileSync(path.join(publicRoot,'settings.json'),'private');fs.symlinkSync(path.join(root,'private.js'),path.join(publicRoot,'leak.js'));fs.symlinkSync(root,path.join(publicRoot,'outside'));
 const assets=publicAssets(publicRoot);assert.deepEqual(assets['/features/chats/view.js'],['features/chats/view.js','text/javascript']);assert.equal(assets['/leak.js'],undefined);assert.equal(assets['/settings.json'],undefined);assert.equal(assets['/outside/private.js'],undefined);
});
