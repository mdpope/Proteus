import {createHash} from 'node:crypto';
// Storage accepts original bytes independently of native provider media support.
// Large/unsupported inputs use a bounded reader rather than serializing an
// unbounded string or pretending the model can decode an unknown binary format.
export function providerAttachmentInputs(files,accepted=[],indexOffset=0){
 return files.map((file,index)=>{
  if(accepted.includes(file.mediaType)&&!(file.mediaType==='text/plain'&&file.bytes.length>256*1024))return file;
  let text;
  if(file.bytes.length<=256*1024&&!file.bytes.includes(0))try{text=new TextDecoder('utf-8',{fatal:true}).decode(file.bytes);}catch{}
  return {...file,mediaType:'text/plain',bytes:Buffer.from(text===undefined?`Attached file ${index+indexOffset}: ${file.name}\nOriginal media type: ${file.mediaType}; size: ${file.bytes.length} bytes; SHA-256: ${createHash('sha256').update(file.bytes).digest('hex')}\nUse proteus_attachments list/read to inspect the exact original bytes in bounded pages. Native extraction for this format is not guaranteed.`:text)};
 });
}
export function turnAttachmentTools(adapter,runID){
 if(!adapter.attachmentInputs)return [];
 const captured=adapter.attachmentInputs(runID);
 return [{name:'proteus_attachments',defer:'never',description:'Inspect files explicitly attached to the current user message in this chat. list returns exact metadata. read returns a bounded UTF-8 or base64 byte page; use returned nextOffset until null. Storage does not imply a native extractor for every binary format. Only the current message files are accessible; no filesystem or other-chat scope is granted.',parameters:{type:'object',properties:{action:{type:'string',enum:['list','read']},index:{type:'integer',minimum:0},offset:{type:'integer',minimum:0},encoding:{type:'string',enum:['utf8','base64']}},required:['action'],additionalProperties:false},handler:async args=>{
  const files=adapter.attachmentInputs(runID);if(!files||files!==captured)throw Error('This attachment turn has ended.');
  if(args.action==='list')return JSON.stringify({files:files.map((file,index)=>({index,name:file.name,mediaType:file.mediaType,size:file.bytes.length,sha256:createHash('sha256').update(file.bytes).digest('hex')}))});
  const file=files[args.index],offset=args.offset??0;if(!file||!Number.isSafeInteger(offset)||offset<0||offset>file.bytes.length)throw Error('Choose a current attachment index and valid byte offset.');
  let end=Math.min(file.bytes.length,offset+32768),text;
  if(args.encoding!=='base64'){
   // Do not split UTF-8 code points between successive byte pages.
   while(end<file.bytes.length&&(file.bytes[end]&0xc0)===0x80)end--;
   try{text=new TextDecoder('utf-8',{fatal:true}).decode(file.bytes.subarray(offset,end));}catch{throw Error('This byte page is binary or starts inside a UTF-8 character. Read as base64 or use a returned byte offset.');}
  }
  return JSON.stringify({index:args.index,name:file.name,mediaType:file.mediaType,offset,nextOffset:end<file.bytes.length?end:null,encoding:args.encoding==='base64'?'base64':'utf8',content:args.encoding==='base64'?file.bytes.subarray(offset,end).toString('base64'):text});
 }}];
}
