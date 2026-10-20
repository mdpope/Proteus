import {safeContentTabURL} from './content-tab-descriptor.js';
// Keep one operation identity when a concurrent metadata edit requires a retry.
export async function mutateBrowserNavigation(request,{scope,id,tab,revision,url,entry}){
 const address=safeContentTabURL(entry?.url||url);
 if(!address)throw new Error('This address cannot be shared. Open private sign-in links in your browser directly.');
 const operationId=crypto.randomUUID(),operation={action:entry?'browser-traverse':'browser-navigate',tabId:tab.id,entryId:entry?.id||crypto.randomUUID(),operationId,visitedAt:new Date().toISOString(),baseRevision:tab.history?.revision||0,...(!entry?{url:address,title:new URL(address).hostname}:{})};
 const send=expectedRevision=>request('tabs.mutate',{scope,id,expectedRevision,operations:[operation]});
 try{return await send(revision);}catch(error){if(!/Content tabs changed/.test(error.message))throw error;const fresh=await request('tabs.get',{scope,id});return send(fresh.revision);}
}
