// One-time publisher custody transition. Private bytes only cross computers inside
// RSA-OAEP ciphertext signed by the existing publisher. CLI output is metadata.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {createHash,createPrivateKey,createPublicKey,generateKeyPairSync,publicEncrypt,privateDecrypt,sign,verify,randomUUID,constants} from 'node:crypto';
import {ensurePrivateHome,hasPrivatePermissions} from '../src/shared/private-paths.cjs';
const checkout=fs.realpathSync(fileURLToPath(new URL('..',import.meta.url)));
const trust=JSON.parse(fs.readFileSync(new URL('../desktop/updates/release-keys.json',import.meta.url),'utf8')).keys;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export const publisherPublic=key=>{const publicKey=createPublicKey(key);return {id:sha(publicKey.export({type:'spki',format:'der'})).slice(0,24),publicKey:publicKey.export({type:'spki',format:'pem'})};};
function outside(file){
 if(!path.isAbsolute(file||''))throw Error('Use an absolute protected custody path.');
 const relative=path.relative(checkout,file);if(!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative))throw Error('Publisher custody stays outside source checkouts.');
 for(let parent=path.dirname(file);;parent=path.dirname(parent)){
  if(fs.existsSync(path.join(parent,'.git')))throw Error('Publisher custody stays outside every Git checkout.');
  if(parent===path.dirname(parent))break;
 }
}
function privateKey(file,type){
 const stat=fs.lstatSync(file);outside(fs.realpathSync(file));
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size>16384||!hasPrivatePermissions(file,stat))throw Error('Use an existing protected ordinary private-key file.');
 const key=createPrivateKey(fs.readFileSync(file));if(key.asymmetricKeyType!==type)throw Error('Unexpected custody key type.');return key;
}
function writePrivate(file,bytes){
 outside(file);const parent=fs.realpathSync(path.dirname(file));outside(parent);
 if(!hasPrivatePermissions(parent)||fs.lstatSync(path.dirname(file)).isSymbolicLink())throw Error('Use a protected owner directory.');
 fs.writeFileSync(file,bytes,{flag:'wx',mode:0o600});
}
export function initializePublisher(directory){
 outside(directory);ensurePrivateHome(directory);outside(fs.realpathSync(directory));
 const keyFile=path.join(directory,'publisher-ed25519.pem'),receiver=path.join(directory,'legacy-custody-receiver.pem'),recipient=path.join(directory,'legacy-custody-recipient.pub'),publicFile=path.join(directory,'publisher-public.json');
 if([keyFile,receiver,recipient,publicFile].some(file=>fs.existsSync(file)))throw Error('Publisher custody already exists. Inspect it instead of replacing keys.');
 const signing=generateKeyPairSync('ed25519'),transfer=generateKeyPairSync('rsa',{modulusLength:4096});
 writePrivate(keyFile,signing.privateKey.export({type:'pkcs8',format:'pem'}));writePrivate(receiver,transfer.privateKey.export({type:'pkcs8',format:'pem'}));
 const publicBytes=transfer.publicKey.export({type:'spki',format:'pem'}),identity=publisherPublic(signing.privateKey);
 fs.writeFileSync(recipient,publicBytes,{flag:'wx',mode:0o600});fs.writeFileSync(publicFile,JSON.stringify(identity,null,2)+'\n',{flag:'wx',mode:0o600});
 return {keyFile,receiver,recipient,publicFile,keyId:identity.id,recipientSHA256:sha(Buffer.from(publicBytes))};
}
export function exportLegacyPublisher({keyFile,recipientFile,recipientSHA256,expectedKeyId,output,keys=trust,now=Date.now(),transferId=randomUUID()}){
 if(!/^[a-f0-9]{24}$/.test(expectedKeyId||'')||!keys.some(k=>k.id===expectedKeyId))throw Error('Pin the existing trusted publisher ID.');
 const recipientBytes=fs.readFileSync(recipientFile);if(recipientBytes.length>8192||sha(recipientBytes)!==recipientSHA256)throw Error('Recipient checksum differs.');
 const recipient=createPublicKey(recipientBytes);if(recipient.asymmetricKeyType!=='rsa'||recipient.asymmetricKeyDetails.modulusLength!==4096)throw Error('Use the pinned RSA-4096 custody recipient.');
 const key=privateKey(keyFile,'ed25519'),identity=publisherPublic(key);if(identity.id!==expectedKeyId||identity.publicKey!==keys.find(k=>k.id===expectedKeyId).publicKey)throw Error('Legacy key differs from bundled trust.');
 const bytes=key.export({type:'pkcs8',format:'der'});let ciphertext;
 try{ciphertext=publicEncrypt({key:recipient,padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},bytes).toString('base64url');}finally{bytes.fill(0);}
 const payload=Buffer.from(JSON.stringify({schemaVersion:1,purpose:'proteus-publisher-custody',transferId,keyId:expectedKeyId,recipientSHA256,createdAt:new Date(now).toISOString(),expiresAt:new Date(now+86400000).toISOString(),ciphertext}));
 const envelope={payload:payload.toString('base64url'),signature:sign(null,payload,key).toString('base64url')};
 writePrivate(output,JSON.stringify(envelope,null,2)+'\n');
 return {transferId,keyId:expectedKeyId,recipientSHA256,output,sha256:sha(fs.readFileSync(output)),bytes:fs.statSync(output).size,expiresAt:new Date(now+86400000).toISOString()};
}
export function importLegacyPublisher({envelopeFile,expectedSHA256,receiverFile,recipientSHA256,expectedKeyId,transferId,output,keys=trust,now=Date.now()}){
 const stat=fs.lstatSync(envelopeFile);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>8192)throw Error('Use the bounded encrypted custody envelope.');
 const bytes=fs.readFileSync(envelopeFile);if(sha(bytes)!==expectedSHA256)throw Error('Encrypted custody checksum differs.');
 const envelope=JSON.parse(bytes),payload=Buffer.from(envelope.payload||'','base64url'),trusted=keys.find(k=>k.id===expectedKeyId);
 if(!trusted||!verify(null,payload,createPublicKey(trusted.publicKey),Buffer.from(envelope.signature||'','base64url')))throw Error('Legacy custody signature is not trusted.');
 const value=JSON.parse(payload),created=Date.parse(value.createdAt),expires=Date.parse(value.expiresAt);
 if(value.schemaVersion!==1||value.purpose!=='proteus-publisher-custody'||value.keyId!==expectedKeyId||value.transferId!==transferId||value.recipientSHA256!==recipientSHA256||!Number.isFinite(created)||!Number.isFinite(expires)||created>now+300000||expires<=now||expires-created>86400000)throw Error('Custody identity or time bounds differ.');
 const receiver=privateKey(receiverFile,'rsa'),publicBytes=createPublicKey(receiver).export({type:'spki',format:'pem'});
 if(sha(Buffer.from(publicBytes))!==recipientSHA256)throw Error('This is not the authorized custody recipient.');
 const plain=privateDecrypt({key:receiver,padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},Buffer.from(value.ciphertext,'base64url'));
 try{
  const key=createPrivateKey({key:plain,type:'pkcs8',format:'der'}),identity=publisherPublic(key);
  if(key.asymmetricKeyType!=='ed25519'||identity.id!==expectedKeyId||identity.publicKey!==trusted.publicKey)throw Error('Decrypted key differs from bundled trust.');
  const challenge=Buffer.from('Proteus publisher custody acceptance '+transferId);
  if(!verify(null,challenge,createPublicKey(trusted.publicKey),sign(null,challenge,key)))throw Error('Publisher custody proof failed.');
  writePrivate(output,key.export({type:'pkcs8',format:'pem'}));
  return {transferId,keyId:identity.id,imported:true,proofVerified:true,keyFile:output,protected:hasPrivatePermissions(output)};
 }finally{plain.fill(0);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 try{
  const {values,positionals}=parseArgs({allowPositionals:true,options:Object.fromEntries(['directory','key','recipient','recipient-sha256','key-id','out','envelope','sha256','receiver','transfer-id'].map(k=>[k,{type:'string'}]))});
  let result;
  if(positionals[0]==='init'){if(process.platform!=='darwin')throw Error('Initialize publisher authority on the designated Build Mac.');result=initializePublisher(values.directory);}
  else if(positionals[0]==='export')result=exportLegacyPublisher({keyFile:values.key,recipientFile:values.recipient,recipientSHA256:values['recipient-sha256'],expectedKeyId:values['key-id'],output:values.out,transferId:values['transfer-id']});
  else if(positionals[0]==='import'){if(process.platform!=='darwin')throw Error('Import legacy publisher custody only on Build Mac.');result=importLegacyPublisher({envelopeFile:values.envelope,expectedSHA256:values.sha256,receiverFile:values.receiver,recipientSHA256:values['recipient-sha256'],expectedKeyId:values['key-id'],transferId:values['transfer-id'],output:values.out});}
  else throw Error('Choose init, export or import.');
  console.log(JSON.stringify(result));
 }catch{console.error('Publisher custody operation failed; no private-key details are returned. Inspect the pinned inputs and protected destination.');process.exitCode=1;}
}
