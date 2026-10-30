const actions=new Set(['read','dispatch','answer','cancel']);
export function chatAccessScope(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!['hostId','actions','chatIds','projectId'].includes(key))||typeof value.hostId!=='string'||!value.hostId||value.hostId.length>128||!Array.isArray(value.actions)||!value.actions.length||value.actions.length>4||value.actions.some(action=>!actions.has(action)))return null;
 if(value.projectId!==undefined&&(typeof value.projectId!=='string'||!value.projectId||value.projectId.length>256))return null;
 if(value.chatIds!==undefined&&(!Array.isArray(value.chatIds)||!value.chatIds.length||value.chatIds.length>100||value.chatIds.some(id=>typeof id!=='string'||!id||id.length>128)))return null;
 return {hostId:value.hostId,actions:[...new Set(value.actions)].sort(),...(value.projectId?{projectId:value.projectId}:{}),...(value.chatIds?{chatIds:[...new Set(value.chatIds)].sort()}: {})};
}
export function matchesChatAccess(rule,requested){
 const saved=rule.kind==='chat-access'&&rule.tool==='proteus_chats'&&chatAccessScope(rule.scope),scope=chatAccessScope(requested);
 return !!(saved&&scope&&saved.hostId===scope.hostId&&scope.actions.every(action=>saved.actions.includes(action))&&(!saved.projectId||saved.projectId===scope.projectId)&&(!saved.chatIds||scope.chatIds?.every(id=>saved.chatIds.includes(id))));
}
