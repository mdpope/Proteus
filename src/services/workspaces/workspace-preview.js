import fs from 'node:fs';
import path from 'node:path';
import {isWithin} from '../../shared/files.js';
import {readMarkdownFile,fileDates,assertSameFileSnapshot} from '../../shared/file-metadata.js';
export function readFilePreview(file,roots){
 if(typeof file!=='string'||!isWithin(file,roots))throw Error('Choose a file in a currently configured workspace.');
 if(/\.md$/i.test(file))return {...readMarkdownFile(file),mediaType:'text/markdown'};
 if(/\.pdf$/i.test(file)){const stat=fs.statSync(file);if(!stat.isFile()||stat.size>32*1024*1024)throw Error('PDF limit is 32 MB.');return {file,mediaType:'application/pdf',title:path.basename(file),content:'',...fileDates(stat)};}
 if(/\.(txt|json|js|ts|py|swift|css|html|sh|c|cpp|rs|go)$/i.test(file)){const stat=fs.statSync(file);if(stat.size>1_000_000)throw Error('Text preview limit is 1 MB.');return {file,mediaType:'text/plain',title:path.basename(file),content:fs.readFileSync(file,'utf8'),...fileDates(stat)};}
 if(!/\.(png|jpe?g|gif|webp)$/i.test(file))throw Error('Preview supports Markdown, PNG, JPEG, GIF and WebP.');
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
