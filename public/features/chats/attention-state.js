// Shared pure projection. Acknowledging attention never changes the actual wait.
export function attentionToken(run){
 const questions=(run.userQuestions||[]).filter(question=>question.status==='pending').map(question=>question.id).sort();
 const pending=run.status==='awaiting_input'&&run.pending?{id:run.pending.id,type:run.pending.type}:null;
 const failed=!run.archivedAt&&['failed','interrupted'].includes(run.status)&&!run.failureReviewedAt?(run.failureEventAt||run.turns?.at(-1)?.id||run.updatedAt||run.createdAt):null;
 return pending||questions.length||failed?JSON.stringify({pending,questions,failed}):null;
}
export function needsAttention(run){const token=attentionToken(run);return !!token&&run.attentionAcknowledged?.token!==token;}
export const attentionItemToken=item=>JSON.stringify([item.kind,item.title||'',item.body||'',item.kind==='connection'?null:item.at||null]);
