import {textAttachmentReason,htmlToMarkdown,insertTextAtSelection} from './clipboard-input.js';
const selections=new Map(),sentPreviews=new Map();
const MAX_BYTES=8*1024*1024,MAX_BATCH_BYTES=32*1024*1024,MAX_BATCH_FILES=256,CHUNK_BYTES=256*1024;
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const providerName=id=>({copilot:'Copilot',codex:'Codex',claude:'Claude'}[id]||id);
const sizeLabel=size=>size>=1024*1024?(size/1024/1024).toFixed(1)+' MB':Math.ceil(size/1024)+' KB';
function preview(file){if(!['image/png','image/jpeg','image/gif','image/webp'].includes(file.type))return null;return URL.createObjectURL(file);}
function closePreview(){document.querySelector('#attachment-image-preview')?.close();document.querySelector('#attachment-image-preview')?.remove();}
function showPreview(item){closePreview();const dialog=document.createElement('dialog');dialog.id='attachment-image-preview';dialog.className='attachment-image-preview';dialog.innerHTML=`<div class="heading"><strong>${escape(item.file.name)}</strong><button aria-label="Close image preview">×</button></div><img alt="${escape(item.file.name)}" src="${item.url}">`;document.body.append(dialog);dialog.querySelector('button').onclick=()=>dialog.close();dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();}
export function selectedAttachments(key){return selections.get(key)||[];}
export function clearAttachments(key){for(const item of selections.get(key)||[])if(item.url)URL.revokeObjectURL(item.url);selections.delete(key);for(const host of globalThis.document?.querySelectorAll('.chat-attachment-picker')||[])if(host.dataset.attachmentKey===key)host.dispatchEvent(new Event('attachments-restored'));}
export function sentAttachmentPreview(messageId,name){return sentPreviews.get(messageId)?.find(item=>item.file.name===name)?.url||null;}
export function openSentAttachmentPreview(messageId,name){const item=sentPreviews.get(messageId)?.find(entry=>entry.file.name===name);if(item?.url)showPreview(item);}
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
    host.querySelectorAll('[data-attach-preview]').forEach(button=>button.onclick=()=>{const item=selectedAttachments(key)[Number(button.dataset.attachPreview)];if(item?.url)showPreview(item);});
    host.querySelectorAll('[data-attach-remove]').forEach(button=>button.onclick=()=>{const list=selectedAttachments(key),[item]=list.splice(Number(button.dataset.attachRemove),1);if(item?.url)URL.revokeObjectURL(item.url);render();onChange();});
  };
  const add=files=>{const items=selectedAttachments(key).slice();for(const file of files){if(items.length>=maxFiles){notify('This reply accepts up to '+maxFiles+' attachments.');break;}if(!file.size||file.size>MAX_BYTES){notify('Each attachment must be 8 MB or smaller.');continue;}if(items.reduce((total,item)=>total+item.file.size,0)+file.size>MAX_BATCH_BYTES){notify('This message exceeds the attachment batch size.');break;}items.push({file,url:preview(file)});}selections.set(key,items);render();onChange();};
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
async function sha256(bytes){const digest=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');}
function base64(bytes){let binary='';for(let offset=0;offset<bytes.length;offset+=32768)binary+=String.fromCharCode(...bytes.subarray(offset,offset+32768));return btoa(binary);}
export async function prepareAttachments({key,providerId,destination,chatId,draftId,messageId,mediaTypes,send}){
  const items=selectedAttachments(key);if(!items.length)return null;
  if(items.length>MAX_BATCH_FILES||items.reduce((total,item)=>total+item.file.size,0)>MAX_BATCH_BYTES)throw new Error('This message exceeds the attachment batch limit.');

  if(!await confirmDelivery(items,destination,providerId))throw new Error('Attachment send cancelled.');
  const attachments=[];
  for(const item of items){const bytes=new Uint8Array(await item.file.arrayBuffer()),hash=await sha256(bytes),scope=chatId?{id:chatId}:{draftId};const begun=await send('begin',{...scope,providerId,messageId,name:item.file.name,mediaType:item.file.type||'application/octet-stream',size:bytes.length,sha256:hash});for(let offset=0,index=0;offset<bytes.length;offset+=CHUNK_BYTES,index++)await send('chunk',{uploadId:begun.uploadId,index,dataBase64:base64(bytes.subarray(offset,offset+CHUNK_BYTES))});attachments.push(await send('finish',{uploadId:begun.uploadId}));}
  const scope=chatId?{id:chatId}:{draftId},grant=await send('authorize',{...scope,providerId,messageId,attachments});
  sentPreviews.set(messageId,items.map(item=>({...item,url:preview(item.file)})));
  while(sentPreviews.size>8||[...sentPreviews.values()].flat().reduce((total,item)=>total+item.file.size,0)>MAX_BATCH_BYTES){const id=sentPreviews.keys().next().value;for(const item of sentPreviews.get(id))if(item.url)URL.revokeObjectURL(item.url);sentPreviews.delete(id);}
  return {...scope,providerId,messageId,attachments:attachments.map(item=>item.attachmentId),consentId:grant.consentId};
}
export const prepareLocalAttachments=options=>prepareAttachments({...options,send:(action,args)=>options.post('/api/attachments',{action,...args})});
// Files kept with a chat can be opened on every client. Only inert previews are
// shown: images and text (inserted as text, never markup). Everything else is
// offered as a downloaded copy so HTML/SVG/PDF scripts cannot run in Proteus.
const textTypes=/^(text\/|application\/(json|xml|x-yaml|yaml|csv|x-sh|javascript|x-ndjson))/;
export async function openStoredAttachment(name,load){
  closePreview();const dialog=document.createElement('dialog');dialog.id='attachment-image-preview';dialog.className='attachment-image-preview attachment-file-viewer';
  dialog.innerHTML=`<div class="heading"><strong></strong><span class="actions"><a class="button" hidden>Save a copy</a><button aria-label="Close attachment">×</button></span></div><p class="note" role="status">Loading…</p>`;
  dialog.querySelector('strong').textContent=name;document.body.append(dialog);
  dialog.querySelector('button').onclick=()=>dialog.close();dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  let url;dialog.addEventListener('close',()=>{dialog.remove();if(url)URL.revokeObjectURL(url);},{once:true});dialog.showModal();
  const status=dialog.querySelector('[role=status]');
  try{
    const file=await load(),type=String(file.mediaType||'').toLowerCase(),blob=new Blob([file.bytes],{type:'application/octet-stream'});
    url=URL.createObjectURL(blob);const save=dialog.querySelector('a');save.href=url;save.download=file.name||name;save.hidden=false;
    if(['image/png','image/jpeg','image/gif','image/webp'].includes(type)){const image=document.createElement('img');image.alt=name;image.src=URL.createObjectURL(new Blob([file.bytes],{type}));image.onload=()=>URL.revokeObjectURL(image.src);status.replaceWith(image);}
    else if(textTypes.test(type)&&file.bytes.byteLength<=2*1024*1024){const pre=document.createElement('pre');pre.className='attachment-text';pre.textContent=new TextDecoder().decode(file.bytes);status.replaceWith(pre);}
    else status.textContent=(type||'This file type')+' is not previewed in Proteus. Save a copy to open it with another app.';
  }catch(error){status.textContent=error.message||'This attachment could not be opened.';}
}
/** Chunked reader for a remote owner's `chat.attachments.get`. */
export async function readRemoteAttachment(request,chatId,sha256){
  const parts=[];let offset=0,meta=null;
  for(let guard=0;guard<200;guard++){const page=await request('chat.attachments.get',{id:chatId,sha256,offset});meta??=page;const bytes=Uint8Array.from(atob(page.dataBase64||''),c=>c.charCodeAt(0));parts.push(bytes);offset+=bytes.length;if(page.done||!bytes.length)break;}
  const total=new Uint8Array(offset);let at=0;for(const part of parts){total.set(part,at);at+=part.length;}
  return {bytes:total,name:meta?.name,mediaType:meta?.mediaType};
}
export async function readLocalAttachment(chatId,sha256){
  const response=await fetch('/api/chat-attachment?chatId='+encodeURIComponent(chatId)+'&sha256='+encodeURIComponent(sha256));
  if(!response.ok){let message=response.statusText;try{message=(await response.json()).error||message;}catch{}throw new Error(message);}
  return {bytes:new Uint8Array(await response.arrayBuffer()),name:decodeURIComponent(response.headers.get('X-Proteus-File-Name')||''),mediaType:response.headers.get('X-Proteus-Media-Type')||''};
}
