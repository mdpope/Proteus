// Push remains payload-free. Read bounded notifications through the current signed-in account.
self.addEventListener('push',event=>{event.waitUntil((async()=>{
 const response=await fetch('/life/api/notifications',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
 if(!response.ok)return;
 const value=await response.json(),account=value.accountId,uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
 if(!/^[a-f0-9]{64}$/.test(account||''))return;
 const receipts=await caches.open('proteus-notification-receipts-v1');
 for(const n of (value.notifications||[]).slice(0,20)){
  const at=Date.parse(n.occurredAt||n.createdAt),id=n.eventId||n.id;
  if(n.read||n.readAt||n.resolvedAt||n.silent||!uuid.test(id||'')||!Number.isFinite(at)||Date.now()-at>300000||at>Date.now()+60000)continue;
  const key=new Request(self.location.origin+'/__proteus-notice/'+account+'/'+id);if(await receipts.match(key))continue;
  let url='/engine-room?tab=notifications';const d=n.destination;
  if(d?.accountId===account&&d.kind==='reminder'&&uuid.test(d.reminderId||''))url='/life/reminders?'+new URLSearchParams({id:d.reminderId});
  else if(d?.accountId===account&&d.kind==='document'&&uuid.test(d.documentId||'')&&uuid.test(d.hostId||''))url='/life/result?'+new URLSearchParams({account,host:d.hostId,document:d.documentId});
  else if(d?.accountId===account&&d.kind==='chat'&&uuid.test(d.chatId||'')&&uuid.test(d.hostId||''))url='/remote?'+new URLSearchParams({view:'chats',host:d.hostId,chat:d.chatId});
  else if(!d&&uuid.test(n.hostId||'')&&uuid.test(n.chatId||''))url='/remote?'+new URLSearchParams({view:'chats',host:n.hostId,chat:n.chatId});
  // An uncertain notification send is never repeated under a new identity.
  await receipts.put(key,new Response('seen'));
  await self.registration.showNotification(String(n.title||'Proteus').slice(0,160),{body:String(n.body||'Open Proteus to review.').slice(0,500),tag:id,data:{url}});
 }
 const keys=await receipts.keys();for(const key of keys.slice(0,Math.max(0,keys.length-2000)))await receipts.delete(key);
})().catch(()=>{}));});
self.addEventListener('notificationclick',event=>{event.notification.close();const url=event.notification.data?.url;event.waitUntil(clients.openWindow(typeof url==='string'&&/^\/(?:life\/(?:reminders|result)\?|remote\?|engine-room\?)/.test(url)?url:'/engine-room?tab=notifications'));});
