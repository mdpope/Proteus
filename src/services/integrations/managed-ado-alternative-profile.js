import path from 'node:path';
import {adoIdentityProfile,qualifyAdoIdentity} from './managed-ado-identity.js';
export const adoAlternativeIds=['ado-azure-cli','ado-pat'];
export const adoReadScopes=Object.freeze(['vso.project','vso.work']);
export const adoWriteScopes=Object.freeze(['vso.project','vso.work_write']);
export const qualifiedAdoPatScopes=scopes=>[adoReadScopes,adoWriteScopes].some(profile=>JSON.stringify(scopes)===JSON.stringify(profile));
export const adoFailure=code=>Object.assign(Error(({CLI_UNAVAILABLE:'The pinned Azure CLI executable is unavailable.',CLI_STORAGE_UNQUALIFIED:'Azure CLI cache protection and profile isolation are not qualified on this platform. Existing caches were not changed.',PAT_REQUIRED:'Enter an existing organization-approved PAT in the owner connection UI.',PAT_EXPIRED:'The configured PAT has expired. Replace it explicitly in the owner UI.',ACCESS_DENIED:'The ADO account or organization does not match the configured identity.',CONFIGURATION_MISMATCH:'Review the exact ADO connection configuration.',UNAVAILABLE:'ADO authentication is temporarily unavailable.',AUTH_REQUIRED:'Renew the selected corporate CLI session on its owning computer.',CREDENTIAL_STORE_UNAVAILABLE:'Unlock protected credential storage.'})[code]||'ADO connection verification failed.'),{code});
export const adoDomains=Object.freeze(['core','work','work-items','search','test-plans','repositories','wiki','pipelines','advanced-security']);
export const defaultAdoDomains=Object.freeze(['core','work','work-items','search']);
export function selectedAdoDomains(d){const domains=d.transport?.domains??defaultAdoDomains;if(!Array.isArray(domains)||!domains.length||domains.length>adoDomains.length||new Set(domains).size!==domains.length||domains.some(x=>!adoDomains.includes(x)))throw adoFailure('CONFIGURATION_MISMATCH');return [...domains];}
const guid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
export function qualifyAdoAuthentication(d){
 const a=d.authentication,e=d.expected;selectedAdoDomains(d);
 if(a?.permissionProfile!==undefined&&(a.adapter!=='ado-pat'||a.permissionProfile!=='issuer-granted'))throw adoFailure('CONFIGURATION_MISMATCH');
 if(a?.adapter===adoIdentityProfile.adapter)return qualifyAdoIdentity(d);
 if(!adoAlternativeIds.includes(a?.adapter)||a.credentialOwnerId!==d.ownerId||a.clientId!==undefined||!guid(e?.principal)||!guid(e?.tenant)||!guid(e?.organizationId)||!/^https:\/\/dev\.azure\.com\/[a-zA-Z0-9][a-zA-Z0-9-]{0,49}$/.test(e.resource||''))throw adoFailure('CONFIGURATION_MISMATCH');
 if(a.adapter==='ado-azure-cli'){
  if(a.expiresAt!==undefined||a.reminderDays!==undefined||e.audience!==adoIdentityProfile.audience||JSON.stringify(e.scopes)!==JSON.stringify([adoIdentityProfile.scope])||!guid(e.adoUserId)||!path.isAbsolute(a.cli?.executable||'')||!path.isAbsolute(a.cli?.profileDirectory||'')||! /^[a-f0-9]{64}$/.test(a.cli?.sha256||'')||a.cli?.version!=='2.80.0')throw adoFailure('CONFIGURATION_MISMATCH');
 }else if(a.cli!==undefined||e.adoUserId!==undefined||e.audience!=='azure-devops-pat'||e.tenant!==e.organizationId||!(a.permissionProfile==='issuer-granted'?Array.isArray(e.scopes)&&e.scopes.length===0:qualifiedAdoPatScopes(e.scopes))||!Number.isFinite(Date.parse(a.expiresAt))||!Number.isInteger(a.reminderDays)||a.reminderDays<1||a.reminderDays>30)throw adoFailure('CONFIGURATION_MISMATCH');
 return d;
}

export function safeAdoFailure(error){const code=['CLI_UNAVAILABLE','CLI_STORAGE_UNQUALIFIED','PAT_REQUIRED','PAT_EXPIRED','ACCESS_DENIED','CONFIGURATION_MISMATCH','UNAVAILABLE','AUTH_REQUIRED','CREDENTIAL_STORE_UNAVAILABLE','RATE_LIMITED'].includes(error?.code)?error.code:'UNAVAILABLE';return Object.assign(adoFailure(code),Number.isFinite(error?.retryAfterMs)?{retryAfterMs:Math.max(1000,Math.min(3600000,error.retryAfterMs))}:{});}
