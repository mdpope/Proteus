const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function chatLink({hostId,id,chatId,runId},{origin}={}){
 const host=hostId,chat=chatId||runId||id;
 if(!uuid.test(host||'')||!uuid.test(chat||''))throw Error('This chat’s owner or identity is unavailable. Refresh and try again.');
 const url=new URL(origin?'/remote':'proteus://chat',origin||undefined);
 if(origin){if(!['https:','http:'].includes(url.protocol))throw Error('Use a website origin.');url.searchParams.set('view','chats');}
 url.searchParams.set('host',host);url.searchParams.set(origin?'chat':'id',chat);return url.href;
}
export function parseChatLink(value){
 let url;try{url=new URL(value);}catch{return null;}
 if(url.protocol!=='proteus:'||url.hostname!=='chat'||url.pathname)return null;
 const hostId=url.searchParams.get('host'),id=url.searchParams.get('id');
 if(!uuid.test(hostId||'')||!uuid.test(id||'')||[...url.searchParams.keys()].some(key=>!['host','id'].includes(key)))return null;
 return {hostId,id};
}
