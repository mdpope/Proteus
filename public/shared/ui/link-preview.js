// Destination display only: never navigate, read files, or fetch a hovered URL.
export function linkDestination(source,{file,cwd}={}){
 if(typeof source!=='string'||!source.trim()||/^(?:javascript|data):/i.test(source))return '';
 if(/^[a-z][a-z\d+.-]*:/i.test(source)&&!/^([a-z]:[\\/])/i.test(source))return source;
 const location=String(file||cwd||'').replaceAll('\\','/');
 if(!location)return source;
 try{const root=(/^[a-z]:\//i.test(location)?'file:///':'file://')+location+(file?'':'/');return decodeURI(new URL(source,root).href);}catch{return source;}
}
export function installLinkPreview({document:doc=globalThis.document,base=()=>({})}={}){
 let anchor,host;
 const clear=()=>{anchor=null;host?.remove();host=null;};
 const show=event=>{
  const link=event.target?.closest?.('a[href],[data-link]');if(!link)return clear();
  const ownerFile=link.closest('[data-link-file]'),ownerCwd=link.closest('[data-link-cwd]');
  const raw=link.dataset.link||link.getAttribute('href'),text=linkDestination(raw,ownerFile?{file:ownerFile.dataset.linkFile}:ownerCwd?{cwd:ownerCwd.dataset.linkCwd}:base(link));if(!text)return clear();
  anchor=link;if(!host){host=doc.createElement('div');host.className='link-destination-preview';host.setAttribute('role','status');host.setAttribute('aria-live','polite');doc.body.append(host);}host.textContent=text;
 };
 const leave=event=>{if(anchor&&!anchor.contains(event.relatedTarget))clear();};
 doc.addEventListener('pointerover',show);doc.addEventListener('pointerout',leave);doc.addEventListener('focusin',show);doc.addEventListener('focusout',leave);
 doc.defaultView?.addEventListener('blur',clear);
 const observer=new MutationObserver(()=>{if(anchor&&!anchor.isConnected)clear();});observer.observe(doc.body,{childList:true,subtree:true});
 return ()=>{clear();observer.disconnect();doc.removeEventListener('pointerover',show);doc.removeEventListener('pointerout',leave);doc.removeEventListener('focusin',show);doc.removeEventListener('focusout',leave);doc.defaultView?.removeEventListener('blur',clear);};
}
