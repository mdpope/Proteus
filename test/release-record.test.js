import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import {currentRelease,openRelease} from '../src/services/updates/release-record.js';
import {shortReleaseDate,versionLabel} from '../public/shared/ui/release-label.js';

test('a named release reserves one patch version and prevents parallel or changed identities',t=>{
 const root=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-release-record-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.mkdirSync(path.join(root,'docs'));fs.writeFileSync(path.join(root,'docs/2026-10-30-release-plan.md'),'# Synthetic plan');
 fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({name:'fixture',version:'1.2.3'}));
 fs.writeFileSync(path.join(root,'package-lock.json'),JSON.stringify({version:'1.2.3',packages:{'':{version:'1.2.3'}}}));
 assert.equal(currentRelease(root),null);
 const request={id:'oct30',name:'Synthetic October release',date:'2026-10-30'},record=openRelease(root,request);
 assert.equal(record.version,'1.2.4');assert.deepEqual(openRelease(root,request),record);
 assert.equal(JSON.parse(fs.readFileSync(path.join(root,'package-lock.json'))).packages[''].version,'1.2.4');
 assert.equal(JSON.parse(fs.readFileSync(path.join(root,'package.json'))).releaseDate,'2026-10-30');
 assert.ok(fs.existsSync(path.join(root,record.rollout)));assert.ok(fs.existsSync(path.join(root,record.implementation)));
 assert.throws(()=>openRelease(root,{...request,id:'next'}),/Close the current/);
 assert.throws(()=>openRelease(root,{...request,id:'../escape'}),/Supply a stable/);
 const metadata=JSON.parse(fs.readFileSync(path.join(root,'package.json')));metadata.version='1.2.9';fs.writeFileSync(path.join(root,'package.json'),JSON.stringify(metadata));
 assert.throws(()=>openRelease(root,request),/versions differ/);
});

test('release labels use a short date without timezone shifts or guessed dates',()=>{
 assert.equal(shortReleaseDate('2026-11-01'),'Nov 1');assert.equal(shortReleaseDate('2026-02-30'),'');assert.equal(shortReleaseDate(null),'');
 assert.equal(versionLabel({version:'0.2.40',releaseDate:'2026-11-01'}),'0.2.40 · Nov 1');assert.equal(versionLabel({version:'old'}),'old');
});
