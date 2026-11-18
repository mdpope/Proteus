const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
// Plain UI copy shares the same strict owner-bound routing as Markdown. Never
// interpret HTML or turn pairing/authentication URLs into actionable links.
export function mountChatLinks(node,text){
 const value=String(text||'');node.replaceChildren();let offset=0;
 for(const match of value.matchAll(/proteus:\/\/[^\s<>()[\]{}]+/gi)){
  const url=match[0].replace(/[.,!;:]+$/,'');if(!parseChatLink(url))continue;
  node.append(document.createTextNode(value.slice(offset,match.index)));
  const link=document.createElement('a');link.href=url;link.textContent=url;node.append(link);offset=match.index+url.length;
 }
 node.append(document.createTextNode(value.slice(offset)));
}
export function chatLink({hostId,id,chatId,runId},{origin}={}){
 const host=hostId,chat=chatId||runId||id;
 if(!uuid.test(host||'')||!uuid.test(chat||''))throw Error('This chat’s owner or identity is unavailable. Refresh and try again.');
 const url=new URL(origin?'/remote':'proteus://chat',origin||undefined);
 if(origin){if(!['https:','http:'].includes(url.protocol))throw Error('Use a website origin.');url.searchParams.set('view','chats');}
 url.searchParams.set('host',host);url.searchParams.set(origin?'chat':'id',chat);return url.href;
}
// A resource link selects an existing owner and resource; it never pairs a device
// or accepts credentials, extra commands, ambiguous identities or another scheme.
export function parseChatLink(value){
 if(typeof value!=='string'||/[\u0000-\u0020\u007f]/.test(value))return null;
 let url;try{url=new URL(value);}catch{return null;}
 if(url.protocol!=='proteus:'||url.hostname!=='chat'||!['','/'].includes(url.pathname)||url.username||url.password||url.port||url.hash||value.includes('#'))return null;
 const fields=[...url.searchParams],hostId=url.searchParams.get('host'),id=url.searchParams.get('id');
 if(fields.length!==2||url.searchParams.getAll('host').length!==1||url.searchParams.getAll('id').length!==1||!uuid.test(hostId||'')||!uuid.test(id||''))return null;
 return {hostId,id};
}
