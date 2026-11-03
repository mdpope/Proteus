import test from 'node:test';
import assert from 'node:assert/strict';
import {linuxBuildIdentity} from '../scripts/linux-build-identity.mjs';
import {validateProvenance} from '../desktop/updates/build-provenance.cjs';
import {releaseSourceCommit} from '../scripts/release-source.mjs';
import {createHash} from 'node:crypto';
const commit='a'.repeat(40),digest=value=>createHash('sha256').update(value).digest('hex');
const files={runtimeFiles:{'src/app.js':digest('runtime')},buildInputs:{'scripts/package-linux.mjs':digest('builder')}};
function identity(changed=false){return linuxBuildIdentity({root:'/synthetic',version:'fixture',upstream:{transferCommit:'historical'},...files,git:(_,[command])=>command==='rev-parse'?commit:changed?' M src/app.js':''});}
test('new Linux provenance binds full current commit and supports normal release source verification',()=>{
 const value=identity();assert.equal(value.sourceCommit,commit);assert.equal(value.gitHead,commit.slice(0,12));assert.equal(value.dirty,false);assert.match(value.buildRevision,new RegExp('^'+commit.slice(0,12)+'\\+src\\.'));
 assert.doesNotThrow(()=>validateProvenance(value));
 const git=(_,[command,argument])=>command==='rev-parse'?commit:Buffer.from(argument.endsWith(':src/app.js')?'runtime':'builder');
 assert.equal(releaseSourceCommit(value,{commit,git}),commit);
});
test('dirty Linux inputs remain explicit and cannot be signed as the clean release',()=>{
 const dirty=identity(true);assert.equal(dirty.dirty,true);assert.match(dirty.buildRevision,/\+dirty\./);assert.notEqual(dirty.sourceFingerprint,identity().sourceFingerprint);
 assert.throws(()=>releaseSourceCommit(dirty,{commit}),/does not match/);
 assert.throws(()=>linuxBuildIdentity({...files,git:()=> 'short'}),/complete Linux source commit/);
});
