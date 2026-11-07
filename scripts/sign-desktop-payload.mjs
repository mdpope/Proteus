// Release-operation helper: sign an already accepted native payload on the
// designated publisher host without reconstructing its platform or timestamps.
import fs from 'node:fs';
import path from 'node:path';
import {createHash,createPrivateKey,createPublicKey,sign} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {hasPrivatePermissions} from '../src/shared/private-paths.cjs';
import {verifyRelease} from '../src/services/updates/desktop-releases.js';

const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export function signDesktopPayload({payload,expectedHash,sourceCommit,keyFile,output,keys}={}){
 if(!Buffer.isBuffer(payload)||payload.length<1||payload.length>49152||!/^[a-f0-9]{64}$/.test(expectedHash||'')||digest(payload)!==expectedHash)throw Error('Exact payload checksum required.');
 const value=JSON.parse(payload.toString('utf8'));
 if(!/^[a-f0-9]{40,64}$/.test(sourceCommit||'')||value.sourceCommit!==sourceCommit||!['darwin','linux','win32'].includes(value.platform)||!['arm64','x64'].includes(value.arch)||value.distribution?.kind!=='static')throw Error('Pinned native static release required.');
 if(!path.isAbsolute(keyFile||'')||!path.isAbsolute(output||'')||fs.existsSync(output))throw Error('Use an existing absolute key reference and a new absolute output file.');
 const checkout=fs.realpathSync(new URL('..',import.meta.url)),keyPath=fs.realpathSync(keyFile),relative=path.relative(checkout,keyPath),stat=fs.lstatSync(keyFile);
 if(!stat.isFile()||stat.isSymbolicLink()||!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative)||stat.size>16384||!hasPrivatePermissions(keyFile,stat))throw Error('Use a private publisher key outside the source checkout.');
 const key=createPrivateKey(fs.readFileSync(keyFile));
 if(key.asymmetricKeyType!=='ed25519')throw Error('Use the existing Ed25519 publisher key.');
 const publicKey=createPublicKey(key),keyId=digest(publicKey.export({type:'spki',format:'der'})).slice(0,24);
 const envelope={schemaVersion:1,keyId,payload:payload.toString('base64url'),signature:sign(null,payload,key).toString('base64url')};
 // The normal updater verifier enforces publisher trust, target, dates, origin,
 // paths and size limits. The CLI never accepts an alternate trust store.
 verifyRelease(envelope,{platform:value.platform,arch:value.arch,channel:value.channel,...(keys?{keys}:{})});
 fs.writeFileSync(output,JSON.stringify(envelope,null,2)+'\n',{flag:'wx',mode:0o600});
 return {keyId,manifest:output,manifestSHA256:digest(fs.readFileSync(output)),payloadSHA256:expectedHash,payloadBytes:payload.length};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 if(process.platform!=='darwin')throw Error('Publisher signing belongs to Build Mac. Builders return unsigned accepted payloads.');
 const options={};
 for(let i=2;i<process.argv.length;i+=2){const name=process.argv[i];if(!['--payload','--sha256','--source-commit','--key','--out'].includes(name)||!process.argv[i+1]||options[name])throw Error('Use --payload, --sha256, --source-commit, --key and --out once.');options[name]=process.argv[i+1];}
 const payloadFile=options['--payload'];if(!path.isAbsolute(payloadFile||''))throw Error('Use an absolute payload file.');
 const stat=fs.lstatSync(payloadFile);if(!stat.isFile()||stat.size>49152)throw Error('Bounded ordinary payload file required.');
 console.log(JSON.stringify(signDesktopPayload({payload:fs.readFileSync(payloadFile),expectedHash:options['--sha256'],sourceCommit:options['--source-commit'],keyFile:options['--key'],output:options['--out']})));
}
