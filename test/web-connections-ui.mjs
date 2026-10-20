import os from 'node:os';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
export async function exerciseConnections(page,app,root,origin){
 const hostId=app.remote.config.hostId;
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'web/public/build/manifest.json')));
 const moduleURL='/build/'+manifest['resources/js/remote-client.js'].file;
 // Synthetic-only fixture reproduces an existing browser-only authorization; no production key is read.
 await page.evaluate(async({hostId,moduleURL})=>{
  const {PairingStore}=await import(moduleURL),account=document.body.dataset.browserAccount,store=new PairingStore(account);
  const headers={Accept:'application/json','Content-Type':'application/json','X-Proteus-Account':account,'X-CSRF-TOKEN':document.querySelector('meta[name=csrf-token]').content};
  const credential=await(await fetch('/remote/destinations/'+hostId+'/credential',{headers})).json();
  const key=await crypto.subtle.importKey('raw',Uint8Array.from(credential.key.match(/../g),byte=>parseInt(byte,16)),{name:'AES-GCM'},false,['encrypt','decrypt']);
  await store.save({...credential,key});await fetch('/remote/destinations/'+hostId,{method:'DELETE',headers,body:JSON.stringify({deviceId:credential.deviceId})});
  await fetch('/app-api/preferences',{method:'PUT',headers,body:JSON.stringify({defaultMacId:null})});store.close();
 },{hostId,moduleURL});
 await page.locator('[data-shell-nav=engine-room]').click();await page.waitForURL('**/engine-room');
 await page.waitForFunction(()=>document.querySelector('#resource-data')?.textContent==='Choose a Default computer in Engine Room.');
 assert.doesNotMatch(await page.locator('#resource-data').innerText(),/offline/i);
 await page.locator('[data-engine-tab=connections]').click();await page.locator('#default-mac-form').waitFor();
 assert.match(await page.locator(`#default-mac-form option[value="${hostId}"]`).innerText(),/this browser only/);
 await page.locator('#default-mac-form select').selectOption(hostId);await page.locator('#default-mac-form button').click();
 await page.waitForFunction(()=>document.querySelector('#default-mac-status')?.textContent==='Studio Desktop · Connected');
 await page.waitForFunction(()=>document.querySelector('#web-provider-usage')?.textContent.includes('70%'));
 const count=await page.evaluate(async()=>{const headers={Accept:'application/json','X-Proteus-Account':document.body.dataset.browserAccount};return(await(await fetch('/remote/destinations',{headers})).json()).destinations.length;});assert.equal(count,0);
 // A desktop rename arrives only over the authenticated channel, without re-enrollment.
 await app.remote.configure({enabled:true,label:'Renamed workstation'});app.remote.changed();
 await page.waitForFunction(()=>document.querySelector('#default-mac-status')?.textContent==='Renamed workstation · Connected');
 await page.goto(origin+'/engine-room?tab=connections');await page.locator('#default-mac-form').waitFor();
 assert.match(await page.locator(`#default-mac-form option[value="${hostId}"]`).innerText(),/Renamed workstation/);
 // Loss and recovery update this page without requiring another save or reload.
 await app.remote.configure({enabled:false});
 await page.waitForFunction(()=>document.querySelector('#default-mac-status')?.textContent.includes('unavailable'));
 await app.remote.configure({enabled:true});
 await page.waitForFunction(()=>document.querySelector('#default-mac-status')?.textContent==='Renamed workstation · Connected');
 await page.screenshot({path:path.join(os.tmpdir(),'proteus-web-connections-dynamic.png'),fullPage:true});
 // The IndexedDB name update is atomic and may neither resurrect a removed pairing nor replace a newer device.
 const race=await page.evaluate(async moduleURL=>{
  const {PairingStore}=await import(moduleURL),store=new PairingStore(document.body.dataset.browserAccount);
  const id='55555555-5555-4555-8555-555555555555',key=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  const original={hostId:id,relay:'wss://relay.example.test',label:'Original',deviceId:'66666666-6666-4666-8666-666666666666',pairedAt:'2026-10-01T00:00:00Z',key};
  await store.save(original);const updated=await store.renameIfCurrent(original,'Renamed');
  const replacement={...original,deviceId:'77777777-7777-4777-8777-777777777777',label:'Replacement'};await store.save(replacement);
  const stale=await store.renameIfCurrent(original,'Stale');const retained=(await store.list()).find(row=>row.hostId===id).label;
  await store.remove(id);const removed=await store.renameIfCurrent(replacement,'Resurrected');const absent=!(await store.list()).some(row=>row.hostId===id);store.close();return{updated,stale,retained,removed,absent};
 },moduleURL);assert.deepEqual(race,{updated:true,stale:false,retained:'Replacement',removed:false,absent:true});
 // Prominent bidirectional navigation works by keyboard at wide and narrow widths.
 for(const width of [1440,390]){await page.setViewportSize({width,height:width===390?844:1000});const pairLink=page.getByRole('link',{name:'Pair or manage computers →',exact:true});await pairLink.focus();await pairLink.press('Enter');await page.waitForURL('**/remote?view=connections');await page.getByRole('heading',{name:'Pair, choose a default, connect'}).waitFor();await page.waitForFunction(()=>document.querySelector('#remote-default-label')?.textContent.includes('Account Default computer: Renamed workstation'));const defaultLink=page.getByRole('link',{name:'Choose or change Default computer →',exact:true});await defaultLink.focus();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(os.tmpdir(),`proteus-oct6-web-connections-${width}.png`),fullPage:true});await defaultLink.press('Enter');await page.waitForURL('**/engine-room?tab=connections');await page.locator('#default-mac-form').waitFor();assert.equal(await page.locator('#default-mac-form select').inputValue(),hostId);}
 await page.setViewportSize({width:1440,height:1000});
 // Same account preference in a new browser has no local key: show unpaired, never offline or discovered.
 const context=await page.context().browser().newContext({storageState:await page.context().storageState()});const fresh=await context.newPage();
 await fresh.goto(origin+'/engine-room?tab=connections');await fresh.waitForFunction(()=>document.querySelector('#default-mac-status')?.textContent.includes('not paired'));
 assert.equal(await fresh.locator('#default-mac-form option').count(),1);assert.doesNotMatch(await fresh.locator('#default-mac-status').innerText(),/offline/i);await context.close();
}
