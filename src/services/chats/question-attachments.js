import {createHash} from 'node:crypto';
import {modelToolResult} from '../../shared/tool-results.js';
export const questionAttachmentMediaTypes=Object.freeze(['image/png','image/jpeg','image/webp','text/plain']);
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
/** Use the existing exact-file/provider consent boundary, bound to one question. */
export async function replyWithAttachments(engine,id,args,deviceId){
 const run=engine.getRun(id),ids=args.attachments;
 if(!Array.isArray(ids)||!ids.length)return engine.reply(id,args.answer,args.requestId);
 const signature=digest([args.requestId,args.answer||'',ids,args.providerId,deviceId]);
 const prior=run.events.find(event=>event.data?.questionReply?.requestId===args.requestId&&event.data?.delivery?.id===args.messageId);
 if(prior){if(prior.data.delivery.questionReplyDigest!==signature)throw Error('This question submission ID was already used with different content.');return run;}
 if(run.pending?.type!=='question'||run.pending.id!==args.requestId)throw Error('Only the current ordinary question accepts attachments.');
 if(ids.length>4||args.providerId!==run.schedule.provider||!args.consentId||!args.messageId)throw Error('Review up to four question attachments and their exact provider before sending.');
 const files=await engine.attachmentConsents.verify({consentId:args.consentId,chatId:id,messageId:args.messageId,providerId:run.schedule.provider,deviceId,attachmentIds:ids});
 if(files.some(file=>!questionAttachmentMediaTypes.includes(file.mediaType)))throw Error('Question replies support PNG, JPEG, WebP images and plain text.');
 const prepared=await engine.attachmentConsents.prepareSend({consentId:args.consentId,chatId:id,messageId:args.messageId,providerId:run.schedule.provider,deviceId,attachmentIds:ids});
 try{return engine.reply(id,args.answer||'Please review the attached files.',args.requestId,{proofId:prepared.proofId,attachmentIds:ids,messageId:args.messageId,signature});}
 catch(error){await engine.attachmentConsents.releaseProof(prepared.proofId).catch(()=>{});throw error;}
}
export function questionAttachmentTools(adapter,runId){
 if(!adapter.questionInputs)return [];
 return [{name:'proteus_question_attachments',defer:'never',description:'Read the files explicitly attached by the user to an answered question in this chat. Use the requestId included in the question response. Images are returned as images; text files as text. No other chat or filesystem access is granted.',parameters:{type:'object',properties:{requestId:{type:'string'}},required:['requestId'],additionalProperties:false},handler:async({requestId})=>{
   const files=await adapter.questionInputs(runId,requestId),content=[];
   for(const file of files){content.push({type:'text',text:file.name+' · '+file.mediaType});if(file.mediaType==='text/plain')content.push({type:'text',text:file.bytes.toString('utf8')});else content.push({type:'image',mimeType:file.mediaType,data:file.bytes.toString('base64')});}
   return {...modelToolResult({content}),sessionLog:'User question attachments (image bytes omitted).'};
 }}];
}
