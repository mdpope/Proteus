import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { PermissionStore, canonicalPath, permissionContext } from '../src/services/settings/permissions.js';

const fixture = () => privateTemporaryDirectory(path.join(os.tmpdir(), 'proteus-permission-paths-'));
const schedule = cwd => ({name:'Synthetic chat', provider:'fixture', workspace:{cwd, additionalDirectories:[]}, skillDirectories:[]});
function observePaths(fn) {
  const lstat=fs.lstatSync,realpath=fs.realpathSync,counts={lstat:0,realpath:0};
  fs.lstatSync=function(...args){counts.lstat++;return lstat.apply(this,args);};
  fs.realpathSync=function(...args){counts.realpath++;return realpath.apply(this,args);};
  const start=performance.now();
  try{return {value:fn(),counts,milliseconds:performance.now()-start};}
  finally{fs.lstatSync=lstat;fs.realpathSync=realpath;}
}

test('one synchronous display snapshot resolves shared roots/skills once across 248 runs and context list',t=>{
  const home=fixture();
  try {
    const store=new PermissionStore(home),spec=schedule(home);
    spec.workspace.additionalDirectories=Array.from({length:4},(_,i)=>path.join(home,'root-'+i));
    spec.skillDirectories=Array.from({length:4},(_,i)=>path.join(home,'skill-'+i));
    for(const folder of [...spec.workspace.additionalDirectories,...spec.skillDirectories])fs.mkdirSync(folder);
    const runs=Array.from({length:248},(_,i)=>({id:'run-'+i,schedule:{...spec,name:'Chat '+i,ref:{runId:'run-'+i}}}));
    const baseline=observePaths(()=>({runs:runs.map(run=>store.describeRun(run)),contexts:runs.map(run=>permissionContext(run.schedule))}));
    const snapshot=store.snapshot(),projected=observePaths(()=>({runs:runs.map(run=>store.describeRun(run,snapshot)),contexts:store.describeMany(runs.map(run=>run.schedule),snapshot)}));
    assert.deepEqual(projected.value.runs,baseline.value.runs);
    assert.equal(projected.value.contexts.length,1);
    assert.deepEqual(projected.value.contexts[0],{...store.describe(runs.at(-1).schedule),ref:runs.at(-1).schedule.ref});
    assert.equal(baseline.counts.lstat+baseline.counts.realpath,8928);
    assert.deepEqual(projected.counts,{lstat:9,realpath:9});
    t.diagnostic(JSON.stringify({synthetic:true,chats:248,roots:5,skills:4,baseline:{...baseline.counts,ms:baseline.milliseconds},snapshot:{...projected.counts,ms:projected.milliseconds}}));
  } finally {fs.rmSync(home,{recursive:true,force:true});}
});

test('projection key includes exact cwd and requested path without sharing labels or refs',()=>{
  const home=fixture();
  try {
    const store=new PermissionStore(home),schedules=['a','b'].map(name=>{
      const cwd=path.join(home,name);fs.mkdirSync(path.join(cwd,'same'),{recursive:true});
      return {...schedule(cwd),name,ref:name,workspace:{cwd,additionalDirectories:['same','./same']},skillDirectories:['same']};
    });
    const expected=schedules.map(s=>store.describe(s)),snapshot=store.snapshot();
    const measured=observePaths(()=>schedules.map(s=>store.describe(s,snapshot)));
    assert.deepEqual(measured.value,expected);assert.notEqual(measured.value[0].id,measured.value[1].id);
    assert.deepEqual(measured.counts,{lstat:6,realpath:6},'cwd, same and ./same are distinct keys for each owner cwd');
  } finally {fs.rmSync(home,{recursive:true,force:true});}
});

