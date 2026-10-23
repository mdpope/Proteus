import {stageDesktopRelease} from '../src/services/updates/desktop-release-staging.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {generateKeyPairSync,sign,createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {c as createTar} from 'tar';
import {verifyRelease,saveReleaseResponse,extractRelease,releaseOrigin,windowsReleaseOrigin} from '../src/services/updates/desktop-releases.js';
import {DesktopReleaseFeed} from '../src/services/updates/desktop-release-feed.js';
import {LifeAPI} from '../src/services/life/life-api.js';
import {AccountSession} from '../src/services/remote/account-session.js';
import {AppAccount} from '../src/services/remote/app-account.js';
import packages from '../desktop/updates/update-package.cjs';
import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
const pair=generateKeyPairSync('ed25519'),keys=[{id:'fixture',publicKey:pair.publicKey.export({type:'spki',format:'pem'})}],hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const manifest=()=>({schemaVersion:1,product:'org.proteusapp.proteus.desktop',id:'synthetic-release',channel:'stable',platform:'win32',arch:process.arch,version:'1.2.3',buildRevision:'windows.fixture',sourceFingerprint:'a'.repeat(64),packageHash:'b'.repeat(64),publishedAt:new Date(Date.now()-1000).toISOString(),expiresAt:new Date(Date.now()+3600000).toISOString(),installer:{filename:'synthetic-setup.exe',bytes:1,sha256:'d'.repeat(64),path:'/api/v1/app/releases/synthetic-release/installer'},artifact:{format:'tar.gz',filename:'synthetic.tar.gz',bytes:10,unpackedBytes:1000,sha256:'c'.repeat(64),path:'/api/v1/app/releases/synthetic-release/artifact'}});
const envelope=value=>{const payload=Buffer.from(JSON.stringify(value));return {schemaVersion:1,keyId:'fixture',payload:payload.toString('base64url'),signature:sign(null,payload,pair.privateKey).toString('base64url')};};
const options={keys,platform:'win32',arch:process.arch,channel:'stable'};
const hostedManifest=()=>{const value=manifest();value.distribution={kind:'static',origin:windowsReleaseOrigin};value.artifact.path='/downloads/proteus/releases/'+value.id+'/'+value.artifact.filename;value.installer.path='/downloads/proteus/releases/'+value.id+'/'+value.installer.filename;return value;};
function directory(t){const root=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-release-test-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;}

test('WTB release signatures bind distribution, paths and target while preserving old offline trust',()=>{
 const value=hostedManifest();assert.equal(verifyRelease(envelope(value),options).distribution.origin,'https://downloads.proteus.example');
 assert.equal(verifyRelease(envelope(manifest()),options).verification.signatureVerified,true);
 for(const change of [{distribution:{kind:'static',origin:'https://untrusted.example'}},{distribution:{kind:'account',origin:windowsReleaseOrigin}},{artifact:{...value.artifact,path:'/downloads/proteus/releases/other/file.tar.gz'}},{installer:{...value.installer,path:'//untrusted.example/setup.exe'}}])assert.throws(()=>verifyRelease(envelope({...value,...change}),options));
});

test('WTB catalog and artifact requests omit account credentials and reject redirects',async t=>{
 const root=directory(t),bytes=Buffer.from('SYNTHETIC WTB RELEASE'),value=hostedManifest();value.artifact={...value.artifact,bytes:bytes.length,sha256:hash(bytes)};
 const signed=envelope(value),calls=[],feed=new DesktopReleaseFeed({fetch:async(url,request)=>{
  calls.push(url);assert.equal(request.credentials,'omit');assert.equal(request.redirect,'error');assert.equal(request.referrerPolicy,'no-referrer');assert.deepEqual(Object.keys(request.headers),['Accept']);
  if(url.endsWith('.json'))return Response.json({schemaVersion:1,releases:[signed]});return new Response(bytes);
 }});
 const catalog=await feed.releases({platform:'win32',arch:process.arch});const release=verifyRelease(catalog[0],options),file=path.join(root,'download');await feed.downloadRelease(release,file);
 assert.deepEqual(calls,[windowsReleaseOrigin+'/downloads/proteus/stable/win32-'+process.arch+'.json',windowsReleaseOrigin+value.artifact.path]);assert.deepEqual(fs.readFileSync(file),bytes);
 await assert.rejects(feed.downloadRelease(verifyRelease(envelope(manifest()),options),path.join(root,'legacy')),/verified WTB/);assert.equal(calls.length,2);
});

