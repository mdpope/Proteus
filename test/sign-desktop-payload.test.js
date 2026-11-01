import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash,generateKeyPairSync} from 'node:crypto';
import {signDesktopPayload} from '../scripts/sign-desktop-payload.mjs';
import {verifyRelease} from '../src/services/updates/desktop-releases.js';
import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
function fixture(t){
 // chmod alone does not protect ephemeral keys on Windows: establish the
 // repository's private DACL before creating them, as the production guard requires.
 const root=privateTemporaryDirectory(path.join(os.tmpdir(),'payload-sign-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const {privateKey,publicKey}=generateKeyPairSync('ed25519'),keyFile=path.join(root,'publisher.pem'),output=path.join(root,'release.json');
 fs.writeFileSync(keyFile,privateKey.export({type:'pkcs8',format:'pem'}),{mode:0o600});
 const keyId=sha(publicKey.export({type:'spki',format:'der'})).slice(0,24),keys=[{id:keyId,publicKey:publicKey.export({type:'spki',format:'pem'})}];
 const sourceCommit='c'.repeat(40),id='synthetic-native',filename='Proteus-synthetic.tar.gz',now=Date.now();
 const value={schemaVersion:1,product:'org.proteusapp.proteus.desktop',id,version:'0.2.39',platform:'darwin',arch:'arm64',channel:'stable',buildRevision:'synthetic',sourceFingerprint:'a'.repeat(64),packageHash:'b'.repeat(64),sourceCommit,publishedAt:new Date(now).toISOString(),expiresAt:new Date(now+86400000).toISOString(),distribution:{kind:'static',origin:'https://downloads.proteus.example'},artifact:{format:'tar.gz',filename,bytes:1,unpackedBytes:2,sha256:'d'.repeat(64),path:'/downloads/proteus/releases/'+id+'/'+filename}};
 const payload=Buffer.from(JSON.stringify(value)),args={payload,expectedHash:sha(payload),sourceCommit,keyFile,output,keys};return {root,value,args};
}
test('signer preserves exact accepted bytes, target and timestamps and refuses overwrite',t=>{
 const {args,value}=fixture(t),result=signDesktopPayload(args),envelope=JSON.parse(fs.readFileSync(args.output));
 assert.deepEqual(Buffer.from(envelope.payload,'base64url'),args.payload);
 const verified=verifyRelease(envelope,{platform:'darwin',arch:'arm64',keys:args.keys});assert.equal(verified.publishedAt,value.publishedAt);assert.equal(verified.sourceCommit,args.sourceCommit);assert.equal(result.manifestSHA256,sha(fs.readFileSync(args.output)));
 assert.throws(()=>signDesktopPayload(args),/new absolute output/);
});
test('checksum and source drift fail without writing an envelope',t=>{
 const {args}=fixture(t);assert.throws(()=>signDesktopPayload({...args,expectedHash:'0'.repeat(64)}),/checksum/);assert.throws(()=>signDesktopPayload({...args,sourceCommit:'e'.repeat(40)}),/Pinned/);assert.equal(fs.existsSync(args.output),false);
});
test('normal verifier rejects untrusted signer, expired payload and foreign origin',t=>{
 const {args,value}=fixture(t);assert.throws(()=>signDesktopPayload({...args,keys:[]}),/not trusted/);assert.equal(fs.existsSync(args.output),false);
 for(const changed of [{...value,expiresAt:new Date(0).toISOString()},{...value,distribution:{kind:'static',origin:'https://untrusted.invalid'}}]){const payload=Buffer.from(JSON.stringify(changed));assert.throws(()=>signDesktopPayload({...args,payload,expectedHash:sha(payload)}),/expired|origin/);assert.equal(fs.existsSync(args.output),false);}
});
