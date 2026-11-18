import {createHash} from 'node:crypto';
// Storage accepts original bytes independently of native provider media support.
// Large/unsupported inputs use a bounded reader rather than serializing an
// unbounded string or pretending the model can decode an unknown binary format.
// N11-18: attachments have no size or type limit. A file goes inline only when the provider
// accepts its type and it fits the provider's inline budget; otherwise the model receives a
// short reference and reads the exact bytes in pages with proteus_attachments. Large files are
// never loaded into memory here (size/sha256 come from verified metadata).
const INLINE_TEXT_BYTES=256*1024,INLINE_IMAGE_BYTES=5*1024*1024,INLINE_DOCUMENT_BYTES=20*1024*1024;
const inlineBudget=mediaType=>mediaType==='text/plain'?INLINE_TEXT_BYTES:mediaType.startsWith('image/')?INLINE_IMAGE_BYTES:INLINE_DOCUMENT_BYTES;
const sizeOf=file=>Number.isSafeInteger(file.size)?file.size:file.bytes.length;
const digestOf=file=>/^[a-f0-9]{64}$/.test(file.sha256||'')?file.sha256:createHash('sha256').update(file.bytes).digest('hex');
export const attachmentMetadata=(files)=>files.map((file,index)=>({index,name:file.name,mediaType:file.mediaType,size:sizeOf(file),sha256:digestOf(file)}));
export function readAttachmentPage(files,args){
 const file=files[args.index],offset=args.offset??0,size=file?sizeOf(file):0;
 if(!file||!Number.isSafeInteger(offset)||offset<0||offset>size)throw Error('Choose a current attachment index and valid byte offset.');
 const page=typeof file.readRange==='function'?file.readRange(offset,32768+4):file.bytes.subarray(offset,offset+32768+4),pageEnd=offset+page.length;
 let end=Math.min(size,offset+32768),text;
 if(args.encoding!=='base64'){
  // Do not split UTF-8 code points between successive byte pages.
  while(end<size&&end<pageEnd&&(page[end-offset]&0xc0)===0x80)end--;
  try{text=new TextDecoder('utf-8',{fatal:true}).decode(page.subarray(0,end-offset));}catch{throw Error('This byte page is binary or starts inside a UTF-8 character. Read as base64 or use a returned byte offset.');}
 }
 return {index:args.index,name:file.name,mediaType:file.mediaType,offset,nextOffset:end<size?end:null,encoding:args.encoding==='base64'?'base64':'utf8',content:args.encoding==='base64'?page.subarray(0,end-offset).toString('base64'):text};
}
export function providerAttachmentInputs(files,accepted=[],indexOffset=0){
 return files.map((file,index)=>{
  const size=sizeOf(file);
  if(accepted.includes(file.mediaType)&&size<=inlineBudget(file.mediaType))return file;
  let text;
  if(size<=INLINE_TEXT_BYTES){const bytes=file.bytes;if(!bytes.includes(0))try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{}}
  const reference=`Attached file ${index+indexOffset}: ${file.name}\nOriginal media type: ${file.mediaType}; size: ${size} bytes; SHA-256: ${digestOf(file)}\nUse proteus_attachments list/read to inspect the exact original bytes in bounded pages. Native extraction for this format is not guaranteed.`;
  return {name:file.name,mediaType:'text/plain',size:undefined,bytes:Buffer.from(text===undefined?reference:text),...(file.createdAt?{createdAt:file.createdAt}:{}),...(file.modifiedAt?{modifiedAt:file.modifiedAt}:{})};
 });
}
export function turnAttachmentTools(adapter,runID){
 if(!adapter.attachmentInputs)return [];
 const captured=adapter.attachmentInputs(runID);
 return [{name:'proteus_attachments',defer:'never',description:'Inspect files explicitly attached to the current user message in this chat. list returns exact metadata. read returns a bounded UTF-8 or base64 byte page; use returned nextOffset until null. Storage does not imply a native extractor for every binary format. Only the current message files are accessible; no filesystem or other-chat scope is granted.',parameters:{type:'object',properties:{action:{type:'string',enum:['list','read']},index:{type:'integer',minimum:0},offset:{type:'integer',minimum:0},encoding:{type:'string',enum:['utf8','base64']}},required:['action'],additionalProperties:false},handler:async args=>{
  const files=adapter.attachmentInputs(runID);if(!files||files!==captured)throw Error('This attachment turn has ended.');
  if(args.action==='list')return JSON.stringify({files:attachmentMetadata(files)});
  return JSON.stringify(readAttachmentPage(files,args));
 }}];
}
