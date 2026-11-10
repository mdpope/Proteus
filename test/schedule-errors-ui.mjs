import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const fixture=await sidebarFixture();let app;
try{
 for(let restart=0;restart<2;restart++){
  app=await electron.launch({args:['.','--use-mock-keychain'],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,CODEX_HOME:fixture.auth,PORT:'0'}});
  const page=await app.firstWindow();await page.locator('#topbar-home').waitFor();
  const capability=await page.evaluate(async cwd=>{const response=await fetch('/api/schedule-capabilities',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider:'copilot',workspace:{cwd,additionalDirectories:[]},executionPermissions:{mode:'custom',sandboxedCommands:true,folders:[{path:cwd,access:'read-write'}]}})});const result=await response.json();if(!response.ok)throw Error(result.error);return result;},fixture.studio.cwd);assert.equal(capability.runtime.verified,true);assert.equal(capability.runtime.modelTurnStarted,false);
  if(!restart)await page.evaluate(async cwd=>{
   const schedule={schemaVersion:1,id:'schedule-error-fixture',name:'Synthetic capability failure',provider:'mtplx',model:'fixture',workspace:{cwd,additionalDirectories:[]},cron:'0 9 * * *',timezone:'UTC',misfire:'skip',prompt:'Synthetic',enabled:false,executionPermissions:{mode:'custom',sandboxedCommands:true,folders:[{path:cwd,access:'read'}]}};
   for(let attempt=0;attempt<2;attempt++){const response=await fetch('/api/schedules',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({schedule})});if(response.status!==400)throw Error('Expected rejected save');}
  },fixture.studio.cwd);
  await page.evaluate(async()=>{
   const {initEngineRoom,renderEngineRoom}=await import('/features/settings/engine-room.js');
   const data=await (await fetch('/api/state')).json();initEngineRoom({state:{page:'engine',engineSection:'notifications',data},api:async(url,body)=>{const response=await fetch(url,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});return response.json();},escape:value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),time:value=>value,toast(){}});
   renderEngineRoom('notifications',true);
  });
  const notice=page.locator('article.resource-row').filter({hasText:'ERROR · Schedule save failed'});await notice.waitFor({timeout:5000}).catch(async error=>{console.error((await page.locator('#main').textContent()).slice(0,1800));console.error(await page.evaluate(async()=>{const data=await(await fetch('/api/notifications')).json();return {count:data.items?.length,types:data.items?.map(row=>row.type)};}));throw error;});assert.equal(await notice.count(),1);assert.match(await notice.textContent(),/cannot enforce/);
  await app.close();app=null;
 }
 console.log('Passed actual Electron Notification Center severity, failed-save retry deduplication and restart persistence.');
}finally{await app?.close();await fixture.cleanup();}