test('WTB catalog limits and target validation fail before any artifact request',async()=>{
 for(const response of [Response.json({schemaVersion:1,releases:Array(51).fill({})}),new Response('x'.repeat(1024*1024+1)),new Response('no',{status:404}),Response.json({schemaVersion:2,releases:[]}),new Response('bad JSON')]){
  const feed=new DesktopReleaseFeed({fetch:async()=>response});await assert.rejects(feed.releases({platform:'win32',arch:process.arch}));
 }
 let fetched=false;const feed=new DesktopReleaseFeed({fetch:async()=>{fetched=true;throw Error('Unexpected network call');}});
 for(const target of [{platform:'unsupported',arch:'x64'},{platform:'win32',arch:'../x64'},{platform:'win32',arch:'x64',channel:'../stable'}])await assert.rejects(feed.releases(target),/Unsupported/);
 assert.equal(fetched,false);
});

function account(fetcher,{shared=false}={}){
 let saved={origin:releaseOrigin,clientId:'synthetic-client',accessToken:'synthetic-old',refreshToken:'synthetic-refresh',expiresAt:Date.now()+3600000,accountId:'a'.repeat(64),workspaceId:'1'};
 const api=new (shared?AccountSession:LifeAPI)({vault:{load:()=>saved,save:value=>{saved=value;},clear:()=>{saved=null;}},fetch:fetcher});
 return {api,account:new AppAccount(shared?api:{api})};
}
for(const shared of [false,true])test(`authenticated release streaming refreshes one expired token through ${shared?'shared account':'Life compatibility'} and never follows redirects`,async t=>{
 const root=directory(t),bytes=Buffer.from('SYNTHETIC RELEASE'),release=manifest(),calls=[];
 release.artifact={...release.artifact,bytes:bytes.length,sha256:hash(bytes)};
 const fixture=account(async(url,options)=>{
  calls.push({url,authorization:options.headers.Authorization});assert.equal(options.redirect,'error');
  if(url.endsWith('/oauth/token'))return Response.json({access_token:'synthetic-new',refresh_token:'synthetic-rotated',token_type:'Bearer',expires_in:3600});
  assert.equal(url,releaseOrigin+release.artifact.path);
  return options.headers.Authorization==='Bearer synthetic-old'?new Response('Expired',{status:401}):new Response(bytes);
 },{shared});
 const file=path.join(root,'release');await fixture.account.downloadRelease(release,file);
 assert.deepEqual(fs.readFileSync(file),bytes);assert.equal(calls.length,3);assert.equal(calls.at(-1).authorization,'Bearer synthetic-new');
});
test('signing out during an authenticated release stream removes its incomplete file',async t=>{
 const root=directory(t),bytes=Buffer.from('SYNTHETIC RELEASE'),release=manifest();release.artifact={...release.artifact,bytes:bytes.length,sha256:hash(bytes)};
 let entered;const ready=new Promise(resolve=>{entered=resolve;});
 const fixture=account(async(_url,options)=>new Response(new ReadableStream({start(controller){
  controller.enqueue(bytes.subarray(0,2));options.signal.addEventListener('abort',()=>controller.error(new DOMException('Synthetic logout','AbortError')),{once:true});entered();
 }})));
 const file=path.join(root,'release'),pending=fixture.account.downloadRelease(release,file);await ready;fixture.api.clear();
 await assert.rejects(pending,/account changed/);assert.deepEqual(fs.readdirSync(root),[]);
});

