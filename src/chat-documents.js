import fs from 'node:fs';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { TextDecoder } from 'node:util';
import { parser, linkKind } from './markdown-parser.js';
import { documentReferences, resolveDocumentReference, readRaster, MAX_RASTER_COUNT, MAX_RASTER_TOTAL } from './chat-document-assets.js';

const markdown=parser();
const MAX_BYTES=1_000_000;
const TTL_MS=10*60_000;
const within=(file,root)=>{const relative=path.relative(root,file);return relative===''||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative));};
function linkedSources(run){
  const sources=new Set();
  const visit=tokens=>{for(const token of tokens){if(token.type==='link_open'){const source=token.attrGet('href');if(typeof source==='string'&&source.length<=4096&&linkKind(source)==='file'&&/(?:\.md|\.html?)(?:$|[?#])/i.test(source))sources.add(source);}if(token.children)visit(token.children);if(sources.size>=200)return;}};
  let budget=4_000_000;
  for(const event of (run.events||[]).slice(-2000).reverse()){
    if(event.role!=='assistant'||typeof event.text!=='string')continue;
    const text=event.text.slice(0,Math.min(1_000_000,budget));budget-=text.length;
    visit(markdown.parse(text,{}));
    if(budget<=0||sources.size>=200)break;
  }
  return [...sources];
}
const stableId=(run,file)=>createHash('sha256').update(run.id+'\0'+file).digest('hex');
const publicAssets=items=>items.map(({assetId,source,mediaType,size,version})=>({assetId,source,mediaType,size,version}));
function snapshot(run,source,currentRoots,verifiedLink=false){
  if(!verifiedLink&&!linkedSources(run).includes(source))throw new Error('This document is not linked in the chat.');
  const cwd=run.schedule?.workspace?.cwd;
  const roots=[cwd,...(run.schedule?.workspace?.additionalDirectories||[])].filter(Boolean).map(root=>fs.realpathSync(root));
  const authorized=(currentRoots?.(run)||roots).filter(Boolean).map(root=>fs.realpathSync(root));
  const requested=/^file:\/\/\//i.test(source)?fileURLToPath(source):path.resolve(cwd,decodeURIComponent(source.split(/[?#]/,1)[0]));
  const file=fs.realpathSync(requested);
  if(!roots.some(root=>within(file,root))||!authorized.some(root=>within(file,root))||!/(?:\.md|\.html?)$/i.test(file))throw new Error('Document is outside a currently authorized chat workspace.');
  const handle=fs.openSync(file,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW||0));
  try{
    const stat=fs.fstatSync(handle),current=fs.statSync(file),resolvedAgain=fs.realpathSync(requested);
    if(resolvedAgain!==file||stat.dev!==current.dev||stat.ino!==current.ino)throw new Error('Document path changed. Request it again.');
    if(!stat.isFile()||stat.size>MAX_BYTES)throw new Error('Choose a linked Markdown or HTML document no larger than 1 MB.');
    const buffer=Buffer.alloc(MAX_BYTES+1);let size=0,read;
    while(size<buffer.length&&(read=fs.readSync(handle,buffer,size,buffer.length-size,null)))size+=read;
    if(size>MAX_BYTES)throw new Error('Document is larger than 1 MB.');
    let content;try{content=new TextDecoder('utf-8',{fatal:true}).decode(buffer.subarray(0,size));}catch{throw new Error('Document must contain valid UTF-8 text.');}if(content.includes('\0'))throw new Error('Document contains binary data.');
    const mediaType=/\.md$/i.test(file)?'text/markdown':'text/html';
    const references=documentReferences(content,mediaType),assets=[],links=[];
    let total=0;
    for(const relativeSource of references.images){
      if(/^[a-z][a-z0-9+.-]*:/i.test(relativeSource)||relativeSource.startsWith('//'))continue; // External resources are blocked by viewers, never granted.
      if(assets.length>=MAX_RASTER_COUNT)throw new Error('A document can include at most eight approved raster images.');
      const image=readRaster(file,relativeSource,authorized);
      if(!roots.some(root=>within(image.file,root)))throw new Error('Document image is outside the chat workspace.');
      total+=image.size;if(total>MAX_RASTER_TOTAL)throw new Error('Approved document images exceed 2 MiB total.');
      assets.push({assetId:createHash('sha256').update(file+'\0'+relativeSource).digest('hex'),source:relativeSource,mediaType:image.mediaType,size:image.size,version:image.version,file:image.file});
    }
    for(const relativeSource of references.documents){
      if(/^[a-z][a-z0-9+.-]*:/i.test(relativeSource)||relativeSource.startsWith('//'))continue;
      const target=resolveDocumentReference(file,relativeSource,authorized);
      if(!roots.some(root=>within(target,root))||!/(?:\.md|\.html?)$/i.test(target))throw new Error('Linked document is outside the chat workspace or has an unsupported type.');
      links.push({source:relativeSource,documentId:stableId(run,target),title:path.basename(target)});
    }
    const documentHash=createHash('sha256').update(buffer.subarray(0,size)).digest('hex');
    const version=createHash('sha256').update(documentHash+'\0'+assets.map(asset=>asset.source+'\0'+asset.file+'\0'+asset.version).join('\0')+'\0'+links.map(link=>link.source+'\0'+link.documentId).join('\0')).digest('hex');
    return {file,documentId:stableId(run,file),title:path.basename(file),size,mediaType,version,content,assets,links};
  }finally{fs.closeSync(handle);}
}
export class ChatDocumentApprovals {
  constructor({currentRoots}={}){this.requests=new Map();this.currentRoots=currentRoots;}
  revokeDevice(deviceId){for(const [id,item] of this.requests)if(item.deviceId===deviceId)this.requests.delete(id);}
  revokeChat(chatId){for(const [id,item] of this.requests)if(item.chatId===chatId)this.requests.delete(id);}
  clear(){this.requests.clear();}
  prune(){for(const [id,item] of this.requests)if(item.expiresAt<=Date.now())this.requests.delete(id);}
  request(run,device,source,documentId,fromRequestId,relativePath){
    this.prune();if(this.requests.size>=50)throw new Error('Too many document requests. Review pending requests on the Mac.');
    if([source!==undefined,documentId!==undefined,fromRequestId!==undefined].filter(Boolean).length!==1)throw new Error('Choose one linked source, document ID or approved parent request.');
    let doc,verifiedLink=false;
    if(fromRequestId!==undefined){
      const parent=this.requests.get(fromRequestId);
      if(!parent||!parent.approvedAt||parent.deviceId!==device.id||parent.chatId!==run.id||typeof relativePath!=='string')throw new Error('Open and approve the parent document before following its relative link.');
      const current=snapshot(run,parent.source,this.currentRoots,parent.verifiedLink);
      if(current.version!==parent.version||current.file!==parent.file)throw new Error('The parent document or one of its images changed. Request its current version again.');
      const link=current.links.find(item=>item.source===relativePath);
      if(!link)throw new Error('That relative document is not linked in the approved source.');
      source=pathToFileURL(resolveDocumentReference(current.file,relativePath,[path.dirname(current.file)])).href;
      doc=snapshot(run,source,this.currentRoots,true);verifiedLink=true;
      if(doc.documentId!==link.documentId)throw new Error('The relative document target changed.');
    }else if(documentId!==undefined){
      if(typeof documentId!=='string'||!/^[0-9a-f]{64}$/.test(documentId))throw new Error('Invalid document ID.');
      for(const linked of linkedSources(run)){try{const candidate=snapshot(run,linked,this.currentRoots,true);if(candidate.documentId===documentId){source=linked;doc=candidate;break;}}catch{/* An unavailable link does not authorize another file. */}}
      if(!doc)throw new Error('This linked document is no longer available in a currently authorized workspace.');
    }else doc=snapshot(run,source,this.currentRoots);
    const requestId=randomUUID(),expiresAt=Date.now()+TTL_MS;
    this.requests.set(requestId,{requestId,documentId:doc.documentId,deviceId:device.id,deviceName:device.name,chatId:run.id,source,verifiedLink,file:doc.file,title:doc.title,size:doc.size,mediaType:doc.mediaType,version:doc.version,assets:publicAssets(doc.assets),links:doc.links,expiresAt,approvedAt:null});
    return {documentId:doc.documentId,requestId,status:'pending',expiresAt:new Date(expiresAt).toISOString(),title:doc.title,version:doc.version,size:doc.size,mediaType:doc.mediaType,assets:publicAssets(doc.assets),links:doc.links};
  }
  list(){this.prune();return [...this.requests.values()].map(item=>({requestId:item.requestId,documentId:item.documentId,deviceId:item.deviceId,deviceName:item.deviceName,chatId:item.chatId,path:item.file,title:item.title,size:item.size,mediaType:item.mediaType,version:item.version,assets:item.assets,links:item.links,expiresAt:new Date(item.expiresAt).toISOString(),approvedAt:item.approvedAt}));}
  review(requestId,approved,engine){
    this.prune();const item=this.requests.get(requestId);if(!item)throw new Error('Document request expired or unavailable.');
    if(approved!==true){this.requests.delete(requestId);return {requestId,status:'denied'};}
    const run=engine.getRun(item.chatId),current=snapshot(run,item.source,this.currentRoots,item.verifiedLink);
    if(current.file!==item.file||current.documentId!==item.documentId||current.version!==item.version)throw new Error('This document changed. Ask the device to request the new version.');
    item.approvedAt=new Date().toISOString();return {requestId,status:'approved'};
  }
  status(requestId,deviceId){this.prune();const item=this.requests.get(requestId);if(!item||item.deviceId!==deviceId)throw new Error('Document request expired or unavailable.');return {requestId,status:item.approvedAt?'approved':'pending',expiresAt:new Date(item.expiresAt).toISOString()};}
  read(requestId,deviceId,engine){
    this.prune();const item=this.requests.get(requestId);if(!item||item.deviceId!==deviceId||!item.approvedAt)throw new Error('This document has not been approved on the Mac.');
    const run=engine.getRun(item.chatId),current=snapshot(run,item.source,this.currentRoots,item.verifiedLink);
    if(current.file!==item.file||current.documentId!==item.documentId||current.version!==item.version)throw new Error('This document changed. Ask the Mac to approve the new version.');
    return {requestId,documentId:item.documentId,title:item.title,version:item.version,size:item.size,mediaType:item.mediaType,content:current.content,assets:publicAssets(current.assets),links:current.links,readAt:new Date().toISOString()};
  }
  asset(requestId,assetId,deviceId,engine){
    this.prune();const item=this.requests.get(requestId);
    if(!item||item.deviceId!==deviceId||!item.approvedAt)throw new Error('This document asset has not been approved on the Mac.');
    if(typeof assetId!=='string'||!/^[0-9a-f]{64}$/.test(assetId))throw new Error('Invalid document asset ID.');
    const run=engine.getRun(item.chatId),current=snapshot(run,item.source,this.currentRoots,item.verifiedLink);
    if(current.file!==item.file||current.version!==item.version)throw new Error('The document or an approved image changed. Request a new approval.');
    const image=current.assets.find(asset=>asset.assetId===assetId);
    if(!image)throw new Error('This image is not in the approved document manifest.');
    const raster=readRaster(current.file,image.source,[path.dirname(current.file)]);
    if(raster.version!==image.version||raster.file!==image.file)throw new Error('The approved image changed. Request a new approval.');
    return {requestId,assetId,documentId:item.documentId,version:item.version,source:image.source,mediaType:image.mediaType,size:image.size,sha256:image.version,dataBase64:raster.bytes.toString('base64')};
  }
}
