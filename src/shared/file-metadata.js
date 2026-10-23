import fs from 'node:fs';
export function fileDates(stat){
 const iso=value=>Number.isFinite(value)&&value>0?new Date(value).toISOString():null;
 return {fileCreatedAt:iso(stat.birthtimeMs),fileModifiedAt:iso(stat.mtimeMs)};
}
export function assertSameFileSnapshot(before,after){
 if(before.dev!==after.dev||before.ino!==after.ino||before.size!==after.size||before.mtimeMs!==after.mtimeMs||before.ctimeMs!==after.ctimeMs)throw Error('Document changed while reading. Refresh to read the current version.');
}
export function readMarkdownFile(file){
 const canonical=fs.realpathSync(file),fd=fs.openSync(canonical,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW||0));
 try{
  const before=fs.fstatSync(fd);if(!before.isFile()||before.size>1_000_000)throw Error('Choose a Markdown file no larger than 1 MB.');
  const buffer=Buffer.alloc(1_000_001);let size=0,read;
  while(size<buffer.length&&(read=fs.readSync(fd,buffer,size,buffer.length-size,null)))size+=read;
  if(size>1_000_000)throw Error('Markdown file is too large.');
  assertSameFileSnapshot(before,fs.fstatSync(fd));
  if(fs.realpathSync(file)!==canonical)throw Error('Document path changed. Refresh to read again.');
  assertSameFileSnapshot(before,fs.statSync(canonical));
  return {file,content:buffer.subarray(0,size).toString('utf8'),...fileDates(before)};
 }finally{fs.closeSync(fd);}
}
