const {createHash}=require('node:crypto');
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const own=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);

// Keep the source digest readable by protocol-1 updaters. Identity is additionally
// bound by a versioned digest and the installed application's verified signature.
function sourceFields(value){
 const fields={runtimeFiles:value.runtimeFiles,buildInputs:value.buildInputs};
 if(own(value,'gitHead'))Object.assign(fields,{gitHead:value.gitHead,dirty:value.dirty});
 return fields;
}
function createProvenance(value){
 const sourceFingerprint=hash(sourceFields(value));
 const identity={sourceFingerprint,...(own(value,'appBundleId')?{appBundleId:value.appBundleId}:{})};
 return {schemaVersion:1,...value,fingerprintVersion:2,sourceFingerprint,identityFingerprint:hash(identity)};
}
function validateProvenance(value){
 if(value?.schemaVersion!==1||!value.runtimeFiles||!value.buildInputs||!Object.keys(value.runtimeFiles).length)throw Error('The packaged source manifest is invalid.');
 for(const files of [value.runtimeFiles,value.buildInputs]){
  if(typeof files!=='object'||Array.isArray(files))throw Error('The packaged source manifest is invalid.');
  for(const [file,digest]of Object.entries(files))if(!file||file.startsWith('/')||/^[a-z]:/i.test(file)||file.includes('\\')||file.split('/').some(part=>part==='..'||!part)||!/^[a-f0-9]{64}$/.test(digest))throw Error('The packaged source manifest contains an invalid file.');
 }
 if(own(value,'appBundleId')&&!/^[a-zA-Z0-9][a-zA-Z0-9.-]{1,199}$/.test(value.appBundleId))throw Error('The packaged application identity is invalid.');
 const version=value.fingerprintVersion??1,fields=sourceFields(value);
 if(version===1){
  // October 22 Mac manifests added appBundleId before the fingerprint contract
  // had a version. Accept that exact historical encoding, not arbitrary fields.
  if(own(value,'appBundleId'))fields.appBundleId=value.appBundleId;
  if(hash(fields)!==value.sourceFingerprint)throw Error('The packaged source fingerprint is inconsistent.');
 }else if(version===2){
  if(hash(fields)!==value.sourceFingerprint||hash({sourceFingerprint:value.sourceFingerprint,...(own(value,'appBundleId')?{appBundleId:value.appBundleId}:{})})!==value.identityFingerprint)throw Error('The packaged source or identity fingerprint is inconsistent.');
 }else throw Error('This package requires a newer provenance validator.');
 return {version,sourceFingerprint:value.sourceFingerprint,appBundleId:value.appBundleId||null};
}
module.exports={createProvenance,validateProvenance,sourceFields};
