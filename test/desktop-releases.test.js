import {stageDesktopRelease} from '../src/services/updates/desktop-release-staging.js';
import {stageDesktopDistribution} from '../src/services/updates/desktop-distribution.js';
import {desktopPublicationPlan,retireDesktopPublications} from '../src/services/updates/desktop-publication.js';
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
import {desktopReleaseId} from '../scripts/release-identity.mjs';
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

test('public Mac release identity accepts real build punctuation and distinguishes exact package bytes',()=>{
 const candidate={version:'0.2.31',buildRevision:'synthetic+src.fixture',hash:'b'.repeat(64)},id=desktopReleaseId(candidate,'darwin','arm64');
 const value={...hostedManifest(),id,platform:'darwin',arch:'arm64',version:candidate.version,buildRevision:candidate.buildRevision};delete value.installer;value.artifact.path='/downloads/proteus/releases/'+id+'/'+value.artifact.filename;
 assert.equal(verifyRelease(envelope(value),{keys,platform:'darwin',arch:'arm64'}).buildRevision,candidate.buildRevision);
 assert.notEqual(id,desktopReleaseId({...candidate,hash:'c'.repeat(64)},'darwin','arm64'));
 assert.throws(()=>desktopReleaseId({...candidate,hash:'unverified'},'darwin','arm64'),/verified package/);
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

function distributionInputs(t){
 const root=directory(t),inputs=[];
 for(const platform of ['darwin','linux','win32']){
  const input=path.join(root,platform);fs.mkdirSync(input);inputs.push(input);
  const bytes=Buffer.from('Synthetic '+platform+' archive'),value=hostedManifest();
  value.id='synthetic-'+platform;value.platform=platform;value.artifact={...value.artifact,bytes:bytes.length,sha256:hash(bytes),path:'/downloads/proteus/releases/'+value.id+'/'+value.artifact.filename};
  if(platform!=='win32')delete value.installer;
  else{value.installer={...value.installer,bytes:bytes.length,sha256:hash(bytes),path:'/downloads/proteus/releases/'+value.id+'/'+value.installer.filename};fs.writeFileSync(path.join(input,value.installer.filename),bytes);}
  fs.writeFileSync(path.join(input,value.artifact.filename),bytes);fs.writeFileSync(path.join(input,'release.json'),JSON.stringify(envelope(value)));
  fs.writeFileSync(path.join(input,'private-source-and-receipt.txt'),'Never publish');
 }
 return {root,inputs};
}

test('one distribution set stages all platforms and returns exact remote update selections without private inputs',t=>{
 const {root,inputs}=distributionInputs(t),output=path.join(root,'distribution');
 const receipt=stageDesktopDistribution(inputs,output,{keys});assert.equal(receipt.published,false);assert.equal(receipt.releases.length,3);
 for(const selected of receipt.releases){
  const file=path.join(output,'downloads/proteus',selected.updateRelease.channel,selected.platform+'-'+selected.arch+'.json');
  const signed=JSON.parse(fs.readFileSync(file)).releases[0];assert.equal(hash(JSON.stringify(signed)),selected.updateRelease.manifestDigest);
  assert.equal(verifyRelease(signed,{keys,platform:selected.platform,arch:selected.arch}).id,selected.updateRelease.releaseId);
 }
 assert.equal(receipt.files.some(row=>row.path.includes('private-source')),false);
 const current=JSON.parse(fs.readFileSync(path.join(output,'downloads/proteus/current.json')));assert.equal(current.version,receipt.version);assert.equal(current.targets.length,3);
 assert.deepEqual(JSON.parse(fs.readFileSync(path.join(output,'downloads/proteus/preview/linux-x64.json'))).releases,[]);
 assert.throws(()=>stageDesktopDistribution(inputs,output,{keys}),/exists/);
});

test('distribution staging rejects duplicate targets, mixed versions and damaged artifacts before producing an upload folder',t=>{
 const {root,inputs}=distributionInputs(t),output=path.join(root,'distribution');
 assert.throws(()=>stageDesktopDistribution([inputs[0],inputs[0]],output,{keys}),/one release/);assert.equal(fs.existsSync(output),false);
 const manifestFile=path.join(inputs[1],'release.json'),signed=JSON.parse(fs.readFileSync(manifestFile));
 const value=JSON.parse(Buffer.from(signed.payload,'base64url'));value.version='9.9.9';fs.writeFileSync(manifestFile,JSON.stringify(envelope(value)));
 assert.throws(()=>stageDesktopDistribution(inputs,output,{keys}),/one release version/);assert.equal(fs.existsSync(output),false);
 fs.writeFileSync(manifestFile,JSON.stringify(signed));fs.writeFileSync(path.join(inputs[1],value.artifact.filename),'Damaged');
 assert.throws(()=>stageDesktopDistribution(inputs,output,{keys}),/differs/);assert.equal(fs.existsSync(output),false);
 assert.equal(fs.readdirSync(root).some(name=>name.startsWith('.proteus-distribution-')),false);
});

test('public retirement preserves current packages and requires unchanged verified public and obsolete bytes',t=>{
 const {root,inputs}=distributionInputs(t),output=path.join(root,'distribution'),receipt=stageDesktopDistribution(inputs,output,{keys});
 const old=path.join(output,'downloads/proteus/releases/old-version');fs.mkdirSync(old);fs.writeFileSync(path.join(old,'archive'),'Old synthetic package');
 let plan=desktopPublicationPlan(output,receipt);assert.deepEqual(plan.retired.map(row=>row.id),['old-version']);assert.equal(fs.existsSync(old),true,'dry run preserves obsolete packages');
 fs.writeFileSync(path.join(old,'archive'),'Changed after plan');assert.throws(()=>retireDesktopPublications(output,receipt,plan.planDigest),/changed/);
 plan=desktopPublicationPlan(output,receipt);const result=retireDesktopPublications(output,receipt,plan.planDigest);assert.deepEqual(result.retired,['old-version']);assert.equal(fs.existsSync(old),false);
 for(const id of result.retained)assert.ok(fs.existsSync(path.join(output,'downloads/proteus/releases',id)));
 fs.mkdirSync(old);fs.writeFileSync(path.join(old,'archive'),'Old synthetic package');
 fs.writeFileSync(path.join(output,'downloads/proteus/current.json'),'Corrupt new discovery');
 assert.throws(()=>desktopPublicationPlan(output,receipt),/Verify every new public file/);assert.ok(fs.existsSync(old),'failed verification cannot retire any previous package');
});


test('subset publication preserves signed prior platform bytes and marks them pending without retiring them',async t=>{
 const {root,inputs}=distributionInputs(t),file=path.join(inputs[0],'release.json');
 const value=JSON.parse(Buffer.from(JSON.parse(fs.readFileSync(file)).payload,'base64url'));value.version='1.2.4';fs.writeFileSync(file,JSON.stringify(envelope(value)));
 const output=path.join(root,'partial'),receipt=stageDesktopDistribution([inputs[0]],output,{keys},{retainedInputs:inputs.slice(1)});
 assert.equal(receipt.releases.length,1);assert.equal(receipt.retainedReleases.length,2);
 const current=JSON.parse(fs.readFileSync(path.join(output,'downloads/proteus/current.json')));assert.equal(current.targets.length,1);assert.equal(current.pendingTargets.length,2);
 for(const platform of ['linux','win32']){
  const catalogFile=path.join(output,'downloads/proteus/stable/'+platform+'-'+process.arch+'.json'),bytes=fs.readFileSync(catalogFile);
  const feed=new DesktopReleaseFeed({fetch:async()=>new Response(bytes)}),catalog=await feed.catalog({platform,arch:process.arch});
  assert.deepEqual(catalog.publication,{state:'pending',version:'1.2.4',availableVersion:'1.2.3'});
  const signed=JSON.parse(fs.readFileSync(path.join(root,platform,'release.json')));assert.deepEqual(catalog.releases,[signed]);
  assert.deepEqual(await feed.releases({platform,arch:process.arch}),[signed]);
  assert.equal(verifyRelease(signed,{keys,platform,arch:process.arch}).version,'1.2.3');
  assert.deepEqual(fs.readFileSync(path.join(output,'downloads/proteus/releases/synthetic-'+platform+'/release.json')),fs.readFileSync(path.join(root,platform,'release.json')));
  const folder=platform==='win32'?'windows':'linux';assert.match(fs.readFileSync(path.join(output,'downloads/proteus',folder,process.arch,'index.html'),'utf8'),/1.2.4 is pending.*retained verified 1.2.3/);
 }
 const obsolete=path.join(output,'downloads/proteus/releases/obsolete');fs.mkdirSync(obsolete);fs.writeFileSync(path.join(obsolete,'old'),'old');
 const plan=desktopPublicationPlan(output,receipt);assert.deepEqual(plan.retired.map(row=>row.id),['obsolete']);
 retireDesktopPublications(output,receipt,plan.planDigest);assert.deepEqual(plan.retained,['synthetic-darwin','synthetic-linux','synthetic-win32']);
 for(const retained of receipt.retainedReleases)assert.ok(fs.existsSync(path.join(output,'downloads/proteus/releases',retained.updateRelease.releaseId)));
});

test('retained platform inputs cannot bypass signature, expiry, target or version checks',t=>{
 const {root,inputs}=distributionInputs(t),output=path.join(root,'rejected');
 assert.throws(()=>stageDesktopDistribution([inputs[0]],output,{keys},{retainedInputs:[inputs[0]]}),/one release/);
 assert.throws(()=>stageDesktopDistribution([inputs[0]],output,{keys},{retainedInputs:[inputs[1]]}),/precede/);
 const file=path.join(inputs[1],'release.json'),value=JSON.parse(Buffer.from(JSON.parse(fs.readFileSync(file)).payload,'base64url'));
 value.version='1.2.2';value.expiresAt=new Date(0).toISOString();fs.writeFileSync(file,JSON.stringify(envelope(value)));
 assert.throws(()=>stageDesktopDistribution([inputs[0]],output,{keys},{retainedInputs:[inputs[1]]}),/expired/);assert.equal(fs.existsSync(output),false);
});

test('publication hints are bounded metadata and never mutate signed envelopes',async()=>{
 const signed=envelope(hostedManifest());
 for(const publication of [{state:'ready',version:'1.2.4',availableVersion:'1.2.3'},{state:'pending',version:'<script>',availableVersion:'1.2.3'},{state:'pending',version:'1.2.4',availableVersion:{}}]){
  const feed=new DesktopReleaseFeed({fetch:async()=>Response.json({schemaVersion:1,publication,releases:[signed]})});
  await assert.rejects(feed.catalog({platform:'win32',arch:process.arch}),/publication state/);
 }
});
