const uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
export function lifeDestinationURL(value,accountId){
 if(!value||value.accountId!==accountId||!/^[a-f0-9]{64}$/.test(accountId||''))return null;
 if(value.kind==='reminder'&&uuid.test(value.reminderId||''))return '/life/reminders?'+new URLSearchParams({id:value.reminderId});
 if(value.kind==='document'&&uuid.test(value.documentId||'')&&uuid.test(value.hostId||''))return '/life/result?'+new URLSearchParams({account:accountId,host:value.hostId,document:value.documentId});
 if(value.kind==='chat'&&uuid.test(value.chatId||'')&&uuid.test(value.hostId||''))return '/remote?'+new URLSearchParams({view:'chats',host:value.hostId,chat:value.chatId});
 return null;
}
