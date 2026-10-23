// The same validated content shapes serve initial input and active-turn steering.
export function attachmentText(item,provider){
 let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(item.bytes);}catch{throw Error(`${provider} requires UTF-8 plain text attachments.`);}
 if(text.includes('\0'))throw Error(`${provider} cannot receive binary content as plain text.`);
 return `Attached plain text file: ${item.name}\n\n${text}`;
}
export function claudeMessageContent(prompt,attachments,accepted){
 if(!attachments.length)return prompt;
 const content=[{type:'text',text:prompt}];
 for(const item of attachments){
  if(!accepted.includes(item.mediaType)||!Buffer.isBuffer(item.bytes)||item.bytes.length>8*1024*1024)throw Error('Claude can receive images and UTF-8 plain text here. PDF and other files are not supported.');
  content.push(item.mediaType==='text/plain'?{type:'text',text:attachmentText(item,'Claude')}:{type:'image',source:{type:'base64',media_type:item.mediaType,data:item.bytes.toString('base64')}});
 }
 return content;
}
export function copilotMessageAttachments(attachments,accepted){return attachments.map(item=>{
 if(!accepted.includes(item.mediaType)||!Buffer.isBuffer(item.bytes))throw Error('Copilot cannot receive this attachment type. Choose a supported image, PDF, or plain text file.');
 return {type:'blob',data:item.bytes.toString('base64'),mimeType:item.mediaType,displayName:item.name};
});}
