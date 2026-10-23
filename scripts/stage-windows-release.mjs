// Emit only public release files. Deployment remains owned by the WTB workspace.
import fs from 'node:fs';
import path from 'node:path';
import {verifyRelease,windowsReleaseOrigin} from '../src/services/updates/desktop-releases.js';
import packages from '../desktop/updates/update-package.cjs';

const [input,output]=process.argv.slice(2);
if(!path.isAbsolute(input||'')||!path.isAbsolute(output||''))throw Error('Supply absolute release and new publication staging folders.');
const envelope=JSON.parse(fs.readFileSync(path.join(input,'release.json'),'utf8'));
const release=verifyRelease(envelope,{platform:'win32',arch:'x64'});
if(release.distribution?.origin!==windowsReleaseOrigin||release.distribution.kind!=='static')throw Error('Choose the signed WTB Windows release.');
if(fs.existsSync(output))throw Error('Publication staging already exists; inspect it before replacing anything.');
for(const artifact of [release.artifact,release.installer]){
 const file=path.join(input,artifact.filename),stat=fs.lstatSync(file);
 if(!stat.isFile()||stat.size!==artifact.bytes||packages.fileDigest(file)!==artifact.sha256)throw Error('The signed artifact differs: '+artifact.filename);
}
const base=path.join(output,'downloads','proteus'),immutable=path.join(base,'releases',release.id),catalog=path.join(base,release.channel),page=path.join(base,'windows');
for(const directory of [immutable,catalog,page])fs.mkdirSync(directory,{recursive:true});
for(const artifact of [release.artifact,release.installer])fs.copyFileSync(path.join(input,artifact.filename),path.join(immutable,artifact.filename),fs.constants.COPYFILE_EXCL);
fs.copyFileSync(path.join(input,'release.json'),path.join(immutable,'release.json'),fs.constants.COPYFILE_EXCL);
fs.writeFileSync(path.join(catalog,'win32-x64.json'),JSON.stringify({schemaVersion:1,releases:[envelope]},null,2)+'\n',{flag:'wx'});
const manifest='/downloads/proteus/releases/'+release.id+'/release.json';
fs.writeFileSync(path.join(page,'index.html'),`<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Proteus for Windows — WTB</title>
<style>body{margin:0;background:#f4f6f4;color:#18251e;font:17px/1.6 system-ui,sans-serif}main{max-width:760px;margin:8vh auto;padding:32px}h1{font-size:42px;line-height:1.15}a{color:#185d3e}.download{display:inline-block;padding:13px 22px;background:#185d3e;color:white;border-radius:8px;text-decoration:none;font-weight:650}code{overflow-wrap:anywhere;font-size:13px}section{margin-top:30px;border-top:1px solid #ced7cf;padding-top:18px}small{color:#526156}</style>
<main><p>WTB / Proteus</p><h1>Proteus for Windows</h1><p>A local scheduler and conversation client with your choice of providers.</p>
<p>Version ${release.version} · Windows x64</p><p><a class="download" href="${release.installer.path}">Download Windows installer</a></p>
<p>The installer includes the app runtime and adds a Start-menu shortcut. Developer tools are not required.</p>
<p>This initial Windows installer is unsigned. Windows may show an unknown-publisher or SmartScreen notice.</p>
<section><h2>Updates</h2><p>Installed copies check signed releases in Engine Room → Updates. For an offline update, save both the <a href="${manifest}">signed manifest</a> and <a href="${release.artifact.path}">update archive</a> in one folder, then choose the offline release in Proteus.</p><p>Updates require a publisher signature trusted by the installed app. Downloading does not restart the app.</p></section>
<section><h2>Release identity</h2><p><small>Build</small><br><code>${release.buildRevision}</code></p><p><small>Installer SHA-256</small><br><code>${release.installer.sha256}</code></p><p><small>Manifest signing key</small><br><code>${envelope.keyId}</code></p></section></main></html>`,{flag:'wx'});
const files=[];const walk=directory=>{for(const row of fs.readdirSync(directory,{withFileTypes:true})){const file=path.join(directory,row.name);if(row.isDirectory())walk(file);else files.push({path:path.relative(output,file).split(path.sep).join('/'),bytes:fs.statSync(file).size,sha256:packages.fileDigest(file)});}};walk(output);
console.log(JSON.stringify({origin:windowsReleaseOrigin,releaseId:release.id,files,scope:'Only these scoped files are public. Source companions, keys, private receipts and deployment records are excluded.'}));
