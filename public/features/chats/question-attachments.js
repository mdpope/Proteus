import {mountAttachmentPicker,prepareAttachments,selectedAttachments,clearAttachments} from './chat-attachments.js';
const submissions=new Map();
/** Retain the exact delivery across an uncertain reply, rather than resending files. */
export function mountQuestionAttachments({key,host,textarea,providerId,mediaTypes,destination,chatId,requestId,send,notify}){
  if(!host)return {payload:async()=>({}),clear:()=>{}};
  mountAttachmentPicker({key,host,textarea,provider:()=>providerId,mediaTypes,maxFiles:4,notify});
  return {
    async payload(answer){
      const files=selectedAttachments(key).map(item=>item.file),prior=submissions.get(key);
      if(prior&&prior.answer===answer&&files.length===prior.files.length&&files.every((file,index)=>file===prior.files[index]))return prior.delivery;
      const delivery=await prepareAttachments({key,providerId,destination,chatId,messageId:crypto.randomUUID(),mediaTypes,send});
      submissions.set(key,{answer,files,delivery:delivery||{}});return delivery||{};
    },
    clear(){submissions.delete(key);clearAttachments(key);}
  };
}
