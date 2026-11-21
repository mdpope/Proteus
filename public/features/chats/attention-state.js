// Shared pure projection. Acknowledging attention never changes the actual wait.
export function attentionToken(run){
 const questions=(run.userQuestions||[]).filter(question=>question.status==='pending').map(question=>question.id).sort();
 const pending=run.status==='awaiting_input'&&run.pending?{id:run.pending.id,type:run.pending.type}:null;
 const failed=!run.archivedAt&&['failed','interrupted'].includes(run.status)&&!run.failureReviewedAt?(run.failureEventAt||run.turns?.at(-1)?.id||run.updatedAt||run.createdAt):null;
 return pending||questions.length||failed?JSON.stringify({pending,questions,failed}):null;
}
export function needsAttention(run){const token=attentionToken(run);return !!token&&run.attentionAcknowledged?.token!==token;}
export const attentionItemToken=item=>JSON.stringify([item.kind,item.title||'',item.body||'',item.kind==='connection'?null:item.at||null]);

export const notificationCategories = [
 ['browser','Browser'], ['reviews','Approvals & questions'], ['chats','Chats'],
 ['life','Life'], ['connections','Connections'], ['system','System'],
];

export function notificationCategory(item) {
 const type=item.notificationType||item.type||'';
 if(item.browserIssue||item.kind?.startsWith('site-')||type.startsWith('browser.')||type==='website.notification')return 'browser';
 if(type==='review.required'||item.kind==='document'||item.questionId||item.requestKind)return 'reviews';
 if(type.startsWith('life.')||['reminder','document'].includes(item.destination?.kind))return 'life';
 if(item.kind==='connection'||type.startsWith('connection.'))return 'connections';
 if(item.chatId||type.startsWith('chat.')||type==='schedule.completed')return 'chats';
 return 'system';
}

export function filterNotifications(items,{query='',categories=[],hosts=[]}={}) {
 const terms=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean),counts={};
 let total=0;
 const rows=[];
 for(const item of items){
  if(hosts.length&&!hosts.includes(item.hostId))continue;
  const category=notificationCategory(item);
  const label=notificationCategories.find(([id])=>id===category)[1];
  const search=[item.title,item.notificationTitle,item.body,item.hostLabel,label,item.browserIssue?.kind?.replaceAll('-',' ')].filter(Boolean).join(' ').toLocaleLowerCase();
  if(!terms.every(term=>search.includes(term)))continue;
  counts[category]=(counts[category]||0)+1;total++;
  if(!categories.length||categories.includes(category))rows.push({item,category,label});
 }
 return {counts,total,rows:rows.sort((a,b)=>String(b.item.at||'').localeCompare(String(a.item.at||'')))};
}
