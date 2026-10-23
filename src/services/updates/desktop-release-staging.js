import fs from 'node:fs';
import path from 'node:path';
import {verifyRelease,windowsReleaseOrigin} from './desktop-releases.js';
import packages from '../../../desktop/updates/update-package.cjs';
const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
/** Prepare an explicit public allowlist locally. Never deploy private build inputs. */
export function stageDesktopRelease(input,output,verification={}){
 if(!path.isAbsolute(input||'')||!path.isAbsolute(output||''))throw Error('Supply absolute release and new staging folders.');
 if(fs.statSync(path.join(input,'release.json')).size>1024*1024)throw Error('The release manifest is too large.');
 const envelope=JSON.parse(fs.readFileSync(path.join(input,'release.json'),'utf8'));
 const declared=JSON.parse(Buffer.from(envelope.payload,'base64url').toString('utf8'));
 const release=verifyRelease(envelope,{...verification,platform:declared.platform,arch:declared.arch,channel:declared.channel});
 if(!['x64','arm64'].includes(release.arch)||!['darwin','linux','win32'].includes(release.platform)||release.distribution?.kind!=='static'||release.distribution.origin!==windowsReleaseOrigin)throw Error('Choose a signed WTB desktop release.');
 if(fs.existsSync(output))throw Error('Staging already exists. Inspect it before replacing anything.');
 if(release.platform!=='win32'&&release.installer)throw Error('Unexpected installer for this platform.');
 const artifacts=[release.artifact,...(release.installer?[release.installer]:[])];
 for(const artifact of artifacts){const file=path.join(input,artifact.filename),stat=fs.lstatSync(file);if(!stat.isFile()||stat.size!==artifact.bytes||packages.fileDigest(file)!==artifact.sha256)throw Error('Signed artifact differs: '+artifact.filename);}
 const base=path.join(output,'downloads','proteus'),immutable=path.join(base,'releases',release.id),catalog=path.join(base,release.channel);
 for(const directory of [immutable,catalog])fs.mkdirSync(directory,{recursive:true});
 for(const artifact of artifacts)fs.copyFileSync(path.join(input,artifact.filename),path.join(immutable,artifact.filename),fs.constants.COPYFILE_EXCL);
 fs.copyFileSync(path.join(input,'release.json'),path.join(immutable,'release.json'),fs.constants.COPYFILE_EXCL);
 fs.writeFileSync(path.join(catalog,release.platform+'-'+release.arch+'.json'),JSON.stringify({schemaVersion:1,releases:[envelope]},null,2)+'\n',{flag:'wx'});
 const label={darwin:'macOS',linux:'Linux',win32:'Windows'}[release.platform],page=path.join(base,{darwin:'mac',linux:'linux',win32:'windows'}[release.platform],release.arch);
 fs.mkdirSync(page,{recursive:true});
 const download=release.installer||release.artifact;
 fs.writeFileSync(path.join(page,'index.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Proteus for ${label} — WTB</title><style>body{background:#f4f6f4;color:#18251e;font:17px/1.6 system-ui;margin:8vh auto;padding:32px;max-width:760px}a{color:#185d3e}code{overflow-wrap:anywhere}</style><main><p>WTB / Proteus</p><h1>Proteus for ${label}</h1><p>Version ${escape(release.version)} · ${release.arch}</p><p><a href="${escape(download.path)}">Download ${label} ${release.installer?'installer':'release archive'}</a></p><p>Installed copies use Engine Room → Updates. The local coordinator verifies the signed manifest, target, hashes and required local migration/tests before restart.</p><p><a href="/downloads/proteus/releases/${release.id}/release.json">Signed manifest</a> · <a href="${escape(release.artifact.path)}">Update archive</a></p><p>SHA-256: <code>${download.sha256}</code></p><p>Downloading does not install or restart Proteus.</p></main></html>`,{flag:'wx'});
 const files=[];const walk=directory=>{for(const row of fs.readdirSync(directory,{withFileTypes:true})){const file=path.join(directory,row.name);if(row.isDirectory())walk(file);else files.push({path:path.relative(output,file).split(path.sep).join('/'),bytes:fs.statSync(file).size,sha256:packages.fileDigest(file)});}};walk(output);
 return {origin:windowsReleaseOrigin,releaseId:release.id,platform:release.platform,arch:release.arch,files};
}
