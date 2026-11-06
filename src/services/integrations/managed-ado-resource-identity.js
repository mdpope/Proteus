import {adoFailure as fail} from './managed-ado-alternative-profile.js';
export async function boundedAdoJSON(response){
 if(!response.body)throw fail('UNAVAILABLE');const reader=response.body.getReader(),chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2000000)throw fail('UNAVAILABLE');chunks.push(Buffer.from(value));}return JSON.parse(Buffer.concat(chunks).toString());}catch{await reader.cancel().catch(()=>{});throw fail('UNAVAILABLE');}
}
export async function verifyAdoResource(d,authorization,{fetchFn=fetch,signal}={}){
 let response;try{response=await fetchFn(d.expected.resource+'/_apis/connectionData?connectOptions=0&lastChangeId=-1&lastChangeId64=-1',{headers:{authorization},redirect:'manual',signal});}catch{throw fail('UNAVAILABLE');}
 if(response.redirected||response.status>=300&&response.status<400){await response.body?.cancel();throw fail('CONFIGURATION_MISMATCH');}
 if(response.status===429){await response.body?.cancel();const header=response.headers.get('retry-after'),delay=/^\d+$/.test(header||'')?Number(header)*1000:Date.parse(header)-Date.now();throw Object.assign(fail('RATE_LIMITED'),{retryAfterMs:Number.isFinite(delay)?Math.max(1000,Math.min(3600000,delay)):60000});}
 if(!response.ok){await response.body?.cancel();throw fail(response.status===401?'AUTH_REQUIRED':response.status===403?'ACCESS_DENIED':'UNAVAILABLE');}
 const result=await boundedAdoJSON(response),user=d.expected.adoUserId||d.expected.principal;
 if(result.instanceId?.toLowerCase()!==d.expected.organizationId.toLowerCase()||result.authenticatedUser?.id?.toLowerCase()!==user.toLowerCase()||result.authenticatedUser?.isActive!==true)throw fail('ACCESS_DENIED');
 return {principal:d.expected.principal,tenant:d.expected.tenant,resource:d.expected.resource};
}
