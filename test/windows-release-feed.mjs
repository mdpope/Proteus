// Exact packaged client against a locally served copy of the public WTB files.
// This does not claim published endpoint acceptance or override the shipped origin.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {privateTemporaryDirectory} from '../src/private-paths.cjs';
const [bundle,local]=process.argv.slice(2),base=new URL(local);
if(!path.isAbsolute(bundle||'')||base.protocol!=='http:'||base.hostname!=='127.0.0.1'||base.pathname!=='/')throw Error('Supply the exact packaged folder and a loopback publication fixture origin.');
const app=path.join(bundle,'resources','app'),{DesktopReleaseFeed}=await import(pathToFileURL(path.join(app,'src','desktop-release-feed.js'))),{verifyRelease,extractRelease,windowsReleaseOrigin}=await import(pathToFileURL(path.join(app,'src','desktop-releases.js')));
const root=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-wtb-feed-')),requested=[];
try{
 const feed=new DesktopReleaseFeed({fetch:(url,options)=>{const target=new URL(url);assert.equal(target.origin,windowsReleaseOrigin);assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');assert.equal(options.headers.Authorization,undefined);requested.push(target.pathname);return fetch(new URL(target.pathname,base),options);}});
 const envelopes=await feed.releases({platform:'win32',arch:'x64'});assert.equal(envelopes.length,1);const release=verifyRelease(envelopes[0],{platform:'win32',arch:'x64'}),file=path.join(root,'release.tar.gz');
 await feed.downloadRelease(release,file);const candidate=await extractRelease(file,path.join(root,'application'),release);
 assert.equal(candidate.sourceFingerprint,JSON.parse(fs.readFileSync(path.join(app,'build-source.json'),'utf8')).sourceFingerprint);
 console.log(JSON.stringify({passed:true,buildRevision:release.buildRevision,sourceFingerprint:release.sourceFingerprint,keyId:release.verification.keyId,signatureVerified:true,bytes:release.artifact.bytes,requests:requested,checks:['actual packaged Windows feed client','bounded catalog and complete HTTP artifact stream','pinned WTB origin without account credentials or redirects','publisher signature, exact archive and installed payload identities'],scope:'loopback-served exact publication fixture; live WTB publication/consumer verification remains separate'}));
}finally{fs.rmSync(root,{recursive:true,force:true,maxRetries:5,retryDelay:100});}
