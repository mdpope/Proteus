import path from 'node:path';
import { AccountSession } from './account-session.js';
export { ACCOUNT_CALLBACK as LIFE_CALLBACK, DESKTOP_ACCOUNT_CALLBACK as DESKTOP_LIFE_CALLBACK, AccountTokenVault as LifeTokenVault, accountOrigin as lifeOrigin } from './account-session.js';

/** Optional Life operations share the account session without owning its authentication. */
export class LifeAPI extends AccountSession {
 async begin(origin,options={}){return super.begin(origin,{...options,withLife:true});}
 async refresh(){try{this.profile=this.verify(await this.authorized('/api/v1/life'));this.error=null;}catch(e){this.error=e.message;this.changed();throw e;}this.changed();return this.profile;}
 async data(section,query){const value=this.verify(await this.authorized('/api/v1/life/data',{method:'POST',body:{section,query}}));this.profile={...this.profile,...Object.fromEntries(['accountId','workspaceId','displayName','capabilities','readOnly','sections'].map(k=>[k,value[k]]))};return {...value,identity:this.identity()};}
 async action(action,input,idempotencyKey,expected){this.assertIdentity(expected);const profile=await this.refresh();this.assertIdentity(expected);if(profile.readOnly)throw new Error('This website account is read-only.');const value=await this.authorized('/api/v1/life/action',{method:'POST',body:{action,input,idempotencyKey,expectedAccountId:expected.accountId,expectedWorkspaceId:expected.workspaceId}});return this.verify(value);}
 async evidence(id,expected){this.assertIdentity(expected);await this.refresh();this.assertIdentity(expected);if(!/^[1-9][0-9]*$/.test(String(id)))throw new Error('Choose valid evidence.');const {bytes,headers}=await this.authorized('/api/v1/life/evidence/'+id,{binary:true});let mime='application/octet-stream';if(bytes.subarray(0,5).toString()==='%PDF-')mime='application/pdf';else if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))mime='image/png';else if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)mime='image/jpeg';else if(bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP')mime='image/webp';let name='original-'+id;const disposition=headers.get('content-disposition')||'',match=disposition.match(/filename="([^"]+)"/);if(match)name=path.basename(match[1]).slice(0,255);return {name,mimeType:mime,base64:bytes.toString('base64'),identity:this.identity()};}
}