test('release trust rejects tampering, unknown keys, expired metadata and wrong target before download',()=>{
 const value=manifest(),signed=envelope(value);assert.equal(verifyRelease(signed,options).verification.signatureVerified,true);
 assert.throws(()=>verifyRelease({...signed,keyId:'untrusted'},options),/not trusted/);
 assert.throws(()=>verifyRelease({...signed,payload:Buffer.from(JSON.stringify({...value,version:'9.9.9'})).toString('base64url')},options),/signature/);
 for(const change of [{product:'other.app'},{platform:'linux'},{arch:'other'},{channel:'preview'},{expiresAt:'2000-01-01T00:00:00Z'},{artifact:{...value.artifact,path:'https://other.example/secret'}}])assert.throws(()=>verifyRelease(envelope({...value,...change}),options));
});

test('release downloads commit only exact signed bytes and clean interrupted, oversized or corrupt bodies',async t=>{
 const root=directory(t),bytes=Buffer.from('SYNTHETIC RELEASE'),value=manifest();value.artifact={...value.artifact,bytes:bytes.length,sha256:hash(bytes)};
 const good=path.join(root,'good');await saveReleaseResponse(new Response(bytes),good,value);assert.deepEqual(fs.readFileSync(good),bytes);
 for(const [name,response]of [['short',new Response(bytes.subarray(1))],['long',new Response(Buffer.concat([bytes,bytes]))],['corrupt',new Response(Buffer.alloc(bytes.length))],['declared',new Response(bytes,{headers:{'content-length':'1'}})],['denied',new Response('Denied',{status:403})]]){
  const file=path.join(root,name);await assert.rejects(saveReleaseResponse(response,file,value));assert.equal(fs.existsSync(file),false);assert.equal(fs.readdirSync(root).some(name=>name.endsWith('.partial')),false);
 }
 const interrupted=new Response(new ReadableStream({start(controller){controller.enqueue(bytes.subarray(0,2));controller.error(Error('Synthetic disconnected download'));}}));
 await assert.rejects(saveReleaseResponse(interrupted,path.join(root,'interrupted'),value));assert.deepEqual(fs.readdirSync(root),['good']);
});

function tarEntry(name,content='x',type='0',link=''){
 const header=Buffer.alloc(512),data=Buffer.from(content);header.write(name,0,100);header.write('0000600\0',100,8);header.write('0000000\0',108,8);header.write('0000000\0',116,8);header.write(data.length.toString(8).padStart(11,'0')+'\0',124,12);header.write('00000000000\0',136,12);header.fill(32,148,156);header.write(type,156,1);header.write(link,157,100);header.write('ustar\0',257,6);header.write('00',263,2);header.write([...header].reduce((sum,b)=>sum+b,0).toString(8).padStart(6,'0')+'\0 ',148,8);
 return Buffer.concat([header,data,Buffer.alloc((512-data.length%512)%512)]);
}
test('authenticated archives still reject escape paths, Windows links, duplicate entries and extraction bombs',async t=>{
 const root=directory(t),cases=[tarEntry('../escaped'),tarEntry('CON'),tarEntry('link','','2','../outside'),Buffer.concat([tarEntry('same'),tarEntry('same')]),tarEntry('large','1234')];
 for(const [index,entry]of cases.entries()){
  const bytes=gzipSync(Buffer.concat([entry,Buffer.alloc(1024)])),file=path.join(root,index+'.tar.gz'),destination=path.join(root,'out-'+index),value=manifest();
  fs.writeFileSync(file,bytes);value.artifact={...value.artifact,bytes:bytes.length,sha256:hash(bytes),unpackedBytes:index===4?1:1000};
  await assert.rejects(extractRelease(file,destination,value));assert.equal(fs.existsSync(destination),false);assert.equal(fs.existsSync(path.join(root,'escaped')),false);
 }
});

