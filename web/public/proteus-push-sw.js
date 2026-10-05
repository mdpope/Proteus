self.addEventListener('push',event=>{event.waitUntil(self.registration.showNotification('Proteus',{body:'There is an update in Proteus. Open Notifications to review.',tag:'proteus-update',data:{url:'/engine-room?tab=notifications'}}));});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(clients.openWindow('/engine-room?tab=notifications'));});
