import {_electron as electron} from 'playwright';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
import {createRequire} from 'node:module';const require=createRequire(import.meta.url);
const {privateTemporaryDirectory}=require('../src/shared/private-paths.cjs');
const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-llama-ui-'));let app,page;
const receipts=process.env.PROTEUS_TEST_OUTPUT||(process.env.LOCALAPPDATA?path.join(process.env.LOCALAPPDATA,'llama.cpp','acceptance'):path.join(home,'acceptance'));
fs.mkdirSync(receipts,{recursive:true,mode:0o700});
try{
 app=await electron.launch({args:['.',...(process.platform==='darwin'?['--use-mock-keychain']:[]),'--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,PORT:'0'},timeout:60000});
 page=await app.firstWindow();await page.locator('[data-page="engine"]').first().click();await page.getByRole('button',{name:'Providers',exact:true}).first().click();
 await page.getByRole('heading',{name:'llama.cpp',exact:true}).waitFor({timeout:60000});
 await page.locator('[data-refresh-provider="llama-cpp"]').click();
 await page.waitForFunction(()=>[...document.querySelectorAll('.card')].some(c=>c.querySelector('h2')?.textContent==='llama.cpp'&&c.textContent.includes('qwen3.8-27b')));
 await page.locator('[data-page="context"]').first().click();await page.locator('[data-preview-open]').first().click();await page.locator('[data-preview-new-chat]').click();const provider=page.locator('select[id$="-provider"]').last();await provider.selectOption('llama-cpp');
 await page.waitForFunction(()=>[...document.querySelectorAll('select[id$="-model"] option')].some(e=>e.value==='qwen3.8-27b')); 
 const catalog=await app.evaluate(async()=>{const s=process.mainModule.require(process.cwd()+'/desktop/main.cjs').getService();return await s.catalogs['llama-cpp'].get(true);});
 assert.equal(catalog.available,true);assert.equal(catalog.models[0].id,'qwen3.8-27b');assert.ok(catalog.models[0].controls.contextTiers[0].totalTokens>=8192);
 const admission=await app.evaluate(async(_,home)=>{
 const s=process.mainModule.require(process.cwd()+'/desktop/main.cjs').getService(),adapter=s.engine.providers['llama-cpp'].metadata;
 const {pathToFileURL}=process.mainModule.require('node:url');const {MtplxTools}=process.mainModule.require(process.cwd()+'/src/providers/mtplx-tools.js');const {appInstructions}=process.mainModule.require(process.cwd()+'/src/services/chats/document-tools.js');
 const run={id:'schema-admission-fixture',schedule:{workspace:{cwd:home,additionalDirectories:[]},mcpServers:{},skillDirectories:[]}};
 const tools=new MtplxTools({adapter,run,mcp:{},ask:async()=> 'deny',emit:()=>{},update:()=>{},signal:new AbortController().signal}).definitions();
 const model=(await adapter.models())[0];await adapter.trimHistory([{role:'system',content:appInstructions},{role:'user',content:'Reply READY.'}],model.controls.contextTiers[0].totalTokens,model.controls.maxOutputTokens,tools,new AbortController().signal);return {tools:tools.length,context:model.controls.contextTiers[0].totalTokens};
 },home);assert.ok(admission.tools>5);console.log(JSON.stringify({fullHostToolAdmission:admission}));
 await page.screenshot({path:path.join(receipts,'proteus-provider-ui.png')});
 console.log(JSON.stringify({passed:true,checks:['real desktop Providers card','live TLS model discovery','New Chat provider selection','live model picker','advertised context/reasoning controls']}));
}catch(error){if(page){console.log(await page.locator('#main').innerText());await page.screenshot({path:path.join(receipts,'ui-failure.png')});}throw error;}finally{await app?.close();if(!path.resolve(home).startsWith(path.resolve(os.tmpdir())+path.sep+'proteus-llama-ui-'))throw Error('Unexpected fixture path');fs.rmSync(home,{recursive:true,force:true});}
