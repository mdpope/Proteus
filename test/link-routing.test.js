import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {matches,routeRule,selectWindow,targetKey}=require('../desktop/link-routing/rules.cjs');
const {LinkRoutingStore}=require('../desktop/link-routing/store.cjs');
const {BrowserRegistration}=require('../desktop/link-routing/registration.cjs');
const destination={hostId:'local',workspaceId:'studio',projectId:'chat'};
test('link rules preserve host boundaries, subdomains, globs and path-prefix behavior',()=>{
  for(const pattern of ['example.com','*.example.com','https://example.com/team','example.com/te?m/*'])assert.equal(matches(pattern,'https://example.com/team/work?q=1'),true,pattern);
  assert.equal(matches('example.com','https://a.example.com/'),true);
  assert.equal(matches('example.com','https://notexample.com/'),false);
  assert.equal(matches('example.com/team','https://example.com/teammate'),false);
  assert.equal(matches('example.com','https://user:secret@example.com/'),false);
  assert.equal(matches('example.com','file:///example.com'),false);
});
test('unavailable first matching destination prompts and never silently uses the next rule',()=>{
  const second={...destination,projectId:'other'},rules=[{pattern:'example.com',destination},{pattern:'example.com',destination:second}];
  assert.equal(routeRule(rules,'https://example.com',[second]).unavailable,true);
  rules[0].enabled=false;assert.equal(routeRule(rules,'https://example.com',[second]).target,second);
});
test('external links prefer a project window, then workspace, then main; identical remote IDs stay separate',()=>{
  const ctx=(id,tabs,focused=false)=>({id,window:{isDestroyed:()=>false,isFocused:()=>focused},session:{get:()=>({tabs})}});
  const root={type:'workspace',workspaceId:'studio'},project={...root,projectId:'chat'};
  const main=ctx('main',[]),workspace=ctx('workspace',[root],true),target=ctx('project',[project]),remote=ctx('remote',[{...project,hostId:'different-host'}]);
  assert.equal(selectWindow([main,workspace,remote,target],destination),target);
  project.navigationClosed=true;assert.equal(selectWindow([main,workspace,target],destination),workspace);
  root.hidden=true;assert.equal(selectWindow([main,workspace,target],destination),main);
});
test('rule storage rejects stale writes, preserves unknown fields and never overwrites invalid state',t=>{
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-link-rules-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
  const store=new LinkRoutingStore(home),initial=store.read();
  const saved=store.save([{id:'rule',enabled:true,pattern:'*.example.com',destination}],initial.revision);
  assert.equal(saved.rules.length,1);assert.throws(()=>store.save([],initial.revision),/changed/);
  const value={schemaVersion:1,rules:saved.rules,future:{preserve:true}};fs.writeFileSync(store.file,JSON.stringify(value));
  assert.deepEqual(store.save([],store.read().revision).future,{preserve:true});
  fs.writeFileSync(store.file,'invalid');assert.throws(()=>store.read(),/preserved/);assert.equal(fs.readFileSync(store.file,'utf8'),'invalid');
});
test('browser registration is explicit, scoped to this app, verifies both schemes and disables development copies',async()=>{
  const defaults=new Set(),commands=[];
  const app={isPackaged:true,getAppPath:()=>'/Applications/Proteus.app/Contents/Resources/app',isDefaultProtocolClient:scheme=>defaults.has(scheme),getApplicationNameForProtocol:()=> 'Safari',setAsDefaultProtocolClient:scheme=>{defaults.add(scheme);return true;}};
  const registration=new BrowserRegistration(app,{platform:'darwin',execute:async(...args)=>commands.push(args)});
  assert.equal(registration.status().isDefault,false);assert.equal(commands.length,0);
  await registration.act('register');assert.deepEqual(commands[0][1],['-f','-R','-trusted','/Applications/Proteus.app']);assert.equal(defaults.size,0);
  assert.equal((await registration.act('make-default')).isDefault,true);
  app.isPackaged=false;await assert.rejects(()=>registration.act('register'),/installed macOS/);
  assert.notEqual(targetKey(destination),targetKey({...destination,hostId:'other'}));
});

test('production bundle declares ownership of both web protocols while previews declare none',async()=>{
 const {browserBundleInfo}=await import('../desktop/link-routing/bundle-info.cjs').then(module=>module.default);
 assert.deepEqual(browserBundleInfo({preview:true}),{});
 const declarations=browserBundleInfo().CFBundleURLTypes;
 for(const scheme of ['http','https']){const item=declarations.find(item=>item.CFBundleURLSchemes.includes(scheme));assert.equal(item.LSHandlerRank,'Owner');assert.equal(item.CFBundleTypeRole,'Viewer');}
 assert.ok(declarations.some(item=>item.CFBundleURLSchemes.includes('proteus-desktop')));
});

test('provider sign-in launcher honors browser preference without silently switching browsers',async()=>{
 const {openPreferredBrowser}=require('../desktop/link-routing/preferred-browser.cjs'),calls=[];
 const options={embedded:async url=>calls.push(['embedded',url]),system:async url=>calls.push(['system',url])};
 await openPreferredBrowser('https://auth.example.test/sign-in',{...options,preference:'embedded'});
 await openPreferredBrowser('https://auth.example.test/sign-in',{...options,preference:'system'});
 assert.deepEqual(calls.map(call=>call[0]),['embedded','system']);
 await assert.rejects(openPreferredBrowser('https://auth.example.test/',{system:options.system}),/not ready/);
 await assert.rejects(openPreferredBrowser('https://user:password@auth.example.test/',options),/without credentials/);assert.equal(calls.length,2);
});
