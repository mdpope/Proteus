import fs from 'node:fs';
import path from 'node:path';
import {isWithin} from '../../shared/files.js';
import {readMarkdownFile,fileDates,assertSameFileSnapshot,fileIdentity} from '../../shared/file-metadata.js';
import {classifyBytes,decodeText,languageForName,languageForContent} from '../../shared/file-kind.js';

export const TEXT_PREVIEW_LIMIT=2*1024*1024;
// Any text-like file opens; a name is only a hint. The leading bytes decide whether
// the file is text (and in which encoding), so extensionless files, dotfiles and
// renamed documents work while genuine binaries are refused with their detected type.
function readTextPreview(file){
 const canonical=fs.realpathSync(file),fd=fs.openSync(canonical,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW||0));
 try{
  const before=fs.fstatSync(fd);if(!before.isFile())throw Error('Choose a file.');
  if(before.size>TEXT_PREVIEW_LIMIT)throw Error('Text preview limit is 2 MB.');
  const buffer=Buffer.alloc(before.size);let size=0,count;
  while(size<buffer.length&&(count=fs.readSync(fd,buffer,size,buffer.length-size,null)))size+=count;
  const bytes=buffer.subarray(0,size),kind=classifyBytes(bytes.subarray(0,8192),{complete:size<=8192});
  if(!kind.text)throw Error('This looks like a binary file ('+kind.type+') and cannot be shown as text.');
  if(classifyBytes(bytes,{complete:true}).text===false)throw Error('This looks like a binary file and cannot be shown as text.');
  assertSameFileSnapshot(before,fs.fstatSync(fd));
  const content=decodeText(bytes,kind.encoding),name=path.basename(file);
  return {file,mediaType:'text/plain',language:languageForName(name)||languageForContent(content)||'text',encoding:kind.encoding,editable:kind.encoding==='utf-8',title:name,content,size,identity:fileIdentity(before),...fileDates(before)};
 }finally{fs.closeSync(fd);}
}
export function readFilePreview(file,roots){
 if(typeof file!=='string'||!isWithin(file,roots))throw Error('Choose a file in a currently configured workspace.');
 if(/\.(md|markdown)$/i.test(file))return {...readMarkdownFile(file),mediaType:'text/markdown',language:'markdown',editable:true};
 if(/\.pdf$/i.test(file)){const stat=fs.statSync(file);if(!stat.isFile()||stat.size>32*1024*1024)throw Error('PDF limit is 32 MB.');return {file,mediaType:'application/pdf',title:path.basename(file),content:'',...fileDates(stat)};}
  if(!/\.(png|jpe?g|gif|webp)$/i.test(file))return readTextPreview(file);
 const real=fs.realpathSync(file),fd=fs.openSync(real,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW||0));
 try{
  const stat=fs.fstatSync(fd);if(!stat.isFile()||stat.size>4_000_000)throw Error('Choose an image no larger than 4 MB.');
  const buffer=Buffer.alloc(stat.size+1);let size=0,n;while(size<buffer.length&&(n=fs.readSync(fd,buffer,size,buffer.length-size,null)))size+=n;
  assertSameFileSnapshot(stat,fs.fstatSync(fd));assertSameFileSnapshot(stat,fs.statSync(real));
  if(fs.realpathSync(file)!==real||!isWithin(real,roots))throw Error('File location changed.');
  const bytes=buffer.subarray(0,size);
  const mediaType=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'image/png':bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'image/jpeg':/^GIF8[79]a/.test(bytes.subarray(0,6).toString())?'image/gif':bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP'?'image/webp':null;
  if(!mediaType)throw Error('This file is not a supported raster image.');
  return {file,mediaType,size,title:path.basename(file),content:'',dataURL:'data:'+mediaType+';base64,'+bytes.toString('base64'),...fileDates(stat)};
 }finally{fs.closeSync(fd);}
}
