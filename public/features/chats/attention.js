import {mountBrowserIssueActions} from '../browser/browser-notifications.js';
import {mountAttentionNotifications,mountAttentionTabs,notificationFilters} from './attention-notifications.js';
let ui,selected='chats',initialized=false,panel;const announced=new Set(),filters=notificationFilters();
export function initAttention(value){ui=value;}
export function attentionItems(){return [...ui.chats().map(chat=>({id:'chat:'+chat.hostId+':'+(chat.chatId||chat.id),kind:'chat',title:chat.title,at:chat.updatedAt,chat})),...(ui.state.data?.attention||[])].sort((a,b)=>Date.parse(b.at||0)-Date.parse(a.at||0));}
async function act(item,action){if(item.kind==='notification'){await ui.api('/api/notifications',{action:'read',id:item.notificationId});await ui.refresh(true);if(action==='open'&&item.destination)await ui.openLifeDestination(item.destination);else if(action==='open'&&item.chatId)ui.openChat({local:true,id:item.chatId,chatId:item.chatId});}else if(item.kind==='site-notification'){if(action==='open'){const rows=await window.desktop.browser({action:'list'});const tab=rows.find(tab=>tab.id===item.tabId)||await window.desktop.browser({action:'create',url:item.origin,profileId:item.profileId});ui.openBrowser(tab);}await window.desktop.browser({action:'notification-read',notificationId:item.id,activate:action==='open'});await ui.refresh(true);}else if(item.kind==='site-permission'){await window.desktop.browser({action:'notification-review',requestId:item.id,permission:action});await ui.refresh(true);}else if(item.kind==='document'){await ui.api('/api/remote',{action:'document-review',requestId:item.requestId,approved:action==='approve'});await ui.refresh(true);}else ui.connections(item.section||'connections');}
export function announceAttention(){ui.toast.reconcileAttention?.(new Set((ui.state.data?.attention||[]).map(item=>item.id)));for(const item of ui.state.data?.attention||[]){if(announced.has(item.id))continue;announced.add(item.id);if(item.silent||item.browserIssue&&item.browserIssue.kind!=='site-notification')continue;if(!initialized&&item.kind==='notification')continue;ui.toast({attentionId:item.id,message:item.title,actions:item.browserIssue?.kind==='site-notification'?[{label:'Open website',run:()=>window.desktop.browserNotification({action:'act',id:item.notificationId,intent:'review'})},{label:'Mark read',run:()=>act(item,'read')}]:item.kind==='site-notification'?[{label:'Open site',run:()=>act(item,'open')},{label:'Mark read',run:()=>act(item,'read')}]:item.kind==='notification'?[{label:item.destination?'Open '+item.destination.kind:item.chatId?'Open chat':'Mark read',run:()=>act(item,item.destination||item.chatId?'open':'read')}]:item.kind==='site-permission'?[{label:'Allow',run:()=>act(item,'allow')},{label:'Block',run:()=>act(item,'block')}]:item.kind==='document'?[{label:'Approve',run:()=>act(item,'approve')},{label:'Deny',run:()=>act(item,'deny')}]:[{label:'Open connections',run:()=>act(item,'open')}]});}initialized=true;while(announced.size>1000)announced.delete(announced.values().next().value);}
export function openAttentionItem(id){const item=attentionItems().find(item=>item.id===id);if(item?.kind==='chat')return ui.openChat(item.chat);selected='notifications';ui.openPage();requestAnimationFrame(()=>panel?.reveal(id));}
export function renderAttention(){
 const main=document.querySelector('#main'),items=ui.state.data.attention||[];
 const focused=document.activeElement?.matches?.('[data-attention-search]');
 main.innerHTML='<div class="attention-content" style="display:contents"></div>';const content=main.firstChild;
 if(selected==='chats'){panel=null;ui.renderChats(content);}
 else panel=mountAttentionNotifications(content,{items,filters,focused,renderActions:renderNotificationActions,time:ui.time});
 const clear=document.createElement('button');clear.type='button';clear.textContent='Clear all';clear.id='attention-clear-all';clear.onclick=async()=>{
  clear.disabled=true;let operation;
  try{operation=JSON.parse(localStorage.getItem('proteus.attention-clear.pending')||'null');if(!operation){operation={operationId:crypto.randomUUID(),issuedAt:new Date().toISOString()};localStorage.setItem('proteus.attention-clear.pending',JSON.stringify(operation));}
   const result=await ui.api('/api/attention/clear',operation);localStorage.removeItem('proteus.attention-clear.pending');
   document.dispatchEvent(new Event('proteus-clear-attention'));await ui.refresh(true);await ui.loadChats?.();renderAttention();
   ui.toast(`Cleared ${result.cleared} attention items.${result.failures.length?' '+result.failures.length+' computer(s) could not be cleared.':''}`);
  }catch(error){ui.toast(error.message);}finally{clear.disabled=false;}
 };
 mountAttentionTabs(main,{selected,count:items.length,actions:[clear],change:value=>{selected=value;renderAttention();}});
}
function renderNotificationActions(card,item){
 if(item.path){const details=document.createElement('details'),summary=document.createElement('summary'),file=document.createElement('div');summary.textContent='Details';file.className='filepath';file.textContent=item.path;details.append(summary,file);card.append(details);}
 if(item.browserIssue)mountBrowserIssueActions(card,item);
 const buttons=document.createElement('div');buttons.className='actions';
 for(const [key,label] of item.kind==='site-notification'?[['open','Open site'],['read','Mark read']]:item.kind==='notification'?[...(item.destination?[['open','Open '+item.destination.kind]]:item.chatId?[['open','Open chat']]:[]),['read','Mark read']]:item.kind==='site-permission'?[['allow','Allow'],['block','Block']]:item.kind==='document'?[['approve','Approve'],['deny','Deny']]:[['open','Open connections']]){
  const button=document.createElement('button');button.type='button';button.textContent=label;button.onclick=async()=>{button.disabled=true;try{await act(item,key);}catch(error){ui.toast(error.message);}finally{button.disabled=false;}};buttons.append(button);
 }
 card.append(buttons);
}