test('a verified offline archive extracts the exact application and cached installer identity',async t=>{
 const root=directory(t),bundle=path.join(root,'bundle'),app=path.join(bundle,'resources','app');fs.mkdirSync(app,{recursive:true});
 fs.writeFileSync(path.join(bundle,'Proteus.exe'),'synthetic executable; never launched');fs.writeFileSync(path.join(bundle,'Proteus Setup.exe'),'synthetic installer; never launched');fs.writeFileSync(path.join(app,'fixture.js'),'// synthetic');
 const value=manifest(),runtimeFiles={'fixture.js':packages.fileDigest(path.join(app,'fixture.js'))},buildInputs={};value.sourceFingerprint=packages.digest(JSON.stringify({runtimeFiles,buildInputs}));
 fs.writeFileSync(path.join(app,'package.json'),JSON.stringify({name:'proteus',version:value.version,buildRevision:value.buildRevision,updatesProtocol:1,dataCompatibility:1}));
 fs.writeFileSync(path.join(app,'build-source.json'),JSON.stringify({schemaVersion:1,platform:'win32',arch:process.arch,buildRevision:value.buildRevision,sourceFingerprint:value.sourceFingerprint,runtimeFiles,buildInputs}));
 const candidate=packages.inspectPackage(bundle,{platform:'win32'}),file=path.join(root,'synthetic.tar.gz');
 assert.equal(candidate.installationHash,packages.tree(bundle).hash);assert.equal(candidate.hash,packages.tree(bundle,{excludeRoot:['Proteus Setup.exe','Uninstall Proteus.exe','uninstallerIcon.ico']}).hash);
 await createTar({file,cwd:bundle,gzip:true,portable:true},['.']);
 value.packageHash=candidate.hash;value.installer={...value.installer,bytes:fs.statSync(path.join(bundle,'Proteus Setup.exe')).size,sha256:candidate.installer.sha256};value.artifact={...value.artifact,bytes:fs.statSync(file).size,unpackedBytes:candidate.bytes,sha256:packages.fileDigest(file)};
 const verified=verifyRelease(envelope(value),options),extracted=await extractRelease(file,path.join(root,'out'),verified);
 assert.equal(extracted.hash,candidate.hash);assert.equal(extracted.installer.sha256,candidate.installer.sha256);
});

for(const platform of ['darwin','linux','win32'])test(platform+' signed catalog download and public staging use the common WTB protocol',async t=>{
 const root=directory(t),input=path.join(root,'input'),output=path.join(root,'public');fs.mkdirSync(input);
 const bytes=Buffer.from('Synthetic archive'),value=hostedManifest();value.platform=platform;value.artifact.bytes=bytes.length;value.artifact.sha256=hash(bytes);
 if(platform!=='win32')delete value.installer;else {value.installer.bytes=bytes.length;value.installer.sha256=hash(bytes);fs.writeFileSync(path.join(input,value.installer.filename),bytes);}
 const signed=envelope(value);fs.writeFileSync(path.join(input,'release.json'),JSON.stringify(signed));fs.writeFileSync(path.join(input,value.artifact.filename),bytes);fs.writeFileSync(path.join(input,'private-receipt.txt'),'Must not publish');
 const requests=[],feed=new DesktopReleaseFeed({fetch:async(url,args)=>{requests.push(url);assert.equal(args.credentials,'omit');return url.endsWith('.json')?Response.json({schemaVersion:1,releases:[signed]}):new Response(bytes);}});
 const catalog=await feed.releases({platform,arch:process.arch}),release=verifyRelease(catalog[0],{...options,platform});await feed.downloadRelease(release,path.join(root,'download'));
 assert.equal(requests[0],windowsReleaseOrigin+'/downloads/proteus/stable/'+platform+'-'+process.arch+'.json');
 const staged=stageDesktopRelease(input,output,{keys});assert.ok(staged.files.some(file=>file.path.endsWith(platform+'-'+process.arch+'.json')));assert.equal(staged.files.some(file=>file.path.includes('private-receipt')),false);
 assert.throws(()=>stageDesktopRelease(input,output,{keys}),/exists/);
});
