import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash,createPublicKey,verify} from 'node:crypto';
import {revision} from '../scheduling/schedules.js';
import {adoIdentityProfile} from './managed-ado-identity.js';
import {qualifyAdoAuthentication,safeAdoFailure,adoFailure as fail} from './managed-ado-alternative-profile.js';
import {boundedAdoJSON,verifyAdoResource} from './managed-ado-resource-identity.js';
const execute=promisify(execFile);
// Read only the nonsecret CLI configuration; never inspect or copy a token cache.
export async function qualifyCliStorage(cli,{platform=process.platform}={}){
 if(platform!=='win32')throw fail('CLI_STORAGE_UNQUALIFIED');
 // Qualified 2.80 Windows default is DPAPI. macOS uses a shared Keychain item;
 // Linux libsecret isolation has not been qualified. Neither gets an assumed pass.
 let config='';try{const file=path.join(cli.profileDirectory,'config');if((await fs.stat(file)).size>64000)throw fail('CLI_STORAGE_UNQUALIFIED');config=await fs.readFile(file,'utf8');}catch(error){if(error.code!=='ENOENT')throw fail('CLI_STORAGE_UNQUALIFIED');}
 let section='';for(const line of config.split(/\r?\n/)){const header=/^\s*\[([^\]]+)\]/.exec(line);if(header){section=header[1].toLowerCase();continue;}if(section==='core'){const setting=/^\s*encrypt_token_cache\s*=\s*(.*?)\s*$/.exec(line);if(setting&&!/^(true|yes|on|1)$/i.test(setting[1]))throw fail('CLI_STORAGE_UNQUALIFIED');}}
 return {state:'qualified',backend:'windows-dpapi',version:'2.80.0'};
}
export class ManagedAdoCli {
 constructor({ownerId,fetchFn=fetch,now=()=>Date.now(),run=execute,storageCheck=qualifyCliStorage,pinCheck}={}){Object.assign(this,{ownerId,fetchFn,now,run,storageCheck,pinCheck});this.tokens=new Map();this.pending=new Map();this.closed=false;}
 binding(d){qualifyAdoAuthentication(d);if(this.closed||d.ownerId!==this.ownerId||d.authentication.adapter!=='ado-azure-cli')throw fail('CONFIGURATION_MISMATCH');return revision(d);}
 async command(cli,args){
  try{return JSON.parse((await this.run(cli.executable,args,{shell:false,timeout:30000,maxBuffer:512000,windowsHide:true,env:{PATH:path.dirname(cli.executable)+path.delimiter+['/usr/bin','/bin'].join(path.delimiter),HOME:os.homedir(),...(process.env.SystemRoot?{SystemRoot:process.env.SystemRoot}:{}),AZURE_CONFIG_DIR:cli.profileDirectory,AZURE_CORE_COLLECT_TELEMETRY:'no',AZURE_CORE_NO_COLOR:'true',AZURE_EXTENSION_USE_DYNAMIC_INSTALL:'no'}})).stdout);}catch{throw fail('CLI_UNAVAILABLE');}
 }
 async inspect(d){
  this.binding(d);const cli=d.authentication.cli;
  await this.storageCheck(cli);
  try{if(this.pinCheck)await this.pinCheck(cli);else{const stat=await fs.stat(cli.executable);if(!stat.isFile()||stat.size>100000000||createHash('sha256').update(await fs.readFile(cli.executable)).digest('hex')!==cli.sha256)throw Error();}}catch{throw fail('CLI_UNAVAILABLE');}
  const version=await this.command(cli,['version','--output','json']);if(version['azure-cli']!==cli.version)throw fail('CONFIGURATION_MISMATCH');
  return {state:'qualified',nextAction:'The explicit CLI profile is selected. Verify its corporate identity and required capabilities.'};
 }
 async tokenClaims(d,token){
  try{
   const parts=token.split('.');if(parts.length!==3||token.length>32000)throw Error();
   const h=JSON.parse(Buffer.from(parts[0],'base64url')),c=JSON.parse(Buffer.from(parts[1],'base64url'));
   const tenant=d.expected.tenant.toLowerCase(),allowedIssuers=['https://sts.windows.net/'+tenant+'/','https://login.microsoftonline.com/'+tenant+'/v2.0'];
   if(h.alg!=='RS256'||typeof h.kid!=='string'||!allowedIssuers.includes(c.iss?.toLowerCase())||c.tid?.toLowerCase()!==tenant||c.oid?.toLowerCase()!==d.expected.principal.toLowerCase()||c.aud!==adoIdentityProfile.audience||typeof c.scp!=='string'||!c.scp.split(' ').includes('user_impersonation')||!Number.isFinite(c.exp)||c.exp*1000<=this.now()+90000||!Number.isFinite(c.nbf)||c.nbf*1000>this.now()+60000)throw Error();
   const response=await this.fetchFn('https://login.microsoftonline.com/'+tenant+'/discovery/v2.0/keys',{redirect:'manual',signal:AbortSignal.timeout(10000)});
   if(response.status===429){await response.body?.cancel();throw Object.assign(fail('RATE_LIMITED'),{retryAfterMs:60000});}if(!response.ok||response.redirected){await response.body?.cancel();throw fail('UNAVAILABLE');}const jwks=await boundedAdoJSON(response);
   const keys=jwks.keys?.filter(k=>k.kid===h.kid&&k.kty==='RSA'&&k.use==='sig');if(keys?.length!==1)throw Error();
   if(!verify('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),createPublicKey({key:keys[0],format:'jwk'}),Buffer.from(parts[2],'base64url')))throw Error();return c.exp*1000;
  }catch(error){if(['RATE_LIMITED','UNAVAILABLE'].includes(error?.code))throw safeAdoFailure(error);throw fail('ACCESS_DENIED');}
 }
 async acquire(d){
  const key=this.binding(d),old=this.tokens.get(key);if(old?.expiry>this.now()+90000)return old;if(this.pending.has(key))return this.pending.get(key);
  const task=(async()=>{
   await this.inspect(d);
   const account=await this.command(d.authentication.cli,['account','show','--output','json','--only-show-errors']);
   if(account.tenantId?.toLowerCase()!==d.expected.tenant.toLowerCase()||account.user?.type!=='user')throw fail('ACCESS_DENIED');
   const result=await this.command(d.authentication.cli,['account','get-access-token','--tenant',d.expected.tenant,'--resource',adoIdentityProfile.audience,'--output','json','--only-show-errors']);
   if(result.tenant?.toLowerCase()!==d.expected.tenant.toLowerCase()||result.tokenType!=='Bearer'||typeof result.accessToken!=='string')throw fail('ACCESS_DENIED');
   const expiry=Math.min(await this.tokenClaims(d,result.accessToken),Number(result.expires_on)*1000);if(!Number.isFinite(expiry)||expiry<=this.now()+90000)throw fail('AUTH_REQUIRED');
   await verifyAdoResource(d,'Bearer '+result.accessToken,{fetchFn:this.fetchFn,signal:AbortSignal.timeout(d.policy.requestTimeoutMs)});
   if(this.closed)throw fail('UNAVAILABLE');const value={token:result.accessToken,expiry};this.tokens.set(key,value);return value;
  })().catch(error=>{throw safeAdoFailure(error);}).finally(()=>this.pending.delete(key));this.pending.set(key,task);return task;
 }
 async use(d,consume){const value=await this.acquire(d);return consume(value.token,value.expiry);}
 async signIn(d){await this.acquire(d);return {state:'authenticated',nextAction:'Verify required capabilities. No interactive CLI login was started.'};}
 invalidate(d){this.tokens.delete(this.binding(d));}
 close(){this.closed=true;this.tokens.clear();}
}
