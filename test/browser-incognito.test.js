import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sessions from '../desktop/browser/incognito-sessions.cjs';
import sites from '../desktop/browser/browser-site-settings.cjs';
import network from '../desktop/browser/network-permissions.cjs';
import workspace from '../desktop/windows/workspace-session.cjs';

test('Incognito sessions are independent nonpersistent partitions, cleared before release',async()=>{
 const registry=new sessions.IncognitoSessions(),one=registry.create(),two=registry.create(),calls=[];
 assert.notEqual(one,two);assert.ok(!registry.partition(one).startsWith('persist:'));
 await registry.close(one,{clearStorageData:async()=>calls.push('storage'),clearCache:async()=>calls.push('cache'),closeAllConnections:async()=>calls.push('connections')});
 assert.deepEqual(calls,['storage','cache','connections']);assert.equal(registry.has(one),false);assert.equal(registry.has(two),true);
});

test('Incognito site settings and network permissions remain memory only beside ordinary settings',()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-private-settings-'));
 try{
  const registry=new sessions.IncognitoSessions(),id=registry.create(),partition=registry.partition(id),settings=new sites.BrowserSiteSettings(home);
  settings.remember(partition,'https://private-marker.invalid',{mode:'mobile'});settings.rememberScale(partition,'https://private-marker.invalid',150);
  assert.equal(settings.get(partition,'https://private-marker.invalid').mode,'mobile');assert.equal(settings.scale(partition,'https://private-marker.invalid'),150);
  settings.remember('persist:ordinary','https://ordinary.invalid',{mode:'desktop'});settings.flush();
  const permissions=new network.NetworkPermissions({options:{home},sessionNames:new Map([[id,partition],['default','persist:ordinary']])});
  permissions.save(id,'local-network','https://private-marker.invalid','allow');permissions.save('default','local-network','https://ordinary.invalid','allow');
  assert.equal(permissions.permission(id,'local-network','https://private-marker.invalid'),'allow');
  for(const file of fs.readdirSync(home))assert.doesNotMatch(fs.readFileSync(path.join(home,file),'utf8'),/private-marker|proteus-incognito/);
  settings.forget(partition);assert.equal(settings.scale(partition,'https://private-marker.invalid'),100);assert.deepEqual(settings.entries(partition),{});
 }finally{fs.rmSync(home,{recursive:true,force:true});}
});

test('window and Team checkpoints discard Incognito titles, URLs, history and selected identities',()=>{
 const privateTab={id:'private-marker',type:'browser',title:'PRIVATE TITLE',url:'https://private-marker.invalid',incognito:true,history:{entries:[{url:'https://private-marker.invalid',title:'PRIVATE TITLE'}],index:0}};
 const value=workspace.normalizeSession({active:privateTab.id,tabs:[privateTab,{id:'ordinary',type:'browser',url:'https://ordinary.invalid'}],team:{active:privateTab.id,tabs:[privateTab]},selectedChildren:{parent:privateTab.id}});
 assert.doesNotMatch(JSON.stringify(value),/private-marker|PRIVATE TITLE/);assert.ok(value.tabs.some(tab=>tab.id==='ordinary'));
});
