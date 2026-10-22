// Windows distribution is independent of the Proteus account/API origin.
// The release channel never receives account credentials or supplies trust keys.
import {windowsReleaseOrigin,saveReleaseResponse} from './desktop-releases.js';

export class DesktopReleaseFeed {
 constructor({fetch:fetcher=globalThis.fetch}={}){this.fetch=fetcher;}
 async releases({channel='stable',platform=process.platform,arch=process.arch}={}){
  if(!['stable','preview'].includes(channel)||platform!=='win32'||!['x64','arm64'].includes(arch))throw Error('Unsupported WTB Windows release target.');
  const response=await this.fetch(windowsReleaseOrigin+'/downloads/proteus/'+channel+'/'+platform+'-'+arch+'.json',{method:'GET',headers:{Accept:'application/json'},credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(30000)});
  if(!response.ok||!response.body)throw Error('The WTB release catalog is unavailable (HTTP '+response.status+').');
  const maximum=1024*1024,declared=response.headers.get('content-length');
  if(declared!==null&&Number(declared)>maximum){await response.body.cancel();throw Error('The WTB release catalog is too large.');}
  let size=0;const chunks=[];
  for await(const chunk of response.body){if((size+=chunk.length)>maximum)throw Error('The WTB release catalog is too large.');chunks.push(chunk);}
  const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if(value.schemaVersion!==1||!Array.isArray(value.releases)||value.releases.length>50)throw Error('The WTB release catalog is invalid.');
  // Verification remains the owner's responsibility, before exposing or using a
  // selection. Catalog contents cannot change the installed publisher trust.
  return value.releases;
 }
 async downloadRelease(release,file){
  if(release.distribution?.kind!=='static'||release.distribution?.origin!==windowsReleaseOrigin||release.platform!=='win32'||!release.verification?.signatureVerified||!/^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/.test(release.id)||!/^[A-Za-z0-9][A-Za-z0-9._-]{0,199}\.tar\.gz$/.test(release.artifact?.filename||'')||release.artifact.path!=='/downloads/proteus/releases/'+release.id+'/'+release.artifact.filename)throw Error('Choose a verified WTB Windows release.');
  const response=await this.fetch(windowsReleaseOrigin+release.artifact.path,{method:'GET',headers:{Accept:'application/octet-stream'},credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(15*60000)});
  return saveReleaseResponse(response,file,release);
 }
}
