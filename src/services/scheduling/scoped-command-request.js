const requests=new WeakSet();
export function ownerScopedCommandRequest(details){requests.add(details);return details;}
export function isOwnerScopedCommandRequest(details){return requests.has(details);}
