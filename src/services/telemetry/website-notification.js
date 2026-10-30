// Portable website events contain the site's own text and safe origin only.
// Window IDs, page URLs, profile IDs and activation handles stay on the owner.
const plain=(value,size)=>String(value||'').replace(/[\x00-\x1f\x7f]+/g,' ').trim().slice(0,size);
export function websiteNotification(detail){
 const url=new URL(detail.origin);if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.origin!==detail.origin)throw Error('Choose the notification website origin.');
 if(typeof detail.siteNotificationId!=='string'||!detail.siteNotificationId||typeof detail.tabId!=='string'||!detail.tabId||typeof detail.windowId!=='string'||!detail.windowId)throw Error('Choose the original website notification.');
 return {type:'website.notification',title:plain(detail.title,160)||url.host,body:plain(detail.body,500),origin:url.origin,sound:detail.silent!==true,hostId:detail.hostId,hostName:plain(detail.hostName,80),browserIssue:{kind:'site-notification',windowId:detail.windowId,tabId:detail.tabId,...(detail.logicalTabId?{logicalTabId:detail.logicalTabId}:{}),profileId:detail.profileId,origin:url.origin,siteNotificationId:detail.siteNotificationId}};
}
export function portableWebsiteNotification(item){return Object.fromEntries(['id','createdAt','readAt','type','title','body','hostId','hostName','origin','sound','silent'].filter(key=>item[key]!==undefined).map(key=>[key,item[key]]));}