test('inherited working folders and provider displays share only the current projection path checks',async t=>{
  const home=fixture();
  try {
    const roots=Array.from({length:12},(_,i)=>path.join(home,'root-'+i));
    for(const folder of roots)fs.mkdirSync(folder);
    const providerHome=path.join(home,'provider');fs.symlinkSync(roots[0],providerHome);
    const store=new PermissionStore(home,{preserveInheritedDefaults:true});
    store.workspaceDefaults=()=>({mode:'custom',workingRoots:roots,folders:[{path:roots[2],access:'read'}],rules:[]});
    store.automaticProviderFolders=(run,resolve=canonicalPath)=>[{path:resolve(providerHome,run.schedule.workspace.cwd),access:'read-write',source:'provider'}];
    const spec={...schedule(home),workspace:{cwd:home,additionalDirectories:roots},context:{workspaceId:'synthetic',baseWorkspace:{cwd:home,additionalDirectories:[roots[1]]}}};
    const runs=Array.from({length:500},(_,i)=>({id:'run-'+i,schedule:{...spec,name:'Chat '+i,permissionScope:{kind:'schedule',id:'synthetic-schedule'},ref:{runId:'run-'+i}}}));
    const baseline=observePaths(()=>runs.map(run=>store.describeRun(run)));
    const snapshot=store.snapshot(),projected=observePaths(()=>({runs:runs.map(run=>store.describeRun(run,snapshot)),contexts:store.describeMany(runs.map(run=>run.schedule),snapshot)}));
    assert.deepEqual(projected.value.runs,baseline.value);
    assert.equal(projected.value.contexts.length,1);
    assert.ok(baseline.counts.realpath>10000);
    assert.ok(projected.counts.realpath<100,JSON.stringify(projected.counts));
    const before=store.describeRun(runs[0],snapshot);
    fs.unlinkSync(providerHome);fs.symlinkSync(roots[1],providerHome);
    assert.equal(store.describeRun(runs[0],snapshot).automaticFolders[0].path,roots[0]);
    assert.equal(store.describeRun(runs[0]).automaticFolders[0].path,roots[1],'direct descriptions remain fresh');
    assert.equal(store.decide(spec,{kind:'write',path:path.join(roots[2],'new.txt')},before).allowed,false,'read-only working folder stays authoritative');
    await Promise.resolve();
    assert.equal(store.describeRun(runs[0],snapshot).automaticFolders[0].path,roots[1],'a retained display snapshot cannot retain path checks after a microtask');
    t.diagnostic(JSON.stringify({synthetic:true,chats:runs.length,roots:roots.length,baseline:{...baseline.counts,ms:baseline.milliseconds},projection:{...projected.counts,ms:projected.milliseconds}}));
  } finally {fs.rmSync(home,{recursive:true,force:true});}
});

test('new snapshots and direct authorization observe symlink retarget, deletion and revoked grants',()=>{
  const home=fixture();
  try {
    const a=path.join(home,'a'),b=path.join(home,'b'),link=path.join(home,'working');fs.mkdirSync(a);fs.mkdirSync(b);fs.symlinkSync(a,link);
    const store=new PermissionStore(home),spec=schedule(link);store.setMode(spec,'trusted');
    const snapshot=store.snapshot(),before=store.describe(spec,snapshot);
    assert.equal(store.decide(spec,{kind:'read',path:'new.txt'}).allowed,true);
    fs.unlinkSync(link);fs.symlinkSync(b,link);
    assert.equal(store.describe(spec,snapshot).cwd,before.cwd,'one synchronous display snapshot stays consistent');
    assert.equal(store.describe(spec).cwd,fs.realpathSync(b));assert.equal(store.decide(spec,{kind:'read',path:'new.txt'}).allowed,false);
    assert.equal(permissionContext(spec).cwd,fs.realpathSync(b),'direct permission contexts never use display-path memoization');
    assert.equal(store.decide(spec,{kind:'read',resolvedPath:path.join(link,'new.txt')},before).allowed,false,'explicit profiles still canonicalize each actual request freshly');
    fs.unlinkSync(link);fs.symlinkSync(a,link);const again=store.describe(spec);assert.equal(again.id,before.id);
    store.revoke(again.id,store.get().revision);assert.equal(store.describe(spec,snapshot).mode,before.mode);assert.equal(store.decide(spec,{kind:'shell',fullCommandText:'echo synthetic'}).allowed,false);
    fs.rmSync(a,{recursive:true});assert.equal(canonicalPath(link,home),null);assert.equal(store.describe(spec).cwd,link);assert.equal(store.decide(spec,{kind:'read',resolvedPath:link}).allowed,false);
  } finally {fs.rmSync(home,{recursive:true,force:true});}
});

test('retaining a display snapshot across a microtask cannot retain canonical paths or dangling-link results',async()=>{
  const home=fixture();
  try {
    const target=path.join(home,'later'),link=path.join(home,'working');fs.symlinkSync(target,link,'dir');
    const store=new PermissionStore(home),spec=schedule(link),snapshot=store.snapshot();
    assert.equal(store.describe(spec,snapshot).cwd,link);fs.mkdirSync(target);
    assert.equal(store.describe(spec,snapshot).cwd,link,'null canonical results are memoized during this projection only');
    await Promise.resolve();
    assert.equal(store.describe(spec,snapshot).cwd,fs.realpathSync(target));
    fs.rmSync(target,{recursive:true});assert.equal(store.describe(spec,snapshot).cwd,link,'expired snapshots never recache later observations');
  } finally {fs.rmSync(home,{recursive:true,force:true});}
});

test('large display snapshots bound retained canonical resolutions without changing output',()=>{
  const home=fixture();
  try {
    const store=new PermissionStore(home),spec=schedule(home);spec.workspace.additionalDirectories=Array.from({length:1100},(_,i)=>path.join(home,'root-'+i));
    for(const folder of spec.workspace.additionalDirectories)fs.mkdirSync(folder);
    const snapshot=store.snapshot(),first=store.describe(spec,snapshot),second=observePaths(()=>store.describe(spec,snapshot));
    assert.deepEqual(second.value,first);assert.ok(second.counts.realpath>=77,'at most 1024 path results are retained');assert.ok(second.counts.realpath<1101,'bounded hot set still avoids repeated filesystem work');
  } finally {fs.rmSync(home,{recursive:true,force:true});}
});
