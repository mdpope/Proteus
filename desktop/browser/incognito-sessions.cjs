const {randomUUID}=require('node:crypto');
const prefix='proteus-incognito:';
// These identities never enter the saved profile catalog. One tab owns one
// partition; recreating its renderer retains the partition until explicit close.
class IncognitoSessions {
 constructor(){this.profiles=new Map();}
 create(){const id=randomUUID();this.profiles.set(id,{id,name:'Incognito',incognito:true,settings:{blockingEnabled:true,notifications:[]}});return id;}
 has(id){return this.profiles.has(id);}
 partition(id){return prefix+id;}
 async close(id,session){
  if(!this.has(id))return;
  // Await cleanup of service workers/network connections before releasing the
  // tab's only reference to its ephemeral session.
  await session?.clearStorageData();await session?.clearCache();await session?.clearAuthCache?.();await session?.clearHostResolverCache?.();await session?.closeAllConnections();
  this.profiles.delete(id);
 }
}
const incognitoPartition=value=>typeof value==='string'&&value.startsWith(prefix);
module.exports={IncognitoSessions,incognitoPartition};
