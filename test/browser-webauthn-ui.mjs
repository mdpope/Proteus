import { _electron as electron } from 'playwright';
import { sidebarFixture } from './preview-sidebar-fixture.mjs';
import assert from 'node:assert/strict';
import {createHash,createPublicKey,verify,randomBytes} from 'node:crypto';
const fixture=await sidebarFixture();let app;
const origin=fixture.origin.replace("127.0.0.1","localhost");
try {
 app=await electron.launch({...(process.env.PROTEUS_TEST_EXECUTABLE?{executablePath:process.env.PROTEUS_TEST_EXECUTABLE}:{}),args:[...(process.env.PROTEUS_TEST_EXECUTABLE?[]:['.']),'--use-mock-keychain'],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,CODEX_HOME:fixture.auth,PORT:'0'}});
 await (await app.firstWindow()).locator('body.window-design-preview').waitFor();
 await app.evaluate(async({app},url)=>{const b=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();return b.command({action:'create',url});},origin+'/webauthn');
 let page;for(let i=0;i<100;i++){page=app.context().pages().find(p=>p.url()===origin+'/webauthn');if(page)break;await new Promise(r=>setTimeout(r,100));}assert.ok(page);
 const cdp=await app.context().newCDPSession(page);await cdp.send('WebAuthn.enable');
 const {authenticatorId}=await cdp.send('WebAuthn.addVirtualAuthenticator',{options:{protocol:'ctap2',transport:'usb',hasResidentKey:true,hasUserVerification:true,isUserVerified:true,automaticPresenceSimulation:true}});
 const challenge=randomBytes(32).toString('base64');
 const registration=await page.evaluate(async challenge=>{const c=await navigator.credentials.create({publicKey:{challenge:Uint8Array.from(atob(challenge),c=>c.charCodeAt(0)),rp:{name:'Proteus disposable acceptance',id:'localhost'},user:{id:new Uint8Array([1,2,3,4]),name:'synthetic@example.invalid',displayName:'Synthetic Test'},pubKeyCredParams:[{type:'public-key',alg:-7}],authenticatorSelection:{residentKey:'required',userVerification:'required'},timeout:10000}});const b=x=>btoa(String.fromCharCode(...new Uint8Array(x)));return {id:c.id,rawId:b(c.rawId),client:b(c.response.clientDataJSON),key:b(c.response.getPublicKey()),auth:b(c.response.getAuthenticatorData())};},challenge);
 const client=JSON.parse(Buffer.from(registration.client,'base64'));assert.equal(client.type,'webauthn.create');assert.equal(client.origin,origin);assert.equal(client.challenge,Buffer.from(challenge,'base64').toString('base64url'));
 const auth=Buffer.from(registration.auth,'base64');assert.deepEqual(auth.subarray(0,32),createHash('sha256').update('localhost').digest());assert.equal(auth[32]&5,5);
 const challenge2=randomBytes(32).toString('base64');
 const assertion=await page.evaluate(async({challenge,id})=>{const dec=x=>Uint8Array.from(atob(x),c=>c.charCodeAt(0)),b=x=>btoa(String.fromCharCode(...new Uint8Array(x)));const c=await navigator.credentials.get({publicKey:{challenge:dec(challenge),rpId:'localhost',allowCredentials:[{type:'public-key',id:dec(id)}],userVerification:'required',timeout:10000}});return {id:c.id,client:b(c.response.clientDataJSON),auth:b(c.response.authenticatorData),signature:b(c.response.signature)};},{challenge:challenge2,id:registration.rawId});
 assert.equal(assertion.id,registration.id);const client2=JSON.parse(Buffer.from(assertion.client,'base64'));assert.equal(client2.type,'webauthn.get');assert.equal(client2.origin,origin);assert.equal(client2.challenge,Buffer.from(challenge2,'base64').toString('base64url'));
 const data=Buffer.from(assertion.auth,'base64');assert.deepEqual(data.subarray(0,32),createHash('sha256').update('localhost').digest());assert.equal(data[32]&5,5);
 const key=createPublicKey({key:Buffer.from(registration.key,'base64'),format:'der',type:'spki'});assert.ok(verify('sha256',Buffer.concat([data,createHash('sha256').update(Buffer.from(assertion.client,'base64')).digest()]),key,Buffer.from(assertion.signature,'base64')));
 const rejected=await page.evaluate(async()=>{try{await navigator.credentials.get({publicKey:{challenge:new Uint8Array(32),rpId:'example.invalid',timeout:1000}});return false;}catch(e){return e.name;}});assert.equal(rejected,'SecurityError');
 await cdp.send('WebAuthn.removeVirtualAuthenticator',{authenticatorId});
 console.log(JSON.stringify({passed:true,registration:true,assertion:true,signatureVerified:true,originAndChallengeVerified:true,wrongRelyingPartyRejected:true,authenticator:'synthetic CTAP2 USB',realICloudKeychain:false}));
}finally{await app?.close();await fixture.cleanup();}
