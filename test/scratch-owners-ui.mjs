import {chromium} from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {Scratchpad} from '../src/services/scratchpad/scratchpad.js';
const root=process.cwd(),home=fs.mkdtempSync(path.join(os.tmpdir(),'scratch-owners-')),owners=new Map(),browser=await chromium.launch();
try{
 for(const id of ['local','remote']){
  const folder=path.join(home,id);fs.mkdirSync(folder);const workspace={id:id+'-ws',name:id+' workspace'},project={id:id+'-pr',name:id+' project',workspaceId:workspace.id};
  const service=new Scratchpad(folder,{projects:{snapshot:()=>({catalog:{projects:[project]},config:{workspaces:[workspace]}})}});owners.set(id,{service,workspace,project});
  await service.configure({folder,expectedRevision:service.settings().revision});await service.handle({action:'create',projectId:project.id,title:id+' note',body:'Original '+id,operationId:randomUUID()});
 }
 const page=await browser.newPage();page.setDefaultTimeout(15000);
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:'<main></main><script type="module">import {createScratchpadView} from "/public/features/scratchpad/scratchpad.js";let current="local",view;const catalogs={local:{ws:{id:"local-ws",name:"local workspace"},pr:{id:"local-pr",name:"local project",workspaceId:"local-ws"}},remote:{ws:{id:"remote-ws",name:"remote workspace"},pr:{id:"remote-pr",name:"remote project",workspaceId:"remote-ws"}}};async function mount(id){await view?.destroy();current=id;const owner=id;view=createScratchpadView({storageKey:"owners:"+id,owners:()=>[{id:"local",name:"Local"},{id:"remote",name:"Remote"}],ownerId:id,onOwner:mount,workspaces:()=>[catalogs[id].ws],projects:()=>[catalogs[id].pr],request:async args=>{const response=await fetch("/owner/"+owner,{method:"POST",body:JSON.stringify(args)});const result=await response.json();if(!response.ok)throw Error(result.error);return result;}});await view.mount(document.querySelector("main"));}await mount("local");</script>'});
  if(url.pathname.startsWith('/owner/')){try{return route.fulfill({json:await owners.get(url.pathname.slice(7)).service.handle(route.request().postDataJSON())});}catch(error){return route.fulfill({status:409,json:{error:error.message}});}}
  const file=path.resolve(root,'.'+url.pathname);if(!url.pathname.startsWith('/public/')||!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.abort();return route.fulfill({contentType:file.endsWith('.css')?'text/css':'text/javascript',body:fs.readFileSync(file)});
 });
 await page.goto('https://scratch.test');const picker=page.getByRole('group',{name:'Scratchpad computers',exact:true});await picker.getByRole('button',{name:'Local',exact:true}).waitFor();assert.equal(await picker.getByRole('button',{name:'Local',exact:true}).getAttribute('aria-pressed'),'true');
 await picker.getByRole('button',{name:'Remote',exact:true}).click();await page.getByRole('group',{name:'Filter by workspace'}).getByRole('button',{name:'remote workspace',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'local workspace',exact:true}).count(),0);
 await page.locator('.scratchpad-row').filter({hasText:'remote note'}).click();await page.locator('.cm-content').waitFor();await page.getByRole('button',{name:'Source',exact:true}).click();await page.locator('.cm-content').fill('Changed on remote owner');await page.getByRole('button',{name:'Preview',exact:true}).click();await page.locator('.scratchpad-document>.note').filter({hasText:/^Saved$/}).waitFor();
 const remote=(await owners.get('remote').service.handle({action:'list'})).items[0];assert.equal((await owners.get('remote').service.handle({action:'read',id:remote.id})).body,'Changed on remote owner');
 const local=(await owners.get('local').service.handle({action:'list'})).items[0];assert.equal((await owners.get('local').service.handle({action:'read',id:local.id})).body,'Original local');
 console.log(JSON.stringify({passed:true,synthetic:true,ownerSelector:true,catalogIsolation:true,remoteSave:true,localUnchanged:true}));
}finally{await browser.close();for(const owner of owners.values())await owner.service.close();fs.rmSync(home,{recursive:true,force:true});}
