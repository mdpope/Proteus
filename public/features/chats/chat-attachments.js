import {textAttachmentReason,htmlToMarkdown,insertTextAtSelection} from './clipboard-input.js';
import {bindScreenshotDrop} from '../../shared/ui/screenshot-drop.js';
import {imageViewport,imageZoomView} from '../../shared/ui/content-zoom.js';
const selections=new Map(),sentPreviews=new Map();
// N11-18: no file type or size limits. Files are hashed and uploaded in slices so even very large
// files never need to fit in renderer memory; the owner checks its own free disk space.
const MAX_BATCH_FILES=256,CHUNK_BYTES=256*1024,HASH_SLICE_BYTES=4*1024*1024;
// Incremental SHA-256 (WebCrypto has no streaming digest).
const K=new Uint32Array([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
export function createSha256(){
  const h=new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]),w=new Uint32Array(64),block=new Uint8Array(64);let used=0,length=0;
  const compress=bytes=>{for(let i=0;i<16;i++)w[i]=bytes[i*4]<<24|bytes[i*4+1]<<16|bytes[i*4+2]<<8|bytes[i*4+3];
    for(let i=16;i<64;i++){const a=w[i-15],b=w[i-2];w[i]=((a>>>7|a<<25)^(a>>>18|a<<14)^a>>>3)+w[i-7]+((b>>>17|b<<15)^(b>>>19|b<<13)^b>>>10)+w[i-16]|0;}
    let [a,b,c,d,e,f,g,k]=h;for(let i=0;i<64;i++){const t1=k+((e>>>6|e<<26)^(e>>>11|e<<21)^(e>>>25|e<<7))+(e&f^~e&g)+K[i]+w[i]|0,t2=((a>>>2|a<<30)^(a>>>13|a<<19)^(a>>>22|a<<10))+(a&b^a&c^b&c)|0;k=g;g=f;f=e;e=d+t1|0;d=c;c=b;b=a;a=t1+t2|0;}
    h[0]+=a;h[1]+=b;h[2]+=c;h[3]+=d;h[4]+=e;h[5]+=f;h[6]+=g;h[7]+=k;};
  return {update(bytes){length+=bytes.length;let offset=0;if(used){const take=Math.min(64-used,bytes.length);block.set(bytes.subarray(0,take),used);used+=take;offset=take;if(used<64)return;compress(block);used=0;}
      for(;offset+64<=bytes.length;offset+=64)compress(bytes.subarray(offset,offset+64));block.set(bytes.subarray(offset),0);used=bytes.length-offset;},
    hex(){const bits=length*8;block[used++]=0x80;if(used>56){block.fill(0,used);compress(block);used=0;}block.fill(0,used,56);const view=new DataView(block.buffer);view.setUint32(56,Math.floor(bits/2**32));view.setUint32(60,bits>>>0);compress(block);return [...h].map(value=>(value>>>0).toString(16).padStart(8,'0')).join('');}};
}
export async function sha256File(file){const hash=createSha256();for(let offset=0;offset<file.size;offset+=HASH_SLICE_BYTES)hash.update(new Uint8Array(await file.slice(offset,offset+HASH_SLICE_BYTES).arrayBuffer()));return hash.hex();}
export async function uploadFileChunks(file,chunkBytes,sendChunk){for(let offset=0,index=0;offset<file.size;offset+=chunkBytes,index++)await sendChunk(index,base64(new Uint8Array(await file.slice(offset,offset+chunkBytes).arrayBuffer())));}
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const providerName=id=>({copilot:'Copilot',codex:'Codex',claude:'Claude'}[id]||id);
const sizeLabel=size=>size>=1024*1024?(size/1024/1024).toFixed(1)+' MB':Math.ceil(size/1024)+' KB';
function preview(file){if(!['image/png','image/jpeg','image/gif','image/webp'].includes(file.type))return null;return URL.createObjectURL(file);}
function closePreview(){document.querySelector('#attachment-image-preview')?.close();document.querySelector('#attachment-image-preview')?.remove();}
function showPreview(attachments,item){
  closePreview();
  const items=attachments.filter(entry=>entry.url);
  let index=items.indexOf(item);
  if(index<0)return;
  const dialog=document.createElement('dialog');
  dialog.id='attachment-image-preview';dialog.className='attachment-image-preview';
  dialog.innerHTML='<div class="heading"><strong aria-live="polite"></strong><div class="actions"><button data-previous aria-label="Previous attachment">←</button><button data-next aria-label="Next attachment">→</button><button data-close aria-label="Close image preview">×</button></div></div><img alt="">';
  const previous=dialog.querySelector('[data-previous]'),next=dialog.querySelector('[data-next]'),image=dialog.querySelector('img');
  const {viewport,controls,reset}=imageViewport(image);dialog.append(controls,viewport);
  const update=()=>{
    const current=items[index];
    dialog.querySelector('strong').textContent=current.file.name;
    reset();image.alt=current.file.name;image.src=current.url;
    previous.disabled=index===0;next.disabled=index===items.length-1;
  };
  const step=direction=>{if(items[index+direction]){index+=direction;update();}};
  previous.onclick=()=>step(-1);next.onclick=()=>step(1);
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();
  dialog.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();step(event.key==='ArrowLeft'?-1:1);}});
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  document.body.append(dialog);update();dialog.showModal();
}
export function selectedAttachments(key){return selections.get(key)||[];}
export function appendDraftAttachments(key,files,maxFiles=MAX_BATCH_FILES){
  const items=selectedAttachments(key).slice(),available=Math.max(0,maxFiles-items.length);
  const added=files.slice(0,available).map(file=>({file,url:preview(file)}));
  if(added.length){
    selections.set(key,items.concat(added));
    for(const host of document.querySelectorAll('.chat-attachment-picker'))if(host.dataset.attachmentKey===key)host.dispatchEvent(new Event('attachments-restored'));
  }
  return added.length;
}
export function clearAttachments(key){for(const item of selections.get(key)||[])if(item.url)URL.revokeObjectURL(item.url);selections.delete(key);for(const host of globalThis.document?.querySelectorAll('.chat-attachment-picker')||[])if(host.dataset.attachmentKey===key)host.dispatchEvent(new Event('attachments-restored'));}
export function sentAttachmentPreview(messageId,name){return sentPreviews.get(messageId)?.find(item=>item.file.name===name)?.url||null;}
export function openSentAttachmentPreview(messageId,name){const items=sentPreviews.get(messageId)||[],item=items.find(entry=>entry.file.name===name);if(item?.url)showPreview(items,item);}
export function restoreSentAttachments(key,messageId){
  clearAttachments(key);const files=sentPreviews.get(messageId)||[];
  selections.set(key,files.map(item=>({...item,url:preview(item.file)})));
  document.querySelectorAll('.chat-attachment-picker').forEach(host=>{if(host.dataset.attachmentKey===key)host.dispatchEvent(new Event('attachments-restored'));});return files.length;
}
export function mountAttachmentPicker({key,host,textarea,provider,mediaTypes={},notify,onChange=()=>{},maxFiles=MAX_BATCH_FILES}){
  const accepted=()=>provider()?(mediaTypes[provider()]||[]):[...new Set(Object.values(mediaTypes).flat())];
  host.classList.add('chat-attachment-picker');host.dataset.attachmentKey=key;
  const render=()=>{const items=selectedAttachments(key);host.innerHTML=`<div class="attachment-strip">${items.map((item,index)=>`<div class="attachment-chip"><button type="button" data-attach-preview="${index}" ${item.url?'':'disabled'}>${item.url?`<img src="${item.url}" alt="">`:'▤'} <span>${escape(item.file.name)}<small>${sizeLabel(item.file.size)}</small></span></button><button type="button" data-attach-remove="${index}" aria-label="Remove ${escape(item.file.name)}">×</button></div>`).join('')}</div><div class="attachment-controls"><button type="button" class="subtle attachment-add" data-attach-add aria-label="Attach files" title="Attach files" ${provider()?'':'disabled'}><span aria-hidden="true">＋</span></button><input type="file" multiple hidden></div>`;
    const input=host.querySelector('input[type=file]');input.accept='';host.querySelector('[data-attach-add]').onclick=()=>input.click();input.onchange=()=>{add([...input.files]);input.value='';};
    host.querySelectorAll('[data-attach-preview]').forEach(button=>button.onclick=()=>{const item=selectedAttachments(key)[Number(button.dataset.attachPreview)];if(item?.url)showPreview(selectedAttachments(key),item);});
    host.querySelectorAll('[data-attach-remove]').forEach(button=>button.onclick=()=>{const list=selectedAttachments(key),[item]=list.splice(Number(button.dataset.attachRemove),1);if(item?.url)URL.revokeObjectURL(item.url);render();onChange();});
  };
  const add=files=>{if(appendDraftAttachments(key,files,maxFiles)<files.length)notify('This reply accepts up to '+maxFiles+' attachments.');};
  const composer=host.closest('.composer,form');
  const receiveScreenshot=()=>provider()&&!textarea?.disabled?async read=>add([await read()]):null;
  bindScreenshotDrop(composer||host,receiveScreenshot,notify);
  if(!composer&&textarea&&!host.contains(textarea))bindScreenshotDrop(textarea,receiveScreenshot,notify);
  textarea?.addEventListener('paste',event=>{
    const clipboard=event.clipboardData;if(!clipboard)return;
    const files=[...(clipboard.items||[])].filter(item=>item.kind==='file').map(item=>item.getAsFile()).filter(Boolean);
    if(files.length){event.preventDefault();add(files);return;}
    const plain=clipboard.getData('text/plain');
    if(plain&&textAttachmentReason(plain)){event.preventDefault();const before=selectedAttachments(key).length;add([new File([plain],'Pasted text.txt',{type:'text/plain'})]);if(selectedAttachments(key).length>before)insertTextAtSelection(textarea,'[Attached: Pasted text.txt]');return;}
    const html=clipboard.getData('text/html');if(html){const markdown=htmlToMarkdown(html,plain);if(markdown){event.preventDefault();if(textAttachmentReason(markdown))add([new File([markdown],'Pasted text.txt',{type:'text/plain'})]);else insertTextAtSelection(textarea,markdown);}}
  });
  host.addEventListener('attachments-restored',()=>{render();onChange();});render();return {refresh:render,clear:()=>{clearAttachments(key);render();onChange();}};
}
function confirmDelivery(files,destination,providerId){return new Promise(resolve=>{const dialog=document.createElement('dialog');dialog.className='attachment-confirm';dialog.innerHTML=`<h2>Send these files?</h2><p>Destination: <strong>${escape(destination)}</strong><br>AI provider: <strong>${escape(providerName(providerId))}</strong></p><ul>${files.map(item=>`<li>${escape(item.file.name)} · ${escape(item.file.type)} · ${sizeLabel(item.file.size)}</li>`).join('')}</ul><p class="note">Only these selected files will be sent with this message.</p><div class="actions"><button data-cancel>Cancel</button><button class="primary" data-confirm>Confirm Send</button></div>`;document.body.append(dialog);const finish=value=>{dialog.close();dialog.remove();resolve(value);};dialog.querySelector('[data-cancel]').onclick=()=>finish(false);dialog.querySelector('[data-confirm]').onclick=()=>finish(true);dialog.addEventListener('cancel',event=>{event.preventDefault();finish(false);},{once:true});dialog.showModal();});}
function base64(bytes){let binary='';for(let offset=0;offset<bytes.length;offset+=32768)binary+=String.fromCharCode(...bytes.subarray(offset,offset+32768));return btoa(binary);}
export async function prepareAttachments({key,providerId,destination,chatId,draftId,messageId,mediaTypes,send}){
  const items=selectedAttachments(key);if(!items.length)return null;
  if(items.length>MAX_BATCH_FILES)throw new Error('This message has more than '+MAX_BATCH_FILES+' attachments.');

  if(!await confirmDelivery(items,destination,providerId))throw new Error('Attachment send cancelled.');
  const attachments=[];
  for(const item of items){const hash=await sha256File(item.file),scope=chatId?{id:chatId}:{draftId};const begun=await send('begin',{...scope,providerId,messageId,name:item.file.name,mediaType:item.file.type||'application/octet-stream',size:item.file.size,sha256:hash,...(item.file.lastModified?{modifiedAt:new Date(item.file.lastModified).toISOString()}:{}),...(item.file.createdAt?{createdAt:item.file.createdAt}:{})});await uploadFileChunks(item.file,CHUNK_BYTES,(index,dataBase64)=>send('chunk',{uploadId:begun.uploadId,index,dataBase64}));attachments.push(await send('finish',{uploadId:begun.uploadId}));}
  const scope=chatId?{id:chatId}:{draftId},grant=await send('authorize',{...scope,providerId,messageId,attachments});
  sentPreviews.set(messageId,items.map(item=>({...item,url:preview(item.file)})));
  while(sentPreviews.size>8||[...sentPreviews.values()].flat().reduce((total,item)=>total+item.file.size,0)>32*1024*1024){const id=sentPreviews.keys().next().value;for(const item of sentPreviews.get(id))if(item.url)URL.revokeObjectURL(item.url);sentPreviews.delete(id);}
  return {...scope,providerId,messageId,attachments:attachments.map(item=>item.attachmentId),consentId:grant.consentId};
}
export const prepareLocalAttachments=options=>prepareAttachments({...options,send:(action,args)=>options.post('/api/attachments',{action,...args})});
// Files kept with a chat can be opened on every client. Only inert previews are
// shown: images and text (inserted as text, never markup). Everything else is
// offered as a downloaded copy so HTML/SVG/PDF scripts cannot run in Proteus.
const textTypes=/^(text\/|application\/(json|xml|x-yaml|yaml|csv|x-sh|javascript|x-ndjson))/;
export function openStoredAttachment(name,load){return openStoredAttachments([{name}],0,load);}
export async function openStoredAttachments(items,index,load){
  closePreview();items=items.slice();let selected=Math.max(0,Math.min(index,items.length-1)),generation=0,urls=[];
  const dialog=document.createElement('dialog');dialog.id='attachment-image-preview';dialog.className='attachment-image-preview attachment-file-viewer';dialog.tabIndex=-1;
  dialog.innerHTML='<div class="heading"><strong></strong><small class="note" data-file-details></small><span class="actions"><button data-previous aria-label="Previous attachment">‹</button><button data-next aria-label="Next attachment">›</button><a class="button" hidden>Save a copy</a><button data-close aria-label="Close attachment">×</button></span></div><div data-file-content></div>';
  document.body.append(dialog);const previous=dialog.querySelector('[data-previous]'),next=dialog.querySelector('[data-next]'),content=dialog.querySelector('[data-file-content]');
  const release=()=>{urls.forEach(url=>URL.revokeObjectURL(url));urls=[];};
  const show=async()=>{
    const version=++generation,item=items[selected],active=document.activeElement;release();previous.disabled=selected===0;next.disabled=selected===items.length-1;
    if(active===previous&&previous.disabled||active===next&&next.disabled)dialog.focus();
    dialog.querySelector('strong').textContent=item.name||'Attachment';dialog.querySelector('a').hidden=true;content.textContent='Loading…';
    const details=file=>{dialog.querySelector('[data-file-details]').textContent=[file.createdAt&&'Created '+new Date(file.createdAt).toLocaleString(),file.modifiedAt&&'Modified '+new Date(file.modifiedAt).toLocaleString(),Number.isFinite(file.size)&&sizeLabel(file.size)].filter(Boolean).join(' · ');};details(item);
    try{
      const file=await load(item,selected);if(version!==generation||!dialog.isConnected)return;details({...item,...file});
      const type=String(file.mediaType||'').toLowerCase(),url=URL.createObjectURL(new Blob([file.bytes],{type:'application/octet-stream'}));urls.push(url);
      const save=dialog.querySelector('a');save.href=url;save.download=file.name||item.name||'Attachment';save.hidden=false;content.replaceChildren();
      if(['image/png','image/jpeg','image/gif','image/webp'].includes(type)){const image=document.createElement('img');image.alt=item.name||'Attachment';image.src=URL.createObjectURL(new Blob([file.bytes],{type}));urls.push(image.src);content.append(imageZoomView(image));}
      else if(textTypes.test(type)&&file.bytes.byteLength<=2*1024*1024){const pre=document.createElement('pre');pre.className='attachment-text';pre.textContent=new TextDecoder().decode(file.bytes);content.append(pre);}
      else content.textContent=(type||'This file type')+' is not previewed in Proteus. Save a copy to open it with another app.';
    }catch(error){if(version===generation)content.textContent=error.message||'This attachment could not be opened.';}
  };
  const step=direction=>{const target=selected+direction;if(target<0||target>=items.length)return;selected=target;void show();};
  previous.onclick=()=>step(-1);next.onclick=()=>step(1);dialog.querySelector('[data-close]').onclick=()=>dialog.close();
  dialog.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();step(event.key==='ArrowLeft'?-1:1);}});
  let start;dialog.addEventListener('touchstart',event=>{start=event.touches.length===1?{x:event.touches[0].clientX,y:event.touches[0].clientY}:null;},{passive:true});dialog.addEventListener('touchend',event=>{if(!start||!event.changedTouches[0])return;const dx=event.changedTouches[0].clientX-start.x,dy=event.changedTouches[0].clientY-start.y;start=null;if(Math.abs(dx)>80&&Math.abs(dx)>Math.abs(dy)*2)step(dx<0?1:-1);},{passive:true});
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});dialog.addEventListener('close',()=>{generation++;release();dialog.remove();},{once:true});dialog.showModal();await show();
}
/** Chunked reader for a remote owner's `chat.attachments.get`. */
export async function readRemoteAttachment(request,chatId,sha256){
  const parts=[];let offset=0,meta=null;
  for(let guard=0;guard<200;guard++){const page=await request('chat.attachments.get',{id:chatId,sha256,offset});meta??=page;const bytes=Uint8Array.from(atob(page.dataBase64||''),c=>c.charCodeAt(0));parts.push(bytes);offset+=bytes.length;if(page.done||!bytes.length)break;}
  const total=new Uint8Array(offset);let at=0;for(const part of parts){total.set(part,at);at+=part.length;}
  return {bytes:total,name:meta?.name,mediaType:meta?.mediaType,size:meta?.size,createdAt:meta?.createdAt,modifiedAt:meta?.modifiedAt};
}
export async function readLocalAttachment(chatId,sha256){
  const response=await fetch('/api/chat-attachment?chatId='+encodeURIComponent(chatId)+'&sha256='+encodeURIComponent(sha256));
  if(!response.ok){let message=response.statusText;try{message=(await response.json()).error||message;}catch{}throw new Error(message);}
  return {bytes:new Uint8Array(await response.arrayBuffer()),name:decodeURIComponent(response.headers.get('X-Proteus-File-Name')||''),mediaType:response.headers.get('X-Proteus-Media-Type')||'',size:Number(response.headers.get('Content-Length')),createdAt:response.headers.get('X-Proteus-File-Created')||undefined,modifiedAt:response.headers.get('X-Proteus-File-Modified')||undefined};
}
