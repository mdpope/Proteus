import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomBytes,createCipheriv,createDecipheriv} from 'node:crypto';
import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import {ManagedCredentialVault} from '../src/services/integrations/managed-credential-vault.js';
function setup(t){
 const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-managed-vault-'));
 t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
 const key=randomBytes(32);
 const storage={isEncryptionAvailable:()=>true,getSelectedStorageBackend:()=> 'synthetic-protected',
 encryptString:text=>{const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key,iv),bytes=Buffer.concat([c.update(text),c.final()]);return Buffer.concat([iv,c.getAuthTag(),bytes]);},
 decryptString:bytes=>{const c=createDecipheriv('aes-256-gcm',key,bytes.subarray(0,12));c.setAuthTag(bytes.subarray(12,28));return Buffer.concat([c.update(bytes.subarray(28)),c.final()]).toString();}};
 return {home,storage,vault:new ManagedCredentialVault(home,storage)};
}
test('credential vault persists ciphertext privately and corruption never leaks decrypted state',t=>{
 const {home,vault}=setup(t),state={bindingKey:'binding',phase:'ready',credential:{refreshToken:'synthetic-secret-value'}};
 vault.write('opaque',state);assert.deepEqual(vault.read('opaque'),state);
 const dir=path.join(home,'managed-mcp-credentials'),file=path.join(dir,fs.readdirSync(dir)[0]),bytes=fs.readFileSync(file,'utf8');
 assert.ok(!bytes.includes('synthetic-secret-value'));assert.ok(!bytes.includes('refreshToken'));
 if(process.platform!=='win32')assert.equal(fs.statSync(file).mode&0o777,0o600);
 const parsed=JSON.parse(bytes);const damaged=Buffer.from(parsed.ciphertext,'base64');damaged[damaged.length-1]^=1;parsed.ciphertext=damaged.toString('base64');fs.writeFileSync(file,JSON.stringify(parsed));
 assert.throws(()=>vault.read('opaque'),e=>e.code==='CREDENTIAL_STORE_UNAVAILABLE'&&!e.message.includes('synthetic-secret-value'));
});
test('locked or Linux plaintext storage never falls back and never creates a credential file',t=>{
 const {home,storage}=setup(t);
 for(const unavailable of [{...storage,isEncryptionAvailable:()=>false},{...storage,getSelectedStorageBackend:()=> 'basic_text'},null]){
  const vault=new ManagedCredentialVault(home,unavailable);
  assert.throws(()=>vault.write('opaque',{secret:'synthetic'}),{code:'CREDENTIAL_STORE_UNAVAILABLE'});
  assert.throws(()=>vault.read('opaque'),{code:'CREDENTIAL_STORE_UNAVAILABLE'});
 }
 assert.equal(fs.existsSync(path.join(home,'managed-mcp-credentials')),false);
});

test('desktop mock Keychain never persists managed auth even when Electron reports encryption available',async t=>{
 const {createRequire}=await import('node:module');const {managedCredentialStorage}=createRequire(import.meta.url)('../desktop/services/managed-credential-storage.cjs');const {home,storage}=setup(t);
 const mocked=managedCredentialStorage({commandLine:{hasSwitch:name=>name==='use-mock-keychain'}},storage);
 assert.throws(()=>new ManagedCredentialVault(home,mocked).write('opaque',{secret:'synthetic'}),{code:'CREDENTIAL_STORE_UNAVAILABLE'});
 assert.equal(fs.existsSync(path.join(home,'managed-mcp-credentials')),false);
 const protectedStorage=managedCredentialStorage({commandLine:{hasSwitch:()=>false}},storage);const vault=new ManagedCredentialVault(home,protectedStorage);vault.write('opaque',{secret:'synthetic'});assert.deepEqual(vault.read('opaque'),{secret:'synthetic'});
});
