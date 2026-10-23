import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const {createProvenance,validateProvenance,sourceFields}=createRequire(import.meta.url)('../desktop/updates/build-provenance.cjs');
const {compatible,inspectPackage,fileDigest}=createRequire(import.meta.url)('../desktop/updates/update-package.cjs');
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const source={runtimeFiles:{'src/server.js':'a'.repeat(64)},buildInputs:{'scripts/package-mac.mjs':'b'.repeat(64)},gitHead:'synthetic',dirty:true};

test('provenance accepts both historical encodings with an explicit compatibility version',()=>{
 for(const fields of [source,{...source,appBundleId:'org.example.Proteus'}]){
  const value={schemaVersion:1,...fields,sourceFingerprint:hash(fields)};
  assert.equal(validateProvenance(value).version,1);
  assert.equal(validateProvenance({...value,fingerprintVersion:1}).version,1);
  assert.throws(()=>validateProvenance({...value,sourceFingerprint:'0'.repeat(64)}),/inconsistent/);
 }
});
test('new provenance is readable by the old source validator and binds identity separately',()=>{
 const value=createProvenance({...source,appBundleId:'org.example.Proteus'});
 assert.equal(value.fingerprintVersion,2);
 assert.equal(value.sourceFingerprint,hash(sourceFields(value)),'protocol-1 source validator accepts the new candidate');
 assert.equal(validateProvenance(value).appBundleId,'org.example.Proteus');
 assert.throws(()=>validateProvenance({...value,appBundleId:'org.example.Other'}),/inconsistent/);
 assert.throws(()=>validateProvenance({...value,fingerprintVersion:3}),/newer provenance/);
 for(const file of ['../outside','C:/outside','/outside','src\\outside'])assert.throws(()=>validateProvenance(createProvenance({...source,runtimeFiles:{[file]:'a'.repeat(64)}})),/invalid file/);
});
test('compatibility binds a candidate to the installed bundle and team, including legacy identities',()=>{
 for(const identifier of ['local.proteus.desktop','org.example.Proteus']){
  const current={sourceFingerprint:'a',signing:{kind:'apple',identifier,team:'EXAMPLE'}};
  assert.doesNotThrow(()=>compatible(current,{sourceFingerprint:'b',signing:{...current.signing}}));
  assert.throws(()=>compatible(current,{sourceFingerprint:'b',signing:{...current.signing,identifier:'org.example.Other'}}),/signing identity/);
  assert.throws(()=>compatible(current,{sourceFingerprint:'b',signing:{...current.signing,team:'DIFFERENT'}}),/signing identity/);
 }
});
test('the production package inspector accepts v2 and verifies actual runtime bytes',t=>{
 const bundle=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-provenance-')),root=path.join(bundle,'resources/app');t.after(()=>fs.rmSync(bundle,{recursive:true,force:true}));fs.mkdirSync(root,{recursive:true});fs.writeFileSync(path.join(bundle,'proteus'),'synthetic executable; never launched');fs.writeFileSync(path.join(root,'runtime.js'),'synthetic runtime');
 const metadata={name:'proteus',version:'synthetic',buildRevision:'synthetic.123',updatesProtocol:1,dataCompatibility:1};fs.writeFileSync(path.join(root,'package.json'),JSON.stringify(metadata));
 const provenance=createProvenance({buildRevision:metadata.buildRevision,runtimeFiles:{'runtime.js':fileDigest(path.join(root,'runtime.js'))},buildInputs:{}});fs.writeFileSync(path.join(root,'build-source.json'),JSON.stringify(provenance));
 assert.equal(inspectPackage(bundle,{platform:'linux'}).sourceFingerprint,provenance.sourceFingerprint);
 fs.writeFileSync(path.join(root,'runtime.js'),'changed');assert.throws(()=>inspectPackage(bundle,{platform:'linux'}),/packaged source changed/);
});
